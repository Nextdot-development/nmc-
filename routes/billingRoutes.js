import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  getLedger, getMe, listPlans, postEnterpriseLead, postGrant, postOrder, postVerify, postWebhook,
} from '../controllers/billingController.js';

const router = express.Router();

router.get('/billing/plans', listPlans);
router.post('/billing/enterprise', postEnterpriseLead);
// Raw body is attached in server.js so the Razorpay signature can be checked
router.post('/billing/webhook', postWebhook);

router.get('/billing/me', authMiddleware, getMe);
router.get('/billing/ledger', authMiddleware, getLedger);
router.post('/billing/order', authMiddleware, postOrder);
router.post('/billing/verify', authMiddleware, postVerify);
router.post('/billing/admin/grant', authMiddleware, postGrant);

export default router;
