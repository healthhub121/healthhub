// ==========================================
// --- إصلاح دالة حذف صورة الدكتور ---
// ==========================================

async function removeDoctorPhoto() {
    const doctorId = localStorage.getItem('currentDoctorId');
    if (!doctorId) {
        alert('خطأ: لم يتم العثور على بيانات الدكتور');
        return;
    }
    
    const key = `docPhoto_${doctorId}`;
    
    // حذف من localStorage فوراً
    localStorage.removeItem(key);
    
    // تحديث الواجهة فوراً
    ['doctor-clinic-photo','profile-photo-preview'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.src = 'https://via.placeholder.com/72';
    });
    
    const removeBtn = document.getElementById('remove-doctor-photo-btn');
    if (removeBtn) removeBtn.style.display = 'none';
    
    // إرسال طلب الحذف للسيرفر
    try {
        const resp = await fetch('http://localhost:3000/doctor/upload-pic', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ doctor_id: parseInt(doctorId), profile_pic: null })
        });
        
        const data = await resp.json();
        
        if (resp.ok && data.success) {
            console.log('✅ تم حذف الصورة من السيرفر بنجاح');
            alert('✅ ' + data.message); // إعادة رسالة النجاح بناءً على طلب المستخدم
            
            // تحديث صور الأطباء للمرضى (إذا كانت الدالة موجودة)
            if (typeof updateDoctorPhotoForPatients === 'function') {
                updateDoctorPhotoForPatients();
            }
            return; // الخروج بعد النجاح
        } else {
            console.warn('⚠️ فشل حذف الصورة:', data.message);
            alert('⚠️ فشل حذف الصورة: ' + (data.message || 'خطأ غير معروف'));
            
            // إعادة الزر إذا فشل الحذف
            if (removeBtn) removeBtn.style.display = 'inline-flex';
        }
    } catch (err) {
        console.error('❌ خطأ في الاتصال بالسيرفر:', err);
        // تم إزالة التنبيه هنا بناءً على طلب المستخدم
        // alert('❌ خطأ في الاتصال بالسيرفر: ' + err.message);
        
        // إعادة الزر إذا فشل الاتصال
        if (removeBtn) removeBtn.style.display = 'inline-flex';
    }
}
