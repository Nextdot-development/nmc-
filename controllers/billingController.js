import mongoose from 'mongoose';
import User from '../models/User.js';
import { Ledger, Lead } from '../models/Billing.js';
import { CREDIT_COST, PLANS } from '../config/plans.js';
import {
  BillingError, createOrder, describeAccount, getAccount, grantCredits, handleWebhook, razorpayConfigured, verifyCheckout,
} from '../services/billingService.js';

const fail = (res, error, label) => {
  if (error instanceof BillingError) {
    return res.status(error.status).json({ error: error.message, code: error.code, ...error.extra });
  }
  console.error(`[Billing] ${label} error:`, error.response?.data || error.message);
  return res.status(500).json({ error: 'Something went wrong. Please try again.' });
};

// GET /billing/plans (public)
export const listPlans = (req, res) => {
  res.json({ plans: Object.values(PLANS), creditCost: CREDIT_COST, payments: razorpayConfigured() });
};

// GET /billing/me
export const getMe = async (req, res) => {
  try {
    const acc = await getAccount(req.user.id, req.user.email);
    res.json({ ...describeAccount(acc), payments: razorpayConfigured() });
  } catch (error) {
    fail(res, error, 'Account');
  }
};

// GET /billing/ledger
export const getLedger = async (req, res) => {
  try {
    const rows = await Ledger.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(50)
      .select('type credits balance note createdAt').lean();
    res.json(rows);
  } catch (error) {
    fail(res, error, 'Ledger');
  }
};

// POST /billing/order { kind: 'plan' | 'topup', planId }
export const postOrder = async (req, res) => {
  try {
    const order = await createOrder(req.user.id, req.body || {});
    res.json(order);
  } catch (error) {
    fail(res, error, 'Order');
  }
};

// POST /billing/verify { razorpay_order_id, razorpay_payment_id, razorpay_signature }
export const postVerify = async (req, res) => {
  try {
    await verifyCheckout(req.user.id, req.body || {});
    const acc = await getAccount(req.user.id);
    res.json({ ok: true, account: describeAccount(acc) });
  } catch (error) {
    fail(res, error, 'Verify');
  }
};

// POST /billing/webhook (raw body, called by Razorpay)
export const postWebhook = async (req, res) => {
  try {
    await handleWebhook(req.body, req.headers['x-razorpay-signature']);
    res.json({ ok: true });
  } catch (error) {
    fail(res, error, 'Webhook');
  }
};

// POST /billing/enterprise { name, email, phone, organisation, monthlyAudits, message } (public)
export const postEnterpriseLead = async (req, res) => {
  try {
    const { name, email, phone, organisation, monthlyAudits, message } = req.body || {};
    if (!name || !email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter your name and a valid email.' });
    }
    const clip = (s, n = 500) => String(s || '').slice(0, n);
    await Lead.create({
      name: clip(name, 120), email: clip(email, 160), phone: clip(phone, 40), organisation: clip(organisation, 160),
      monthlyAudits: clip(monthlyAudits, 40), message: clip(message, 2000),
    });
    console.log('[Billing] Enterprise enquiry received');
    res.json({ ok: true });
  } catch (error) {
    fail(res, error, 'Lead');
  }
};

// POST /billing/admin/grant { email, plan?, credits?, days?, seats?, note? } (ADMIN_EMAILS only)
export const postGrant = async (req, res) => {
  try {
    const admins = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (!admins.includes(String(req.user.email || '').toLowerCase())) return res.status(403).json({ error: 'Admins only' });
    const { email, plan, credits = 0, days, seats, note } = req.body || {};
    if (plan && !PLANS[plan]) return res.status(400).json({ error: 'Unknown plan' });
    const user = await User.findOne({ email: String(email || '').toLowerCase() }).select('_id email').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    const acc = await grantCredits({ userId: new mongoose.Types.ObjectId(String(user._id)), plan, credits: Number(credits) || 0, days: Number(days) || undefined, seats, note });
    res.json({ ok: true, account: describeAccount(acc) });
  } catch (error) {
    fail(res, error, 'Grant');
  }
};
