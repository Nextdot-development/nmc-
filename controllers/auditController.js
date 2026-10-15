import AuditRecord from '../models/AuditRecord.js';
import { detectContentType, processContent } from '../services/contentProcessor.js';
import {
  BillingError, gateResult, getAccount, historySince, quoteAudit, refundCredits, spendCredits,
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
    if (text) input.text = text;
    if (url) input.url = url;
    if (file) input.file = file;
    
    // Credits: check the plan allows this format, then charge before the audit runs
    const account = await getAccount(req.user.id, req.user.email);
    const quote = await quoteAudit(input, detectContentType(input), account.plan);
    const label = `${FORMAT_LABEL[quote.format] || 'Content'} audit${quote.minutes ? ` (${quote.minutes} min)` : ''}`;
    const charge = await spendCredits(req.user.id, quote.credits, label);

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
    if (auditResult?.reused) {
      balance = await refundCredits(req.user.id, charge, 'Same content as an earlier audit');
      charged = 0;
    }

    return res.status(201).json({ ...gateResult(auditResult, account.plan), billing: { charged, balance, minutes: quote.minutes } });
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
    const since = historySince(account.plan);
    const query = { userId: req.user?.id, ...(since ? { createdAt: { $gte: since } } : {}) };
    const audits = await AuditRecord.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .select('auditResult contentType originalInput createdAt')
      .lean();

    // Keep the audit result shape; add record metadata alongside it
    const results = audits.map((record) => ({
      ...gateResult(record.auditResult, account.plan),
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
    return res.json(gateResult(audit.auditResult, account.plan));
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
