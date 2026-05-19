// =============================================
//  HealthHub — Admin Panel Script
// =============================================

const API = 'http://localhost:3000';

// ─── Init ─────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    initTheme();
    const loggedIn = localStorage.getItem('adminLoggedIn');
    if (loggedIn) {
        showDashboard(localStorage.getItem('adminUsername') || 'admin');
    }

    // Login on Enter key
    document.getElementById('inp-password').addEventListener('keydown', e => {
        if (e.key === 'Enter') doLogin();
    });
    document.getElementById('inp-username').addEventListener('keydown', e => {
        if (e.key === 'Enter') doLogin();
    });
});

// ─── Theme ─────────────────────────────────────
function initTheme() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') document.body.classList.add('dark-theme');
    document.getElementById('theme-toggle').addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        document.getElementById('theme-toggle').innerHTML =
            isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    });
    if (saved === 'dark') {
        document.getElementById('theme-toggle').innerHTML = '<i class="fas fa-sun"></i>';
    }
}

// ─── Login ─────────────────────────────────────
async function doLogin() {
    const username = document.getElementById('inp-username').value.trim();
    const password = document.getElementById('inp-password').value.trim();
    const errEl = document.getElementById('login-error');
    const btn = document.getElementById('admin-submit-btn');

    if (!username || !password) {
        errEl.textContent = 'يرجى إدخال اسم المستخدم وكلمة السر';
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الدخول...';
    errEl.textContent = '';

    try {
        const res = await fetch(`${API}/auth/admin-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (data.success) {
            localStorage.setItem('adminLoggedIn', 'true');
            localStorage.setItem('adminUsername', username);
            showDashboard(username);
        } else {
            errEl.textContent = data.message || 'بيانات الدخول غير صحيحة';
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> دخول';
        }
    } catch (err) {
        errEl.textContent = 'خطأ في الاتصال بالسيرفر';
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> دخول';
    }
}

// ─── Show Dashboard ─────────────────────────────
function showDashboard(username) {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('dashboard-page').style.display = 'block';
    document.getElementById('admin-user-label').textContent = username;
    // Restore last active tab from hash (default: doctors)
    const hash = window.location.hash.replace('#', '');
    const validTabs = ['doctors', 'patients', 'appointments'];
    const activeTab = validTabs.includes(hash) ? hash : 'doctors';
    switchTab(activeTab);
    loadStats();
    loadDoctors();
    loadPatients();
    loadAppointments();
}

// ─── Logout ─────────────────────────────────────
function doLogout() {
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('adminUsername');
    document.getElementById('dashboard-page').style.display = 'none';
    document.getElementById('login-page').style.display = 'flex';
    document.getElementById('inp-username').value = '';
    document.getElementById('inp-password').value = '';
    document.getElementById('login-error').textContent = '';
    const btn = document.getElementById('admin-submit-btn');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> دخول';
}

// ─── Tabs ─────────────────────────────────────
function switchTab(tab) {
    ['doctors', 'patients', 'appointments'].forEach(t => {
        const tabEl = document.getElementById(`tab-${t}`);
        const btnEl = document.getElementById(`tab-btn-${t}`);
        if (tabEl) tabEl.style.display = t === tab ? 'block' : 'none';
        if (btnEl) {
            btnEl.classList.remove('active');
            if (t === tab) btnEl.classList.add('active');
        }
    });
    // Update URL hash for state tracking
    history.replaceState(null, '', `#${tab}`);
}

// ─── Stats ─────────────────────────────────────
async function loadStats() {
    try {
        const res = await fetch(`${API}/admin/stats`);
        const data = await res.json();
        document.getElementById('stat-doctors').textContent = data.doctors ?? '—';
        document.getElementById('stat-patients').textContent = data.patients ?? '—';
        document.getElementById('stat-appointments').textContent = data.appointments ?? '—';
        document.getElementById('stat-today').textContent = data.appointmentsToday ?? '—';
    } catch (e) {
        console.error('خطأ في الإحصائيات:', e);
    }
}

// ─── Doctors ─────────────────────────────────────
async function loadDoctors() {
    const grid = document.getElementById('doctors-grid');
    if (!grid.querySelector('.item-card')) {
        grid.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> جاري التحميل...</div>';
    }
    try {
        const res = await fetch(`${API}/doctor/doctors`);
        const doctors = await res.json();
        if (!doctors.length) {
            grid.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:30px;">لا يوجد أطباء مسجلون</p>';
            return;
        }

        const existing = new Set([...grid.querySelectorAll('.item-card')].map(c => c.dataset.id));
        const incoming = new Set(doctors.map(d => String(d.id)));

        grid.querySelectorAll('.item-card').forEach(c => {
            if (!incoming.has(c.dataset.id)) {
                c.style.transition = 'opacity 0.25s';
                c.style.opacity = '0';
                setTimeout(() => c.remove(), 250);
            }
        });

        doctors.forEach(doc => {
            const photo = doc.profile_pic || 'https://via.placeholder.com/80?text=Dr';
            const html = `
                <img src="${photo}" alt="${doc.name}" onerror="this.src='https://via.placeholder.com/80?text=Dr'">
                <h4>${doc.name}</h4>
                <p><i class="fas fa-stethoscope" style="color:var(--primary)"></i> ${doc.specialty || '—'}</p>
                <p><i class="fas fa-phone" style="color:var(--success)"></i> ${doc.phone || 'غير محدد'}</p>
                <p><i class="fas fa-money-bill" style="color:var(--warning)"></i> ${doc.price ? doc.price + ' جنيه' : 'غير محدد'}</p>
                <p style="font-size:11px; color:var(--text-muted)">الرقم القومي: ${doc.nationalId || '—'}</p>
                <div class="card-actions">
                    <button class="btn-edit-card" onclick="openEditDoctor(${doc.id}, '${escHtml(doc.name)}', '${escHtml(doc.specialty)}', '${escHtml(doc.phone||'')}', '${doc.price||''}')">
                        <i class="fas fa-edit"></i> تعديل
                    </button>
                    <button class="btn-del-card" onclick="deleteDoctor(${doc.id})">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                </div>`;

            if (existing.has(String(doc.id))) {
                const card = grid.querySelector(`.item-card[data-id="${doc.id}"]`);
                if (card) card.innerHTML = html;
            } else {
                const card = document.createElement('div');
                card.className = 'item-card';
                card.dataset.id = String(doc.id);
                card.innerHTML = html;
                grid.appendChild(card);
            }
        });

        grid.querySelector('.loading-spinner')?.remove();
    } catch (e) {
        grid.innerHTML = '<p style="text-align:center; color:var(--danger); padding:30px;">خطأ في تحميل الأطباء</p>';
    }
}

// ─── Patients ─────────────────────────────────────
async function loadPatients() {
    const grid = document.getElementById('patients-grid');
    // أول تحميل فقط نبيّن السبينر
    if (!grid.querySelector('.item-card')) {
        grid.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> جاري التحميل...</div>';
    }
    try {
        const res = await fetch(`${API}/admin/patients`);
        const patients = await res.json();
        if (!patients.length) {
            grid.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:30px;">لا يوجد مرضى مسجلون</p>';
            return;
        }

        // الكروت الموجودة حالياً
        const existing = new Set([...grid.querySelectorAll('.item-card')].map(c => c.dataset.id));
        const incoming = new Set(patients.map(p => String(p.id)));

        // احذف الكروت المحذوفة من DB بـ fade-out خفيف
        grid.querySelectorAll('.item-card').forEach(c => {
            if (!incoming.has(c.dataset.id)) {
                c.style.transition = 'opacity 0.25s';
                c.style.opacity = '0';
                setTimeout(() => c.remove(), 250);
            }
        });

        // أضف أو حدّث الكروت
        patients.forEach(p => {
            const photo = p.profile_pic || 'https://via.placeholder.com/80?text=P';
            const html = `
                <img src="${photo}" alt="${p.name}" style="border-color:var(--success)" onerror="this.src='https://via.placeholder.com/80?text=P'">
                <h4>${p.name}</h4>
                <p><i class="fas fa-phone" style="color:var(--success)"></i> ${p.phone || 'غير محدد'}</p>
                <p><i class="fas fa-tint" style="color:var(--danger)"></i> ${p.blood_type || 'فصيلة غير محددة'} &nbsp;|&nbsp; ${p.age ? p.age + ' سنة' : 'عمر غير محدد'}</p>
                <p style="font-size:11px; color:var(--text-muted)">الرقم القومي: ${p.nationalId || '—'}</p>
                <div class="card-actions">
                    <button class="btn-edit-card" onclick="openEditPatient(${p.id}, '${escHtml(p.name)}', '${escHtml(p.phone||'')}', '${p.age||''}', '${p.blood_type||''}', '${escHtml(p.diseases||'')}')">
                        <i class="fas fa-edit"></i> تعديل
                    </button>
                    <button class="btn-del-card" onclick="deletePatient(${p.id})">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                </div>`;

            if (existing.has(String(p.id))) {
                // الكارت موجود - حدّث محتواه بدون إعادة إنشاء (مش بنلمس الـ DOM element نفسه)
                const card = grid.querySelector(`.item-card[data-id="${p.id}"]`);
                if (card) card.innerHTML = html;
            } else {
                // كارت جديد - أضفه
                const card = document.createElement('div');
                card.className = 'item-card';
                card.dataset.id = String(p.id);
                card.innerHTML = html;
                grid.appendChild(card);
            }
        });

        // شيل السبينر لو لسه موجود
        grid.querySelector('.loading-spinner')?.remove();
    } catch (e) {
        grid.innerHTML = '<p style="text-align:center; color:var(--danger); padding:30px;">خطأ في تحميل المرضى</p>';
    }
}

// ─── Appointments ─────────────────────────────────────
async function loadAppointments() {
    const tbody = document.getElementById('appointments-body');
    tbody.innerHTML = '<tr><td colspan="6" class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> جاري التحميل...</td></tr>';
    try {
        const res = await fetch(`${API}/admin/appointments`);
        const apts = await res.json();
        if (!apts.length) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-muted)">لا توجد مواعيد</td></tr>';
            return;
        }
        tbody.innerHTML = '';
        apts.forEach((apt, i) => {
            const dateStr = new Date(apt.appointment_time).toLocaleString('ar-EG', {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
            let badgeClass = 'badge-pending';
            if (apt.status === 'تم الكشف') badgeClass = 'badge-done';
            else if (apt.status === 'ملغي') badgeClass = 'badge-cancel';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${i + 1}</td>
                <td><b>${apt.patient_name}</b></td>
                <td>د. ${apt.doctor_name}</td>
                <td style="font-size:12px;">${dateStr}</td>
                <td><span class="badge ${badgeClass}">${apt.status}</span></td>
                <td>
                    <button onclick="deleteAppointment(${apt.id})" style="padding:5px 12px; background:var(--danger); color:#fff; border:none; border-radius:6px; cursor:pointer; font-size:12px; font-family:'Cairo',sans-serif; font-weight:600;">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--danger)">خطأ في تحميل المواعيد</td></tr>';
    }
}

// ─── Edit Doctor Modal ─────────────────────────────────────
function openEditDoctor(id, name, specialty, phone, price) {
    document.getElementById('edit-doc-id').value = id;
    document.getElementById('edit-doc-name').value = name;
    document.getElementById('edit-doc-phone').value = phone;
    document.getElementById('edit-doc-price').value = price;
    const sel = document.getElementById('edit-doc-specialty');
    // Reset selection then try exact match, then partial match
    sel.selectedIndex = 0;
    for (let opt of sel.options) {
        if (opt.value === specialty || opt.text === specialty) {
            opt.selected = true;
            break;
        }
    }
    document.getElementById('modal-doctor').classList.add('open');
}

async function saveDoctor() {
    const id = document.getElementById('edit-doc-id').value;
    const name = document.getElementById('edit-doc-name').value.trim();
    const specialty = document.getElementById('edit-doc-specialty').value;
    const phone = document.getElementById('edit-doc-phone').value.trim();
    const price = document.getElementById('edit-doc-price').value;

    if (!name) { alert('يرجى إدخال اسم الطبيب'); return; }

    try {
        const res = await fetch(`${API}/admin/update-doctor/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, specialty, phone, price })
        });
        const data = await res.json();
        if (data.success) {
            closeModal('modal-doctor');
            await loadDoctors();
            await loadStats();
            showToast('تم تحديث بيانات الطبيب بنجاح ✓', 'success');
        } else {
            alert('فشل التحديث: ' + data.message);
        }
    } catch (e) {
        alert('خطأ في الاتصال بالسيرفر');
    }
}

// ─── Edit Patient Modal ─────────────────────────────────────
function openEditPatient(id, name, phone, age, blood_type, diseases) {
    document.getElementById('edit-pat-id').value = id;
    document.getElementById('edit-pat-name').value = name;
    document.getElementById('edit-pat-phone').value = phone;
    document.getElementById('edit-pat-age').value = age || '';
    document.getElementById('edit-pat-diseases').value = diseases || '';
    const sel = document.getElementById('edit-pat-blood');
    sel.selectedIndex = 0;
    for (let opt of sel.options) {
        if (opt.value === blood_type) { opt.selected = true; break; }
    }
    document.getElementById('modal-patient').classList.add('open');
}

async function savePatient() {
    const id = document.getElementById('edit-pat-id').value;
    const name = document.getElementById('edit-pat-name').value.trim();
    const phone = document.getElementById('edit-pat-phone').value.trim();
    const age = document.getElementById('edit-pat-age').value;
    const blood_type = document.getElementById('edit-pat-blood').value;
    const diseases = document.getElementById('edit-pat-diseases').value.trim();

    if (!name) { alert('يرجى إدخال اسم المريض'); return; }

    try {
        const res = await fetch(`${API}/admin/update-patient/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, age, blood_type, diseases })
        });
        const data = await res.json();
        if (data.success) {
            closeModal('modal-patient');
            await loadPatients();
            showToast('تم تحديث بيانات المريض بنجاح ✓', 'success');
        } else {
            alert('فشل التحديث: ' + data.message);
        }
    } catch (e) {
        alert('خطأ في الاتصال بالسيرفر');
    }
}

// ─── Delete ─────────────────────────────────────
async function deleteDoctor(id) {
    if (!confirm('هل تريد حذف هذا الطبيب؟ سيتم حذف جميع بياناته.')) return;
    try {
        const res = await fetch(`${API}/admin/delete-doctor/${id}`, { method: 'DELETE' });
        let data;
        try { data = await res.json(); } catch (_) { data = { success: false, message: 'استجابة غير صحيحة من السيرفر' }; }
        if (data.success) { await loadDoctors(); await loadStats(); showToast('تم حذف الطبيب ✓', 'success'); }
        else alert('فشل الحذف: ' + data.message);
    } catch (e) { alert('تعذّر الاتصال بالسيرفر، تأكد أنه يعمل.'); }
}

async function deletePatient(id) {
    if (!confirm('هل تريد حذف هذا المريض؟ سيتم حذف جميع بياناته.')) return;
    try {
        const res = await fetch(`${API}/admin/delete-patient/${id}`, { method: 'DELETE' });
        let data;
        try { data = await res.json(); } catch (_) { data = { success: false, message: 'استجابة غير صحيحة من السيرفر' }; }
        if (data.success) { await loadPatients(); await loadStats(); showToast('تم حذف المريض ✓', 'success'); }
        else alert('فشل الحذف: ' + data.message);
    } catch (e) { alert('تعذّر الاتصال بالسيرفر، تأكد أنه يعمل.'); }
}

async function deleteAppointment(id) {
    if (!confirm('هل تريد حذف هذا الموعد؟')) return;
    try {
        const res = await fetch(`${API}/admin/delete-appointment/${id}`, { method: 'DELETE' });
        let data;
        try { data = await res.json(); } catch (_) { data = { success: false, message: 'استجابة غير صحيحة من السيرفر' }; }
        if (data.success) { await loadAppointments(); await loadStats(); showToast('تم حذف الموعد ✓', 'success'); }
        else alert('فشل الحذف: ' + data.message);
    } catch (e) { alert('تعذّر الاتصال بالسيرفر، تأكد أنه يعمل.'); }
}

// ─── Modal helpers ─────────────────────────────────────
function closeModal(id) {
    document.getElementById(id).classList.remove('open');
}
// Close modal on backdrop click
document.querySelectorAll('.modal-overlay').forEach(el => {
    el.addEventListener('click', e => { if (e.target === el) closeModal(el.id); });
});

// ─── Toast ─────────────────────────────────────
function showToast(msg, type = 'success') {
    const toast = document.createElement('div');
    const bg = type === 'success' ? 'var(--success)' : 'var(--danger)';
    toast.style.cssText = `
        position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
        background:${bg}; color:#fff; padding:12px 24px;
        border-radius:50px; font-family:'Cairo',sans-serif; font-weight:700;
        font-size:14px; box-shadow:0 4px 20px rgba(0,0,0,0.2);
        z-index:9999; animation:fadeIn 0.3s ease;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ─── Util ─────────────────────────────────────
function escHtml(str) {
    return String(str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
