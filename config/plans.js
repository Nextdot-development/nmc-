// Plans and credit prices. Single source for billing rules, the landing page and the app.
// Prices are in INR and include 18% GST.

export const CREDIT_COST = {
  text: 1,
  document: 1,
  image: 1,
  url: 2,            // one web page
  videoUrl: 4,       // YouTube / video link (about 10 minutes)
  mediaPer5Min: 2,   // uploaded audio or video, per started 5 minutes
};

export const ALL_FORMATS = ['text', 'image', 'document', 'video', 'audio', 'url'];

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    credits: 3,
    period: 'once',
    formats: ['text', 'image'],
    maxMediaMinutes: 0,
    fixPreviewLines: 2,       // line fixes shown for the first N findings only
    compliantVersion: false,
    pdf: false,
    historyDays: 7,
    seats: 1,
    rollover: false,
    topup: null,
    tagline: 'Try it on your own ads',
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 499,
    credits: 22,
    period: 'month',
    formats: ['text', 'image', 'document', 'video', 'audio'],
    maxMediaMinutes: 5,
    fixPreviewLines: null,
    compliantVersion: false,
    pdf: true,
    historyDays: 180,
    seats: 1,
    rollover: false,
    topup: { credits: 10, price: 249 },
    tagline: 'For a doctor or a single clinic',
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 999,
    credits: 50,
    period: 'month',
    formats: ALL_FORMATS,
    maxMediaMinutes: 15,
    fixPreviewLines: null,
    compliantVersion: true,
    pdf: true,
    historyDays: 365,
    seats: 3,
    rollover: true,            // unused plan credits carry over one month
    topup: { credits: 10, price: 199 },
    popular: true,
    tagline: 'For clinics and marketing teams',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: null,
    pricePerCredit: 20,        // + GST
    minCredits: 500,
    credits: null,
    period: 'custom',
    formats: ALL_FORMATS,
    maxMediaMinutes: 60,
    fixPreviewLines: null,
    compliantVersion: true,
    pdf: true,
    historyDays: null,         // unlimited
    seats: null,               // as agreed
    rollover: true,
    topup: null,
    tagline: 'For hospital chains, pharma and agencies',
  },
};

export const PAID_PLANS = ['starter', 'premium'];
export const PERIOD_DAYS = 30;

export const getPlan = (id) => PLANS[id] || PLANS.free;
