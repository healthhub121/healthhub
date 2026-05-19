const db = require('../config/db');

// دخول الأدمن
exports.adminLogin = async (req, res) => {
    const { username, password } = req.body;

    // بيانات الأدمن الافتراضية (في حالة عدم اتصال قاعدة البيانات)
    const defaultAdmins = [
        { id: 1, username: 'admin', password: 'admin123' },
        { id: 2, username: 'administrator', password: 'admin@2024' }
    ];

    try {
        const [admin] = await db.query(
            'SELECT * FROM admins WHERE username = ? AND password = ?',
            [username, password]
        );

        if (admin && admin.length > 0) {
            res.json({
                success: true,
                message: 'تم الدخول بنجاح',
                admin: admin[0]
            });
        } else {
            res.status(401).json({
                success: false,
                message: 'بيانات الدخول غير صحيحة'
            });
        }
    } catch (err) {
        console.error('خطأ في دخول الأدمن:', err);
        
        // fallback للبيانات الافتراضية في حالة أي خطأ في الداتا بيز
        // (فشل الاتصال، الجدول مش موجود، إلخ)
        const dbErrors = [
            'ECONNREFUSED',
            'PROTOCOL_CONNECTION_LOST',
            'ER_NO_SUCH_TABLE',
            'ENOTFOUND',
            'ETIMEDOUT'
        ];
        
        if (dbErrors.includes(err.code) || err.errno) {
            const defaultAdmin = defaultAdmins.find(
                a => a.username === username && a.password === password
            );
            
            if (defaultAdmin) {
                return res.json({
                    success: true,
                    message: 'تم الدخول بنجاح',
                    admin: defaultAdmin
                });
            } else {
                return res.status(401).json({
                    success: false,
                    message: 'بيانات الدخول غير صحيحة'
                });
            }
        }
        
        res.status(500).json({
            success: false,
            message: 'خطأ في الاتصال بالسيرفر. تأكد من تشغيل قاعدة البيانات.'
        });
    }
};

// الحصول على جميع الأطباء
exports.getAllDoctors = async (req, res) => {
    try {
        const [doctors] = await db.query(`
            SELECT d.*, 
                   COALESCE(AVG(r.stars), 0) as rating,
                   COUNT(r.id) as rating_count
            FROM doctors d
            LEFT JOIN ratings r ON d.id = r.doctor_id
            GROUP BY d.id
            ORDER BY d.name
        `);

        res.json(doctors);
    } catch (err) {
        console.error('خطأ في جلب الأطباء:', err);
        res.status(500).json({ message: 'خطأ في السيرفر' });
    }
};

// الحصول على جميع المرضى
exports.getAllPatients = async (req, res) => {
    try {
        const [patients] = await db.query(`
            SELECT * FROM patients ORDER BY name
        `);

        res.json(patients);
    } catch (err) {
        console.error('خطأ في جلب المرضى:', err);
        res.status(500).json({ message: 'خطأ في السيرفر' });
    }
};

// الحصول على جميع المواعيد
exports.getAllAppointments = async (req, res) => {
    try {
        const [appointments] = await db.query(`
            SELECT a.id, a.appointment_time, a.status, a.visit_type,
                   p.name as patient_name, p.id as patient_id,
                   d.name as doctor_name, d.id as doctor_id
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            JOIN doctors d ON a.doctor_id = d.id
            ORDER BY a.appointment_time DESC
        `);

        res.json(appointments);
    } catch (err) {
        console.error('خطأ في جلب المواعيد:', err);
        res.status(500).json({ message: 'خطأ في السيرفر' });
    }
};

// حذف طبيب
exports.deleteDoctor = async (req, res) => {
    const { doctorId } = req.params;

    try {
        await db.query('SET FOREIGN_KEY_CHECKS = 0');

        await db.query('DELETE FROM ratings      WHERE doctor_id = ?', [doctorId]);
        await db.query('DELETE FROM prescriptions WHERE doctor_id = ?', [doctorId]);
        await db.query('DELETE FROM notifications WHERE doctor_id = ?', [doctorId]);
        await db.query('DELETE FROM appointments  WHERE doctor_id = ?', [doctorId]);
        await db.query('DELETE FROM lab_results   WHERE doctor_id = ?', [doctorId]);
        await db.query('DELETE FROM doctor_info   WHERE doctor_id = ?', [doctorId]);

        const [result] = await db.query('DELETE FROM doctors WHERE id = ?', [doctorId]);

        await db.query('SET FOREIGN_KEY_CHECKS = 1');

        if (result.affectedRows > 0) {
            res.json({ success: true, message: 'تم حذف الطبيب بنجاح' });
        } else {
            res.status(404).json({ success: false, message: 'الطبيب غير موجود' });
        }
    } catch (err) {
        try { await db.query('SET FOREIGN_KEY_CHECKS = 1'); } catch (_) {}
        console.error('خطأ في حذف الطبيب:', err);
        res.status(500).json({ success: false, message: 'خطأ في السيرفر: ' + err.message });
    }
};

// حذف مريض
exports.deletePatient = async (req, res) => {
    const { patientId } = req.params;

    try {
        // تعطيل FK مؤقتاً لضمان الحذف الآمن
        await db.query('SET FOREIGN_KEY_CHECKS = 0');

        await db.query('DELETE FROM ratings       WHERE patient_id = ?', [patientId]);
        await db.query('DELETE FROM prescriptions WHERE patient_id = ?', [patientId]);
        await db.query('DELETE FROM notifications WHERE patient_id = ?', [patientId]);
        await db.query('DELETE FROM lab_results   WHERE patient_id = ?', [patientId]);
        await db.query('DELETE FROM appointments  WHERE patient_id = ?', [patientId]);

        const [result] = await db.query('DELETE FROM patients WHERE id = ?', [patientId]);

        // إعادة تفعيل FK
        await db.query('SET FOREIGN_KEY_CHECKS = 1');

        if (result.affectedRows > 0) {
            res.json({ success: true, message: 'تم حذف المريض بنجاح' });
        } else {
            res.status(404).json({ success: false, message: 'المريض غير موجود' });
        }
    } catch (err) {
        // إعادة تفعيل FK حتى لو حصل خطأ
        try { await db.query('SET FOREIGN_KEY_CHECKS = 1'); } catch (_) {}
        console.error('خطأ في حذف المريض:', err);
        res.status(500).json({ success: false, message: 'خطأ في السيرفر: ' + err.message });
    }
};

// حذف موعد
exports.deleteAppointment = async (req, res) => {
    const { appointmentId } = req.params;

    try {
        // حذف الإشعارات المرتبطة
        await db.query('DELETE FROM notifications WHERE appointment_id = ?', [appointmentId]);
        
        // حذف الموعد
        const [result] = await db.query('DELETE FROM appointments WHERE id = ?', [appointmentId]);

        if (result.affectedRows > 0) {
            res.json({
                success: true,
                message: 'تم حذف الموعد بنجاح'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'الموعد غير موجود'
            });
        }
    } catch (err) {
        console.error('خطأ في حذف الموعد:', err);
        res.status(500).json({
            success: false,
            message: 'خطأ في السيرفر: ' + err.message
        });
    }
};

// تعديل بيانات الطبيب
exports.updateDoctor = async (req, res) => {
    const { doctorId } = req.params;
    const { name, specialty, phone, price } = req.body;

    const safePrice = (price !== undefined && price !== '' && price !== null) ? parseInt(price) : null;
    const safePhone = phone || null;

    try {
        await db.query(
            'UPDATE doctors SET name = ?, specialty = ?, phone = ?, price = ? WHERE id = ?',
            [name, specialty, safePhone, safePrice, doctorId]
        );

        res.json({ success: true, message: 'تم تحديث بيانات الطبيب بنجاح' });
    } catch (err) {
        console.error('خطأ في تحديث الطبيب:', err);
        res.status(500).json({ success: false, message: 'خطأ في السيرفر: ' + err.message });
    }
};

// تعديل بيانات المريض
exports.updatePatient = async (req, res) => {
    const { patientId } = req.params;
    const { name, phone, age, blood_type, diseases } = req.body;

    // تحويل القيم الفارغة لـ NULL عشان MySQL مش بيقبل "" في حقول الأرقام
    const safeAge       = (age !== undefined && age !== '' && age !== null) ? parseInt(age) : null;
    const safePhone     = phone     || null;
    const safeBlood     = blood_type || null;
    const safeDiseases  = diseases  || null;

    try {
        await db.query(
            'UPDATE patients SET name = ?, phone = ?, age = ?, blood_type = ?, diseases = ? WHERE id = ?',
            [name, safePhone, safeAge, safeBlood, safeDiseases, patientId]
        );

        res.json({ success: true, message: 'تم تحديث بيانات المريض بنجاح' });
    } catch (err) {
        console.error('خطأ في تحديث المريض:', err);
        res.status(500).json({ success: false, message: 'خطأ في السيرفر: ' + err.message });
    }
};

// الحصول على إحصائيات عامة
exports.getStats = async (req, res) => {
    try {
        const [doctorsCount] = await db.query('SELECT COUNT(*) as count FROM doctors');
        const [patientsCount] = await db.query('SELECT COUNT(*) as count FROM patients');
        const [appointmentsCount] = await db.query('SELECT COUNT(*) as count FROM appointments');
        const [appointmentsToday] = await db.query(
            'SELECT COUNT(*) as count FROM appointments WHERE DATE(appointment_time) = CURDATE()'
        );

        res.json({
            doctors: doctorsCount[0].count,
            patients: patientsCount[0].count,
            appointments: appointmentsCount[0].count,
            appointmentsToday: appointmentsToday[0].count
        });
    } catch (err) {
        console.error('خطأ في جلب الإحصائيات:', err);
        res.status(500).json({ message: 'خطأ في السيرفر' });
    }
};
