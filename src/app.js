 /* =========================================================
   SISE - Sistema de Solicitudes Estudiantiles
   Lógica JavaScript (Base de Datos Local, Roles y Accesibilidad)
   ========================================================= */

// BASE DE DATOS INICIAL DE USUARIOS Y CREDENCIALES
let usersDB = [
  { username: "60219476", pass: "123456", name: "Yoshira Santiago Chamorro", role: "ESTUDIANTE" },
  { username: "sec_general", pass: "admin123", name: "Ana Delgado", role: "SECRETARIA" },
  { username: "coord_ti", pass: "coord123", name: "Ing. Roberto Gómez", role: "COORDINADOR" },
  { username: "sec_academico", pass: "sec123", name: "Dr. Manuel Valladares", role: "SECRETARIO_ACADEMICO" },
  { username: "director", pass: "dir123", name: "Mg. Carlos Mendoza", role: "DIRECTOR" }
];

// BASE DE DATOS INICIAL DE SOLICITUDES
let requestsDB = [
  {
    code: "SISE-2026-0128",
    student: "Yoshira Santiago Chamorro",
    dni: "60219476",
    program: "Arquitectura de Plataformas y Servicios TI",
    module: "I MÓDULO",
    semester: "I SEMESTRE",
    type: "Carta de Presentación",
    file: "solicitud_practicas_60219476.pdf",
    status: "Pendiente",
    currentLocation: "COORDINACION"
  },
  {
    code: "SISE-2026-0125",
    student: "Yoshira Santiago Chamorro",
    dni: "60219476",
    program: "Arquitectura de Plataformas y Servicios TI",
    module: "I MÓDULO",
    semester: "I SEMESTRE",
    type: "Certificado de Prácticas Profesionales",
    file: "certificado_santiago.pdf",
    status: "En revisión",
    currentLocation: "DIRECTOR"
  }
];

let complaintsDB = [];
let currentUser = null;
let currentSelectedReqCode = null;

// ACCESIBILIDAD: CAMBIO DE TAMAÑO DE FUENTE Y ALTO CONTRASTE
let currentFontSize = 14;
let screenReaderActive = false;

function changeFontSize(delta) {
  currentFontSize = Math.min(Math.max(12, currentFontSize + delta), 20);
  document.documentElement.style.setProperty('--font-size', currentFontSize + 'px');
  showToast("Tamaño de texto ajustado a " + currentFontSize + "px");
}

function resetFontSize() {
  currentFontSize = 14;
  document.documentElement.style.setProperty('--font-size', '14px');
  showToast("Tamaño de texto restablecido");
}

function toggleHighContrast() {
  document.body.classList.toggle('high-contrast');
  const active = document.body.classList.contains('high-contrast');
  showToast(active ? "Modo Alto Contraste Activado" : "Modo Normal Activado");
}

function toggleScreenReader() {
  screenReaderActive = !screenReaderActive;
  const btn = document.getElementById('srToggleBtn');
  btn.innerHTML = screenReaderActive ? '<i class="fas fa-volume-up"></i> Voz: ON' : '<i class="fas fa-volume-up"></i> Voz: OFF';
  showToast(screenReaderActive ? "Lector de voz activado" : "Lector de voz desactivado");
}

function speakText(text) {
  if (screenReaderActive && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    window.speechSynthesis.speak(utterance);
  }
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.innerText = message;
  toast.classList.add('visible');
  speakText(message);
  setTimeout(() => toast.classList.remove('visible'), 3000);
}

// INICIO DE SESIÓN
function handleLogin(e) {
  e.preventDefault();
  const uInput = document.getElementById('loginUser').value.trim();
  const pInput = document.getElementById('loginPass').value.trim();

  const found = usersDB.find(u => u.username === uInput && u.pass === pInput);

  if (found) {
    currentUser = found;
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appShell').style.display = 'flex';
    setupUserInterface();
    showToast("Bienvenido " + currentUser.name);
  } else {
    alert("Credenciales incorrectas. Verifique usuario y contraseña.");
  }
}

function quickLogin(user, pass) {
  document.getElementById('loginUser').value = user;
  document.getElementById('loginPass').value = pass;
  handleLogin(new Event('submit'));
}

function handleLogout() {
  currentUser = null;
  document.getElementById('appShell').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  showToast("Sesión cerrada correctamente");
}

// CONFIGURACIÓN DE LA INTERFAZ SEGÚN ROL
function setupUserInterface() {
  document.getElementById('sidebarUserName').innerText = currentUser.name;
  document.getElementById('sidebarUserRole').innerText = currentUser.role;
  document.getElementById('headerUserInfo').innerText = `${currentUser.name} (${currentUser.role})`;
  
  // Iniciales para Avatar
  const initials = currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2);
  document.getElementById('sidebarAvatar').innerText = initials;

  renderRequestsTable();
  renderUsersTable();
  renderComplaintsTable();
  updateReportStats();
}

// NAVEGACIÓN ENTRE VISTAS
function switchPage(pageId) {
  document.querySelectorAll('.page-section').forEach(sec => sec.style.display = 'none');
  document.querySelectorAll('.nav-link').forEach(btn => btn.classList.remove('active'));

  const targetPage = document.getElementById('page-' + pageId);
  const targetNav = document.getElementById('nav-' + pageId);

  if (targetPage) targetPage.style.display = 'block';
  if (targetNav) targetNav.classList.add('active');

  const titles = {
    'solicitudes': 'Bandeja de Solicitudes',
    'nueva': 'Registrar Nueva Solicitud',
    'seguimiento': 'Seguimiento por DNI',
    'reclamaciones': 'Libro de Reclamaciones Virtual',
    'usuarios': 'Gestión de Usuarios',
    'reportes': 'Reportes e Informes'
  };

  document.getElementById('pageTitle').innerText = titles[pageId] || 'Panel Principal';
  
  if (pageId === 'seguimiento') performTrackingSearch();
}

// RENDERIZAR TABLA DE SOLICITUDES
function renderRequestsTable() {
  const tbody = document.getElementById('requestsTableBody');
  tbody.innerHTML = '';

  let filtered = requestsDB;
  if (currentUser.role === 'ESTUDIANTE') {
    filtered = requestsDB.filter(r => r.dni === currentUser.username);
  }

  document.getElementById('solicitudesCount').innerText = filtered.length;

  filtered.forEach(req => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${req.code}</strong></td>
      <td>${req.student}<br><small>DNI: ${req.dni}</small></td>
      <td>${req.program}<br><small>${req.module} · ${req.semester}</small></td>
      <td>${req.type}</td>
      <td><i class="fas fa-file-pdf"></i> ${req.file}</td>
      <td><span class="status status-${req.status.toLowerCase().replace(' ', '-')}">${req.status}</span></td>
      <td>
        <button onclick="openDocumentViewer('${req.code}')" class="btn btn-primary" style="padding:4px 8px; font-size:11px;">
          <i class="fas fa-eye"></i> Ver / Derivar
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// NUEVA SOLICITUD
function handleCreateRequest(e) {
  e.preventDefault();
  
  const newReq = {
    code: "SISE-2026-0" + (130 + requestsDB.length),
    student: document.getElementById('reqStudentName').value,
    dni: document.getElementById('reqDni').value,
    program: document.getElementById('reqProgram').value,
    module: document.getElementById('reqModule').value,
    semester: document.getElementById('reqSemester').value,
    type: document.getElementById('reqType').value,
    file: document.getElementById('reqFile').files[0] ? document.getElementById('reqFile').files[0].name : 'documento.pdf',
    status: 'Pendiente',
    currentLocation: 'SECRETARIA'
  };

  requestsDB.unshift(newReq);
  showToast("Solicitud " + newReq.code + " enviada a Secretaría General");
  document.getElementById('newRequestForm').reset();
  switchPage('solicitudes');
}

// CONSULTA POR DNI
function performTrackingSearch() {
  const query = document.getElementById('searchDniInput').value.trim();
  const box = document.getElementById('trackingResult');

  const req = requestsDB.find(r => r.dni === query || r.code === query);

  if (req) {
    box.style.display = 'block';
    box.innerHTML = `
      <div style="border:1px solid var(--border); padding:15px; border-radius:6px; background:#f8fafc;">
        <h4><i class="fas fa-id-card"></i> Ficha del Estudiante: ${req.student}</h4>
        <p><strong>DNI:</strong> ${req.dni} | <strong>Programa:</strong> ${req.program}</p>
        <p><strong>Módulo:</strong> ${req.module} | <strong>Semestre:</strong> ${req.semester}</p>
        <hr style="margin:10px 0;">
        <h5>Trámite: ${req.type} (${req.code})</h5>
        <p>Estado actual: <strong style="color:var(--primary);">${req.status}</strong></p>
        <p>Ubicación del expediente: <strong>${req.currentLocation}</strong></p>
      </div>
    `;
  } else {
    box.style.display = 'block';
    box.innerHTML = `<p style="color:var(--danger);"><i class="fas fa-times-circle"></i> No se encontraron expedientes para el DNI/Código ingresado.</p>`;
  }
}

// MODAL DE DOCUMENTOS Y DERIVACIÓN
function openDocumentViewer(code) {
  currentSelectedReqCode = code;
  const req = requestsDB.find(r => r.code === code);
  
  if (!req) return;

  document.getElementById('modalTitle').innerText = "Visor de Documento: " + req.code;
  document.getElementById('documentViewerBox').innerHTML = `
    <i class="fas fa-file-pdf" style="font-size:40px; color:#b42318;"></i>
    <p style="margin-top:10px;"><strong>Archivo Adjunto:</strong> ${req.file}</p>
    <small>Vista previa simulada para formatos PDF, DOCX, XLSX y PPTX</small>
  `;

  document.getElementById('fileModal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('fileModal').style.display = 'none';
}

function applyWorkflowRouting() {
  const target = document.getElementById('routeTargetSelect').value;
  const req = requestsDB.find(r => r.code === currentSelectedReqCode);

  if (req) {
    req.currentLocation = target;
    req.status = target === 'ENTREGADO' ? 'Aprobada' : 'En revisión';
    showToast("Expediente derivado a: " + target);
    closeModal();
    renderRequestsTable();
  }
}

// LIBRO DE RECLAMACIONES
function handleCreateComplaint(e) {
  e.preventDefault();
  const comp = {
    code: "LR-2026-000" + (complaintsDB.length + 1),
    date: new Date().toLocaleDateString(),
    name: document.getElementById('compName').value,
    dni: document.getElementById('compDni').value,
    type: document.getElementById('compType').value,
    status: 'Pendiente'
  };

  complaintsDB.push(comp);
  showToast("Hoja de Reclamación " + comp.code + " registrada correctamente");
  document.getElementById('complaintForm').reset();
  renderComplaintsTable();
}

function renderComplaintsTable() {
  const tbody = document.getElementById('complaintsTableBody');
  tbody.innerHTML = '';

  complaintsDB.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${c.code}</strong></td>
      <td>${c.date}</td>
      <td>${c.name} (${c.dni})</td>
      <td>${c.type}</td>
      <td><span class="status status-pendiente">${c.status}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// GESTIÓN DE USUARIOS
function handleCreateUser(e) {
  e.preventDefault();
  
  const newUser = {
    username: document.getElementById('newUsername').value,
    pass: document.getElementById('newUserPass').value,
    name: document.getElementById('newFullName').value,
    role: document.getElementById('newUserRole').value
  };

  usersDB.push(newUser);
  showToast("Usuario " + newUser.username + " registrado con éxito");
  document.getElementById('createUserForm').reset();
  renderUsersTable();
}

function renderUsersTable() {
  const tbody = document.getElementById('usersTableBody');
  tbody.innerHTML = '';

  usersDB.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${u.username}</strong></td>
      <td>${u.name}</td>
      <td><span class="role-badge">${u.role}</span></td>
      <td><code>${u.pass}</code></td>
    `;
    tbody.appendChild(tr);
  });
}

// ACTUALIZAR REPORTES
function updateReportStats() {
  document.getElementById('statTotal').innerText = requestsDB.length;
  document.getElementById('statApproved').innerText = requestsDB.filter(r => r.status === 'Aprobada').length;
  document.getElementById('statPending').innerText = requestsDB.filter(r => r.status !== 'Aprobada').length;

  const tbody = document.getElementById('reportTableBody');
  tbody.innerHTML = '';

  requestsDB.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.code}</td>
      <td>${r.student}</td>
      <td>${r.dni}</td>
      <td>${r.type}</td>
      <td>${r.status} (${r.currentLocation})</td>
    `;
    tbody.appendChild(tr);
  });
}

// INICIALIZACIÓN
window.onload = function() {
  console.log("Sistema SISE Iniciado Correctamente.");
};