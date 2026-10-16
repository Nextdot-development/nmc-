import AuditRecord from '../models/AuditRecord.js';
import { detectContentType, normalizeUrlKey, processContent } from '../services/contentProcessor.js';
import {
  BillingError, gateResult, getAccount, historySince, isUnlimited, quoteAudit, refundCredits, spendCredits,
} from '../services/billingService.js';
import { getPlan } from '../config/plans.js';
import { withProgress } from '../services/progress.js';
import { fileIssue, withDiagnosis } from '../services/auditDoctor.js';

const FORMAT_LABEL = { text: 'Text', url: 'Website', image: 'Image', video: 'Video', audio: 'Audio', document: 'Document' };

/**
 * Audit Controller
 * Uses Smart AI Model Router for automatic model selection
 * Router handles: model selection, fallback, cost optimization
 */

/**
 * Audit Controller
 * Handles audit requests and history retrieval
 */

const reply = (status, body) => ({ status, body });

/**
 * Runs one audit request (validation, credits, audit, refunds) and returns the response
 * status and body. Used by POST /audit and the live POST /audit/stream.
 */
const runAuditRequest = async (req) => {
  try {
    const { text, url, category, analysisMode, country, region } = req.body;
    const file = req.file;
    
    // Validate input
    if (!text && !url && !file) {
      return reply(400, {
        success: false,
        error: 'At least one of text, url, or file is required'
      });
    }
    
    // Prepare input object
    const input = {};
    // A link pasted into the text box is audited as that link, so both tabs give the same result
    const onlyLink = !url && !file && typeof text === 'string' && /^https?:\/\/\S+$/i.test(text.trim());
    if (onlyLink) input.url = text.trim();
    else if (text) input.text = text;
    if (url) input.url = url;
    if (file) input.file = file;
    
    // Social apps show posts only after login, so a link cannot be read; stop before charging
    if (input.url && /(^|\/\/|\.)(instagram\.com|facebook\.com|fb\.watch|tiktok\.com|threads\.net)/i.test(input.url)) {
      return reply(400, {
        code: 'SOCIAL_LINK_UNREADABLE',
        error: 'Instagram, Facebook and TikTok posts can only be seen after login, so they cannot be read from a link. Upload the video or image file, or paste the caption or script as text. No credits were used.'
      });
    }

    // A YouTube search, channel or home page is not one video and cannot be transcribed
    if (input.url && /(^|\/\/|\.)(youtube\.com|youtu\.be)/i.test(input.url) && !normalizeUrlKey(input.url).startsWith('yt:')) {
      return reply(400, {
        code: 'NOT_A_VIDEO',
        error: 'This is a YouTube search or channel page, not a single video. Open the video and copy its link (it looks like youtube.com/watch?v=… or youtu.be/…). No credits were used.'
      });
    }

    // Credits: check the plan allows this format, then charge before the audit runs
    const account = await getAccount(req.user.id, req.user.email);
    const unlimited = isUnlimited(req.user.email);
    const planId = unlimited ? 'enterprise' : account.plan;
    const quote = await quoteAudit(input, detectContentType(input), planId);
    const label = `${FORMAT_LABEL[quote.format] || 'Content'} audit${quote.minutes ? ` (${quote.minutes} min)` : ''}`;
    // Testing accounts are never charged
    const charge = unlimited
      ? { credits: 0, planUsed: 0, extraUsed: 0, balance: account.planCredits + account.extraCredits }
      : await spendCredits(req.user.id, quote.credits, label);

    // Video links: once the length is known, enforce the plan's minutes and charge the rest
    let videoMinutes = null;
    const mediaGuard = quote.videoLink ? async (minutes) => {
      videoMinutes = minutes;
      const plan = getPlan(planId);
      if (plan.maxMediaMinutes && minutes > plan.maxMediaMinutes) {
        throw new BillingError(`This video is about ${minutes} minutes. The ${plan.name} plan audits videos up to ${plan.maxMediaMinutes} minutes. No credits were used.`, 403, 'MEDIA_TOO_LONG', { minutes, limit: plan.maxMediaMinutes });
      }
      const extra = Math.ceil(minutes / 5) * 2 - charge.credits;
      if (extra > 0 && !unlimited) {
        const more = await spendCredits(req.user.id, extra, `${label} (${minutes} min)`);
        charge.credits += more.credits;
        charge.planUsed += more.planUsed;
        charge.extraUsed += more.extraUsed;
        charge.balance = more.balance;
      }
    } : null;

    let auditResult;
    let notes = [];
    try {
      ({ value: auditResult, notes } = await withDiagnosis(() => processContent(input, {
        userId: req.user?.id,
        fresh: req.body.fresh === 'true' || req.body.fresh === true,
        category,
        analysisMode,
        country,
        region,
        mediaGuard
      })));
    } catch (error) {
      await refundCredits(req.user.id, charge, `${label} failed`);
      // Too long for the plan, or not enough credits for the full length: say so plainly
      if (error instanceof BillingError) {
        const msg = error.code === 'INSUFFICIENT_CREDITS'
          ? `This video is about ${videoMinutes} minutes and needs ${Math.ceil(videoMinutes / 5) * 2} credits. ${error.message.replace(/^This audit needs[^.]*\.\s*/, '')} No credits were used.`
          : error.message;
        return reply(error.status, { error: msg, code: error.code, ...error.extra });
      }
      // Audit Doctor: name the cause and give the user a ticket to send to the team
      const issue = await fileIssue({ user: req.user, input, contentType: quote.format, notes: [...(error.diagnosisNotes || []), { where: 'Audit', code: 'OTHER', message: String(error.message || '').slice(0, 300), at: new Date() }] });
      console.error('[Audit Controller] Error:', error);
      return reply(500, { error: `${issue.title}. No credits were used.`, code: 'AUDIT_FAILED', issue });
    }

    // Content could not be read even after the automatic repair: explain why, offer a ticket
    if (auditResult?.incomplete) {
      auditResult = { ...auditResult, issue: await fileIssue({ user: req.user, input, contentType: quote.format, notes, fallback: auditResult.incomplete.reason }) };
    }

    // Identical content returns the earlier result, which costs nothing
    let charged = charge.credits;
    let balance = charge.balance;
    if (auditResult?.incomplete && charge.credits) {
      balance = await refundCredits(req.user.id, charge, 'Content could not be read');
      charged = 0;
    } else if (auditResult?.reused && charge.credits) {
      balance = await refundCredits(req.user.id, charge, 'Same content as an earlier audit');
      charged = 0;
    }

    return reply(201, { ...gateResult(auditResult, planId), billing: { charged, balance, minutes: quote.minutes ?? videoMinutes, unlimited } });
  } catch (error) {
    if (error instanceof BillingError) {
      return reply(error.status, { error: error.message, code: error.code, ...error.extra });
    }
    console.error('[Audit Controller] Error:', error);
    return reply(500, {
      error: error.message || error.error || 'Failed to create audit'
    });
  }
};

/**
 * Create a new audit
 * POST /audit
 */
export const createAudit = async (req, res) => {
  const { status, body } = await runAuditRequest(req);
  return res.status(status).json(body);
};

/**
 * Live audit: newline-delimited JSON events while the audit runs
 * POST /audit/stream
 * Events: stage {message}, source {text}, finding {finding}, result {status, body}, ping
 */
export const streamAudit = async (req, res) => {
  res.status(200);
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('X-Accel-Buffering', 'no'); // tell Nginx not to hold events back
  res.flushHeaders?.();

  let open = true;
  // the response closes when the browser goes away; the audit itself still finishes and is saved
  res.on('close', () => { open = false; });
  const send = (event) => { if (open) res.write(`${JSON.stringify(event)}\n`); };
  const ping = setInterval(() => send({ type: 'ping' }), 15000);

  // Fixes beyond the plan's preview stay hidden while streaming, as in the final report
  let fixPreview = null;
  try {
    const account = await getAccount(req.user.id, req.user.email);
    fixPreview = isUnlimited(req.user.email) ? null : getPlan(account.plan).fixPreviewLines;
  } catch { /* plan gate is applied again on the final result */ }
  let findings = 0;
  const emit = (event) => {
    if (event.type === 'finding') {
      findings += 1;
      if (fixPreview != null && findings > fixPreview) {
        event = { ...event, finding: { ...event.finding, compliantLine: '', solution: '', locked: true } };
      }
    }
    send(event);
  };

  try {
    const outcome = await withProgress(emit, () => runAuditRequest(req));
    send({ type: 'result', status: outcome.status, body: outcome.body });
  } catch (error) {
    console.error('[Audit Stream] Error:', error);
    send({ type: 'result', status: 500, body: { error: 'Failed to create audit' } });
  } finally {
    clearInterval(ping);
    if (open) res.end();
  }
};

/**
 * Get audit history
 * GET /history
 */
export const getAuditHistory = async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;

    // History length depends on the plan
    const account = await getAccount(req.user.id, req.user.email);
    const planId = isUnlimited(req.user.email) ? 'enterprise' : account.plan;
    const since = historySince(planId);
    const query = { userId: req.user?.id, ...(since ? { createdAt: { $gte: since } } : {}) };
    const audits = await AuditRecord.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .select('auditResult contentType originalInput createdAt')
      .lean();

    // Keep the audit result shape; add record metadata alongside it
    const results = audits.map((record) => ({
      ...gateResult(record.auditResult, planId),
      _id: record._id,
      contentType: record.contentType,
      originalInput: record.originalInput,
      createdAt: record.createdAt
    }));
    return res.json(results);
  } catch (error) {
    console.error('[Audit Controller] History error:', error);
    return res.status(500).json({
      error: error.message || error.error || 'Failed to retrieve audit history'
    });
  }
};

/**
 * Get single audit by ID
 * GET /audit/:id
 */
export const getAuditById = async (req, res) => {
  try {
    const { id } = req.params;

    const audit = await AuditRecord.findOne({ _id: id, userId: req.user?.id })
      .select('auditResult')
      .lean();

    if (!audit) {
      return res.status(404).json({
        error: 'Audit not found'
      });
    }

    const account = await getAccount(req.user.id, req.user.email);
    return res.json(gateResult(audit.auditResult, isUnlimited(req.user.email) ? 'enterprise' : account.plan));
  } catch (error) {
    console.error('[Audit Controller] Get by ID error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        error: 'Invalid audit ID format'
      });
    }
    return res.status(500).json({
      error: error.message || error.error || 'Failed to retrieve audit'
    });
  }
};

export default {
  createAudit,
  streamAudit,
  getAuditHistory,
  getAuditById
};
