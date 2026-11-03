const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roles');
const controller = require('./flows.controller');

router.use(authMiddleware);

router.get('/', requireRole('ADMINISTRADOR'), controller.getFlows);
router.get('/:id', requireRole('ADMINISTRADOR'), controller.getFlowById);
router.post('/', requireRole('ADMINISTRADOR'), controller.createFlow);
router.put('/:id', requireRole('ADMINISTRADOR'), controller.updateFlow);

module.exports = router;
