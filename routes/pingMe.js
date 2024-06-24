const express = require('express');
const router = express.Router();
const pingController = require('../controllers/pingMe');

router.get('/pingMe', pingController.pingMe);

module.exports = router;