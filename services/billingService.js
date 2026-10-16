import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import axios from 'axios';
import mongoose from 'mongoose';
import { Account, Ledger, Payment } from '../models/Billing.js';
import { CREDIT_COST, PAID_PLANS, PERIOD_DAYS, PLANS, getPlan } from '../config/plans.js';

export class BillingError extends Error {
  constructor(message, status, code, extra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

const total = (acc) => (acc?.planCredits || 0) + (acc?.extraCredits || 0);

// Internal testing accounts (env UNLIMITED_EMAILS, comma-separated): no credits charged, every feature on
export const isUnlimited = (email = '') => (process.env.UNLIMITED_EMAILS || '')
  .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
  .includes(String(email).toLowerCase());

/* ===============================
   ACCOUNT
================================ */
const expireIfDue = async (acc) => {
  if (!acc || acc.plan === 'free' || !acc.periodEnd || acc.periodEnd > new Date()) return acc;
  const lost = acc.planCredits;
  const updated = await Account.findOneAndUpdate(
    { _id: acc._id, plan: acc.plan, periodEnd: acc.periodEnd },
    { $set: { plan: 'free', planCredits: 0, periodStart: null, periodEnd: null } },
    { new: true }
  ).lean();
  if (updated && lost) {
    await Ledger.create({ userId: acc.userId, type: 'expire', credits: -lost, balance: total(updated), note: `${getPlan(acc.plan).name} plan ended` });
  }
  return updated || acc;
};

export const getAccount = async (userId, email = '') => {
  let acc = await Account.findOne({ userId }).lean();
  if (!acc) {
    const free = PLANS.free.credits;
    // upsert so two parallel first requests create one account
    const res = await Account.collection.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(String(userId)) },
      { $setOnInsert: { email, plan: 'free', planCredits: free, extraCredits: 0, periodStart: null, periodEnd: null, enterprise: null, createdAt: new Date(), updatedAt: new Date() } },
      { upsert: true, returnDocument: 'after', includeResultMetadata: true }
    );
    acc = res.value;
    if (!res.lastErrorObject?.updatedExisting) {
      await Ledger.create({ userId, type: 'signup', credits: free, balance: free, note: 'Free credits' });
    }
  }
  return expireIfDue(acc);
};

export const describeAccount = (acc, email = '') => {
  if (isUnlimited(email || acc.email)) {
    const ent = PLANS.enterprise;
    return {
      plan: 'enterprise',
      planName: 'Unlimited (testing)',
      unlimited: true,
      credits: total(acc),
      planCredits: acc.planCredits,
      extraCredits: acc.extraCredits,
      periodEnd: null,
      features: { formats: ent.formats, maxMediaMinutes: ent.maxMediaMinutes, fixPreviewLines: null, compliantVersion: true, pdf: true, historyDays: null, seats: null, topup: null },
    };
  }
  const plan = getPlan(acc.plan);
  return {
    plan: plan.id,
    planName: plan.name,
    credits: total(acc),
    planCredits: acc.planCredits,
    extraCredits: acc.extraCredits,
    periodEnd: acc.periodEnd,
    features: {
      formats: plan.formats,
      maxMediaMinutes: plan.maxMediaMinutes,
      fixPreviewLines: plan.fixPreviewLines,
      compliantVersion: plan.compliantVersion,
      pdf: plan.pdf,
      historyDays: plan.historyDays,
      seats: acc.enterprise?.seats ?? plan.seats,
      topup: plan.topup,
    },
  };
};

/* ===============================
   CREDIT COST
================================ */
const VIDEO_URL = /youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|facebook\.com\/watch|instagram\.com\/reel|tiktok\.com|twitch\.tv|\.(mp4|webm|mov|avi|mkv|m4v|mp3|wav|m4a|aac|ogg|flac)(\?|$)/i;

// Duration of an uploaded audio/video file in seconds, or null when it cannot be read
const probeSeconds = async (buffer) => {
  const file = path.join(os.tmpdir(), `nmc-probe-${crypto.randomUUID()}`);
  try {
    await fs.promises.writeFile(file, buffer);
    const bin = process.env.FFPROBE_PATH || 'ffprobe';
    const out = await new Promise((resolve, reject) => {
      const p = spawn(bin, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file]);
      let s = '';
      p.stdout.on('data', (d) => { s += d; });
      p.on('error', reject);
      p.on('close', (code) => (code === 0 ? resolve(s) : reject(new Error(`ffprobe exit ${code}`))));
      setTimeout(() => { p.kill(); reject(new Error('ffprobe timeout')); }, 20000);
    });
    const sec = parseFloat(out);
    return Number.isFinite(sec) && sec > 0 ? sec : null;
  } catch (error) {
    console.warn('[Billing] Could not read media duration:', error.message);
    return null;
  } finally {
    fs.promises.unlink(file).catch(() => {});
  }
};

// Returns { format, credits, minutes } for an audit request, or throws when the plan does not allow it
export const quoteAudit = async (input, contentType, planId) => {
  const plan = getPlan(planId);
  const format = contentType;

  if (!plan.formats.includes(format)) {
    throw new BillingError(`${format === 'url' ? 'Website and YouTube' : format[0].toUpperCase() + format.slice(1)} audits are not included in the ${plan.name} plan. Upgrade to use this format.`, 403, 'FORMAT_NOT_IN_PLAN', { format });
  }

  if (format === 'url') {
    // Video links pay for the first 5 minutes now; the rest once the length is known
    return VIDEO_URL.test(input.url || '')
      ? { format, credits: CREDIT_COST.mediaPer5Min, minutes: null, videoLink: true }
      : { format, credits: CREDIT_COST.url, minutes: null };
  }

  if (format === 'video' || format === 'audio') {
    let seconds = await probeSeconds(input.file.buffer);
    if (!seconds) {
      // Rough size-based estimate when the duration cannot be read
      const mbPerMin = format === 'audio' ? 1 : 5;
      seconds = (input.file.size / (1024 * 1024) / mbPerMin) * 60;
    }
    const minutes = Math.max(1, Math.ceil(seconds / 60));
    if (plan.maxMediaMinutes && minutes > plan.maxMediaMinutes) {
      throw new BillingError(`This ${format} is about ${minutes} minutes. The ${plan.name} plan allows up to ${plan.maxMediaMinutes} minutes.`, 403, 'MEDIA_TOO_LONG', { minutes, limit: plan.maxMediaMinutes });
    }
    return { format, credits: Math.ceil(minutes / 5) * CREDIT_COST.mediaPer5Min, minutes };
  }

  return { format, credits: CREDIT_COST[format] ?? 1, minutes: null };
};

/* ===============================
   SPEND / REFUND (atomic)
================================ */
export const spendCredits = async (userId, credits, note) => {
  const before = await Account.collection.findOneAndUpdate(
    { userId: new mongoose.Types.ObjectId(String(userId)), $expr: { $gte: [{ $add: ['$planCredits', '$extraCredits'] }, credits] } },
    [
      { $set: { _use: { $min: ['$planCredits', credits] } } },
      { $set: { planCredits: { $subtract: ['$planCredits', '$_use'] }, extraCredits: { $subtract: ['$extraCredits', { $subtract: [credits, '$_use'] }] }, updatedAt: '$$NOW' } },
      { $unset: '_use' },
    ],
    { returnDocument: 'before' }
  );
  if (!before) {
    const acc = await Account.findOne({ userId }).lean();
    throw new BillingError(`This audit needs ${credits} credit${credits > 1 ? 's' : ''} and you have ${total(acc)}. Upgrade your plan or buy a top-up.`, 402, 'INSUFFICIENT_CREDITS', { needed: credits, balance: total(acc) });
  }
  const planUsed = Math.min(before.planCredits, credits);
  const charge = { credits, planUsed, extraUsed: credits - planUsed, balance: total(before) - credits };
  const entry = await Ledger.create({ userId, type: 'audit', credits: -credits, planUsed, extraUsed: charge.extraUsed, balance: charge.balance, note });
  return { ...charge, ledgerId: entry._id };
};

export const refundCredits = async (userId, charge, note) => {
  if (!charge?.credits) return null;
  const acc = await Account.findOneAndUpdate(
    { userId },
    { $inc: { planCredits: charge.planUsed, extraCredits: charge.extraUsed } },
    { new: true }
  ).lean();
  await Ledger.create({ userId, type: 'refund', credits: charge.credits, planUsed: charge.planUsed, extraUsed: charge.extraUsed, balance: total(acc), note, ref: String(charge.ledgerId || '') });
  return total(acc);
};

/* ===============================
   PLAN GATES ON RESULTS
   Stored results stay complete; what a plan cannot see is hidden on the way out,
   so upgrading unlocks earlier reports too.
================================ */
export const gateResult = (result, planId) => {
  if (!result || typeof result !== 'object') return result;
  const plan = getPlan(planId);
  const out = { ...result };
  let locked = 0;
  if (plan.fixPreviewLines != null && Array.isArray(out.violations)) {
    out.violations = out.violations.map((v, i) => {
      if (i < plan.fixPreviewLines) return v;
      locked += 1;
      return { ...v, compliantLine: '', solution: '', locked: true };
    });
  }
  const versionLocked = !plan.compliantVersion && Boolean(out.compliantVersion);
  if (versionLocked) delete out.compliantVersion;
  if (locked || versionLocked) out.planGate = { plan: plan.id, lockedFixes: locked, compliantVersionLocked: versionLocked };
  return out;
};

export const historySince = (planId) => {
  const days = getPlan(planId).historyDays;
  return days ? new Date(Date.now() - days * 864e5) : null;
};

/* ===============================
   PURCHASES
================================ */
const applyPlan = async (userId, planId, ref) => {
  const plan = PLANS[planId];
  const acc = await getAccount(userId);
  const now = new Date();
  const active = acc.plan === planId && acc.periodEnd && acc.periodEnd > now;
  // Renewing the same plan keeps leftovers only with rollover; switching plans keeps what was paid for
  const carry = acc.plan === 'free' ? 0 : active ? (plan.rollover ? Math.min(acc.planCredits, plan.credits) : 0) : acc.planCredits;
  const planCredits = plan.credits + carry;
  const updated = await Account.findOneAndUpdate(
    { userId },
    { $set: { plan: planId, planCredits, periodStart: now, periodEnd: new Date(now.getTime() + PERIOD_DAYS * 864e5) } },
    { new: true }
  ).lean();
  await Ledger.create({ userId, type: 'plan', credits: planCredits - acc.planCredits, balance: total(updated), note: `${plan.name} plan (${plan.credits} credits${carry ? ` + ${carry} carried over` : ''})`, ref });
  return updated;
};

const applyTopup = async (userId, credits, ref) => {
  const updated = await Account.findOneAndUpdate({ userId }, { $inc: { extraCredits: credits } }, { new: true }).lean();
  await Ledger.create({ userId, type: 'topup', credits, balance: total(updated), note: `Top-up ${credits} credits`, ref });
  return updated;
};

export const grantCredits = async ({ userId, plan, credits = 0, days = PERIOD_DAYS, seats, note = 'Granted by admin' }) => {
  await getAccount(userId);
  const set = {};
  if (plan) {
    set.plan = plan;
    set.periodStart = new Date();
    set.periodEnd = plan === 'free' ? null : new Date(Date.now() + days * 864e5);
    if (plan === 'enterprise') set.enterprise = { seats: seats ?? null, note };
  }
  const updated = await Account.findOneAndUpdate({ userId }, { $set: set, $inc: { planCredits: credits } }, { new: true }).lean();
  await Ledger.create({ userId, type: 'grant', credits, balance: total(updated), note });
  return updated;
};

/* ===============================
   RAZORPAY
   Keys come from the env; until they are set, payment endpoints answer 503.
================================ */
export const razorpayConfigured = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

const priceFor = (kind, planId, acc) => {
  if (kind === 'plan') {
    if (!PAID_PLANS.includes(planId)) throw new BillingError('This plan cannot be bought online.', 400, 'BAD_PLAN');
    return { amount: PLANS[planId].price * 100, credits: PLANS[planId].credits, planId, label: `${PLANS[planId].name} plan · 30 days` };
  }
  if (kind === 'topup') {
    const plan = getPlan(acc.plan);
    if (!plan.topup) throw new BillingError('Top-ups are available on the Starter and Premium plans.', 400, 'TOPUP_NOT_AVAILABLE');
    return { amount: plan.topup.price * 100, credits: plan.topup.credits, planId: plan.id, label: `${plan.topup.credits} extra credits` };
  }
  throw new BillingError('Unknown purchase.', 400, 'BAD_KIND');
};

export const createOrder = async (userId, { kind, planId }) => {
  if (!razorpayConfigured()) throw new BillingError('Online payments are being set up. Please contact us to upgrade.', 503, 'PAYMENTS_NOT_CONFIGURED');
  const acc = await getAccount(userId);
  const price = priceFor(kind, planId, acc);
  const receipt = `nmc_${Date.now()}_${String(userId).slice(-6)}`;
  const { data } = await axios.post('https://api.razorpay.com/v1/orders', {
    amount: price.amount,
    currency: 'INR',
    receipt,
    notes: { userId: String(userId), kind, planId: price.planId, credits: String(price.credits) },
  }, { auth: { username: process.env.RAZORPAY_KEY_ID, password: process.env.RAZORPAY_KEY_SECRET }, timeout: 15000 });

  await Payment.create({ userId, orderId: data.id, kind, planId: price.planId, credits: price.credits, amount: price.amount });
  return { keyId: process.env.RAZORPAY_KEY_ID, orderId: data.id, amount: price.amount, currency: 'INR', label: price.label };
};

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// Marks the order paid once and applies it; safe to call from both the checkout callback and the webhook
const fulfil = async (orderId, paymentId) => {
  const payment = await Payment.findOneAndUpdate(
    { orderId, status: 'created' },
    { $set: { status: 'paid', paymentId, paidAt: new Date() } },
    { new: true }
  ).lean();
  if (!payment) return { alreadyApplied: true, payment: await Payment.findOne({ orderId }).lean() };
  if (payment.kind === 'plan') await applyPlan(payment.userId, payment.planId, orderId);
  else await applyTopup(payment.userId, payment.credits, orderId);
  console.log('[Billing] Payment applied', JSON.stringify({ orderId, kind: payment.kind, planId: payment.planId }));
  return { alreadyApplied: false, payment };
};

export const verifyCheckout = async (userId, { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature }) => {
  if (!razorpayConfigured()) throw new BillingError('Online payments are not set up.', 503, 'PAYMENTS_NOT_CONFIGURED');
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
  if (!orderId || !paymentId || !safeEqual(expected, signature || '')) throw new BillingError('Payment could not be verified.', 400, 'BAD_SIGNATURE');
  const owner = await Payment.findOne({ orderId }).lean();
  if (!owner || String(owner.userId) !== String(userId)) throw new BillingError('Order not found.', 404, 'ORDER_NOT_FOUND');
  await fulfil(orderId, paymentId);
};

export const handleWebhook = async (rawBody, signature) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new BillingError('Webhook secret not set.', 503, 'WEBHOOK_NOT_CONFIGURED');
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  if (!safeEqual(expected, signature || '')) throw new BillingError('Bad webhook signature.', 400, 'BAD_SIGNATURE');
  const event = JSON.parse(rawBody.toString('utf8'));
  if (event.event === 'payment.captured' || event.event === 'order.paid') {
    const p = event.payload?.payment?.entity;
    if (p?.order_id) await fulfil(p.order_id, p.id);
  } else if (event.event === 'payment.failed') {
    const p = event.payload?.payment?.entity;
    if (p?.order_id) await Payment.updateOne({ orderId: p.order_id, status: 'created' }, { $set: { status: 'failed', paymentId: p.id } });
  }
};
