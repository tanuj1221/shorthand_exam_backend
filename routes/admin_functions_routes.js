const express = require('express');
const multer = require('multer');
const router = express.Router();
const adminFunctionController = require('../controllers/admin_functions');

const isAuthenticatedAdmin = require('../middleware/isAuthAdmin')


router.post('/admin_login',adminFunctionController.loginadmin);

router.delete('/deletetable/:tableName',isAuthenticatedAdmin,  adminFunctionController.deleteTable);





module.exports = router;