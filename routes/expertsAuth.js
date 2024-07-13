const express = require('express');
const router = express.Router();
const examExpertAdminController = require('../controllers/expertAuthentication/expertAuthentication');

router.post('/expert-login',examExpertAdminController.loginExpertAdmin);
router.get('/expert-details', examExpertAdminController.getExpertDetails); 
router.get('/expert-assignments', examExpertAdminController.getExpertAssignments);
router.get('/student-passages/:studentId', examExpertAdminController.getStudentPassages);

module.exports = router;