/**
 * HealthHub - Patient Portal Logic (Fixed V5 Final)
 */

// 1. البيانات الأساسية
const doctors = [];
let selectedDoctor = null;
let recentSearches = JSON.parse(sessionStorage.getItem('recentDocs') || '[]');
let bookingStatus = { bookingOpen: true }; // يتحدث من السيرفر عند التحميل

// 2. التشغيل عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    await fetchDoctors(); // Always load doctors even without login
    
    const userId = sessionStorage.getItem('userId');
    if (!userId) return; // Stop here if not logged in
    
    loadUserData();
    await fetchBookingStatus();
    loadAppointments();
    displayRecent();
    setupEventListeners();
});

async function fetchBookingStatus() {
    try {
        const res = await fetch('https://healthhub-production-90ef.up.railway.app/doctor/booking-status');
        if (res.ok) bookingStatus = await res.json();
    } catch (err) {
        console.warn("تعذر جلب حالة الحجز:", err);
    }
}

async function fetchDoctors() {
    const container = document.getElementById('doctors-cards');
    // استخدام عنوان IP المحلي لضمان الوصول للسيرفر من المتصفح
    const API_URL = 'https://healthhub-production-90ef.up.railway.app/doctor/doctors';
    
    try {
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            throw new Error('فشل الاتصال بالسيرفر');
        }
        
        const data = await response.json();
        
        if (!Array.isArray(data)) {
            throw new Error('بيانات غير صالحة من السيرفر');
        }

        // تحويل البيانات لتناسب الشكل المتوقع في الفرونت إند
        const formattedDoctors = data.map(d => ({
            id: d.id,
            name: d.name,
            spec: d.specialty,
            rating: parseFloat(d.rating) || 0,
            rating_count: d.rating_count || 0,
            price: d.price || 200,
            profile_pic: d.profile_pic || null
        }));
        
        doctors.length = 0;
        doctors.push(...formattedDoctors);
        displayDoctors(doctors);
        
    } catch (err) {
        console.error("خطأ في جلب الأطباء:", err);
        if (container) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 20px; background: #fff5f5; border-radius: 10px; border: 1px solid #feb2b2;">
                    <p style="color: #c53030; font-weight: bold; margin-bottom: 10px;">⚠️ تعذر جلب الأطباء من قاعدة البيانات</p>
                    <p style="font-size: 14px; color: #742a2a;">تأكد من تشغيل السيرفر (Node.js) على جهازك.</p>
                    <button onclick="fetchDoctors()" style="margin-top: 10px; padding: 8px 15px; background: #c53030; color: white; border: none; border-radius: 5px; cursor: pointer;">إعادة المحاولة</button>
                </div>
            `;
        }
    }
}


// تحديث صورة الطبيب عند جميع المرضى
async function updateDoctorPhotoForPatients() {
    try {
        // جلب الأطباء المحدثة من السيرفر
        const response = await fetch('https://healthhub-production-90ef.up.railway.app/doctor/doctors');
        if (!response.ok) return;
        
        const data = await response.json();
        if (!Array.isArray(data)) return;
        
        // تحديث صور الأطباء في الـ doctors array
        data.forEach(d => {
            const existingDoctor = doctors.find(doc => doc.id === d.id);
            if (existingDoctor) {
                // تحديث الصورة سواء تغيرت أم لا (للتأكد من حذف الصور)
                existingDoctor.profile_pic = d.profile_pic;
                
                // تحديث الصورة في الـ DOM إذا كانت معروضة
                const doctorCard = document.querySelector(`[data-doctor-id="${d.id}"]`);
                if (doctorCard) {
                    const imgElement = doctorCard.querySelector('img');
                    if (imgElement) {
                        // إذا كانت الصورة null أو فارغة، استخدم صورة افتراضية
                        imgElement.src = d.profile_pic || 'https://via.placeholder.com/72';
                    }
                }
            }
        });
        console.log('✅ تم تحديث صور الأطباء بنجاح');
    } catch (err) {
        console.warn('⚠️ تعذر تحديث صور الأطباء:', err);
    }
}

// استدعاء تحديث صور الأطباء كل 30 ثانية
setInterval(updateDoctorPhotoForPatients, 30000);

// 3. إدارة بيانات المستخدم والصورة والثيم
function loadUserData() {
    const name = sessionStorage.getItem('userName');
    const nameDisplay = document.getElementById('patient-name-display');
    if (nameDisplay) {
        nameDisplay.innerText = (name && name !== "undefined" && name !== "null") ? name : "المريض العزيز";
    }

    const age = sessionStorage.getItem('userAge');
    const blood = sessionStorage.getItem('userBlood');
    const disease = sessionStorage.getItem('userDisease');
    document.getElementById('display-age').innerText = (age && age !== "null" && age !== "") ? age : "اضغط للتعديل";
    document.getElementById('display-blood').innerText = (blood && blood !== "null" && blood !== "") ? blood : "اضغط للتعديل";
    document.getElementById('display-disease').innerText = (disease && disease !== "null" && disease !== "") ? disease : "اضغط للتعديل";

    const patientId = sessionStorage.getItem('userId');
    const imgDisplay = document.getElementById('profile-img-display');
    const picKey = `patPhoto_${patientId}`;

    // 1) عرض فوري من sessionStorage
    const cached = sessionStorage.getItem(picKey);
    if (cached && imgDisplay) imgDisplay.src = cached;

    // 2) جلب من السيرفر في الخلفية (لو شغال)
    if (patientId) {
        fetch(`https://healthhub-production-90ef.up.railway.app/patient/profile/${patientId}`)
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (!data) return;
                if (data.profile_pic) {
                    sessionStorage.setItem(picKey, data.profile_pic);
                    if (imgDisplay) imgDisplay.src = data.profile_pic;
                }
                if (data.age)        { sessionStorage.setItem('userAge', data.age);         document.getElementById('display-age').innerText = data.age; }
                if (data.blood_type) { sessionStorage.setItem('userBlood', data.blood_type); document.getElementById('display-blood').innerText = data.blood_type; }
                if (data.diseases)   { sessionStorage.setItem('userDisease', data.diseases); document.getElementById('display-disease').innerText = data.diseases; }
                if (data.name)       { sessionStorage.setItem('userName', data.name); if (nameDisplay) nameDisplay.innerText = data.name; }
            })
            .catch(err => console.warn('تعذر جلب بيانات المريض من السيرفر:', err));
    }
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // ضغط الصورة قبل الرفع
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = async () => {
        const maxSize = 600;
        let w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) {
            if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
            else       { w = Math.round(w * maxSize / h); h = maxSize; }
        }
        canvas.width = w; canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);

        const base64Image = canvas.toDataURL('image/jpeg', 0.8);
        const patientId = sessionStorage.getItem('userId');
        const picKey = `patPhoto_${patientId}`;

        // عرض فوري
        document.getElementById('profile-img-display').src = base64Image;

        // رفع للسيرفر
        if (patientId) {
            try {
                const resp = await fetch('https://healthhub-production-90ef.up.railway.app/patient/upload-pic', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ patient_id: parseInt(patientId), profile_pic: base64Image })
                });
                const data = await resp.json();
                if (resp.ok && data.success) {
                    // نجح — نحفظ في sessionStorage
                    sessionStorage.setItem(picKey, base64Image);
                } else {
                    sessionStorage.removeItem(picKey);
                    console.warn('فشل حفظ صورة المريض في السيرفر:', data);
                }
            } catch (err) {
                // السيرفر مش شغال — نحفظ محلياً
                sessionStorage.setItem(picKey, base64Image);
                console.warn('السيرفر مش شغال، الصورة محفوظة محلياً:', err);
            }
        }
    };
    img.src = url;
}

function initTheme() {
    const themeBtn = document.getElementById('theme-toggle');
    const body = document.body;
    
    if (sessionStorage.getItem('theme') === 'dark') {
        body.classList.add('dark-theme');
        if (themeBtn) themeBtn.innerHTML = '<i class="fas fa-sun"></i>';
    }

    if (themeBtn) {
        themeBtn.onclick = () => {
            body.classList.toggle('dark-theme');
            const isDark = body.classList.contains('dark-theme');
            themeBtn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
            sessionStorage.setItem('theme', isDark ? 'dark' : 'light');
        };
    }
}

// 4. نظام الملف الشخصي (تعديل وحفظ)
function toggleEditProfile(isEdit) {
    const viewDiv = document.getElementById('profile-view');
    const editDiv = document.getElementById('profile-edit');
    
    if (isEdit) {
        viewDiv.classList.add('hidden');
        editDiv.classList.remove('hidden');
        
        if(document.getElementById('input-name')) {
            document.getElementById('input-name').value = sessionStorage.getItem('userName') || "";
        }
        document.getElementById('input-age').value = sessionStorage.getItem('userAge') || "";
        document.getElementById('input-blood').value = sessionStorage.getItem('userBlood') || "O+";
        document.getElementById('input-disease').value = sessionStorage.getItem('userDisease') || "";
    } else {
        viewDiv.classList.remove('hidden');
        editDiv.classList.add('hidden');
    }
}

async function saveProfileData() {
    const newName = document.getElementById('input-name') ? document.getElementById('input-name').value.trim() : null;
    const age = document.getElementById('input-age').value.trim();
    const blood = document.getElementById('input-blood').value;
    const disease = document.getElementById('input-disease').value.trim();

    // السماح بحفظ البيانات حتى لو بعض الحقول فارغة
    if (newName) sessionStorage.setItem('userName', newName);
    if (age) sessionStorage.setItem('userAge', age);
    if (blood) sessionStorage.setItem('userBlood', blood);
    sessionStorage.setItem('userDisease', disease);

    // تحديث فوري لكل العناصر المعروضة
    const nameDisplay = document.getElementById('patient-name-display');
    if (nameDisplay && newName) nameDisplay.innerText = newName;

    const ageDisplay = document.getElementById('display-age');
    if (ageDisplay) ageDisplay.innerText = age || "غير محدد";

    const bloodDisplay = document.getElementById('display-blood');
    if (bloodDisplay) bloodDisplay.innerText = blood || "غير محدد";

    const diseaseDisplay = document.getElementById('display-disease');
    if (diseaseDisplay) diseaseDisplay.innerText = disease || "لا يوجد";

    // حفظ البيانات في قاعدة البيانات عشان الدكتور يشوفها
    const patientId = sessionStorage.getItem('userId');
    if (patientId) {
        try {
            const response = await fetch('https://healthhub-production-90ef.up.railway.app/patient/update-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patient_id: parseInt(patientId),
                    name: newName || null,
                    age: age ? (parseInt(age) || null) : null,
                    blood_type: blood || null,
                    diseases: disease || null
                })
            });
            const result = await response.json();
            if (result.success) {
                showToast("✅ تم حفظ بياناتك بنجاح وستظهر للطبيب");
            } else {
                showToast("⚠️ تم الحفظ محلياً فقط، تحقق من الاتصال بالسيرفر");
            }
        } catch (err) {
            console.warn("تعذر حفظ البيانات في السيرفر، محفوظة محلياً فقط:", err);
            showToast("⚠️ تم الحفظ محلياً فقط، تحقق من الاتصال بالسيرفر");
        }
    }

    toggleEditProfile(false);
}

function showToast(msg) {
    let toast = document.getElementById('save-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'save-toast';
        toast.style.cssText = 'position:fixed; bottom:30px; left:50%; transform:translateX(-50%); background:#2c3e50; color:#fff; padding:12px 24px; border-radius:10px; font-size:14px; z-index:99999; opacity:0; transition:opacity 0.3s; white-space:nowrap;';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 3000);
}

// 5. نظام البحث وفلترة الأطباء
function displayDoctors(list) {
    const container = document.getElementById('doctors-cards');
    if (!container) return;

    if (list.length === 0) {
        container.innerHTML = '<p class="empty-state">لم يتم العثور على أطباء حالياً.</p>';
        return;
    }

    container.innerHTML = list.map(doc => `
        <div class="doctor-card scale-animation" data-doctor-id="${doc.id}" style="background: white; padding: 20px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); text-align: center;">
            <div class="doc-info">
                ${doc.profile_pic
                    ? `<img src="${doc.profile_pic}" alt="صورة الدكتور ${doc.name}" style="width:80px; height:80px; border-radius:50%; object-fit:cover; border:3px solid #3498db; margin-bottom:15px;">`
                    : `<i class="fas fa-user-md fa-3x" style="color: #3498db; margin-bottom: 15px; display:block;"></i>`
                }
                <h4 style="margin-bottom: 5px; color: #2c3e50;">${doc.name}</h4>
                <p class="spec-tag" style="background: #e1f5fe; color: #039be5; padding: 4px 12px; border-radius: 20px; display: inline-block; font-size: 13px; margin-bottom: 10px;">${doc.spec}</p>
                <div class="rating" style="margin-bottom: 10px;">
                    ${doc.rating_count > 0
                        ? '<i class="fas fa-star" style="color:#f1c40f"></i>'.repeat(Math.floor(doc.rating))
                          + (doc.rating % 1 >= 0.5 ? '<i class="fas fa-star-half-alt" style="color:#f1c40f"></i>' : '')
                          + `<span style="color: #7f8c8d; font-size: 13px; margin-right: 4px;">${doc.rating} (${doc.rating_count} تقييم)</span>`
                        : '<i class="far fa-star" style="color:#ccc"></i>'.repeat(5)
                          + '<span style="color: #aaa; font-size: 12px; margin-right: 4px;">لا يوجد تقييم بعد</span>'
                    }
                </div>
                <p class="price" style="font-size: 15px; color: #27ae60;">كشف: <b>${doc.price === 0 ? 'مجاني' : doc.price + ' ج.م'}</b></p>
            </div>
            <div style="display:flex; gap:8px; margin-top:15px;">
                <button onclick="showDoctorInfoPopup(${doc.id})"
                    style="padding:10px 14px; background:#f0f4f8; color:#5a7a9a; border:1px solid #dce8f0; border-radius:10px; cursor:pointer; font-size:14px; flex-shrink:0;" title="معلومات الدكتور">
                    <i class="fas fa-info-circle"></i>
                </button>
                <button id="book-btn-${doc.id}" onclick="checkAndBook(${doc.id}, this)"
                    style="flex:1; padding:10px; background:#3498db; color:white; border:none; border-radius:10px; cursor:pointer; font-weight:bold;">
                    <i class="fas fa-calendar-plus"></i> احجز الآن
                </button>
            </div>
        </div>
    `).join('');
}

function filterDoctors() {
    const searchTerm = document.getElementById('doctor-search').value.toLowerCase();
    const filtered = doctors.filter(doc => 
        doc.name.toLowerCase().includes(searchTerm) || doc.spec.toLowerCase().includes(searchTerm)
    );

    displayDoctors(filtered);
}

function displayRecent() {
    const container = document.getElementById('recent-list');
    if (!container) return;
    container.innerHTML = recentSearches.map(doc => `
        <span class="search-tag" onclick="quickSearch('${doc.name}')" style="background: #f1f2f6; padding: 5px 12px; border-radius: 15px; font-size: 12px; cursor: pointer;">
            <i class="fas fa-history"></i> ${doc.name}
        </span>
    `).join('');
}

function quickSearch(name) {
    const searchInput = document.getElementById('doctor-search');
    if (searchInput) {
        searchInput.value = name;
        filterDoctors();
    }
}

// 6. نظام الحجز (Modal)

// التحقق real-time من حالة الحجز قبل فتح المودال
async function checkAndBook(docId, btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';

    try {
        const res = await fetch('https://healthhub-production-90ef.up.railway.app/doctor/booking-status');
        if (res.ok) {
            const status = await res.json();
            bookingStatus = status;
        }
    } catch (err) {
        console.warn("تعذر جلب حالة الحجز:", err);
    }

    if (!bookingStatus.bookingOpen) {
        // الحجز مغلق — حدّث شكل الزر وأبلغ المريض
        btn.disabled = true;
        btn.style.background = '#e0e0e0';
        btn.style.color = '#999';
        btn.style.cursor = 'not-allowed';
        btn.innerHTML = '<i class="fas fa-lock"></i> الحجز مغلق حالياً';
        alert("⛔ الحجوزات متوقفة حالياً من قِبل الطبيب، يرجى المحاولة لاحقاً.");
        return;
    }

    // الحجز مفتوح — أعد الزر لحالته وافتح المودال
    btn.disabled = false;
    btn.style.background = '#3498db';
    btn.style.color = 'white';
    btn.style.cursor = 'pointer';
    btn.innerHTML = '<i class="fas fa-calendar-plus"></i> احجز الآن';
    openBookingModal(docId);
}

// ===== دالة فتح مودال الحجز مع اختيار الوقت بفاصل 15 دقيقة =====
function openBookingModal(docId) {
    selectedDoctor = doctors.find(d => d.id === docId);
    const modal = document.getElementById('booking-modal');
    const details = document.getElementById('modal-details');
    const today = new Date().toISOString().split('T')[0];

    const actions = document.querySelector('.modal-actions');
    if (actions) actions.style.display = 'flex';

    // reset lab fields
    modalLabBase64 = null;
    const labPreview = document.getElementById('lab-preview');
    if (labPreview) labPreview.style.display = 'none';
    ['lab-name-input','lab-text-input','lab-notes-input','lab-file-input'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    const visitRadios = document.querySelectorAll('input[name="visit-type"]');
    visitRadios.forEach(r => { r.checked = r.value === 'كشف'; });
    
    // إنشاء قائمة الأوقات بناءً على مواعيد الدكتور
    const generateTimeSlots = (fromHour = 9, fromMin = 0, toHour = 17, toMin = 0) => {
        const slots = [];
        let hour = fromHour, minute = fromMin;
        while (hour < toHour || (hour === toHour && minute < toMin)) {
            const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            slots.push(timeStr);
            minute += 15;
            if (minute >= 60) { minute = 0; hour++; }
        }
        return slots;
    };
    
    details.innerHTML = `
        <div class="modal-booking-info">
            <i class="fas fa-hospital-user fa-3x" style="color: #3498db; margin-bottom:15px;"></i>
            <h4>تأكيد الحجز مع ${selectedDoctor.name}</h4>
            <div id="date-section" style="margin-top: 15px;">
                <label style="display: block; margin-bottom: 5px;">تاريخ الزيارة:</label>
                <input type="date" id="booking-date" min="${today}" value="${today}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;" onchange="updateAvailableSlots()">
            </div>
            <div id="time-section" style="margin-top: 15px; display: block;">
                <label style="display: block; margin-bottom: 5px;">وقت الزيارة:</label>
                <select id="booking-time" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;">
                    <option value="">جاري تحميل الأوقات المتاحة...</option>
                </select>
                <div id="time-availability" style="margin-top: 10px; font-size: 12px; color: #666;"></div>
            </div>
        </div>
    `;

    // ملء قائمة الأوقات
    const timeSelect = document.getElementById('booking-time');
    const slots = generateTimeSlots();
    slots.forEach(slot => {
        const option = document.createElement('option');
        option.value = slot;
        option.textContent = slot;
        timeSelect.appendChild(option);
    });
    
    // تحميل الأوقات المتاحة فوراً عند فتح المودال
    updateAvailableSlots();

    // ربط راديو الكشف/متابعة بإظهار/إخفاء التاريخ والوقت
    document.querySelectorAll('input[name="visit-type"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const dateSection = document.getElementById('date-section');
            const timeSection = document.getElementById('time-section');
            if (!dateSection || !timeSection) return;
            if (radio.value === 'متابعة') {
                dateSection.style.display = 'none';
                timeSection.style.display = 'none';
                // نحط تاريخ اليوم كقيمة افتراضية صامتة
                const d = document.getElementById('booking-date');
                if (d) d.value = today;
            } else {
                dateSection.style.display = 'block';
                timeSection.style.display = 'block';
                updateAvailableSlots();
            }
        });
    });

    modal.classList.remove('hidden');
}

// ===== دالة تحديث الأوقات المتاحة بناءً على التاريخ المختار =====
async function updateAvailableSlots() {
    const dateInput = document.getElementById('booking-date');
    const timeSelect = document.getElementById('booking-time');
    const timeAvailability = document.getElementById('time-availability');
    
    if (!dateInput || !timeSelect) return;
    
    const selectedDate = dateInput.value;
    if (!selectedDate) return;
    
    try {
        // جلب مواعيد الدكتور والمواعيد المحجوزة
        const [statusRes, slotsRes] = await Promise.all([
            fetch('https://healthhub-production-90ef.up.railway.app/doctor/booking-status'),
            fetch(`https://healthhub-production-90ef.up.railway.app/patient/booked-slots/${selectedDoctor.id}/${selectedDate}`)
        ]);
        
        const settings = statusRes.ok ? await statusRes.json() : {};
        const bookedSlots = slotsRes.ok ? await slotsRes.json() : [];
        
        // تحديد أوقات الدكتور من الجدول الأسبوعي
        const daysMap = { 0:'الأحد', 1:'الاثنين', 2:'الثلاثاء', 3:'الأربعاء', 4:'الخميس', 5:'الجمعة', 6:'السبت' };
        const dayName = daysMap[new Date(selectedDate).getDay()];
        const daySchedule = settings.weeklySchedule?.[dayName];
        
        // مسح الأوقات الحالية وإعادة توليدها
        timeSelect.innerHTML = '<option value="">اختر وقتاً</option>';
        
        if (!settings.bookingOpen) {
            timeSelect.innerHTML = '<option value="" disabled>الحجز مغلق حالياً</option>';
            timeAvailability.textContent = '⛔ الحجز مغلق';
            timeAvailability.style.color = '#e74c3c';
            return;
        }
        
        if (daySchedule && daySchedule.isClosed) {
            timeSelect.innerHTML = `<option value="" disabled>يوم ${dayName} مغلق</option>`;
            timeAvailability.textContent = `⛔ يوم ${dayName} مغلق`;
            timeAvailability.style.color = '#e74c3c';
            return;
        }
        
        // توليد الأوقات
        let slots;
        if (daySchedule && daySchedule.from && daySchedule.to) {
            const [fH, fM] = daySchedule.from.split(':').map(Number);
            const [tH, tM] = daySchedule.to.split(':').map(Number);
            slots = generateTimeSlots(fH, fM, tH, tM);
        } else {
            slots = generateTimeSlots();
        }
        
        slots.forEach(slot => {
            const option = document.createElement('option');
            option.value = slot;
            const isBooked = bookedSlots.includes(slot);
            option.disabled = isBooked;
            option.textContent = isBooked ? `${slot} (محجوز)` : slot;
            timeSelect.appendChild(option);
        });
        
        const availableCount = slots.filter(s => !bookedSlots.includes(s)).length;
        if (availableCount === 0) {
            timeAvailability.textContent = '❌ لا توجد أوقات متاحة في هذا التاريخ';
            timeAvailability.style.color = '#e74c3c';
        } else {
            timeAvailability.textContent = `✅ ${availableCount} أوقات متاحة`;
            timeAvailability.style.color = '#27ae60';
        }
    } catch (err) {
        console.warn("تعذر جلب الأوقات المحجوزة:", err);
        timeAvailability.textContent = '⚠️ تعذر التحقق من الأوقات المتاحة';
        timeAvailability.style.color = '#f39c12';
    }
}

// ===== دالة تأكيد الحجز مع التحقق من الوقت =====
async function confirmBooking() {
    const visitType = document.querySelector('input[name="visit-type"]:checked')?.value || 'كشف';
    const dateEl = document.getElementById('booking-date');
    const timeEl = document.getElementById('booking-time');
    const today = new Date().toISOString().split('T')[0];
    const date = (visitType === 'متابعة') ? today : (dateEl?.value || today);
    const time = (visitType === 'متابعة') ? '00:00' : (timeEl?.value || '');
    const patientId = sessionStorage.getItem('userId');
    
    if (!patientId) return alert("يرجى تسجيل الدخول أولاً");
    if (visitType === 'كشف' && !date) return alert("يرجى تحديد تاريخ الزيارة");
    if (visitType === 'كشف' && !time) return alert("يرجى تحديد وقت الزيارة");
    if (!selectedDoctor) return alert("يرجى اختيار طبيب أولاً");

    // دمج التاريخ والوقت
    const appointmentDateTime = visitType === 'متابعة' ? date : `${date} ${time}`;

    // --- التحقق من حالة الحجوزات والجدول الأسبوعي ---
    try {
        const statusRes = await fetch('https://healthhub-production-90ef.up.railway.app/doctor/booking-status');
        if (statusRes.ok) {
            const settings = await statusRes.json();

            // تحقق من إيقاف الحجوزات كلياً
            if (!settings.bookingOpen) {
                return alert("⛔ الحجوزات متوقفة حالياً، يرجى المحاولة لاحقاً");
            }

            // تحقق من الجدول الأسبوعي
            const daysMap = { 0: "الأحد", 1: "الاثنين", 2: "الثلاثاء", 3: "الأربعاء", 4: "الخميس", 5: "الجمعة", 6: "السبت" };
            const selectedDate = new Date(date);
            const dayName = daysMap[selectedDate.getDay()];
            const daySchedule = settings.weeklySchedule?.[dayName];

            if (daySchedule && daySchedule.isClosed) {
                return alert(`⛔ يوم ${dayName} مغلق، يرجى اختيار يوم آخر`);
            }
        }
    } catch (err) {
        console.warn("تعذر التحقق من جدول الحجز:", err);
    }

    try {
        const response = await fetch('https://healthhub-production-90ef.up.railway.app/patient/book-v2', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                patient_id: parseInt(patientId),
                doctor_id: parseInt(selectedDoctor.id),
                appointment_time: appointmentDateTime,
                visit_type: visitType
            })
        });

        if (response.ok) {
            const bookingResult = await response.json();
            // حفظ الموعد في مواعيدي مع appointment_id الحقيقي من DB
            const appointments = JSON.parse(sessionStorage.getItem('myAppointments') || '[]');
            appointments.push({
                id: bookingResult.appointment_id,
                doctorName: selectedDoctor.name,
                doctorSpec: selectedDoctor.spec,
                doctorId: selectedDoctor.id,
                date: appointmentDateTime,
                status: 'قيد الانتظار'
            });
            sessionStorage.setItem('myAppointments', JSON.stringify(appointments));

            // حفظ في البحث الأخير
            if (!recentSearches.find(d => d.id === selectedDoctor.id)) {
                recentSearches.unshift({ id: selectedDoctor.id, name: selectedDoctor.name });
                if (recentSearches.length > 5) recentSearches.pop();
                sessionStorage.setItem('recentDocs', JSON.stringify(recentSearches));
            }

            const bookingId = bookingResult.appointment_id;

            // لو المريض رفع تحليل مع الحجز نبعته للدكتور
            const labName = document.getElementById('lab-name-input')?.value.trim();
            const labText = document.getElementById('lab-text-input')?.value.trim();
            const labNotes = document.getElementById('lab-notes-input')?.value.trim();
            if (labName && (modalLabBase64 || labText)) {
                try {
                    await fetch('https://healthhub-production-90ef.up.railway.app/patient/upload-lab', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            patient_id: parseInt(patientId),
                            doctor_id: selectedDoctor.id,
                            appointment_id: bookingId,
                            lab_name: labName,
                            lab_type: modalLabBase64 ? 'image' : 'text',
                            lab_content: modalLabBase64 || labText,
                            notes: labNotes || null
                        })
                    });
                } catch (err) { console.warn('تعذر رفع التحليل:', err); }
            }

            showSuccessUI();
        } else {
            const errorData = await response.json();
            if (errorData.message && errorData.message.includes('محجوز')) {
                alert("❌ " + errorData.message + "\n\nيرجى اختيار وقت آخر");
                // إعادة تحميل الأوقات المتاحة
                updateAvailableSlots();
            } else {
                alert("فشل الحجز، يرجى المحاولة مرة أخرى");
            }
        }
    } catch (err) {
        console.error("خطأ في الحجز:", err);
        alert("خطأ في الاتصال بالسيرفر");
    }
}

function showSuccessUI() {
    const actions = document.querySelector('.modal-actions');
    if (actions) actions.style.display = 'none';
    
    document.getElementById('modal-details').innerHTML = `
        <div class="success-screen" style="text-align:center; padding: 20px;">
            <i class="fas fa-check-circle fa-5x" style="color: #27ae60; margin-bottom: 15px;"></i>
            <h3 style="color: #2c3e50;">تم الحجز بنجاح!</h3>
            <p style="color: #7f8c8d; margin-bottom: 20px;">تم إرسال طلبك للطبيب، يمكنك متابعة الحالة من قائمة مواعيدي.</p>
            <button class="btn-book" onclick="closeModal(); switchTab('my-appointments', null);" style="width:100%; padding: 12px; background: #3498db; color: white; border: none; border-radius: 10px; cursor: pointer;">إغلاق</button>
        </div>
    `;
}

function closeModal() {
    document.getElementById('booking-modal').classList.add('hidden');
}

// 7. التبويبات والمواعيد
function switchTab(tabName, event) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) targetTab.classList.remove('hidden');
    
    if (event) {
        event.currentTarget.classList.add('active');
    } else {
        document.querySelectorAll('.nav-item').forEach(n => {
            if (n.getAttribute('onclick').includes(tabName)) n.classList.add('active');
        });
    }

    if (tabName === 'my-appointments') loadAppointments();
    if (tabName === 'my-health') { loadPrescriptions(); fillLabDoctorSelect(); loadPatientLabResults(); }

}

async function loadPrescriptions() {
    const container = document.getElementById('prescriptions-list');
    const readContainer = document.getElementById('prescriptions-read-list');
    const patientId = sessionStorage.getItem('userId');
    if (!patientId || !container) return;

    container.innerHTML = `
        <div style="text-align:center; padding: 40px; color: #bdc3c7;">
            <i class="fas fa-spinner fa-spin fa-2x"></i>
            <p style="margin-top: 10px;">جاري تحميل الروشتات...</p>
        </div>`;

    try {
        const response = await fetch(`https://healthhub-production-90ef.up.railway.app/doctor/prescriptions?patient_id=${patientId}`);
        if (!response.ok) throw new Error('فشل الاتصال');
        const data = await response.json();

        if (!data || data.length === 0) {
            const emptyHtml = `
                <div style="text-align:center; padding: 40px; color: #7f8c8d;">
                    <i class="fas fa-file-medical fa-3x" style="color: #dfe6e9; margin-bottom: 15px;"></i>
                    <p>لا توجد روشتات حتى الآن.</p>
                </div>`;
            container.innerHTML = emptyHtml;
            if (readContainer) readContainer.innerHTML = emptyHtml;
            return;
        }

        const renderRx = (rx) => {
            const currentRating = rx.my_rating || 0;
            const starsHtml = [1,2,3,4,5].map(star => `
                <i class="fa${star <= currentRating ? 's' : 'r'} fa-star"
                   style="cursor:pointer; color:${star <= currentRating ? '#f1c40f' : '#ddd'}; font-size:22px; margin:0 3px; transition:color 0.15s;"
                   onclick="event.stopPropagation(); rateDoctor(${rx.doctor_id}, ${rx.id}, ${star})"
                   title="${star} نجوم"></i>
            `).join('');

            const docPhotoHtml = rx.doctor_pic
                ? `<img src="${rx.doctor_pic}" alt="د. ${rx.doctor_name}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,0.5);">`
                : `<div style="width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;"><i class="fas fa-user-md" style="color:white;font-size:22px;"></i></div>`;

            const dateStr = new Date(rx.created_at).toLocaleDateString('ar-EG', { year:'numeric', month:'long', day:'numeric' });

            return `
            <div id="rx-card-${rx.id}" style="background:#fff;border-radius:16px;margin-bottom:22px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);direction:rtl; position:relative;${rx.is_read ? 'opacity:0.7;' : ''}">
                ${!rx.is_read ? '<span style="position:absolute; top:12px; left:12px; background:#e74c3c; color:white; font-size:10px; padding:2px 8px; border-radius:12px; z-index:10; font-weight:bold; box-shadow:0 2px 4px rgba(0,0,0,0.1);">جديد</span>' : ''}
                <!-- هيدر الدكتور بالصورة -->
                <div style="background:linear-gradient(135deg,#1565c0,#0d47a1);padding:16px 20px;display:flex;align-items:center;gap:14px;justify-content:space-between;">
                    <div style="display:flex;align-items:center;gap:14px;flex:1;">
                        ${docPhotoHtml}
                        <div style="flex:1;">
                            <div style="color:rgba(255,255,255,0.7);font-size:10px;margin-bottom:2px;">الطبيب المعالج</div>
                            <div style="color:white;font-size:16px;font-weight:bold;">د. ${rx.doctor_name}</div>
                            ${rx.doctor_specialty ? `<div style="color:rgba(255,255,255,0.7);font-size:12px;margin-top:2px;">${rx.doctor_specialty}</div>` : ''}
                        </div>
                    </div>
                    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
                        <div style="text-align:left;">
                            <div style="color:rgba(255,255,255,0.6);font-size:10px;">تاريخ الروشتة</div>
                            <div style="color:white;font-size:12px;font-weight:500;margin-top:2px;">${dateStr}</div>
                        </div>
                        <button onclick="event.stopPropagation(); archivePrescription(${rx.id})" title="أرشفة" style="background:rgba(255,255,255,0.2); color:white; border:1px solid rgba(255,255,255,0.3); border-radius:6px; padding:4px 8px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:11px; gap:4px; transition:0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.3)';" onmouseout="this.style.background='rgba(255,255,255,0.2)';">
                            <i class="fas fa-archive" style="font-size:10px;"></i> أرشفة
                        </button>
                    </div>
                </div>

                <!-- جسم الروشتة -->
                <div style="padding:20px;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                        <div style="width:32px;height:32px;border-radius:8px;background:#fff0f0;display:flex;align-items:center;justify-content:center;">
                            <i class="fas fa-file-prescription" style="color:#e74c3c;font-size:14px;"></i>
                        </div>
                        <span style="font-size:13px;font-weight:bold;color:#1a2940;">الروشتة الطبية</span>
                    </div>
                    <div style="background:#f8faff;border:1px solid #dce8f8;border-radius:12px;padding:16px;white-space:pre-wrap;font-size:14px;color:#1a2940;line-height:2;font-family:inherit;">${rx.prescription_text}</div>
                </div>

                <!-- قسم التقييم -->
                <div style="padding:14px 20px;background:#f8faff;border-top:1px solid #eef2f8;">
                    <div style="font-size:12px;color:#7f8c8d;margin-bottom:8px;">
                        <i class="fas fa-star" style="color:#f1c40f;margin-left:4px;"></i>
                        ${currentRating > 0 ? `تقييمك للدكتور: ${currentRating}/5 — يمكنك تغييره` : 'قيّم هذا الطبيب:'}
                    </div>
                    <div id="stars-rx-${rx.id}" style="direction:ltr;display:inline-block;">${starsHtml}</div>
                </div>
            </div>`;
        };

        const newRx = data.filter(r => !r.is_read);
        const readRx = data.filter(r => r.is_read);

        container.innerHTML = newRx.length > 0 ? newRx.map(renderRx).join('') : '<div style="text-align:center;padding:40px;color:#bdc3c7;">لا توجد روشتات جديدة</div>';
        if (readContainer) readContainer.innerHTML = readRx.length > 0 ? readRx.map(renderRx).join('') : '<div style="text-align:center;padding:40px;color:#bdc3c7;">لا توجد روشتات سابقة</div>';

    } catch (err) {
        console.error("خطأ في جلب الروشتات:", err);
        container.innerHTML = `
            <div style="text-align:center; padding: 40px; background: #fff5f5; border-radius: 10px;">
                <i class="fas fa-exclamation-triangle fa-2x" style="color: #e74c3c; margin-bottom: 10px;"></i>
                <p style="color: #c53030;">تعذر تحميل الروشتات، تأكد من تشغيل السيرفر.</p>
                <button onclick="loadPrescriptions()" style="margin-top: 10px; padding: 8px 15px; background: #3498db; color: white; border: none; border-radius: 8px; cursor: pointer;">
                    إعادة المحاولة
                </button>
            </div>`;
    }
}

async function archivePrescription(id) {
    const patientId = sessionStorage.getItem('userId');
    if (!patientId || !id) return;

    if (!confirm('هل تريد أرشفة هذه الروشتة؟ ستختفي من القائمة الرئيسية.')) return;

    try {
        const res = await fetch('https://healthhub-production-90ef.up.railway.app/patient/prescriptions/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prescription_id: id, patient_id: parseInt(patientId) })
        });

        if (res.ok) {
            const card = document.getElementById(`rx-card-${id}`);
            if (card) {
                card.style.opacity = '0';
                card.style.transform = 'translateX(20px)';
                card.style.transition = 'all 0.3s ease';
                setTimeout(() => {
                    card.remove();
                    // إعادة تحميل القائمة للتأكد من تحديث الحالة
                    loadPrescriptions();
                }, 300);
            }
        } else {
            alert('فشل أرشفة الروشتة');
        }
    } catch (err) {
        console.error('خطأ في الأرشفة:', err);
        alert('خطأ في الاتصال بالسيرفر');
    }
}

async function markPrescriptionRead(id) {
    const patientId = sessionStorage.getItem('userId');
    try {
        await fetch('https://healthhub-production-90ef.up.railway.app/patient/prescriptions/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prescription_id: id, patient_id: parseInt(patientId) })
        });
        loadPrescriptions();
    } catch (err) { console.error(err); }
}

function switchPrescTab(type) {
    const newTab = document.getElementById('presc-new-tab');
    const readTab = document.getElementById('presc-read-tab');
    const newList = document.getElementById('prescriptions-list');
    const readList = document.getElementById('prescriptions-read-list');

    if (type === 'new') {
        newTab.style.borderBottomColor = '#3498db'; newTab.style.color = '#3498db';
        readTab.style.borderBottomColor = 'transparent'; readTab.style.color = '#999';
        newList.style.display = 'block'; readList.style.display = 'none';
    } else {
        readTab.style.borderBottomColor = '#3498db'; readTab.style.color = '#3498db';
        newTab.style.borderBottomColor = 'transparent'; newTab.style.color = '#999';
        newList.style.display = 'none'; readList.style.display = 'block';
    }
}
async function loadAppointments() {
    const list = document.getElementById('active-list');
    const patientId = sessionStorage.getItem('userId');
    if (!patientId || !list) return;

    // تحميل الإشعارات أيضاً
    loadNotifications(patientId);

    list.innerHTML = '<div style="text-align:center; padding: 20px; color: #7f8c8d;">جاري التحميل...</div>';

    try {
        // نجيب المواعيد من DB مباشرة عشان تكون متزامنة دايماً (حتى لو الدكتور حذف موعد)
        const response = await fetch(`https://healthhub-production-90ef.up.railway.app/patient/appointments/${patientId}`);
        const appointments = await response.json();

        // نحدث sessionStorage بالبيانات الحديثة من DB
        sessionStorage.setItem('myAppointments', JSON.stringify(appointments.map(a => ({
            id: a.id,
            doctorName: a.doctorName,
            doctorSpec: a.doctorSpec,
            doctorId: a.doctorId,
            date: a.appointment_time,
            status: a.status === 'pending' ? 'قيد الانتظار' : a.status
        }))));

        if (appointments.length === 0) {
            list.innerHTML = '<div class="empty-state" style="text-align:center; padding: 40px; color: #7f8c8d;">لا توجد حجوزات حالية.</div>';
            return;
        }

        list.innerHTML = appointments.map(app => {
            const statusDisplay = app.status === 'pending' ? 'قيد الانتظار' : app.status === 'examined' ? 'تم الكشف' : app.status;
            const statusColor = app.status === 'examined' ? '#4caf50' : '#ff9800';
            return `
            <div class="appointment-card" style="background: white; padding: 15px; border-radius: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                <div class="app-info">
                    <h5 style="margin-bottom: 5px;">${app.doctorName}</h5>
                    <p style="font-size: 13px; color: #7f8c8d;"><i class="far fa-calendar-alt"></i> ${app.appointment_time}</p>
                    <span class="status-badge" style="font-size: 11px; background: ${statusColor}22; color: ${statusColor}; padding: 2px 8px; border-radius: 10px;">${statusDisplay}</span>
                </div>
                <button onclick="cancelApp(${app.id})" style="background: #fee2e2; color: #ef4444; border: none; width: 35px; height: 35px; border-radius: 50%; cursor: pointer;"><i class="fas fa-trash"></i></button>
            </div>
        `;
        }).join('');
    } catch (err) {
        console.error("خطأ في تحميل الحجوزات:", err);
        // fallback على sessionStorage لو السيرفر مش شغال
        const appointments = JSON.parse(sessionStorage.getItem('myAppointments') || '[]');
        if (appointments.length === 0) {
            list.innerHTML = '<div class="empty-state" style="text-align:center; padding: 40px; color: #7f8c8d;">لا توجد حجوزات حالية.</div>';
            return;
        }
        list.innerHTML = appointments.map(app => `
            <div class="appointment-card" style="background: white; padding: 15px; border-radius: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                <div class="app-info">
                    <h5 style="margin-bottom: 5px;">${app.doctorName}</h5>
                    <p style="font-size: 13px; color: #7f8c8d;"><i class="far fa-calendar-alt"></i> ${app.date}</p>
                    <span class="status-badge" style="font-size: 11px; background: #e8f5e9; color: #2e7d32; padding: 2px 8px; border-radius: 10px;">${app.status}</span>
                </div>
                <button onclick="cancelApp(${app.id})" style="background: #fee2e2; color: #ef4444; border: none; width: 35px; height: 35px; border-radius: 50%; cursor: pointer;"><i class="fas fa-trash"></i></button>
            </div>
        `).join('');
    }
}

// ===== دالة تحميل الإشعارات مع فصل الجديدة والمقروءة =====
async function loadNotifications(patientId) {
    const section = document.getElementById('notifications-section');
    const unreadList = document.getElementById('notifications-list');
    const readList = document.getElementById('read-notifications-list');
    if (!section || !unreadList || !readList) return;

    try {
        const res = await fetch(`https://healthhub-production-90ef.up.railway.app/patient/notifications/${patientId}`);
        const notifications = await res.json();

        if (!Array.isArray(notifications) || notifications.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        
        // فصل الإشعارات المقروءة والجديدة
        const unreadNotifs = notifications.filter(n => !n.is_read);
        const readNotifs = notifications.filter(n => n.is_read);
        
        // دالة لإنشاء عنصر إشعار
        const createNotificationHTML = (n) => {
            const isEmergency = n.type === 'طوارئ';
            const bgColor = isEmergency ? '#fff5f5' : '#f0f7ff';
            const borderColor = isEmergency ? '#e74c3c' : '#3498db';
            const icon = isEmergency ? '🚨' : '📅';
            const timeStr = new Date(n.created_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
            const unreadStyle = n.is_read ? '' : 'font-weight:bold;';

            return `
            <div class="notification-item" style="display:flex; align-items:flex-start; gap:12px; background:${bgColor}; border-right:4px solid ${borderColor}; border-radius:10px; padding:12px 14px; margin-bottom:10px; ${unreadStyle}position:relative; cursor:pointer;"
                 onclick="markNotifRead(${n.id}, this)">
                ${!n.is_read ? `<span style="position:absolute;top:8px;left:10px;width:8px;height:8px;background:${borderColor};border-radius:50%;"></span>` : ''}
                <div style="font-size:22px; line-height:1;">${icon}</div>
                <div style="flex:1;">
                    <div style="font-size:14px; color:#1a2940; margin-bottom:4px;">${n.message}</div>
                    <div style="font-size:11px; color:#888;">د. ${n.doctor_name} &nbsp;|&nbsp; ${n.doctor_specialty} &nbsp;|&nbsp; ${timeStr}</div>
                </div>
            </div>`;
        };
        
        // عرض الإشعارات الجديدة
        if (unreadNotifs.length === 0) {
            unreadList.innerHTML = '<div style="text-align:center; padding:20px; color:#999;"><i class="fas fa-inbox"></i> لا توجد إشعارات جديدة</div>';
        } else {
            unreadList.innerHTML = unreadNotifs.map(createNotificationHTML).join('');
        }
        
        // عرض الإشعارات المقروءة
        if (readNotifs.length === 0) {
            readList.innerHTML = '<div style="text-align:center; padding:20px; color:#999;"><i class="fas fa-check-circle"></i> لا توجد إشعارات مقروءة</div>';
        } else {
            readList.innerHTML = readNotifs.map(createNotificationHTML).join('');
        }
    } catch (err) {
        console.warn("تعذر تحميل الإشعارات:", err);
        section.style.display = 'none';
    }
}

// ===== دالة التبديل بين تبويبات الإشعارات =====
function switchNotificationTab(tabType) {
    const unreadTab = document.getElementById('unread-tab');
    const readTab = document.getElementById('read-tab');
    const unreadList = document.getElementById('notifications-list');
    const readList = document.getElementById('read-notifications-list');
    
    if (tabType === 'unread') {
        unreadTab.style.borderBottom = '3px solid #e67e22';
        unreadTab.style.color = '#e67e22';
        readTab.style.borderBottom = '3px solid transparent';
        readTab.style.color = '#999';
        unreadList.style.display = 'block';
        readList.style.display = 'none';
    } else {
        unreadTab.style.borderBottom = '3px solid transparent';
        unreadTab.style.color = '#999';
        readTab.style.borderBottom = '3px solid #e67e22';
        readTab.style.color = '#e67e22';
        unreadList.style.display = 'none';
        readList.style.display = 'block';
    }
}

// ===== دالة تحديث الإشعار كمقروء =====
async function markNotifRead(notifId, el) {
    const patientId = sessionStorage.getItem('userId');
    if (!patientId) return;
    try {
        await fetch('https://healthhub-production-90ef.up.railway.app/patient/notifications/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notification_id: notifId, patient_id: parseInt(patientId) })
        });
        // إعادة تحميل الإشعارات لتحديث القائمتين
        loadNotifications(patientId);
    } catch (err) { /* تجاهل */ }
}

async function cancelApp(appointmentId) {
    if (!confirm("إلغاء الموعد؟ سيتم حذفه نهائياً.")) return;
    const patientId = parseInt(sessionStorage.getItem('userId'));
    if (!patientId) return alert("يرجى تسجيل الدخول أولاً");

    try {
        const response = await fetch(`https://healthhub-production-90ef.up.railway.app/patient/cancel/${appointmentId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ patient_id: patientId })
        });
        const data = await response.json();
        if (data.success) {
            // نحدث sessionStorage ونعيد التحميل من DB
            let apps = JSON.parse(sessionStorage.getItem('myAppointments') || '[]');
            apps = apps.filter(a => a.id !== appointmentId);
            sessionStorage.setItem('myAppointments', JSON.stringify(apps));
            loadAppointments();
        } else {
            alert("❌ فشل إلغاء الموعد: " + (data.message || "خطأ غير معروف"));
        }
    } catch (err) {
        console.error("خطأ في إلغاء الموعد:", err);
        // لو السيرفر مش شغال نشيله من sessionStorage على الأقل
        let apps = JSON.parse(sessionStorage.getItem('myAppointments') || '[]');
        apps = apps.filter(a => a.id !== appointmentId);
        sessionStorage.setItem('myAppointments', JSON.stringify(apps));
        loadAppointments();
    }
}

// 8. إعدادات المستمعين والخروج
function setupEventListeners() {
    window.onclick = (e) => {
        if (e.target === document.getElementById('booking-modal')) closeModal();
    };
}

// ==========================================
// --- نظام التقييم بالنجوم ---
// ==========================================
async function rateDoctor(doctorId, prescriptionId, stars) {
    const patientId = sessionStorage.getItem('userId');
    if (!patientId) return alert("يرجى تسجيل الدخول أولاً");

    try {
        const response = await fetch('https://healthhub-production-90ef.up.railway.app/doctor/rate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                patient_id: parseInt(patientId),
                doctor_id: doctorId,
                prescription_id: prescriptionId,
                stars: stars
            })
        });
        const data = await response.json();
        if (data.success) {
            // تحديث النجوم في الواجهة فوراً بدون ريلود
            const container = document.getElementById(`stars-rx-${prescriptionId}`);
            if (container) {
                container.innerHTML = [1,2,3,4,5].map(star => `
                    <i class="fa${star <= stars ? 's' : 'r'} fa-star"
                       style="cursor:pointer; color:${star <= stars ? '#f1c40f' : '#ccc'}; font-size:20px; margin:0 2px;"
                       onclick="rateDoctor(${doctorId}, ${prescriptionId}, ${star})"
                       title="${star} نجوم"></i>
                `).join('');
            }
            // تحديث الرسالة فوق النجوم
            const parent = container ? container.parentElement : null;
            if (parent) {
                const msg = parent.querySelector('p');
                if (msg) msg.innerHTML = `<i class="fas fa-star" style="color: #f1c40f;"></i> تقييمك: ${stars}/5 — شكراً لك! يمكنك تغييره`;
            }
        } else {
            alert("❌ فشل حفظ التقييم: " + (data.message || "خطأ غير معروف"));
        }
    } catch (err) {
        console.error("خطأ في التقييم:", err);
        alert("خطأ في الاتصال بالسيرفر");
    }
}

function logout() {
    if (confirm("تسجيل الخروج؟")) {
        sessionStorage.clear();
        window.location.href = 'index.html';
    }
}

// ==========================================
// --- تغيير كلمة السر للمريض ---
// ==========================================
function togglePatientChangePass() {
    const form = document.getElementById('patient-change-pass-form');
    const chevron = document.getElementById('patient-pass-chevron');
    const isOpen = form.style.display === 'flex';
    form.style.display = isOpen ? 'none' : 'flex';
    if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
}

async function patientChangePassword() {
    const patientId = sessionStorage.getItem('userId');
    const oldPass = document.getElementById('pat-old-password').value.trim();
    const newPass = document.getElementById('pat-new-password').value.trim();
    const confirmPass = document.getElementById('pat-confirm-new-password').value.trim();
    const msgEl = document.getElementById('pat-change-pass-msg');

    if (!oldPass || !newPass || !confirmPass) {
        msgEl.textContent = '⚠️ يرجى ملء جميع الحقول';
        msgEl.style.color = '#e74c3c';
        return;
    }
    if (newPass !== confirmPass) {
        msgEl.textContent = '⚠️ كلمة السر الجديدة غير متطابقة';
        msgEl.style.color = '#e74c3c';
        return;
    }
    if (newPass.length < 4) {
        msgEl.textContent = '⚠️ كلمة السر يجب أن تكون 4 أحرف على الأقل';
        msgEl.style.color = '#e74c3c';
        return;
    }

    try {
        const res = await fetch('https://healthhub-production-90ef.up.railway.app/patient/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ patient_id: parseInt(patientId), old_password: oldPass, new_password: newPass })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            msgEl.textContent = '✅ تم تغيير كلمة السر بنجاح';
            msgEl.style.color = '#27ae60';
            document.getElementById('pat-old-password').value = '';
            document.getElementById('pat-new-password').value = '';
            document.getElementById('pat-confirm-new-password').value = '';
            setTimeout(() => { msgEl.textContent = ''; togglePatientChangePass(); }, 2500);
        } else {
            msgEl.textContent = '❌ ' + (data.message || 'فشل تغيير كلمة السر');
            msgEl.style.color = '#e74c3c';
        }
    } catch {
        msgEl.textContent = '⚠️ تعذر الاتصال بالسيرفر';
        msgEl.style.color = '#f39c12';
    }
}

// ==========================================
// --- رفع التحاليل من المريض ---
// ==========================================
let healthLabBase64 = null;

function previewHealthLab(event) {
    const file = event.target.files[0];
    if (!file) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
        const maxSize = 800;
        let w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) {
            if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
            else       { w = Math.round(w * maxSize / h); h = maxSize; }
        }
        canvas.width = w; canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        healthLabBase64 = canvas.toDataURL('image/jpeg', 0.8);
        const preview = document.getElementById('health-lab-preview');
        const imgEl = document.getElementById('health-lab-img');
        if (preview && imgEl) {
            imgEl.src = healthLabBase64;
            preview.style.display = 'block';
        }
    };
    img.src = url;
}

function clearHealthLabFile() {
    healthLabBase64 = null;
    const preview = document.getElementById('health-lab-preview');
    if (preview) preview.style.display = 'none';
    const fileInput = document.getElementById('health-lab-file');
    if (fileInput) fileInput.value = '';
}

// preview في الـ modal
let modalLabBase64 = null;
function previewLabFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
        const maxSize = 800;
        let w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) {
            if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
            else       { w = Math.round(w * maxSize / h); h = maxSize; }
        }
        canvas.width = w; canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        modalLabBase64 = canvas.toDataURL('image/jpeg', 0.8);
        const preview = document.getElementById('lab-preview');
        const imgEl = document.getElementById('lab-img-preview');
        if (preview && imgEl) { imgEl.src = modalLabBase64; preview.style.display = 'block'; }
    };
    img.src = url;
}

async function sendLabResult() {
    const patientId = sessionStorage.getItem('userId');
    const doctorSelectEl = document.getElementById('lab-doctor-select');
    const doctorId = doctorSelectEl ? doctorSelectEl.value : null;
    const labName = document.getElementById('health-lab-name')?.value.trim();
    const labText = document.getElementById('health-lab-text')?.value.trim();
    const labNotes = document.getElementById('health-lab-notes')?.value.trim();
    const msgEl = document.getElementById('lab-send-msg');
    const btn = document.getElementById('send-lab-btn');

    if (!patientId) { msgEl.textContent = '⚠️ يرجى تسجيل الدخول'; msgEl.style.color='#e74c3c'; return; }
    if (!doctorId) { msgEl.textContent = '⚠️ اختر دكتور أولاً'; msgEl.style.color='#e74c3c'; return; }
    if (!labName) { msgEl.textContent = '⚠️ أدخل اسم التحليل'; msgEl.style.color='#e74c3c'; return; }
    if (!healthLabBase64 && !labText) { msgEl.textContent = '⚠️ يرجى رفع صورة أو كتابة نتيجة التحليل'; msgEl.style.color='#e74c3c'; return; }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';

    const labType = healthLabBase64 ? 'image' : 'text';
    const labContent = healthLabBase64 || labText;

    try {
        const res = await fetch('https://healthhub-production-90ef.up.railway.app/patient/upload-lab', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                patient_id: parseInt(patientId),
                doctor_id: parseInt(doctorId),
                lab_name: labName,
                lab_type: labType,
                lab_content: labContent,
                notes: labNotes || null
            })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            msgEl.textContent = '✅ تم إرسال التحليل للدكتور بنجاح!';
            msgEl.style.color = '#27ae60';
            document.getElementById('health-lab-name').value = '';
            document.getElementById('health-lab-text').value = '';
            document.getElementById('health-lab-notes').value = '';
            clearHealthLabFile();
        } else {
            msgEl.textContent = '❌ ' + (data.message || 'فشل الإرسال');
            msgEl.style.color = '#e74c3c';
        }
    } catch (err) {
        msgEl.textContent = '⚠️ تعذر الاتصال بالسيرفر';
        msgEl.style.color = '#f39c12';
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال التحليل للدكتور';
        setTimeout(() => { msgEl.textContent = ''; }, 3000);
    }
}

// تعبئة قائمة الأطباء في select
async function fillLabDoctorSelect() {
    const select = document.getElementById('lab-doctor-select');
    if (!select) return;
    try {
        const res = await fetch('https://healthhub-production-90ef.up.railway.app/doctor/doctors');
        const data = await res.json();
        if (!Array.isArray(data)) return;
        data.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.id;
            opt.textContent = `د. ${d.name} — ${d.specialty}`;
            select.appendChild(opt);
        });
    } catch (err) { console.warn('تعذر جلب الأطباء للـ select:', err); }
}

// ==========================================
// --- معلومات الدكتور (قائمة الأطباء للمريض) ---
// ==========================================
async function loadDoctorsInfoTab() {
    const container = document.getElementById('doctors-info-container');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center;padding:40px;color:#bdc3c7;"><i class="fas fa-spinner fa-spin fa-2x"></i><p>جاري التحميل...</p></div>';

    try {
        const res = await fetch('https://healthhub-production-90ef.up.railway.app/doctor/doctors');
        const doctorsData = await res.json();

        if (!Array.isArray(doctorsData) || doctorsData.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:40px;color:#bdc3c7;">لا يوجد أطباء حالياً</div>';
            return;
        }

        container.innerHTML = doctorsData.map(doc => {
            const picHtml = doc.profile_pic
                ? `<img src="${doc.profile_pic}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid #3498db;">`
                : `<div style="width:80px;height:80px;border-radius:50%;background:#e8f4fd;display:flex;align-items:center;justify-content:center;"><i class="fas fa-user-md" style="font-size:30px;color:#3498db;"></i></div>`;
            return `
            <div style="background:white;border-radius:16px;margin-bottom:16px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,0.07);">
                <div style="background:linear-gradient(135deg,#3498db,#2980b9);padding:20px;display:flex;align-items:center;gap:16px;">
                    ${picHtml}
                    <div style="flex:1;">
                        <div style="color:white;font-size:18px;font-weight:bold;">${doc.name}</div>
                        <div style="color:rgba(255,255,255,0.8);font-size:13px;margin-top:3px;">${doc.specialty}</div>
                        <div style="color:#f1c40f;font-size:13px;margin-top:4px;">
                            ${doc.rating > 0 ? '⭐'.repeat(Math.min(5,Math.floor(doc.rating || 0))) + ` (${doc.rating_count || 0} تقييم)` : '⭐ لا يوجد تقييم بعد'}
                        </div>
                    </div>
                    <div style="text-align:center;">
                        <div style="color:white;font-weight:bold;font-size:18px;">${doc.price === 0 ? 'مجاني' : (doc.price || 200) + ' ج.م'}</div>
                        <div style="color:rgba(255,255,255,0.7);font-size:11px;">سعر الكشف</div>
                    </div>
                </div>
                <div id="doc-extra-${doc.id}" style="display:none;padding:16px;border-top:1px solid #eee;"></div>
                <div style="padding:12px 16px;display:flex;gap:10px;">
                    <button onclick="toggleDoctorInfo(${doc.id})"
                        style="flex:1;padding:10px;background:#e8f4fd;color:#2980b9;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:13px;">
                        <i class="fas fa-info-circle"></i> معلومات الدكتور
                    </button>
                    <button onclick="checkAndBook(${doc.id}, this)"
                        style="flex:1;padding:10px;background:#3498db;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:13px;">
                        <i class="fas fa-calendar-plus"></i> احجز الآن
                    </button>
                </div>
            </div>`;
        }).join('');

    } catch (err) {
        container.innerHTML = '<div style="text-align:center;padding:30px;background:#fff5f5;border-radius:12px;"><i class="fas fa-exclamation-triangle" style="color:#e74c3c;font-size:28px;"></i><p style="color:#c53030;margin-top:10px;">تعذر تحميل بيانات الأطباء</p></div>';
    }
}

async function toggleDoctorInfo(docId) {
    const panel = document.getElementById(`doc-extra-${docId}`);
    if (!panel) return;
    const isOpen = panel.style.display !== 'none';
    if (isOpen) { panel.style.display = 'none'; return; }

    panel.style.display = 'block';
    panel.innerHTML = '<div style="text-align:center;color:#bbb;"><i class="fas fa-spinner fa-spin"></i> جاري التحميل...</div>';

    try {
        const res = await fetch(`https://healthhub-production-90ef.up.railway.app/doctor/info?doctor_id=${docId}`);
        const info = await res.json();

        let html = '<div style="display:flex;flex-direction:column;gap:10px;">';
        if (info.address) html += `<div style="display:flex;align-items:flex-start;gap:8px;"><i class="fas fa-map-marker-alt" style="color:#e74c3c;margin-top:2px;"></i><div><span style="font-size:11px;color:#999;display:block;">العنوان</span><span style="font-size:13px;color:#2c3e50;">${info.address}</span></div></div>`;
        if (info.university) html += `<div style="display:flex;align-items:flex-start;gap:8px;"><i class="fas fa-university" style="color:#3498db;margin-top:2px;"></i><div><span style="font-size:11px;color:#999;display:block;">درس في</span><span style="font-size:13px;color:#2c3e50;">${info.university}${info.graduation_year ? ' ('+info.graduation_year+')' : ''}</span></div></div>`;
        if (info.experience_years) html += `<div style="display:flex;align-items:flex-start;gap:8px;"><i class="fas fa-briefcase-medical" style="color:#27ae60;margin-top:2px;"></i><div><span style="font-size:11px;color:#999;display:block;">الخبرة</span><span style="font-size:13px;color:#2c3e50;">${info.experience_years} سنة خبرة</span></div></div>`;
        if (info.certificates) html += `<div style="display:flex;align-items:flex-start;gap:8px;"><i class="fas fa-certificate" style="color:#f39c12;margin-top:2px;"></i><div><span style="font-size:11px;color:#999;display:block;">الشهادات</span><span style="font-size:13px;color:#2c3e50;white-space:pre-line;">${info.certificates}</span></div></div>`;
        if (info.about) html += `<div style="background:#f8f9fa;border-radius:8px;padding:10px;font-size:13px;color:#555;line-height:1.8;">${info.about}</div>`;
        
        if (!info.address && !info.university && !info.certificates && !info.about && !info.experience_years) {
            html += '<div style="text-align:center;color:#bbb;padding:10px;font-size:13px;">لم يضف الدكتور معلومات بعد</div>';
        }

        // صور الشهادات (محفوظة في sessionStorage بـ certImages_{docId})
        const savedCerts = sessionStorage.getItem(`certImages_${docId}`);
        if (savedCerts) {
            try {
                const imgs = JSON.parse(savedCerts);
                if (imgs && imgs.length > 0) {
                    html += `<div style="margin-top:4px;">
                        <div style="font-size:11px;color:#999;margin-bottom:6px;"><i class="fas fa-images" style="color:#27ae60;margin-left:4px;"></i>صور الشهادات والمستندات</div>
                        <div style="display:flex;flex-wrap:wrap;gap:8px;">
                            ${imgs.map((img, i) => `<img src="${img}" style="width:70px;height:70px;object-fit:cover;border-radius:8px;border:2px solid #a8e6cf;cursor:pointer;" onclick="openCertViewer('${img.replace(/'/g, "\'")}')">` ).join('')}
                        </div>
                    </div>`;
                }
            } catch(e) {}
        }

        html += '</div>';
        panel.innerHTML = html;
    } catch (err) {
        panel.innerHTML = '<div style="text-align:center;color:#bbb;font-size:13px;">لا توجد معلومات إضافية</div>';
    }
}

function closeDoctorDetail() {
    const modal = document.getElementById('doctor-detail-modal');
    if (modal) modal.classList.add('hidden');
}

// ==========================================
// --- تحاليلي المرسلة وردود الدكتور (المريض) ---
// ==========================================

// دالة تبديل التبويبات بين التحاليل الجديدة والمؤرشفة
function switchLabsTab(tabType) {
    const newList = document.getElementById('patient-labs-list');
    const readList = document.getElementById('patient-labs-read-list');
    const newTab = document.getElementById('labs-new-tab');
    const readTab = document.getElementById('labs-read-tab');
    
    if (tabType === 'new') {
        newList.style.display = 'block';
        readList.style.display = 'none';
        newTab.style.color = '#27ae60';
        newTab.style.borderBottomColor = '#27ae60';
        readTab.style.color = '#999';
        readTab.style.borderBottomColor = 'transparent';
    } else {
        newList.style.display = 'none';
        readList.style.display = 'block';
        newTab.style.color = '#999';
        newTab.style.borderBottomColor = 'transparent';
        readTab.style.color = '#27ae60';
        readTab.style.borderBottomColor = '#27ae60';
    }
}

async function loadPatientLabResults() {
    const patientId = sessionStorage.getItem('userId');
    let container = document.getElementById('patient-labs-list');
    if (!container || !patientId) return;

    container.innerHTML = '<div style="text-align:center;padding:20px;color:#bdc3c7;"><i class="fas fa-spinner fa-spin"></i> جاري التحميل...</div>';

    try {
        const res = await fetch(`https://healthhub-production-90ef.up.railway.app/patient/lab-results/${patientId}`);
        if (!res.ok) throw new Error('فشل');
        const labs = await res.json();

        if (!Array.isArray(labs) || labs.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:30px;color:#bdc3c7;"><i class="fas fa-flask fa-2x" style="margin-bottom:10px;display:block;"></i>لم ترسل أي تحاليل بعد</div>';
            return;
        }

        // فصل التحاليل الجديدة والمؤرشفة
        const newLabs = labs.filter(l => !l.is_read);
        const readLabs = labs.filter(l => l.is_read);
        
        // عرض التحاليل الجديدة
        if (newLabs.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:30px;color:#bdc3c7;"><i class="fas fa-inbox fa-2x" style="margin-bottom:10px;display:block;"></i>لا توجد تحاليل جديدة</div>';
        } else {
            container.innerHTML = newLabs.map(lab => {
            const sentDate = new Date(lab.created_at).toLocaleDateString('ar-EG', { year:'numeric', month:'long', day:'numeric' });
            const docPicHtml = lab.doctor_pic
                ? `<img src="${lab.doctor_pic}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,0.5);">`
                : `<div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;"><i class="fas fa-user-md" style="color:white;font-size:18px;"></i></div>`;

            const contentHtml = lab.lab_type === 'image'
                ? `<img src="${lab.lab_content}" style="max-width:100%;max-height:160px;border-radius:10px;border:1px solid #e0e0e0;margin-top:8px;display:block;">`
                : `<div style="background:#fafafa;border:1px solid #eee;border-radius:8px;padding:10px;margin-top:8px;font-size:13px;color:#444;line-height:1.8;white-space:pre-wrap;">${lab.lab_content}</div>`;

            const replyHtml = lab.doctor_reply
                ? `<div style="margin-top:12px;background:linear-gradient(135deg,#e8f8f0,#f0fdf6);border-right:4px solid #27ae60;border-radius:10px;padding:14px;">
                       <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
                           <i class="fas fa-comment-medical" style="color:#27ae60;font-size:16px;"></i>
                           <span style="font-size:13px;font-weight:bold;color:#27ae60;">رد الدكتور:</span>
                           ${lab.replied_at ? `<span style="font-size:11px;color:#999;margin-right:auto;">${new Date(lab.replied_at).toLocaleString('ar-EG',{dateStyle:'short',timeStyle:'short'})}</span>` : ''}
                       </div>
                       <div style="font-size:14px;color:#1a2940;line-height:1.9;white-space:pre-line;">${lab.doctor_reply}</div>
                   </div>`
                : `<div style="margin-top:10px;background:#fffbf0;border:1px dashed #ffe082;border-radius:8px;padding:10px;text-align:center;">
                       <i class="fas fa-hourglass-half" style="color:#f39c12;"></i>
                       <span style="font-size:12px;color:#888;margin-right:6px;">في انتظار رد الدكتور...</span>
                   </div>`;

            if (lab.is_read) return ''; // لا نعرض المؤرشف في التبويب الرئيسي

            return `
            <div id="lab-card-${lab.id}" style="background:white;border-radius:16px;margin-bottom:16px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,0.07);">
                <!-- هيدر الدكتور -->
                <div style="background:linear-gradient(135deg,#7b2ff7,#6c2fc7);padding:14px 16px;display:flex;align-items:center;gap:12px;">
                    ${docPicHtml}
                    <div style="flex:1;">
                        <div style="color:rgba(255,255,255,0.7);font-size:10px;">أُرسل إلى</div>
                        <div style="color:white;font-size:15px;font-weight:bold;">د. ${lab.doctor_name}</div>
                        ${lab.doctor_specialty ? `<div style="color:rgba(255,255,255,0.7);font-size:12px;">${lab.doctor_specialty}</div>` : ''}
                    </div>
                    <div style="text-align:left;">
                        <div style="color:rgba(255,255,255,0.6);font-size:10px;">بتاريخ</div>
                        <div style="color:white;font-size:12px;font-weight:500;">${sentDate}</div>
                        ${lab.doctor_reply
                            ? '<div style="background:#27ae60;color:white;border-radius:10px;padding:2px 8px;font-size:11px;margin-top:4px;text-align:center;">✓ رُد عليه</div>'
                            : '<div style="background:rgba(255,255,255,0.2);color:white;border-radius:10px;padding:2px 8px;font-size:11px;margin-top:4px;text-align:center;">⏳ قيد المراجعة</div>'
                        }
                        <button onclick="event.stopPropagation(); archiveLab(${lab.id})" title="أرشفة" style="background:rgba(255,255,255,0.2); color:white; border:1px solid rgba(255,255,255,0.3); border-radius:6px; padding:4px 8px; display:flex; align-items:center; justify-content:center; cursor:pointer; margin-top:6px; margin-right:auto; font-size:11px; gap:4px; transition:0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.3)';" onmouseout="this.style.background='rgba(255,255,255,0.2)';">
                            <i class="fas fa-archive" style="font-size:10px;"></i> أرشفة
                        </button>
                    </div>
                </div>
                <!-- محتوى التحليل -->
                <div style="padding:14px 16px;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                        <div style="width:30px;height:30px;border-radius:8px;background:#f3e5f5;display:flex;align-items:center;justify-content:center;">
                            <i class="fas fa-vial" style="color:#9b59b6;font-size:13px;"></i>
                        </div>
                        <span style="font-size:14px;font-weight:bold;color:#1a2940;">${lab.lab_name}</span>
                    </div>
                    ${contentHtml}
                    ${lab.notes ? `<div style="font-size:12px;color:#7f8c8d;margin-top:6px;"><i class="fas fa-sticky-note" style="color:#f39c12;"></i> ${lab.notes}</div>` : ''}
                    ${replyHtml}
                </div>
            </div>`;
            }).join('');
        }
        
        // عرض التحاليل المؤرشفة
        const readContainer = document.getElementById('patient-labs-read-list');
        if (readContainer) {
            if (readLabs.length === 0) {
                readContainer.innerHTML = '<div style="text-align:center;padding:30px;color:#bdc3c7;"><i class="fas fa-archive fa-2x" style="margin-bottom:10px;display:block;"></i>لا توجد تحاليل مؤرشفة</div>';
            } else {
                readContainer.innerHTML = readLabs.map(lab => {
                    const sentDate = new Date(lab.created_at).toLocaleDateString('ar-EG', { year:'numeric', month:'long', day:'numeric' });
                    const docPicHtml = lab.doctor_pic
                        ? `<img src="${lab.doctor_pic}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,0.5);">`
                        : `<div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;"><i class="fas fa-user-md" style="color:white;font-size:18px;"></i></div>`;

                    const contentHtml = lab.lab_type === 'image'
                        ? `<img src="${lab.lab_content}" style="max-width:100%;max-height:160px;border-radius:10px;border:1px solid #e0e0e0;margin-top:8px;display:block;">`
                        : `<div style="background:#fafafa;border:1px solid #eee;border-radius:8px;padding:10px;margin-top:8px;font-size:13px;color:#444;line-height:1.8;white-space:pre-wrap;">${lab.lab_content}</div>`;

                    const replyHtml = lab.doctor_reply
                        ? `<div style="margin-top:12px;background:linear-gradient(135deg,#e8f8f0,#f0fdf6);border-right:4px solid #27ae60;border-radius:10px;padding:14px;">
                               <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
                                   <i class="fas fa-comment-medical" style="color:#27ae60;font-size:16px;"></i>
                                   <span style="font-size:13px;font-weight:bold;color:#27ae60;">رد الدكتور:</span>
                                   ${lab.replied_at ? `<span style="font-size:11px;color:#999;margin-right:auto;">${new Date(lab.replied_at).toLocaleString('ar-EG',{dateStyle:'short',timeStyle:'short'})}</span>` : ''}
                               </div>
                               <div style="font-size:14px;color:#1a2940;line-height:1.9;white-space:pre-line;">${lab.doctor_reply}</div>
                           </div>`
                        : `<div style="margin-top:10px;background:#fffbf0;border:1px dashed #ffe082;border-radius:8px;padding:10px;text-align:center;">
                               <i class="fas fa-hourglass-half" style="color:#f39c12;"></i>
                               <span style="font-size:12px;color:#888;margin-right:6px;">في انتظار رد الدكتور...</span>
                           </div>`;

                    return `
                    <div id="lab-card-${lab.id}" style="background:white;border-radius:16px;margin-bottom:16px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,0.07);opacity:0.7;">
                        <!-- هيدر الدكتور -->
                        <div style="background:linear-gradient(135deg,#7b2ff7,#6c2fc7);padding:14px 16px;display:flex;align-items:center;gap:12px;">
                            ${docPicHtml}
                            <div style="flex:1;">
                                <div style="color:rgba(255,255,255,0.7);font-size:10px;">أُرسل إلى</div>
                                <div style="color:white;font-size:15px;font-weight:bold;">د. ${lab.doctor_name}</div>
                                ${lab.doctor_specialty ? `<div style="color:rgba(255,255,255,0.7);font-size:12px;">${lab.doctor_specialty}</div>` : ''}
                            </div>
                            <div style="text-align:left;">
                                <div style="color:rgba(255,255,255,0.6);font-size:10px;">بتاريخ</div>
                                <div style="color:white;font-size:12px;font-weight:500;">${sentDate}</div>
                                ${lab.doctor_reply
                                    ? '<div style="background:#27ae60;color:white;border-radius:10px;padding:2px 8px;font-size:11px;margin-top:4px;text-align:center;">✓ رُد عليه</div>'
                                    : '<div style="background:rgba(255,255,255,0.2);color:white;border-radius:10px;padding:2px 8px;font-size:11px;margin-top:4px;text-align:center;">⏳ قيد المراجعة</div>'
                                }
                            </div>
                        </div>
                        <!-- محتوى التحليل -->
                        <div style="padding:14px 16px;">
                            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                                <div style="width:30px;height:30px;border-radius:8px;background:#f3e5f5;display:flex;align-items:center;justify-content:center;">
                                    <i class="fas fa-vial" style="color:#9b59b6;font-size:13px;"></i>
                                </div>
                                <span style="font-size:14px;font-weight:bold;color:#1a2940;">${lab.lab_name}</span>
                            </div>
                            ${contentHtml}
                            ${lab.notes ? `<div style="font-size:12px;color:#7f8c8d;margin-top:6px;"><i class="fas fa-sticky-note" style="color:#f39c12;"></i> ${lab.notes}</div>` : ''}
                            ${replyHtml}
                        </div>
                    </div>`;
                }).join('');
            }
        }

    } catch (err) {
        console.warn('تعذر تحميل تحاليل المريض:', err);
        container.innerHTML = '<div style="text-align:center;padding:20px;color:#e74c3c;font-size:13px;">⚠️ تعذر تحميل التحاليل، تأكد من الاتصال بالسيرفر</div>';
    }
}

// ==========================================
// --- Accordion رفع التحاليل ---
// ==========================================
function toggleLabUploadPanel() {
    const panel = document.getElementById('lab-upload-panel');
    const chevron = document.getElementById('lab-upload-chevron');
    if (!panel) return;
    const isOpen = panel.style.display !== 'none';
    panel.style.display = isOpen ? 'none' : 'block';
    if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
    if (!isOpen) fillLabDoctorSelect();
}

function openCertViewer(src) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.87);z-index:99999;display:flex;align-items:center;justify-content:center;cursor:pointer;';
    overlay.innerHTML = `<img src="${src}" style="max-width:92%;max-height:92%;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,0.5);">`;
    overlay.onclick = () => document.body.removeChild(overlay);
    document.body.appendChild(overlay);
}

// ==========================================
// --- popup معلومات الدكتور (أيقونة ℹ️) ---
// ==========================================
async function showDoctorInfoPopup(docId) {
    const doc = doctors.find(d => d.id === docId);
    if (!doc) return;

    // إنشاء الـ overlay
    let overlay = document.getElementById('doc-info-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'doc-info-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.55);z-index:9000;display:flex;align-items:flex-end;justify-content:center;';
        overlay.onclick = (e) => { if (e.target === overlay) closeDoctorInfoPopup(); };
        document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
    <div style="background:white;border-radius:24px 24px 0 0;width:100%;max-width:500px;max-height:85vh;overflow-y:auto;padding-bottom:20px;animation:slideUp 0.3s ease;">
        <div style="background:linear-gradient(135deg,#3498db,#2980b9);padding:24px 20px;border-radius:24px 24px 0 0;text-align:center;position:relative;">
            <button onclick="closeDoctorInfoPopup()" style="position:absolute;top:12px;left:12px;background:rgba(255,255,255,0.2);color:white;border:none;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:16px;">×</button>
            ${doc.profile_pic
                ? `<img src="${doc.profile_pic}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid white;margin-bottom:10px;">`
                : `<div style="width:80px;height:80px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;margin:0 auto 10px;"><i class="fas fa-user-md" style="color:white;font-size:32px;"></i></div>`
            }
            <div style="color:white;font-size:18px;font-weight:bold;">${doc.name}</div>
            <div style="color:rgba(255,255,255,0.85);font-size:13px;margin-top:4px;">${doc.spec}</div>
            <div style="color:#f1c40f;font-size:13px;margin-top:6px;">
                ${doc.rating_count > 0 ? `⭐ ${doc.rating} (${doc.rating_count} تقييم)` : '⭐ لا يوجد تقييم بعد'}
            </div>
        </div>
        <div id="doc-info-popup-body" style="padding:20px;">
            <div style="text-align:center;color:#bbb;padding:20px;"><i class="fas fa-spinner fa-spin fa-2x"></i></div>
        </div>
    </div>`;

    overlay.style.display = 'flex';

    // جلب معلومات الدكتور
    const body = document.getElementById('doc-info-popup-body');
    try {
        const res = await fetch(`https://healthhub-production-90ef.up.railway.app/doctor/info?doctor_id=${docId}`);
        const info = res.ok ? await res.json() : {};

        let html = '<div style="display:flex;flex-direction:column;gap:14px;">';

        // السعر
        html += `<div style="background:#e8f8f0;border-radius:12px;padding:12px 16px;display:flex;align-items:center;gap:10px;">
            <i class="fas fa-money-bill-wave" style="color:#27ae60;font-size:18px;"></i>
            <div><div style="font-size:11px;color:#999;">سعر الكشف</div>
            <div style="font-size:16px;font-weight:bold;color:#27ae60;">${doc.price === 0 ? 'مجاني' : doc.price + ' ج.م'}</div></div>
        </div>`;

        if (info.address) html += `<div style="display:flex;align-items:flex-start;gap:10px;">
            <i class="fas fa-map-marker-alt" style="color:#e74c3c;margin-top:2px;font-size:16px;"></i>
            <div><div style="font-size:11px;color:#999;">عنوان العيادة</div>
            <div style="font-size:14px;color:#2c3e50;">${info.address}</div></div></div>`;

        if (info.university) html += `<div style="display:flex;align-items:flex-start;gap:10px;">
            <i class="fas fa-university" style="color:#3498db;margin-top:2px;font-size:16px;"></i>
            <div><div style="font-size:11px;color:#999;">درس في</div>
            <div style="font-size:14px;color:#2c3e50;">${info.university}${info.graduation_year ? ' — ' + info.graduation_year : ''}</div></div></div>`;

        if (info.experience_years) html += `<div style="display:flex;align-items:flex-start;gap:10px;">
            <i class="fas fa-briefcase-medical" style="color:#9b59b6;margin-top:2px;font-size:16px;"></i>
            <div><div style="font-size:11px;color:#999;">الخبرة</div>
            <div style="font-size:14px;color:#2c3e50;">${info.experience_years} سنة خبرة</div></div></div>`;

        if (info.certificates) html += `<div style="display:flex;align-items:flex-start;gap:10px;">
            <i class="fas fa-certificate" style="color:#f39c12;margin-top:2px;font-size:16px;"></i>
            <div><div style="font-size:11px;color:#999;">الشهادات</div>
            <div style="font-size:14px;color:#2c3e50;white-space:pre-line;">${info.certificates}</div></div></div>`;

        if (info.about) html += `<div style="background:#f8faff;border-radius:10px;padding:12px;">
            <div style="font-size:11px;color:#999;margin-bottom:6px;"><i class="fas fa-info-circle" style="color:#3498db;"></i> نبذة</div>
            <div style="font-size:14px;color:#444;line-height:1.8;">${info.about}</div></div>`;

        // صور الشهادات
        const savedCerts = sessionStorage.getItem(`certImages_${docId}`);
        if (savedCerts) {
            try {
                const imgs = JSON.parse(savedCerts);
                if (imgs && imgs.length > 0) {
                    html += `<div><div style="font-size:12px;color:#999;margin-bottom:8px;"><i class="fas fa-images" style="color:#27ae60;margin-left:4px;"></i>صور الشهادات</div>
                    <div style="display:flex;flex-wrap:wrap;gap:8px;">
                        ${imgs.map(img => `<img src="${img}" style="width:75px;height:75px;object-fit:cover;border-radius:10px;border:2px solid #a8e6cf;cursor:pointer;" onclick="openCertViewer('${img.replace(/'/g,"\\'")}')">`).join('')}
                    </div></div>`;
                }
            } catch(e) {}
        }

        if (!info.address && !info.university && !info.certificates && !info.about && !info.experience_years) {
            html += '<div style="text-align:center;color:#bbb;padding:20px;font-size:14px;"><i class="fas fa-user-md fa-2x" style="margin-bottom:10px;display:block;"></i>لم يضف الدكتور معلومات بعد</div>';
        }

        html += `<button onclick="checkAndBook(${docId}, document.getElementById('book-btn-${docId}') || this); closeDoctorInfoPopup();"
            style="width:100%;padding:13px;background:#3498db;color:white;border:none;border-radius:12px;cursor:pointer;font-size:15px;font-weight:bold;margin-top:4px;">
            <i class="fas fa-calendar-plus"></i> احجز الآن
        </button>`;

        html += '</div>';
        body.innerHTML = html;
    } catch (err) {
        body.innerHTML = '<div style="text-align:center;color:#e74c3c;padding:20px;">تعذر تحميل البيانات</div>';
    }
}

function closeDoctorInfoPopup() {
    const overlay = document.getElementById('doc-info-overlay');
    if (overlay) overlay.style.display = 'none';
}

async function archiveLab(labId) {
    const patientId = sessionStorage.getItem('userId');
    if (!patientId || !labId) return;

    if (!confirm('هل تريد أرشفة هذا التحليل؟ سيختفي من القائمة الرئيسية.')) return;

    try {
        const res = await fetch('https://healthhub-production-90ef.up.railway.app/patient/lab-results/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lab_id: labId, patient_id: parseInt(patientId) })
        });

        if (res.ok) {
            const card = document.getElementById(`lab-card-${labId}`);
            if (card) {
                card.style.opacity = '0';
                card.style.transform = 'translateX(20px)';
                card.style.transition = 'all 0.3s ease';
                setTimeout(() => {
                    card.remove();
                    // إعادة تحميل القائمة للتأكد من تحديث الحالة
                    loadPatientLabResults();
                }, 300);
            }
        } else {
            alert('فشل أرشفة التحليل');
        }
    } catch (err) {
        console.error('خطأ في الأرشفة:', err);
        alert('خطأ في الاتصال بالسيرفر');
    }
}
