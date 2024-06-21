const express = require('express');
const router = express.Router();
const isAuthenticated = require('../middleware/isAuthStudent');

const studentController = require('../controllers/student_exam');




router.post('/student_login', studentController.loginStudent);

router.post('/audiologs',isAuthenticated, studentController.updateAudioLogs);
router.post('/finalpassagelogs',isAuthenticated, studentController.updateAudioLogs);
router.post('/feedback',isAuthenticated, studentController.feedback);
router.get('/student_details',isAuthenticated, studentController.getStudentDetails);

router.get('/audios', isAuthenticated,studentController.getaudios);
router.get('/controller_pass',isAuthenticated, studentController.getcontrollerpass);
module.exports = router;