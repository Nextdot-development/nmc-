import AuditRecord from '../models/AuditRecord.js';
import { detectContentType, processContent } from '../services/contentProcessor.js';
import {
  BillingError, gateResult, getAccount, historySince, isUnlimited, quoteAudit, refundCredits, spendCredits,
} from '../services/billingService.js';

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

/**
 * Create a new audit
 * POST /audit
 */
export const createAudit = async (req, res) => {
  try {
    const { text, url, category, analysisMode, country, region } = req.body;
    const file = req.file;
    
    // Validate input
    if (!text && !url && !file) {
      return res.status(400).json({
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
      return res.status(400).json({
        code: 'SOCIAL_LINK_UNREADABLE',
        error: 'Instagram, Facebook and TikTok posts can only be seen after login, so they cannot be read from a link. Upload the video or image file, or paste the caption or script as text. No credits were used.'
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

    let auditResult;
    try {
      auditResult = await processContent(input, {
        userId: req.user?.id,
        fresh: req.body.fresh === 'true' || req.body.fresh === true,
        category,
        analysisMode,
        country,
        region
      });
    } catch (error) {
      await refundCredits(req.user.id, charge, `${label} failed`);
      throw error;
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

    return res.status(201).json({ ...gateResult(auditResult, planId), billing: { charged, balance, minutes: quote.minutes, unlimited } });
  } catch (error) {
    if (error instanceof BillingError) {
      return res.status(error.status).json({ error: error.message, code: error.code, ...error.extra });
    }
    console.error('[Audit Controller] Error:', error);
    return res.status(500).json({
      error: error.message || error.error || 'Failed to create audit'
    });
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
  getAuditHistory,
  getAuditById
};
