import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { spawn } from 'child_process';
import { transcribeAudioWithOpenAI } from './youtubeTranscriptService.js';
import { transcribeAudioWithGemini } from '../geminiService.js';
import { stage } from './progress.js';
import { note } from './auditDoctor.js';

/**
 * Transcription for uploaded audio and video files.
 * 1. The sound is converted to a small mono MP3 (about 14 MB per hour), so large
 *    videos fit the speech services' size limits.
 * 2. OpenAI (gpt-4o-transcribe, then whisper-1) transcribes it in whatever language
 *    is spoken; if that fails or returns almost nothing, Gemini transcribes it instead.
 */

const MIN_SPEECH_CHARS = 10;
const OPENAI_MAX_BYTES = 25 * 1024 * 1024;
const GEMINI_INLINE_MAX_BYTES = 19 * 1024 * 1024;

const ffmpegBin = () => {
  const p = process.env.FFMPEG_PATH || '';
  if (p && fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  if (p && fs.existsSync(path.join(p, 'ffmpeg'))) return path.join(p, 'ffmpeg');
  return 'ffmpeg';
};

const run = (bin, args, timeoutMs) => new Promise((resolve, reject) => {
  const child = spawn(bin, args);
  let err = '';
  child.stderr.on('data', (d) => { err += d; if (err.length > 4000) err = err.slice(-4000); });
  child.on('error', reject);
  const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('Audio conversion timed out')); }, timeoutMs);
  child.on('close', (code) => {
    clearTimeout(timer);
    if (code === 0) resolve();
    else reject(new Error(`Audio conversion failed (${code}): ${err.trim().split('\n').pop()}`));
  });
});

// Writes the upload to disk and extracts a mono 16 kHz 32 kbps MP3 of its sound
const toSmallMp3 = async (buffer, mimetype) => {
  const id = crypto.randomUUID();
  const input = path.join(os.tmpdir(), `nmc-media-${id}`);
  const output = path.join(os.tmpdir(), `nmc-media-${id}.mp3`);
  await fs.promises.writeFile(input, buffer);
  try {
    await run(ffmpegBin(), ['-y', '-i', input, '-vn', '-ac', '1', '-ar', '16000', '-b:a', '32k', output], 180000);
    const stat = await fs.promises.stat(output);
    if (!stat.size) throw new Error('No audio track found in the file');
    return output;
  } finally {
    fs.promises.unlink(input).catch(() => {});
  }
};

export const transcribe = async (audioBuffer, mimetype = '') => {
  const startTime = Date.now();
  stage('Extracting the audio…');

  let mp3Path = null;
  try {
    mp3Path = await toSmallMp3(audioBuffer, mimetype);
  } catch (error) {
    console.warn('[Transcription] Audio conversion failed:', error.message);
    note('Audio conversion', error);
    if (/no audio|does not contain any stream|Output file is empty|matches no streams/i.test(error.message)) {
      throw new Error('This file has no audio track, so there is nothing to transcribe. Upload a file with sound, or paste the script as text.');
    }
  }

  try {
    stage('Turning the speech into text…');

    // OpenAI first (gpt-4o-transcribe, falls back to whisper-1 inside)
    if (process.env.OPENAI_API_KEY) {
      let openaiPath = mp3Path;
      let tempOriginal = null;
      if (!openaiPath && audioBuffer.length <= OPENAI_MAX_BYTES) {
        tempOriginal = path.join(os.tmpdir(), `nmc-orig-${crypto.randomUUID()}.mp3`);
        await fs.promises.writeFile(tempOriginal, audioBuffer);
        openaiPath = tempOriginal;
      }
      if (openaiPath) {
        try {
          const text = await transcribeAudioWithOpenAI(openaiPath);
          if (text.trim().length >= MIN_SPEECH_CHARS) {
            console.log(`[Transcription] OpenAI ok | ${text.length} chars | ${Date.now() - startTime}ms`);
            return { transcript: text.trim(), model: 'openai', processingTime: Date.now() - startTime };
          }
          note('OpenAI transcript', `almost no speech (${text.trim().length} chars)`);
        } catch (error) {
          console.warn('[Transcription] OpenAI failed:', error.message);
          note('OpenAI transcript', error);
        } finally {
          if (tempOriginal) fs.promises.unlink(tempOriginal).catch(() => {});
        }
      }
    }

    // Gemini backup
    const geminiBytes = mp3Path ? await fs.promises.readFile(mp3Path) : audioBuffer;
    if (geminiBytes.length <= GEMINI_INLINE_MAX_BYTES) {
      try {
        stage('Trying our second speech service…');
        const text = await transcribeAudioWithGemini(geminiBytes, mp3Path ? 'audio/mpeg' : (mimetype || 'audio/mpeg'));
        console.log(`[Transcription] Gemini ok | ${text.length} chars | ${Date.now() - startTime}ms`);
        return { transcript: text.trim(), model: 'gemini', processingTime: Date.now() - startTime };
      } catch (error) {
        console.warn('[Transcription] Gemini failed:', error.message);
        note('Gemini transcript', error);
      }
    } else {
      note('Gemini transcript', `file too large for backup service (${Math.round(geminiBytes.length / 1048576)} MB)`);
    }

    throw new Error('The speech in this file could not be transcribed by either speech service.');
  } finally {
    if (mp3Path) fs.promises.unlink(mp3Path).catch(() => {});
  }
};

export default { transcribe };
