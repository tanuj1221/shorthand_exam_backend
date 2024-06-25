const express = require('express');
const router = express.Router();
const examCenterController = require('../controllers/centerAdminMonitoring/getExamCenter');
const examCenter = require('../controllers/centerAdminMonitoring/getCenterDetails');
const examCenterFunc = require('../controllers/examCenterAdmin/get_pdfs_data')

router.get('/get-center-centerpass', examCenterController.getExamCenter);
router.get('/get-center-details', examCenter.getExamCenterDetails);
router.get('/get-pdfs', examCenterFunc.getPdfFromExamCenterDb);

module.exports = router;