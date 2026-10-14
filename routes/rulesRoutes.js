import express from 'express';
import { getRulesMetadata, getRulePack } from '../services/rulesService.js';

const router = express.Router();

// GET /rules/metadata
router.get('/rules/metadata', (req, res) => {
  try {
    const metadata = getRulesMetadata();
    console.log('[Rules] Metadata countries count:', Array.isArray(metadata.countries) ? metadata.countries.length : 0);
    return res.json({ ok: true, data: metadata });
  } catch (error) {
    console.error('[Rules] Metadata error:', error);
    return res.status(500).json({ ok: false, error: error.message || 'Failed to load rules metadata' });
  }
});

// GET /rules/pack?country=india
router.get('/rules/pack', (req, res) => {
  try {
    const groups = getRulePack(req.query.country || 'india');
    const count = groups.reduce((sum, group) => sum + group.rules.length, 0);
    return res.json({ ok: true, data: { count, groups } });
  } catch (error) {
    console.error('[Rules] Pack error:', error);
    return res.status(500).json({ ok: false, error: error.message || 'Failed to load rule pack' });
  }
});

export default router;
