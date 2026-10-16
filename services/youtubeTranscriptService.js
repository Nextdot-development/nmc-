import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import ytdl from 'ytdl-core';
import { YoutubeTranscript } from 'youtube-transcript';
import { spawn } from 'child_process';
import { transcribeYouTubeWithGemini } from '../geminiService.js';
import { stage } from './progress.js';
import { note } from './auditDoctor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const AUDIO_DOWNLOAD_ENABLED = process.env.ENABLE_YOUTUBE_AUDIO === 'true';
const ALLOW_AUDIO_DOWNLOAD = !IS_PRODUCTION || AUDIO_DOWNLOAD_ENABLED;

const AUDIO_TIMEOUT_MS = 2 * 60 * 1000;
const TRANSCRIBE_TIMEOUT_MS = 3 * 60 * 1000;
const MAX_RETRIES = 2;
const BACKOFF_BASE_MS = 800;
const BACKOFF_FACTOR = 2;
const YTDL_EXTRACT_FAILURE = /could not extract functions/i;

let openaiClient = null;

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set. Required for audio transcription.');
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey });
  }

  return openaiClient;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withTimeout = async (promise, timeoutMs, timeoutMessage) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
};

const retryWithBackoff = async (fn, attempts, label) => {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`[YouTube Transcript] ${label} failed (attempt ${attempt}/${attempts}):`, error.message);
      if (attempt < attempts) {
        const backoffMs = BACKOFF_BASE_MS * (BACKOFF_FACTOR ** (attempt - 1));
        await sleep(backoffMs);
      }
    }
  }
  throw lastError;
};

const fetchYtDlpMetadata = async (videoUrl) => {
  return await withTimeout(new Promise((resolve, reject) => {
    const args = [...proxyArgs(), '--dump-json', '--skip-download', videoUrl];
    const process = spawn(getYtDlpCommand(), args);

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('error', reject);
    process.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`yt-dlp metadata failed (code ${code}): ${stderr.trim()}`));
        return;
      }
      try {
        const parsed = JSON.parse(stdout.trim());
        resolve(parsed);
      } catch (error) {
        reject(new Error('yt-dlp metadata returned invalid JSON'));
      }
    });
  }), AUDIO_TIMEOUT_MS, 'yt-dlp metadata timed out');
};

// Always the plain watch URL: share and tracking parameters (pp=, si=, feature=) make
// Vertex AI refuse the link ("URL_ROBOTED") and are not needed by any downloader
const normalizeUrl = (videoUrl) => {
  let parsed;
  try {
    parsed = new URL(videoUrl);
  } catch {
    throw new Error('Invalid YouTube URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('URL must start with http or https');
  }
  const host = parsed.hostname.replace(/^(www\.|m\.|music\.)/, '');
  let id = '';
  if (host === 'youtu.be') id = parsed.pathname.slice(1).split('/')[0];
  else if (host.endsWith('youtube.com')) {
    id = parsed.searchParams.get('v') || (parsed.pathname.match(/^\/(shorts|live|embed)\/([^/?#]+)/) || [])[2] || '';
  }
  return /^[\w-]{6,}$/.test(id) ? `https://www.youtube.com/watch?v=${id}` : parsed.toString();
};

const getYtDlpCommand = () => process.env.YTDL_PATH || 'yt-dlp';
// YouTube blocks cloud servers; a rotating residential proxy (a new IP per request)
// lets yt-dlp read captions and audio. Some IPs are blocked too, so callers retry.
const proxyArgs = () => (process.env.YTDL_PROXY ? ['--proxy', process.env.YTDL_PROXY] : []);
const PROXY_ATTEMPTS = () => (process.env.YTDL_PROXY ? Number(process.env.YTDL_PROXY_ATTEMPTS) || 3 : 1);
const isBotBlock = (message = '') => /not a bot|Unable to download API page|HTTP Error 403|429|Sign in to confirm/i.test(message);
const getYtDlpJsRuntime = () => process.env.YTDL_JS_RUNTIME || 'node';
const resolveFfmpegLocation = () => {
  const rawPath = process.env.FFMPEG_PATH || '';
  if (!rawPath) return '';

  const normalized = rawPath.trim();
  if (!normalized) return '';

  if (normalized.toLowerCase().endsWith('ffmpeg.exe')) {
    const dir = path.dirname(normalized);
    const probePath = path.join(dir, 'ffprobe.exe');
    if (fs.existsSync(normalized) && fs.existsSync(probePath)) {
      return dir;
    }
    return '';
  }

  const probePath = path.join(normalized, 'ffprobe.exe');
  if (fs.existsSync(probePath)) {
    return normalized;
  }

  // Linux/macOS: a directory holding ffprobe, a full path to ffmpeg, or a bare command on PATH
  if (fs.existsSync(path.join(normalized, 'ffprobe'))) return normalized;
  if (path.isAbsolute(normalized) && fs.existsSync(normalized)) return path.dirname(normalized);
  const pathDirs = (process.env.PATH || '').split(path.delimiter);
  const found = pathDirs.find((dir) => fs.existsSync(path.join(dir, normalized)) && fs.existsSync(path.join(dir, 'ffprobe')));
  return found || '';
};

const ensureFfmpegAvailable = () => {
  const ffmpegLocation = resolveFfmpegLocation();
  if (!ffmpegLocation) {
    throw new Error('FFMPEG_PATH is missing or ffprobe/ffmpeg not found. Required for MP3 re-encoding.');
  }
  return ffmpegLocation;
};

const downloadWithYtDlp = async (videoUrl, outputPath) => {
  console.log('[YouTube Transcript] Downloading audio with yt-dlp + FFmpeg MP3 re-encode...');

  await withTimeout(new Promise((resolve, reject) => {
    const ffmpegLocation = ensureFfmpegAvailable();
    const args = [
      ...proxyArgs(),
      '--js-runtimes',
      getYtDlpJsRuntime(),
      '--ffmpeg-location',
      ffmpegLocation,
      '-x',
      '--audio-format',
      'mp3',
      '--postprocessor-args',
      'ExtractAudio:-ac 1 -ar 16000 -b:a 32k',
      '--no-playlist',
      '-o',
      outputPath,
      videoUrl
    ];

    const process = spawn(getYtDlpCommand(), args);

    let stderr = '';
    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('error', (error) => {
      reject(error);
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`yt-dlp failed (code ${code}): ${stderr.trim()}`));
    });
  }), AUDIO_TIMEOUT_MS, 'yt-dlp download timed out');

  console.log('[YouTube Transcript] yt-dlp audio downloaded successfully');
};

const getAudioDurationSeconds = async (filePath) => {
  const ffmpegLocation = ensureFfmpegAvailable();
  const ffprobePath = path.join(ffmpegLocation, process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe');

  return await withTimeout(new Promise((resolve, reject) => {
    const process = spawn(ffprobePath, [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath
    ]);

    let output = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      output += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('error', reject);
    process.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe failed (code ${code}): ${stderr.trim()}`));
        return;
      }
      const duration = parseFloat(output.trim());
      resolve(duration);
    });
  }), AUDIO_TIMEOUT_MS, 'Audio duration probe timed out');
};

const validateDownloadedAudio = async (filePath) => {
  if (!fs.existsSync(filePath)) {
    throw new Error('Downloaded audio file not found');
  }

  const stats = fs.statSync(filePath);
  if (!stats.size || stats.size <= 0) {
    throw new Error('Downloaded audio file is empty');
  }

  const duration = await getAudioDurationSeconds(filePath);
  if (!duration || Number.isNaN(duration) || duration <= 0) {
    throw new Error('Downloaded audio has invalid duration');
  }
};

const validateYoutubeUrl = async (videoUrl) => {
  if (!ytdl.validateURL(videoUrl)) {
    throw new Error('Invalid YouTube URL');
  }

  try {
    const info = await retryWithBackoff(() => ytdl.getInfo(videoUrl), MAX_RETRIES, 'Video info');
    const isPrivate = info?.videoDetails?.isPrivate;
    const isLive = info?.videoDetails?.isLiveContent;
    if (isPrivate) {
      throw new Error('YouTube video is private');
    }
    if (isLive) {
      console.warn('[YouTube Transcript] Video is live content. Transcript may be unavailable.');
    }
  } catch (error) {
    if (YTDL_EXTRACT_FAILURE.test(error.message || '')) {
      console.warn('[YouTube Transcript] Video info unavailable via ytdl-core. Continuing with yt-dlp fallback.');
      return;
    }
    throw error;
  }
};

export const downloadYoutubeAudio = async (videoUrl, outputPath) => {
  console.log('[YouTube Transcript] Downloading audio...');
  stage('Downloading the video’s audio…');
  try {
    await validateYoutubeUrl(videoUrl);
  } catch (error) {
    // ytdl-core is unmaintained (often 410); yt-dlp validates the video itself
    console.warn('[YouTube Transcript] ytdl-core validation skipped:', error.message);
  }
  // Each attempt goes out through a fresh proxy IP
  for (let attempt = 1; ; attempt++) {
    try {
      await downloadWithYtDlp(videoUrl, outputPath);
      break;
    } catch (error) {
      if (attempt >= PROXY_ATTEMPTS() || !isBotBlock(error.message)) throw error;
      console.warn(`[YouTube Transcript] Audio download blocked (attempt ${attempt}), retrying through a new IP`);
    }
  }
  await validateDownloadedAudio(outputPath);
};

export const transcribeAudioWithOpenAI = async (filePath) => {
  const client = getOpenAIClient();
  console.log('[YouTube Transcript] Transcribing audio...');
  stage('Turning the speech into text…');

  const extension = path.extname(filePath).toLowerCase().replace('.', '');
  const mimeMap = {
    m4a: 'audio/mp4',
    mp3: 'audio/mpeg',
    webm: 'audio/webm',
    ogg: 'audio/ogg',
    wav: 'audio/wav'
  };
  const mimeType = mimeMap[extension] || 'application/octet-stream';

  const transcribe = (model) => withTimeout(
    retryWithBackoff(() => client.audio.transcriptions.create({
      model,
      file: fs.createReadStream(filePath),
      mime_type: mimeType
    }), MAX_RETRIES, 'OpenAI transcription'),
    TRANSCRIBE_TIMEOUT_MS,
    'Audio transcription timed out'
  );

  let response;
  try {
    response = await transcribe('gpt-4o-transcribe');
  } catch (error) {
    // gpt-4o-transcribe has a shorter duration limit; Whisper handles long audio
    console.warn('[YouTube Transcript] gpt-4o-transcribe failed, retrying with whisper-1:', error.message);
    response = await transcribe('whisper-1');
  }

  const text = response?.text?.trim() || '';
  if (!text) {
    throw new Error('Transcription returned empty text');
  }

  console.log('[YouTube Transcript] Transcription completed');
  return text;
};

// Convert a WebVTT caption file to plain text, removing timings, tags and the
// rolling duplicate lines that YouTube auto-captions repeat.
export const vttToText = (vtt = '') => {
  const lines = [];
  for (const raw of vtt.split(/\r?\n/)) {
    const line = raw
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .trim();
    if (!line || line === 'WEBVTT' || /^(Kind|Language|NOTE)\b/.test(line) || /-->/.test(line) || /^\d+$/.test(line)) continue;
    if (lines[lines.length - 1] === line) continue;
    lines.push(line);
  }
  return lines.join(' ').replace(/\s+/g, ' ').trim();
};

// Subtitles via yt-dlp: manual subs first, then auto-captions in the video's own language
const fetchSubtitlesWithYtDlp = async (videoUrl) => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetchSubtitlesOnce(videoUrl);
    } catch (error) {
      if (attempt >= PROXY_ATTEMPTS() || !isBotBlock(error.message)) throw error;
      console.warn(`[YouTube Transcript] Subtitles blocked (attempt ${attempt}), retrying through a new IP`);
    }
  }
};

const fetchSubtitlesOnce = async (videoUrl) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yt-subs-'));
  try {
    const stderr = await withTimeout(new Promise((resolve, reject) => {
      const proc = spawn(getYtDlpCommand(), [
        ...proxyArgs(),
        '--skip-download', '--write-subs', '--write-auto-subs',
        '--sub-langs', 'en,hi,en-orig,hi-orig,.*-orig',
        '--sub-format', 'vtt', '--no-playlist', '--ignore-errors', '--js-runtimes', 'node',
        '-o', path.join(dir, 'sub.%(ext)s'), videoUrl,
      ]);
      let stderr = '';
      proc.stderr.on('data', (d) => { stderr += d.toString(); });
      proc.on('error', reject);
      proc.on('close', () => resolve(stderr));
    }), AUDIO_TIMEOUT_MS, 'yt-dlp subtitles timed out');

    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.vtt'));
    // Blocked before anything was saved: let the caller retry through another IP
    if (!files.length && isBotBlock(String(stderr))) throw new Error(String(stderr).trim().split('\n').pop());
    // The "-orig" auto-caption track tells us the language actually spoken. Use that
    // language's track (never an auto-translation, e.g. English captions of a Hindi video).
    const langOf = (f) => (f.match(/^sub\.([a-zA-Z-]+?)(-orig)?\.vtt$/) || [])[1] || '';
    const spoken = langOf(files.find((f) => f.includes('-orig')) || '');
    const rank = (f) => {
      const lang = langOf(f);
      if (spoken) {
        if (lang !== spoken) return 99; // translation into another language
        return f.includes('-orig') ? 1 : 0; // cleaned track before raw ASR
      }
      return /^sub\.en\./.test(f) ? 0 : /^sub\.hi\./.test(f) ? 1 : 2; // only uploaded subtitles exist
    };
    for (const file of files.filter((f) => rank(f) < 99).sort((a, b) => rank(a) - rank(b))) {
      const text = vttToText(fs.readFileSync(path.join(dir, file), 'utf8'));
      if (text.length > 20) {
        console.log(`[YouTube Transcript] yt-dlp subtitles: ${file} (${text.length} chars)`);
        return text;
      }
    }
    return '';
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

export const isTranscriptUnavailable = (text = '') => /^YouTube (video )?transcript unavailable/i.test(text);

// Gemini sometimes stalls on one request while the same video works at once on the next.
// Start a backup request if the first is slow (short ads come back in ~5s); the first transcript to arrive wins.
const GEMINI_HEDGE_AFTER_MS = [0, 20000, 60000];
// Spoken part of a Gemini transcript (before the ON-SCREEN TEXT list)
const spokenPart = (text = '') => text.split(/\n\s*ON-SCREEN TEXT:/i)[0].trim();
const MIN_SPOKEN_CHARS = 25;
const looseKey = (s = '') => String(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

// Public video title (no login needed); used to spot a "transcript" that is only the title
// YouTube's public oEmbed: 200 for a watchable video, 400/401/403/404 for missing,
// private or removed ones. A network failure is "unknown", never "missing".
const lookupVideo = async (url) => {
  try {
    const r = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, { signal: AbortSignal.timeout(5000) });
    if (r.ok) return { title: (await r.json()).title || '', missing: false };
    return { title: '', missing: [400, 401, 403, 404].includes(r.status) };
  } catch {
    return { title: '', missing: false };
  }
};
const fetchVideoTitle = async (url) => (await lookupVideo(url)).title;

// Speech was actually heard: not near-empty, and not just the video title read back
const hasRealSpeech = (text, title) => {
  const spoken = spokenPart(text);
  if (spoken.length < MIN_SPOKEN_CHARS) return false;
  return !(title && looseKey(spoken) === looseKey(title));
};

const hedgedGeminiTranscript = (url, title = '', offset = 0) => new Promise((resolve, reject) => {
  let settled = false;
  let started = 0;
  let finished = 0;
  let best = null;
  let lastError = null;
  const timers = [];
  const finish = (fn, value) => {
    if (settled) return;
    settled = true;
    timers.forEach(clearTimeout);
    fn(value);
  };
  const start = () => {
    if (settled || started >= GEMINI_HEDGE_AFTER_MS.length) return;
    const n = ++started;
    if (n > 1) {
      console.log('[YouTube Transcript] Starting backup Gemini request', n);
      stage('Still listening to the video — trying again in parallel…');
    }
    transcribeYouTubeWithGemini(url, offset + n - 1)
      .then((res) => {
        const { text } = res;
        // A transcript with almost no speech usually means the audio was skipped: ask again,
        // and keep the fullest one in case the video really has no voice-over
        if (hasRealSpeech(text, title)) return finish(resolve, res);
        console.warn(`[YouTube Transcript] Gemini request ${n} returned no real speech (${spokenPart(text).length} chars)`);
        note('Gemini transcript', `no real speech (${spokenPart(text).length} chars)`);
        if (text.length > (best?.text?.length || 0)) best = res;
      })
      .catch((error) => {
        lastError = error;
        console.warn(`[YouTube Transcript] Gemini request ${n} failed:`, error.message);
        note('Gemini transcript', error);
      })
      .finally(() => {
        finished += 1;
        if (settled) return;
        if (finished === GEMINI_HEDGE_AFTER_MS.length || (started === GEMINI_HEDGE_AFTER_MS.length && finished === started)) {
          return best ? finish(resolve, best) : finish(reject, lastError || new Error('Gemini returned no transcript'));
        }
        start(); // a quick failure or a near-empty transcript should not wait for the next timer
      });
  };
  GEMINI_HEDGE_AFTER_MS.forEach((delay) => timers.push(setTimeout(start, delay)));
});

// Captions, then downloaded audio + OpenAI. Throws when neither gives a transcript.
const transcriptFromYoutube = async (normalized) => {
  console.log('[YouTube Transcript] Trying captions...');
  try {
    const transcriptItems = await retryWithBackoff(() => YoutubeTranscript.fetchTranscript(normalized), MAX_RETRIES, 'Captions fetch');
    const transcript = transcriptItems.map((item) => item.text).join(' ').replace(/\s+/g, ' ').trim();
    if (transcript) return { text: transcript, seconds: null };
  } catch (error) {
    console.warn('[YouTube Transcript] Captions failed:', error.message);
    note('YouTube captions', error);
  }

  try {
    const subtitles = await fetchSubtitlesWithYtDlp(normalized);
    if (subtitles) return { text: subtitles, seconds: null };
  } catch (error) {
    console.warn('[YouTube Transcript] yt-dlp subtitles failed:', error.message);
    note('YouTube subtitles', error);
  }

  // Audio download + OpenAI speech-to-text (gpt-4o-transcribe, Whisper fallback)
  if (process.env.OPENAI_API_KEY && process.env.ENABLE_YOUTUBE_AUDIO !== 'false') {
    const tempFile = path.join(os.tmpdir(), `yt-audio-${Date.now()}.mp3`);
    try {
      await downloadYoutubeAudio(normalized, tempFile);
      const text = await transcribeAudioWithOpenAI(tempFile);
      // A clipped download gives a few words; do not let it beat a full Gemini transcript
      if (text.trim().length < MIN_SPOKEN_CHARS) throw new Error(`OpenAI transcript too short (${text.trim().length} chars)`);
      const seconds = await getAudioDurationSeconds(tempFile).catch(() => null);
      return { text, seconds: seconds ? Math.round(seconds) : null };
    } catch (error) {
      console.warn('[YouTube Transcript] Audio + OpenAI transcription failed:', error.message.slice(0, 200));
      note('YouTube audio download', error);
    } finally {
      fs.unlink(tempFile, () => undefined);
    }
  }
  throw new Error('No captions or downloadable audio');
};

// First of several promises to resolve; rejects only when all reject
const firstSuccess = (promises) => new Promise((resolve, reject) => {
  let failed = 0;
  let lastError;
  promises.forEach((p) => p.then(resolve, (error) => {
    lastError = error;
    failed += 1;
    if (failed === promises.length) reject(lastError);
  }));
});

// Transcript plus the video length in seconds (null when unknown)
export const getYoutubeTranscriptWithLength = async (videoUrl) => {
  const normalized = normalizeUrl(videoUrl);

  // A missing, private or removed video cannot be read by any route: say so at once
  const lookup = await lookupVideo(normalized);
  if (lookup.missing) {
    console.warn('[YouTube Transcript] Video not available:', normalized);
    note('YouTube video', 'Video unavailable: private, removed or restricted');
    return { text: `YouTube transcript unavailable. Video URL: ${normalized}.`, seconds: null };
  }
  stage('Getting the video transcript — checking captions and listening to the video…');

  // YouTube usually blocks downloads from cloud servers, so Gemini (which reads the
  // public video by URL) runs at the same time instead of after the other routes fail
  const routes = [transcriptFromYoutube(normalized)];
  if (process.env.ENABLE_GEMINI_YOUTUBE !== 'false') {
    console.log('[YouTube Transcript] Transcribing with Gemini (in parallel)...');
    routes.push(fetchVideoTitle(normalized).then((title) => hedgedGeminiTranscript(normalized, title)));
  }
  try {
    return await firstSuccess(routes);
  } catch (error) {
    console.warn('[YouTube Transcript] All transcript routes failed:', error.message);
  }

  // Audit Doctor repair round: most failures (withheld or stalled transcripts) are random,
  // so ask again with fresh variants after a short pause. Not worth it for private videos.
  if (process.env.ENABLE_GEMINI_YOUTUBE !== 'false') {
    const title = await fetchVideoTitle(normalized);
    if (title) {
      stage('Something went wrong — fixing it automatically and trying again…');
      await new Promise((r) => setTimeout(r, 3000));
      try {
        console.log('[YouTube Transcript] Audit Doctor repair round');
        return await hedgedGeminiTranscript(normalized, title, 1);
      } catch (error) {
        console.warn('[YouTube Transcript] Repair round failed:', error.message);
      }
    } else {
      // oEmbed refuses private, removed and members-only videos
      note('YouTube video', 'Video unavailable: private, removed or restricted');
    }
  }

  console.log('[YouTube Transcript] Captions unavailable. Fetching metadata...');
  try {
    const metadata = await retryWithBackoff(() => fetchYtDlpMetadata(normalized), MAX_RETRIES, 'yt-dlp metadata');
    const title = metadata?.title || 'Unknown';
    const description = metadata?.description || 'Description unavailable.';
    return { text: `YouTube video transcript unavailable. Title: ${title}. Description: ${description}. URL: ${normalized}`, seconds: null };
  } catch (error) {
    console.warn('[YouTube Transcript] yt-dlp metadata failed:', error.message);
  }

  try {
    const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(normalized)}&format=json`);
    if (response.ok) {
      const data = await response.json();
      const title = data?.title || 'Unknown';
      const channel = data?.author_name || 'Unknown';
      return { text: `YouTube video transcript unavailable. Title: ${title}. Channel: ${channel}. URL: ${normalized}`, seconds: null };
    }
  } catch (error) {
    console.warn('[YouTube Transcript] oEmbed metadata failed:', error.message);
  }

  return { text: `YouTube transcript unavailable. Video URL: ${normalized}. Please provide a summary or upload a file.`, seconds: null };
};

// Transcript text only (older callers)
export const getYoutubeTranscript = async (videoUrl) => (await getYoutubeTranscriptWithLength(videoUrl)).text;

export default {
  downloadYoutubeAudio,
  transcribeAudioWithOpenAI,
  getYoutubeTranscript
};
