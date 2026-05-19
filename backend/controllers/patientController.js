const db = require('../config/db');

exports.bookAppointment = async (req, res) => {
    const { patient_id, doctor_id, appointment_time } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO appointments (patient_id, doctor_id, appointment_time, status) VALUES (?, ?, ?, "pending")',
            [patient_id, doctor_id, appointment_time]
        );
        res.json({ success: true, appointment_id: result.insertId, message: "Appointment Booked: Pending" });
    } catch (err) {
        res.status(500).send(err.message);
    }
};

exports.cancelAppointment = async (req, res) => {
    const appointmentId = parseInt(req.params.appointmentId);
    const patient_id = parseInt(req.body.patient_id);
    if (!appointmentId) return res.status(400).json({ success: false, message: "appointmentId مطلوب" });
    if (!patient_id) return res.status(400).json({ success: false, message: "patient_id مطلوب" });
    try {
        const [rows] = await db.query(
            'SELECT id FROM appointments WHERE id = ? AND patient_id = ?',
            [appointmentId, patient_id]
        );
        if (rows.length === 0) {
            return res.status(403).json({ success: false, message: "غير مصرح بهذا الإجراء" });
        }
        await db.query('DELETE FROM appointments WHERE id = ?', [appointmentId]);
        res.json({ success: true, message: "تم إلغاء الموعد بنجاح" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getPatientAppointments = async (req, res) => {
    const patient_id = parseInt(req.params.patientId);
    if (!patient_id) return res.status(400).json({ success: false, message: "patientId مطلوب" });
    try {
        const [rows] = await db.query(
            `SELECT a.id, a.appointment_time, a.status, d.name as doctorName, d.specialty as doctorSpec, d.id as doctorId
             FROM appointments a
             JOIN doctors d ON a.doctor_id = d.id
             WHERE a.patient_id = ?
             ORDER BY a.appointment_time DESC`,
            [patient_id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.registerPatient = async (req, res) => {
    const { name, email, password, phone } = req.body;
    try {
        await db.query(
            'INSERT INTO patients (name, email, password, phone) VALUES (?, ?, ?, ?)',
            [name, email, password, phone]
        );
        res.status(201).send("تم تسجيل الحساب بنجاح");
    } catch (err) {
        res.status(500).send("خطأ في الداتا بيز: " + err.message);
    }
};

// تحديث بيانات الملف الصحي للمريض
exports.updateProfile = async (req, res) => {
    const { patient_id, name, age, blood_type, diseases } = req.body;
    if (!patient_id) return res.status(400).json({ success: false, message: "patient_id مطلوب" });
    try {
        await db.query(
            'UPDATE patients SET name = COALESCE(NULLIF(?, ""), name), age = ?, blood_type = ?, diseases = ? WHERE id = ?',
            [name || null, age || null, blood_type || null, diseases || null, patient_id]
        );
        res.json({ success: true, message: "تم تحديث البيانات بنجاح" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// جلب بيانات مريض معين (للدكتور)
exports.getPatientProfile = async (req, res) => {
    const patient_id = parseInt(req.params.patientId);
    if (!patient_id) return res.status(400).json({ success: false, message: "patientId مطلوب" });
    try {
        const [rows] = await db.query(
            'SELECT id, name, phone, age, blood_type, diseases, profile_pic FROM patients WHERE id = ?',
            [patient_id]
        );
        if (rows.length === 0) return res.status(404).json({ success: false, message: "المريض غير موجود" });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// رفع صورة المريض
exports.uploadProfilePic = async (req, res) => {
    const { patient_id, profile_pic } = req.body;
    if (!patient_id || !profile_pic) return res.status(400).json({ success: false, message: "بيانات ناقصة" });
    try {
        await db.query('UPDATE patients SET profile_pic = ? WHERE id = ?', [profile_pic, patient_id]);
        res.json({ success: true, message: "تم رفع الصورة بنجاح" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// جلب إشعارات المريض
exports.getNotifications = async (req, res) => {
    const patient_id = parseInt(req.params.patientId);
    if (!patient_id) return res.status(400).json({ success: false, message: "patientId مطلوب" });
    try {
        const [rows] = await db.query(
            `SELECT n.id, n.message, n.type, n.is_read, n.created_at,
                    d.name as doctor_name, d.specialty as doctor_specialty
             FROM notifications n
             JOIN doctors d ON n.doctor_id = d.id
             WHERE n.patient_id = ?
             ORDER BY n.created_at DESC
             LIMIT 20`,
            [patient_id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// تحديد إشعار كمقروء
exports.markNotificationRead = async (req, res) => {
    const { notification_id, patient_id } = req.body;
    if (!notification_id || !patient_id)
        return res.status(400).json({ success: false, message: "بيانات ناقصة" });
    try {
        await db.query(
            'UPDATE notifications SET is_read = 1 WHERE id = ? AND patient_id = ?',
            [notification_id, patient_id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// تغيير كلمة سر المريض
exports.changePassword = async (req, res) => {
    const { patient_id, old_password, new_password } = req.body;
    if (!patient_id || !old_password || !new_password)
        return res.status(400).json({ success: false, message: "بيانات ناقصة" });
    try {
        const [rows] = await db.query('SELECT password FROM patients WHERE id = ?', [patient_id]);
        if (!rows.length) return res.status(404).json({ success: false, message: "المريض غير موجود" });
        if (rows[0].password !== old_password)
            return res.status(401).json({ success: false, message: "كلمة السر الحالية غير صحيحة" });
        await db.query('UPDATE patients SET password = ? WHERE id = ?', [new_password, patient_id]);
        res.json({ success: true, message: "تم تغيير كلمة السر بنجاح" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// رفع تحاليل المريض للدكتور
exports.uploadLabResult = async (req, res) => {
    const { patient_id, doctor_id, lab_name, lab_type, lab_content, notes, appointment_id } = req.body;
    if (!patient_id || !doctor_id || !lab_name || !lab_content)
        return res.status(400).json({ success: false, message: "بيانات ناقصة: patient_id, doctor_id, lab_name, lab_content مطلوبة" });
    try {
        const [result] = await db.query(
            `INSERT INTO lab_results (patient_id, doctor_id, appointment_id, lab_name, lab_type, lab_content, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [patient_id, doctor_id, appointment_id||null, lab_name, lab_type||'image', lab_content, notes||null]
        );
        res.json({ success: true, lab_id: result.insertId, message: "تم إرسال التحليل للدكتور بنجاح" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// تحديد التحليل كمقروء للمريض (أرشفة)
exports.markLabReadForPatient = async (req, res) => {
    const { lab_id, patient_id } = req.body;
    if (!lab_id || !patient_id)
        return res.status(400).json({ success: false, message: "بيانات ناقصة" });
    try {
        await db.query(
            'UPDATE lab_results SET patient_read = 1 WHERE id = ? AND patient_id = ?',
            [lab_id, patient_id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// جلب التحاليل التي رفعها مريض معين
exports.getPatientLabResults = async (req, res) => {
    const patient_id = parseInt(req.params.patientId);
    if (!patient_id) return res.status(400).json({ success: false, message: "patientId مطلوب" });
    try {
        const [rows] = await db.query(
            `SELECT lr.id, lr.lab_name, lr.lab_type, lr.lab_content, lr.notes,
                    lr.patient_read as is_read, lr.doctor_reply, lr.replied_at, lr.created_at,
                    d.name as doctor_name, d.specialty as doctor_specialty,
                    d.profile_pic as doctor_pic
             FROM lab_results lr
             JOIN doctors d ON lr.doctor_id = d.id
             WHERE lr.patient_id = ?
             ORDER BY lr.created_at DESC`,
            [patient_id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// جلب الأوقات المحجوزة في تاريخ معين
exports.getBookedSlots = async (req, res) => {
    const { doctorId, date } = req.params;
    if (!doctorId || !date) {
        return res.status(400).json({ success: false, message: "doctorId و date مطلوبان" });
    }
    try {
        const [rows] = await db.query(
            `SELECT appointment_time FROM appointments 
             WHERE doctor_id = ? AND DATE(appointment_time) = ? AND status != "cancelled"
             ORDER BY appointment_time ASC`,
            [parseInt(doctorId), date]
        );
        
        const bookedTimes = rows.map(row => {
            const time = new Date(row.appointment_time);
            return time.toTimeString().slice(0, 5); // HH:MM format
        });
        
        res.json(bookedTimes);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// حجز موعد مع نوع الزيارة (كشف/متابعة) والتحقق من عدم التكرار
exports.bookAppointmentV2 = async (req, res) => {
    const { patient_id, doctor_id, appointment_time, visit_type } = req.body;
    if (!patient_id || !doctor_id || !appointment_time)
        return res.status(400).json({ success: false, message: "بيانات ناقصة" });
    
    try {
        const [existingAppointments] = await db.query(
            `SELECT id FROM appointments 
             WHERE doctor_id = ? AND appointment_time = ? AND status != "cancelled"`,
            [doctor_id, appointment_time]
        );
        
        if (existingAppointments.length > 0) {
            return res.status(409).json({ 
                success: false, 
                message: "❌ هذا الموعد محجوز بالفعل! يرجى اختيار وقت آخر" 
            });
        }
        
        try {
            const [result] = await db.query(
                'INSERT INTO appointments (patient_id, doctor_id, appointment_time, status, visit_type) VALUES (?, ?, ?, "pending", ?)',
                [patient_id, doctor_id, appointment_time, visit_type || 'كشف']
            );
            return res.json({ success: true, appointment_id: result.insertId, message: "Appointment Booked: Pending" });
        } catch (colErr) {
            const [result] = await db.query(
                'INSERT INTO appointments (patient_id, doctor_id, appointment_time, status) VALUES (?, ?, ?, "pending")',
                [patient_id, doctor_id, appointment_time]
            );
            return res.json({ success: true, appointment_id: result.insertId, message: "Appointment Booked: Pending" });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
