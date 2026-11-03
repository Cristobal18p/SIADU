const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth');
const controller = require('./catalogs.controller');

router.use(authMiddleware);

router.get('/cargos', controller.getCargos);

module.exports = router;
