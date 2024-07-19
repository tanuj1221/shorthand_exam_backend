const express = require('express');
const router = express.Router();
const examExpertAdminController = require('../controllers/expertAuthentication/expertAuthentication');

router.post('/expert-login',examExpertAdminController.loginExpertAdmin);
router.get('/expert-details', examExpertAdminController.getExpertDetails); 
router.get('/all-subjects', examExpertAdminController.getAllSubjects);
router.get('/qsets/:subjectId', examExpertAdminController.getQSetsForSubject); 
router.get('/expert-assigned-passages/:subjectId/:qset', examExpertAdminController.getExpertAssignedPassages);
router.post('/assignStudent/:subjectId/:qset', examExpertAdminController.assignStudentForQSet);
router.post('/active-passage',examExpertAdminController.getIgnoreList)
router.post('/add-ignore-word',examExpertAdminController.addToIgnoreList)
router.post('/undo-word',examExpertAdminController.removeFromIgnoreList)

// router.get('/expert-assignments', examExpertAdminController.getExpertAssignments);
// router.get('/student-passages/:studentId', examExpertAdminController.getStudentPassages);

module.exports = router;