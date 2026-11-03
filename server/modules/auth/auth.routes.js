const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const authMiddleware = require('../../middleware/auth');
const { limitarLogin } = require('../../middleware/seguridad');

// Con la contraseña inicial solo se permiten me, password y logout
const sinCambioObligatorio = authMiddleware.permitirClaveInicial;

router.post('/login', limitarLogin(), authController.login.bind(authController));
router.get('/me', sinCambioObligatorio, authController.getMe.bind(authController));
router.post('/password', sinCambioObligatorio, authController.changePassword.bind(authController));
router.post('/logout', sinCambioObligatorio, authController.logout.bind(authController));

module.exports = router;
