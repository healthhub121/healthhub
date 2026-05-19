const express = require('express');
const router = express.Router();
const adminCtrl = require('../controllers/adminController');

// دخول الأدمن
router.post('/login', adminCtrl.adminLogin);

// الحصول على البيانات
router.get('/doctors', adminCtrl.getAllDoctors);
router.get('/patients', adminCtrl.getAllPatients);
router.get('/appointments', adminCtrl.getAllAppointments);
router.get('/stats', adminCtrl.getStats);

// حذف البيانات
router.delete('/delete-doctor/:doctorId', adminCtrl.deleteDoctor);
router.delete('/delete-patient/:patientId', adminCtrl.deletePatient);
router.delete('/delete-appointment/:appointmentId', adminCtrl.deleteAppointment);

// تعديل البيانات
router.put('/update-doctor/:doctorId', adminCtrl.updateDoctor);
router.put('/update-patient/:patientId', adminCtrl.updatePatient);

module.exports = router;
