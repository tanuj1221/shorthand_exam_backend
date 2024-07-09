const express = require('express');
const router = express.Router();
const examExpertAdminController = require('../controllers/expertAuthentication/expertAuthentication');

router.post('/expert-login',examExpertAdminController.loginExpertAdmin);
router.get('/expert-details', examExpertAdminController.getExpertDetails); 

module.exports = router;