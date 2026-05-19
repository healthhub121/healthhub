const db = require('../config/db');

// البحث عن مريض بالاسم (للدكتور)
exports.searchPatientByName = async (req, res) => {
    const { name } = req.query;
    if (!name || name.trim().length < 2)
        return res.status(400).json({ success: false, message: "أدخل اسم للبحث (حرفين على الأقل)" });
    try {
        const [rows] = await db.query(
            `SELECT id, name, phone, age, blood_type, diseases, profile_pic
             FROM patients
             WHERE name LIKE ?
             LIMIT 10`,
            [`%${name.trim()}%`]
        );
        res.json({ success: true, patients: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// إضافة موعد طوارئ أو عادي من لوحة الدكتور مع إشعار للمريض
exports.addDoctorAppointment = async (req, res) => {
    const { patient_id, doctor_id, type } = req.body;
    if (!patient_id || !doctor_id || !type)
        return res.status(400).json({ success: false, message: "بيانات ناقصة" });

    const appointmentType = type === 'طوارئ' ? 'طوارئ' : 'حجز عادي';

    try {
        // تحقق أن المريض موجود
        const [patientRows] = await db.query('SELECT id, name FROM patients WHERE id = ?', [patient_id]);
        if (!patientRows.length)
            return res.status(404).json({ success: false, message: "المريض غير موجود في قاعدة البيانات" });

        // تحقق أن الدكتور موجود
        const [doctorRows] = await db.query('SELECT id, name FROM doctors WHERE id = ?', [doctor_id]);
        if (!doctorRows.length)
            return res.status(404).json({ success: false, message: "الطبيب غير موجود" });

        const doctorName = doctorRows[0].name;

        // إنشاء الموعد في appointments مع النوع
        const [result] = await db.query(
            `INSERT INTO appointments (patient_id, doctor_id, appointment_time, status, type)
             VALUES (?, ?, NOW(), 'pending', ?)`,
            [patient_id, doctor_id, appointmentType]
        );
        const appointmentId = result.insertId;

        // إنشاء الإشعار للمريض
        const notifMessage = appointmentType === 'طوارئ'
            ? `🚨 تم تسجيلك كمريض طوارئ عند الدكتور ${doctorName}. يرجى التوجه فوراً.`
            : `📅 تم إضافتك لقائمة مواعيد الدكتور ${doctorName}. موعدك مسجل الآن.`;

        await db.query(
            `INSERT INTO notifications (patient_id, doctor_id, appointment_id, message, type)
             VALUES (?, ?, ?, ?, ?)`,
            [patient_id, doctor_id, appointmentId, notifMessage, appointmentType]
        );

        res.json({
            success: true,
            appointment_id: appointmentId,
            patient: patientRows[0],
            message: `تم إضافة ${patientRows[0].name} بنجاح وإرسال إشعار له`
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getAppointments = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM appointments');
        res.json(rows);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

exports.getAllDoctors = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT d.id, d.name, d.specialty, d.price, d.profile_pic,
                   ROUND(COALESCE(AVG(r.stars), 0), 1) as rating,
                   COUNT(r.id) as rating_count
            FROM doctors d
            LEFT JOIN ratings r ON d.id = r.doctor_id
            GROUP BY d.id
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// رفع صورة الدكتور أو حذفها
exports.uploadDoctorPic = async (req, res) => {
    const { doctor_id, profile_pic } = req.body;
    if (!doctor_id && doctor_id !== 0) return res.status(400).json({ success: false, message: "doctor_id مطلوب" });
    // السماح بـ profile_pic = null للحذف، أو صورة للرفع
    try {
        // تحديث صورة الطبيب (يمكن أن تكون null للحذف)
        await db.query('UPDATE doctors SET profile_pic = ? WHERE id = ?', [profile_pic || null, doctor_id]);
        const message = profile_pic ? "تم رفع الصورة بنجاح" : "تم حذف الصورة بنجاح";
        res.json({ success: true, message: message });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// تحديث اسم وتخصص الدكتور
// تغيير كلمة سر الدكتور
exports.changePassword = async (req, res) => {
    const { doctor_id, old_password, new_password } = req.body;
    if (!doctor_id || !old_password || !new_password)
        return res.status(400).json({ success: false, message: "بيانات ناقصة" });
    try {
        const [rows] = await db.query('SELECT password FROM doctors WHERE id = ?', [doctor_id]);
        if (!rows.length) return res.status(404).json({ success: false, message: "الدكتور غير موجود" });
        if (rows[0].password !== old_password)
            return res.status(401).json({ success: false, message: "كلمة السر الحالية غير صحيحة" });
        await db.query('UPDATE doctors SET password = ? WHERE id = ?', [new_password, doctor_id]);
        res.json({ success: true, message: "تم تغيير كلمة السر بنجاح" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateProfile = async (req, res) => {
    const { doctor_id, name, specialty } = req.body;
    if (!doctor_id || !name || !specialty) return res.status(400).json({ success: false, message: "بيانات ناقصة" });
    try {
        await db.query('UPDATE doctors SET name = ?, specialty = ? WHERE id = ?', [name, specialty, doctor_id]);
        res.json({ success: true, message: "تم تحديث البيانات بنجاح" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updatePrice = async (req, res) => {
    const { doctorId, price } = req.body;
    try {
        await db.query('UPDATE doctors SET price = ? WHERE id = ?', [price, doctorId]);
        res.json({ success: true, message: "تم تحديث السعر بنجاح" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getDoctorPatients = async (req, res) => {
    const { doctorId } = req.query;
    if (!doctorId) return res.status(400).json({ success: false, message: "doctorId مطلوب" });
    try {
        const [rows] = await db.query(
            `SELECT p.id, p.name, p.phone, p.age, p.blood_type, p.diseases, p.profile_pic,
                    a.id as appointment_id, a.status, a.appointment_time,
                    COALESCE(a.visit_type, 'كشف') as visit_type
             FROM appointments a
             JOIN patients p ON a.patient_id = p.id
             WHERE a.doctor_id = ?
             ORDER BY a.appointment_time ASC`,
            [doctorId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// حذف مريض واحد فقط (إلغاء موعده)
exports.deletePatientAppointment = async (req, res) => {
    const { appointmentId } = req.params;
    if (!appointmentId) return res.status(400).json({ success: false, message: "appointmentId مطلوب" });
    try {
        await db.query('SET FOREIGN_KEY_CHECKS = 0');
        await db.query('DELETE FROM notifications WHERE appointment_id = ?', [appointmentId]);
        await db.query('DELETE FROM lab_results   WHERE appointment_id = ?', [appointmentId]);
        await db.query('DELETE FROM appointments  WHERE id = ?', [appointmentId]);
        await db.query('SET FOREIGN_KEY_CHECKS = 1');
        res.json({ success: true, message: "تم حذف الموعد بنجاح" });
    } catch (err) {
        try { await db.query('SET FOREIGN_KEY_CHECKS = 1'); } catch (_) {}
        res.status(500).json({ success: false, message: err.message });
    }
};

// إرسال روشتة للمريض
exports.sendPrescription = async (req, res) => {
    const { patient_id, doctor_id, prescription_text } = req.body;
    if (!patient_id || !doctor_id || !prescription_text) {
        return res.status(400).json({ success: false, message: "بيانات ناقصة" });
    }
    try {
        await db.query(
            `INSERT INTO prescriptions (patient_id, doctor_id, prescription_text, created_at)
             VALUES (?, ?, ?, NOW())`,
            [patient_id, doctor_id, prescription_text]
        );
        res.json({ success: true, message: "تم إرسال الروشتة بنجاح" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// جلب روشتات مريض معين
exports.getPatientPrescriptions = async (req, res) => {
    const { patient_id } = req.query;
    if (!patient_id) return res.status(400).json({ success: false, message: "patient_id مطلوب" });
    try {
        const [rows] = await db.query(
            `SELECT pr.id, pr.prescription_text, pr.is_read, pr.created_at, d.name as doctor_name, d.id as doctor_id, d.specialty as doctor_specialty, d.profile_pic as doctor_pic,
                    (SELECT stars FROM ratings WHERE patient_id = ? AND doctor_id = d.id AND prescription_id = pr.id LIMIT 1) as my_rating
             FROM prescriptions pr
             JOIN doctors d ON pr.doctor_id = d.id
             WHERE pr.patient_id = ?
             ORDER BY pr.created_at DESC`,
            [patient_id, patient_id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// تحديد الروشتة كمقروءة للمريض
exports.markPrescriptionRead = async (req, res) => {
    const { prescription_id, patient_id } = req.body;
    if (!prescription_id || !patient_id)
        return res.status(400).json({ success: false, message: "بيانات ناقصة" });
    try {
        await db.query(
            'UPDATE prescriptions SET is_read = 1 WHERE id = ? AND patient_id = ?',
            [prescription_id, patient_id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// إضافة تقييم
exports.rateDoctor = async (req, res) => {
    const { patient_id, doctor_id, prescription_id, stars } = req.body;
    if (!patient_id || !doctor_id || !stars) {
        return res.status(400).json({ success: false, message: "بيانات ناقصة" });
    }
    if (stars < 1 || stars > 5) {
        return res.status(400).json({ success: false, message: "التقييم يجب أن يكون بين 1 و 5" });
    }
    try {
        // تحقق هل قيّم من قبل لنفس الروشتة
        const [existing] = await db.query(
            'SELECT id FROM ratings WHERE patient_id = ? AND doctor_id = ? AND prescription_id = ?',
            [patient_id, doctor_id, prescription_id]
        );
        if (existing.length > 0) {
            // تحديث التقييم الموجود
            await db.query(
                'UPDATE ratings SET stars = ? WHERE patient_id = ? AND doctor_id = ? AND prescription_id = ?',
                [stars, patient_id, doctor_id, prescription_id]
            );
        } else {
            await db.query(
                'INSERT INTO ratings (patient_id, doctor_id, prescription_id, stars) VALUES (?, ?, ?, ?)',
                [patient_id, doctor_id, prescription_id, stars]
            );
        }
        res.json({ success: true, message: "تم حفظ تقييمك بنجاح" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// =============================================
// --- معلومات الدكتور الشخصية ---
// =============================================

// جلب معلومات الدكتور
exports.getDoctorInfo = async (req, res) => {
    const { doctor_id } = req.query;
    if (!doctor_id) return res.status(400).json({ success: false, message: "doctor_id مطلوب" });
    try {
        const [rows] = await db.query(
            `SELECT di.*, d.name, d.specialty, d.profile_pic
             FROM doctors d
             LEFT JOIN doctor_info di ON d.id = di.doctor_id
             WHERE d.id = ?`,
            [doctor_id]
        );
        if (!rows.length) return res.status(404).json({ success: false, message: "الدكتور غير موجود" });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// حفظ/تحديث معلومات الدكتور الشخصية
exports.saveDoctorInfo = async (req, res) => {
    const { doctor_id, address, university, graduation_year, certificates, about, experience_years } = req.body;
    if (!doctor_id) return res.status(400).json({ success: false, message: "doctor_id مطلوب" });
    try {
        const [existing] = await db.query('SELECT id FROM doctor_info WHERE doctor_id = ?', [doctor_id]);
        if (existing.length > 0) {
            await db.query(
                `UPDATE doctor_info SET address=?, university=?, graduation_year=?, certificates=?, about=?, experience_years=?
                 WHERE doctor_id=?`,
                [address||null, university||null, graduation_year||null, certificates||null, about||null, experience_years||null, doctor_id]
            );
        } else {
            await db.query(
                `INSERT INTO doctor_info (doctor_id, address, university, graduation_year, certificates, about, experience_years)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [doctor_id, address||null, university||null, graduation_year||null, certificates||null, about||null, experience_years||null]
            );
        }
        res.json({ success: true, message: "تم حفظ المعلومات بنجاح" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// =============================================
// --- التحاليل (lab_results) ---
// =============================================

// جلب التحاليل الواصلة للدكتور (إشعارات التحاليل)
exports.getDoctorLabResults = async (req, res) => {
    const { doctor_id } = req.query;
    if (!doctor_id) return res.status(400).json({ success: false, message: "doctor_id مطلوب" });
    try {
        const [rows] = await db.query(
            `SELECT lr.id, lr.lab_name, lr.lab_type, lr.lab_content, lr.notes,
                    lr.doctor_read as is_read, lr.doctor_reply, lr.replied_at, lr.created_at,
                    p.id as patient_id, p.name as patient_name, p.profile_pic as patient_pic,
                    p.age, p.blood_type, p.diseases, p.phone
             FROM lab_results lr
             JOIN patients p ON lr.patient_id = p.id
             WHERE lr.doctor_id = ?
             ORDER BY lr.created_at DESC`,
            [doctor_id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// تحديد تحليل كمقروء
exports.markLabRead = async (req, res) => {
    const { lab_id, doctor_id } = req.body;
    if (!lab_id || !doctor_id) return res.status(400).json({ success: false, message: "بيانات ناقصة" });
    try {
        await db.query('UPDATE lab_results SET doctor_read = 1 WHERE id = ? AND doctor_id = ?', [lab_id, doctor_id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// رد الدكتور على تحليل
exports.replyToLab = async (req, res) => {
    const { lab_id, doctor_id, reply_text } = req.body;
    if (!lab_id || !doctor_id || !reply_text)
        return res.status(400).json({ success: false, message: "بيانات ناقصة" });
    try {
        // تحقق إن التحليل ده فعلاً بتاع الدكتور ده
        const [rows] = await db.query(
            'SELECT id, patient_id, lab_name FROM lab_results WHERE id = ? AND doctor_id = ?',
            [lab_id, doctor_id]
        );
        if (!rows.length) return res.status(404).json({ success: false, message: "التحليل غير موجود" });

        // عند رد الدكتور، نجعل patient_read = 0 للمريض ليعتبرها رسالة جديدة
        await db.query(
            'UPDATE lab_results SET doctor_reply = ?, replied_at = NOW(), patient_read = 0 WHERE id = ?',
            [reply_text, lab_id]
        );

        // إرسال إشعار للمريض إن الدكتور رد على تحليله
        const [docRows] = await db.query('SELECT name FROM doctors WHERE id = ?', [doctor_id]);
        const doctorName = docRows[0]?.name || 'الدكتور';
        const notifMsg = `💬 رد الدكتور ${doctorName} على تحليلك "${rows[0].lab_name}" — اطلع على الرد في قسم حالتي الصحية.`;
        await db.query(
            `INSERT INTO notifications (patient_id, doctor_id, message, type) VALUES (?, ?, ?, 'رد تحليل')`,
            [rows[0].patient_id, doctor_id, notifMsg]
        );

        res.json({ success: true, message: "تم إرسال الرد للمريض بنجاح" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


// تحديث حالة الموعد (pending/examined)
exports.updateAppointmentStatus = async (req, res) => {
    const { appointmentId, status } = req.body;
    if (!appointmentId || !status) {
        return res.status(400).json({ success: false, message: "appointmentId و status مطلوبان" });
    }
    
    // التحقق من أن الحالة صحيحة
    if (!['pending', 'examined', 'cancelled'].includes(status)) {
        return res.status(400).json({ success: false, message: "حالة غير صحيحة" });
    }
    
    try {
        await db.query('UPDATE appointments SET status = ? WHERE id = ?', [status, appointmentId]);
        res.json({ success: true, message: "تم تحديث حالة الموعد بنجاح" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
