import { AsyncLocalStorage } from 'async_hooks';
import mongoose from 'mongoose';

/* ===============================
   AUDIT DOCTOR
   Collects what went wrong while reading content, names the cause in plain words,
   and files a ticket the user can send to the team.
================================ */

const store = new AsyncLocalStorage();

// Runs fn with a fresh list of notes; returns { value, notes } or throws { error, notes }
export const withDiagnosis = async (fn) => {
  const notes = [];
  try {
    const value = await store.run(notes, fn);
    return { value, notes };
  } catch (error) {
    error.diagnosisNotes = notes;
    throw error;
  }
};

const CAUSES = [
  { code: 'VIDEO_PRIVATE', re: /private video|members[- ]only|confirm your age|age[- ]restricted|video (is )?unavailable|has been removed|not available in your country/i },
  { code: 'AI_WITHHELD', re: /RECITATION|empty transcript|no real speech/i },
  { code: 'LINK_REFUSED', re: /URL_ROBOTED|ROBOTED_DENIED|Cannot fetch content from the provided URL/i },
  { code: 'AI_TIMEOUT', re: /timed out|timeout|ETIMEDOUT/i },
  { code: 'AI_BUSY', re: /429|RESOURCE_EXHAUSTED|rate limit|overloaded/i },
  { code: 'SOURCE_BLOCKED', re: /not a bot|sign in to confirm|403|forbidden|blocked/i },
  { code: 'PAGE_UNREADABLE', re: /metadata only|login|javascript/i },
];

export const causeOf = (message = '') => (CAUSES.find((c) => c.re.test(message)) || { code: 'OTHER' }).code;

// Record one problem (called from deep inside the pipeline; no-op outside an audit)
export const note = (where, error) => {
  const notes = store.getStore();
  if (!notes) return;
  const message = String(error?.message || error || '').replace(/\s+/g, ' ').slice(0, 300);
  notes.push({ where, code: causeOf(message), message, at: new Date() });
};

// Most telling cause first: something the user can act on beats a temporary hiccup
const PRIORITY = ['VIDEO_PRIVATE', 'AI_WITHHELD', 'LINK_REFUSED', 'PAGE_UNREADABLE', 'AI_TIMEOUT', 'AI_BUSY', 'SOURCE_BLOCKED', 'OTHER'];

const EXPLAIN = {
  VIDEO_PRIVATE: {
    title: 'This video is private or restricted',
    message: 'The video can only be watched after signing in (private, members-only or age-restricted), so it could not be read.',
    tips: ['Make the video public or unlisted and try again', 'Or upload the video file using the Video option'],
  },
  AI_WITHHELD: {
    title: 'The transcript service would not write out this video',
    message: 'Our speech-to-text service sometimes declines to write out branded ads word for word. We tried several times.',
    tips: ['Upload the video file using the Video option — this always works', 'Or paste the ad script into the Text option'],
  },
  LINK_REFUSED: {
    title: 'This link could not be opened',
    message: 'The link was refused by the service that reads videos.',
    tips: ['Open the video and copy its link again', 'Or upload the video file using the Video option'],
  },
  PAGE_UNREADABLE: {
    title: 'This page could not be read',
    message: 'The page needs a login or loads its text with JavaScript, so only its title could be read.',
    tips: ['Copy the page text and paste it into the Text option'],
  },
  AI_TIMEOUT: {
    title: 'Reading the content took too long',
    message: 'The service that reads the content did not answer in time, even after retries.',
    tips: ['Please try again in a few minutes', 'Or upload the file directly'],
  },
  AI_BUSY: {
    title: 'Our AI services are busy',
    message: 'Too many requests at the same moment. This usually clears within a minute or two.',
    tips: ['Please try again in a couple of minutes'],
  },
  SOURCE_BLOCKED: {
    title: 'The website blocked our reader',
    message: 'The source blocked automated reading, and the backup routes did not work either.',
    tips: ['Upload the file or paste the text instead'],
  },
  OTHER: {
    title: 'Something went wrong while reading this content',
    message: 'We could not read this content and could not tell exactly why.',
    tips: ['Please try again, or upload the file / paste the text instead'],
  },
};

export const diagnose = (notes = [], fallback = '') => {
  const codes = notes.map((n) => n.code);
  const code = PRIORITY.find((c) => codes.includes(c)) || (fallback === 'metadata_only' ? 'PAGE_UNREADABLE' : 'OTHER');
  return { code, ...EXPLAIN[code] };
};

/* ===============================
   TICKETS
================================ */
const IssueSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, default: null },
  email: { type: String, default: '' },
  contentType: { type: String, default: '' },
  input: { type: String, default: '' },
  code: { type: String, default: 'OTHER' },
  title: { type: String, default: '' },
  notes: { type: [mongoose.Schema.Types.Mixed], default: [] },
  status: { type: String, default: 'open' }, // open | reported | resolved
  userNote: { type: String, default: '' },
  reportedAt: { type: Date, default: null },
}, { timestamps: true, autoIndex: false, collection: 'nmc_audit_issues' });

export const AuditIssue = mongoose.models.NmcAuditIssue || mongoose.model('NmcAuditIssue', IssueSchema);

const describeInput = (input = {}) => {
  if (input.url) return input.url;
  if (input.file) return `${input.file.originalname || 'file'} (${input.file.mimetype}, ${Math.round((input.file.size || 0) / 1024)} KB)`;
  return String(input.text || '').slice(0, 300);
};

// Saves a ticket and returns what the app shows the user
export const fileIssue = async ({ user, input, contentType, notes, fallback }) => {
  const d = diagnose(notes, fallback);
  try {
    const issue = await AuditIssue.create({
      userId: user?.id || null,
      email: user?.email || '',
      contentType,
      input: describeInput(input),
      code: d.code,
      title: d.title,
      notes: notes.map(({ where, code, message, at }) => ({ where, code, message, at })),
    });
    console.log('[Audit Doctor] Issue filed', JSON.stringify({ id: String(issue._id), code: d.code, notes: notes.length }));
    return { id: String(issue._id), ref: String(issue._id).slice(-6).toUpperCase(), ...d };
  } catch (error) {
    console.warn('[Audit Doctor] Could not save issue:', error.message);
    return { id: null, ref: null, ...d };
  }
};

// Optional team notification (Slack / Google Chat / Discord style webhook taking {text})
export const notifyTeam = async (issue, userNote = '') => {
  const url = process.env.SUPPORT_WEBHOOK_URL;
  if (!url) return false;
  const text = `NextComply audit issue ${String(issue._id).slice(-6).toUpperCase()} — ${issue.title}\n`
    + `User: ${issue.email}\nInput: ${issue.input}\n${userNote ? `Note: ${userNote}\n` : ''}`
    + issue.notes.slice(0, 6).map((n) => `• ${n.where}: ${n.code} — ${n.message}`).join('\n');
  try {
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, content: text }), signal: AbortSignal.timeout(8000) });
    return true;
  } catch (error) {
    console.warn('[Audit Doctor] Team notification failed:', error.message);
    return false;
  }
};
