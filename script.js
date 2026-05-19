// ==========================================
// --- المتغيرات العامة والحالة ---
// ==========================================
let docMode = 'login';
let patMode = 'login';
let bookingOpen = true; 
let currentFilter = 'الكل';
let certImages = [];
const daysOfWeek = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];

// تحميل البيانات من LocalStorage
let patients = [];

function savePatientsData() {
    localStorage.setItem('healthhub_clinic_patients', JSON.stringify(patients));
}

function isValidNationalID(id) {
    return /^\d{14}$/.test(String(id).trim());
}

// ==========================================
// --- إدارة التبويبات (Tabs) ---
// ==========================================
function switchDocTab(mode) {
    docMode = mode;
    const regFields = document.getElementById('doc-register-fields');
    const confirmGroup = document.getElementById('doc-confirm-group');
    const submitBtn = document.getElementById('doc-submit-btn');
    
    document.getElementById('doc-reg-tab')?.classList.toggle('active', mode === 'register');
    document.getElementById('doc-login-tab')?.classList.toggle('active', mode === 'login');

    if (mode === 'register') {
        regFields?.classList.remove('hidden');
        confirmGroup?.classList.remove('hidden');
        if (submitBtn) submitBtn.textContent = 'إنشاء حساب طبيب';
    } else {
        regFields?.classList.add('hidden');
        confirmGroup?.classList.add('hidden');
        if (submitBtn) submitBtn.textContent = 'تسجيل الدخول';
    }
}

function switchPatTab(mode) {
    patMode = mode;
    const regFields = document.getElementById('pat-register-fields');
    const confirmGroup = document.getElementById('pat-confirm-group');
    const submitBtn = document.getElementById('pat-submit-btn');

    document.getElementById('pat-reg-tab')?.classList.toggle('active', mode === 'register');
    document.getElementById('pat-login-tab')?.classList.toggle('active', mode === 'login');

    if (mode === 'register') {
        regFields?.classList.remove('hidden');
        confirmGroup?.classList.remove('hidden');
        if (submitBtn) submitBtn.textContent = 'إنشاء حساب مريض';
    } else {
        regFields?.classList.add('hidden');
        confirmGroup?.classList.add('hidden');
        if (submitBtn) submitBtn.textContent = 'تسجيل الدخول';
    }
}

// ==========================================
// --- نظام الدخول والأمان ---
// ==========================================

// فورم الطبيب
document.getElementById('doc-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = document.getElementById('doc-nid').value.trim();
    const pass = document.getElementById('doc-password').value.trim();

    if (!isValidNationalID(id)) return alert("الرقم القومي يجب أن يكون 14 رقماً");

    if (docMode === 'register') {
        const name = document.getElementById('doc-name').value.trim();
        const specialty = document.getElementById('doc-specialty').value;
        const confirmPass = document.getElementById('doc-confirm-password').value.trim();

        if (!name || !specialty) return alert("يرجى إكمال كافة البيانات");
        if (pass !== confirmPass) return alert("كلمات السر غير متطابقة!");

        try {
            const response = await fetch('https://healthhub-production-90ef.up.railway.app/auth/register-doctor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, specialty, nationalId: id, password: pass })
            });
            const data = await response.text();
            if (response.ok) {
                alert("تم إنشاء حساب الطبيب بنجاح! يمكنك الآن تسجيل الدخول.");
                switchDocTab('login');
            } else {
                alert(data);
            }
        } catch (err) {
            alert("خطأ في الاتصال بالسيرفر");
        }
    } else {
        try {
            const response = await fetch('https://healthhub-production-90ef.up.railway.app/auth/doctor-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nationalId: id, password: pass })
            });
            const data = await response.json();
            if (data.success) {
                localStorage.setItem('currentDoctorName', data.name);
                localStorage.setItem('currentDoctorId', data.id);
                if (data.specialty) localStorage.setItem('currentDoctorSpecialty', data.specialty);
                showDashboard(data.name);
            } else {
                alert(data.message || "بيانات الدخول غير صحيحة");
            }
        } catch (err) {
            alert("خطأ في الاتصال بالسيرفر");
        }
    }
});

// فورم المريض
document.getElementById('pat-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = document.getElementById('pat-nid').value.trim();
    const pass = document.getElementById('pat-password').value.trim();

    if (!isValidNationalID(id)) return alert("الرقم القومي يجب أن يكون 14 رقماً");

    if (patMode === 'register') {
        const name = document.getElementById('pat-name').value.trim();
        const phone = document.getElementById('pat-phone').value.trim();
        const confirmPass = document.getElementById('pat-confirm-password').value.trim();

        if (!name || !phone) return alert("يرجى إدخال الاسم ورقم الهاتف");
        if (pass !== confirmPass) return alert("كلمات السر غير متطابقة!");

        try {
            const response = await fetch('https://healthhub-production-90ef.up.railway.app/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone, nationalId: id, password: pass })
            });
            const data = await response.text();
            if (response.ok) {
                alert("تم إنشاء حساب المريض بنجاح");
                switchPatTab('login');
            } else {
                alert(data);
            }
        } catch (err) {
            alert("خطأ في الاتصال بالسيرفر");
        }
    } else {
        try {
            const response = await fetch('https://healthhub-production-90ef.up.railway.app/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nationalId: id, password: pass })
            });
            const data = await response.json();
            if (data.message === "success") {
                alert("مرحباً بك يا " + data.user.name);
                localStorage.setItem('userName', data.user.name);
                localStorage.setItem('userId', data.user.id);
                window.location.href = 'patient.html';
            } else {
                alert("الرقم القومي أو كلمة السر غير صحيحة");
            }
        } catch (err) {
            alert("خطأ في الاتصال بالسيرفر");
        }
    }
});

// ==========================================
// --- إعدادات المواعيد والسعر ---
// ==========================================
function generateScheduleInputs() {
    const container = document.getElementById('weekly-schedule-inputs');
    if(!container) return;
    const saved = JSON.parse(localStorage.getItem('weeklySchedule')) || {};
    const savedPrice = localStorage.getItem('clinicPrice') || '';
    
    const priceInput = document.getElementById('clinic-price');
    if (priceInput) priceInput.value = savedPrice;

    let html = "";
    daysOfWeek.forEach(day => {
        const isClosed = saved[day]?.isClosed || false;
        html += `
            <div class="day-row" id="row-${day}" style="display:flex; align-items:center; gap:10px; margin-bottom:8px; padding:8px; border-radius:8px; border: 1px solid #eee; background:${isClosed ? '#fff1f0' : 'white'}">
                <strong style="width:80px">${day}</strong>
                <div id="inputs-${day}" style="display:flex; gap:5px; opacity:${isClosed?0.5:1}; pointer-events:${isClosed?'none':'all'}">
                    <input type="time" id="start-${day}" value="${saved[day]?.start || '09:00'}">
                    <span>إلى</span>
                    <input type="time" id="end-${day}" value="${saved[day]?.end || '17:00'}">
                </div>
                <label style="margin-right:auto;"><input type="checkbox" id="closed-${day}" onchange="toggleDayStatus('${day}')" ${isClosed?'checked':''}> مغلق</label>
            </div>`;
    });
    container.innerHTML = html;
}

async function updateDoctorPrice() {
    const doctorId = localStorage.getItem('currentDoctorId');
    const priceInput = document.getElementById('clinic-price');
    const price = priceInput ? priceInput.value.trim() : "";
    
    if (!price || !doctorId) {
        console.error("بيانات ناقصة:", { doctorId, price });
        return alert("يرجى إدخال السعر أولاً");
    }

    try {
        const response = await fetch('https://healthhub-production-90ef.up.railway.app/doctor/update-price', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                doctorId: parseInt(doctorId), 
                price: parseInt(price) 
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                localStorage.setItem('clinicPrice', price);
                alert("تم تحديث سعر الكشف بنجاح في قاعدة البيانات ✅");
            } else {
                alert("فشل تحديث السعر: " + (data.message || "خطأ غير معروف"));
            }
        } else {
            const errorText = await response.text();
            alert("خطأ من السيرفر: " + errorText);
        }
    } catch (err) {
        console.error("خطأ في الاتصال:", err);
        alert("خطأ في الاتصال بالسيرفر، تأكد من تشغيله على بورت 3000.");
    }
}

function toggleDayStatus(day) {
    const isClosed = document.getElementById(`closed-${day}`).checked;
    const inputs = document.getElementById(`inputs-${day}`);
    const row = document.getElementById(`row-${day}`);
    if (inputs) {
        inputs.style.opacity = isClosed ? 0.5 : 1;
        inputs.style.pointerEvents = isClosed ? 'none' : 'all';
    }
    if (row) row.style.backgroundColor = isClosed ? '#fff1f0' : 'white';
}

async function saveWeeklySchedule() {
    const schedule = {};
    daysOfWeek.forEach(day => {
        schedule[day] = {
            start: document.getElementById(`start-${day}`).value,
            end: document.getElementById(`end-${day}`).value,
            isClosed: document.getElementById(`closed-${day}`).checked
        };
    });
    localStorage.setItem('weeklySchedule', JSON.stringify(schedule));

    try {
        await fetch('https://healthhub-production-90ef.up.railway.app/doctor/booking-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ weeklySchedule: schedule })
        });
    } catch (err) {
        console.warn("تعذر مزامنة الجدول مع السيرفر:", err);
    }
    alert("تم حفظ مواعيد العمل بنجاح!");
}

async function toggleBookingStatus() {
    bookingOpen = !bookingOpen;
    const btn = document.getElementById('toggle-booking-btn');
    const text = document.getElementById('booking-text');
    if(btn) btn.textContent = bookingOpen ? "إيقاف الحجوزات" : "فتح الحجوزات";
    if(btn) btn.className = bookingOpen ? "btn btn-orange" : "btn btn-green";
    if(text) text.innerHTML = `حالة الحجز الآن: ${bookingOpen ? "🟢 مفتوح" : "🔴 مغلق"}`;

    try {
        await fetch('https://healthhub-production-90ef.up.railway.app/doctor/booking-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingOpen })
        });
    } catch (err) {
        console.warn("تعذر مزامنة حالة الحجز مع السيرفر:", err);
    }
}

function toggleScheduleList() {
    const scheduleContainer = document.getElementById('weekly-schedule-inputs');
    const toggleBtn = document.getElementById('toggle-schedule-btn');
    if (scheduleContainer.classList.contains('hidden')) {
        scheduleContainer.classList.remove('hidden');
        toggleBtn.textContent = 'إخفاء القائمة';
    } else {
        scheduleContainer.classList.add('hidden');
        toggleBtn.textContent = 'عرض القائمة';
    }
}
// ==========================================
// --- إدارة لوحة التحكم (المرضى) ---
// ==========================================
async function fetchDoctorPatients() {
    const doctorId = localStorage.getItem('currentDoctorId');
    if (!doctorId) return;

    try {
        const response = await fetch(`https://healthhub-production-90ef.up.railway.app/doctor/patients?doctorId=${doctorId}`);
        if (!response.ok) throw new Error('فشل الاتصال بالسيرفر');
        const data = await response.json();

        // نحتفظ بالمرضى المضافين يدوياً (طوارئ / عادي) اللي مش من DB
        const localOnly = patients.filter(p => p.isLocal === true);

        // نجيب مرضى الحجوزات من DB - نخزن كل البيانات الصحية معاهم
        const dbPatients = data.map(p => ({
            _uid: `appt_${p.appointment_id}`,
            id: p.id,
            appointmentId: p.appointment_id,
            name: p.name,
            phone: p.phone || null,
            age: p.age || null,
            blood_type: p.blood_type || null,
            diseases: p.diseases || null,
            profile_pic: p.profile_pic || null,
            type: p.visit_type === 'متابعة' ? 'متابعة' : 'حجز من التطبيق',
            visit_type: p.visit_type || 'كشف',
            isExamined: p.status === 'examined',
            isLocal: false,
            time: p.appointment_time
        }));

        patients = [...localOnly, ...dbPatients];
        renderPatients();
    } catch (err) {
        console.error("خطأ في جلب مرضى الدكتور:", err);
        renderPatients();
    }
}

function renderPatients() {
    const tbody = document.getElementById('patients-table-body');
    if(!tbody) return;

    const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || "";
    tbody.innerHTML = "";

    const filtered = patients.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm);
        const matchesFilter = (currentFilter === 'الكل') || (p.type === currentFilter);
        return matchesSearch && matchesFilter;
    });

    filtered.forEach((p, i) => {
        const deleteKey = p.appointmentId ? `appt_${p.appointmentId}` : `local_${p.id}`;
        const isFollowUp = p.visit_type === 'متابعة';
        const isEmergency = p.type === 'طوارئ';
        const typeColor = isEmergency ? '#e74c3c' : isFollowUp ? '#8e44ad' : '#28a745';
        const typeLabel = isEmergency ? '🚨 طوارئ' : isFollowUp ? '🔄 متابعة' : '📅 حجز';
        
        // تنسيق التاريخ والوقت
        let appointmentDisplay = "---";
        if (p.time) {
            const dateObj = new Date(p.time);
            const dayName = daysOfWeek[dateObj.getDay()];
            const dateStr = dateObj.toLocaleDateString('ar-EG', { day: 'numeric', month: 'numeric' });
            const timeStr = dateObj.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
            appointmentDisplay = `<div style="font-size:12px; line-height:1.4;">
                <span style="color:#2980b9; font-weight:bold;">${dayName}</span><br>
                <span style="color:#7f8c8d;">${dateStr} | ${timeStr}</span>
            </div>`;
        }

        tbody.innerHTML += `
            <tr class="${isEmergency ? 'emergency-row' : ''}">
                <td>${i+1}</td>
                <td>
                    <div style="display:flex;align-items:center;gap:8px;">
                        ${p.profile_pic ? `<img src="${p.profile_pic}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:2px solid ${typeColor};">` : `<div style="width:32px;height:32px;border-radius:50%;background:#ecf0f1;display:flex;align-items:center;justify-content:center;"><i class="fas fa-user" style="color:#95a5a6;font-size:14px;"></i></div>`}
                        <span>${p.name}</span>
                    </div>
                </td>
                <td><span style="background:${typeColor}22;color:${typeColor};padding:3px 8px;border-radius:10px;font-size:12px;font-weight:600;">${typeLabel}</span></td>
                <td>${appointmentDisplay}</td>
                <td class="actions-cell">
                    ${p.isLocal ? '' : `<button class="action-btn btn-info-patient" onclick="showPatientInfo(${p.id})" title="بيانات المريض" style="background:#e8f4fd; color:#2980b9; border:none; padding:6px 10px; border-radius:6px; cursor:pointer; font-size:13px;"><i class="fas fa-id-card"></i></button>`}
                    <button class="action-btn ${p.isExamined ? 'btn-return' : 'btn-confirm'}" onclick="toggleStatus('${p._uid}')">
                        ${p.isExamined ? 'إعادة للانتظار' : 'إتمام الكشف'}
                    </button>
                    <button class="action-btn btn-rx" onclick="addPrescription(${p.id})">روشتة</button>
                    <button class="action-btn btn-delete" onclick="deletePatient('${deleteKey}', '${p.name}')">حذف</button>
                </td>
            </tr>`;
    });
    document.getElementById('count-waiting').textContent = patients.filter(x => !x.isExamined).length;
    document.getElementById('count-examined').textContent = patients.filter(x => x.isExamined).length;
}

// ==========================================
// --- البحث عن مريض بالاسم من الداتابيز ---
// ==========================================
let searchTimeout = null;

function setupPatientSearch(inputId, resultsId, onSelect) {
    const input = document.getElementById(inputId);
    const results = document.getElementById(resultsId);
    if (!input || !results) return;

    input.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        const val = input.value.trim();
        if (val.length < 2) { results.innerHTML = ''; results.style.display = 'none'; return; }
        searchTimeout = setTimeout(() => searchPatientInDB(val, results, onSelect, input), 350);
    });

    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !results.contains(e.target)) {
            results.style.display = 'none';
        }
    });
}

async function searchPatientInDB(name, resultsEl, onSelect, inputEl) {
    try {
        const res = await fetch(`https://healthhub-production-90ef.up.railway.app/doctor/search-patient?name=${encodeURIComponent(name)}`);
        const data = await res.json();
        if (!data.success || !data.patients.length) {
            resultsEl.innerHTML = `<div style="padding:10px 14px;color:#888;font-size:13px;">لا يوجد مريض بهذا الاسم في قاعدة البيانات</div>`;
            resultsEl.style.display = 'block';
            return;
        }
        resultsEl.innerHTML = data.patients.map(p => `
            <div class="patient-search-item" onclick="selectPatientFromSearch(${p.id}, '${p.name.replace(/'/g,"\\'")}', this.parentElement, arguments[0])"
                 style="padding:10px 14px;cursor:pointer;display:flex;align-items:center;gap:10px;border-bottom:1px solid #f0f0f0;transition:background 0.15s;"
                 onmouseover="this.style.background='#f0f7ff'" onmouseout="this.style.background='white'">
                <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#3498db,#1a73e8);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <i class="fas fa-user" style="color:white;font-size:14px;"></i>
                </div>
                <div>
                    <div style="font-weight:bold;font-size:14px;color:#1a2940;">${p.name}</div>
                    <div style="font-size:11px;color:#888;">${p.phone || 'بدون رقم'} ${p.age ? '| عمر: ' + p.age : ''} ${p.blood_type ? '| فصيلة: ' + p.blood_type : ''}</div>
                </div>
            </div>
        `).join('');
        resultsEl.style.display = 'block';

        // تخزين نتائج البحث للاستخدام عند الاختيار
        resultsEl._searchResults = data.patients;
    } catch (err) {
        resultsEl.innerHTML = `<div style="padding:10px 14px;color:#e74c3c;font-size:13px;">⚠️ خطأ في الاتصال بالسيرفر</div>`;
        resultsEl.style.display = 'block';
    }
}

// عند اختيار مريض من قائمة البحث - نخزنه مؤقتاً
let selectedPatientForEmergency = null;
let selectedPatientForRegular = null;

function selectPatientFromSearch(patientId, patientName, resultsEl, event) {
    if (event) event.stopPropagation();
    const patients_list = resultsEl._searchResults || [];
    const patient = patients_list.find(p => p.id === patientId) || { id: patientId, name: patientName };

    // تحديد أي input هذا (طوارئ أم عادي)
    const emergencyResults = document.getElementById('emergency-search-results');
    if (resultsEl === emergencyResults) {
        selectedPatientForEmergency = patient;
        document.getElementById('emergency-name').value = patientName;
    } else {
        selectedPatientForRegular = patient;
        document.getElementById('regular-name').value = patientName;
    }
    resultsEl.style.display = 'none';
}

async function addEmergencyPatient() {
    const input = document.getElementById('emergency-name');
    const name = input.value.trim();
    if (!name) return alert("ادخل اسم المريض");

    const doctorId = localStorage.getItem('currentDoctorId');

    // لو اختار من الداتابيز
    if (selectedPatientForEmergency && selectedPatientForEmergency.name === name) {
        const patient = selectedPatientForEmergency;
        // نضيف الموعد في DB مع إشعار
        try {
            const res = await fetch('https://healthhub-production-90ef.up.railway.app/doctor/add-appointment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patient_id: patient.id, doctor_id: parseInt(doctorId), type: 'طوارئ' })
            });
            const data = await res.json();
            if (data.success) {
                patients.unshift({
                    _uid: `appt_${data.appointment_id}`,
                    id: patient.id,
                    appointmentId: data.appointment_id,
                    name: patient.name,
                    phone: patient.phone || null,
                    age: patient.age || null,
                    blood_type: patient.blood_type || null,
                    diseases: patient.diseases || null,
                    type: 'طوارئ',
                    isExamined: false,
                    isLocal: false,
                    prescription: ""
                });
                showAddPatientSuccess(`✅ تم إضافة ${patient.name} كطوارئ وإرسال إشعار له`);
            } else {
                alert("❌ فشل إضافة الموعد: " + (data.message || "خطأ"));
            }
        } catch (err) {
            alert("❌ خطأ في الاتصال بالسيرفر");
        }
        input.value = "";
        selectedPatientForEmergency = null;
        renderPatients();
        return;
    }

    // لو كتب اسم بدون اختيار من الداتابيز - يضاف محلياً فقط
    patients.unshift({
        _uid: `local_${Date.now()}`,
        id: Date.now(),
        appointmentId: null,
        name: name,
        type: 'طوارئ',
        isExamined: false,
        isLocal: true,
        prescription: ""
    });
    input.value = "";
    selectedPatientForEmergency = null;
    renderPatients();
}

async function addRegularPatient() {
    const input = document.getElementById('regular-name');
    const name = input.value.trim();
    if (!name) return alert("ادخل اسم المريض");

    const doctorId = localStorage.getItem('currentDoctorId');

    // لو اختار من الداتابيز
    if (selectedPatientForRegular && selectedPatientForRegular.name === name) {
        const patient = selectedPatientForRegular;
        try {
            const res = await fetch('https://healthhub-production-90ef.up.railway.app/doctor/add-appointment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patient_id: patient.id, doctor_id: parseInt(doctorId), type: 'عادي' })
            });
            const data = await res.json();
            if (data.success) {
                patients.push({
                    _uid: `appt_${data.appointment_id}`,
                    id: patient.id,
                    appointmentId: data.appointment_id,
                    name: patient.name,
                    phone: patient.phone || null,
                    age: patient.age || null,
                    blood_type: patient.blood_type || null,
                    diseases: patient.diseases || null,
                    type: 'حجز عادي',
                    isExamined: false,
                    isLocal: false,
                    prescription: ""
                });
                showAddPatientSuccess(`✅ تم إضافة ${patient.name} كحجز عادي وإرسال إشعار له`);
            } else {
                alert("❌ فشل إضافة الموعد: " + (data.message || "خطأ"));
            }
        } catch (err) {
            alert("❌ خطأ في الاتصال بالسيرفر");
        }
        input.value = "";
        selectedPatientForRegular = null;
        renderPatients();
        return;
    }

    // محلي فقط
    patients.push({
        _uid: `local_${Date.now()}`,
        id: Date.now(),
        appointmentId: null,
        name: name,
        type: 'حجز عادي',
        isExamined: false,
        isLocal: true,
        prescription: ""
    });
    input.value = "";
    selectedPatientForRegular = null;
    renderPatients();
}

function showAddPatientSuccess(msg) {
    let toast = document.getElementById('add-patient-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'add-patient-toast';
        toast.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:#1a7a4a;color:white;padding:12px 24px;border-radius:30px;font-size:14px;font-weight:bold;z-index:99999;box-shadow:0 4px 20px rgba(0,0,0,0.2);transition:opacity 0.4s;';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 3000);
}



async function toggleStatus(uid) {
    // البحث بـ _uid الفريد لكل صف (مش patient.id اللي ممكن يتكرر)
    const p = patients.find(x => x._uid === uid);
    if (!p) return;
    
    // تحديث الحالة محلياً
    p.isExamined = !p.isExamined;
    
    // تحديث الحالة في قاعدة البيانات
    if (p.appointmentId) {
        const newStatus = p.isExamined ? 'examined' : 'pending';
        try {
            const response = await fetch('https://healthhub-production-90ef.up.railway.app/doctor/update-appointment-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    appointmentId: p.appointmentId,
                    status: newStatus
                })
            });
            const data = await response.json();
            if (!data.success) {
                console.error('فشل تحديث الحالة:', data.message);
                // إرجاع الحالة للخلف في حالة الفشل
                p.isExamined = !p.isExamined;
            }
        } catch (err) {
            console.error('خطأ في تحديث حالة الموعد:', err);
            // إرجاع الحالة للخلف في حالة الفشل
            p.isExamined = !p.isExamined;
        }
    }
    
    renderPatients();
}

function addPrescription(patientId) {
    const p = patients.find(x => x.id === patientId);
    if (!p) return;

    let modal = document.getElementById('prescription-modal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'prescription-modal';
    modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.55); z-index:99999; display:flex; justify-content:center; align-items:center; backdrop-filter:blur(3px);';

    const doctorName = localStorage.getItem('currentDoctorName') || 'الطبيب';
    const today = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });

    // صورة المريض من الـ patients array (متحدّثة من السيرفر)
    const patientPhotoHtml = p.profile_pic
        ? `<img src="${p.profile_pic}" alt="صورة المريض" style="width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid #3498db;">`
        : `<div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#3498db,#1a73e8);display:flex;align-items:center;justify-content:center;"><i class="fas fa-user" style="color:white;font-size:18px;"></i></div>`;

    modal.innerHTML = `
        <div style="background:#fff;border-radius:20px;width:94%;max-width:580px;box-shadow:0 20px 60px rgba(0,0,0,0.25);direction:rtl;overflow:hidden;font-family:inherit;">

            <!-- هيدر أزرق -->
            <div style="background:linear-gradient(135deg,#1565c0,#0d47a1);padding:20px 24px;display:flex;justify-content:space-between;align-items:center;">
                <div style="display:flex;align-items:center;gap:12px;">
                    <div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;">
                        <i class="fas fa-stethoscope" style="color:white;font-size:18px;"></i>
                    </div>
                    <div>
                        <div style="color:rgba(255,255,255,0.75);font-size:11px;margin-bottom:2px;">روشتة طبية</div>
                        <div style="color:white;font-size:17px;font-weight:bold;">د. ${doctorName}</div>
                    </div>
                </div>
                <div style="text-align:left;">
                    <div style="color:rgba(255,255,255,0.65);font-size:10px;">التاريخ</div>
                    <div style="color:white;font-size:13px;font-weight:500;">${today}</div>
                </div>
            </div>

            <!-- بيانات المريض بصورته -->
            <div style="padding:14px 24px;background:#f0f6ff;border-bottom:1px solid #dce8f8;display:flex;align-items:center;gap:14px;">
                ${patientPhotoHtml}
                <div style="flex:1;">
                    <div style="font-size:10px;color:#7f8c8d;margin-bottom:2px;">المريض</div>
                    <div style="font-size:15px;font-weight:bold;color:#1a2940;">${p.name}</div>
                    ${p.age ? `<div style="font-size:11px;color:#5a7a9a;margin-top:1px;"><i class="fas fa-birthday-cake" style="margin-left:3px;font-size:10px;"></i>${p.age} سنة${p.blood_type ? ' &nbsp;|&nbsp; <i class="fas fa-tint" style="margin-left:3px;font-size:10px;color:#e74c3c;"></i>' + p.blood_type : ''}</div>` : ''}
                </div>
                <span style="font-size:11px;background:${p.type==='طوارئ'?'#fff0f0':'#eaf5ff'};color:${p.type==='طوارئ'?'#e74c3c':'#2980b9'};padding:4px 10px;border-radius:20px;border:1px solid ${p.type==='طوارئ'?'#f5b7b1':'#aed6f1'};">
                    <i class="fas fa-tag" style="margin-left:4px;font-size:10px;"></i>${p.type}
                </span>
            </div>

            <!-- قسم كتابة الروشتة -->
            <div style="padding:18px 24px;">
                <label style="font-size:13px;font-weight:bold;color:#1a2940;display:block;margin-bottom:8px;">
                    <i class="fas fa-file-prescription" style="color:#e74c3c;margin-left:6px;"></i>محتوى الروشتة
                </label>
                <textarea id="rx-textarea" placeholder="مثال:&#10;• باراسيتامول 500mg — ثلاث مرات يومياً بعد الأكل&#10;• أموكسيسيلين 250mg — مرتين يومياً لمدة 7 أيام&#10;• الراحة التامة وشرب السوائل الكافية"
                    style="width:100%;height:150px;border:2px solid #dce8f8;border-radius:12px;padding:14px;font-size:14px;font-family:inherit;resize:vertical;direction:rtl;outline:none;color:#1a2940;line-height:1.9;box-sizing:border-box;transition:border-color 0.2s;"
                    onfocus="this.style.borderColor='#1565c0'"
                    onblur="this.style.borderColor='#dce8f8'">${p.prescription || ''}</textarea>

                <!-- تاقات سريعة -->
                <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;">
                    ${['بعد الأكل','قبل النوم','مرة يومياً','مرتين يومياً','3 مرات يومياً','لمدة 7 أيام','لمدة أسبوعين','راحة تامة'].map(t =>
                        `<span onclick="appendToRx(' ${t}')" style="background:#e3f0ff;color:#1565c0;font-size:11px;padding:4px 11px;border-radius:20px;cursor:pointer;white-space:nowrap;border:1px solid #b3d1f5;">${t}</span>`
                    ).join('')}
                </div>
            </div>

            <!-- أزرار -->
            <div style="padding:14px 24px;background:#f0f6ff;border-top:1px solid #dce8f8;display:flex;gap:10px;justify-content:flex-end;">
                <button onclick="closePrescriptionModal()" style="padding:10px 22px;background:#fee2e2;color:#e74c3c;border:none;border-radius:10px;font-size:14px;cursor:pointer;font-weight:bold;">
                    <i class="fas fa-times" style="margin-left:6px;"></i>إلغاء
                </button>
                <button onclick="sendPrescription(${patientId})" style="padding:10px 26px;background:linear-gradient(135deg,#1565c0,#0d47a1);color:white;border:none;border-radius:10px;font-size:14px;cursor:pointer;font-weight:bold;box-shadow:0 4px 12px rgba(13,71,161,0.3);">
                    <i class="fas fa-paper-plane" style="margin-left:6px;"></i>إرسال الروشتة
                </button>
            </div>
        </div>`;

    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) closePrescriptionModal(); });
    document.getElementById('rx-textarea').focus();
}

function appendToRx(text) {
    const ta = document.getElementById('rx-textarea');
    if (ta) {
        ta.value += text;
        ta.focus();
    }
}

function closePrescriptionModal() {
    const modal = document.getElementById('prescription-modal');
    if (modal) modal.remove();
}

async function sendPrescription(patientId) {
    const p = patients.find(x => x.id === patientId);
    if (!p) return;

    const rx = document.getElementById('rx-textarea')?.value?.trim();
    if (!rx) return showRxError('⚠️ يرجى كتابة الروشتة أولاً');

    const doctorId = localStorage.getItem('currentDoctorId');
    if (!doctorId) return showRxError('لم يتم التعرف على الطبيب، يرجى تسجيل الدخول مجدداً');

    const sendBtn = document.querySelector('#prescription-modal button:last-child');
    if (sendBtn) { sendBtn.disabled = true; sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-left:6px;"></i>جارٍ الإرسال...'; }

    // مريض محلي (طوارئ/عادي يدوي)
    if (p.isLocal) {
        p.prescription = rx;
        closePrescriptionModal();
        showPrescriptionSuccess('تم حفظ الروشتة محلياً ✅');
        return;
    }

    try {
        const response = await fetch('https://healthhub-production-90ef.up.railway.app/doctor/send-prescription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                patient_id: patientId,
                doctor_id: parseInt(doctorId),
                prescription_text: rx
            })
        });
        const data = await response.json();
        if (data.success) {
            p.prescription = rx;
            closePrescriptionModal();
            showPrescriptionSuccess('✅ تم إرسال الروشتة للمريض بنجاح');
        } else {
            showRxError('❌ فشل إرسال الروشتة: ' + (data.message || 'خطأ غير معروف'));
            if (sendBtn) { sendBtn.disabled = false; sendBtn.innerHTML = '<i class="fas fa-paper-plane" style="margin-left:6px;"></i>إرسال الروشتة'; }
        }
    } catch (err) {
        console.error('خطأ في إرسال الروشتة:', err);
        showRxError('خطأ في الاتصال بالسيرفر');
        if (sendBtn) { sendBtn.disabled = false; sendBtn.innerHTML = '<i class="fas fa-paper-plane" style="margin-left:6px;"></i>إرسال الروشتة'; }
    }
}

function showRxError(msg) {
    let err = document.getElementById('rx-error');
    if (!err) {
        err = document.createElement('div');
        err.id = 'rx-error';
        err.style.cssText = 'margin: 0 24px 12px; padding:10px 14px; background:#fff5f5; border:1px solid #fca5a5; border-radius:8px; color:#dc2626; font-size:13px;';
        const modal = document.getElementById('prescription-modal');
        const footer = modal?.querySelector('div:last-child');
        if (footer) modal.querySelector('.flex.gap-10') ? null : footer.before(err);
        else document.getElementById('rx-textarea')?.after(err);
    }
    err.textContent = msg;
}

function showPrescriptionSuccess(msg) {
    let toast = document.getElementById('rx-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'rx-toast';
        toast.style.cssText = 'position:fixed; bottom:30px; left:50%; transform:translateX(-50%); background:#0d47a1; color:#fff; padding:14px 28px; border-radius:12px; font-size:15px; z-index:99999; opacity:0; transition:opacity 0.3s; white-space:nowrap; box-shadow:0 8px 24px rgba(13,71,161,0.35);';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 3500);
}

async function deletePatient(deleteKey, name) {
    if (!confirm(`هل أنت متأكد من حذف المريض "${name}" من القائمة؟`)) return;

    if (deleteKey.startsWith('local_')) {
        // مريض محلي (مضاف يدوياً) - نشيله من الـ array بس
        const localId = parseInt(deleteKey.replace('local_', ''));
        patients = patients.filter(x => x.id !== localId);
        renderPatients();
        return;
    }

    // مريض من DB - نرسل DELETE request بالـ appointmentId
    const appointmentId = deleteKey.replace('appt_', '');
    try {
        const response = await fetch(`https://healthhub-production-90ef.up.railway.app/doctor/appointment/${appointmentId}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        if (data.success) {
            // نشيله من الـ array المحلية بدون ما نعيد جلب كل المرضى
            patients = patients.filter(x => x.appointmentId !== parseInt(appointmentId));
            renderPatients();
        } else {
            alert("❌ فشل حذف المريض: " + (data.message || "خطأ غير معروف"));
        }
    } catch (err) {
        console.error("خطأ في حذف المريض:", err);
        alert("خطأ في الاتصال بالسيرفر");
    }
}

function setFilter(type) {
    currentFilter = type;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        const btnText = btn.textContent.trim();
        btn.classList.toggle('active', btnText === type || (type === 'حجز عادي' && btnText === 'عادي'));
    });
    renderPatients();
}

function filterPatients() {
    renderPatients();
}

function toggleBookingStatus() {
    bookingOpen = !bookingOpen;
    const btn = document.getElementById('toggle-booking-btn');
    const text = document.getElementById('booking-text');
    if(btn) btn.textContent = bookingOpen ? "إيقاف الحجوزات" : "فتح الحجوزات";
    if(btn) btn.className = bookingOpen ? "btn btn-orange" : "btn btn-green";
    if(text) text.innerHTML = `حالة الحجز الآن: ${bookingOpen ? "🟢 مفتوح" : "🔴 مغلق"}`;
}

// ==========================================
// --- السجل وإنهاء اليوم ---
// ==========================================
function confirmEndDay() {
    if(patients.length === 0) return alert("لا يوجد مرضى لليوم!");
    if(confirm("هل تريد إنهاء اليوم وحفظ السجل؟ سيتم مسح قائمة اليوم ونقلها للأرشيف.")) {
        let history = JSON.parse(localStorage.getItem('clinicHistory')) || [];
        history.push({ 
            date: new Date().toLocaleString('ar-EG'), 
            count: patients.length,
            data: [...patients] 
        });
        localStorage.setItem('clinicHistory', JSON.stringify(history));
        patients = []; 
        renderPatients();
        alert("تم أرشفة بيانات اليوم بنجاح.");
    }
}

function showHistory() {
    document.getElementById('doc-dashboard-section').classList.add('hidden');
    document.getElementById('history-section').classList.remove('hidden');
    const content = document.getElementById('history-content');
    let history = JSON.parse(localStorage.getItem('clinicHistory')) || [];
    
    if(history.length === 0) {
        content.innerHTML = "<p style='text-align:center; padding:20px;'>لا يوجد سجلات سابقة بعد.</p>";
        return;
    }

    content.innerHTML = history.reverse().map(h => `
        <div style="border:1px solid #ddd; border-radius:10px; margin-bottom:15px; padding:15px; background:#fff; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <h4 style="color:#17a2b8; margin-top:0;">📅 التاريخ: ${h.date}</h4>
            <p><strong>عدد الحالات:</strong> ${h.count}</p>
            <details>
                <summary style="cursor:pointer; color:#007bff;">عرض قائمة المرضى</summary>
                <ul style="margin-top:10px; padding-right:20px;">
                    ${h.data.map(p => `<li>${p.name} - <small>${p.type}</small> ${p.prescription ? `<br><i style="color:gray;">روشتة: ${p.prescription}</i>` : ''}</li>`).join('')}
                </ul>
            </details>
        </div>
    `).join('');
}

function hideHistory() {
    document.getElementById('history-section').classList.add('hidden');
    document.getElementById('doc-dashboard-section').classList.remove('hidden');
}

// ==========================================
// --- بيانات المريض (للدكتور) ---
// ==========================================
function renderPatientInfoModal(p) {
    const bloodColor = { 'A+':'#e74c3c','A-':'#c0392b','B+':'#e67e22','B-':'#d35400','AB+':'#8e44ad','AB-':'#6c3483','O+':'#27ae60','O-':'#1e8449' };
    const bColor = bloodColor[p.blood_type] || '#3498db';
    const photoHtml = p.profile_pic
        ? `<img src="${p.profile_pic}" alt="صورة المريض" style="width:70px; height:70px; border-radius:50%; object-fit:cover; border:3px solid #3498db; margin-bottom:10px;">`
        : `<div style="width:70px; height:70px; border-radius:50%; background:linear-gradient(135deg,#3498db,#2980b9); display:inline-flex; align-items:center; justify-content:center; margin-bottom:10px;"><i class="fas fa-user" style="color:white; font-size:30px;"></i></div>`;
    return `
        <div style="text-align:center; margin-bottom:20px;">
            ${photoHtml}
            <h3 style="margin:0; color:#2c3e50; font-size:18px;">${p.name || '—'}</h3>
            ${p.phone ? `<p style="color:#7f8c8d; font-size:13px; margin:4px 0;"><i class="fas fa-phone"></i> ${p.phone}</p>` : ''}
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:16px;">
            <div style="background:#f0f4ff; border-radius:10px; padding:12px; text-align:center;">
                <i class="fas fa-birthday-cake" style="color:#3498db; font-size:18px; margin-bottom:6px; display:block;"></i>
                <div style="font-size:11px; color:#7f8c8d; margin-bottom:4px;">العمر</div>
                <div style="font-weight:bold; color:#2c3e50; font-size:16px;">${p.age ? p.age + ' سنة' : '—'}</div>
            </div>
            <div style="background:#fff5f0; border-radius:10px; padding:12px; text-align:center;">
                <i class="fas fa-tint" style="color:${bColor}; font-size:18px; margin-bottom:6px; display:block;"></i>
                <div style="font-size:11px; color:#7f8c8d; margin-bottom:4px;">فصيلة الدم</div>
                <div style="font-weight:bold; color:${bColor}; font-size:16px;">${p.blood_type || '—'}</div>
            </div>
            <div style="background:#f0fff4; border-radius:10px; padding:12px; text-align:center;">
                <i class="fas fa-id-badge" style="color:#27ae60; font-size:18px; margin-bottom:6px; display:block;"></i>
                <div style="font-size:11px; color:#7f8c8d; margin-bottom:4px;">رقم المريض</div>
                <div style="font-weight:bold; color:#27ae60; font-size:14px;">#${p.id}</div>
            </div>
        </div>
        <div style="background:#fefefe; border:1px solid #e9ecef; border-radius:10px; padding:14px;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                <i class="fas fa-heartbeat" style="color:#e74c3c;"></i>
                <span style="font-weight:bold; color:#2c3e50; font-size:14px;">الأمراض المزمنة / الملاحظات</span>
            </div>
            <p style="color:#555; font-size:13px; line-height:1.8; margin:0; white-space:pre-wrap;">${p.diseases || 'لم يتم إدخال بيانات بعد'}</p>
        </div>
        ${(!p.age && !p.blood_type && !p.diseases) ? `
        <div style="margin-top:12px; background:#fffbeb; border:1px solid #fcd34d; border-radius:8px; padding:10px; text-align:center; font-size:12px; color:#92400e;">
            <i class="fas fa-info-circle"></i> المريض لم يكمل بياناته الصحية بعد
        </div>` : ''}
    `;
}

async function showPatientInfo(patientId) {
    let modal = document.getElementById('patient-info-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'patient-info-modal';
        modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:9999; justify-content:center; align-items:center;';
        modal.innerHTML = `
            <div id="patient-info-box" style="background:#fff; border-radius:16px; padding:28px; max-width:420px; width:90%; box-shadow:0 10px 40px rgba(0,0,0,0.2); position:relative; font-family:inherit; direction:rtl;">
                <button onclick="closePatientInfoModal()" style="position:absolute; top:12px; left:12px; background:#fee2e2; color:#ef4444; border:none; border-radius:50%; width:32px; height:32px; cursor:pointer; font-size:16px; display:flex; align-items:center; justify-content:center;">&times;</button>
                <div id="patient-info-content">
                    <div style="text-align:center; padding:30px; color:#bdc3c7;">
                        <i class="fas fa-spinner fa-spin fa-2x"></i>
                        <p style="margin-top:10px;">جاري تحميل بيانات المريض...</p>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) closePatientInfoModal(); });
    }

    modal.style.display = 'flex';

    // اعرض البيانات المخزنة فوراً لو موجودة
    const cachedPatient = patients.find(p => p.id === patientId && !p.isLocal);
    if (cachedPatient) {
        document.getElementById('patient-info-content').innerHTML = renderPatientInfoModal(cachedPatient);
    }

    // جيب أحدث البيانات من السيرفر في الخلفية
    try {
        const res = await fetch(`https://healthhub-production-90ef.up.railway.app/patient/profile/${patientId}`);
        if (!res.ok) throw new Error('فشل جلب البيانات');
        const p = await res.json();

        // تحديث البيانات المخزنة في الـ array
        const idx = patients.findIndex(pt => pt.id === patientId);
        if (idx !== -1) {
            patients[idx] = { ...patients[idx], phone: p.phone, age: p.age, blood_type: p.blood_type, diseases: p.diseases, profile_pic: p.profile_pic || null };
        }

        const contentEl = document.getElementById('patient-info-content');
        if (contentEl) contentEl.innerHTML = renderPatientInfoModal(p);

    } catch (err) {
        if (!cachedPatient) {
            document.getElementById('patient-info-content').innerHTML = `
                <div style="text-align:center; padding:30px; color:#e74c3c;">
                    <i class="fas fa-exclamation-circle fa-2x" style="margin-bottom:10px;"></i>
                    <p>تعذر تحميل بيانات المريض</p>
                    <button onclick="showPatientInfo(${patientId})" style="margin-top:10px; padding:8px 16px; background:#3498db; color:white; border:none; border-radius:8px; cursor:pointer;">إعادة المحاولة</button>
                </div>`;
        }
    }
}


function closePatientInfoModal() {
    const modal = document.getElementById('patient-info-modal');
    if (modal) modal.style.display = 'none';
}


async function showDashboard(name) {
    const displayEl = document.getElementById('doc-name-display');
    if(displayEl) displayEl.textContent = name;

    // عرض التخصص المحفوظ
    const specialty = localStorage.getItem('currentDoctorSpecialty');
    const specEl = document.getElementById('doc-specialty-display');
    if (specEl && specialty) specEl.textContent = specialty;

    // تعبئة حقول التعديل في البروفايل
    const editName = document.getElementById('edit-doctor-name');
    const editSpec = document.getElementById('edit-doctor-specialty');
    if (editName) editName.value = name;
    if (editSpec && specialty) editSpec.value = specialty;

    // تحديث صورة البروفايل في الهيدر
    const profilePreview = document.getElementById('profile-photo-preview');
    const clinicPhoto = document.getElementById('doctor-clinic-photo');
    document.getElementById('doctor-auth-section')?.classList.add('hidden');
    document.getElementById('patient-auth-section')?.classList.add('hidden');
    document.getElementById('doc-dashboard-section')?.classList.remove('hidden');
    loadDoctorPhoto();
    await fetchDoctorPatients();
    setTimeout(loadUnreadLabCount, 500);
}

// ==========================================
// --- صورة الدكتور في لوحة العيادة ---
// ==========================================
async function loadDoctorPhoto() {
    const doctorId = localStorage.getItem('currentDoctorId');
    if (!doctorId) return;
    const imgEl = document.getElementById('doctor-clinic-photo');
    const removeBtn = document.getElementById('remove-doctor-photo-btn');
    const key = `docPhoto_${doctorId}`;

    function setPhoto(src) {
        const all = [
            document.getElementById('doctor-clinic-photo'),
            document.getElementById('profile-photo-preview')
        ];
        all.forEach(el => { if (el) el.src = src; });
    }

    // 1) عرض فوري من localStorage لو موجودة
    const cached = localStorage.getItem(key);
    if (cached) {
        setPhoto(cached);
        if (removeBtn) removeBtn.style.display = 'inline-flex';
    }

    // 2) محاولة جلب أحدث صورة من السيرفر في الخلفية (لو شغال)
    try {
        const res = await fetch(`https://healthhub-production-90ef.up.railway.app/doctor/doctors`);
        if (!res.ok) return;
        const allDocs = await res.json();
        const me = allDocs.find(d => d.id === parseInt(doctorId));
        if (me && me.profile_pic) {
            localStorage.setItem(key, me.profile_pic);
            setPhoto(me.profile_pic);
            if (removeBtn) removeBtn.style.display = 'inline-flex';
        } else if (!cached) {
            setPhoto('https://via.placeholder.com/72');
            if (removeBtn) removeBtn.style.display = 'none';
        }
    } catch (err) {
        console.warn('تعذر جلب صورة الدكتور من السيرفر (محملة من localStorage):', err);
    }
}

function handleDoctorPhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // ضغط الصورة قبل الرفع عشان تعدي حد الـ 10mb
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = async () => {
        // تصغير لأقصى 600px مع الحفاظ على النسبة
        const maxSize = 600;
        let w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) {
            if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
            else       { w = Math.round(w * maxSize / h); h = maxSize; }
        }
        canvas.width = w; canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);

        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        const doctorId = localStorage.getItem('currentDoctorId');
        const key = `docPhoto_${doctorId}`;

        // عرض فوري
        ['doctor-clinic-photo','profile-photo-preview'].forEach(id => {
            const el = document.getElementById(id); if (el) el.src = base64;
        });
        const removeBtn = document.getElementById('remove-doctor-photo-btn');
        if (removeBtn) removeBtn.style.display = 'inline-flex';

        // رفع للسيرفر
        try {
            const resp = await fetch('https://healthhub-production-90ef.up.railway.app/doctor/upload-pic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ doctor_id: parseInt(doctorId), profile_pic: base64 })
            });
            const data = await resp.json();
            if (resp.ok && data.success) {
                // نجح — نحفظ في localStorage
                localStorage.setItem(key, base64);
            } else {
                // فشل — نحذف الـ cache عشان refresh ييجي بالصح من السيرفر
                localStorage.removeItem(key);
                console.warn('فشل حفظ الصورة في السيرفر:', data);
            }
        } catch (err) {
            // السيرفر مش شغال — نحفظ محلياً عشان الصورة تفضل
            localStorage.setItem(key, base64);
            console.warn('السيرفر مش شغال، الصورة محفوظة محلياً:', err);
        }
    };
    img.src = url;
}

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
        const resp = await fetch('https://healthhub-production-90ef.up.railway.app/doctor/upload-pic', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ doctor_id: parseInt(doctorId), profile_pic: null })
        });
        
        const data = await resp.json();
        
        if (resp.ok && data.success) {
            console.log('✅ تم حذف الصورة من السيرفر بنجاح');
            alert('✅ ' + data.message); // إعادة رسالة النجاح بناءً على طلب المستخدم
            
            // تحديث صور الأطباء للمرضى (إذا كانت الدالة موجودة في هذا السياق)
            if (typeof updateDoctorPhotoForPatients === 'function') {
                updateDoctorPhotoForPatients();
            }
            return; // الخروج من الدالة فوراً بعد النجاح لمنع أي كود لاحق من التنفيذ
        } else {
            console.warn('⚠️ فشل حذف الصورة:', data.message);
            alert('⚠️ فشل حذف الصورة: ' + (data.message || 'خطأ غير معروف'));
            
            // إعادة الزر إذا فشل الحذف
            if (removeBtn) removeBtn.style.display = 'inline-flex';
        }
    } catch (err) {
        console.error('❌ خطأ في الاتصال بالسيرفر:', err);
        // تم إزالة التنبيه هنا بناءً على طلب المستخدم لأن الحذف تم محلياً بالفعل
        // alert('❌ خطأ في الاتصال بالسيرفر: ' + err.message);
        
        // إعادة الزر إذا فشل الاتصال
        if (removeBtn) removeBtn.style.display = 'inline-flex';
    }
}


// ==========================================
// --- تعديل ملف الدكتور الشخصي ---
// ==========================================
async function changePassword() {
    const doctorId = localStorage.getItem('currentDoctorId');
    const oldPass = document.getElementById('old-password').value.trim();
    const newPass = document.getElementById('new-password').value.trim();
    const confirmPass = document.getElementById('confirm-new-password').value.trim();
    const msgEl = document.getElementById('change-password-msg');

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
        const res = await fetch('https://healthhub-production-90ef.up.railway.app/doctor/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ doctor_id: parseInt(doctorId), old_password: oldPass, new_password: newPass })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            msgEl.textContent = '✅ تم تغيير كلمة السر بنجاح';
            msgEl.style.color = '#27ae60';
            document.getElementById('old-password').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-new-password').value = '';
            setTimeout(() => { msgEl.textContent = ''; }, 2500);
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
// --- بروفايل الدكتور المنسدل ---
// ==========================================
function toggleDoctorProfile() {
    const panel = document.getElementById('doctor-profile-panel');
    const chevron = document.getElementById('profile-btn-chevron');
    const isOpen = panel.style.display !== 'none';
    panel.style.display = isOpen ? 'none' : 'block';
    if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
    if (!isOpen) switchProfileTab('edit');
}

function switchProfileTab(tab) {
    const editContent = document.getElementById('ptab-edit-content');
    const infoContent = document.getElementById('ptab-info-content');
    const editBtn = document.getElementById('ptab-edit');
    const infoBtn = document.getElementById('ptab-info');
    if (tab === 'edit') {
        editContent.style.display = 'flex';
        infoContent.style.display = 'none';
        editBtn.style.color = '#2980b9';
        editBtn.style.borderBottom = '3px solid #2980b9';
        infoBtn.style.color = '#999';
        infoBtn.style.borderBottom = '3px solid transparent';
    } else {
        editContent.style.display = 'none';
        infoContent.style.display = 'flex';
        infoBtn.style.color = '#27ae60';
        infoBtn.style.borderBottom = '3px solid #27ae60';
        editBtn.style.color = '#999';
        editBtn.style.borderBottom = '3px solid transparent';
        loadPersonalInfo();
    }
}

// دالة قديمة للتوافق
function toggleEditProfile() { toggleDoctorProfile(); }

function toggleDoctorChangePass() {
    const form = document.getElementById('doctor-change-pass-form');
    const chevron = document.getElementById('doctor-pass-chevron');
    const isOpen = form.style.display === 'flex';
    form.style.display = isOpen ? 'none' : 'flex';
    if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
}

async function saveProfileChanges() {
    const doctorId = localStorage.getItem('currentDoctorId');
    const name = document.getElementById('edit-doctor-name').value.trim();
    const specialty = document.getElementById('edit-doctor-specialty').value.trim();
    const msgEl = document.getElementById('edit-profile-msg');

    if (!name || !specialty) { msgEl.textContent = '⚠️ يرجى ملء الاسم والتخصص'; msgEl.style.color = '#e74c3c'; return; }

    try {
        const res = await fetch('https://healthhub-production-90ef.up.railway.app/doctor/update-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ doctor_id: parseInt(doctorId), name, specialty })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            localStorage.setItem('currentDoctorName', name);
            localStorage.setItem('currentDoctorSpecialty', specialty);
            const displayEl = document.getElementById('doc-name-display');
            if (displayEl) displayEl.textContent = name;
            const specEl = document.getElementById('doc-specialty-display');
            if (specEl) specEl.textContent = specialty;
            msgEl.textContent = '✅ تم الحفظ بنجاح';
            msgEl.style.color = '#27ae60';
            setTimeout(() => { msgEl.textContent = ''; toggleDoctorProfile(); }, 1800);
        } else {
            msgEl.textContent = data.message || '❌ فشل الحفظ';
            msgEl.style.color = '#e74c3c';
        }
    } catch {
        // حفظ محلي فقط لو السيرفر مش شغال
        localStorage.setItem('currentDoctorName', name);
        localStorage.setItem('currentDoctorSpecialty', specialty);
        const displayEl = document.getElementById('doc-name-display');
        if (displayEl) displayEl.textContent = name;
        const specEl = document.getElementById('doc-specialty-display');
        if (specEl) specEl.textContent = specialty;
        msgEl.textContent = '✅ تم الحفظ محلياً (السيرفر غير متاح)';
        msgEl.style.color = '#f39c12';
        setTimeout(() => { msgEl.textContent = ''; toggleDoctorProfile(); }, 2000);
    }
}

function goToSection(target) {
    document.getElementById('doctor-auth-section')?.classList.add('hidden');
    document.getElementById('patient-auth-section')?.classList.add('hidden');
    document.getElementById('doc-dashboard-section')?.classList.add('hidden');
    
    if(target === 'doctor') {
        const savedDoc = localStorage.getItem('currentDoctorName');
        if(savedDoc) showDashboard(savedDoc);
        else document.getElementById('doctor-auth-section').classList.remove('hidden');
    } else {
        document.getElementById('patient-auth-section').classList.remove('hidden');
    }
}

function logout() { 
    localStorage.clear(); 
    location.reload(); 
}

// ==========================================
// --- نظام الثيم (الوضع الليلي) ---
// ==========================================
function initTheme() {
    const themeBtn = document.getElementById('theme-toggle');
    const body = document.body;
    
    if (localStorage.getItem('theme') === 'dark') {
        body.classList.add('dark-theme');
        if (themeBtn) themeBtn.innerHTML = '<i class="fas fa-sun"></i>';
    }

    if (themeBtn) {
        themeBtn.onclick = () => {
            body.classList.toggle('dark-theme');
            const isDark = body.classList.contains('dark-theme');
            themeBtn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        };
    }
}

// التشغيل الابتدائي
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    const docName = localStorage.getItem('currentDoctorName');
    const docId   = localStorage.getItem('currentDoctorId');
    if(false && docName) {
        // جلب أحدث بيانات الدكتور (الاسم والتخصص) من السيرفر في الخلفية
        if (docId) {
            fetch('https://healthhub-production-90ef.up.railway.app/doctor/doctors').then(r => r.json()).then(all => {
                const me = all.find(d => d.id === parseInt(docId));
                if (me) {
                    localStorage.setItem('currentDoctorName', me.name);
                    if (me.specialty) localStorage.setItem('currentDoctorSpecialty', me.specialty);
                }
            }).catch(() => {});
        }
        showDashboard(docName);
    }
    if (document.getElementById('weekly-schedule-inputs')) {
        generateScheduleInputs();
    }

    // تفعيل البحث التلقائي عن المرضى في حقلَي الإضافة
    setupPatientSearch('emergency-name', 'emergency-search-results', (p) => {
        selectedPatientForEmergency = p;
    });
    setupPatientSearch('regular-name', 'regular-search-results', (p) => {
        selectedPatientForRegular = p;
    });
});

// ==========================================
// --- معلوماتي الشخصية (الدكتور) ---
// ==========================================
function togglePersonalInfo() {
    const form = document.getElementById('personal-info-form');
    const chevron = document.getElementById('personal-info-chevron');
    const isOpen = form.style.display !== 'none';
    form.style.display = isOpen ? 'none' : 'block';
    if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
    if (!isOpen) loadPersonalInfo();
}

async function loadPersonalInfo() {
    const doctorId = localStorage.getItem('currentDoctorId');
    if (!doctorId) return;
    // تحميل صور الشهادات
    loadCertImages();
    try {
        const res = await fetch(`https://healthhub-production-90ef.up.railway.app/doctor/info?doctor_id=${doctorId}`);
        if (!res.ok) {
            // fallback محلي
            const saved = localStorage.getItem('doctorPersonalInfo');
            if (saved) {
                const d = JSON.parse(saved);
                document.getElementById('doc-address').value = d.address || '';
                document.getElementById('doc-university').value = d.university || '';
                document.getElementById('doc-grad-year').value = d.graduation_year || '';
                document.getElementById('doc-experience').value = d.experience_years || '';
                document.getElementById('doc-certificates').value = d.certificates || '';
                document.getElementById('doc-about').value = d.about || '';
            }
            return;
        }
        const data = await res.json();
        document.getElementById('doc-address').value = data.address || '';
        document.getElementById('doc-university').value = data.university || '';
        document.getElementById('doc-grad-year').value = data.graduation_year || '';
        document.getElementById('doc-experience').value = data.experience_years || '';
        document.getElementById('doc-certificates').value = data.certificates || '';
        document.getElementById('doc-about').value = data.about || '';
    } catch (err) { console.warn('تعذر تحميل المعلومات الشخصية:', err); }
}

async function savePersonalInfo() {
    const doctorId = localStorage.getItem('currentDoctorId');
    const msgEl = document.getElementById('personal-info-msg');
    if (!doctorId) { msgEl.textContent = '⚠️ يرجى تسجيل الدخول أولاً'; return; }
    const payload = {
        doctor_id: parseInt(doctorId),
        address: document.getElementById('doc-address').value.trim(),
        university: document.getElementById('doc-university').value.trim(),
        graduation_year: document.getElementById('doc-grad-year').value.trim(),
        experience_years: parseInt(document.getElementById('doc-experience').value) || null,
        certificates: document.getElementById('doc-certificates').value.trim(),
        about: document.getElementById('doc-about').value.trim()
    };
    // حفظ صور الشهادات محلياً (حتى لو فضت فاضية عشان الحذف يتحفظ)
    localStorage.setItem(`certImages_${doctorId}`, JSON.stringify(certImages));
    try {
        const res = await fetch('https://healthhub-production-90ef.up.railway.app/doctor/info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
            msgEl.textContent = '✅ تم الحفظ بنجاح';
            msgEl.style.color = '#27ae60';
            setTimeout(() => { msgEl.textContent = ''; }, 2500);
        } else {
            localStorage.setItem('doctorPersonalInfo', JSON.stringify(payload));
            msgEl.textContent = '✅ تم الحفظ محلياً';
            msgEl.style.color = '#f39c12';
            setTimeout(() => { msgEl.textContent = ''; }, 2500);
        }
    } catch {
        localStorage.setItem('doctorPersonalInfo', JSON.stringify(payload));
        msgEl.textContent = '✅ تم الحفظ محلياً';
        msgEl.style.color = '#f39c12';
        setTimeout(() => { msgEl.textContent = ''; }, 2500);
    }
}

// ==========================================
// --- إشعارات الدكتور (التحاليل الواصلة) ---
// ==========================================
let doctorLabsLoaded = false;
let currentNotificationTab = 'new';

function toggleDoctorNotifications() {
    const list = document.getElementById('doctor-notif-list');
    const chevron = document.getElementById('doctor-notif-chevron');
    const isOpen = list.style.display !== 'none';
    list.style.display = isOpen ? 'none' : 'block';
    if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
    if (!isOpen && !doctorLabsLoaded) {
        doctorLabsLoaded = true;
        loadDoctorLabResults();
    }
}

function switchNotificationTab(tab) {
    currentNotificationTab = tab;
    const newList = document.getElementById('doctor-notif-list-new');
    const readList = document.getElementById('doctor-notif-list-read');
    const newTab = document.getElementById('notif-tab-new');
    const readTab = document.getElementById('notif-tab-read');
    
    if (tab === 'new') {
        newList.style.display = 'block';
        readList.style.display = 'none';
        newTab.style.color = '#a06800';
        newTab.style.borderBottomColor = '#a06800';
        readTab.style.color = '#999';
        readTab.style.borderBottomColor = 'transparent';
    } else {
        newList.style.display = 'none';
        readList.style.display = 'block';
        newTab.style.color = '#999';
        newTab.style.borderBottomColor = 'transparent';
        readTab.style.color = '#a06800';
        readTab.style.borderBottomColor = '#a06800';
    }
}

async function loadDoctorLabResults() {
    const doctorId = localStorage.getItem('currentDoctorId');
    const newList = document.getElementById('doctor-notif-list-new');
    const readList = document.getElementById('doctor-notif-list-read');
    const badge = document.getElementById('notif-badge');
    if (!doctorId || !newList || !readList) return;

    newList.innerHTML = '<div style="text-align:center; padding:20px; color:#bbb;"><i class="fas fa-spinner fa-spin"></i> جاري التحميل...</div>';
    readList.innerHTML = '<div style="text-align:center; padding:20px; color:#bbb;"><i class="fas fa-spinner fa-spin"></i> جاري التحميل...</div>';

    try {
        const res = await fetch(`https://healthhub-production-90ef.up.railway.app/doctor/lab-results?doctor_id=${doctorId}`);
        const labs = await res.json();

        if (!Array.isArray(labs) || labs.length === 0) {
            newList.innerHTML = '<div style="text-align:center; padding:20px; color:#bbb;"><i class="fas fa-check-circle" style="color:#2ecc71;font-size:28px;"></i><p style="margin-top:8px;">لا توجد تحاليل جديدة</p></div>';
            readList.innerHTML = '<div style="text-align:center; padding:20px; color:#bbb;"><i class="fas fa-envelope-open-text" style="color:#2ecc71;font-size:28px;"></i><p style="margin-top:8px;">لا توجد رسائل مقروءة</p></div>';
            return;
        }

        // فصل الرسائل الجديدة والمقروءة
        const unreadLabs = labs.filter(l => !l.is_read);
        const readLabs = labs.filter(l => l.is_read);
        
        const unread = unreadLabs.length;
        if (unread > 0) {
            badge.textContent = unread;
            badge.style.display = 'inline-flex';
        } else {
            badge.style.display = 'none';
        }

        // عرض الرسائل الجديدة
        if (unreadLabs.length === 0) {
            newList.innerHTML = '<div style="text-align:center; padding:20px; color:#bbb;"><i class="fas fa-check-circle" style="color:#2ecc71;font-size:28px;"></i><p style="margin-top:8px;">لا توجد رسائل جديدة</p></div>';
        } else {
            newList.innerHTML = unreadLabs.map(lab => renderLabCard(lab)).join('');
        }

        // عرض الرسائل المقروءة
        if (readLabs.length === 0) {
            readList.innerHTML = '<div style="text-align:center; padding:20px; color:#bbb;"><i class="fas fa-envelope-open-text" style="color:#2ecc71;font-size:28px;"></i><p style="margin-top:8px;">لا توجد رسائل مقروءة</p></div>';
        } else {
            readList.innerHTML = readLabs.map(lab => renderLabCard(lab)).join('');
        }

    } catch (err) {
        console.warn('تعذر تحميل التحاليل:', err);
        newList.innerHTML = '<div style="text-align:center;padding:20px;color:#e74c3c;">⚠️ تعذر تحميل التحاليل، تأكد من تشغيل السيرفر</div>';
        readList.innerHTML = '<div style="text-align:center;padding:20px;color:#e74c3c;">⚠️ تعذر تحميل التحاليل، تأكد من تشغيل السيرفر</div>';
    }
}

function renderLabCard(lab) {
    const isRead = lab.is_read;
    const timeStr = new Date(lab.created_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
    const patPic = lab.patient_pic
        ? `<img src="${lab.patient_pic}" style="width:50px;height:50px;border-radius:50%;object-fit:cover;border:2px solid #f6c90e;">`
        : `<div style="width:50px;height:50px;border-radius:50%;background:#e0e0e0;display:flex;align-items:center;justify-content:center;"><i class="fas fa-user" style="color:#999;font-size:20px;"></i></div>`;

    const contentHtml = lab.lab_type === 'image'
        ? `<div style="margin-top:8px;"><img src="${lab.lab_content}" style="max-width:100%;max-height:180px;border-radius:10px;border:1px solid #eee;" onclick="this.style.maxHeight=this.style.maxHeight==='none'?'180px':'none'" title="اضغط للتكبير"></div>`
        : `<div style="background:#fffde7;border:1px solid #fff9c4;border-radius:8px;padding:10px;margin-top:8px;font-size:13px;line-height:1.8;white-space:pre-wrap;">${lab.lab_content}</div>`;

    return `
    <div id="lab-card-${lab.id}" style="background:${isRead ? '#fff' : '#fffbf0'}; border:1px solid ${isRead ? '#eee' : '#ffe082'}; border-radius:12px; padding:14px; margin-bottom:12px; transition:background 0.3s;">
        ${!isRead ? '<div style="display:flex;align-items:center;gap:5px;margin-bottom:6px;"><span style="width:8px;height:8px;background:#e74c3c;border-radius:50%;display:inline-block;"></span><span style="font-size:11px;color:#e74c3c;font-weight:bold;">جديد</span></div>' : ''}
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
            ${patPic}
            <div style="flex:1;">
                <div style="font-weight:bold;font-size:15px;color:#1a2940;">${lab.patient_name}</div>
                <div style="font-size:12px;color:#777;">${lab.phone || ''} ${lab.age ? '| العمر: '+lab.age : ''} ${lab.blood_type ? '| فصيلة: '+lab.blood_type : ''}</div>
                ${lab.diseases ? `<div style="font-size:12px;color:#e74c3c;">أمراض مزمنة: ${lab.diseases}</div>` : ''}
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
                <div style="font-size:11px;color:#999;text-align:left;">${timeStr}</div>
                <button onclick="event.stopPropagation(); archiveLabDoctor(${lab.id})" title="أرشفة" style="background:rgba(52,152,219,0.1); color:#3498db; border:1px solid #3498db; border-radius:6px; padding:4px 8px; cursor:pointer; font-size:11px; display:flex;align-items:center;gap:4px;transition:0.3s;" onmouseover="this.style.background='#3498db';this.style.color='white';" onmouseout="this.style.background='rgba(52,152,219,0.1)';this.style.color='#3498db';">
                    <i class="fas fa-archive" style="font-size:10px;"></i> أرشفة
                </button>
            </div>
        </div>
        <div style="background:#f8f9fa;border-radius:8px;padding:10px;">
            <div style="font-size:13px;font-weight:600;color:#2c3e50;margin-bottom:4px;"><i class="fas fa-vial" style="color:#9b59b6;margin-left:5px;"></i> ${lab.lab_name}</div>
            ${contentHtml}
            ${lab.notes ? `<div style="font-size:12px;color:#7f8c8d;margin-top:6px;"><i class="fas fa-sticky-note"></i> ${lab.notes}</div>` : ''}
        </div>

        <!-- قسم الرد على التحليل -->
        <div style="margin-top:10px;">
            ${lab.doctor_reply
                ? `<div style="background:#e8f8f0;border-right:3px solid #27ae60;border-radius:8px;padding:10px;margin-bottom:8px;">
                       <div style="font-size:11px;color:#27ae60;font-weight:bold;margin-bottom:4px;"><i class="fas fa-check-circle"></i> ردك على هذا التحليل:</div>
                       <div style="font-size:13px;color:#1a2940;white-space:pre-line;">${lab.doctor_reply}</div>
                       <div style="font-size:11px;color:#999;margin-top:4px;">${lab.replied_at ? new Date(lab.replied_at).toLocaleString('ar-EG',{dateStyle:'short',timeStyle:'short'}) : ''}</div>
                   </div>`
                : ''
            }
            <div id="reply-form-${lab.id}" style="display:none;">
                <textarea id="reply-text-${lab.id}" rows="3" placeholder="اكتب ردك على التحليل هنا..."
                    style="width:100%;box-sizing:border-box;padding:9px 12px;border:1px solid #b2dfdb;border-radius:8px;font-size:13px;resize:vertical;margin-bottom:6px;"></textarea>
                <div style="display:flex;gap:8px;">
                    <button onclick="submitLabReply(${lab.id})" id="reply-submit-${lab.id}"
                        style="flex:1;padding:8px;background:#27ae60;color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;">
                        <i class="fas fa-paper-plane"></i> إرسال الرد
                    </button>
                    <button onclick="toggleReplyForm(${lab.id})"
                        style="padding:8px 12px;background:#ecf0f1;color:#666;border:none;border-radius:8px;cursor:pointer;font-size:13px;">
                        إلغاء
                    </button>
                </div>
                <p id="reply-msg-${lab.id}" style="font-size:12px;margin:4px 0 0;text-align:center;"></p>
            </div>
            <button onclick="toggleReplyForm(${lab.id})" id="reply-btn-${lab.id}"
                style="width:100%;padding:8px;background:${lab.doctor_reply ? '#f0f4f8' : '#e8f4fd'};color:${lab.doctor_reply ? '#7f8c8d' : '#2980b9'};border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;margin-top:4px;">
                <i class="fas fa-reply"></i> ${lab.doctor_reply ? 'تعديل الرد' : 'رد على التحليل'}
            </button>
        </div>
    </div>`;
}

async function markLabRead(labId, el) {
    const doctorId = localStorage.getItem('currentDoctorId');
    if (!doctorId) return;
    el.style.background = '#fff';
    el.style.borderColor = '#eee';
    const newDot = el.querySelector('div[style*="border-radius:50%"]');
    if (newDot) newDot.closest('div').remove();
    try {
        await fetch('https://healthhub-production-90ef.up.railway.app/doctor/lab-read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lab_id: labId, doctor_id: parseInt(doctorId) })
        });
        // تحديث الـ badge
        const badge = document.getElementById('notif-badge');
        const current = parseInt(badge.textContent) || 0;
        if (current > 1) { badge.textContent = current - 1; }
        else { badge.style.display = 'none'; }
        
        // نقل العنصر من قائمة الجديدة إلى المقروءة
        setTimeout(() => {
            loadDoctorLabResults();
        }, 300);
    } catch (err) { /* تجاهل */ }
}

// تحميل عدد الإشعارات غير المقروءة عند الدخول
async function loadUnreadLabCount() {
    const doctorId = localStorage.getItem('currentDoctorId');
    if (!doctorId) return;
    try {
        const res = await fetch(`https://healthhub-production-90ef.up.railway.app/doctor/lab-results?doctor_id=${doctorId}`);
        const labs = await res.json();
        const badge = document.getElementById('notif-badge');
        if (!badge || !Array.isArray(labs)) return;
        const unread = labs.filter(l => !l.is_read).length;
        if (unread > 0) { badge.textContent = unread; badge.style.display = 'inline-flex'; }
    } catch (err) {}
}

// ==========================================
// --- رد الدكتور على التحاليل ---
// ==========================================
function toggleReplyForm(labId) {
    const form = document.getElementById(`reply-form-${labId}`);
    const btn  = document.getElementById(`reply-btn-${labId}`);
    if (!form) return;
    const isOpen = form.style.display !== 'none';
    form.style.display = isOpen ? 'none' : 'block';
    if (btn) btn.style.display = isOpen ? 'block' : 'none';
}

async function submitLabReply(labId) {
    const doctorId = localStorage.getItem('currentDoctorId');
    const replyText = document.getElementById(`reply-text-${labId}`)?.value.trim();
    const msgEl = document.getElementById(`reply-msg-${labId}`);
    const submitBtn = document.getElementById(`reply-submit-${labId}`);

    if (!replyText) { msgEl.textContent = '⚠️ اكتب الرد أولاً'; msgEl.style.color = '#e74c3c'; return; }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';

    try {
        const res = await fetch('https://healthhub-production-90ef.up.railway.app/doctor/lab-reply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lab_id: labId, doctor_id: parseInt(doctorId), reply_text: replyText })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            msgEl.textContent = '✅ تم إرسال الرد للمريض';
            msgEl.style.color = '#27ae60';
            // تحديث الكارد بدون ريلود كامل
            const card = document.getElementById(`lab-card-${labId}`);
            if (card) {
                // إضافة/تحديث قسم الرد المرئي
                let replyDisplay = card.querySelector(`#reply-display-${labId}`);
                const now = new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
                const replyHtml = `<div id="reply-display-${labId}" style="background:#e8f8f0;border-right:3px solid #27ae60;border-radius:8px;padding:10px;margin-bottom:8px;">
                    <div style="font-size:11px;color:#27ae60;font-weight:bold;margin-bottom:4px;"><i class="fas fa-check-circle"></i> ردك على هذا التحليل:</div>
                    <div style="font-size:13px;color:#1a2940;white-space:pre-line;">${replyText}</div>
                    <div style="font-size:11px;color:#999;margin-top:4px;">${now}</div>
                </div>`;
                const form = document.getElementById(`reply-form-${labId}`);
                if (!replyDisplay && form) form.insertAdjacentHTML('beforebegin', replyHtml);
                else if (replyDisplay) replyDisplay.innerHTML = `<div style="font-size:11px;color:#27ae60;font-weight:bold;margin-bottom:4px;"><i class="fas fa-check-circle"></i> ردك على هذا التحليل:</div><div style="font-size:13px;color:#1a2940;white-space:pre-line;">${replyText}</div><div style="font-size:11px;color:#999;margin-top:4px;">${now}</div>`;
            }
            setTimeout(() => { toggleReplyForm(labId); msgEl.textContent = ''; }, 1500);
        } else {
            msgEl.textContent = '❌ ' + (data.message || 'فشل الإرسال');
            msgEl.style.color = '#e74c3c';
        }
    } catch {
        msgEl.textContent = '⚠️ تعذر الاتصال بالسيرفر';
        msgEl.style.color = '#f39c12';
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال الرد';
    }
}

function addCertImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
        const maxSize = 1200;
        let w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) {
            if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
            else       { w = Math.round(w * maxSize / h); h = maxSize; }
        }
        canvas.width = w; canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        const base64 = canvas.toDataURL('image/jpeg', 0.85);
        certImages.push(base64);
        renderCertImages();
        // reset input
        document.getElementById('cert-image-input').value = '';
    };
    img.src = url;
}

function renderCertImages() {
    const grid = document.getElementById('cert-images-grid');
    if (!grid) return;
    grid.innerHTML = certImages.map((img, idx) => `
        <div style="position:relative; width:85px; height:85px; flex-shrink:0;">
            <img src="${img}" style="width:85px; height:85px; object-fit:cover; border-radius:10px; border:2px solid #6fcf97; cursor:pointer; display:block;"
                 onclick="viewCertImage(${idx})" title="اضغط للتكبير">
            <button onclick="removeCertImage(${idx})"
                title="حذف الصورة"
                style="position:absolute; top:-8px; left:-8px; background:#e74c3c; color:white; border:2px solid white; border-radius:50%; width:26px; height:26px; font-size:15px; font-weight:bold; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0; line-height:1; box-shadow:0 2px 6px rgba(0,0,0,0.25); z-index:2;">
                &times;
            </button>
        </div>
    `).join('');
}

function removeCertImage(idx) {
    certImages.splice(idx, 1);
    renderCertImages();
    // احفظ فوراً في localStorage عشان الحذف يتحفظ حتى لو الصفحة اتعملت refresh
    const doctorId = localStorage.getItem('currentDoctorId');
    if (doctorId) {
        localStorage.setItem(`certImages_${doctorId}`, JSON.stringify(certImages));
    }
}

function viewCertImage(idx) {
    // فتح الصورة في نافذة صغيرة
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:99999;display:flex;align-items:center;justify-content:center;cursor:pointer;';
    overlay.innerHTML = `<img src="${certImages[idx]}" style="max-width:90%;max-height:90%;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,0.5);">`;
    overlay.onclick = () => document.body.removeChild(overlay);
    document.body.appendChild(overlay);
}

// تحميل صور الشهادات المحفوظة
function loadCertImages() {
    const doctorId = localStorage.getItem('currentDoctorId');
    if (!doctorId) return;
    const saved = localStorage.getItem(`certImages_${doctorId}`);
    if (saved) {
        try { certImages = JSON.parse(saved); renderCertImages(); } catch(e) {}
    }
}


// ===== دالة أرشفة التحليل (نقل من الجديد إلى المقروء) =====
async function archiveLabDoctor(labId) {
    const doctorId = localStorage.getItem('currentDoctorId');
    if (!doctorId || !labId) return;

    try {
        const res = await fetch('https://healthhub-production-90ef.up.railway.app/doctor/lab-read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lab_id: labId, doctor_id: parseInt(doctorId) })
        });

        if (res.ok) {
            // إزالة الـ card من الواجهة
            const card = document.getElementById(`lab-card-${labId}`);
            if (card) {
                card.style.opacity = '0.5';
                setTimeout(() => {
                    card.remove();
                    // إعادة تحميل التحاليل
                    loadDoctorLabResults();
                }, 300);
            }
        } else {
            alert('فشل أرشفة التحليل');
        }
    } catch (err) {
        console.error('خطأ في أرشفة التحليل:', err);
        alert('حدث خطأ في الاتصال بالسيرفر');
    }
}


// ==========================================
// --- نظام الأدمن ---
// ==========================================

// معالج نموذج دخول الأدمن
document.getElementById('admin-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = document.getElementById('admin-username').value.trim();
    const password = document.getElementById('admin-password').value.trim();
    const errorMsg = document.getElementById('admin-error-msg');

    if (!username || !password) {
        errorMsg.textContent = 'يرجى إدخال اسم المستخدم وكلمة السر';
        return;
    }

    try {
        const response = await fetch('https://healthhub-production-90ef.up.railway.app/auth/admin-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();

        if (data.success) {
            localStorage.setItem('adminLoggedIn', 'true');
            localStorage.setItem('adminUsername', username);
            showAdminDashboard();
        } else {
            errorMsg.textContent = data.message || 'بيانات الدخول غير صحيحة';
        }
    } catch (err) {
        console.error('خطأ:', err);
        errorMsg.textContent = 'خطأ في الاتصال بالسيرفر';
    }
});

// عرض لوحة تحكم الأدمن
async function showAdminDashboard() {
    document.getElementById('admin-auth-section').classList.add('hidden');
    document.getElementById('admin-dashboard-section').classList.remove('hidden');
    
    // تحميل البيانات
    await loadAdminDoctors();
    await loadAdminPatients();
    await loadAdminAppointments();
}

// تحميل قائمة الأطباء للأدمن
async function loadAdminDoctors() {
    try {
        const response = await fetch('https://healthhub-production-90ef.up.railway.app/doctor/doctors');
        const doctors = await response.json();
        
        const doctorsList = document.getElementById('doctors-list');
        doctorsList.innerHTML = '';

        doctors.forEach(doctor => {
            const card = document.createElement('div');
            card.style.cssText = `
                background: white;
                border: 1px solid #ddd;
                border-radius: 12px;
                padding: 15px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                transition: all 0.3s;
            `;
            card.onmouseover = () => card.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
            card.onmouseout = () => card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';

            const photo = doctor.profile_pic || 'https://via.placeholder.com/80';
            card.innerHTML = `
                <div style="text-align: center; margin-bottom: 12px;">
                    <img src="${photo}" alt="${doctor.name}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid #3498db;">
                </div>
                <h4 style="margin: 10px 0; text-align: center;">${doctor.name}</h4>
                <p style="color: #666; text-align: center; margin: 5px 0;"><i class="fas fa-stethoscope"></i> ${doctor.specialty}</p>
                <p style="color: #999; text-align: center; margin: 5px 0; font-size: 12px;">الرقم القومي: ${doctor.nationalId || 'N/A'}</p>
                <p style="color: #999; text-align: center; margin: 5px 0; font-size: 12px;">الهاتف: ${doctor.phone || 'N/A'}</p>
                <div style="display: flex; gap: 8px; margin-top: 12px;">
                    <button onclick="editDoctor(${doctor.id})" style="flex: 1; padding: 8px; background: #3498db; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-edit"></i> تعديل
                    </button>
                    <button onclick="deleteDoctor(${doctor.id})" style="flex: 1; padding: 8px; background: #e74c3c; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                </div>
            `;
            doctorsList.appendChild(card);
        });
    } catch (err) {
        console.error('خطأ في تحميل الأطباء:', err);
    }
}

// تحميل قائمة المرضى للأدمن
async function loadAdminPatients() {
    try {
        const response = await fetch('https://healthhub-production-90ef.up.railway.app/admin/patients');
        const patients = await response.json();
        
        const patientsList = document.getElementById('patients-list');
        patientsList.innerHTML = '';

        patients.forEach(patient => {
            const card = document.createElement('div');
            card.style.cssText = `
                background: white;
                border: 1px solid #ddd;
                border-radius: 12px;
                padding: 15px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                transition: all 0.3s;
            `;
            card.onmouseover = () => card.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
            card.onmouseout = () => card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';

            const photo = patient.profile_pic || 'https://via.placeholder.com/80';
            card.innerHTML = `
                <div style="text-align: center; margin-bottom: 12px;">
                    <img src="${photo}" alt="${patient.name}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid #27ae60;">
                </div>
                <h4 style="margin: 10px 0; text-align: center;">${patient.name}</h4>
                <p style="color: #666; text-align: center; margin: 5px 0;"><i class="fas fa-phone"></i> ${patient.phone || 'N/A'}</p>
                <p style="color: #999; text-align: center; margin: 5px 0; font-size: 12px;">الرقم القومي: ${patient.nationalId || 'N/A'}</p>
                <p style="color: #999; text-align: center; margin: 5px 0; font-size: 12px;">العمر: ${patient.age || 'N/A'} | فصيلة الدم: ${patient.blood_type || 'N/A'}</p>
                <div style="display: flex; gap: 8px; margin-top: 12px;">
                    <button onclick="editPatient(${patient.id})" style="flex: 1; padding: 8px; background: #3498db; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-edit"></i> تعديل
                    </button>
                    <button onclick="deletePatient(${patient.id})" style="flex: 1; padding: 8px; background: #e74c3c; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                </div>
            `;
            patientsList.appendChild(card);
        });
    } catch (err) {
        console.error('خطأ في تحميل المرضى:', err);
    }
}

// تحميل قائمة المواعيد للأدمن
async function loadAdminAppointments() {
    try {
        const response = await fetch('https://healthhub-production-90ef.up.railway.app/admin/appointments');
        const appointments = await response.json();
        
        const tableBody = document.getElementById('appointments-table-body');
        tableBody.innerHTML = '';

        appointments.forEach(apt => {
            const row = document.createElement('tr');
            row.style.borderBottom = '1px solid #ddd';
            row.innerHTML = `
                <td style="padding: 12px; text-align: right;">${apt.patient_name}</td>
                <td style="padding: 12px; text-align: right;">${apt.doctor_name}</td>
                <td style="padding: 12px; text-align: right;">${new Date(apt.appointment_time).toLocaleString('ar-EG')}</td>
                <td style="padding: 12px; text-align: right;">
                    <span style="background: ${apt.status === 'تم الكشف' ? '#27ae60' : '#f39c12'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                        ${apt.status}
                    </span>
                </td>
                <td style="padding: 12px; text-align: right;">
                    <button onclick="deleteAppointment(${apt.id})" style="padding: 6px 12px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (err) {
        console.error('خطأ في تحميل المواعيد:', err);
    }
}

// تبديل التبويبات في الأدمن
function switchAdminTab(tab) {
    // إخفاء جميع المحتويات
    document.getElementById('admin-doctors-content').style.display = 'none';
    document.getElementById('admin-patients-content').style.display = 'none';
    document.getElementById('admin-appointments-content').style.display = 'none';

    // إزالة الألوان النشطة من جميع الأزرار
    document.getElementById('admin-tab-doctors').style.background = '#95a5a6';
    document.getElementById('admin-tab-patients').style.background = '#95a5a6';
    document.getElementById('admin-tab-appointments').style.background = '#95a5a6';

    // عرض المحتوى المختار وتفعيل الزر
    if (tab === 'doctors') {
        document.getElementById('admin-doctors-content').style.display = 'block';
        document.getElementById('admin-tab-doctors').style.background = '#3498db';
    } else if (tab === 'patients') {
        document.getElementById('admin-patients-content').style.display = 'block';
        document.getElementById('admin-tab-patients').style.background = '#3498db';
    } else if (tab === 'appointments') {
        document.getElementById('admin-appointments-content').style.display = 'block';
        document.getElementById('admin-tab-appointments').style.background = '#3498db';
    }
}

// حذف طبيب
async function deleteDoctor(doctorId) {
    if (!confirm('هل تريد حذف هذا الطبيب؟')) return;

    try {
        const response = await fetch(`https://healthhub-production-90ef.up.railway.app/admin/delete-doctor/${doctorId}`, {
            method: 'DELETE'
        });
        const data = await response.json();

        if (data.success) {
            alert('تم حذف الطبيب بنجاح');
            await loadAdminDoctors();
        } else {
            alert('فشل حذف الطبيب: ' + data.message);
        }
    } catch (err) {
        console.error('خطأ:', err);
        alert('خطأ في الاتصال بالسيرفر');
    }
}


// تعديل طبيب (يمكن توسيعها لاحقاً)
function editDoctor(doctorId) {
    alert('سيتم إضافة نافذة تعديل الطبيب قريباً');
}

// تعديل مريض (يمكن توسيعها لاحقاً)
function editPatient(patientId) {
    alert('سيتم إضافة نافذة تعديل المريض قريباً');
}

// تحديث goToSection لدعم الأدمن
const originalGoToSection = goToSection;
goToSection = function(target) {
    document.getElementById('doctor-auth-section')?.classList.add('hidden');
    document.getElementById('patient-auth-section')?.classList.add('hidden');
    document.getElementById('doc-dashboard-section')?.classList.add('hidden');
    document.getElementById('admin-auth-section')?.classList.add('hidden');
    document.getElementById('admin-dashboard-section')?.classList.add('hidden');
    
    if(target === 'doctor') {
        const savedDoc = localStorage.getItem('currentDoctorName');
        if(savedDoc) showDashboard(savedDoc);
        else document.getElementById('doctor-auth-section').classList.remove('hidden');
    } else if(target === 'admin') {
        const adminLoggedIn = localStorage.getItem('adminLoggedIn');
        if(adminLoggedIn) showAdminDashboard();
        else document.getElementById('admin-auth-section').classList.remove('hidden');
    } else {
        document.getElementById('patient-auth-section').classList.remove('hidden');
    }
};

// تسجيل خروج الأدمن
function adminLogout() {
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('adminUsername');
    document.getElementById('admin-dashboard-section').classList.add('hidden');
    document.getElementById('admin-auth-section').classList.add('hidden');
    document.getElementById('doctor-auth-section').classList.remove('hidden');
    document.getElementById('admin-username').value = '';
    document.getElementById('admin-password').value = '';
    document.getElementById('admin-error-msg').textContent = '';
}

// تهيئة الصفحة - التحقق من وجود جلسة أدمن
// لكن بس لو الدكتور مش logged in
window.addEventListener('load', function() {
    const adminLoggedIn = localStorage.getItem('adminLoggedIn');
    const doctorLoggedIn = localStorage.getItem('currentDoctorId');
    if (adminLoggedIn && !doctorLoggedIn) {
        goToSection('admin');
    }
});
