const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roles');
const controller = require('./templates.controller');

router.use(authMiddleware);

router.get('/catalog', requireRole('SOLICITANTE'), controller.getCatalog);

// Resumen por estado; va antes de '/:id'
router.get('/summary', requireRole('ADMINISTRADOR'), controller.getSummary);

router.get('/', requireRole('ADMINISTRADOR'), controller.getTemplates);
router.post('/', requireRole('ADMINISTRADOR'), controller.createTemplate);

router.get('/:id', requireRole(['SOLICITANTE', 'ADMINISTRADOR']), controller.getTemplate);

router.put('/:id', requireRole('ADMINISTRADOR'), controller.updateTemplate);
router.delete('/:id', requireRole('ADMINISTRADOR'), controller.deleteTemplate);
router.post('/:id/versions', requireRole('ADMINISTRADOR'), controller.createVersion);
router.post('/:id/publish', requireRole('ADMINISTRADOR'), controller.publishTemplate);
router.post('/:id/deactivate', requireRole('ADMINISTRADOR'), controller.deactivateTemplate);

module.exports = router;
