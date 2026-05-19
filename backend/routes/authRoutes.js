const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/authController');
const adminCtrl = require('../controllers/adminController');

router.post('/register', authCtrl.register);
router.post('/register-doctor', authCtrl.registerDoctor);
router.post('/login', authCtrl.login);
router.post('/doctor-login', authCtrl.doctorLogin);
router.post('/admin-login', adminCtrl.adminLogin);

module.exports = router;