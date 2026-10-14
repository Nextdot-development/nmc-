import { VertexAI } from "@google-cloud/vertexai";

/* ===============================
   CONFIG
================================ */
const MODEL_NAME = "gemini-2.5-flash";
const MAX_CONTENT_LENGTH = Number(process.env.MAX_CONTENT_FOR_AI) || 60000;
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 120000;

let vertexAIClient = null;

const getVertexAIClient = () => {
  if (!vertexAIClient) {
    const projectId = process.env.VERTEX_PROJECT_ID;
    const location = process.env.VERTEX_LOCATION;
    
    if (!projectId || !location) {
      throw new Error("VERTEX_PROJECT_ID or VERTEX_LOCATION missing");
    }
    
    vertexAIClient = new VertexAI({ project: projectId, location: location });
    console.log('[Gemini] Vertex AI client initialized');
  }
  return vertexAIClient;
};

const truncateContent = (content) => {
  if (!content || typeof content !== 'string') return '';
  return content.length > MAX_CONTENT_LENGTH
    ? content.substring(0, MAX_CONTENT_LENGTH)
    : content;
};

const withTimeout = (promise, ms, errorMsg) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(errorMsg)), ms)
    )
  ]);
};

// Retry Vertex rate-limit (429 / RESOURCE_EXHAUSTED) responses with backoff
const RETRY_DELAYS_MS = [2000, 5000, 10000];
const isRateLimited = (error) => /429|Too Many Requests|RESOURCE_EXHAUSTED|Resource exhausted/i.test(error?.message || '');

const withRateLimitRetry = async (fn) => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      if (!isRateLimited(error) || attempt >= RETRY_DELAYS_MS.length) throw error;
      console.warn(`[Gemini] Rate limited, retrying in ${RETRY_DELAYS_MS[attempt]}ms`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }
  }
};

if (process.env.VERTEX_PROJECT_ID && process.env.VERTEX_LOCATION) {
  getVertexAIClient();
}

const cleanJsonString = (text = "") => {
  return text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
};

const removeTrailingCommas = (text = "") => {
  return text.replace(/,\s*([}\]])/g, '$1');
};

const extractJsonCandidate = (text = "") => {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return text.trim();
  }
  return text.slice(start, end + 1).trim();
};

const extractBalancedJson = (text = "") => {
  const trimmed = text.trim();
  const startIndex = trimmed.search(/[\[{]/);
  if (startIndex === -1) return trimmed;

  const opener = trimmed[startIndex];
  const closer = opener === '[' ? ']' : '}';
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = startIndex; i < trimmed.length; i += 1) {
    const char = trimmed[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === opener) depth += 1;
    if (char === closer) depth -= 1;

    if (depth === 0) {
      return trimmed.slice(startIndex, i + 1).trim();
    }
  }

  return trimmed.slice(startIndex).trim();
};

const tryParseJson = (text) => {
  // Extract substring between first { and last }
  const cleaned = cleanJsonString(text);
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Invalid JSON');
  }
  const jsonStr = cleaned.slice(start, end + 1);
  return JSON.parse(jsonStr);
};

/* ===============================
   PROMPT (VERY IMPORTANT)
================================ */
const buildRulesBlock = (rules = []) => {
  if (!rules.length) {
    return 'No rule pack provided. Use best-effort compliance reasoning based on jurisdiction.';
  }

  const maxRules = Number(process.env.MAX_PROMPT_RULES) || 200;
  const lines = rules.slice(0, maxRules).map((rule, index) => {
    const section = rule.section ? ` (Section: ${rule.section})` : '';
    const description = rule.description ? `: ${rule.description}` : '';
    return `${index + 1}. ${rule.regulation} - ${rule.title}${section}${description}`;
  });

  if (rules.length > maxRules) {
    lines.push(`...and ${rules.length - maxRules} more rules in this jurisdiction.`);
  }

  return lines.join('\n');
};

export const buildCompliancePrompt = ({ inputType, category, analysisMode, country, region, rules, contentContext }) => {
  const jurisdiction = country ? country : 'India';
  const regionLabel = region ? ` (${region})` : '';
  const rulesBlock = buildRulesBlock(rules);
  const contextBlock = contentContext
    ? `\nCONTENT CONTEXT (MANDATORY):\n${contentContext}\n`
    : '';

  return `
You are NextComply AI, a senior regulatory compliance auditor for ${jurisdiction}${regionLabel}.

TASK:
Audit the given ${inputType} content for ${jurisdiction}${regionLabel} advertising & healthcare compliance.

${contextBlock}

RULE PACK (MANDATORY):
Use ONLY the rules listed below to identify violations and generate fixes.
${rulesBlock}

CRITICAL OUTPUT RULES:
- Return ONLY valid JSON matching the schema below.
- Go through the content line by line, in order, and check every line against every rule above. Be exhaustive and consistent: the same content must always produce the same findings.
- Report each problematic line ONCE, under the single most specific rule. Never repeat a line.
- Do NOT flag content that a rule expressly permits (e.g. factual name, address, departments, facilities, accreditation, timings or a factual fee disclosure).

LANGUAGE RULES (VERY IMPORTANT):
- language: the main language of the content, e.g. "Hindi", "Hinglish", "English", "Marathi".
- originalLine: copy the problematic line EXACTLY as it appears in the content, in the same language and script (Devanagari stays Devanagari, Roman Hinglish stays Roman). No paraphrasing.
- compliantLine: a ready-to-publish replacement for originalLine in the SAME language and script that keeps the legitimate message in a permitted form: replace superlatives ("best", "No.1") with verifiable facts such as qualifications or experience, replace guarantees and success claims with balanced wording ("results vary; consult a doctor"), replace discounts/offers with a transparent fee statement, and add the doctor's name, qualification and registration number where required. Never leave it empty. Write "[Remove this line]" ONLY when no permitted version of the line exists (e.g. before-after photos of patients, celebrity endorsement).
- englishTranslation: English meaning of originalLine (repeat it if already English).
- problematicContent: same text as originalLine.
- description, suggestion, solution, summary and assessments: in English.
- compliantVersion: REQUIRED (never empty) when the content is shorter than 3000 characters: the full content rewritten with every violation fixed, in its original language and script, ready to publish. For longer content return "".

FORMAT RULES:
- suggestion: what to change and why, numbered points (1., 2.), max 3.
- solution: steps to make the line compliant, numbered points (1., 2.), max 3.
- transcription: for audio/video give the transcript; for text, documents and web pages return only the first 300 characters of the content (do NOT copy the whole input).

SCORING:
- score: integer 0-100, higher is better. status: "Compliant", "Needs Review" or "Non-Compliant" (any Critical violation means "Non-Compliant").
- ethicalMarketing.score: integer 0-100, higher = more ethical.

JSON SCHEMA:
{
  "score": number,
  "status": "Compliant" | "Needs Review" | "Non-Compliant",
  "language": string,
  "summary": string,
  "transcription": string,
  "compliantVersion": string,
  "financialPenalty": {
    "riskLevel": "High" | "Medium" | "Low" | "None",
    "description": string
  },
  "ethicalMarketing": {
    "score": number,
    "assessment": string
  },
  "violations": [
    {
      "severity": "Critical" | "High" | "Medium" | "Low",
      "regulation": string,
      "description": string,
      "originalLine": string,
      "compliantLine": string,
      "problematicContent": string,
      "englishTranslation": string,
      "suggestion": string,
      "solution": string
    }
  ]
}

ANALYSIS MODE: ${analysisMode || "Standard"}
INDUSTRY DOMAIN: ${category || "General"}

Return JSON only.`;
};

/* ===============================
   MAIN FUNCTION (EXPORTED)
================================ */
export const analyzeWithGemini = async ({
  content,
  inputType = "text",
  category = "General",
  analysisMode = "Standard",
  country,
  region,
  rules = [],
  contentContext = ''
}) => {
  const truncatedContent = truncateContent(content);
  const vertexAI = getVertexAIClient();

  const model = vertexAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      temperature: 0.0,
      maxOutputTokens: 32768,
      topP: 0.1,
      topK: 1,
      seed: 20261014,
      responseMimeType: "application/json",
      // gemini-2.5-flash bills thinking tokens against maxOutputTokens.
      // Thinking is disabled here so the whole budget goes to the JSON body.
      thinkingConfig: { thinkingBudget: 0 }
    },
  });

  const prompt = buildCompliancePrompt({
    inputType,
    category,
    analysisMode,
    country,
    region,
    rules,
    contentContext
  });

  const parts = [
    { text: truncatedContent },
    { text: prompt },
  ];

  const result = await withRateLimitRetry(() => withTimeout(
    model.generateContent({ contents: [{ role: "user", parts }] }),
    GEMINI_TIMEOUT_MS,
    'Gemini API call timed out'
  ));

  let rawText =
    result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  if (!rawText) {
    throw new Error("Gemini returned empty response");
  }

  try {
    return tryParseJson(rawText);
  } catch (err) {
    const finishReason = result?.response?.candidates?.[0]?.finishReason;
    console.error('[Gemini] JSON parse failed', {
      finishReason,
      usage: result?.response?.usageMetadata,
      rawLength: rawText.length,
      rawTail: rawText.slice(-200)
    });
    if (finishReason === 'MAX_TOKENS') {
      throw new Error("Gemini response truncated (MAX_TOKENS) - increase maxOutputTokens");
    }
    throw new Error("Gemini returned invalid JSON");
  }
};

/* ===============================
   OPTIONAL: AUDIO SUMMARY
================================ */
/* ===============================
   YOUTUBE TRANSCRIPT (Gemini reads the public video by URL)
   Used when YouTube blocks caption downloads from the server.
================================ */
export const transcribeYouTubeWithGemini = async (videoUrl) => {
  const vertexAI = getVertexAIClient();
  const model = vertexAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      temperature: 0.0,
      maxOutputTokens: 32768,
      // Low-resolution frames cut video tokens ~4x; enough to read on-screen text
      mediaResolution: 'MEDIA_RESOLUTION_LOW',
      thinkingConfig: { thinkingBudget: 0 }
    }
  });

  const prompt = 'Transcribe everything spoken in this video verbatim, in its original language (keep Hindi/Hinglish as spoken). '
    + 'After the transcript, add a new line starting with "ON-SCREEN TEXT:" listing any promotional or medical text shown on screen. '
    + 'Plain text only, no timestamps, no commentary.';

  const result = await withRateLimitRetry(() => withTimeout(
    model.generateContent({
      contents: [{ role: 'user', parts: [
        { fileData: { fileUri: videoUrl, mimeType: 'video/*' } },
        { text: prompt }
      ] }]
    }),
    Number(process.env.YOUTUBE_GEMINI_TIMEOUT_MS) || 240000,
    'Gemini YouTube transcription timed out'
  ));

  const text = (result?.response?.candidates?.[0]?.content?.parts || [])
    .map((part) => part.text || '')
    .join('')
    .trim();
  console.log('[Gemini] YouTube transcription', JSON.stringify({ chars: text.length, usage: result?.response?.usageMetadata?.totalTokenCount }));
  if (!text) throw new Error('Gemini returned an empty transcript');
  return text;
};

export const generateAudioSummary = async (text) => {
  const vertexAI = getVertexAIClient();

  const ttsModel = vertexAI.getGenerativeModel({
    model: "gemini-2.5-flash-preview-tts",
  });

  const result = await ttsModel.generateContent({
    contents: [{ role: "user", parts: [{ text }] }],
  });

  const audioBase64 =
    result?.response?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

  if (!audioBase64) {
    throw new Error("Audio generation failed");
  }

  return audioBase64;
};

export const extractClaimsWithGemini = async (text) => {
  const cleaned = (text || '').trim();
  if (!cleaned) {
    throw new Error('No text provided for claim extraction');
  }

  const vertexAI = getVertexAIClient();

  const model = vertexAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      temperature: 0.0,
      maxOutputTokens: 4096,
      topP: 0.9,
      thinkingConfig: { thinkingBudget: 0 }
    }
  });

  const prompt = `Extract the key marketing, medical, and compliance-relevant claims from the following document text. Return plain text only. Do NOT include JSON or markdown. If no claims are present, return a short sentence stating that no explicit claims were found.`;

  const truncatedText = cleaned.substring(0, MAX_CONTENT_LENGTH);
  
  const result = await withRateLimitRetry(() => withTimeout(
    model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `${prompt}\n\n${truncatedText}` }] }]
    }),
    GEMINI_TIMEOUT_MS,
    'Gemini claim extraction timed out'
  ));

  const output = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const extracted = output.trim();

  if (!extracted) {
    throw new Error('Gemini claim extraction returned empty output');
  }

  const lower = extracted.toLowerCase();
  const isNoClaims = lower.includes('no explicit claims') || lower.includes('no clear claims');
  if (!isNoClaims && extracted.length < 80) {
    throw new Error('Gemini claim extraction returned too-short output');
  }

  return extracted;
};