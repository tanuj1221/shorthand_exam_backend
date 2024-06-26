const express = require('express');
const router = express.Router();
const isAuthenticated = require('../middleware/isAuthStudent');

const studentController = require('../controllers/student_exam');




router.post('/student_login', studentController.loginStudent);

router.post('/audiologs',isAuthenticated, studentController.updateAudioLogs);
router.post('/finalpassagelogs',isAuthenticated, studentController.updatePassageFinalLogs);
router.post('/feedback',isAuthenticated, studentController.feedback);
router.get('/student_details',isAuthenticated, studentController.getStudentDetails);

router.get('/audios', isAuthenticated,studentController.getaudios);

router.get('/controller_pass',isAuthenticated, studentController.getcontrollerpass);
router.get('/audioProgress', isAuthenticated,studentController.getAudioLogs); 

router.post('/textlogs', isAuthenticated,studentController.logTextInput); 
router.post('/passageprogress', isAuthenticated,studentController.getPassageProgress); 
router.post('/audiotime', isAuthenticated,studentController.updateAudioLogTime);
router.post('/passagetime', isAuthenticated,studentController.updatePassagewLogTime); 




module.exports = router;