const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roles');
const controller = require('./requests.controller');

router.use(authMiddleware);

router.post('/', requireRole('SOLICITANTE'), controller.createRequest);
router.get('/me', requireRole('SOLICITANTE'), controller.listMyRequests);
router.get('/:id', requireRole(['SOLICITANTE', 'APROBADOR']), controller.getRequest);

module.exports = router;
