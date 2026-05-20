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
module.exports.bookingSettings = bookingSettings;

const db = require('../config/db');

// Load schedule from DB on startup
async function loadScheduleFromDB() {
    try {
        const [rows] = await db.query("SELECT setting_value FROM doctor_settings WHERE setting_key = 'bookingSettings' LIMIT 1");
        if (rows.length > 0) {
            const saved = JSON.parse(rows[0].setting_value);
            bookingSettings.bookingOpen = saved.bookingOpen;
            bookingSettings.weeklySchedule = saved.weeklySchedule || {};
            module.exports.bookingSettings = bookingSettings;
        }
    } catch(e) {
        // Table might not exist yet, create it
        try {
            await db.query("CREATE TABLE IF NOT EXISTS doctor_settings (id INT AUTO_INCREMENT PRIMARY KEY, setting_key VARCHAR(100) UNIQUE, setting_value TEXT)");
        } catch(e2) {}
    }
}
loadScheduleFromDB();

router.get('/booking-status', (req, res) => {
    res.json(bookingSettings);
});

router.post('/booking-status', async (req, res) => {
    const { bookingOpen, weeklySchedule } = req.body;
    if (typeof bookingOpen !== 'undefined') bookingSettings.bookingOpen = bookingOpen;
    if (weeklySchedule) bookingSettings.weeklySchedule = weeklySchedule;
    module.exports.bookingSettings = bookingSettings;
    // Save to DB
    try {
        await db.query(
            "INSERT INTO doctor_settings (setting_key, setting_value) VALUES ('bookingSettings', ?) ON DUPLICATE KEY UPDATE setting_value = ?",
            [JSON.stringify(bookingSettings), JSON.stringify(bookingSettings)]
        );
    } catch(e) {}
    res.json({ success: true, ...bookingSettings });
});

module.exports = router;
module.exports.bookingSettings = bookingSettings;
module.exports = router;
