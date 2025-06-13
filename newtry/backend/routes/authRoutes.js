const express = require('express');
const router = express.Router();
const { handleAuthCallback } = require('../controllers/authController');

router.get('/auth-callback', handleAuthCallback);

module.exports = router;