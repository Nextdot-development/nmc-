import { createAudit } from './auditController.js';

/**
 * Compatibility endpoint for /api/analyze
 * POST /api/analyze — maps { content, inputType } onto /api/audit so credits and plan rules apply
 */
export const analyzeCompatibility = (req, res) => {
  const { content, inputType } = req.body || {};
  if (!content && !req.file) {
    return res.status(400).json({ ok: false, error: 'Content or file is required' });
  }
  if (content) {
    if (inputType === 'URL') req.body.url = content;
    else req.body.text = content;
  }
  return createAudit(req, res);
};

export default {
  analyzeCompatibility
};
