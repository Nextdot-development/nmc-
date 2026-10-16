import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { listIssues, reportIssue, updateIssue } from '../controllers/supportController.js';

const router = express.Router();

router.post('/support/issues/:id/report', authMiddleware, reportIssue);
router.get('/support/issues', authMiddleware, listIssues);
router.patch('/support/issues/:id', authMiddleware, updateIssue);

export default router;
