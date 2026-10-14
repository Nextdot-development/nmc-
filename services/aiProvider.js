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

/* ===============================
   DETERMINISTIC SCORING
   The score is derived from the findings, not chosen by the model, so the
   same findings always give the same score and status.
================================ */
const SEVERITY_PENALTY = { Critical: 30, High: 15, Medium: 7, Low: 3 };
const SEVERITY_ORDER = ['Critical', 'High', 'Medium', 'Low'];

const normalizeKey = (text = '') => String(text).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

// One finding per flagged line: keep the most severe when the same line appears twice
const dedupeViolations = (violations = []) => {
  const byLine = new Map();
  for (const v of violations) {
    const severity = SEVERITY_ORDER.includes(v?.severity) ? v.severity : 'Medium';
    const item = { ...v, severity };
    const line = item.originalLine || item.problematicContent || '';
    const key = normalizeKey(line) || normalizeKey(item.regulation);
    const existing = byLine.get(key);
    if (!existing || SEVERITY_ORDER.indexOf(severity) < SEVERITY_ORDER.indexOf(existing.severity)) {
      byLine.set(key, item);
    }
  }
  return [...byLine.values()].sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));
};

export const scoreFromViolations = (violations = []) => {
  const penalty = violations.reduce((sum, v) => sum + (SEVERITY_PENALTY[v.severity] || 7), 0);
  const score = Math.max(0, 100 - penalty);
  const hasCritical = violations.some((v) => v.severity === 'Critical');
  const hasHigh = violations.some((v) => v.severity === 'High');
  let status = 'Needs Review';
  if (hasCritical || score < 50) status = 'Non-Compliant';
  else if (score >= 80 && !hasHigh) status = 'Compliant';
  return { score, status };
};

const finalizeResult = (result) => {
  if (!result || typeof result !== 'object') return result;
  result.violations = dedupeViolations(Array.isArray(result.violations) ? result.violations : []);
  // Fill the line-level fix fields from the older ones when a model omits them
  result.violations = result.violations.map((v) => ({
    ...v,
    originalLine: v.originalLine || v.problematicContent || '',
    problematicContent: v.problematicContent || v.originalLine || ''
  }));
  Object.assign(result, scoreFromViolations(result.violations));
  if (result.ethicalMarketing) {
    result.ethicalMarketing.score = toPercent(result.ethicalMarketing.score);
  }
  return result;
};

export const analyzeCompliance = async (params) =>
  finalizeResult(await withFallback('audit', () => analyzeWithClaude(params), () => analyzeWithGemini(params)));

export const extractClaims = (text) =>
  withFallback('claim extraction', () => extractClaimsWithClaude(text), () => extractClaimsWithGemini(text));
