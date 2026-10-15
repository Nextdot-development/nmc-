import { api } from './api.js';

export const FORMAT_NAMES = { text: 'Text', image: 'Image', document: 'PDF / Word', video: 'Video', audio: 'Audio', url: 'Website & YouTube' };

export const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

// What one audit of each format costs, for display next to the Run button
export const creditHint = (format, url = '') => {
  if (format === 'url') return /youtu\.?be|vimeo|instagram\.com\/reel|\.(mp4|webm|mov|mp3|wav|m4a)(\?|$)/i.test(url) ? '4 credits' : '2 credits';
  if (format === 'video' || format === 'audio') return '2 credits per 5 min';
  return '1 credit';
};

let checkoutScript;
const loadCheckout = () => {
  if (window.Razorpay) return Promise.resolve();
  checkoutScript ||= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = resolve;
    s.onerror = () => { checkoutScript = null; reject(new Error('Payment window could not load. Check your internet and try again.')); };
    document.body.appendChild(s);
  });
  return checkoutScript;
};

// Opens Razorpay checkout; resolves with the updated account once the payment is verified
export const buy = async ({ kind, planId, user }) => {
  const order = await api.createOrder(kind, planId);
  await loadCheckout();
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: 'NextComply AI',
      description: order.label,
      prefill: { name: user?.name || '', email: user?.email || '' },
      theme: { color: '#1a3a8f' },
      handler: async (response) => {
        try {
          const res = await api.verifyPayment(response);
          resolve(res.account);
        } catch (err) {
          reject(err);
        }
      },
      modal: { ondismiss: () => reject(Object.assign(new Error('Payment cancelled.'), { cancelled: true })) },
    });
    rzp.on('payment.failed', (e) => reject(new Error(e?.error?.description || 'Payment failed.')));
    rzp.open();
  });
};
