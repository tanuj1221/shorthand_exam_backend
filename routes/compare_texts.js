const express = require('express');
const router = express.Router();
const compare = require('../controllers/compareTextPythonService/compareText');

router.post('/compare-get-data', compare.compareText);

module.exports = router;