import mongoose from 'mongoose';
import { AuditIssue, notifyTeam } from '../services/auditDoctor.js';

export const isAdmin = (email = '') => (process.env.ADMIN_EMAILS || '')
  .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
  .includes(String(email).toLowerCase());

const validId = (id) => mongoose.Types.ObjectId.isValid(id);

// POST /support/issues/:id/report { note } — the user sends their audit problem to the team
export const reportIssue = async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid ticket' });
    const issue = await AuditIssue.findOne({ _id: req.params.id, userId: req.user.id });
    if (!issue) return res.status(404).json({ error: 'Ticket not found' });
    if (issue.status === 'open') {
      issue.status = 'reported';
      issue.reportedAt = new Date();
    }
    issue.userNote = String(req.body?.note || '').slice(0, 1000);
    await issue.save();
    const notified = await notifyTeam(issue, issue.userNote);
    console.log('[Support] Issue reported', JSON.stringify({ id: String(issue._id), code: issue.code, notified }));
    return res.json({ ok: true, ref: String(issue._id).slice(-6).toUpperCase() });
  } catch (error) {
    console.error('[Support] Report error:', error.message);
    return res.status(500).json({ error: 'Could not send the report. Please try again.' });
  }
};

// GET /support/issues?status= — admins only
export const listIssues = async (req, res) => {
  if (!isAdmin(req.user.email)) return res.status(403).json({ error: 'Admins only' });
  const q = req.query.status ? { status: req.query.status } : {};
  const issues = await AuditIssue.find(q).sort({ createdAt: -1 }).limit(200).lean();
  return res.json(issues);
};

// PATCH /support/issues/:id { status } — admins only
export const updateIssue = async (req, res) => {
  if (!isAdmin(req.user.email)) return res.status(403).json({ error: 'Admins only' });
  if (!validId(req.params.id)) return res.status(400).json({ error: 'Invalid ticket' });
  const status = ['open', 'reported', 'resolved'].includes(req.body?.status) ? req.body.status : null;
  if (!status) return res.status(400).json({ error: 'Unknown status' });
  const issue = await AuditIssue.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true }).lean();
  return issue ? res.json(issue) : res.status(404).json({ error: 'Ticket not found' });
};
