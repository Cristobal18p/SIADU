const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roles');
const { limitarPdf } = require('../../middleware/seguridad');
const controller = require('./documents.controller');

router.use(authMiddleware);

// PDF oficial, para el solicitante
router.get('/:requestId/pdf', requireRole('SOLICITANTE'), limitarPdf(), controller.downloadPdf);

module.exports = router;
