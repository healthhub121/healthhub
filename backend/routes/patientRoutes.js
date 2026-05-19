const express = require('express');
const router = express.Router();
const patientCtrl = require('../controllers/patientController');
const doctorCtrl = require('../controllers/doctorController');

router.post('/book', patientCtrl.bookAppointment);
router.post('/register', patientCtrl.registerPatient);
router.get('/appointments/:patientId', patientCtrl.getPatientAppointments);
router.delete('/cancel/:appointmentId', patientCtrl.cancelAppointment);

// بيانات الملف الصحي
router.post('/update-profile', patientCtrl.updateProfile);
router.get('/profile/:patientId', patientCtrl.getPatientProfile);

// رفع صورة المريض
router.post('/upload-pic', patientCtrl.uploadProfilePic);
router.post('/change-password', patientCtrl.changePassword);

// الإشعارات
router.get('/notifications/:patientId', patientCtrl.getNotifications);
router.post('/notifications/read', patientCtrl.markNotificationRead);
router.post('/prescriptions/read', doctorCtrl.markPrescriptionRead);
router.post('/lab-results/read', patientCtrl.markLabReadForPatient);

// رفع تحاليل المريض
router.post('/upload-lab', patientCtrl.uploadLabResult);
router.get('/lab-results/:patientId', patientCtrl.getPatientLabResults);

// جلب الأوقات المحجوزة
router.get('/booked-slots/:doctorId/:date', patientCtrl.getBookedSlots);

// حجز موعد V2 مع نوع الزيارة
router.post('/book-v2', patientCtrl.bookAppointmentV2);

module.exports = router;
