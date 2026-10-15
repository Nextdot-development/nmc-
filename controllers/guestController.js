import crypto from 'crypto';
import mongoose from 'mongoose';
import { processContent } from '../services/contentProcessor.js';
import { gateResult } from '../services/billingService.js';

/* ===============================
   GUEST TRY (landing page)
   One text audit per visitor per day without an account. Results are shown
   with Free-plan gates. Identical content reuses the earlier result and
   does not count, so sample ads cost nothing after the first run.
================================ */

// Shared database: own collection, no indexes
const GuestTrial = mongoose.model('NmcGuestTrial', new mongoose.Schema({
  ipHash: { type: String, required: true },
  chars: Number,
  reused: Boolean,
}, { timestamps: true, autoIndex: false, collection: 'nmc_guest_trials' }));

// Guest audits are stored under a fixed id that no real user has, so they never show in anyone's history
const GUEST_USER_ID = process.env.GUEST_USER_ID || '000000000000000000000001';
const MIN_CHARS = 20;
const MAX_CHARS = 2000;
const PER_IP_PER_DAY = 1;
const DAILY_LIMIT = () => Number(process.env.GUEST_DAILY_LIMIT) || 100;

const PUBLISHERS = ['Doctor (Registered Practitioner)', 'Hospital / Clinic', 'Healthcare marketing agency', 'Pharma / Wellness brand'];
const CHANNELS = ['Instagram Reel / Feed Ad', 'YouTube video', 'Facebook / Google ad', 'Website / Landing page', 'WhatsApp / SMS', 'Print / Hoarding'];

// Who publishes and where, from fixed lists only
const contextFrom = ({ publisher, channel }) => {
  const parts = [];
  if (PUBLISHERS.includes(publisher)) parts.push(`Published by: ${publisher}.`);
  if (CHANNELS.includes(channel)) parts.push(`Where it will appear: ${channel}.`);
  return parts.join(' ');
};

const inFlight = new Set();

const clientIp = (req) => req.headers['x-real-ip'] || req.socket?.remoteAddress || '';
const hashIp = (ip) => crypto.createHash('sha256').update(`${process.env.JWT_SECRET || ''}|${ip}`).digest('hex');

export const tryAudit = async (req, res) => {
  const text = String(req.body?.text || '').trim();
  if (text.length < MIN_CHARS) {
    return res.status(400).json({ error: 'Please paste a little more of your ad (at least 20 characters).', code: 'TOO_SHORT' });
  }
  if (text.length > MAX_CHARS) {
    return res.status(400).json({ error: `The free try checks up to ${MAX_CHARS.toLocaleString('en-IN')} characters. Sign up to audit longer content.`, code: 'TOO_LONG' });
  }

  const ipHash = hashIp(clientIp(req));
  if (inFlight.has(ipHash)) {
    return res.status(429).json({ error: 'Your audit is already running. Please wait for it to finish.', code: 'IN_PROGRESS' });
  }

  const since = new Date(Date.now() - 864e5);
  const [mine, today] = await Promise.all([
    GuestTrial.countDocuments({ ipHash, reused: false, createdAt: { $gte: since } }),
    GuestTrial.countDocuments({ reused: false, createdAt: { $gte: since } }),
  ]);

  inFlight.add(ipHash);
  try {
    // Over the limit: only an identical, already audited text can still be shown (it costs nothing)
    const limited = mine >= PER_IP_PER_DAY || today >= DAILY_LIMIT();
    const result = await processContent({ text }, {
      userId: GUEST_USER_ID,
      category: 'HealthCare',
      analysisMode: 'Standard',
      country: 'India',
      reuseOnly: limited,
      context: contextFrom(req.body || {}),
    });

    if (!result) {
      const code = mine >= PER_IP_PER_DAY ? 'TRY_USED' : 'TRY_BUSY';
      return res.status(429).json({
        code,
        error: code === 'TRY_USED'
          ? 'You have used your free audit for today. Create a free account to get 3 audits.'
          : 'Free tries are busy right now. Create a free account to run your audit.',
      });
    }

    await GuestTrial.create({ ipHash, chars: text.length, reused: Boolean(result.reused) });
    console.log('[Guest] Try audit', JSON.stringify({ reused: Boolean(result.reused), chars: text.length, today: today + (result.reused ? 0 : 1) }));
    const { sourceText, ...rest } = gateResult(result, 'free');
    return res.json({ ...rest, guest: { remaining: result.reused ? Math.max(0, PER_IP_PER_DAY - mine) : 0 } });
  } catch (error) {
    console.error('[Guest] Try audit failed:', error.message);
    return res.status(500).json({ error: 'The audit could not finish. Please try again in a minute.' });
  } finally {
    inFlight.delete(ipHash);
  }
};
