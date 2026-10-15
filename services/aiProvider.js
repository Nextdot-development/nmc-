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

/* ===============================
   RULE-PACK BINDING
   Every finding must cite a rule that exists in the pack. Citation text comes
   from the pack (not the model); findings without a valid rule are dropped.
================================ */
const normalizeRef = (s = '') => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '');

const bindToRulePack = (violations, rules = []) => {
  if (!rules.length) return { violations, dropped: [] };
  const byId = new Map(rules.map((r) => [normalizeRef(r.id), r]));
  const kept = [];
  const dropped = [];
  for (const v of violations) {
    let rule = byId.get(normalizeRef(v.ruleId));
    if (!rule) {
      // Fall back to the cited section + title when the ID was mistyped
      const cited = normalizeRef(v.regulation);
      rule = rules.find((r) => r.section && r.title && cited.includes(normalizeRef(r.title)) && cited.includes(normalizeRef(r.section)));
    }
    if (!rule) {
      dropped.push({ ruleId: v.ruleId || '', regulation: v.regulation || '', line: v.originalLine || v.problematicContent || '' });
      continue;
    }
    kept.push({
      ...v,
      ruleId: rule.id,
      regulation: `${rule.regulation} - ${rule.title}${rule.section ? ` (Section: ${rule.section})` : ''}`,
      ruleSource: rule.source || ''
    });
  }
  if (dropped.length) console.warn('[AI] Dropped findings without a valid rule', JSON.stringify(dropped));
  return { violations: kept, dropped };
};

const finalizeResult = (result, rules = []) => {
  if (!result || typeof result !== 'object') return result;
  const raw = Array.isArray(result.violations) ? result.violations : [];
  const bound = bindToRulePack(raw, rules);
  result.ruleCheck = { kept: bound.violations.length, dropped: bound.dropped.length };
  result.violations = dedupeViolations(bound.violations);
  console.log('[AI] Findings', JSON.stringify({ raw: raw.length, bound: bound.violations.length, dropped: bound.dropped.length, final: result.violations.length }));
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
  finalizeResult(await withFallback('audit', () => analyzeWithClaude(params), () => analyzeWithGemini(params)), params.rules);

export const extractClaims = (text) =>
  withFallback('claim extraction', () => extractClaimsWithClaude(text), () => extractClaimsWithGemini(text));
