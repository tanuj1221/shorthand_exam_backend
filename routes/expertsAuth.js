// expertsAuth.js
const express = require('express');
const router = express.Router();
const examExpertAdminController = require('../controllers/expertAuthentication/expertAuthentication');

// Authentication routes
router.post('/expert-login', examExpertAdminController.loginExpertAdmin);
router.post('/expert-logout', examExpertAdminController.logoutExpert);
router.get('/expert-details', examExpertAdminController.getExpertDetails);

// Subject and QSet management routes
router.get('/all-subjects', examExpertAdminController.getAllSubjects);
router.get('/qsets/:subjectId', examExpertAdminController.getQSetsForSubject);

// Expert assignment and passage retrieval routes
router.get('/expert-assigned-passages/:subjectId/:qset', examExpertAdminController.getExpertAssignedPassages);
router.get('/student-passages/:subjectId/:qset/:studentId', examExpertAdminController.getStudentPassages);
router.post('/assignStudent/:subjectId/:qset', examExpertAdminController.assignStudentForQSet);
router.post('/get-student-passages', examExpertAdminController.getPassagesByStudentId);

// Ignore list management routes
router.post('/active-passage', examExpertAdminController.getIgnoreList);
router.post('/student-active-passage', examExpertAdminController.getStudentIgnoreList);
router.post('/add-ignore-word', examExpertAdminController.addToIgnoreList);
router.post('/student-add-ignore-word', examExpertAdminController.addToStudentIgnoreList);
router.post('/undo-word', examExpertAdminController.removeFromIgnoreList);
router.post('/student-undo-word', examExpertAdminController.removeFromStudentIgnoreList);
router.post('/clear-ignore-list', examExpertAdminController.clearIgnoreList);  // New route
router.post('/student-clear-ignore-list', examExpertAdminController.clearStudentIgnoreList)


// Passage review submission route
router.post('/submit-passage-review/:subjectId/:qset', examExpertAdminController.submitPassageReview);

// Commented out route (for future use or reference)
// router.post('/submit-passage-byid/:studentid', examExpertAdminController.submitPassageByStudentId);

module.exports = router;