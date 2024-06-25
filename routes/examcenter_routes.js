const express = require('express');
const router = express.Router();
const isAuthenticated = require('../middleware/isAuthStudent');

const examcontroller = require('../controllers/examcenter');




router.post('/center_login', examcontroller.loginCenter);

module.exports = router;