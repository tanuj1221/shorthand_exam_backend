const express = require('express');
const router = express.Router();
const examCenterController = require('../controllers/centerAdminMonitoring/getExamCenter');

router.get('/get-center-centerpass', examCenterController.getExamCenter);

module.exports = router;