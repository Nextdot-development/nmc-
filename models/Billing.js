import mongoose from 'mongoose';

// The database is shared with the live NextComply app: billing lives in its own
// nmc_* collections and creates no indexes (autoIndex off).
const options = { timestamps: true, autoIndex: false };

const AccountSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  email: { type: String, default: '' },
  plan: { type: String, default: 'free' },
  planCredits: { type: Number, default: 0 },   // monthly or free credits, used first
  extraCredits: { type: Number, default: 0 },  // top-ups, never expire
  periodStart: { type: Date, default: null },
  periodEnd: { type: Date, default: null },
  enterprise: { type: mongoose.Schema.Types.Mixed, default: null },
}, { ...options, collection: 'nmc_accounts' });

const LedgerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  type: { type: String, required: true },      // signup | audit | refund | plan | topup | grant | expire
  credits: { type: Number, required: true },   // + added, - spent
  planUsed: { type: Number, default: 0 },
  extraUsed: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  note: { type: String, default: '' },
  ref: { type: String, default: '' },
}, { ...options, collection: 'nmc_credit_ledger' });

const PaymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  orderId: { type: String, required: true },
  paymentId: { type: String, default: '' },
  kind: { type: String, required: true },      // plan | topup
  planId: { type: String, default: '' },
  credits: { type: Number, default: 0 },
  amount: { type: Number, required: true },    // paise
  status: { type: String, default: 'created' }, // created | paid | failed
  paidAt: { type: Date, default: null },
}, { ...options, collection: 'nmc_payments' });

const LeadSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, default: null },
  name: String,
  email: String,
  phone: String,
  organisation: String,
  monthlyAudits: String,
  message: String,
}, { ...options, collection: 'nmc_enterprise_leads' });

export const Account = mongoose.model('NmcAccount', AccountSchema);
export const Ledger = mongoose.model('NmcCreditLedger', LedgerSchema);
export const Payment = mongoose.model('NmcPayment', PaymentSchema);
export const Lead = mongoose.model('NmcEnterpriseLead', LeadSchema);
