const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roles');
const controller = require('./approvals.controller');

router.use(authMiddleware);

router.get('/pending', requireRole('APROBADOR'), controller.listPendingApprovals);
router.get('/history', requireRole('APROBADOR'), controller.listApprovalHistory);
router.post('/:id/decision', requireRole('APROBADOR'), controller.submitDecision);

module.exports = router;
