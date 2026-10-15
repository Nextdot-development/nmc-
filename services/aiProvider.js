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

/* ===============================
   SAFETY NET
   Wording that almost always breaks NMC advertising rules. If such a line is
   not covered by any finding, the content is audited again with those lines
   pointed out, and the findings are merged. Runs only when something was missed.
================================ */
const RED_FLAGS = [
  // English
  /\b100\s*%/i, /\bguarantee[ds]?\b/i, /\bbest\b/i, /\bno\.?\s*1\b/i, /\bnumber\s*one\b/i, /\b(top|leading|most trusted|unmatched)\b/i,
  /\b(cure[sd]?|curing|permanent(ly)?|miracle|painless|reverse[sd]?)\b/i, /\bfree\b/i, /\d+\s*%\s*off\b/i,
  /\b(discount|cashback|coupon|offer)\b/i, /\brefer\b/i, /\bbefore[\s-]*(and[\s-]*)?after\b/i, /\bcelebrit/i,
  /\b(call|book|whatsapp)\s+(us\s+)?(now|today)\b/i, /\blimited\s+(slots|offer|period)\b/i,
  /\b\d[\d,]*\+?\s*(happy\s+)?(patients|cases|surgeries|families)\b/i, /\bhappy patients\b/i, /\bsuccess\s*rate\b/i,
  // Hindi (Devanagari)
  /गारंटी/, /पक्का/, /सबसे\s*(अच्छा|बेहतर|अच्छे)/, /नंबर\s*1/, /मुफ़्त|मुफ्त|फ्री/, /छूट|ऑफर|डिस्काउंट/, /अभी\s*(कॉल|बुक)/, /जड़\s*से/, /हमेशा\s*के\s*लिए/,
  // Hinglish
  /\bpakka\b/i, /\bilaaj\b/i, /\bjad\s*se\b/i, /\bgayab\b/i, /\bmuft\b/i, /\bsabse\s*(accha|achha|best)\b/i, /\babhi\s+(call|book)/i,
];

const MAX_SECOND_PASS_LINES = 40;

const splitLines = (text = '') => String(text)
  .split(/\n+|(?<=[.!?।])\s+/)
  .map((l) => l.replace(/^[\s*\-•#>]+/, '').trim())
  .filter((l) => l.length >= 4 && l.length <= 400);

const findUncoveredRedFlags = (content, violations) => {
  const covered = violations.map((v) => normalizeKey(v.originalLine || v.problematicContent || '')).filter(Boolean);
  const missed = [];
  for (const line of splitLines(content)) {
    if (!RED_FLAGS.some((re) => re.test(line))) continue;
    const key = normalizeKey(line);
    if (!key || covered.some((c) => c.includes(key) || key.includes(c))) continue;
    if (!missed.includes(line)) missed.push(line);
  }
  return missed.slice(0, MAX_SECOND_PASS_LINES);
};

const runAudit = (params) => withFallback('audit', () => analyzeWithClaude(params), () => analyzeWithGemini(params));

export const analyzeCompliance = async (params) => {
  const first = finalizeResult(await runAudit(params), params.rules);
  const missed = findUncoveredRedFlags(params.content, first.violations || []);
  if (!missed.length) return first;

  console.log('[AI] Safety net: second pass for uncovered lines', JSON.stringify({ count: missed.length }));
  try {
    const focus = `QUALITY CHECK: a first review did not report the lines below, although they contain wording that commonly breaks NMC rules. Audit the full content again and examine each of these lines carefully; report every one that breaks a listed rule, using the exact line as originalLine.\n${missed.map((l) => `- ${l}`).join('\n')}`;
    const second = finalizeResult(await runAudit({
      ...params,
      contentContext: [params.contentContext, focus].filter(Boolean).join('\n\n')
    }), params.rules);

    // Prefer the pass that found more for the narrative fields, then merge findings
    const base = (second.violations?.length || 0) > (first.violations?.length || 0) ? second : first;
    const merged = dedupeViolations([...(first.violations || []), ...(second.violations || [])]);
    const result = { ...base, violations: merged };
    Object.assign(result, scoreFromViolations(merged));
    result.ruleCheck = { kept: merged.length, dropped: (first.ruleCheck?.dropped || 0) + (second.ruleCheck?.dropped || 0) };
    result.safetyNet = { flaggedLines: missed.length, added: merged.length - (first.violations?.length || 0) };
    console.log('[AI] Safety net merged', JSON.stringify(result.safetyNet));
    return result;
  } catch (error) {
    console.warn('[AI] Safety net second pass failed:', error.message);
    return first;
  }
};

export const extractClaims = (text) =>
  withFallback('claim extraction', () => extractClaimsWithClaude(text), () => extractClaimsWithGemini(text));
