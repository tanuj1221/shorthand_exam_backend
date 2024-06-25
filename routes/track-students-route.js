const express = require('express');
const router = express.Router();

const trackStudentController = require('../controllers/centerAdminMonitoring/trackStudentsProgress');

router.post('/track-students-on-exam-center-code', trackStudentController.getStudentsTrack);
router.post('/track-students-on-exam-center-code/:examCenterCode/:batchNo',  trackStudentController.getStudentsTrack);
router.post('/track-students-on-exam-center-code/:examCenterCode', trackStudentController.getStudentsTrack);
router.post('/track-students-on-exam-center-code/:batchNo', trackStudentController.getStudentsTrack);

module.exports = router;