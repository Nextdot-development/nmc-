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

export const analyzeCompliance = (params) =>
  withFallback('audit', () => analyzeWithClaude(params), () => analyzeWithGemini(params));

export const extractClaims = (text) =>
  withFallback('claim extraction', () => extractClaimsWithClaude(text), () => extractClaimsWithGemini(text));
