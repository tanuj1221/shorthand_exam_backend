const express = require('express');
const router = express.Router();

const getResultSummarySubjectWise = require('./../controllers/shortHandResultDashboard/resultSummary');
const recalculate = require('./../controllers/shortHandResultDashboard/recalculateResult');

router.get('/subjectid-wise-result-summary', getResultSummarySubjectWise.resultSummary);
router.get('/recalculate-result/:subject_id', recalculate.recalculateResults);
router.get('/recalculate-progress', recalculate.getProgress);

module.exports = router;