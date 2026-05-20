const express = require('express');
const router = express.Router();
const doctorCtrl = require('../controllers/doctorController');

router.get('/appointments', doctorCtrl.getAppointments);
router.get('/doctors', doctorCtrl.getAllDoctors);
router.post('/update-price', doctorCtrl.updatePrice);
router.post('/update-profile', doctorCtrl.updateProfile);
router.post('/change-password', doctorCtrl.changePassword);
router.get('/patients', doctorCtrl.getDoctorPatients);
router.post('/upload-pic', doctorCtrl.uploadDoctorPic);

// البحث عن مريض بالاسم
router.get('/search-patient', doctorCtrl.searchPatientByName);

// إضافة موعد طوارئ/عادي من لوحة الدكتور مع إشعار
router.post('/add-appointment', doctorCtrl.addDoctorAppointment);

// حذف موعد مريض واحد فقط
router.delete('/appointment/:appointmentId', doctorCtrl.deletePatientAppointment);

// تحديث حالة الموعد (pending/examined)
router.post('/update-appointment-status', doctorCtrl.updateAppointmentStatus);

// روشتة
router.post('/send-prescription', doctorCtrl.sendPrescription);
router.get('/prescriptions', doctorCtrl.getPatientPrescriptions);

// تقييم الدكتور
router.post('/rate', doctorCtrl.rateDoctor);

// معلومات الدكتور الشخصية
router.get('/info', doctorCtrl.getDoctorInfo);
router.post('/info', doctorCtrl.saveDoctorInfo);

// التحاليل الواصلة للدكتور
router.get('/lab-results', doctorCtrl.getDoctorLabResults);
router.post('/lab-read', doctorCtrl.markLabRead);
router.post('/lab-reply', doctorCtrl.replyToLab);

// حالة الحجوزات (مفتوح/مغلق) - يُخزن في ذاكرة السيرفر
let bookingSettings = { bookingOpen: true, weeklySchedule: {} };

router.get('/booking-status', (req, res) => {
    res.json(bookingSettings);
});

router.post('/booking-status', (req, res) => {
    const { bookingOpen, weeklySchedule } = req.body;
    if (typeof bookingOpen !== 'undefined') bookingSettings.bookingOpen = bookingOpen;
    if (weeklySchedule) bookingSettings.weeklySchedule = weeklySchedule;
    res.json({ success: true, ...bookingSettings });
});

module.exports = router;
