document.addEventListener('DOMContentLoaded', () => {
  let teacherId = null;
  let activeSessionId = null;
  let activeSessionName = '';
  let assignedMappings = []; // stores teacher assignments

  checkAuthAndLoad();

  // Handle Sidebar Toggling
  const menuToggle = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const contentFrame = document.getElementById('content-frame');
  const sidebarOverlay = document.getElementById('sidebarOverlay');

  function toggleSidebar() {
    sidebar.classList.toggle('collapsed');
    contentFrame.classList.toggle('expanded');
    if (window.innerWidth < 992) {
      sidebarOverlay.classList.toggle('show');
    }
  }

  if (menuToggle) {
    menuToggle.addEventListener('click', toggleSidebar);
  }
  
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', toggleSidebar);
  }

  // Handle Tab Pane Routing
  const menuItems = document.querySelectorAll('.sidebar-menu li');
  menuItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const paneId = item.getAttribute('data-pane');
      if (paneId) {
        switchPane(paneId);
        menuItems.forEach(mi => mi.classList.remove('active'));
        item.classList.add('active');

        // Auto-close sidebar on mobile after click
        if (window.innerWidth < 992 && sidebar.classList.contains('collapsed')) {
          toggleSidebar();
        }
      }
    });
  });

  // Handle triggers
  document.querySelectorAll('[data-pane-trigger]').forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const paneId = trigger.getAttribute('data-pane-trigger');
      switchPane(paneId);
      menuItems.forEach(mi => {
        mi.classList.remove('active');
        if (mi.getAttribute('data-pane') === paneId) mi.classList.add('active');
      });
    });
  });

  function switchPane(paneId) {
    document.querySelectorAll('.dashboard-pane').forEach(pane => {
      pane.classList.add('d-none');
    });
    const activePane = document.getElementById(paneId);
    if (activePane) {
      activePane.classList.remove('d-none');
      if (paneId === 'pane-teacher-dashboard') loadDashboardOverview();
      else if (paneId === 'pane-teacher-attendance') loadAttendanceView();
      else if (paneId === 'pane-teacher-att-report') loadAttReportView();
      else if (paneId === 'pane-teacher-subjects') loadTeacherSubjectsView();
      else if (paneId === 'pane-teacher-results') loadResultsView();
      else if (paneId === 'pane-teacher-students') loadTeacherStudentsView();
    }
  }

  // Alerts placeholder helper
  function showAlert(message, type = 'success') {
    const alertBox = document.getElementById('globalAlert');
    const alertMsg = document.getElementById('globalAlertMessage');
    alertBox.className = `alert alert-${type} alert-dismissible fade show`;
    alertMsg.textContent = message;
    alertBox.classList.remove('d-none');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      alertBox.classList.add('d-none');
    }, 6000);
  }

  // CHECK AUTH STATE & LOAD PRIMARY DATA
  async function checkAuthAndLoad() {
    try {
      const response = await fetch('/api/auth/status');
      const data = await response.json();
      if (!data.loggedIn || data.user.role !== 'teacher') {
        window.location.href = '/login.html';
        return;
      }
      
      // Save teacher identity
      teacherId = data.user.teacherId;
      document.getElementById('navTeacherName').textContent = data.user.name;

      // Load active session scope
      await fetchActiveSessionScope();
      
      if (teacherId && activeSessionId) {
        // Fetch teacher assignments immediately so it's ready for all screens
        const assignRes = await fetch(`/api/teachers/assignments?teacherId=${teacherId}&academicYearId=${activeSessionId}`);
        assignedMappings = await assignRes.json();
      }

      // Load initial dashboard overview
      loadDashboardOverview();
    } catch (error) {
      console.error('Auth check error:', error);
      window.location.href = '/login.html';
    }
  }

  async function fetchActiveSessionScope() {
    try {
      const res = await fetch('/api/academic-years');
      const sessions = await res.json();
      const activeSession = sessions.find(s => s.status === 'active');
      if (activeSession) {
        activeSessionName = activeSession.year_name;
        activeSessionId = activeSession.id;
        document.getElementById('currentSessionBadge').textContent = `Session: ${activeSessionName}`;
      } else {
        document.getElementById('currentSessionBadge').textContent = `Session: Setup Required`;
        document.getElementById('currentSessionBadge').className = "session-indicator bg-danger text-white border-0";
      }
    } catch (err) {
      console.error('Fetch session scope error:', err);
    }
  }

  // LOGOUT HANDLERS
  const triggerLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) window.location.href = '/login.html';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  document.getElementById('logoutBtn').addEventListener('click', triggerLogout);
  document.getElementById('navLogoutBtn').addEventListener('click', triggerLogout);


  // ==========================================
  // PANE 1: OVERVIEW & NOTICES
  // ==========================================
  async function loadDashboardOverview() {
    try {
      if (!teacherId || !activeSessionId) return;

      // 1. Fetch teacher assignments
      const assignRes = await fetch(`/api/teachers/assignments?teacherId=${teacherId}&academicYearId=${activeSessionId}`);
      assignedMappings = await assignRes.json();

      // Calculate stats
      const uniqueClasses = new Set(assignedMappings.map(a => a.class_id));
      document.getElementById('cardAssignedClasses').textContent = uniqueClasses.size;
      document.getElementById('cardActiveSession').textContent = activeSessionName;

      // Calculate total strength of students in assigned classes
      let totalStudentsCount = 0;
      if (uniqueClasses.size > 0) {
        const studRes = await fetch(`/api/students?academicYearId=${activeSessionId}`);
        const students = await studRes.json();
        students.forEach(s => {
          if (s.StudentEnrollments && s.StudentEnrollments.length > 0) {
            const activeEnrollment = s.StudentEnrollments.find(e => e.academic_year_id === Number(activeSessionId));
            if (activeEnrollment && uniqueClasses.has(activeEnrollment.class_id)) {
              totalStudentsCount++;
            }
          }
        });
      }
      document.getElementById('cardTotalStudents').textContent = totalStudentsCount;

      // 2. Fetch notice board
      const noticeRes = await fetch('/api/notices');
      const notices = await noticeRes.json();
      const area = document.getElementById('teacherNoticeBoardArea');
      area.innerHTML = '';

      if (notices.length === 0) {
        area.innerHTML = `<div class="text-center text-muted p-3 border rounded bg-light">No notices posted from the Principal.</div>`;
        return;
      }

      notices.forEach(n => {
        area.innerHTML += `
          <div class="notice-card">
            <div class="notice-card-header">
              <h6 class="notice-card-title m-0 fw-bold">${n.title}</h6>
              <span class="notice-card-date">Posted: ${n.date}</span>
            </div>
            <div class="notice-card-body mt-2">${n.message}</div>
          </div>
        `;
      });

    } catch (err) {
      console.error('Teacher dashboard stats load error:', err);
    }
  }


  // ==========================================
  // PANE 2: STUDENT ATTENDANCE REGISTRY
  // ==========================================
  async function loadAttendanceView() {
    try {
      if (assignedMappings.length === 0 && teacherId && activeSessionId) {
        const assignRes = await fetch(`/api/teachers/assignments?teacherId=${teacherId}&academicYearId=${activeSessionId}`);
        assignedMappings = await assignRes.json();
      }

      // Populate class filter from teacher's assigned classes
      const uniqueClassesMap = {};
      assignedMappings.forEach(a => {
        uniqueClassesMap[a.class_id] = `${a.Class.class_name} - Sec ${a.Class.section}`;
      });

      const uniqueEntries = Object.entries(uniqueClassesMap);
      const select = document.getElementById('attendanceClassSelect');
      if (uniqueEntries.length === 1) {
        select.innerHTML = `<option value="${uniqueEntries[0][0]}" selected>${uniqueEntries[0][1]}</option>`;
      } else {
        select.innerHTML = '<option value="" disabled selected>Select Class</option>';
        for (const [classId, name] of uniqueEntries) {
          select.innerHTML += `<option value="${classId}">${name}</option>`;
        }
      }

      // Default date to today
      document.getElementById('attendanceDate').value = new Date().toISOString().split('T')[0];
    } catch (err) {
      console.error(err);
    }
  }

  // Helper to recalculate teacher live counters
  function updateTeacherLiveCounters() {
    const pCount = document.querySelectorAll('.student-att-radio[value="Present"]:checked').length;
    const aCount = document.querySelectorAll('.student-att-radio[value="Absent"]:checked').length;
    const lCount = document.querySelectorAll('.student-att-radio[value="Leave"]:checked').length;

    const elP = document.getElementById('teacherLiveCountP');
    const elA = document.getElementById('teacherLiveCountA');
    const elL = document.getElementById('teacherLiveCountL');
    if (elP) elP.textContent = pCount;
    if (elA) elA.textContent = aCount;
    if (elL) elL.textContent = lCount;
  }

  // Load students to mark attendance
  const loadAttendanceStudentsBtn = document.getElementById('loadAttendanceStudentsBtn');
  if (loadAttendanceStudentsBtn) {
    loadAttendanceStudentsBtn.addEventListener('click', async () => {
      const classId = document.getElementById('attendanceClassSelect').value;
      const date = document.getElementById('attendanceDate').value;

      if (!classId || !date || !activeSessionId) {
        alert('Please specify Class and Date.');
        return;
      }

      const statusBadge = document.getElementById('teacherAttStatusBadge');
      if (statusBadge) {
        statusBadge.innerHTML = '<span class="spinner-border spinner-border-sm text-primary"></span>';
      }

      try {
        const [studRes, logsRes, statRes] = await Promise.all([
          fetch(`/api/students?classId=${classId}&academicYearId=${activeSessionId}`),
          fetch(`/api/attendance?classId=${classId}&date=${date}&academicYearId=${activeSessionId}`),
          fetch(`/api/attendance/status?classId=${classId}&date=${date}&academicYearId=${activeSessionId}`)
        ]);

        const students = await studRes.json();
        const logs = await logsRes.json();
        const statData = await statRes.json();

        if (statusBadge) {
          if (statData.marked) {
            statusBadge.innerHTML = `<span class="badge bg-success px-2 py-1"><i class="fa-solid fa-circle-check me-1"></i>Saved (${statData.markedCount} records)</span>`;
          } else {
            statusBadge.innerHTML = `<span class="badge bg-warning text-dark px-2 py-1"><i class="fa-solid fa-clock me-1"></i>Not Yet Saved</span>`;
          }
        }

        // Create log map
        const logMap = {};
        logs.forEach(l => {
          logMap[l.student_id] = l.status;
        });

        const tbody = document.querySelector('#attendanceMarkTable tbody');
        tbody.innerHTML = '';

        if (students.length === 0) {
          tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No students currently enrolled in this class.</td></tr>`;
          document.getElementById('attendanceEntryArea').classList.add('d-none');
          return;
        }

        students.forEach(s => {
          const status = logMap[s.id] || 'Present';
          const att = s.totalAttendance || { Present: 0, Absent: 0, Leave: 0 };
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td class="fw-semibold">${s.roll_number}</td>
            <td class="fw-bold">${s.name} <br><small class="text-muted">Total: P:${att.Present} A:${att.Absent} L:${att.Leave}</small></td>
            <td>${s.father_name}</td>
            <td>
              <div class="form-check form-check-inline">
                <input class="form-check-input student-att-radio" type="radio" name="att-${s.id}" id="p-${s.id}" value="Present" ${status === 'Present' ? 'checked' : ''}>
                <label class="form-check-label text-success fw-bold" for="p-${s.id}">Present</label>
              </div>
              <div class="form-check form-check-inline">
                <input class="form-check-input student-att-radio" type="radio" name="att-${s.id}" id="a-${s.id}" value="Absent" ${status === 'Absent' ? 'checked' : ''}>
                <label class="form-check-label text-danger fw-bold" for="a-${s.id}">Absent</label>
              </div>
              <div class="form-check form-check-inline">
                <input class="form-check-input student-att-radio" type="radio" name="att-${s.id}" id="l-${s.id}" value="Leave" ${status === 'Leave' ? 'checked' : ''}>
                <label class="form-check-label text-warning fw-bold" for="l-${s.id}">Leave</label>
              </div>
            </td>
          `;
          tbody.appendChild(tr);
        });

        document.querySelectorAll('.student-att-radio').forEach(r => {
          r.addEventListener('change', updateTeacherLiveCounters);
        });
        updateTeacherLiveCounters();

        document.getElementById('attendanceEntryArea').classList.remove('d-none');

      } catch (err) {
        console.error(err);
      }
    });
  }

  // Quick mark all present / absent
  document.getElementById('btnTeacherMarkAllPresent')?.addEventListener('click', () => {
    document.querySelectorAll('.student-att-radio[value="Present"]').forEach(r => { r.checked = true; });
    updateTeacherLiveCounters();
  });

  document.getElementById('btnTeacherMarkAllAbsent')?.addEventListener('click', () => {
    document.querySelectorAll('.student-att-radio[value="Absent"]').forEach(r => { r.checked = true; });
    updateTeacherLiveCounters();
  });

  // Save student attendance logs
  const saveStudentAttendanceBtn = document.getElementById('saveStudentAttendanceBtn');
  if (saveStudentAttendanceBtn) {
    saveStudentAttendanceBtn.addEventListener('click', async () => {
      const classId = document.getElementById('attendanceClassSelect').value;
      const date = document.getElementById('attendanceDate').value;
      
      const radios = document.querySelectorAll('.student-att-radio:checked');
      const logs = Array.from(radios).map(r => ({
        studentId: r.name.split('-')[1],
        status: r.value
      }));

      saveStudentAttendanceBtn.disabled = true;
      saveStudentAttendanceBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

      try {
        const res = await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ logs, date, classId, academicYearId: activeSessionId })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        showAlert('Class attendance registered successfully.');
        document.getElementById('loadAttendanceStudentsBtn').click();
      } catch (err) {
        alert('Failed to save attendance: ' + err.message);
      } finally {
        saveStudentAttendanceBtn.disabled = false;
        saveStudentAttendanceBtn.innerHTML = '<i class="fa-solid fa-save me-2"></i>Save Student Attendance';
      }
    });
  }


  // ==========================================
  // PANE 3: RESULTS REGISTRY
  // ==========================================
  async function loadResultsView() {
    try {
      if (assignedMappings.length === 0 && teacherId && activeSessionId) {
        const assignRes = await fetch(`/api/teachers/assignments?teacherId=${teacherId}&academicYearId=${activeSessionId}`);
        assignedMappings = await assignRes.json();
      }

      // Populate class selector dropdowns
      const selects = [
        document.getElementById('resultClassSelect'),
        document.getElementById('searchCardClass')
      ];

      selects.forEach(select => {
        if (!select) return;
        const uniqueClassesMap = {};
        assignedMappings.forEach(a => {
          uniqueClassesMap[a.class_id] = `${a.Class.class_name} - Sec ${a.Class.section}`;
        });

        const uniqueEntries = Object.entries(uniqueClassesMap);
        if (uniqueEntries.length === 1) {
          select.innerHTML = `<option value="${uniqueEntries[0][0]}" selected>${uniqueEntries[0][1]}</option>`;
          // Auto-trigger change to load subjects if it's the result marks class select
          if (select.id === 'resultClassSelect') {
            setTimeout(() => select.dispatchEvent(new Event('change')), 100);
          }
        } else {
          select.innerHTML = '<option value="" disabled selected>Select Class</option>';
          for (const [classId, name] of uniqueEntries) {
            select.innerHTML += `<option value="${classId}">${name}</option>`;
          }
        }
      });
    } catch (err) {
      console.error(err);
    }
  }

  // ── Custom Exam Type Toggle ──────────────────────────────
  function setupExamTypeToggle(selectId, customInputId) {
    const sel = document.getElementById(selectId);
    const inp = document.getElementById(customInputId);
    if (!sel || !inp) return;
    sel.addEventListener('change', () => {
      if (sel.value === '__custom__') {
        inp.classList.remove('d-none');
        inp.focus();
      } else {
        inp.classList.add('d-none');
        inp.value = '';
      }
    });
  }

  // Helper — returns the real exam type string
  function getExamType(selectId, customInputId) {
    const sel = document.getElementById(selectId);
    const inp = document.getElementById(customInputId);
    if (!sel) return '';
    if (sel.value === '__custom__') {
      return inp ? inp.value.trim() : '';
    }
    return sel.value;
  }

  setupExamTypeToggle('resultExamType', 'resultExamTypeCustom');
  setupExamTypeToggle('searchCardExam', 'searchCardExamCustom');
  // ────────────────────────────────────────────────────────

  // Filter subjects based on selected class (fetched from database API)
  const resultClassSelect = document.getElementById('resultClassSelect');
  if (resultClassSelect) {
    resultClassSelect.addEventListener('change', async function() {
      const classId = Number(this.value);
      const subSelect = document.getElementById('resultSubjectSelect');
      subSelect.innerHTML = `<option value="" disabled selected>Loading Subjects...</option>`;
      subSelect.disabled = true;

      try {
        const res = await fetch(`/api/subjects?classId=${classId}`);
        const subjects = await res.json();
        
        subSelect.innerHTML = `<option value="" disabled selected>Select Subject</option>`;
        if (subjects.length > 0) {
          subjects.forEach(sub => {
            subSelect.innerHTML += `<option value="${sub.id}">${sub.subject_name}</option>`;
          });
          subSelect.disabled = false;
        } else {
          subSelect.innerHTML = `<option value="" disabled selected>No subjects configured. Add one first!</option>`;
        }
      } catch (err) {
        console.error(err);
        subSelect.innerHTML = `<option value="" disabled selected>Failed to load subjects</option>`;
      }
    });
  }

  // Load student registers to enter marks
  const loadResultEntryBtn = document.getElementById('loadResultEntryBtn');
  if (loadResultEntryBtn) {
    loadResultEntryBtn.addEventListener('click', async () => {
      const classId = document.getElementById('resultClassSelect').value;
      const subjectId = document.getElementById('resultSubjectSelect').value;
      const examType = getExamType('resultExamType', 'resultExamTypeCustom');

      if (!classId || !subjectId || !examType || !activeSessionId) {
        alert('Please select Class, Subject, and Exam / Term Type.');
        return;
      }

      try {
        // Fetch Subject details first (total marks)
        const subRes = await fetch(`/api/subjects?classId=${classId}`);
        const subjects = await subRes.json();
        const activeSub = subjects.find(s => s.id === Number(subjectId));
        const maxMarks = activeSub ? Number(activeSub.total_marks) : 100;
        const passMarks = activeSub ? Number(activeSub.passing_marks) : 33;

        document.getElementById('marksTableSubjectTitle').textContent = `${activeSub ? activeSub.subject_name : 'Subject'} Marks Register`;
        document.getElementById('marksTableSubjectMeta').textContent = `Max Marks: ${maxMarks} | Passing Marks: ${passMarks}`;

        // Fetch students and existing marks logs
        const [studRes, resultsRes] = await Promise.all([
          fetch(`/api/students?classId=${classId}&academicYearId=${activeSessionId}`),
          fetch(`/api/results?classId=${classId}&academicYearId=${activeSessionId}&examType=${encodeURIComponent(examType)}`)
        ]);

        const students = await studRes.json();
        const results = await resultsRes.json();

        // Check if any results for this class and exam are locked
        const isExamLocked = Array.isArray(results) && results.some(r => r.is_locked);
        const lockBanner = document.getElementById('resultLockedAlertBanner');
        const saveBtn = document.getElementById('saveMarksBtn');

        if (isExamLocked) {
          if (lockBanner) lockBanner.classList.remove('d-none');
          if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.classList.add('disabled');
          }
        } else {
          if (lockBanner) lockBanner.classList.add('d-none');
          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.classList.remove('disabled');
          }
        }

        // Create mapping of student obtained marks & remarks
        const marksMap = {};
        if (Array.isArray(results)) {
          results.forEach(resRecord => {
            const detail = (resRecord.ResultSubjects || []).find(rs => rs.subject_id === Number(subjectId));
            marksMap[resRecord.student_id] = {
              obtained: detail ? detail.marks : '',
              remarks: resRecord.remarks || ''
            };
          });
        }

        const tbody = document.querySelector('#marksEntryTable tbody');
        tbody.innerHTML = '';

        if (!Array.isArray(students) || students.length === 0) {
          tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No students currently enrolled in this class.</td></tr>`;
          document.getElementById('marksEntryArea').classList.add('d-none');
          return;
        }

        document.getElementById('marksEntryClassCount').textContent = `${students.length} Students`;

        students.forEach(s => {
          const score = marksMap[s.id] || { obtained: '', remarks: '' };
          const tr = document.createElement('tr');
          tr.dataset.studentId = s.id;
          tr.dataset.passMarks = passMarks;
          tr.dataset.maxMarks = maxMarks;

          let initialStatusBadge = '<span class="text-muted small">Not Entered</span>';
          if (score.obtained !== '') {
            const isPass = Number(score.obtained) >= passMarks;
            initialStatusBadge = isPass 
              ? '<span class="badge bg-success px-2 py-1">Pass</span>' 
              : '<span class="badge bg-danger px-2 py-1">Fail</span>';
          }

          tr.innerHTML = `
            <td class="fw-semibold">${s.roll_number || '-'}</td>
            <td class="fw-bold">${s.name}</td>
            <td class="text-muted">${s.father_name || 'N/A'}</td>
            <td>
              <input type="number" class="form-control form-control-sm student-marks-input" 
                     data-student-id="${s.id}" min="0" max="${maxMarks}" value="${score.obtained}" 
                     placeholder="0 - ${maxMarks}" ${isExamLocked ? 'disabled' : ''} oninput="updateTeacherLivePassFail(this)">
            </td>
            <td class="text-center teacher-sub-status-cell">
              ${initialStatusBadge}
            </td>
            <td>
              <input type="text" class="form-control form-control-sm student-remarks-input" 
                     data-student-id="${s.id}" value="${score.remarks}" placeholder="Progress notes..." ${isExamLocked ? 'disabled' : ''}>
            </td>
          `;
          tbody.appendChild(tr);
        });

        document.getElementById('marksEntryArea').classList.remove('d-none');

      } catch (err) {
        console.error('Load student register error:', err);
        alert('Failed to load student register.');
      }
    });
  }

  // Live Pass/Fail helper for teacher table
  window.updateTeacherLivePassFail = function(input) {
    const row = input.closest('tr');
    const passMarks = Number(row.dataset.passMarks);
    const maxMarks = Number(row.dataset.maxMarks);
    const val = input.value.trim();
    const cell = row.querySelector('.teacher-sub-status-cell');

    if (val === '') {
      input.classList.remove('is-invalid');
      cell.innerHTML = '<span class="text-muted small">Not Entered</span>';
      return;
    }

    const num = Number(val);
    if (num > maxMarks) {
      input.classList.add('is-invalid');
      cell.innerHTML = '<span class="text-danger small">Exceeds Max</span>';
    } else if (num < 0) {
      input.classList.add('is-invalid');
      cell.innerHTML = '<span class="text-danger small">Negative</span>';
    } else {
      input.classList.remove('is-invalid');
      cell.innerHTML = num >= passMarks ? '<span class="badge bg-success px-2 py-1">Pass</span>' : '<span class="badge bg-danger px-2 py-1">Fail</span>';
    }
  };

  // Save subject marks logs
  const saveMarksBtn = document.getElementById('saveMarksBtn');
  if (saveMarksBtn) {
    saveMarksBtn.addEventListener('click', async () => {
      const classId = document.getElementById('resultClassSelect').value;
      const subjectId = document.getElementById('resultSubjectSelect').value;
      const examType = getExamType('resultExamType', 'resultExamTypeCustom');
      if (!examType) { alert('Please enter a valid Exam / Term type.'); return; }

      const marksInputs = document.querySelectorAll('.student-marks-input');
      const remarksInputs = document.querySelectorAll('.student-remarks-input');

      // Setup map for remarks
      const remarksMap = {};
      remarksInputs.forEach(rem => {
        remarksMap[rem.getAttribute('data-student-id')] = rem.value.trim();
      });

      let hasError = false;
      const savePromises = [];

      for (const input of marksInputs) {
        const studentId = input.getAttribute('data-student-id');
        const obtained = input.value.trim();
        const remarks = remarksMap[studentId];

        if (obtained === '') continue; // Skip empty fields

        const obtainedMarks = Number(obtained);
        const maxMarks = Number(input.closest('tr').dataset.maxMarks || 100);

        if (isNaN(obtainedMarks) || obtainedMarks < 0 || obtainedMarks > maxMarks) {
          alert(`Marks value out of range for Roll #${input.closest('tr').children[0].textContent}. It must be between 0 and ${maxMarks}.`);
          input.classList.add('is-invalid');
          hasError = true;
          break;
        }

        // Submits student score
        const payload = {
          studentId: Number(studentId),
          classId: Number(classId),
          academicYearId: activeSessionId,
          examType,
          remarks,
          marks: [{ subjectId: Number(subjectId), obtainedMarks }]
        };

        savePromises.push(
          fetch('/api/results/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
        );
      }

      if (hasError) return;
      if (savePromises.length === 0) {
        alert('Please enter marks for at least one student.');
        return;
      }

      try {
        saveMarksBtn.disabled = true;
        saveMarksBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving Results...';

        const responses = await Promise.all(savePromises);
        let allOk = true;
        let errorMessage = '';

        for (const res of responses) {
          if (!res.ok) {
            allOk = false;
            const errData = await res.json().catch(() => ({}));
            errorMessage = errData.error || 'Failed to save marks.';
          }
        }

        if (allOk) {
          showAlert('Subject exam marks saved and result metrics calculated successfully.');
          document.getElementById('marksEntryArea').classList.add('d-none');
          document.getElementById('resultClassSelect').value = '';
          document.getElementById('resultSubjectSelect').value = '';
          document.getElementById('resultSubjectSelect').disabled = true;
        } else {
          showAlert(errorMessage || 'Some records failed to save. Please recheck.', 'danger');
        }
      } catch (err) {
        console.error('Save marks error:', err);
        showAlert('An error occurred while saving marks.', 'danger');
      } finally {
        saveMarksBtn.disabled = false;
        saveMarksBtn.innerHTML = '<i class="fa-solid fa-save me-2"></i>Save & Calculate Results';
      }
    });
  }

  // Load Result Cards list for printing
  let cachedTeacherCardsList = [];
  const loadResultCardsListBtn = document.getElementById('loadResultCardsListBtn');
  if (loadResultCardsListBtn) {
    loadResultCardsListBtn.addEventListener('click', async () => {
      const classId = document.getElementById('searchCardClass').value;
      const examType = getExamType('searchCardExam', 'searchCardExamCustom');

      if (!classId || !examType || !activeSessionId) {
        alert('Please specify Class and Exam / Term Type.');
        return;
      }

      try {
        const res = await fetch(`/api/results?classId=${classId}&academicYearId=${activeSessionId}&examType=${encodeURIComponent(examType)}`);
        const cards = await res.json();
        if (!res.ok) throw new Error(cards.error);

        cachedTeacherCardsList = cards;
        const bulkBtn = document.getElementById('teacherBulkPrintCardsBtn');

        const tbody = document.querySelector('#resultCardsTable tbody');
        tbody.innerHTML = '';

        if (cards.length === 0) {
          tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">No result cards generated yet for this class & exam.</td></tr>`;
          if (bulkBtn) bulkBtn.disabled = true;
          return;
        }

        if (bulkBtn) bulkBtn.disabled = false;

        cards.forEach(c => {
          const overallBadge = c.overall_status === 'Pass'
            ? '<span class="badge bg-success px-2 py-1">Pass</span>'
            : '<span class="badge bg-danger px-2 py-1">Fail</span>';

          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td class="text-center fw-bold">${c.position || '-'}</td>
            <td class="fw-semibold">${c.Student ? c.Student.roll_number : '-'}</td>
            <td class="fw-bold">${c.Student ? c.Student.name : '-'}</td>
            <td>${c.Class ? c.Class.class_name : '-'} (${c.Class ? c.Class.section : '-'})</td>
            <td class="text-center fw-bold text-primary">${c.percentage}%</td>
            <td class="text-center"><span class="badge bg-primary px-2 py-1">${c.grade}</span></td>
            <td class="text-center">${overallBadge}</td>
            <td class="text-end">
              <button class="btn btn-sm btn-primary view-card-btn" data-id="${c.id}"><i class="fa-solid fa-eye me-1"></i>View Card</button>
            </td>
          `;
          tbody.appendChild(tr);
        });

        // Bind view card buttons
        document.querySelectorAll('.view-card-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const resultId = btn.getAttribute('data-id');
            printStudentResultCard(resultId);
          });
        });

      } catch (err) {
        console.error('Load teacher cards error:', err);
        alert(err.message || 'Failed to load result cards.');
      }
    });
  }

  // Teacher Bulk Print All Cards
  const teacherBulkPrintBtn = document.getElementById('teacherBulkPrintCardsBtn');
  if (teacherBulkPrintBtn) {
    teacherBulkPrintBtn.addEventListener('click', async () => {
      if (!cachedTeacherCardsList || cachedTeacherCardsList.length === 0) {
        alert('No cards loaded to print.');
        return;
      }

      teacherBulkPrintBtn.disabled = true;
      teacherBulkPrintBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Preparing...';

      try {
        // Build all card HTML first
        let allCardsHtml = '';
        for (let i = 0; i < cachedTeacherCardsList.length; i++) {
          const res = await fetch(`/api/results/${cachedTeacherCardsList[i].id}`);
          const fullCardData = await res.json();
          const cardHtml = generateTeacherResultCardHtml(fullCardData);
          const divider = i < cachedTeacherCardsList.length - 1 ? ' page-break' : '';
          allCardsHtml += `<div class="${divider}">${cardHtml}</div>`;
        }

        // Use hidden iframe to avoid popup-blocker hang
        const oldFrame = document.getElementById('__bulkPrintFrame');
        if (oldFrame) oldFrame.remove();

        const iframe = document.createElement('iframe');
        iframe.id = '__bulkPrintFrame';
        iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;';
        document.body.appendChild(iframe);

        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open();
        doc.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Bulk Result Cards</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
    <style>
      body { margin: 0; padding: 10px; background: #fff; }
      .result-card-print-area { border: 2px solid #333 !important; padding: 25px !important; }
      @media print {
        .page-break { page-break-after: always; break-after: page; }
        body { margin: 0; padding: 10px; }
        @page { size: A4 portrait; margin: 10mm; }
      }
    </style>
  </head>
  <body>${allCardsHtml}</body>
</html>`);
        doc.close();

        iframe.onload = function () {
          setTimeout(() => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            setTimeout(() => iframe.remove(), 2000);
          }, 500);
        };
      } catch (e) {
        console.error('Bulk print error:', e);
        alert('Bulk print failed: ' + e.message);
      } finally {
        teacherBulkPrintBtn.disabled = false;
        teacherBulkPrintBtn.innerHTML = '<i class="fa-solid fa-print me-2"></i>Bulk Print All';
      }
    });
  }

  // Returns correct school name + subtitle based on class level
  function getSchoolInfo(className) {
    if (!className) return { name: 'Waseem Science & Commerce Academy', subtitle: 'Official Student Academic Performance Report' };
    const cn = className.toLowerCase();
    // Play Group / Nursery / KG / Prep / Class 1–5
    const numMatch = cn.match(/\d+/);
    if (!numMatch) {
      // No number found → Play Group / Nursery / KG
      return { name: 'Waseem Kids Campus School', subtitle: 'Official Student Academic Performance Report' };
    }
    const num = parseInt(numMatch[0]);
    if (num <= 5)  return { name: 'Waseem Kids Campus School',      subtitle: 'Official Student Academic Performance Report' };
    if (num <= 10) return { name: 'Waseem Model High School',       subtitle: 'Official Student Academic Performance Report' };
    return             { name: 'Waseem Science & Commerce Academy', subtitle: 'Official Student Academic Performance Report' };
  }

  function generateTeacherResultCardHtml(data) {
    const student = data.Student || {};
    const cls = data.Class || {};
    const session = data.AcademicYear || {};
    const marks = data.ResultSubjects || [];

    // Determine correct school name based on class level
    const schoolInfo = getSchoolInfo(cls.class_name || '');

    let subjectRowsHtml = '';
    marks.forEach(score => {
      const sub = score.Subject || {};
      const isPass = Number(score.marks) >= Number(sub.passing_marks || 33);
      subjectRowsHtml += `
        <tr>
          <td class="text-start ps-3 fw-bold">${sub.subject_name || 'Subject'}</td>
          <td class="text-center">${sub.total_marks || 100}</td>
          <td class="text-center">${sub.passing_marks || 33}</td>
          <td class="text-center fw-bold ${isPass ? 'text-primary' : 'text-danger'}">${score.marks}</td>
          <td class="text-center">
            <span class="badge ${isPass ? 'bg-success' : 'bg-danger'} px-2 py-1">${isPass ? 'Pass' : 'Fail'}</span>
          </td>
        </tr>
      `;
    });

    const overallBadge = data.overall_status === 'Pass'
      ? '<span class="badge bg-success px-3 py-2 fs-6">OVERALL PASS</span>'
      : '<span class="badge bg-danger px-3 py-2 fs-6">OVERALL FAIL</span>';

    return `
      <div class="result-card-print-area p-4 border rounded bg-white" style="max-width: 800px; margin: 0 auto; font-family: 'Segoe UI', Arial, sans-serif;">
        <!-- Header -->
        <div class="text-center pb-3 mb-3 border-bottom border-2">
          <div class="d-flex align-items-center justify-content-center gap-3 mb-2">
            <img src="/img/logo.png" alt="Logo" style="height: 60px; object-fit: contain;">
            <div>
              <h4 class="fw-bold text-uppercase mb-0" style="color: #1e3c72; letter-spacing: 0.5px;">${schoolInfo.name}</h4>
              <p class="text-muted small mb-0">${schoolInfo.subtitle}</p>
            </div>
          </div>
          <div class="badge bg-dark text-white px-3 py-1 fs-7 text-uppercase">${data.exam_type} - Session ${session.year_name || ''}</div>
        </div>

        <!-- Student Meta Profile -->
        <div class="row g-2 mb-3 p-3 bg-light rounded text-start">
          <div class="col-6 col-md-4">
            <span class="text-muted small">Student Name:</span>
            <div class="fw-bold text-dark">${student.name || '-'}</div>
          </div>
          <div class="col-6 col-md-4">
            <span class="text-muted small">Father's Name:</span>
            <div class="fw-bold text-dark">${student.father_name || 'N/A'}</div>
          </div>
          <div class="col-6 col-md-4">
            <span class="text-muted small">Roll Number:</span>
            <div class="fw-bold text-primary">${student.roll_number || '-'}</div>
          </div>
          <div class="col-6 col-md-4">
            <span class="text-muted small">Class & Section:</span>
            <div class="fw-bold text-dark">${cls.class_name || '-'} (${cls.section || '-'})</div>
          </div>
          <div class="col-6 col-md-4">
            <span class="text-muted small">Registration No:</span>
            <div class="fw-bold text-dark">${student.registration_number || 'N/A'}</div>
          </div>
          <div class="col-6 col-md-4">
            <span class="text-muted small">Class Position:</span>
            <div class="fw-bold text-warning fs-6"><i class="fa-solid fa-trophy me-1"></i>${data.position ? data.position + ' Place' : '-'}</div>
          </div>
        </div>

        <!-- Marks Matrix Table -->
        <div class="table-responsive mb-3">
          <table class="table table-bordered table-sm align-middle text-center mb-0">
            <thead style="background: #1e3c72; color: #ffffff;">
              <tr>
                <th class="text-start ps-3">Subject</th>
                <th style="width: 110px;">Total Marks</th>
                <th style="width: 110px;">Passing Marks</th>
                <th style="width: 130px;">Obtained Marks</th>
                <th style="width: 100px;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${subjectRowsHtml}
            </tbody>
          </table>
        </div>

        <!-- Summary Box -->
        <div class="row g-2 p-3 border rounded bg-light mb-4 text-center align-items-center">
          <div class="col-4 col-md-2">
            <span class="text-muted small">Total</span>
            <h5 class="fw-bold mb-0 text-dark">${data.total_marks}</h5>
          </div>
          <div class="col-4 col-md-2">
            <span class="text-muted small">Obtained</span>
            <h5 class="fw-bold mb-0 text-primary">${data.obtained_marks}</h5>
          </div>
          <div class="col-4 col-md-2">
            <span class="text-muted small">Percentage</span>
            <h5 class="fw-bold mb-0 text-dark">${data.percentage}%</h5>
          </div>
          <div class="col-4 col-md-2">
            <span class="text-muted small">Grade</span>
            <h5 class="fw-bold mb-0 text-success">${data.grade}</h5>
          </div>
          <div class="col-8 col-md-4">
            ${overallBadge}
          </div>
        </div>

        <!-- Remarks -->
        <div class="p-2 mb-4 bg-white border rounded text-start">
          <span class="text-muted small fw-semibold">Teacher / Principal Remarks:</span>
          <p class="mb-0 text-dark fst-italic ps-2">${data.remarks || 'Student demonstrated satisfactory class progress.'}</p>
        </div>

        <!-- Signature lines -->
        <div class="d-flex justify-content-between pt-4 mt-3 border-top text-center">
          <div style="width: 180px;">
            <div class="border-top border-dark pt-1 small fw-semibold">Class Teacher Sign</div>
          </div>
          <div style="width: 180px;">
            <div class="border-top border-dark pt-1 small fw-semibold">Exam Controller</div>
          </div>
          <div style="width: 180px;">
            <div class="border-top border-dark pt-1 small fw-semibold">Principal / In-Charge</div>
          </div>
        </div>
      </div>
    `;
  }

  // Stores last loaded student name for PDF filename
  let _lastCardStudentName = 'result_card';

  // VIEW RESULT CARD — opens modal with card preview
  async function printStudentResultCard(id) {
    try {
      const res = await fetch(`/api/results/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load result.');

      const container = document.getElementById('teacherPrintableCardContainer');
      if (!container) return;

      // Store student name for PDF filename
      _lastCardStudentName = (data.Student && data.Student.name) ? data.Student.name.replace(/\s+/g, '_') : 'result_card';

      // Inject card HTML
      container.innerHTML = generateTeacherResultCardHtml(data);

      // Use getOrCreateInstance to avoid blank modal on re-open
      const modalEl = document.getElementById('teacherResultCardModal');
      const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
      modal.show();
    } catch (err) {
      console.error('View card error:', err);
      alert(err.message || 'Failed to render result card.');
    }
  }

  // DOWNLOAD PDF button handler
  const btnDownloadPdf = document.getElementById('btnTeacherDownloadPdf');
  if (btnDownloadPdf) {
    btnDownloadPdf.addEventListener('click', () => {
      const container = document.getElementById('teacherPrintableCardContainer');
      if (!container || container.innerHTML.trim() === '') {
        alert('No result card loaded.');
        return;
      }

      const originalText = btnDownloadPdf.innerHTML;
      btnDownloadPdf.disabled = true;
      btnDownloadPdf.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Generating PDF...';

      const opt = {
        margin:       [8, 8, 8, 8],
        filename:     `Result_Card_${_lastCardStudentName}.pdf`,
        image:        { type: 'jpeg', quality: 0.97 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // Clone the card element so modal styling doesn't interfere
      const cardEl = container.querySelector('.result-card-print-area') || container;

      html2pdf().set(opt).from(cardEl).save().then(() => {
        btnDownloadPdf.disabled = false;
        btnDownloadPdf.innerHTML = originalText;
      }).catch(err => {
        console.error('PDF generation error:', err);
        alert('PDF generation failed: ' + err.message);
        btnDownloadPdf.disabled = false;
        btnDownloadPdf.innerHTML = originalText;
      });
    });
  }


  // ==========================================
  // PANE 5: MANAGE SUBJECTS LOGIC
  // ==========================================
  async function loadTeacherSubjectsView() {
    try {
      if (!teacherId || !activeSessionId) return;

      // 1. Fetch teacher assignments if not already loaded
      if (assignedMappings.length === 0) {
        const assignRes = await fetch(`/api/teachers/assignments?teacherId=${teacherId}&academicYearId=${activeSessionId}`);
        assignedMappings = await assignRes.json();
      }

      // 2. Populate Class Dropdowns (for both add form and filter dropdown)
      const selectAdd = document.getElementById('subjectClassSelect');
      const selectFilter = document.getElementById('filterClassSubjects');
      // Extract unique classes
      const uniqueClasses = [];
      const classMap = new Set();
      assignedMappings.forEach(mapping => {
        if (mapping.Class && !classMap.has(mapping.Class.id)) {
          classMap.add(mapping.Class.id);
          uniqueClasses.push(mapping.Class);
        }
      });

      if (uniqueClasses.length === 1) {
        const cls = uniqueClasses[0];
        const optionHtml = `<option value="${cls.id}" selected>${cls.class_name} - Sec ${cls.section}</option>`;
        selectAdd.innerHTML = optionHtml;
        selectFilter.innerHTML = optionHtml;
        loadClassSubjectsList(cls.id);
      } else {
        selectAdd.innerHTML = '<option value="" disabled selected>Select Class</option>';
        selectFilter.innerHTML = '<option value="" disabled selected>Select Class to View Subjects</option>';
        uniqueClasses.forEach(cls => {
          const optionHtml = `<option value="${cls.id}">${cls.class_name} - Sec ${cls.section}</option>`;
          selectAdd.innerHTML += optionHtml;
          selectFilter.innerHTML += optionHtml;
        });
      }

      // Reset table to default state
      document.querySelector('#teacherSubjectsTable tbody').innerHTML = `
        <tr><td colspan="4" class="text-center text-muted">Please select a class to load subjects</td></tr>
      `;
    } catch (err) {
      console.error('loadTeacherSubjectsView error:', err);
    }
  }

  // Handle Class Subject List Filtering
  const filterClassSubjects = document.getElementById('filterClassSubjects');
  if (filterClassSubjects) {
    filterClassSubjects.addEventListener('change', async function() {
      const classId = this.value;
      await loadClassSubjectsList(classId);
    });
  }

  async function loadClassSubjectsList(classId) {
    try {
      const res = await fetch(`/api/subjects?classId=${classId}`);
      const subjects = await res.json();

      const tbody = document.querySelector('#teacherSubjectsTable tbody');
      tbody.innerHTML = '';

      if (subjects.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No subjects found for this class. Feel free to add one!</td></tr>`;
        return;
      }

      subjects.forEach(sub => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="fw-bold">${sub.subject_name}</td>
          <td>${sub.total_marks}</td>
          <td>${sub.passing_marks}</td>
          <td>
            <button class="btn btn-sm btn-danger delete-subject-btn" data-id="${sub.id}" data-class-id="${classId}"><i class="fa-solid fa-trash"></i></button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      // Bind delete buttons
      document.querySelectorAll('.delete-subject-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (confirm('Are you sure you want to delete this subject? All results mapped to it will also be lost.')) {
            const subId = btn.getAttribute('data-id');
            const clsId = btn.getAttribute('data-class-id');
            await deleteSubject(subId, clsId);
          }
        });
      });
    } catch (err) {
      console.error('loadClassSubjectsList error:', err);
    }
  }

  async function deleteSubject(subId, classId) {
    try {
      const res = await fetch(`/api/subjects/${subId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showAlert('Subject deleted successfully.');
      await loadClassSubjectsList(classId);
    } catch (err) {
      showAlert(err.message, 'danger');
    }
  }

  // Handle Subject creation form submit
  const teacherCreateSubjectForm = document.getElementById('teacherCreateSubjectForm');
  if (teacherCreateSubjectForm) {
    teacherCreateSubjectForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const class_id = document.getElementById('subjectClassSelect').value;
      const subject_name = document.getElementById('subjectName').value.trim();
      const total_marks = document.getElementById('subjectTotalMarks').value;
      const passing_marks = document.getElementById('subjectPassingMarks').value;

      try {
        const res = await fetch('/api/subjects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ class_id, subject_name, total_marks, passing_marks })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        showAlert('Subject configured and saved successfully.');
        teacherCreateSubjectForm.reset();
        
        // Auto-select filter class and reload list to show new subject
        document.getElementById('filterClassSubjects').value = class_id;
        await loadClassSubjectsList(class_id);
      } catch (err) {
        showAlert(err.message, 'danger');
      }
    });
  }


  // ==========================================
  // PANE 4: CHANGE PASSWORD FOR PORTAL
  // ==========================================
  document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;

    if (newPassword !== confirmNewPassword) {
      alert('New passwords do not match.');
      return;
    }

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showAlert('Your portal login password has been changed successfully.');
      document.getElementById('changePasswordForm').reset();
    } catch (error) {
      alert(error.message);
    }
  });

  // Settings Change Password Toggles
  const toggles = [
    { btn: 'toggleCurrentPassword', field: 'currentPassword', icon: 'toggleCurrentPasswordIcon' },
    { btn: 'toggleNewPassword', field: 'newPassword', icon: 'toggleNewPasswordIcon' },
    { btn: 'toggleConfirmNewPassword', field: 'confirmNewPassword', icon: 'toggleConfirmNewPasswordIcon' }
  ];

  toggles.forEach(t => {
    const btnEl = document.getElementById(t.btn);
    const fieldEl = document.getElementById(t.field);
    const iconEl = document.getElementById(t.icon);

    if (btnEl && fieldEl && iconEl) {
      btnEl.addEventListener('click', () => {
        const type = fieldEl.getAttribute('type') === 'password' ? 'text' : 'password';
        fieldEl.setAttribute('type', type);
        
        if (type === 'password') {
          iconEl.classList.remove('fa-eye-slash');
          iconEl.classList.add('fa-eye');
        } else {
          iconEl.classList.remove('fa-eye');
          iconEl.classList.add('fa-eye-slash');
        }
      });
    }
  });

  // --- TEACHER STUDENTS MANAGEMENT MODULE ---
  async function loadTeacherStudentsView() {
    try {
      // 1. Ensure assigned mappings are loaded
      if (assignedMappings.length === 0) {
        const assignRes = await fetch(`/api/teachers/assignments?teacherId=${teacherId}&academicYearId=${activeSessionId}`);
        assignedMappings = await assignRes.json();
      }

      // 2. Populate Class filter dropdown and Admission class dropdown
      const filterSelect = document.getElementById('teacherStudentClassFilter');
      const admissionSelect = document.getElementById('admissionClassSelect');

      // Extract unique classes assigned to teacher
      const uniqueClasses = [];
      const classMap = new Set();
      assignedMappings.forEach(mapping => {
        if (mapping.Class && !classMap.has(mapping.Class.id)) {
          classMap.add(mapping.Class.id);
          uniqueClasses.push(mapping.Class);
        }
      });

      // Reset dropdowns
      admissionSelect.innerHTML = '<option value="" disabled selected>Select Class</option>';

      if (uniqueClasses.length === 1) {
        const cls = uniqueClasses[0];
        filterSelect.innerHTML = `<option value="${cls.id}" selected>${cls.class_name} - Sec ${cls.section}</option>`;
        admissionSelect.innerHTML = `<option value="${cls.id}" selected>${cls.class_name} - Sec ${cls.section}</option>`;
        const container = document.getElementById('teacherClassSelectContainer');
        if (container) container.style.display = 'none';
        
        // Directly load students of this class
        await fetchAndRenderStudents(cls.id);
      } else {
        filterSelect.innerHTML = '<option value="" disabled selected>Select Class</option>';
        const container = document.getElementById('teacherClassSelectContainer');
        if (container) container.style.display = 'block';
        
        uniqueClasses.forEach(cls => {
          const optionHtml = `<option value="${cls.id}">${cls.class_name} - Sec ${cls.section}</option>`;
          filterSelect.innerHTML += optionHtml;
          admissionSelect.innerHTML += optionHtml;
        });

        // Reset table
        document.querySelector('#teacherStudentsTable tbody').innerHTML = `
          <tr><td colspan="8" class="text-center text-muted">Select an assigned class to load students</td></tr>
        `;
      }
    } catch (err) {
      console.error('loadTeacherStudentsView error:', err);
    }
  }

  // Handle class filter changes
  const teacherStudentClassFilter = document.getElementById('teacherStudentClassFilter');
  if (teacherStudentClassFilter) {
    teacherStudentClassFilter.addEventListener('change', function() {
      const classId = this.value;
      if (classId) {
        fetchAndRenderStudents(classId);
      }
    });
  }

  // Handle Search Input in Student Directory
  const teacherStudentSearchInput = document.getElementById('teacherStudentSearchInput');
  if (teacherStudentSearchInput) {
    teacherStudentSearchInput.addEventListener('input', function() {
      const classId = document.getElementById('teacherStudentClassFilter').value;
      if (classId) {
        fetchAndRenderStudents(classId, this.value.trim());
      }
    });
  }

  async function fetchAndRenderStudents(classId, search = '') {
    try {
      let url = `/api/students?classId=${classId}&academicYearId=${activeSessionId}`;
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }
      const res = await fetch(url);
      const students = await res.json();

      const tbody = document.querySelector('#teacherStudentsTable tbody');
      tbody.innerHTML = '';

      if (students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No students found.</td></tr>`;
        return;
      }

      students.forEach(st => {
        const att = st.totalAttendance || { Present: 0, Absent: 0, Leave: 0 };
        const totalLog = att.Present + att.Absent + att.Leave;
        const attDisplay = totalLog > 0 ? `<span class="badge bg-success">P:${att.Present}</span> <span class="badge bg-danger">A:${att.Absent}</span> <span class="badge bg-warning">L:${att.Leave}</span>` : '<span class="text-muted">No Data</span>';

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${st.roll_number}</td>
          <td class="fw-bold">${st.name}</td>
          <td>${st.father_name}</td>
          <td>${st.StudentEnrollments && st.StudentEnrollments[0] && st.StudentEnrollments[0].Class ? st.StudentEnrollments[0].Class.class_name : 'N/A'}</td>
          <td>${st.contact || 'N/A'}</td>
          <td>${attDisplay}</td>
          <td>
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-outline-info view-student-btn" data-id="${st.id}"><i class="fa-solid fa-id-card"></i> View</button>
              <button class="btn btn-sm btn-outline-primary edit-student-btn" data-id="${st.id}"><i class="fa-solid fa-edit"></i> Edit</button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });

      // Bind edit handlers
      tbody.querySelectorAll('.edit-student-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const studentId = btn.getAttribute('data-id');
          openEditStudentModal(studentId);
        });
      });

      // Bind view handlers
      tbody.querySelectorAll('.view-student-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const studentId = btn.getAttribute('data-id');
          viewStudentProfile(studentId);
        });
      });
    } catch (err) {
      console.error('fetchAndRenderStudents error:', err);
    }
  }

  // Handle Photo Preview inside admission modal
  const studentPhoto = document.getElementById('studentPhoto');
  if (studentPhoto) {
    studentPhoto.addEventListener('change', function() {
      const file = this.files[0];
      if (file) {
        document.getElementById('studentPhotoPreview').src = URL.createObjectURL(file);
      }
    });
  }

  // Handle Form Submission for Admitting/Editing Student
  document.getElementById('studentAdmissionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeSessionId) {
      alert('Active session not loaded.');
      return;
    }

    const editId = document.getElementById('editStudentId').value;
    const formData = new FormData();
    formData.append('name', document.getElementById('studentName').value.trim());
    formData.append('father_name', document.getElementById('studentFather').value.trim());
    formData.append('dob', document.getElementById('studentDob').value);
    formData.append('gender', document.getElementById('studentGender').value);
    formData.append('class_id', document.getElementById('admissionClassSelect').value);
    formData.append('academic_year_id', activeSessionId);
    formData.append('admission_date', document.getElementById('studentAdmissionDate').value);
    formData.append('roll_number', document.getElementById('studentRoll').value.trim());
    formData.append('contact', document.getElementById('studentContact').value.trim());
    formData.append('blood_group', document.getElementById('studentBlood').value.trim());
    formData.append('guardian_name', document.getElementById('studentGuardian').value.trim());
    formData.append('guardian_phone', document.getElementById('studentGuardianPhone').value.trim());
    formData.append('emergency_contact', document.getElementById('studentEmergency').value.trim());
    formData.append('previous_school', document.getElementById('studentPrevSchool').value.trim());
    formData.append('address', document.getElementById('studentAddress').value.trim());

    const photoInput = document.getElementById('studentPhoto');
    if (photoInput.files[0]) {
      formData.append('photo', photoInput.files[0]);
    }

    const url = editId ? `/api/students/${editId}` : '/api/students';
    const method = editId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method: method,
        body: formData // multipart/form-data
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showAlert(editId ? 'Student profile updated successfully.' : 'Student admitted successfully.');
      document.getElementById('studentAdmissionForm').reset();
      document.getElementById('studentPhotoPreview').src = '/img/logo.png';
      
      const modalEl = document.getElementById('studentAdmissionModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      modal.hide();

      // Refresh directory list
      const classId = document.getElementById('teacherStudentClassFilter').value;
      if (classId) {
        fetchAndRenderStudents(classId);
      } else {
        loadTeacherStudentsView();
      }
    } catch (err) {
      alert(err.message);
    }
  });

  // Reset admission modal for fresh registration
  const studentAdmissionModal = document.getElementById('studentAdmissionModal');
  if (studentAdmissionModal) {
    studentAdmissionModal.addEventListener('show.bs.modal', function(e) {
      const triggerEl = e.relatedTarget;
      if (triggerEl && triggerEl.getAttribute('data-bs-target') === '#studentAdmissionModal' && !triggerEl.classList.contains('edit-student-btn')) {
        document.getElementById('studentAdmissionForm').reset();
        document.getElementById('editStudentId').value = '';
        document.getElementById('studentPhotoPreview').src = '/img/logo.png';
        document.getElementById('studentRoll').disabled = false;
        document.getElementById('studentAdmissionDate').value = new Date().toISOString().substring(0, 10);
      }
    });
  }

  async function openEditStudentModal(id) {
    try {
      const res = await fetch(`/api/students/${id}`);
      const st = await res.json();
      if (!res.ok) throw new Error(st.error);

      document.getElementById('editStudentId').value = st.id;
      document.getElementById('studentName').value = st.name;
      document.getElementById('studentFather').value = st.father_name;
      document.getElementById('studentDob').value = st.dob ? st.dob.substring(0, 10) : '';
      document.getElementById('studentGender').value = st.gender;
      document.getElementById('studentAdmissionDate').value = st.admission_date ? st.admission_date.substring(0, 10) : '';
      document.getElementById('studentRoll').value = st.roll_number;
      document.getElementById('studentRoll').disabled = true;
      document.getElementById('studentContact').value = st.contact || '';
      document.getElementById('studentBlood').value = st.blood_group || '';
      document.getElementById('studentGuardian').value = st.guardian_name || '';
      document.getElementById('studentGuardianPhone').value = st.guardian_phone || '';
      document.getElementById('studentEmergency').value = st.emergency_contact || '';
      document.getElementById('studentPrevSchool').value = st.previous_school || '';
      document.getElementById('studentAddress').value = st.address || '';
      document.getElementById('studentPhotoPreview').src = st.photo || '/img/logo.png';

      const activeEnroll = st.StudentEnrollments && st.StudentEnrollments.find(e => e.academic_year_id === activeSessionId);
      if (activeEnroll) {
        document.getElementById('admissionClassSelect').value = activeEnroll.class_id;
      }

      const modalEl = document.getElementById('studentAdmissionModal');
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    } catch (err) {
      alert('Failed to load student details: ' + err.message);
    }
  }

  async function viewStudentProfile(id) {
    try {
      const res = await fetch(`/api/students/${id}`);
      const s = await res.json();
      
      const photo = s.photo || '/img/logo.png';
      
      // Construct details body (Full teacher view)
      const contentHtml = `
        <div class="row g-3">
          <div class="col-md-4 text-center">
            <div class="mb-3">
              <i class="fa-solid fa-user-circle text-muted" style="font-size: 80px;"></i>
            </div>
            <h6 class="fw-bold">${s.name}</h6>
            <span class="badge bg-secondary">Roll: ${s.roll_number}</span>
          </div>
          <div class="col-md-8">
            <table class="table table-bordered table-sm fs-7">
              <tr><th>Father Name</th><td>${s.father_name}</td></tr>
              <tr><th>Registration No</th><td>${s.registration_number}</td></tr>
              <tr><th>Date of Birth</th><td>${s.dob}</td></tr>
              <tr><th>Gender</th><td>${s.gender}</td></tr>
              <tr><th>Admission Date</th><td>${s.admission_date}</td></tr>
              <tr><th>Blood Group</th><td>${s.blood_group || '---'}</td></tr>
              <tr><th>Guardian Name</th><td>${s.guardian_name || '---'}</td></tr>
              <tr><th>Guardian Phone</th><td>${s.guardian_phone || '---'}</td></tr>
              <tr><th>Emergency Phone</th><td>${s.emergency_contact || '---'}</td></tr>
              <tr><th>Phone Number</th><td>${s.contact || '---'}</td></tr>
              <tr><th>Address</th><td>${s.address || '---'}</td></tr>
              <tr><th>Previous School</th><td>${s.previous_school || '---'}</td></tr>
            </table>
          </div>
        </div>
      `;

      // Create overlay details modal dynamically
      const modalDiv = document.createElement('div');
      modalDiv.className = 'modal fade';
      modalDiv.innerHTML = `
        <div class="modal-dialog modal-lg modal-dialog-centered">
          <div class="modal-content modal-content-custom">
            <div class="modal-header modal-header-custom" style="background: var(--primary-color);">
              <h5 class="modal-title fw-bold text-white"><i class="fa-solid fa-id-card me-2"></i>Complete Student Bio-Profile</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4">${contentHtml}</div>
          </div>
        </div>
      `;
      document.body.appendChild(modalDiv);
      const modal = new bootstrap.Modal(modalDiv);
      modal.show();
      
      modalDiv.addEventListener('hidden.bs.modal', () => {
        modalDiv.remove();
      });
    } catch (err) {
      console.error(err);
      alert('Failed to load student profile.');
    }
  }

  // ==========================================
  // ACCOUNT SECURITY & RECOVERY EMAIL LOGIC
  // ==========================================
  async function loadProfileSecurityView() {
    try {
      const res = await fetch('/api/auth/profile');
      if (!res.ok) return;
      const data = await res.json();
      const user = data.user;

      const loginEmailInput = document.getElementById('accountLoginEmail');
      const recEmailDisplay = document.getElementById('accountRecoveryEmailDisplay');
      const recBadge = document.getElementById('accountRecoveryBadge');
      const btnText = document.getElementById('btnManageRecoveryEmailText');

      if (loginEmailInput) loginEmailInput.value = user.email;

      if (recEmailDisplay && recBadge && btnText) {
        if (user.recovery_email && user.recovery_email_verified) {
          recEmailDisplay.textContent = user.recovery_email;
          recBadge.className = 'badge bg-success text-white px-2 py-1';
          recBadge.innerHTML = '<i class="fa-solid fa-circle-check me-1"></i>Verified ✓';
          btnText.textContent = 'Change Recovery Email';
        } else if (user.recovery_email) {
          recEmailDisplay.textContent = user.recovery_email;
          recBadge.className = 'badge bg-warning text-dark px-2 py-1';
          recBadge.innerHTML = '<i class="fa-solid fa-triangle-exclamation me-1"></i>Unverified';
          btnText.textContent = 'Verify Recovery Email';
        } else {
          recEmailDisplay.textContent = 'No recovery email configured';
          recBadge.className = 'badge bg-secondary text-white px-2 py-1';
          recBadge.innerHTML = '<i class="fa-solid fa-info-circle me-1"></i>Not Configured';
          btnText.textContent = 'Add Recovery Email';
        }
      }
      // Update teacher profile avatar
      const teacherProfileAvatar = document.getElementById('teacherProfileAvatar');
      if (teacherProfileAvatar) {
        teacherProfileAvatar.src = user.photo || '/img/logo.png';
      }
    } catch (err) {
      console.error('Load profile security error:', err);
    }
  }

  // Teacher Profile Photo Upload Listener
  const inputTeacherPhoto = document.getElementById('inputTeacherPhoto');
  if (inputTeacherPhoto) {
    inputTeacherPhoto.addEventListener('change', async function() {
      const file = this.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('photo', file);

      try {
        const res = await fetch('/api/teachers/photo', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        showAlert('Profile photo updated successfully.');
        const avatar = document.getElementById('teacherProfileAvatar');
        if (avatar) avatar.src = data.photo + '?t=' + Date.now();

      } catch (err) {
        showAlert(err.message, 'danger');
      }
    });
  }

  document.querySelectorAll('[data-pane="pane-teacher-settings"]').forEach(item => {
    item.addEventListener('click', loadProfileSecurityView);
  });
  loadProfileSecurityView();

  const btnSendRecoveryOtp = document.getElementById('btnSendRecoveryOtp');
  const btnConfirmRecoveryOtp = document.getElementById('btnConfirmRecoveryOtp');
  const btnRecBackToInput = document.getElementById('btnRecBackToInput');
  const inputNewRecoveryEmail = document.getElementById('inputNewRecoveryEmail');
  const inputRecoveryOtp = document.getElementById('inputRecoveryOtp');
  const recStepInput = document.getElementById('recStepInput');
  const recStepVerify = document.getElementById('recStepVerify');
  const recTargetEmailDisplay = document.getElementById('recTargetEmailDisplay');
  const recoveryModalAlert = document.getElementById('recoveryModalAlert');
  const recoveryModalAlertMsg = document.getElementById('recoveryModalAlertMsg');

  function showRecAlert(msg, type = 'danger') {
    if (recoveryModalAlert && recoveryModalAlertMsg) {
      recoveryModalAlert.className = `alert alert-${type} text-start alert-dismissible fade show mb-3`;
      recoveryModalAlertMsg.innerHTML = `<i class="fa-solid ${type === 'danger' ? 'fa-triangle-exclamation' : 'fa-circle-check'} me-2"></i>${msg}`;
      recoveryModalAlert.classList.remove('d-none');
    }
  }

  function hideRecAlert() {
    if (recoveryModalAlert) recoveryModalAlert.classList.add('d-none');
  }

  if (btnSendRecoveryOtp) {
    btnSendRecoveryOtp.addEventListener('click', async () => {
      hideRecAlert();
      const email = inputNewRecoveryEmail.value.trim();
      if (!email || !/\S+@\S+\.\S+/.test(email)) {
        showRecAlert('Please enter a valid personal email address.');
        return;
      }

      const btnSendRecText = document.getElementById('btnSendRecText');
      const btnSendRecSpinner = document.getElementById('btnSendRecSpinner');
      btnSendRecoveryOtp.disabled = true;
      if (btnSendRecText) btnSendRecText.classList.add('d-none');
      if (btnSendRecSpinner) btnSendRecSpinner.classList.remove('d-none');

      try {
        const res = await fetch('/api/auth/request-recovery-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newRecoveryEmail: email })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        recTargetEmailDisplay.textContent = email;
        recStepInput.classList.add('d-none');
        recStepVerify.classList.remove('d-none');
        showRecAlert(data.message, 'success');
        if (inputRecoveryOtp) inputRecoveryOtp.focus();

      } catch (err) {
        showRecAlert(err.message);
      } finally {
        btnSendRecoveryOtp.disabled = false;
        if (btnSendRecText) btnSendRecText.classList.remove('d-none');
        if (btnSendRecSpinner) btnSendRecSpinner.classList.add('d-none');
      }
    });
  }

  if (btnConfirmRecoveryOtp) {
    btnConfirmRecoveryOtp.addEventListener('click', async () => {
      hideRecAlert();
      const email = inputNewRecoveryEmail.value.trim();
      const otp = inputRecoveryOtp ? inputRecoveryOtp.value.trim() : '';

      if (!otp || otp.length !== 6) {
        showRecAlert('Please enter the 6-digit verification code.');
        return;
      }

      const btnConfirmRecText = document.getElementById('btnConfirmRecText');
      const btnConfirmRecSpinner = document.getElementById('btnConfirmRecSpinner');
      btnConfirmRecoveryOtp.disabled = true;
      if (btnConfirmRecText) btnConfirmRecText.classList.add('d-none');
      if (btnConfirmRecSpinner) btnConfirmRecSpinner.classList.remove('d-none');

      try {
        const res = await fetch('/api/auth/verify-recovery-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newRecoveryEmail: email, otp })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        showAlert('Recovery email verified and saved successfully.');
        
        const modalEl = document.getElementById('recoveryEmailModal');
        if (modalEl) {
          const modal = bootstrap.Modal.getInstance(modalEl);
          if (modal) modal.hide();
        }

        recStepInput.classList.remove('d-none');
        recStepVerify.classList.add('d-none');
        if (inputRecoveryOtp) inputRecoveryOtp.value = '';
        hideRecAlert();

        loadProfileSecurityView();

      } catch (err) {
        showRecAlert(err.message);
      } finally {
        btnConfirmRecoveryOtp.disabled = false;
        if (btnConfirmRecText) btnConfirmRecText.classList.remove('d-none');
        if (btnConfirmRecSpinner) btnConfirmRecSpinner.classList.add('d-none');
      }
    });
  }

  if (btnRecBackToInput) {
    btnRecBackToInput.addEventListener('click', () => {
      hideRecAlert();
      recStepVerify.classList.add('d-none');
      recStepInput.classList.remove('d-none');
    });
  }

  // ==========================================
  // PANE: ATTENDANCE REPORT (Monthly / Yearly)
  // ==========================================
  function loadAttReportView() {
    // Populate class dropdown from teacher's assignments
    const sel = document.getElementById('attRptClassSelect');
    if (!sel) return;
    const uniqueClasses = {};
    assignedMappings.forEach(a => {
      uniqueClasses[a.class_id] = `${a.Class.class_name} - Sec ${a.Class.section}`;
    });
    const entries = Object.entries(uniqueClasses);
    if (entries.length === 1) {
      sel.innerHTML = `<option value="${entries[0][0]}" selected>${entries[0][1]}</option>`;
    } else {
      sel.innerHTML = '<option value="" disabled selected>Select Class</option>';
      entries.forEach(([id, name]) => {
        sel.innerHTML += `<option value="${id}">${name}</option>`;
      });
    }

    // Default month to current month
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthInput = document.getElementById('attRptMonth');
    if (monthInput && !monthInput.value) monthInput.value = ym;

    // Toggle month picker based on view mode
    const viewModeSelect = document.getElementById('attRptViewMode');
    const monthContainer = document.getElementById('attRptMonthContainer');
    if (viewModeSelect && monthContainer) {
      viewModeSelect.onchange = () => {
        monthContainer.classList.toggle('d-none', viewModeSelect.value === 'yearly');
      };
    }
  }

  // Helper: render a single monthly data set into the grid
  function renderMonthlyGrid(data, title, subtitle) {
    const thead = document.getElementById('attRptTableHead');
    const tbody = document.getElementById('attRptTableBody');
    const tableTitle = document.getElementById('attRptTableTitle');
    const tableSub = document.getElementById('attRptTableSubtitle');
    if (!thead || !tbody) return;

    tableTitle.textContent = title || 'Monthly Attendance Grid';
    tableSub.textContent = subtitle || '';

    // Summary cards
    document.getElementById('attRptTotalStudents').textContent = data.summary.totalStudents;
    document.getElementById('attRptSchoolDays').textContent = data.summary.attendanceDaysCount;
    document.getElementById('attRptAvgPct').textContent = data.summary.classAveragePercentage + '%';
    document.getElementById('attRptLowCount').textContent = data.summary.lowAttendanceCount;

    // Build header: Roll | Name | date1 | date2 | … | P | A | L | %
    const dates = data.dates;
    let headHtml = '<tr><th>Roll</th><th>Student Name</th>';
    dates.forEach(d => {
      const day = d.substring(8); // DD
      headHtml += `<th class="text-center px-1" style="min-width:32px;">${day}</th>`;
    });
    headHtml += '<th class="text-center text-success">P</th><th class="text-center text-danger">A</th><th class="text-center text-warning">L</th><th class="text-center">%</th></tr>';
    thead.innerHTML = headHtml;

    // Build rows
    let bodyHtml = '';
    data.students.forEach(st => {
      const pct = st.summary.percentage;
      const pctClass = pct >= 75 ? 'text-success fw-semibold' : 'text-danger fw-semibold';
      bodyHtml += `<tr>
        <td>${st.roll_number || ''}</td>
        <td>${st.name}</td>`;
      dates.forEach(d => {
        const status = st.record[d];
        let cell = '—';
        let cellClass = 'text-muted';
        if (status === 'Present') { cell = 'P'; cellClass = 'text-success fw-bold'; }
        else if (status === 'Absent') { cell = 'A'; cellClass = 'text-danger fw-bold'; }
        else if (status === 'Leave') { cell = 'L'; cellClass = 'text-warning fw-bold'; }
        bodyHtml += `<td class="text-center ${cellClass}">${cell}</td>`;
      });
      bodyHtml += `
        <td class="text-center text-success fw-semibold">${st.summary.present}</td>
        <td class="text-center text-danger fw-semibold">${st.summary.absent}</td>
        <td class="text-center text-warning fw-semibold">${st.summary.leave}</td>
        <td class="text-center ${pctClass}">${pct}%</td>
      </tr>`;
    });
    tbody.innerHTML = bodyHtml;
  }

  // Helper: render yearly summary (aggregated across months)
  function renderYearlyGrid(allMonthData, months) {
    const thead = document.getElementById('attRptTableHead');
    const tbody = document.getElementById('attRptTableBody');
    const tableTitle = document.getElementById('attRptTableTitle');
    const tableSub = document.getElementById('attRptTableSubtitle');
    if (!thead || !tbody) return;

    tableTitle.textContent = 'Yearly Attendance Summary';
    tableSub.textContent = `Session ${activeSessionName} — all months combined`;

    // Build a map: studentId → { name, roll_number, presentByMonth, absentByMonth, leaveByMonth, total }
    const studentMap = {};
    const monthLabels = [];

    allMonthData.forEach((data, idx) => {
      const mLabel = months[idx]; // e.g. "2026-07"
      const parts = mLabel.split('-');
      const label = new Date(+parts[0], +parts[1] - 1, 1).toLocaleString('default', { month: 'short', year: '2-digit' });
      monthLabels.push(label);
      data.students.forEach(st => {
        if (!studentMap[st.id]) {
          studentMap[st.id] = { name: st.name, roll: st.roll_number, months: [], totalP: 0, totalA: 0, totalL: 0, totalDays: 0 };
        }
        studentMap[st.id].months.push(st.summary.percentage);
        studentMap[st.id].totalP += st.summary.present;
        studentMap[st.id].totalA += st.summary.absent;
        studentMap[st.id].totalL += st.summary.leave;
        studentMap[st.id].totalDays += st.summary.activeDays;
      });
    });

    // Header
    let headHtml = '<tr><th>Roll</th><th>Student Name</th>';
    monthLabels.forEach(ml => { headHtml += `<th class="text-center">${ml}</th>`; });
    headHtml += '<th class="text-center text-success">Total P</th><th class="text-center text-danger">Total A</th><th class="text-center">Overall %</th></tr>';
    thead.innerHTML = headHtml;

    // Rows
    let bodyHtml = '';
    Object.values(studentMap).sort((a, b) => +a.roll - +b.roll).forEach(st => {
      const overallPct = st.totalDays > 0 ? Math.round((st.totalP / st.totalDays) * 100) : 0;
      const pctClass = overallPct >= 75 ? 'text-success fw-semibold' : 'text-danger fw-semibold';
      bodyHtml += `<tr><td>${st.roll || ''}</td><td>${st.name}</td>`;
      st.months.forEach(mp => {
        const cls = mp >= 75 ? 'text-success' : 'text-danger';
        bodyHtml += `<td class="text-center ${cls}">${mp}%</td>`;
      });
      bodyHtml += `<td class="text-center text-success fw-semibold">${st.totalP}</td>
        <td class="text-center text-danger fw-semibold">${st.totalA}</td>
        <td class="text-center ${pctClass}">${overallPct}%</td></tr>`;
    });
    tbody.innerHTML = bodyHtml;

    // Summary cards — aggregate
    const totalStudents = Object.keys(studentMap).length;
    const totalDaysAll = allMonthData.reduce((s, d) => s + d.summary.attendanceDaysCount, 0);
    const totalP = Object.values(studentMap).reduce((s, st) => s + st.totalP, 0);
    const totalA = Object.values(studentMap).reduce((s, st) => s + st.totalA, 0);
    const totalActive = totalP + totalA;
    const avgPct = totalActive > 0 ? Math.round((totalP / totalActive) * 100) : 0;
    const lowCount = Object.values(studentMap).filter(st => st.totalDays > 0 && Math.round((st.totalP / st.totalDays) * 100) < 75).length;

    document.getElementById('attRptTotalStudents').textContent = totalStudents;
    document.getElementById('attRptSchoolDays').textContent = totalDaysAll;
    document.getElementById('attRptAvgPct').textContent = avgPct + '%';
    document.getElementById('attRptLowCount').textContent = lowCount;
  }

  // Wire up Generate Report button
  const loadAttRptBtn = document.getElementById('loadAttRptBtn');
  if (loadAttRptBtn) {
    loadAttRptBtn.addEventListener('click', async () => {
      const classId = document.getElementById('attRptClassSelect').value;
      const viewMode = document.getElementById('attRptViewMode').value;
      const monthVal = document.getElementById('attRptMonth').value;

      if (!classId) { alert('Please select a class.'); return; }
      if (viewMode === 'monthly' && !monthVal) { alert('Please select a month.'); return; }
      if (!activeSessionId) { alert('No active session found.'); return; }

      // Reset UI
      document.getElementById('attRptSummaryRow').classList.add('d-none');
      document.getElementById('attRptTableArea').classList.add('d-none');
      document.getElementById('attRptEmptyState').classList.add('d-none');
      loadAttRptBtn.disabled = true;
      loadAttRptBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Loading...';

      try {
        if (viewMode === 'monthly') {
          const res = await fetch(`/api/attendance/monthly?classId=${classId}&academicYearId=${activeSessionId}&month=${monthVal}`);
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to load attendance.');

          if (!data.students || data.students.length === 0) {
            document.getElementById('attRptEmptyState').classList.remove('d-none');
          } else {
            const parts = monthVal.split('-');
            const monthLabel = new Date(+parts[0], +parts[1] - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
            renderMonthlyGrid(data, `Monthly Attendance — ${monthLabel}`, `${data.summary.totalStudents} students · ${data.summary.attendanceDaysCount} school day(s)`);
            document.getElementById('attRptSummaryRow').classList.remove('d-none');
            document.getElementById('attRptTableArea').classList.remove('d-none');
          }

        } else {
          // Yearly mode: figure out all months in the active academic session
          // Fetch session details to get start/end year
          const sessRes = await fetch('/api/academic-years');
          const sessions = await sessRes.json();
          const activeSession = sessions.find(s => s.id == activeSessionId);
          if (!activeSession) throw new Error('Active session not found.');

          // Generate list of months: from July of start year to June of end year
          // year_name format: "2026-2027"
          const [startYr] = activeSession.year_name.split('-').map(Number);
          const months = [];
          for (let m = 7; m <= 12; m++) {
            months.push(`${startYr}-${String(m).padStart(2, '0')}`);
          }
          for (let m = 1; m <= 6; m++) {
            months.push(`${startYr + 1}-${String(m).padStart(2, '0')}`);
          }

          // Fetch all months in parallel
          const results = await Promise.all(
            months.map(mo => fetch(`/api/attendance/monthly?classId=${classId}&academicYearId=${activeSessionId}&month=${mo}`).then(r => r.json()))
          );

          // Keep only months that have data
          const monthsWithData = months.filter((_, i) => results[i].students && results[i].students.length > 0);
          const dataWithData = results.filter(d => d.students && d.students.length > 0);

          if (monthsWithData.length === 0 || dataWithData[0].students.length === 0) {
            document.getElementById('attRptEmptyState').classList.remove('d-none');
          } else {
            renderYearlyGrid(dataWithData, monthsWithData);
            document.getElementById('attRptSummaryRow').classList.remove('d-none');
            document.getElementById('attRptTableArea').classList.remove('d-none');
          }
        }
      } catch (err) {
        console.error(err);
        alert('Error: ' + err.message);
      } finally {
        loadAttRptBtn.disabled = false;
        loadAttRptBtn.innerHTML = '<i class="fa-solid fa-rotate me-2"></i>Generate Report';
      }
    });
  }

});
