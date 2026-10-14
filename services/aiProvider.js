import { analyzeWithGemini, extractClaimsWithGemini } from '../geminiService.js';
import { analyzeWithClaude, extractClaimsWithClaude, isClaudeConfigured } from './claudeService.js';

/* ===============================
   PROVIDER ROUTING
   Claude is primary; Gemini takes over if Claude is not configured or fails.
================================ */
const withFallback = async (label, primary, fallback) => {
  if (!isClaudeConfigured()) {
    return fallback();
  }
  try {
    return await primary();
  } catch (error) {
    console.warn(`[AI] Claude ${label} failed, falling back to Gemini: ${error.message}`);
    return fallback();
  }
};

const toPercent = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  // Some model outputs use a 0-1 scale
  return Math.round(n > 0 && n <= 1 ? n * 100 : Math.max(0, Math.min(100, n)));
};

// Keep score and status consistent: models occasionally invert the scale
const normalizeScores = (result) => {
  if (!result || typeof result !== 'object') return result;
  let score = toPercent(result.score);
  if (Number.isFinite(score)) {
    if (result.status === 'Non-Compliant' && score >= 50) score = 100 - score;
    if (result.status === 'Compliant' && score < 50) score = 100 - score;
    result.score = score;
  }
  if (result.ethicalMarketing) {
    result.ethicalMarketing.score = toPercent(result.ethicalMarketing.score);
  }
  return result;
};

export const analyzeCompliance = async (params) =>
  normalizeScores(await withFallback('audit', () => analyzeWithClaude(params), () => analyzeWithGemini(params)));

export const extractClaims = (text) =>
  withFallback('claim extraction', () => extractClaimsWithClaude(text), () => extractClaimsWithGemini(text));
