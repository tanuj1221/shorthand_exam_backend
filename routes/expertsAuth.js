// expertsAuth.js
const express = require('express');
const router = express.Router();
const examExpertAdminController = require('../controllers/expertAuthentication/expertAuthentication');

router.post('/expert-login',examExpertAdminController.loginExpertAdmin);
router.post('/expert-logout', examExpertAdminController.logoutExpert);
router.get('/expert-details', examExpertAdminController.getExpertDetails); 
router.get('/all-subjects', examExpertAdminController.getAllSubjects);
router.get('/qsets/:subjectId', examExpertAdminController.getQSetsForSubject); 
router.get('/expert-assigned-passages/:subjectId/:qset', examExpertAdminController.getExpertAssignedPassages);
router.get('/student-passages/:subjectId/:qset/:studentId', examExpertAdminController.getStudentPassages);
router.post('/assignStudent/:subjectId/:qset', examExpertAdminController.assignStudentForQSet);
router.post('/get-student-passages', examExpertAdminController.getPassagesByStudentId);  // Make sure the function name matches


router.post('/active-passage',examExpertAdminController.getIgnoreList);
router.post('/student-active-passage', examExpertAdminController.getStudentIgnoreList);

router.post('/add-ignore-word',examExpertAdminController.addToIgnoreList);
router.post('/student-add-ignore-word',examExpertAdminController.addToStudentIgnoreList);

router.post('/undo-word', examExpertAdminController.removeFromIgnoreList);
router.post('/student-undo-word',  examExpertAdminController.removeFromStudentIgnoreList);


router.post('/submit-passage-review/:subjectId/:qset', examExpertAdminController.submitPassageReview);

// router.post('/submit-passage-byid/:studentid', examExpertAdminController.submitPassageByStudentId);

module.exports = router;