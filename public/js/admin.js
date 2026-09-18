document.addEventListener('DOMContentLoaded', () => {
  let activeSessionId = null;
  let activeSessionName = '';
  let feeChart = null;
  let distChart = null;

  // Initialize page guard & user profile
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
        // Mark active menu
        menuItems.forEach(mi => mi.classList.remove('active'));
        item.classList.add('active');
        
        // Auto-close sidebar on mobile after click
        if (window.innerWidth < 992 && sidebar.classList.contains('collapsed')) {
          toggleSidebar();
        }
      }
    });
  });

  // Handle trigger links outside sidebar (like inside profile dropdown)
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
    let activePane = document.getElementById(paneId);
    if (!activePane && paneId === 'pane-overview') activePane = document.getElementById('pane-dashboard');
    if (!activePane && paneId === 'pane-dashboard') activePane = document.getElementById('pane-overview');

    if (activePane) {
      activePane.classList.remove('d-none');
      if (paneId === 'pane-dashboard' || paneId === 'pane-overview') loadDashboardOverview();
      else if (paneId === 'pane-sessions') loadSessionsView();
      else if (paneId === 'pane-classes') loadClassesView();
      else if (paneId === 'pane-students') loadStudentsView();
      else if (paneId === 'pane-attendance') initAttendancePane();
      else if (paneId === 'pane-results') initResultsPane();
      else if (paneId === 'pane-teachers') { loadTeachersView(); loadTeacherPayrollView(); }
      else if (paneId === 'pane-fees') loadFeesView();
      else if (paneId === 'pane-notices') loadNoticesView();
    }
  }

  // GLOBAL ALERTS UTILITY
  function showAlert(message, type = 'success') {
    const alertBox = document.getElementById('globalAlert');
    const alertMsg = document.getElementById('globalAlertMessage');
    alertBox.className = `alert alert-${type} alert-dismissible fade show`;
    alertMsg.textContent = message;
    alertBox.classList.remove('d-none');
    // Scroll to top
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
      if (!data.loggedIn || data.user.role !== 'admin') {
        window.location.href = '/login.html';
        return;
      }
      
      // Populate admin details
      document.getElementById('navAdminName').textContent = data.user.name;

      // Load active session scope
      await fetchActiveSessionScope();
      
      // Auto-default dashboardMonth selector to current active month
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const currentMonthName = monthNames[new Date().getMonth()];
      const dashMonthSel = document.getElementById('dashboardMonth');
      if (dashMonthSel && !dashMonthSel.value) {
        dashMonthSel.value = currentMonthName;
      }

      // Load dashboard overview stats
      loadDashboardOverview();

      // ==========================================
      // TEACHER SALARY PAYMENT LOGIC
      // ==========================================
      async function openPaySalaryModal(teacherId, teacherName) {
        document.getElementById('salaryTeacherId').value = teacherId;
        document.getElementById('salaryTeacherName').value = teacherName;
        document.getElementById('salaryPaymentDate').value = new Date().toISOString().substring(0, 10);
        document.getElementById('salaryAmount').value = '';
        document.getElementById('salaryNotes').value = '';
        
        await loadTeacherSalaryHistory(teacherId);
        
        new bootstrap.Modal(document.getElementById('payTeacherSalaryModal')).show();
      }

      async function loadTeacherSalaryHistory(teacherId) {
        try {
          const res = await fetch(`/api/teachers/${teacherId}/payments`);
          const payments = await res.json();
          const tbody = document.querySelector('#teacherSalaryHistoryTable tbody');
          tbody.innerHTML = '';
          
          if (payments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No past payments recorded.</td></tr>';
            return;
          }
          
          payments.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td>${p.payment_date}</td>
              <td class="fw-semibold">PKR ${Number(p.amount).toLocaleString()}</td>
              <td>${p.notes || '---'}</td>
            `;
            tbody.appendChild(tr);
          });
        } catch (err) {
          console.error(err);
        }
      }

      document.getElementById('payTeacherSalaryForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const teacherId = document.getElementById('salaryTeacherId').value;
        const amount = document.getElementById('salaryAmount').value;
        const payment_date = document.getElementById('salaryPaymentDate').value;
        const notes = document.getElementById('salaryNotes').value.trim();

        try {
          const res = await fetch(`/api/teachers/${teacherId}/payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, payment_date, notes })
          });
          if (res.ok) {
            showAlert('Teacher salary payment logged successfully.');
            document.getElementById('payTeacherSalaryForm').reset();
            await loadTeacherSalaryHistory(teacherId);
            loadDashboardOverview(); // Update net revenue
          } else {
            const data = await res.json();
            alert(data.error || 'Failed to log payment.');
          }
        } catch (err) {
          console.error(err);
        }
      });

      // ==========================================
      // TEACHER ATTENDANCE LOGIC
      // ==========================================
      const loadTeacherAttReportBtn = document.getElementById('loadTeacherAttReportBtn');
      if (loadTeacherAttReportBtn) {
        loadTeacherAttReportBtn.addEventListener('click', async () => {
          if (!activeSessionId) {
            alert('Setup active session first.');
            return;
          }
          const month = document.getElementById('teacherAttMonthFilter').value;
          if (!month) {
            alert('Please select a month.');
            return;
          }

          try {
            const res = await fetch(`/api/teachers/attendance/summary?month=${month}&academicYearId=${activeSessionId}`);
            const data = await res.json();
            
            const tbody = document.querySelector('#teacherAttTable tbody');
            tbody.innerHTML = '';
            
            if (data.length === 0) {
              tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No teachers found.</td></tr>';
            } else {
              data.forEach(t => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                  <td class="fw-bold">${t.name}</td>
                  <td><span class="badge bg-success">P: ${t.present}</span></td>
                  <td><span class="badge bg-danger">A: ${t.absent}</span></td>
                  <td><span class="badge bg-warning">L: ${t.leave}</span></td>
                `;
                tbody.appendChild(tr);
              });
            }
            document.getElementById('teacherAttReportArea').classList.remove('d-none');
          } catch (err) {
            console.error(err);
          }
        });
      }

      // Populate daily mark attendance modal
      const markTeacherAttendanceModal = document.getElementById('markTeacherAttendanceModal');
      if (markTeacherAttendanceModal) {
        markTeacherAttendanceModal.addEventListener('show.bs.modal', async () => {
          document.getElementById('teacherAttDate').value = new Date().toISOString().substring(0, 10);
          try {
            const res = await fetch('/api/teachers');
            const teachers = await res.json();
            const tbody = document.querySelector('#markTeacherAttTable tbody');
            tbody.innerHTML = '';
            
            teachers.forEach(t => {
              const tr = document.createElement('tr');
              tr.innerHTML = `
                <td class="fw-bold">${t.User.name}</td>
                <td class="text-center">
                  <div class="btn-group" role="group">
                    <input type="radio" class="btn-check" name="t_att_${t.id}" id="t_p_${t.id}" value="Present" autocomplete="off" checked>
                    <label class="btn btn-outline-success btn-sm" for="t_p_${t.id}">Present</label>

                    <input type="radio" class="btn-check" name="t_att_${t.id}" id="t_a_${t.id}" value="Absent" autocomplete="off">
                    <label class="btn btn-outline-danger btn-sm" for="t_a_${t.id}">Absent</label>
                    
                    <input type="radio" class="btn-check" name="t_att_${t.id}" id="t_l_${t.id}" value="Leave" autocomplete="off">
                    <label class="btn btn-outline-warning btn-sm" for="t_l_${t.id}">Leave</label>
                  </div>
                </td>
              `;
              tbody.appendChild(tr);
            });
          } catch (err) {
            console.error(err);
          }
        });
      }

      document.getElementById('markTeacherAttendanceForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!activeSessionId) {
          alert('Setup active session first.');
          return;
        }
        const date = document.getElementById('teacherAttDate').value;
        
        // Scrape data
        const tbody = document.querySelector('#markTeacherAttTable tbody');
        const logs = [];
        tbody.querySelectorAll('tr').forEach(tr => {
          const radio = tr.querySelector('input[type="radio"]:checked');
          if (radio) {
            const tId = radio.name.replace('t_att_', '');
            logs.push({ teacher_id: tId, status: radio.value });
          }
        });
        
        try {
          const res = await fetch('/api/teachers/attendance/mark', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              logs: logs,
              date: date,
              academicYearId: activeSessionId
            })
          });
          if (res.ok) {
            showAlert('Teacher attendance marked.');
            bootstrap.Modal.getInstance(markTeacherAttendanceModal).hide();
          } else {
            const err = await res.json();
            alert(err.error || 'Failed to mark attendance.');
          }
        } catch(err) { console.error(err); }
      });
      
      // Pre-populate selectors
      populateFormDropdowns();
    } catch (error) {
      console.error('Auth verification error:', error);
      window.location.href = '/login.html';
    }
  }

  // FETCH ACTIVE ACADEMIC SESSION
  async function fetchActiveSessionScope() {
    try {
      const res = await fetch('/api/reports/dashboard-stats');
      const data = await res.json();
      if (data.activeSession && data.activeSession !== 'None') {
        activeSessionName = data.activeSession;
        activeSessionId = data.activeSessionId;
        document.getElementById('currentSessionBadge').textContent = `Session: ${activeSessionName}`;
        document.getElementById('currentSessionBadge').className = "session-indicator";

        // Default to All Months on load so overall session totals show immediately
        const dashMonth = document.getElementById('dashboardMonth');
        if (dashMonth) dashMonth.value = '';

        // Set dashboard year after dropdowns are populated
        setTimeout(() => {
          const dashYear = document.getElementById('dashboardYear');
          if (dashYear && activeSessionId) dashYear.value = activeSessionId;
        }, 500);
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
  // PANE 1: OVERVIEW & ANALYTICS LOADERS
  // ==========================================
  async function loadDashboardOverview() {
    try {
      const dashMonth = document.getElementById('dashboardMonth');
      const dashYear = document.getElementById('dashboardYear');
      const month = dashMonth ? dashMonth.value : '';
      const yearId = (dashYear && dashYear.value) ? dashYear.value : (activeSessionId || '');

      let query = '';
      if (month) query += `?month=${month}`;
      if (yearId) query += `${query ? '&' : '?'}academicYearId=${yearId}`;

      const res = await fetch(`/api/reports/dashboard-stats${query}`);
      const stats = await res.json();

      document.getElementById('cardTotalStudents').textContent = stats.totalStudents;
      document.getElementById('cardExpectedFee').textContent = Number(stats.expectedFees).toLocaleString();
      document.getElementById('cardCollectedFee').textContent = Number(stats.collectedFees).toLocaleString();
      document.getElementById('cardPendingFee').textContent = Number(stats.pendingFees).toLocaleString();
      document.getElementById('cardTeacherSalaries').textContent = Number(stats.teacherSalaries).toLocaleString();
      document.getElementById('cardNetRevenue').textContent = Number(stats.netRevenue).toLocaleString();

      // Update Teacher Payroll Summary Card
      const summaryMonthEl = document.getElementById('payrollSummaryMonth');
      if (summaryMonthEl) {
        summaryMonthEl.textContent = month || 'Session Total';
      }
      const summarySessionEl = document.getElementById('payrollSummarySession');
      if (summarySessionEl && stats.activeSession) {
        summarySessionEl.textContent = `Session: ${stats.activeSession}`;
      }

      if (stats.payrollSummary) {
        const ps = stats.payrollSummary;
        const dueEl = document.getElementById('cardPayrollDue');
        const paidEl = document.getElementById('cardPayrollPaid');
        const remEl = document.getElementById('cardPayrollRemaining');
        const paidCntEl = document.getElementById('cardPaidCount');
        const partCntEl = document.getElementById('cardPartialCount');
        const pendCntEl = document.getElementById('cardPendingCount');

        if (dueEl) dueEl.textContent = Number(ps.totalSalaryDue).toLocaleString();
        if (paidEl) paidEl.textContent = Number(ps.totalSalaryPaid).toLocaleString();
        if (remEl) remEl.textContent = Number(ps.totalSalaryRemaining).toLocaleString();
        if (paidCntEl) paidCntEl.textContent = ps.paidTeachersCount;
        if (partCntEl) partCntEl.textContent = ps.partialTeachersCount;
        if (pendCntEl) pendCntEl.textContent = ps.pendingTeachersCount;
      }

      if (activeSessionId) {
        loadOverviewCharts();
      }
    } catch (err) {
      console.error('Dashboard statistics load error:', err);
    }
  }

  // Dashboard month/year filter event listeners
  const dashboardMonthSel = document.getElementById('dashboardMonth');
  const dashboardYearSel = document.getElementById('dashboardYear');
  if (dashboardMonthSel) dashboardMonthSel.addEventListener('change', loadDashboardOverview);
  if (dashboardYearSel) dashboardYearSel.addEventListener('change', loadDashboardOverview);

  async function loadOverviewCharts() {
    try {
      // 1. Fetch monthly revenue comparison chart data (Income vs Salary Expenses vs Net Revenue)
      const chartRes = await fetch(`/api/reports/revenue-chart?academicYearId=${activeSessionId}`);
      const chartData = await chartRes.json();

      // Destroy old chart if exists
      if (feeChart) feeChart.destroy();

      const ctx1 = document.getElementById('feeCollectionChart').getContext('2d');
      feeChart = new Chart(ctx1, {
        type: 'bar',
        data: {
          labels: chartData.months && chartData.months.length > 0 ? chartData.months : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
          datasets: [
            {
              label: 'Income (Collected Fees)',
              data: chartData.income || [0],
              backgroundColor: '#10B981',
              borderRadius: 4
            },
            {
              label: 'Salary Expenses Paid',
              data: chartData.expenses || [0],
              backgroundColor: '#EF4444',
              borderRadius: 4
            },
            {
              label: 'Net Revenue',
              data: chartData.netRevenue || [0],
              backgroundColor: '#3B82F6',
              borderRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          scales: {
            y: { beginAtZero: true }
          }
        }
      });

      // 2. Fetch class distribution dynamically by running a student count aggregation
      const studRes = await fetch(`/api/students?academicYearId=${activeSessionId}`);
      const students = await studRes.json();
      
      const distribution = {};
      students.forEach(s => {
        if (s.StudentEnrollments && s.StudentEnrollments.length > 0) {
          const className = s.StudentEnrollments[0].Class.class_name;
          distribution[className] = (distribution[className] || 0) + 1;
        }
      });

      const classes = Object.keys(distribution);
      const counts = Object.values(distribution);

      // Destroy old pie chart if exists
      if (distChart) distChart.destroy();

      const ctx2 = document.getElementById('classDistributionChart').getContext('2d');
      distChart = new Chart(ctx2, {
        type: 'pie',
        data: {
          labels: classes.length > 0 ? classes : ['No Enrollments'],
          datasets: [{
            data: counts.length > 0 ? counts : [1],
            backgroundColor: ['#1857A6', '#D4AF37', '#B11D22', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B']
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } }
        }
      });

    } catch (error) {
      console.error('Overview graphs rendering error:', error);
    }
  }


  // ==========================================
  // PANE 2: SESSIONS MANAGEMENT
  // ==========================================
  async function loadSessionsView() {
    try {
      const res = await fetch('/api/academic-years');
      const sessions = await res.json();
      const tbody = document.querySelector('#sessionsTable tbody');
      tbody.innerHTML = '';

      sessions.forEach(sess => {
        const tr = document.createElement('tr');
        const statusBadge = sess.status === 'active' 
          ? `<span class="badge bg-success">Active</span>` 
          : `<span class="badge bg-secondary">Inactive</span>`;
        
        const actionBtn = sess.status === 'inactive'
          ? `<button class="btn btn-sm btn-primary activate-session-btn" data-id="${sess.id}" style="background: var(--primary-color); border:none;"><i class="fa-solid fa-circle-check me-1"></i>Activate</button>`
          : `<span class="text-muted fs-7">Primary Scope</span>`;

        tr.innerHTML = `
          <td>${sess.id}</td>
          <td class="fw-bold">${sess.year_name}</td>
          <td>${statusBadge}</td>
          <td>${actionBtn}</td>
        `;
        tbody.appendChild(tr);
      });

      // Bind activation buttons
      document.querySelectorAll('.activate-session-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          await activateSessionScope(id);
        });
      });
    } catch (error) {
      console.error('Load sessions view error:', error);
    }
  }

  async function activateSessionScope(id) {
    try {
      const res = await fetch(`/api/academic-years/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' })
      });
      if (res.ok) {
        showAlert('Academic Year scope shifted successfully.');
        await fetchActiveSessionScope();
        loadSessionsView();
        populateFormDropdowns();
      }
    } catch (err) {
      console.error(err);
    }
  }

  document.getElementById('createSessionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const year_name = document.getElementById('sessionName').value.trim();
    const status = document.getElementById('sessionStatus').value;

    try {
      const res = await fetch('/api/academic-years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year_name, status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showAlert('New session recorded.');
      document.getElementById('createSessionForm').reset();
      await fetchActiveSessionScope();
      loadSessionsView();
      populateFormDropdowns();
    } catch (error) {
      showAlert(error.message, 'danger');
    }
  });


  // ==========================================
  // PANE 3: CLASSES & CURRICULUM CONFIG
  // ==========================================
  async function loadClassesView() {
    try {
      const [classRes, subRes] = await Promise.all([
        fetch('/api/classes'),
        fetch('/api/subjects')
      ]);
      const classes = await classRes.json();
      const subjects = await subRes.json();

      const tbody = document.querySelector('#classesTable tbody');
      tbody.innerHTML = '';

      classes.forEach(cls => {
        const classSubs = subjects.filter(s => s.class_id === cls.id);
        const subjectsHtml = classSubs.map(s => `
          <span class="badge bg-light text-dark border me-1 my-1">
            ${s.subject_name} <small class="text-muted">(${s.total_marks}/${s.passing_marks})</small>
          </span>
        `).join('') || '<span class="text-muted fs-7">No subjects configured</span>';

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${cls.id}</td>
          <td class="fw-bold">${cls.class_name} - Section ${cls.section}</td>
          <td><div class="d-flex flex-wrap">${subjectsHtml}</div></td>
          <td>
            <button class="btn btn-sm btn-danger delete-class-btn" data-id="${cls.id}"><i class="fa-solid fa-trash"></i></button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      // Bind delete class buttons
      document.querySelectorAll('.delete-class-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (confirm('Deleting this class will delete all enrolled history, fee registers, and results. Proceed?')) {
            const id = btn.getAttribute('data-id');
            await deleteClass(id);
          }
        });
      });
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteClass(id) {
    try {
      const res = await fetch(`/api/classes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showAlert('Class and all linked history removed.');
        loadClassesView();
        populateFormDropdowns();
      }
    } catch (error) {
      console.error(error);
    }
  }

  document.getElementById('createClassForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const class_name = document.getElementById('classNameSelect').value;
    const section = document.getElementById('classSection').value.trim();

    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_name, section })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showAlert('Class Grade setup successful.');
      document.getElementById('createClassForm').reset();
      loadClassesView();
      populateFormDropdowns();
    } catch (error) {
      showAlert(error.message, 'danger');
    }
  });

  const createSubjectForm = document.getElementById('createSubjectForm');
  if (createSubjectForm) {
    createSubjectForm.addEventListener('submit', async (e) => {
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

        showAlert('Curriculum subject configured permanently.');
        createSubjectForm.reset();
        loadClassesView();
      } catch (error) {
        showAlert(error.message, 'danger');
      }
    });
  }


  // ==========================================
  // PANE 4: STUDENTS MODULE & BATCH PROMOTIONS
  // ==========================================
  const studentSearchInput = document.getElementById('studentSearchInput');
  const studentClassFilter = document.getElementById('studentClassFilter');
  const studentStatusFilter = document.getElementById('studentStatusFilter');

  if (studentSearchInput) studentSearchInput.addEventListener('input', loadStudentsView);
  if (studentClassFilter) studentClassFilter.addEventListener('change', loadStudentsView);
  if (studentStatusFilter) studentStatusFilter.addEventListener('change', loadStudentsView);

  async function loadStudentsView() {
    try {
      if (!activeSessionId) return;
      const search = studentSearchInput ? studentSearchInput.value.trim() : '';
      const classId = studentClassFilter ? studentClassFilter.value : '';
      const status = studentStatusFilter ? studentStatusFilter.value : '';

      let query = `?academicYearId=${activeSessionId}`;
      if (classId) query += `&classId=${classId}`;
      if (status) query += `&status=${status}`;
      if (search) query += `&search=${encodeURIComponent(search)}`;

      const res = await fetch(`/api/students${query}`);
      const students = await res.json();
      
      const tbody = document.querySelector('#studentsTable tbody');
      tbody.innerHTML = '';

      if (!Array.isArray(students) || students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No students found matching current filters.</td></tr>`;
        return;
      }

      students.forEach(stud => {
        const enrollment = (stud.StudentEnrollments && stud.StudentEnrollments[0]) || {};
        const className = enrollment.Class ? `${enrollment.Class.class_name} - Sec ${enrollment.Class.section}` : 'Unenrolled';
        const sessionRoll = enrollment.roll_number || stud.roll_number || '-';
        const enrStatus = enrollment.status || 'Active';

        let statusBadge = `<span class="badge bg-success px-2 py-1">${enrStatus}</span>`;
        if (enrStatus === 'Promoted') statusBadge = `<span class="badge bg-info text-dark px-2 py-1">Promoted</span>`;
        else if (enrStatus === 'Not Promoted') statusBadge = `<span class="badge bg-secondary px-2 py-1">Not Promoted</span>`;
        else if (enrStatus === 'Left') statusBadge = `<span class="badge bg-danger px-2 py-1">Left School</span>`;
        else if (enrStatus === 'Graduated') statusBadge = `<span class="badge bg-primary px-2 py-1" style="background:#8B5CF6 !important;">Graduated</span>`;
        else if (enrStatus === 'Transferred') statusBadge = `<span class="badge bg-warning text-dark px-2 py-1">Transferred</span>`;

        const att = stud.totalAttendance || { Present: 0, Absent: 0, Leave: 0 };
        const totalLog = att.Present + att.Absent + att.Leave;
        const attDisplay = totalLog > 0 
          ? `<span class="badge bg-success">P:${att.Present}</span> <span class="badge bg-danger">A:${att.Absent}</span> <span class="badge bg-warning">L:${att.Leave}</span>` 
          : '<span class="text-muted small">No Data</span>';

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="fw-bold text-primary">${sessionRoll}</td>
          <td>${stud.registration_number || '-'}</td>
          <td class="fw-bold">${stud.name}</td>
          <td class="text-muted">${stud.father_name}</td>
          <td><span class="badge bg-primary" style="background: var(--primary-color) !important;">${className}</span></td>
          <td>${statusBadge}</td>
          <td>${attDisplay}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-primary view-profile-btn me-1" data-id="${stud.id}" title="View Bio-Profile">
              <i class="fa-solid fa-id-card me-1"></i>Profile
            </button>
            <button class="btn btn-sm btn-outline-warning text-dark view-journey-btn" data-id="${stud.id}" title="View Career Timeline">
              <i class="fa-solid fa-graduation-cap me-1"></i>Journey
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      // Bind action buttons
      document.querySelectorAll('.view-profile-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          viewStudentProfile(btn.getAttribute('data-id'));
        });
      });

      document.querySelectorAll('.view-journey-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          viewStudentAcademicJourney(btn.getAttribute('data-id'));
        });
      });

    } catch (err) {
      console.error('Load students error:', err);
    }
  }

  // Preview Uploaded image
  const studentPhotoInput = document.getElementById('studentPhoto');
  if (studentPhotoInput) {
    studentPhotoInput.addEventListener('change', function() {
      const file = this.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
          document.getElementById('studentPhotoPreview').src = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Handle Admission Submit
  const studentAdmissionForm = document.getElementById('studentAdmissionForm');
  if (studentAdmissionForm) {
    studentAdmissionForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!activeSessionId) {
        alert('Setup an active session first.');
        return;
      }

      const form = document.getElementById('studentAdmissionForm');
      const formData = new FormData(form);
      
      formData.append('name', document.getElementById('studentName').value.trim());
      formData.append('father_name', document.getElementById('studentFather').value.trim());
      formData.append('dob', document.getElementById('studentDob').value);
      formData.append('gender', document.getElementById('studentGender').value);
      formData.append('class_id', document.getElementById('admissionClassSelect').value);
      formData.append('academic_year_id', activeSessionId);
      formData.append('admission_date', document.getElementById('studentAdmissionDate').value);
      formData.append('contact', document.getElementById('studentContact').value.trim());
      formData.append('blood_group', document.getElementById('studentBlood').value.trim());
      formData.append('address', document.getElementById('studentAddress').value.trim());
      formData.append('previous_school', document.getElementById('studentPrevSchool').value.trim());
      formData.append('roll_number', document.getElementById('studentRoll').value.trim());
      formData.append('guardian_name', document.getElementById('studentGuardianName').value.trim());
      formData.append('guardian_phone', document.getElementById('studentGuardianPhone').value.trim());
      formData.append('emergency_contact', document.getElementById('studentEmergency').value.trim());

      try {
        const res = await fetch('/api/students', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        showAlert('Student admitted successfully.');
        form.reset();
        document.getElementById('studentPhotoPreview').src = '/img/logo.png';
        
        const modalEl = document.getElementById('studentAdmissionModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        loadStudentsView();
      } catch (err) {
        alert(err.message);
      }
    });
  }

  // Load profile details in modal layout
  async function viewStudentProfile(id) {
    try {
      const res = await fetch(`/api/students/${id}`);
      const s = await res.json();
      
      const contentHtml = `
        <div class="row g-3">
          <div class="col-md-12">
            <h5 class="fw-bold text-primary border-bottom pb-2 mb-3"><i class="fa-solid fa-user me-2"></i>${s.name}</h5>
            <table class="table table-bordered table-sm fs-7">
              <tr><th>Roll No</th><td><span class="badge bg-secondary">${s.roll_number}</span></td></tr>
              <tr><th>Registration No</th><td>${s.registration_number}</td></tr>
              <tr><th>Father Name</th><td>${s.father_name}</td></tr>
              <tr><th>Date of Birth</th><td>${s.dob}</td></tr>
              <tr><th>Gender</th><td>${s.gender}</td></tr>
              <tr><th>Admission Date</th><td>${s.admission_date}</td></tr>
              <tr><th>Blood Group</th><td>${s.blood_group || '---'}</td></tr>
              <tr><th>Phone Number</th><td>${s.contact || '---'}</td></tr>
              <tr><th>Emergency Phone</th><td>${s.emergency_contact}</td></tr>
              <tr><th>Address</th><td>${s.address || '---'}</td></tr>
              <tr><th>Previous School</th><td>${s.previous_school || '---'}</td></tr>
            </table>
          </div>
        </div>
      `;

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
    }
  }

  // Load Student Academic Journey & Career Timeline Modal
  async function viewStudentAcademicJourney(studentId) {
    try {
      const res = await fetch(`/api/students/${studentId}/academic-journey`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const student = data.student;
      const journey = data.journey || [];

      document.getElementById('journeyStudentName').textContent = student.name;
      document.getElementById('journeyStudentRoll').textContent = student.roll_number || '-';
      document.getElementById('journeyStudentReg').textContent = student.registration_number || '-';
      document.getElementById('journeyStudentFather').textContent = student.father_name || '-';
      document.getElementById('journeyStudentAdmissionDate').textContent = student.admission_date || '-';
      document.getElementById('journeyStudentAvatar').src = student.photo || '/img/logo.png';

      const container = document.getElementById('journeyTimelineContainer');
      container.innerHTML = '';

      if (journey.length === 0) {
        container.innerHTML = `<div class="text-center text-muted py-4">No historical enrollments found for this student.</div>`;
      } else {
        journey.forEach((step, idx) => {
          let statusBadge = `<span class="badge bg-success px-2 py-1">${step.enrollmentStatus}</span>`;
          if (step.enrollmentStatus === 'Promoted') statusBadge = `<span class="badge bg-info text-dark px-2 py-1">Promoted</span>`;
          else if (step.enrollmentStatus === 'Not Promoted') statusBadge = `<span class="badge bg-secondary px-2 py-1">Not Promoted / Retained</span>`;
          else if (step.enrollmentStatus === 'Left') statusBadge = `<span class="badge bg-danger px-2 py-1">Left School</span>`;
          else if (step.enrollmentStatus === 'Graduated') statusBadge = `<span class="badge bg-primary px-2 py-1" style="background:#8B5CF6 !important;">Graduated</span>`;

          // Results summary tags
          let examTagsHtml = '';
          if (step.results && step.results.length > 0) {
            examTagsHtml = step.results.map(r => `
              <span class="badge ${r.overall_status === 'Pass' ? 'bg-success' : 'bg-danger'} px-2 py-1 me-1 mb-1">
                ${r.exam_type}: ${r.percentage}% (${r.grade}, ${r.overall_status})
              </span>
            `).join('');
          } else {
            examTagsHtml = '<span class="text-muted small">No exam logs</span>';
          }

          const lineageHtml = step.promotedFrom 
            ? `<div class="small text-muted mb-2"><i class="fa-solid fa-arrow-turn-up me-1 text-primary"></i>Promoted from <strong>${step.promotedFrom.className}</strong> (Session ${step.promotedFrom.sessionName})</div>`
            : '<div class="small text-muted mb-2"><i class="fa-solid fa-flag me-1 text-success"></i>Initial Admission Enrollment</div>';

          const card = document.createElement('div');
          card.className = 'border rounded p-3 mb-3 bg-light';
          card.style.borderLeft = '5px solid #1e3c72 !important';
          card.innerHTML = `
            <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-2">
              <div>
                <span class="badge bg-dark text-white px-3 py-1 me-2">${step.sessionName}</span>
                <span class="fs-6 fw-bold text-dark">${step.className}</span>
                <span class="ms-2 small text-muted">Roll #${step.sessionRollNumber}</span>
              </div>
              <div>
                ${statusBadge}
              </div>
            </div>

            ${lineageHtml}

            <div class="row g-2 pt-2 border-top">
              <div class="col-12 col-md-6">
                <span class="text-muted small fw-semibold d-block mb-1">Examination Performance:</span>
                <div>${examTagsHtml}</div>
              </div>
              <div class="col-12 col-md-6">
                <span class="text-muted small fw-semibold d-block mb-1">Attendance Record:</span>
                <div class="small">
                  <span class="text-success fw-bold">Present: ${step.attendance.Present}</span> | 
                  <span class="text-danger fw-bold">Absent: ${step.attendance.Absent}</span> | 
                  <span class="text-warning fw-bold">Leave: ${step.attendance.Leave}</span> 
                  <strong class="ms-2 text-primary">(${step.attendance.attendancePercentage}%)</strong>
                </div>
              </div>
            </div>

            ${step.remarks ? `<div class="small text-muted fst-italic mt-2 border-top pt-1">Notes: ${step.remarks}</div>` : ''}
          `;
          container.appendChild(card);
        });
      }

      const modal = new bootstrap.Modal(document.getElementById('academicJourneyModal'));
      modal.show();
    } catch (err) {
      console.error('Academic journey modal error:', err);
      alert(err.message || 'Failed to open academic journey.');
    }
  }


  // ==========================================
  // BATCH PROMOTION WIZARD (UPGRADED)
  // ==========================================
  let cachedPromotionPreviewData = null;

  const btnLoadPromotionPreview = document.getElementById('btnLoadPromotionPreview');
  const wizardPromoTable = document.getElementById('wizardPromoTable');
  const masterPromoCheckbox = document.getElementById('masterPromoCheckbox');
  const btnExecutePromotionReview = document.getElementById('btnExecutePromotionReview');
  const btnPromoSelectAllEligible = document.getElementById('btnPromoSelectAllEligible');
  const btnPromoDeselectAll = document.getElementById('btnPromoDeselectAll');

  if (btnLoadPromotionPreview) {
    btnLoadPromotionPreview.addEventListener('click', async () => {
      const sourceSessionId = document.getElementById('wizardSourceSession').value;
      const sourceClassId = document.getElementById('wizardSourceClass').value;
      const targetSessionId = document.getElementById('wizardTargetSession').value;
      const targetClassId = document.getElementById('wizardTargetClass').value;

      if (!sourceSessionId || !sourceClassId || !targetSessionId || !targetClassId) {
        alert('Please select Source Session, Source Class, Target Session, and Target Class.');
        return;
      }

      if (sourceSessionId === targetSessionId) {
        alert('Source and Target sessions must be different for promotion. For section transfer within the same session, please use the Section Transfer tab.');
        return;
      }

      try {
        btnLoadPromotionPreview.disabled = true;
        btnLoadPromotionPreview.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Checking Conflicts & Loading Sheet...';

        const res = await fetch('/api/students/promotion/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceClassId: Number(sourceClassId),
            sourceAcademicYearId: Number(sourceSessionId),
            targetClassId: Number(targetClassId),
            targetAcademicYearId: Number(targetSessionId)
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        cachedPromotionPreviewData = data;

        // Update metrics
        document.getElementById('metricPromoTotal').textContent = data.summary.totalSelected;
        document.getElementById('metricPromoEligible').textContent = data.summary.eligibleCount;
        document.getElementById('metricPromoConflict').textContent = data.summary.conflictCount;

        const tbody = wizardPromoTable.querySelector('tbody');
        tbody.innerHTML = '';

        if (!data.students || data.students.length === 0) {
          tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">No students currently enrolled in the source class for this session.</td></tr>`;
          document.getElementById('promoPreviewArea').classList.remove('d-none');
          if (btnExecutePromotionReview) btnExecutePromotionReview.disabled = true;
          return;
        }

        data.students.forEach(s => {
          // Informative Exam Result Badge
          let examBadge = '<span class="text-muted small">No Exam Data</span>';
          if (s.latestExamResult) {
            const isPass = s.latestExamResult.overallStatus === 'Pass';
            examBadge = `<span class="badge ${isPass ? 'bg-success' : 'bg-danger'} px-2 py-1">
              ${s.latestExamResult.examType}: ${s.latestExamResult.percentage}% (${s.latestExamResult.overallStatus})
            </span>`;
          }

          // Informative Fee Status Badge
          let feeBadge = '<span class="badge bg-success px-2 py-1"><i class="fa-solid fa-check me-1"></i>Paid</span>';
          if (s.hasPendingFee) {
            feeBadge = `<span class="badge bg-warning text-dark px-2 py-1">PKR ${s.pendingFeeAmount.toLocaleString()} Pending</span>`;
          }

          // Conflict Status
          let conflictBadge = '<span class="badge bg-success px-2 py-1"><i class="fa-solid fa-circle-check me-1"></i>Eligible</span>';
          if (s.isAlreadyEnrolled) {
            conflictBadge = `<span class="badge bg-danger px-2 py-1" title="${s.existingTargetClass}">
              <i class="fa-solid fa-triangle-exclamation me-1"></i>Enrolled in ${s.existingTargetClass || 'Target Session'}
            </span>`;
          }

          const tr = document.createElement('tr');
          tr.dataset.studentId = s.studentId;
          tr.dataset.isConflict = s.isAlreadyEnrolled ? 'true' : 'false';

          tr.innerHTML = `
            <td class="text-center">
              <input type="checkbox" class="form-check-input wizard-student-cb" 
                     ${s.isAlreadyEnrolled ? 'disabled' : 'checked'} 
                     value="${s.studentId}">
            </td>
            <td class="fw-bold">${s.currentRollNumber}</td>
            <td>
              <span class="fw-bold text-dark">${s.name}</span><br>
              <small class="text-muted">${s.fatherName}</small>
            </td>
            <td>${examBadge}</td>
            <td>${feeBadge}</td>
            <td>${conflictBadge}</td>
            <td>
              <select class="form-select form-select-sm wizard-action-select" ${s.isAlreadyEnrolled ? 'disabled' : ''}>
                <option value="Promote" selected>Promote</option>
                <option value="Repeat">Repeat / Retain</option>
              </select>
            </td>
            <td>
              <input type="text" class="form-control form-control-sm wizard-target-roll" 
                     value="${s.suggestedTargetRollNumber}" 
                     placeholder="Roll #" ${s.isAlreadyEnrolled ? 'disabled' : ''}>
            </td>
            <td>
              <input type="text" class="form-control form-control-sm wizard-promo-remarks" 
                     placeholder="Promotion note..." ${s.isAlreadyEnrolled ? 'disabled' : ''}>
            </td>
          `;
          tbody.appendChild(tr);
        });

        document.getElementById('promoPreviewArea').classList.remove('d-none');
        updatePromoSubmitButtonState();

        // Bind individual checkbox events
        document.querySelectorAll('.wizard-student-cb').forEach(cb => {
          cb.addEventListener('change', updatePromoSubmitButtonState);
        });

      } catch (err) {
        console.error('Promotion preview error:', err);
        alert(err.message || 'Failed to load promotion preview.');
      } finally {
        btnLoadPromotionPreview.disabled = false;
        btnLoadPromotionPreview.innerHTML = '<i class="fa-solid fa-magnifying-glass-chart me-2"></i>Load Promotion Sheet & Check Conflicts';
      }
    });
  }

  function updatePromoSubmitButtonState() {
    const checked = document.querySelectorAll('.wizard-student-cb:checked');
    if (btnExecutePromotionReview) {
      btnExecutePromotionReview.disabled = checked.length === 0;
    }
  }

  if (masterPromoCheckbox) {
    masterPromoCheckbox.addEventListener('change', function() {
      document.querySelectorAll('.wizard-student-cb:not(:disabled)').forEach(cb => {
        cb.checked = masterPromoCheckbox.checked;
      });
      updatePromoSubmitButtonState();
    });
  }

  if (btnPromoSelectAllEligible) {
    btnPromoSelectAllEligible.addEventListener('click', () => {
      document.querySelectorAll('.wizard-student-cb:not(:disabled)').forEach(cb => {
        cb.checked = true;
      });
      if (masterPromoCheckbox) masterPromoCheckbox.checked = true;
      updatePromoSubmitButtonState();
    });
  }

  if (btnPromoDeselectAll) {
    btnPromoDeselectAll.addEventListener('click', () => {
      document.querySelectorAll('.wizard-student-cb').forEach(cb => {
        cb.checked = false;
      });
      if (masterPromoCheckbox) masterPromoCheckbox.checked = false;
      updatePromoSubmitButtonState();
    });
  }

  // Open Safety Confirmation Modal
  if (btnExecutePromotionReview) {
    btnExecutePromotionReview.addEventListener('click', () => {
      const checkedCbs = document.querySelectorAll('.wizard-student-cb:checked');
      if (checkedCbs.length === 0) {
        alert('Please select at least one student to promote.');
        return;
      }

      // Check for duplicate roll numbers in checked list
      const rolls = [];
      let duplicateFound = false;
      checkedCbs.forEach(cb => {
        const row = cb.closest('tr');
        const roll = row.querySelector('.wizard-target-roll').value.trim();
        if (roll) {
          if (rolls.includes(roll)) {
            duplicateFound = roll;
          }
          rolls.push(roll);
        }
      });

      if (duplicateFound) {
        alert(`Duplicate target roll number detected: Roll #${duplicateFound}. Each student in a class must have a unique roll number.`);
        return;
      }

      if (cachedPromotionPreviewData) {
        document.getElementById('confirmSourceSession').textContent = cachedPromotionPreviewData.sourceSession;
        document.getElementById('confirmSourceClass').textContent = cachedPromotionPreviewData.sourceClass;
        document.getElementById('confirmTargetSession').textContent = cachedPromotionPreviewData.targetSession;
        document.getElementById('confirmTargetClass').textContent = cachedPromotionPreviewData.targetClass;
        document.getElementById('confirmTotalCount').textContent = checkedCbs.length;
      }

      const modal = new bootstrap.Modal(document.getElementById('promotionConfirmModal'));
      modal.show();
    });
  }

  // Execute Bulk Promotion via Managed Transaction
  const btnConfirmAndExecutePromotion = document.getElementById('btnConfirmAndExecutePromotion');
  if (btnConfirmAndExecutePromotion) {
    btnConfirmAndExecutePromotion.addEventListener('click', async () => {
      const checkedCbs = document.querySelectorAll('.wizard-student-cb:checked');
      const sourceSessionId = document.getElementById('wizardSourceSession').value;
      const targetSessionId = document.getElementById('wizardTargetSession').value;
      const targetClassId = document.getElementById('wizardTargetClass').value;

      const promotions = [];
      checkedCbs.forEach(cb => {
        const row = cb.closest('tr');
        const studentId = Number(cb.value);
        const action = row.querySelector('.wizard-action-select').value;
        const targetRollNumber = row.querySelector('.wizard-target-roll').value.trim();
        const remarks = row.querySelector('.wizard-promo-remarks').value.trim();

        promotions.push({
          studentId,
          action,
          targetRollNumber,
          remarks
        });
      });

      const btnText = document.getElementById('btnConfirmPromoText');
      const btnSpinner = document.getElementById('btnConfirmPromoSpinner');

      try {
        btnConfirmAndExecutePromotion.disabled = true;
        btnText.classList.add('d-none');
        btnSpinner.classList.remove('d-none');

        const res = await fetch('/api/students/promotion/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceAcademicYearId: Number(sourceSessionId),
            targetClassId: Number(targetClassId),
            targetAcademicYearId: Number(targetSessionId),
            promotions
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        showAlert(data.message || 'Promotion completed successfully.');

        // Hide confirmation modal
        const modalEl = document.getElementById('promotionConfirmModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        // Reset promotion area
        document.getElementById('promoPreviewArea').classList.add('d-none');
        cachedPromotionPreviewData = null;

        // Switch to Student Directory tab
        const dirTabBtn = document.getElementById('student-dir-tab-btn');
        if (dirTabBtn) {
          const bsTab = new bootstrap.Tab(dirTabBtn);
          bsTab.show();
        }
        loadStudentsView();

      } catch (err) {
        console.error('Promotion execution error:', err);
        alert(err.message || 'Failed to execute promotion.');
      } finally {
        btnConfirmAndExecutePromotion.disabled = false;
        btnText.classList.remove('d-none');
        btnSpinner.classList.add('d-none');
      }
    });
  }


  // ==========================================
  // SECTION TRANSFER HANDLER
  // ==========================================
  const transferSessionSelect = document.getElementById('transferSessionSelect');
  const transferStudentSelect = document.getElementById('transferStudentSelect');
  const sectionTransferForm = document.getElementById('sectionTransferForm');

  if (transferSessionSelect) {
    transferSessionSelect.addEventListener('change', async () => {
      const sessId = transferSessionSelect.value;
      if (!sessId) return;

      try {
        const res = await fetch(`/api/students?academicYearId=${sessId}`);
        const students = await res.json();

        transferStudentSelect.innerHTML = '<option value="" disabled selected>Select Student to Transfer</option>';
        students.forEach(s => {
          const enr = s.StudentEnrollments && s.StudentEnrollments[0];
          const cName = enr && enr.Class ? ` - ${enr.Class.class_name} (${enr.Class.section})` : '';
          const opt = document.createElement('option');
          opt.value = s.id;
          opt.dataset.className = enr && enr.Class ? `${enr.Class.class_name} - ${enr.Class.section}` : '';
          opt.dataset.classId = enr ? enr.class_id : '';
          opt.dataset.rollNumber = enr ? (enr.roll_number || s.roll_number) : s.roll_number;
          opt.textContent = `${s.name} (Roll #${s.roll_number})${cName}`;
          transferStudentSelect.appendChild(opt);
        });
      } catch (err) {
        console.error('Load students for section transfer error:', err);
      }
    });
  }

  if (transferStudentSelect) {
    transferStudentSelect.addEventListener('change', () => {
      const opt = transferStudentSelect.options[transferStudentSelect.selectedIndex];
      const note = document.getElementById('transferCurrentClassNote');
      if (opt && opt.dataset.className) {
        note.textContent = `Current: ${opt.dataset.className} (Roll #${opt.dataset.rollNumber || '-'})`;
      } else {
        note.textContent = '';
      }
    });
  }

  if (sectionTransferForm) {
    sectionTransferForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const studentId = document.getElementById('transferStudentSelect').value;
      const academicYearId = document.getElementById('transferSessionSelect').value;
      const targetClassId = document.getElementById('transferTargetClassSelect').value;
      const newRollNumber = document.getElementById('transferNewRollInput').value.trim();
      const remarks = document.getElementById('transferRemarksInput').value.trim();

      if (!studentId || !academicYearId || !targetClassId) {
        alert('Please fill out all required transfer fields.');
        return;
      }

      try {
        const res = await fetch('/api/students/section-transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: Number(studentId),
            academicYearId: Number(academicYearId),
            targetClassId: Number(targetClassId),
            newRollNumber,
            remarks
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        showAlert(data.message || 'Section transferred successfully.');
        sectionTransferForm.reset();
        document.getElementById('transferCurrentClassNote').textContent = '';
        loadStudentsView();
      } catch (err) {
        alert(err.message || 'Section transfer failed.');
      }
    });
  }


  // ==========================================
  // STUDENT STATUS MANAGER HANDLER
  // ==========================================
  const statusUpdateSessionSelect = document.getElementById('statusUpdateSessionSelect');
  const statusUpdateStudentSelect = document.getElementById('statusUpdateStudentSelect');
  const studentStatusUpdateForm = document.getElementById('studentStatusUpdateForm');

  if (statusUpdateSessionSelect) {
    statusUpdateSessionSelect.addEventListener('change', async () => {
      const sessId = statusUpdateSessionSelect.value;
      if (!sessId) return;

      try {
        const res = await fetch(`/api/students?academicYearId=${sessId}`);
        const students = await res.json();

        statusUpdateStudentSelect.innerHTML = '<option value="" disabled selected>Select Student</option>';
        students.forEach(s => {
          const enr = s.StudentEnrollments && s.StudentEnrollments[0];
          const status = enr ? enr.status : 'Active';
          const opt = document.createElement('option');
          opt.value = s.id;
          opt.dataset.currentStatus = status;
          opt.textContent = `${s.name} (Roll #${s.roll_number}) [${status}]`;
          statusUpdateStudentSelect.appendChild(opt);
        });
      } catch (err) {
        console.error('Load students for status update error:', err);
      }
    });
  }

  if (statusUpdateStudentSelect) {
    statusUpdateStudentSelect.addEventListener('change', () => {
      const opt = statusUpdateStudentSelect.options[statusUpdateStudentSelect.selectedIndex];
      const note = document.getElementById('statusUpdateCurrentStatusNote');
      if (opt && opt.dataset.currentStatus) {
        note.textContent = `Current Status: ${opt.dataset.currentStatus}`;
      } else {
        note.textContent = '';
      }
    });
  }

  if (studentStatusUpdateForm) {
    studentStatusUpdateForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const studentId = document.getElementById('statusUpdateStudentSelect').value;
      const academicYearId = document.getElementById('statusUpdateSessionSelect').value;
      const status = document.getElementById('statusUpdateNewStatusSelect').value;
      const remarks = document.getElementById('statusUpdateRemarksInput').value.trim();

      if (!studentId || !academicYearId || !status) {
        alert('Please fill out all required status fields.');
        return;
      }

      try {
        const res = await fetch('/api/students/status-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: Number(studentId),
            academicYearId: Number(academicYearId),
            status,
            remarks
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        showAlert(data.message || 'Status updated successfully.');
        studentStatusUpdateForm.reset();
        document.getElementById('statusUpdateCurrentStatusNote').textContent = '';
        loadStudentsView();
      } catch (err) {
        alert(err.message || 'Status update failed.');
      }
    });
  }



  // ==========================================
  // ==========================================
  // PANE 4b: STUDENT ATTENDANCE DASHBOARD
  // ==========================================
  let dailySummaryDataCache = [];

  function initAttendancePane() {
    // 1. Set default dates
    const todayStr = new Date().toISOString().split('T')[0];
    const dailyAttDateFilter = document.getElementById('dailyAttDateFilter');
    if (dailyAttDateFilter && !dailyAttDateFilter.value) {
      dailyAttDateFilter.value = todayStr;
    }

    const attMonthFilter = document.getElementById('attMonthFilter');
    if (attMonthFilter && !attMonthFilter.value) {
      const now = new Date();
      attMonthFilter.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    // 2. Populate Class filter
    fetch('/api/classes').then(r => r.json()).then(classes => {
      const sel = document.getElementById('attClassFilter');
      if (sel) {
        sel.innerHTML = '<option value="">-- Select Class --</option>';
        classes.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.id;
          opt.textContent = `${c.class_name} - Sec ${c.section}`;
          sel.appendChild(opt);
        });
      }
    }).catch(err => console.error('Error fetching classes for attendance:', err));

    // 3. Populate Students for History tab
    populateStudentsForHistoryFilter();

    // 4. Hook Listeners
    const loadDailyBtn = document.getElementById('loadDailyAttSummaryBtn');
    if (loadDailyBtn) {
      loadDailyBtn.onclick = loadDailyAttendanceSummary;
    }

    const searchInput = document.getElementById('dailyAttSearchFilter');
    if (searchInput) {
      searchInput.oninput = filterDailyAttendanceSummaryTable;
    }

    const loadMonthlyBtn = document.getElementById('loadAttendanceReportBtn');
    if (loadMonthlyBtn) {
      loadMonthlyBtn.onclick = loadMonthlyAttendanceReport;
    }

    const loadHistBtn = document.getElementById('loadStudentHistoryBtn');
    if (loadHistBtn) {
      loadHistBtn.onclick = loadStudentAttendanceHistory;
    }

    // Auto-load daily summary on initial pane view
    loadDailyAttendanceSummary();
  }

  // Populate student select for History sub-tab
  async function populateStudentsForHistoryFilter() {
    try {
      const sel = document.getElementById('historyStudentSelect');
      if (!sel || !activeSessionId) return;
      const res = await fetch(`/api/students?academicYearId=${activeSessionId}`);
      const students = await res.json();
      sel.innerHTML = '<option value="">-- Choose Student --</option>';
      students.forEach(s => {
        const clsName = s.StudentEnrollments && s.StudentEnrollments[0] && s.StudentEnrollments[0].Class 
          ? ` (${s.StudentEnrollments[0].Class.class_name})` 
          : '';
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = `Roll #${s.roll_number} - ${s.name}${clsName}`;
        sel.appendChild(opt);
      });
    } catch (err) {
      console.error('Populate history students error:', err);
    }
  }

  // --- 1. DAILY ATTENDANCE OVERVIEW ---
  async function loadDailyAttendanceSummary() {
    const dateInput = document.getElementById('dailyAttDateFilter');
    const date = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
    if (!date) { alert('Please select a date.'); return; }
    if (!activeSessionId) { alert('Active academic session required.'); return; }

    const tbody = document.querySelector('#dailyAttSummaryTable tbody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-4"><span class="spinner-border spinner-border-sm me-2"></span>Loading daily overview...</td></tr>`;
    }

    try {
      const res = await fetch(`/api/attendance/daily-summary?date=${date}&academicYearId=${activeSessionId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      dailySummaryDataCache = data.classes || [];
      const overall = data.overall || {};

      // Update stat cards
      const statsArea = document.getElementById('dailyAttStatsArea');
      if (statsArea) statsArea.classList.remove('d-none');

      document.getElementById('statDailyTotalClasses').textContent = overall.totalClasses || 0;
      document.getElementById('statDailyMarkedRatio').textContent = `${overall.markedClasses || 0} of ${overall.totalClasses || 0} classes marked`;
      document.getElementById('statDailyTotalPresent').textContent = overall.totalPresent || 0;
      document.getElementById('statDailyOverallPercent').textContent = `${overall.overallPercentage || 0}% overall`;
      document.getElementById('statDailyTotalAbsent').textContent = overall.totalAbsent || 0;
      document.getElementById('statDailyAbsentNote').textContent = `${overall.totalAbsent || 0} absent students`;
      document.getElementById('statDailyTotalLeave').textContent = overall.totalLeave || 0;

      renderDailyAttendanceSummaryTable(dailySummaryDataCache, date);
    } catch (err) {
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center text-danger py-4"><i class="fa-solid fa-triangle-exclamation me-2"></i>${err.message}</td></tr>`;
      }
    }
  }

  function renderDailyAttendanceSummaryTable(classesList, date) {
    const tbody = document.querySelector('#dailyAttSummaryTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!classesList || classesList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-4">No classes found for this session.</td></tr>`;
      return;
    }

    classesList.forEach(c => {
      const tr = document.createElement('tr');

      const statusBadge = c.marked
        ? `<span class="badge bg-success text-white px-2 py-1"><i class="fa-solid fa-circle-check me-1"></i>Marked ✓</span>`
        : `<span class="badge bg-warning text-dark px-2 py-1"><i class="fa-solid fa-clock me-1"></i>Not Marked ⚠</span>`;

      const pctBadge = c.marked && c.percentage !== null
        ? `<span class="badge ${c.percentage >= 75 ? 'bg-success' : 'bg-danger'} px-2 py-1">${c.percentage}%</span>`
        : `<span class="text-muted">-</span>`;

      tr.innerHTML = `
        <td class="fw-bold">${c.className}</td>
        <td class="text-center fw-semibold">${c.totalStudents}</td>
        <td class="text-center">${statusBadge}</td>
        <td class="text-center fw-bold text-success">${c.marked ? c.present : '-'}</td>
        <td class="text-center fw-bold text-danger">${c.marked ? c.absent : '-'}</td>
        <td class="text-center fw-bold text-warning">${c.marked ? c.leave : '-'}</td>
        <td class="text-center">${pctBadge}</td>
        <td class="small text-muted">${c.markedBy}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-primary fw-semibold btn-manage-day-att" data-class-id="${c.classId}" data-class-name="${c.className}" data-date="${date}">
            <i class="fa-solid ${c.marked ? 'fa-pen-to-square' : 'fa-clipboard-user'} me-1"></i>${c.marked ? 'View / Edit' : 'Mark Now'}
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Attach click listeners to view/edit buttons
    document.querySelectorAll('.btn-manage-day-att').forEach(btn => {
      btn.addEventListener('click', function() {
        const classId = this.getAttribute('data-class-id');
        const className = this.getAttribute('data-class-name');
        const selectedDate = this.getAttribute('data-date');
        openAdminClassDayModal(classId, className, selectedDate);
      });
    });
  }

  function filterDailyAttendanceSummaryTable() {
    const query = (document.getElementById('dailyAttSearchFilter')?.value || '').toLowerCase();
    const filtered = dailySummaryDataCache.filter(c => 
      c.className.toLowerCase().includes(query) || (c.markedBy && c.markedBy.toLowerCase().includes(query))
    );
    const date = document.getElementById('dailyAttDateFilter')?.value || new Date().toISOString().split('T')[0];
    renderDailyAttendanceSummaryTable(filtered, date);
  }

  // --- ADMIN QUICK VIEW / MARK ATTENDANCE MODAL ---
  let activeModalClassId = null;
  let activeModalDate = null;

  async function openAdminClassDayModal(classId, className, date) {
    activeModalClassId = classId;
    activeModalDate = date;

    const modalEl = document.getElementById('adminClassDayAttendanceModal');
    if (!modalEl) return;

    document.getElementById('modalAttDateText').textContent = date;
    document.getElementById('modalAttClassText').textContent = className;
    const badgeContainer = document.getElementById('modalAttStatusBadge');
    badgeContainer.innerHTML = '<span class="spinner-border spinner-border-sm text-primary"></span>';

    const tbody = document.querySelector('#modalClassDayAttTable tbody');
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4"><span class="spinner-border spinner-border-sm me-2"></span>Loading student list...</td></tr>`;

    const modalInstance = new bootstrap.Modal(modalEl);
    modalInstance.show();

    try {
      const [studRes, logsRes] = await Promise.all([
        fetch(`/api/students?classId=${classId}&academicYearId=${activeSessionId}`),
        fetch(`/api/attendance?classId=${classId}&date=${date}&academicYearId=${activeSessionId}`)
      ]);

      const students = await studRes.json();
      const logs = await logsRes.json();

      const logMap = {};
      logs.forEach(l => { logMap[l.student_id] = l.status; });

      const isMarked = logs.length > 0;
      badgeContainer.innerHTML = isMarked
        ? `<span class="badge bg-success px-2 py-1"><i class="fa-solid fa-check me-1"></i>Saved (${logs.length} students)</span>`
        : `<span class="badge bg-warning text-dark px-2 py-1"><i class="fa-solid fa-clock me-1"></i>Not Yet Saved</span>`;

      tbody.innerHTML = '';
      if (!students || students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">No students enrolled in this class.</td></tr>`;
        return;
      }

      students.forEach(s => {
        const currentStatus = logMap[s.id] || 'Present';
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="fw-semibold">${s.roll_number}</td>
          <td class="fw-bold">${s.name}</td>
          <td class="text-muted">${s.father_name}</td>
          <td>
            <div class="form-check form-check-inline">
              <input class="form-check-input modal-att-radio" type="radio" name="modal-att-${s.id}" id="m-p-${s.id}" value="Present" ${currentStatus === 'Present' ? 'checked' : ''}>
              <label class="form-check-label text-success fw-bold" for="m-p-${s.id}">Present</label>
            </div>
            <div class="form-check form-check-inline">
              <input class="form-check-input modal-att-radio" type="radio" name="modal-att-${s.id}" id="m-a-${s.id}" value="Absent" ${currentStatus === 'Absent' ? 'checked' : ''}>
              <label class="form-check-label text-danger fw-bold" for="m-a-${s.id}">Absent</label>
            </div>
            <div class="form-check form-check-inline">
              <input class="form-check-input modal-att-radio" type="radio" name="modal-att-${s.id}" id="m-l-${s.id}" value="Leave" ${currentStatus === 'Leave' ? 'checked' : ''}>
              <label class="form-check-label text-warning fw-bold" for="m-l-${s.id}">Leave</label>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });

      // Save button handler
      const btnSave = document.getElementById('btnSaveModalAttendance');
      btnSave.onclick = async () => {
        btnSave.disabled = true;
        btnSave.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

        const radios = document.querySelectorAll('.modal-att-radio:checked');
        const logsPayload = Array.from(radios).map(r => ({
          studentId: r.name.replace('modal-att-', ''),
          status: r.value
        }));

        try {
          const saveRes = await fetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              logs: logsPayload,
              date: activeModalDate,
              classId: activeModalClassId,
              academicYearId: activeSessionId
            })
          });

          const saveResult = await saveRes.json();
          if (!saveRes.ok) throw new Error(saveResult.error);

          showAlert('Attendance updated successfully.');
          modalInstance.hide();
          loadDailyAttendanceSummary();
        } catch (saveErr) {
          alert('Failed to save attendance: ' + saveErr.message);
        } finally {
          btnSave.disabled = false;
          btnSave.innerHTML = '<i class="fa-solid fa-save me-2"></i>Save / Update Attendance';
        }
      };

    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-4"><i class="fa-solid fa-triangle-exclamation me-2"></i>${err.message}</td></tr>`;
    }
  }

  // --- 2. MONTHLY ATTENDANCE GRID ---
  async function loadMonthlyAttendanceReport() {
    const classId = document.getElementById('attClassFilter').value;
    const month = document.getElementById('attMonthFilter').value;
    if (!classId || !month) { alert('Please select Class and Month.'); return; }
    if (!activeSessionId) { alert('No active session found.'); return; }

    const head = document.getElementById('attReportHead');
    const body = document.getElementById('attReportBody');
    body.innerHTML = `<tr><td colspan="10" class="text-center text-muted py-4"><span class="spinner-border spinner-border-sm me-2"></span>Loading monthly report...</td></tr>`;
    document.getElementById('attReportArea').classList.remove('d-none');

    try {
      const res = await fetch(`/api/attendance/monthly?classId=${classId}&academicYearId=${activeSessionId}&month=${month}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const { students, dates, summary } = data;

      // Update Monthly summary cards
      const monthlyCards = document.getElementById('monthlySummaryCards');
      if (monthlyCards && summary) {
        monthlyCards.classList.remove('d-none');
        document.getElementById('statMonthlyStudents').textContent = summary.totalStudents || 0;
        document.getElementById('statMonthlyDays').textContent = summary.attendanceDaysCount || 0;
        document.getElementById('statMonthlyAvgPercent').textContent = `${summary.classAveragePercentage || 0}%`;
        document.getElementById('statMonthlyLowCount').textContent = `${summary.lowAttendanceCount || 0} students`;
      }

      // Build header: Roll | Name | 01 | 02 | ... | P | A | L | %
      const shortDates = dates.map(d => d.split('-')[2]);

      head.innerHTML = `<tr>
        <th style="min-width:60px;">Roll</th>
        <th style="min-width:160px;">Student Name</th>
        ${shortDates.map(d => `<th class="text-center" style="min-width:32px; font-size:12px;">${d}</th>`).join('')}
        <th class="text-success text-center" style="min-width:40px;">P</th>
        <th class="text-danger text-center" style="min-width:40px;">A</th>
        <th class="text-warning text-center" style="min-width:40px;">L</th>
        <th class="text-center" style="min-width:65px;">%</th>
      </tr>`;

      const badge = (status) => {
        if (!status) return '<span class="text-muted" style="opacity:0.4;">-</span>';
        if (status === 'Present') return '<span class="badge bg-success" style="font-size:10px; padding:3px 5px;">P</span>';
        if (status === 'Absent')  return '<span class="badge bg-danger"  style="font-size:10px; padding:3px 5px;">A</span>';
        if (status === 'Leave')   return '<span class="badge bg-warning text-dark" style="font-size:10px; padding:3px 5px;">L</span>';
        return status;
      };

      body.innerHTML = '';
      if (!students || students.length === 0) {
        body.innerHTML = `<tr><td colspan="${dates.length + 6}" class="text-center text-muted py-4">No students found for this class.</td></tr>`;
      } else {
        students.forEach(st => {
          const tr = document.createElement('tr');
          const pct = st.summary.percentage !== undefined ? st.summary.percentage : 0;
          const pctColor = pct >= 75 ? 'text-success' : 'text-danger';

          tr.innerHTML = `
            <td class="fw-semibold">${st.roll_number}</td>
            <td class="fw-bold">${st.name}<br><small class="text-muted">${st.father_name}</small></td>
            ${dates.map(d => `<td class="text-center">${badge(st.record[d])}</td>`).join('')}
            <td class="text-center fw-bold text-success">${st.summary.present}</td>
            <td class="text-center fw-bold text-danger">${st.summary.absent}</td>
            <td class="text-center fw-bold text-warning">${st.summary.leave}</td>
            <td class="text-center fw-bold ${pctColor}">${pct}%</td>
          `;
          body.appendChild(tr);
        });
      }

      document.getElementById('attReportArea').classList.remove('d-none');
    } catch (err) {
      body.innerHTML = `<tr><td colspan="10" class="text-center text-danger py-4"><i class="fa-solid fa-triangle-exclamation me-2"></i>${err.message}</td></tr>`;
    }
  }

  // --- 3. STUDENT ATTENDANCE HISTORY ---
  async function loadStudentAttendanceHistory() {
    const studentId = document.getElementById('historyStudentSelect').value;
    const month = document.getElementById('historyMonthFilter').value;
    if (!studentId) { alert('Please select a student.'); return; }
    if (!activeSessionId) { alert('Active academic session required.'); return; }

    const detailsArea = document.getElementById('studentHistoryDetailsArea');
    const tbody = document.querySelector('#studentHistoryTable tbody');
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4"><span class="spinner-border spinner-border-sm me-2"></span>Loading attendance history...</td></tr>`;
    detailsArea.classList.remove('d-none');

    try {
      let url = `/api/attendance/student-history?studentId=${studentId}&academicYearId=${activeSessionId}`;
      if (month) url += `&month=${month}`;

      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const { student, logs, summary } = data;

      // Update student profile card
      document.getElementById('histStudentName').textContent = student.name || '-';
      document.getElementById('histStudentRoll').textContent = student.roll_number || '-';
      document.getElementById('histStudentFather').textContent = student.father_name || '-';
      document.getElementById('histStudentReg').textContent = student.registration_number || '-';
      document.getElementById('histStudentAvatar').src = student.photo || '/img/logo.png';

      // Summary badges
      document.getElementById('histPresentCount').textContent = summary.present || 0;
      document.getElementById('histAbsentCount').textContent = summary.absent || 0;
      document.getElementById('histLeaveCount').textContent = summary.leave || 0;
      document.getElementById('histPercentage').textContent = `${summary.percentage || 0}%`;

      tbody.innerHTML = '';
      if (!logs || logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">No attendance records found for this student.</td></tr>`;
        return;
      }

      logs.forEach(l => {
        let badgeHtml = '';
        if (l.status === 'Present') badgeHtml = '<span class="badge bg-success px-2 py-1"><i class="fa-solid fa-check me-1"></i>Present</span>';
        else if (l.status === 'Absent') badgeHtml = '<span class="badge bg-danger px-2 py-1"><i class="fa-solid fa-xmark me-1"></i>Absent</span>';
        else if (l.status === 'Leave') badgeHtml = '<span class="badge bg-warning text-dark px-2 py-1"><i class="fa-solid fa-envelope me-1"></i>Leave</span>';

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="fw-bold">${l.date}</td>
          <td>${l.className}</td>
          <td>${badgeHtml}</td>
          <td class="small text-muted">${l.markedBy}</td>
        `;
        tbody.appendChild(tr);
      });

    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-4"><i class="fa-solid fa-triangle-exclamation me-2"></i>${err.message}</td></tr>`;
    }
  }

  // ==========================================
  // PANE 5: TEACHERS MANAGEMENT
  // ==========================================
  async function loadTeachersView() {
    try {
      const res = await fetch('/api/teachers');
      const teachers = await res.json();
      
      const tbody = document.querySelector('#teacher-directory tbody');
      tbody.innerHTML = '';

      teachers.forEach(t => {
        const isPaid = t.paid_this_month;
        const payBtn = isPaid
          ? `<span class="badge bg-success text-white px-2 py-1 me-1"><i class="fa-solid fa-check-circle me-1"></i>Paid</span>` +
            `<button class="btn btn-sm btn-outline-success pay-salary-btn" data-id="${t.id}" data-name="${t.User.name}" title="Click to view history or add payment"><i class="fa-solid fa-history me-1"></i>PKR ${Number(t.total_paid_this_month).toLocaleString()}</button>`
          : `<button class="btn btn-sm btn-success pay-salary-btn" data-id="${t.id}" data-name="${t.User.name}"><i class="fa-solid fa-money-check-dollar me-1"></i> Pay</button>`;

        const photoImg = t.photo ? `<img src="${t.photo}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;" class="me-2 border">` : `<i class="fa-solid fa-circle-user me-2 text-muted fs-5"></i>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${t.id}</td>
          <td class="fw-bold d-flex align-items-center">${photoImg}<span>${t.User.name}</span></td>
          <td>${t.User.email}</td>
          <td>${t.qualification || '---'}</td>
          <td class="fw-semibold">PKR ${Number(t.salary).toLocaleString()}</td>
          <td>${t.joining_date}</td>
          <td>
            <div class="d-flex align-items-center gap-1">
              ${payBtn}
              <button class="btn btn-sm btn-outline-danger delete-teacher-btn" data-id="${t.id}" title="Delete faculty"><i class="fa-solid fa-trash"></i></button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });

      // Bind delete teacher buttons
      document.querySelectorAll('.delete-teacher-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (confirm('Delete teacher record? This deletes their assignments and system login credentials.')) {
            const id = btn.getAttribute('data-id');
            await deleteTeacher(id);
          }
        });
      });

      // Bind pay salary buttons
      document.querySelectorAll('.pay-salary-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const tId = btn.getAttribute('data-id');
          const tName = btn.getAttribute('data-name');
          openPaySalaryModalForTeacher(tId, tName);
        });
      });

      // Load assignments and dropdowns
      loadAssignmentsList();
      populateFormDropdowns();
    } catch (err) {
      console.error(err);
    }
  }

  async function openPaySalaryModalForTeacher(teacherId, teacherName) {
    try {
      if (!activeSessionId) {
        alert('Please setup active session first.');
        return;
      }
      const dashMonth = document.getElementById('dashboardMonth');
      const month = (dashMonth && dashMonth.value) ? dashMonth.value : 'August';
      const res = await fetch(`/api/teachers/payroll?month=${month}&academicYearId=${activeSessionId}`);
      const records = await res.json();
      const rec = records.find(r => Number(r.teacher_id) === Number(teacherId));
      if (rec) {
        openPaySalaryModal(rec.id);
      } else {
        alert('Could not locate or generate monthly salary voucher for teacher.');
      }
    } catch (err) {
      alert(err.message || 'Error opening salary payment modal.');
    }
  }

  async function deleteTeacher(id) {
    try {
      const res = await fetch(`/api/teachers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showAlert('Teacher profile and credentials removed.');
        loadTeachersView();
        populateFormDropdowns();
      }
    } catch (error) {
      console.error(error);
    }
  }

  // Toggle password visibility for Teacher Registration modal
  const toggleTeacherPasswordBtn = document.getElementById('toggleTeacherPassword');
  if (toggleTeacherPasswordBtn) {
    toggleTeacherPasswordBtn.addEventListener('click', () => {
      const pwdInput = document.getElementById('teacherPasswordInput');
      const icon = document.getElementById('toggleTeacherPasswordIcon');
      if (pwdInput && icon) {
        const isPassword = pwdInput.type === 'password';
        pwdInput.type = isPassword ? 'text' : 'password';
        icon.className = isPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
      }
    });
  }

  // Submit Register Teacher
  document.getElementById('createTeacherForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('teacherNameInput').value.trim();
    const emailPrefix = document.getElementById('teacherEmailInput').value.trim();
    const email = emailPrefix.includes('@') ? emailPrefix : emailPrefix + '@waseem.edu.pk';
    const password = document.getElementById('teacherPasswordInput').value;
    const qualification = document.getElementById('teacherQualification').value.trim();
    const salary = document.getElementById('teacherSalary').value;
    const joining_date = document.getElementById('teacherJoining').value;

    try {
      const res = await fetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, qualification, salary, joining_date })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showAlert('Faculty registered successfully.');
      document.getElementById('createTeacherForm').reset();
      
      const modalEl = document.getElementById('addTeacherModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      await loadTeachersView();
      await populateFormDropdowns();
    } catch (error) {
      alert(error.message);
    }
  });

  // Re-populate dropdowns when Assignments tab is opened
  const teachersAssignmentsTabBtn = document.getElementById('teachers-assignments-tab');
  if (teachersAssignmentsTabBtn) {
    teachersAssignmentsTabBtn.addEventListener('click', () => {
      populateFormDropdowns();
      loadAssignmentsList();
    });
  }

  // Create Assignment Submit
  document.getElementById('createAssignmentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeSessionId) {
      alert('Setup active session first.');
      return;
    }

    const teacher_id = document.getElementById('assignTeacherSelect').value;
    const class_id = document.getElementById('assignClassSelect').value;

    try {
      const res = await fetch('/api/teachers/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacher_id, class_id, academic_year_id: activeSessionId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showAlert('Class mapped to faculty.');
      document.getElementById('createAssignmentForm').reset();
      loadAssignmentsList();
    } catch (err) {
      showAlert(err.message, 'danger');
    }
  });

  async function loadAssignmentsList() {
    try {
      const query = activeSessionId ? `?academicYearId=${activeSessionId}` : '';
      const res = await fetch(`/api/teachers/assignments${query}`);
      const assignments = await res.json();

      const tbody = document.querySelector('#teacher-assignments tbody');
      tbody.innerHTML = '';

      assignments.forEach(a => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${a.id}</td>
          <td class="fw-bold">${a.Teacher.User.name}</td>
          <td>${a.Class.class_name} - Section ${a.Class.section}</td>
          <td>
            <button class="btn btn-sm btn-danger remove-assign-btn" data-id="${a.id}"><i class="fa-solid fa-link-slash"></i></button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      document.querySelectorAll('.remove-assign-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (confirm('Remove this subject assignment?')) {
            const id = btn.getAttribute('data-id');
            const delRes = await fetch(`/api/teachers/assignments/${id}`, { method: 'DELETE' });
            if (delRes.ok) {
              showAlert('Assignment removed.');
              loadAssignmentsList();
            }
          }
        });
      });

    } catch (err) {
      console.error(err);
    }
  }

  // MARK TEACHER ATTENDANCE
  const loadTeacherAttendanceBtn = document.getElementById('loadTeacherAttendanceBtn');
  if (loadTeacherAttendanceBtn) {
    loadTeacherAttendanceBtn.addEventListener('click', async () => {
      const date = document.getElementById('teacherAttendanceDate').value;
      if (!date || !activeSessionId) {
        alert('Please select Date and ensure an Active session exists.');
        return;
      }

      try {
        // Fetch teachers list & existing attendance log
        const [teachRes, logsRes] = await Promise.all([
          fetch('/api/teachers'),
          fetch(`/api/teachers/attendance?date=${date}&academicYearId=${activeSessionId}`)
        ]);

        const teachers = await teachRes.json();
        const logs = await logsRes.json();

        // Create log lookup map
        const logMap = {};
        logs.forEach(l => {
          logMap[l.teacher_id] = l.status;
        });

        const tbody = document.querySelector('#teacherAttendanceMarkTable tbody');
        tbody.innerHTML = '';

        if (teachers.length === 0) {
          tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">No teachers registered.</td></tr>`;
          return;
        }

        teachers.forEach(t => {
          const status = logMap[t.id] || 'Present';
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td class="fw-bold">${t.User.name}</td>
            <td>${t.User.email}</td>
            <td>
              <select class="form-select form-select-sm teacher-attendance-status-select" data-teacher-id="${t.id}" style="width: 130px;">
                <option value="Present" ${status === 'Present' ? 'selected' : ''}>Present</option>
                <option value="Absent" ${status === 'Absent' ? 'selected' : ''}>Absent</option>
                <option value="Leave" ${status === 'Leave' ? 'selected' : ''}>Leave</option>
              </select>
            </td>
          `;
          tbody.appendChild(tr);
        });

        document.getElementById('teacherAttendanceMarkArea').classList.remove('d-none');

      } catch (err) {
        console.error(err);
      }
    });
  }

  const saveTeacherAttendanceBtn = document.getElementById('saveTeacherAttendanceBtn');
  if (saveTeacherAttendanceBtn) {
    saveTeacherAttendanceBtn.addEventListener('click', async () => {
      const date = document.getElementById('teacherAttendanceDate').value;
      const selects = document.querySelectorAll('.teacher-attendance-status-select');
      
      const logs = Array.from(selects).map(sel => ({
        teacherId: sel.getAttribute('data-teacher-id'),
        status: sel.value
      }));

      try {
        const res = await fetch('/api/teachers/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ logs, date, academicYearId: activeSessionId })
        });
        if (res.ok) {
          showAlert('Teacher attendance log recorded successfully.');
          document.getElementById('teacherAttendanceMarkArea').classList.add('d-none');
          document.getElementById('teacherAttendanceDate').value = '';
        }
      } catch (err) {
        console.error(err);
      }
    });
  }

  // --- FACULTY PAYROLL & SALARY MANAGEMENT ---
  const payrollMonthFilter = document.getElementById('payrollMonthFilter');
  const payrollStatusFilter = document.getElementById('payrollStatusFilter');
  const payrollSearchTeacher = document.getElementById('payrollSearchTeacher');
  const btnSyncPayroll = document.getElementById('btnSyncPayroll');

  if (payrollMonthFilter) payrollMonthFilter.addEventListener('change', loadTeacherPayrollView);
  if (payrollStatusFilter) payrollStatusFilter.addEventListener('change', loadTeacherPayrollView);

  let payrollSearchTimeout = null;
  if (payrollSearchTeacher) {
    payrollSearchTeacher.addEventListener('input', () => {
      clearTimeout(payrollSearchTimeout);
      payrollSearchTimeout = setTimeout(loadTeacherPayrollView, 300);
    });
  }

  if (btnSyncPayroll) {
    btnSyncPayroll.addEventListener('click', async () => {
      if (!activeSessionId) {
        alert('Please setup active session first.');
        return;
      }
      const month = payrollMonthFilter ? payrollMonthFilter.value : 'August';
      try {
        const res = await fetch('/api/teachers/payroll/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ month, academicYearId: activeSessionId })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        showAlert(data.message);
        loadTeacherPayrollView();
        loadDashboardOverview();
      } catch (err) {
        alert(err.message || 'Failed to sync monthly payroll.');
      }
    });
  }

  async function loadTeacherPayrollView() {
    try {
      if (!activeSessionId) return;
      const month = payrollMonthFilter ? payrollMonthFilter.value : 'August';
      const statusFilter = payrollStatusFilter ? payrollStatusFilter.value : '';
      const searchTerm = payrollSearchTeacher ? payrollSearchTeacher.value.trim().toLowerCase() : '';

      const res = await fetch(`/api/teachers/payroll?month=${month}&academicYearId=${activeSessionId}`);
      const records = await res.json();

      const tbody = document.querySelector('#payrollTable tbody');
      if (!tbody) return;
      tbody.innerHTML = '';

      const filtered = records.filter(r => {
        const nameMatch = !searchTerm || (r.Teacher && r.Teacher.User && r.Teacher.User.name.toLowerCase().includes(searchTerm));
        const statusMatch = !statusFilter || r.status === statusFilter;
        return nameMatch && statusMatch;
      });

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4"><i class="fa-solid fa-inbox me-2"></i>No payroll records found for this month.</td></tr>';
        return;
      }

      filtered.forEach(r => {
        let badgeClass = 'badge bg-danger';
        if (r.status === 'Paid') badgeClass = 'badge bg-success';
        else if (r.status === 'Partial') badgeClass = 'badge bg-warning text-dark';

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${r.Teacher ? r.Teacher.id : r.teacher_id}</td>
          <td class="fw-bold">${r.Teacher && r.Teacher.User ? r.Teacher.User.name : 'Teacher'}</td>
          <td class="fw-semibold">PKR ${Number(r.basic_salary).toLocaleString()}</td>
          <td class="text-success fw-bold">PKR ${Number(r.paid_amount).toLocaleString()}</td>
          <td class="text-danger fw-bold">PKR ${Number(r.remaining_amount).toLocaleString()}</td>
          <td><span class="${badgeClass} px-2 py-1" style="font-size:0.75rem;">${r.status}</span></td>
          <td>
            <div class="d-flex align-items-center gap-1">
              <button class="btn btn-sm btn-success pay-payroll-record-btn" data-record-id="${r.id}"><i class="fa-solid fa-money-check-dollar me-1"></i> Pay</button>
              <button class="btn btn-sm btn-outline-secondary view-teacher-history-btn" data-teacher-id="${r.teacher_id}" data-name="${r.Teacher && r.Teacher.User ? r.Teacher.User.name : 'Teacher'}"><i class="fa-solid fa-history me-1"></i> History</button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });

      // Bind buttons
      document.querySelectorAll('.pay-payroll-record-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const recordId = btn.getAttribute('data-record-id');
          openPaySalaryModal(recordId);
        });
      });

      document.querySelectorAll('.view-teacher-history-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const tId = btn.getAttribute('data-teacher-id');
          const tName = btn.getAttribute('data-name');
          openTeacherSalaryHistoryModal(tId, tName);
        });
      });

    } catch (err) {
      console.error('Load teacher payroll view error:', err);
    }
  }

  // OPEN PAY SALARY MODAL FOR A SPECIFIC RECORD
  async function openPaySalaryModal(recordId) {
    try {
      const res = await fetch(`/api/teachers/salary-records/${recordId}`);
      const record = await res.json();
      if (!res.ok) throw new Error(record.error);

      document.getElementById('salaryRecordId').value = record.id;
      document.getElementById('salaryTeacherId').value = record.teacher_id;
      document.getElementById('salaryTeacherName').value = record.Teacher ? record.Teacher.User.name : 'Teacher';
      document.getElementById('salaryPaymentDate').value = new Date().toISOString().substring(0, 10);
      document.getElementById('salaryAmount').value = Number(record.remaining_amount) > 0 ? Number(record.remaining_amount) : '';
      document.getElementById('salaryNotes').value = '';

      document.getElementById('modalSalaryMonth').textContent = `${record.month} (${record.AcademicYear ? record.AcademicYear.year_name : ''})`;
      document.getElementById('modalSalaryBasic').textContent = `PKR ${Number(record.basic_salary).toLocaleString()}`;
      document.getElementById('modalSalaryPaid').textContent = `PKR ${Number(record.paid_amount).toLocaleString()}`;
      document.getElementById('modalSalaryRemaining').textContent = `PKR ${Number(record.remaining_amount).toLocaleString()}`;

      // Populate history table inside modal
      const tbody = document.querySelector('#teacherSalaryHistoryTable tbody');
      if (tbody) {
        tbody.innerHTML = '';
        if (record.TeacherSalaryPayments && record.TeacherSalaryPayments.length > 0) {
          record.TeacherSalaryPayments.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td>${p.payment_date}</td>
              <td class="fw-bold text-success">PKR ${Number(p.amount).toLocaleString()}</td>
              <td><span class="badge bg-secondary">${p.payment_method || 'Cash'}</span></td>
            `;
            tbody.appendChild(tr);
          });
        } else {
          tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No payment transactions logged yet.</td></tr>';
        }
      }

      new bootstrap.Modal(document.getElementById('payTeacherSalaryModal')).show();
    } catch (err) {
      alert(err.message || 'Error opening salary payment modal.');
    }
  }

  // OPEN MULTI-MONTH SALARY HISTORY MODAL FOR A TEACHER
  async function openTeacherSalaryHistoryModal(teacherId, teacherName) {
    try {
      document.getElementById('historyTeacherName').textContent = teacherName || 'Teacher';
      const res = await fetch(`/api/teachers/${teacherId}/salary-history`);
      const records = await res.json();

      const tbody = document.querySelector('#multiMonthHistoryTable tbody');
      if (tbody) {
        tbody.innerHTML = '';
        if (records.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">No monthly salary records found.</td></tr>';
        } else {
          records.forEach(r => {
            let badgeClass = 'badge bg-danger';
            if (r.status === 'Paid') badgeClass = 'badge bg-success';
            else if (r.status === 'Partial') badgeClass = 'badge bg-warning text-dark';

            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td class="fw-bold">${r.month}</td>
              <td>${r.AcademicYear ? r.AcademicYear.year_name : '-'}</td>
              <td>PKR ${Number(r.basic_salary).toLocaleString()}</td>
              <td class="text-success fw-bold">PKR ${Number(r.paid_amount).toLocaleString()}</td>
              <td class="text-danger fw-bold">PKR ${Number(r.remaining_amount).toLocaleString()}</td>
              <td><span class="${badgeClass}">${r.status}</span></td>
            `;
            tbody.appendChild(tr);
          });
        }
      }

      new bootstrap.Modal(document.getElementById('teacherSalaryHistoryModal')).show();
    } catch (err) {
      alert('Error loading salary history: ' + err.message);
    }
  }

  // SUBMIT SALARY PAYMENT FORM
  const payTeacherSalaryForm = document.getElementById('payTeacherSalaryForm');
  if (payTeacherSalaryForm) {
    payTeacherSalaryForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = payTeacherSalaryForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      const recordId = document.getElementById('salaryRecordId').value;
      const teacherId = document.getElementById('salaryTeacherId').value;
      const amount = document.getElementById('salaryAmount').value;
      const payment_date = document.getElementById('salaryPaymentDate').value;
      const payment_method = document.getElementById('salaryPaymentMethod').value;
      const notes = document.getElementById('salaryNotes').value.trim();

      if (!amount || Number(amount) <= 0) {
        alert('Please enter a valid salary payment amount.');
        if (submitBtn) submitBtn.disabled = false;
        return;
      }

      let endpointUrl = '';
      if (recordId) {
        endpointUrl = `/api/teachers/salary-records/${recordId}/payments`;
      } else if (teacherId) {
        endpointUrl = `/api/teachers/${teacherId}/payments`;
      } else {
        alert('Missing teacher or salary record reference.');
        if (submitBtn) submitBtn.disabled = false;
        return;
      }

      try {
        const res = await fetch(endpointUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: Number(amount),
            payment_date,
            payment_method,
            notes,
            academicYearId: activeSessionId
          })
        });

        let data = {};
        try {
          data = await res.json();
        } catch (jsonErr) {
          throw new Error(`Server returned status ${res.status} (${res.statusText})`);
        }

        if (!res.ok) throw new Error(data.error || 'Failed to record salary payment.');

        showAlert(data.message || 'Salary payment recorded successfully.');
        document.getElementById('salaryAmount').value = '';
        document.getElementById('salaryNotes').value = '';

        const modalEl = document.getElementById('payTeacherSalaryModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        loadTeacherPayrollView();
        loadDashboardOverview();
        loadTeachersView();
      } catch (err) {
        alert(err.message || 'Failed to record salary payment.');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }



  // ==========================================
  // PANE 6: FEE MANAGEMENT
  // ==========================================
  const feeFilterClass = document.getElementById('feeFilterClass');
  const feeFilterMonth = document.getElementById('feeFilterMonth');
  const feeFilterStatus = document.getElementById('feeFilterStatus');
  const feeSearchStudent = document.getElementById('feeSearchStudent');

  if (feeFilterClass) feeFilterClass.addEventListener('change', loadFeesView);
  if (feeFilterMonth) feeFilterMonth.addEventListener('change', loadFeesView);
  if (feeFilterStatus) feeFilterStatus.addEventListener('change', loadFeesView);

  // Debounced student name search
  let feeSearchTimeout = null;
  if (feeSearchStudent) {
    feeSearchStudent.addEventListener('input', () => {
      clearTimeout(feeSearchTimeout);
      feeSearchTimeout = setTimeout(loadFeesView, 300);
    });
  }

  async function loadFeesView() {
    try {
      if (!activeSessionId) return;
      const classId = feeFilterClass ? feeFilterClass.value : '';
      const month = feeFilterMonth ? feeFilterMonth.value : '';
      const status = feeFilterStatus ? feeFilterStatus.value : '';
      const searchTerm = feeSearchStudent ? feeSearchStudent.value.trim().toLowerCase() : '';

      let query = `?academicYearId=${activeSessionId}`;
      if (classId) query += `&classId=${classId}`;
      if (month) query += `&month=${month}`;
      if (status) query += `&status=${status}`;

      const res = await fetch(`/api/fees/records${query}`);
      const bills = await res.json();

      const tbody = document.querySelector('#feesTable tbody');
      tbody.innerHTML = '';

      // Client-side search filter
      const filtered = searchTerm
        ? bills.filter(b =>
            b.Student.name.toLowerCase().includes(searchTerm) ||
            b.Student.roll_number.toLowerCase().includes(searchTerm) ||
            (b.Student.father_name && b.Student.father_name.toLowerCase().includes(searchTerm))
          )
        : bills;

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4"><i class="fa-solid fa-inbox me-2"></i>No fee records found matching your criteria.</td></tr>';
      } else {
        filtered.forEach(b => {
          let badgeClass = 'status-badge pending';
          if (b.status === 'Paid') badgeClass = 'status-badge paid';
          else if (b.status === 'Partial') badgeClass = 'status-badge partial';

          const hasCustomFee = b.Student.custom_fee !== null && b.Student.custom_fee !== undefined;
          const customBadge = hasCustomFee
            ? `<span class="badge bg-info text-white ms-1" style="font-size:0.65rem" title="Custom fee override active">Custom</span>`
            : '';

          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${b.Student.roll_number}</td>
            <td class="fw-bold">${b.Student.name}${customBadge}</td>
            <td>${b.Class.class_name} - ${b.Class.section}</td>
            <td>${b.month}</td>
            <td class="fw-semibold">PKR ${Number(b.amount).toLocaleString()}</td>
            <td class="text-success fw-semibold">PKR ${Number(b.paid_amount).toLocaleString()}</td>
            <td class="text-danger fw-semibold">PKR ${Number(b.remaining_amount).toLocaleString()}</td>
            <td><span class="${badgeClass}">${b.status}</span></td>
            <td>
              <div class="d-flex gap-1">
                ${b.status !== 'Paid'
                  ? `<button class="btn btn-sm btn-success record-pay-btn" data-id="${b.id}" data-student="${b.Student.name}" data-month="${b.month}" data-total="${b.amount}" data-paid="${b.paid_amount}" data-remaining="${b.remaining_amount}"><i class="fa-solid fa-cash-register me-1"></i>Collect</button>`
                  : `<span class="text-muted fs-7">Settled</span>`}
                <button class="btn btn-sm btn-outline-primary edit-fee-btn" data-student-id="${b.student_id}" data-student-name="${b.Student.name}" data-class="${b.Class.class_name} - ${b.Class.section}" data-class-id="${b.class_id}" data-custom-fee="${b.Student.custom_fee || ''}"><i class="fa-solid fa-user-pen me-1"></i>Edit Fee</button>
              </div>
            </td>
          `;
          tbody.appendChild(tr);
        });
      }

      // Bind Record Payment modal buttons
      document.querySelectorAll('.record-pay-btn').forEach(btn => {
        btn.addEventListener('click', () => openRecordPaymentModal(btn));
      });

      // Bind Edit Custom Fee modal buttons
      document.querySelectorAll('.edit-fee-btn').forEach(btn => {
        btn.addEventListener('click', () => openEditCustomFeeModal(btn));
      });

      // Load class-wise summary report
      loadClassWiseReport();

    } catch (err) {
      console.error(err);
    }
  }

  // --- Class-wise Fee Collection Report ---
  async function loadClassWiseReport() {
    try {
      const month = feeFilterMonth ? feeFilterMonth.value : '';
      const reportTbody = document.querySelector('#classWiseReportTable tbody');
      if (!month || !activeSessionId) {
        if (reportTbody) reportTbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-3">Select a specific month to view class-wise summary.</td></tr>';
        return;
      }

      const res = await fetch(`/api/reports/class-wise-fees?month=${month}&academicYearId=${activeSessionId}`);
      const report = await res.json();

      if (!reportTbody) return;
      reportTbody.innerHTML = '';

      const activeClasses = report.filter(r => r.studentCount > 0 || r.expected > 0);
      if (activeClasses.length === 0) {
        reportTbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-3">No fee data found for the selected month.</td></tr>';
        return;
      }

      activeClasses.forEach(r => {
        const rateColor = r.collectionRate >= 90 ? 'bg-success' : r.collectionRate >= 60 ? 'bg-warning' : 'bg-danger';
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.innerHTML = `
          <td class="fw-bold">${r.class_name} - ${r.section}</td>
          <td>${r.studentCount}</td>
          <td class="fw-semibold">PKR ${Number(r.expected).toLocaleString()}</td>
          <td class="text-success fw-semibold">PKR ${Number(r.collected).toLocaleString()}</td>
          <td class="text-danger fw-semibold">PKR ${Number(r.pending).toLocaleString()}</td>
          <td><span class="badge ${rateColor} text-white">${r.collectionRate}%</span></td>
          <td><button class="btn btn-sm btn-outline-primary class-report-view-btn" data-class-id="${r.id}"><i class="fa-solid fa-eye me-1"></i>View</button></td>
        `;
        reportTbody.appendChild(tr);
      });

      // Clicking a class row filters the fee table
      document.querySelectorAll('.class-report-view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const classId = btn.getAttribute('data-class-id');
          if (feeFilterClass) {
            feeFilterClass.value = classId;
            loadFeesView();
          }
        });
      });

    } catch (err) {
      console.error('Load class-wise report error:', err);
    }
  }

  // --- Record Payment Modal ---
  function openRecordPaymentModal(btn) {
    const feeId = btn.getAttribute('data-id');
    const studentName = btn.getAttribute('data-student');
    const month = btn.getAttribute('data-month');
    const total = btn.getAttribute('data-total');
    const paid = btn.getAttribute('data-paid');
    const remaining = btn.getAttribute('data-remaining');

    document.getElementById('recordPaymentFeeId').value = feeId;
    document.getElementById('recordPaymentStudentName').textContent = studentName;
    document.getElementById('recordPaymentMonth').textContent = month;
    document.getElementById('recordPaymentTotal').textContent = `PKR ${Number(total).toLocaleString()}`;
    document.getElementById('recordPaymentPaid').textContent = `PKR ${Number(paid).toLocaleString()}`;
    document.getElementById('recordPaymentRemaining').textContent = `PKR ${Number(remaining).toLocaleString()}`;

    document.getElementById('recordPaymentAmount').value = '';
    const amountEl = document.getElementById('recordPaymentAmount');
    amountEl.removeAttribute('max');
    const remainingNum = Number(remaining);
    if (remainingNum >= 0.01) {
      amountEl.max = remainingNum;
    }
    document.getElementById('recordPaymentDate').value = new Date().toISOString().substring(0, 10);
    document.getElementById('recordPaymentMethod').value = 'Cash';
    document.getElementById('recordPaymentNotes').value = '';

    loadPaymentHistory(feeId);
    new bootstrap.Modal(document.getElementById('recordPaymentModal')).show();
  }

  async function loadPaymentHistory(feeId) {
    try {
      const res = await fetch(`/api/fees/records/${feeId}/payments`);
      const payments = await res.json();
      const tbody = document.querySelector('#paymentHistoryTable tbody');
      tbody.innerHTML = '';

      if (payments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No payment history yet.</td></tr>';
        return;
      }

      payments.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${p.payment_date}</td>
          <td class="fw-bold text-success">PKR ${Number(p.amount).toLocaleString()}</td>
          <td><span class="badge bg-secondary">${p.payment_method}</span></td>
        `;
        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error('Load payment history error:', err);
    }
  }

  document.getElementById('recordPaymentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const feeId = document.getElementById('recordPaymentFeeId').value;
    const amount = document.getElementById('recordPaymentAmount').value;
    const payment_date = document.getElementById('recordPaymentDate').value;
    const payment_method = document.getElementById('recordPaymentMethod').value;
    const notes = document.getElementById('recordPaymentNotes').value.trim();

    if (!amount || Number(amount) <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    try {
      const res = await fetch(`/api/fees/records/${feeId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(amount), payment_date, payment_method, notes })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showAlert('Payment recorded successfully.');

      const modalEl = document.getElementById('recordPaymentModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      loadFeesView();
    } catch (err) {
      alert(err.message || 'Failed to record payment.');
    }
  });

  // --- Edit Custom Fee Modal ---
  function openEditCustomFeeModal(btn) {
    const studentId = btn.getAttribute('data-student-id');
    const studentName = btn.getAttribute('data-student-name');
    const className = btn.getAttribute('data-class');
    const classId = btn.getAttribute('data-class-id');
    const customFee = btn.getAttribute('data-custom-fee');

    document.getElementById('editCustomFeeStudentId').value = studentId;
    document.getElementById('editCustomFeeStudentName').textContent = studentName;
    document.getElementById('editCustomFeeClass').textContent = className;
    document.getElementById('editCustomFeeAmount').value = customFee || '';

    fetchClassDefaultFee(classId);
    new bootstrap.Modal(document.getElementById('editCustomFeeModal')).show();
  }

  async function fetchClassDefaultFee(classId) {
    try {
      const res = await fetch(`/api/fees/structures?classId=${classId}&academicYearId=${activeSessionId}`);
      const structures = await res.json();
      if (structures.length > 0) {
        document.getElementById('editCustomFeeClassDefault').textContent = `PKR ${Number(structures[0].monthly_fee).toLocaleString()}`;
      } else {
        document.getElementById('editCustomFeeClassDefault').textContent = 'Not configured';
      }
    } catch (err) {
      document.getElementById('editCustomFeeClassDefault').textContent = 'Error loading';
    }
  }

  document.getElementById('editCustomFeeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const studentId = document.getElementById('editCustomFeeStudentId').value;
    const customFee = document.getElementById('editCustomFeeAmount').value;
    const updateCurrentVoucher = document.getElementById('editCustomFeeUpdateCurrent').checked;

    try {
      const res = await fetch(`/api/fees/students/${studentId}/custom-fee`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          custom_fee: customFee === '' ? null : Number(customFee),
          updateCurrentVoucher,
          academicYearId: activeSessionId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showAlert(data.message);

      const modalEl = document.getElementById('editCustomFeeModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      loadFeesView();
    } catch (err) {
      alert(err.message || 'Failed to update custom fee.');
    }
  });


  // Save class fee structure setup
  document.getElementById('feeStructureForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const class_id = document.getElementById('feeStructClass').value;
    const academic_year_id = document.getElementById('feeStructSession').value;
    const monthly_fee = document.getElementById('feeStructMonthly').value;
    const admission_fee = document.getElementById('feeStructAdmission').value;
    const exam_fee = document.getElementById('feeStructExam').value;
    const other_charges = document.getElementById('feeStructOther').value;

    try {
      const res = await fetch('/api/fees/structures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_id, academic_year_id, monthly_fee, admission_fee, exam_fee, other_charges })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showAlert(data.message || 'Fee structure saved successfully.');
      document.getElementById('feeStructureForm').reset();
        
      const modalEl = document.getElementById('feeStructureModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
      loadFeesView();
    } catch (err) {
      alert(err.message || 'Failed to save fee structure.');
    }
  });

  // Bulk generate monthly bills
  document.getElementById('generateFeesForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const class_id = document.getElementById('generateFeeClass').value;
    const academic_year_id = document.getElementById('generateFeeSession').value;
    const month = document.getElementById('generateFeeMonth').value;
    const includeAdmission = document.getElementById('includeAdmissionCharge').checked;
    const includeExam = document.getElementById('includeExamCharge').checked;

    try {
      const res = await fetch('/api/fees/records/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_id, academic_year_id, month, includeAdmission, includeExam })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showAlert(data.message);
      document.getElementById('generateFeesForm').reset();
      
      const modalEl = document.getElementById('generateFeesModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      modal.hide();

      loadFeesView();
    } catch (err) {
      alert(err.message);
    }
  });


  // ==========================================
  // PANE 7: ANNOUNCEMENTS / NOTICES
  // ==========================================
  async function loadNoticesView() {
    try {
      const res = await fetch('/api/notices/all');
      const notices = await res.json();
      const area = document.getElementById('noticesArea');
      area.innerHTML = '';

      if (notices.length === 0) {
        area.innerHTML = `<div class="text-center text-muted p-4 border rounded bg-white">Notice board is currently empty.</div>`;
        return;
      }

      notices.forEach(n => {
        const card = document.createElement('div');
        card.className = 'notice-card';
        card.innerHTML = `
          <div class="notice-card-header">
            <h6 class="notice-card-title m-0">${n.title}</h6>
            <span class="notice-card-date">Posted: ${n.date} | Expires: ${n.expiry_date}</span>
          </div>
          <div class="notice-card-body">${n.message}</div>
          <div class="text-end mt-2">
            <button class="btn btn-sm btn-link text-danger p-0 delete-notice-btn" data-id="${n.id}"><i class="fa-solid fa-trash me-1"></i>Delete Notice</button>
          </div>
        `;
        area.appendChild(card);
      });

      document.querySelectorAll('.delete-notice-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (confirm('Delete announcement permanently?')) {
            const id = btn.getAttribute('data-id');
            const delRes = await fetch(`/api/notices/${id}`, { method: 'DELETE' });
            if (delRes.ok) {
              showAlert('Notice board updated.');
              loadNoticesView();
            }
          }
        });
      });
    } catch (err) {
      console.error(err);
    }
  }

  document.getElementById('createNoticeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('noticeTitle').value.trim();
    const message = document.getElementById('noticeMessage').value.trim();
    const date = document.getElementById('noticeDate').value;
    const expiry_date = document.getElementById('noticeExpiry').value;

    try {
      const res = await fetch('/api/notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message, date, expiry_date })
      });
      if (res.ok) {
        showAlert('Announcement published successfully.');
        document.getElementById('createNoticeForm').reset();
        loadNoticesView();
      }
    } catch (err) {
      console.error(err);
    }
  });


  // ==========================================
  // PANE 8: SYSTEM BACKUP LOGIC
  // ==========================================
  document.getElementById('exportDatabaseBtn').addEventListener('click', () => {
    if (confirm('Generate and download a complete database SQL backup now?')) {
      window.location.href = '/api/backup/export';
    }
  });


  // ==========================================
  // PANE 9: SETTINGS PASSWORD CHANGE
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

  // ==========================================
  // HELPER UTILITIES: FORM OPTIONS POPULATORS
  // ==========================================
  async function populateFormDropdowns() {
    try {
      const [classRes, sessRes, teachRes] = await Promise.all([
        fetch('/api/classes'),
        fetch('/api/academic-years'),
        fetch('/api/teachers')
      ]);
      const classes = await classRes.json();
      const sessions = await sessRes.json();
      const teachers = await teachRes.json();

      // Populate Class filters & selection inputs
      const selects = [
        document.getElementById('studentClassFilter'),
        document.getElementById('admissionClassSelect'),
        document.getElementById('subjectClassSelect'),
        document.getElementById('promoSourceClass'),
        document.getElementById('promoTargetClass'),
        document.getElementById('assignClassSelect'),
        document.getElementById('feeFilterClass'),
        document.getElementById('feeStructClass'),
        document.getElementById('generateFeeClass'),
        // New: Promotion Wizard
        document.getElementById('wizardSourceClass'),
        document.getElementById('wizardTargetClass'),
        // New: Section Transfer
        document.getElementById('transferTargetClassSelect')
      ];

      selects.forEach(sel => {
        if (!sel) return;
        // Preserve first option (All Classes / Select Class)
        const firstOpt = sel.options[0] ? sel.options[0].outerHTML : '';
        sel.innerHTML = firstOpt;

        classes.forEach(c => {
          sel.innerHTML += `<option value="${c.id}">${c.class_name} - Sec ${c.section}</option>`;
        });
      });

      // Populate Academic Sessions selectors
      const sessSelects = [
        document.getElementById('promoSourceSession'),
        document.getElementById('promoTargetSession'),
        document.getElementById('feeStructSession'),
        document.getElementById('generateFeeSession'),
        document.getElementById('dashboardYear'),
        // New: Promotion Wizard
        document.getElementById('wizardSourceSession'),
        document.getElementById('wizardTargetSession'),
        // New: Section Transfer
        document.getElementById('transferSessionSelect'),
        // New: Status Manager
        document.getElementById('statusUpdateSessionSelect')
      ];

      sessSelects.forEach(sel => {
        if (!sel) return;
        const firstOpt = sel.options[0] ? sel.options[0].outerHTML : '';
        sel.innerHTML = firstOpt;
        
        sessions.forEach(s => {
          sel.innerHTML += `<option value="${s.id}">${s.year_name}</option>`;
        });
      });

      // Populate Faculty selectors
      const teachSelects = [
        document.getElementById('assignTeacherSelect')
      ];

      teachSelects.forEach(sel => {
        if (!sel) return;
        const firstOpt = sel.options[0] ? sel.options[0].outerHTML : '';
        sel.innerHTML = firstOpt;

        teachers.forEach(t => {
          sel.innerHTML += `<option value="${t.id}">${t.User.name} (${t.qualification || 'No Degree'})</option>`;
        });
      });

    } catch (err) {
      console.error('Populate form dropdowns error:', err);
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
    } catch (err) {
      console.error('Load profile security error:', err);
    }
  }

  document.querySelectorAll('[data-pane="pane-profile"]').forEach(item => {
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
  // SYSTEM DATA RESET LOGIC (ADMIN ONLY)
  // ==========================================
  const resetSystemDataForm = document.getElementById('resetSystemDataForm');
  const inputConfirmResetText = document.getElementById('inputConfirmResetText');
  const inputAdminResetPassword = document.getElementById('inputAdminResetPassword');
  const btnConfirmSystemReset = document.getElementById('btnConfirmSystemReset');
  const resetModalAlert = document.getElementById('resetModalAlert');
  const resetModalAlertMsg = document.getElementById('resetModalAlertMsg');

  function showSysResetAlert(msg, type = 'danger') {
    if (resetModalAlert && resetModalAlertMsg) {
      resetModalAlert.className = `alert alert-${type} text-start alert-dismissible fade show mb-3`;
      resetModalAlertMsg.innerHTML = `<i class="fa-solid ${type === 'danger' ? 'fa-triangle-exclamation' : 'fa-circle-check'} me-2"></i>${msg}`;
      resetModalAlert.classList.remove('d-none');
    }
  }

  function hideSysResetAlert() {
    if (resetModalAlert) resetModalAlert.classList.add('d-none');
  }

  if (resetSystemDataForm) {
    resetSystemDataForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideSysResetAlert();

      const confirmText = inputConfirmResetText ? inputConfirmResetText.value.trim() : '';
      const adminPassword = inputAdminResetPassword ? inputAdminResetPassword.value : '';

      if (confirmText !== 'RESET') {
        showSysResetAlert('Please type "RESET" in capital letters to confirm.');
        return;
      }

      if (!adminPassword) {
        showSysResetAlert('Please enter your Admin password.');
        return;
      }

      const btnResetConfirmText = document.getElementById('btnResetConfirmText');
      const btnResetConfirmSpinner = document.getElementById('btnResetConfirmSpinner');
      if (btnConfirmSystemReset) btnConfirmSystemReset.disabled = true;
      if (btnResetConfirmText) btnResetConfirmText.classList.add('d-none');
      if (btnResetConfirmSpinner) btnResetConfirmSpinner.classList.remove('d-none');

      try {
        const res = await fetch('/api/backup/reset-system-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirmText, adminPassword })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        alert(data.message || 'System data reset completed successfully.');
      } catch (err) {
        showSysResetAlert(err.message);
      } finally {
        if (btnConfirmSystemReset) btnConfirmSystemReset.disabled = false;
        if (btnResetConfirmText) btnResetConfirmText.classList.remove('d-none');
        if (btnResetConfirmSpinner) btnResetConfirmSpinner.classList.add('d-none');
      }
    });
  }

  // ==========================================
  // MODULE: RESULT MANAGEMENT SYSTEM (ADMIN)
  // ==========================================
  let resultsPaneInitialized = false;
  let cachedCardsList = [];
  let currentEditingResult = null;

  async function initResultsPane() {
    await populateResultClassDropdowns();
    await populateResultStudentDropdown();

    if (!resultsPaneInitialized) {
      resultsPaneInitialized = true;
      setupResultEventListeners();
    }
  }

  async function populateResultClassDropdowns() {
    try {
      const res = await fetch('/api/classes');
      const classes = await res.json();
      if (!Array.isArray(classes)) return;

      const dropdownIds = [
        'overviewResultClassSelect',
        'manageMarksClassSelect',
        'cardClassSelect',
        'perfSubjectClassSelect'
      ];

      dropdownIds.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
          const currentVal = select.value;
          select.innerHTML = '<option value="">-- Choose Class --</option>';
          classes.forEach(c => {
            select.innerHTML += `<option value="${c.id}">${c.class_name} - Section ${c.section}</option>`;
          });
          if (currentVal) select.value = currentVal;
        }
      });
    } catch (err) {
      console.error('Populate result class dropdowns error:', err);
    }
  }

  async function populateResultStudentDropdown() {
    try {
      const res = await fetch('/api/students');
      const students = await res.json();
      if (!Array.isArray(students)) return;

      const select = document.getElementById('resHistoryStudentSelect');
      if (select) {
        select.innerHTML = '<option value="">-- Choose Student --</option>';
        students.forEach(s => {
          select.innerHTML += `<option value="${s.id}">Roll #${s.roll_number} - ${s.name} (S/O ${s.father_name || 'N/A'})</option>`;
        });
      }
    } catch (err) {
      console.error('Populate result student dropdown error:', err);
    }
  }

  function setupResultEventListeners() {
    // 1. Overview & Analytics
    const loadOverviewBtn = document.getElementById('loadResultOverviewBtn');
    if (loadOverviewBtn) {
      loadOverviewBtn.addEventListener('click', loadResultOverview);
    }

    // 2. Marks Management
    const loadMarksBtn = document.getElementById('loadManageMarksBtn');
    if (loadMarksBtn) {
      loadMarksBtn.addEventListener('click', loadManageMarks);
    }

    const searchInput = document.getElementById('manageMarksSearchInput');
    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(loadManageMarks, 400);
      });
    }

    const gradeFilter = document.getElementById('manageMarksGradeFilter');
    if (gradeFilter) {
      gradeFilter.addEventListener('change', loadManageMarks);
    }

    const statusFilter = document.getElementById('manageMarksStatusFilter');
    if (statusFilter) {
      statusFilter.addEventListener('change', loadManageMarks);
    }

    // Batch Actions: Publish / Unpublish / Lock / Unlock
    const btnPubAll = document.getElementById('btnAdminPublishAll');
    if (btnPubAll) btnPubAll.addEventListener('click', () => handleBatchResultAction('publish'));

    const btnUnpubAll = document.getElementById('btnAdminUnpublishAll');
    if (btnUnpubAll) btnUnpubAll.addEventListener('click', () => handleBatchResultAction('unpublish'));

    const btnLockAll = document.getElementById('btnAdminLockAll');
    if (btnLockAll) btnLockAll.addEventListener('click', () => handleBatchResultAction('lock'));

    const btnUnlockAll = document.getElementById('btnAdminUnlockAll');
    if (btnUnlockAll) btnUnlockAll.addEventListener('click', () => handleBatchResultAction('unlock'));

    // Export CSV / Excel
    const btnExpCsv = document.getElementById('btnExportCsv');
    if (btnExpCsv) {
      btnExpCsv.addEventListener('click', (e) => {
        e.preventDefault();
        exportResultSheet('csv');
      });
    }

    const btnExpXls = document.getElementById('btnExportXls');
    if (btnExpXls) {
      btnExpXls.addEventListener('click', (e) => {
        e.preventDefault();
        exportResultSheet('xls');
      });
    }

    // 3. Result Cards & Bulk Print
    const loadCardsBtn = document.getElementById('loadResultCardsBtn');
    if (loadCardsBtn) {
      loadCardsBtn.addEventListener('click', loadAdminResultCards);
    }

    const btnBulkPrint = document.getElementById('btnBulkPrintCards');
    if (btnBulkPrint) {
      btnBulkPrint.addEventListener('click', bulkPrintClassCards);
    }

    const btnPrintSingleModal = document.getElementById('btnPrintCardModalAction');
    if (btnPrintSingleModal) {
      btnPrintSingleModal.addEventListener('click', printSingleModalCard);
    }

    // 4. Student History
    const loadHistBtn = document.getElementById('loadStudentResHistoryBtn');
    if (loadHistBtn) {
      loadHistBtn.addEventListener('click', loadStudentAcademicHistory);
    }

    // 5. Subject Performance
    const perfClassSelect = document.getElementById('perfSubjectClassSelect');
    if (perfClassSelect) {
      perfClassSelect.addEventListener('change', async () => {
        const classId = perfClassSelect.value;
        const subSelect = document.getElementById('perfSubjectSelect');
        if (!classId) {
          subSelect.innerHTML = '<option value="">-- Select Class First --</option>';
          subSelect.disabled = true;
          return;
        }
        try {
          const res = await fetch(`/api/subjects?classId=${classId}`);
          const subjects = await res.json();
          subSelect.innerHTML = '<option value="">-- Select Subject --</option>';
          subjects.forEach(s => {
            subSelect.innerHTML += `<option value="${s.id}">${s.subject_name} (Max: ${s.total_marks})</option>`;
          });
          subSelect.disabled = false;
        } catch (err) {
          console.error('Fetch subjects error:', err);
        }
      });
    }

    const loadSubjectPerfBtn = document.getElementById('loadSubjectPerfBtn');
    if (loadSubjectPerfBtn) {
      loadSubjectPerfBtn.addEventListener('click', loadSubjectPerformanceAnalytics);
    }

    // Save edited marks inside modal
    const btnSaveEdit = document.getElementById('btnSaveAdminResultEdit');
    if (btnSaveEdit) {
      btnSaveEdit.addEventListener('click', saveAdminResultEdit);
    }
  }

  // --- 1. OVERVIEW & ANALYTICS ---
  async function loadResultOverview() {
    const classId = document.getElementById('overviewResultClassSelect').value;
    const examType = document.getElementById('overviewResultExamSelect').value;

    if (!classId) {
      alert('Please select a class.');
      return;
    }
    if (!activeSessionId) {
      alert('No active academic session found.');
      return;
    }

    try {
      const res = await fetch(`/api/results/overview?classId=${classId}&examType=${encodeURIComponent(examType)}&academicYearId=${activeSessionId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      document.getElementById('resultOverviewStatsArea').classList.remove('d-none');
      document.getElementById('resultOverviewDetailsArea').classList.remove('d-none');

      document.getElementById('statResEnrolled').textContent = data.totalEnrolled;
      document.getElementById('statResEvaluatedNote').textContent = `${data.evaluatedCount} evaluated (${data.pendingEvaluationCount} pending)`;
      document.getElementById('statResPassed').textContent = data.passedCount;
      document.getElementById('statResPassRate').textContent = `${data.passRate}% Pass Rate`;
      document.getElementById('statResFailed').textContent = data.failedCount;
      document.getElementById('statResFailRate').textContent = `${data.failRate}% Fail Rate`;
      document.getElementById('statResClassAvg').textContent = `${data.classAverage}%`;
      document.getElementById('statResMinMax').textContent = `High: ${data.highestPercentage}% | Low: ${data.lowestPercentage}%`;

      document.getElementById('statResCompletedCount').textContent = data.completedCount;
      document.getElementById('statResInProgressCount').textContent = data.inProgressCount;
      document.getElementById('statResPublishedCount').textContent = data.publishedCount;
      document.getElementById('statResLockedCount').textContent = data.lockedCount;

      // Grade Distribution
      const gradeContainer = document.getElementById('gradeDistributionCardsContainer');
      gradeContainer.innerHTML = '';
      const grades = ['A+', 'A', 'B', 'C', 'D', 'E', 'F'];
      const gradeColors = {
        'A+': 'success', 'A': 'primary', 'B': 'info', 'C': 'warning', 'D': 'secondary', 'E': 'dark', 'F': 'danger'
      };

      grades.forEach(g => {
        const count = data.gradeDistribution[g] || 0;
        const color = gradeColors[g] || 'primary';
        gradeContainer.innerHTML += `
          <div class="col-6 col-sm-3 col-md-3">
            <div class="p-3 border rounded text-center bg-light">
              <span class="badge bg-${color} fs-6 px-3 py-1 mb-1">${g}</span>
              <h4 class="fw-bold mb-0 text-dark">${count}</h4>
              <small class="text-muted">Students</small>
            </div>
          </div>
        `;
      });

    } catch (err) {
      console.error('Load result overview error:', err);
      alert(err.message || 'Failed to load result overview.');
    }
  }

  // --- 2. MARKS MANAGEMENT & REVIEW ---
  async function loadManageMarks() {
    const classId = document.getElementById('manageMarksClassSelect').value;
    const examType = document.getElementById('manageMarksExamSelect').value;
    const grade = document.getElementById('manageMarksGradeFilter').value;
    const overallStatus = document.getElementById('manageMarksStatusFilter').value;
    const search = document.getElementById('manageMarksSearchInput').value.trim();

    if (!classId) {
      alert('Please select a class.');
      return;
    }
    if (!activeSessionId) {
      alert('No active session found.');
      return;
    }

    const tbody = document.querySelector('#adminMarksTable tbody');
    tbody.innerHTML = '<tr><td colspan="12" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Loading result records...</td></tr>';

    try {
      let url = `/api/results?classId=${classId}&examType=${encodeURIComponent(examType)}&academicYearId=${activeSessionId}`;
      if (grade) url += `&grade=${encodeURIComponent(grade)}`;
      if (overallStatus) url += `&overallStatus=${encodeURIComponent(overallStatus)}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await fetch(url);
      const results = await res.json();
      if (!res.ok) throw new Error(results.error);

      if (results.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" class="text-center py-4 text-muted">No result records found for this criteria.</td></tr>';
        return;
      }

      tbody.innerHTML = '';
      results.forEach(r => {
        const student = r.Student || {};
        const overallBadge = r.overall_status === 'Pass' 
          ? '<span class="badge bg-success px-2 py-1">Pass</span>' 
          : '<span class="badge bg-danger px-2 py-1">Fail</span>';
        
        const statusBadge = r.status === 'Completed'
          ? '<span class="badge bg-success bg-opacity-10 text-success border border-success">Completed</span>'
          : '<span class="badge bg-warning bg-opacity-10 text-warning border border-warning">In Progress</span>';

        const pubBadge = r.is_published
          ? '<span class="badge bg-info px-2 py-1"><i class="fa-solid fa-check me-1"></i>Yes</span>'
          : '<span class="badge bg-light text-muted border px-2 py-1">No</span>';

        const lockBadge = r.is_locked
          ? '<span class="badge bg-danger px-2 py-1"><i class="fa-solid fa-lock me-1"></i>Locked</span>'
          : '<span class="badge bg-light text-muted border px-2 py-1">Unlocked</span>';

        tbody.innerHTML += `
          <tr>
            <td class="fw-bold text-center">${r.position || '-'}</td>
            <td class="fw-semibold">${student.roll_number || '-'}</td>
            <td>
              <div class="fw-bold">${student.name || '-'}</div>
              <small class="text-muted">S/O ${student.father_name || 'N/A'}</small>
            </td>
            <td class="text-center">${r.total_marks}</td>
            <td class="text-center fw-bold text-primary">${r.obtained_marks}</td>
            <td class="text-center fw-bold">${r.percentage}%</td>
            <td class="text-center"><span class="badge bg-primary px-2 py-1">${r.grade}</span></td>
            <td class="text-center">${overallBadge}</td>
            <td class="text-center">${statusBadge}</td>
            <td class="text-center">${pubBadge}</td>
            <td class="text-center">${lockBadge}</td>
            <td class="text-end text-nowrap">
              <button class="btn btn-sm btn-outline-primary me-1" onclick="openAdminEditResultModal(${r.id})" title="Review / Edit Marks">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button class="btn btn-sm ${r.is_published ? 'btn-outline-secondary' : 'btn-outline-info'} me-1" onclick="toggleSinglePublish(${r.id}, ${!r.is_published})" title="${r.is_published ? 'Unpublish Card' : 'Publish Card'}">
                <i class="fa-solid ${r.is_published ? 'fa-eye-slash' : 'fa-globe'}"></i>
              </button>
              <button class="btn btn-sm ${r.is_locked ? 'btn-outline-warning' : 'btn-outline-danger'} me-1" onclick="toggleSingleLock(${r.id}, ${!r.is_locked})" title="${r.is_locked ? 'Unlock Result' : 'Lock Result'}">
                <i class="fa-solid ${r.is_locked ? 'fa-lock-open' : 'fa-lock'}"></i>
              </button>
              <button class="btn btn-sm btn-outline-dark" onclick="archiveResultRecord(${r.id})" title="Archive / Void Record" ${r.is_locked ? 'disabled' : ''}>
                <i class="fa-solid fa-box-archive"></i>
              </button>
            </td>
          </tr>
        `;
      });

    } catch (err) {
      console.error('Load manage marks error:', err);
      tbody.innerHTML = `<tr><td colspan="12" class="text-center py-4 text-danger">${err.message}</td></tr>`;
    }
  }

  // Edit Modal logic
  window.openAdminEditResultModal = async function(resultId) {
    try {
      const res = await fetch(`/api/results/${resultId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      currentEditingResult = data;

      document.getElementById('modalResStudentName').textContent = data.Student ? data.Student.name : '-';
      document.getElementById('modalResRollNumber').textContent = data.Student ? data.Student.roll_number : '-';
      document.getElementById('modalResClassName').textContent = data.Class ? `${data.Class.class_name} (${data.Class.section})` : '-';

      const statusBadge = document.getElementById('modalResStatusBadge');
      statusBadge.innerHTML = data.is_locked 
        ? '<span class="badge bg-danger"><i class="fa-solid fa-lock me-1"></i>Locked by Admin</span>'
        : (data.is_published ? '<span class="badge bg-info"><i class="fa-solid fa-globe me-1"></i>Published</span>' : '<span class="badge bg-secondary">Unpublished</span>');

      document.getElementById('modalResRemarks').value = data.remarks || '';

      const tbody = document.querySelector('#modalEditSubjectsTable tbody');
      tbody.innerHTML = '';

      // Fetch all subjects configured for this class to allow entering missing subjects
      const subRes = await fetch(`/api/subjects?classId=${data.class_id}`);
      const allClassSubjects = await subRes.json();

      const existingMarksMap = {};
      (data.ResultSubjects || []).forEach(rs => {
        existingMarksMap[rs.subject_id] = rs.marks;
      });

      allClassSubjects.forEach(sub => {
        const currentMark = existingMarksMap[sub.id] !== undefined ? existingMarksMap[sub.id] : '';
        const isPass = currentMark !== '' && Number(currentMark) >= Number(sub.passing_marks);
        const passBadge = currentMark === '' 
          ? '<span class="text-muted small">Not Entered</span>' 
          : (isPass ? '<span class="badge bg-success">Pass</span>' : '<span class="badge bg-danger">Fail</span>');

        tbody.innerHTML += `
          <tr data-subject-id="${sub.id}" data-max-marks="${sub.total_marks}" data-pass-marks="${sub.passing_marks}">
            <td class="fw-bold">${sub.subject_name}</td>
            <td class="text-center">${sub.total_marks}</td>
            <td class="text-center">${sub.passing_marks}</td>
            <td>
              <input type="number" class="form-control form-control-sm edit-sub-mark-input" value="${currentMark}" min="0" max="${sub.total_marks}" placeholder="0 - ${sub.total_marks}" oninput="updateModalSubjectPassFail(this)">
            </td>
            <td class="text-center sub-status-cell">${passBadge}</td>
          </tr>
        `;
      });

      const modal = new bootstrap.Modal(document.getElementById('adminEditResultModal'));
      modal.show();
    } catch (err) {
      console.error('Open edit result modal error:', err);
      alert(err.message || 'Failed to load result for editing.');
    }
  };

  window.updateModalSubjectPassFail = function(input) {
    const row = input.closest('tr');
    const passMarks = Number(row.dataset.passMarks);
    const maxMarks = Number(row.dataset.maxMarks);
    const val = input.value.trim();
    const cell = row.querySelector('.sub-status-cell');

    if (val === '') {
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
      cell.innerHTML = num >= passMarks ? '<span class="badge bg-success">Pass</span>' : '<span class="badge bg-danger">Fail</span>';
    }
  };

  async function saveAdminResultEdit() {
    if (!currentEditingResult) return;

    const rows = document.querySelectorAll('#modalEditSubjectsTable tbody tr');
    const marksPayload = [];
    let hasError = false;

    rows.forEach(row => {
      const subjectId = row.dataset.subjectId;
      const maxMarks = Number(row.dataset.maxMarks);
      const input = row.querySelector('.edit-sub-mark-input');
      const val = input.value.trim();

      if (val !== '') {
        const obt = Number(val);
        if (isNaN(obt) || obt < 0 || obt > maxMarks) {
          input.classList.add('is-invalid');
          hasError = true;
        } else {
          marksPayload.push({
            subjectId: Number(subjectId),
            obtainedMarks: obt
          });
        }
      }
    });

    if (hasError) {
      alert('Please correct invalid marks before saving.');
      return;
    }

    if (marksPayload.length === 0) {
      alert('Please enter marks for at least one subject.');
      return;
    }

    const remarks = document.getElementById('modalResRemarks').value.trim();

    try {
      const btn = document.getElementById('btnSaveAdminResultEdit');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

      const res = await fetch('/api/results/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: currentEditingResult.student_id,
          classId: currentEditingResult.class_id,
          academicYearId: currentEditingResult.academic_year_id,
          examType: currentEditingResult.exam_type,
          remarks,
          marks: marksPayload
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Close modal
      const modalEl = document.getElementById('adminEditResultModal');
      const modalInstance = bootstrap.Modal.getInstance(modalEl);
      if (modalInstance) modalInstance.hide();

      showAlert('Result marks saved and recalculated successfully.');
      loadManageMarks();

    } catch (err) {
      console.error('Save admin result edit error:', err);
      alert(err.message || 'Failed to save marks.');
    } finally {
      const btn = document.getElementById('btnSaveAdminResultEdit');
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-save me-2"></i>Save Marks & Recalculate';
    }
  }

  // Single Actions
  window.toggleSinglePublish = async function(resultId, shouldPublish) {
    try {
      const endpoint = shouldPublish ? '/api/results/publish' : '/api/results/unpublish';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultIds: [resultId] })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showAlert(data.message);
      loadManageMarks();
    } catch (err) {
      alert(err.message || 'Failed to update publication state.');
    }
  };

  window.toggleSingleLock = async function(resultId, shouldLock) {
    try {
      const endpoint = shouldLock ? '/api/results/lock' : '/api/results/unlock';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultIds: [resultId] })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showAlert(data.message);
      loadManageMarks();
    } catch (err) {
      alert(err.message || 'Failed to update lock state.');
    }
  };

  window.archiveResultRecord = async function(resultId) {
    if (!confirm('Are you sure you want to archive this student result record? It will be safely preserved in history.')) return;
    try {
      const res = await fetch(`/api/results/${resultId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showAlert(data.message);
      loadManageMarks();
    } catch (err) {
      alert(err.message || 'Failed to archive result record.');
    }
  };

  // Batch actions
  async function handleBatchResultAction(action) {
    const classId = document.getElementById('manageMarksClassSelect').value;
    const examType = document.getElementById('manageMarksExamSelect').value;

    if (!classId) {
      alert('Please select a class first.');
      return;
    }
    if (!activeSessionId) {
      alert('No active session found.');
      return;
    }

    const actionNames = {
      publish: 'Publish all result cards for this class & term',
      unpublish: 'Unpublish all result cards for this class & term',
      lock: 'Lock all result cards for this class & term (disabling teacher editing)',
      unlock: 'Unlock all result cards for this class & term (re-enabling editing)'
    };

    if (!confirm(`Are you sure you want to ${actionNames[action]}?`)) return;

    try {
      const res = await fetch(`/api/results/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId,
          examType,
          academicYearId: activeSessionId
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showAlert(data.message);
      loadManageMarks();
    } catch (err) {
      alert(err.message || 'Batch action failed.');
    }
  }

  function exportResultSheet(format) {
    const classId = document.getElementById('manageMarksClassSelect').value;
    const examType = document.getElementById('manageMarksExamSelect').value;

    if (!classId) {
      alert('Please select a class to export.');
      return;
    }
    if (!activeSessionId) {
      alert('No active session found.');
      return;
    }

    window.open(`/api/results/export?classId=${classId}&examType=${encodeURIComponent(examType)}&academicYearId=${activeSessionId}&format=${format}`, '_blank');
  }

  // --- 3. RESULT CARDS & BULK PRINT ---
  async function loadAdminResultCards() {
    const classId = document.getElementById('cardClassSelect').value;
    const examType = document.getElementById('cardExamSelect').value;

    if (!classId) {
      alert('Please select a class.');
      return;
    }
    if (!activeSessionId) {
      alert('No active session found.');
      return;
    }

    const tbody = document.querySelector('#adminCardsListTable tbody');
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Loading result cards...</td></tr>';

    try {
      const res = await fetch(`/api/results?classId=${classId}&examType=${encodeURIComponent(examType)}&academicYearId=${activeSessionId}`);
      const results = await res.json();
      if (!res.ok) throw new Error(results.error);

      cachedCardsList = results;
      const btnBulkPrint = document.getElementById('btnBulkPrintCards');

      if (results.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">No completed result cards found for this class and exam.</td></tr>';
        if (btnBulkPrint) btnBulkPrint.disabled = true;
        return;
      }

      if (btnBulkPrint) btnBulkPrint.disabled = false;
      tbody.innerHTML = '';

      results.forEach(r => {
        const student = r.Student || {};
        const cls = r.Class || {};
        const overallBadge = r.overall_status === 'Pass' 
          ? '<span class="badge bg-success px-2 py-1">Pass</span>' 
          : '<span class="badge bg-danger px-2 py-1">Fail</span>';

        tbody.innerHTML += `
          <tr>
            <td class="fw-bold">${r.position || '-'}</td>
            <td class="fw-semibold">${student.roll_number || '-'}</td>
            <td>
              <div class="fw-bold">${student.name || '-'}</div>
              <small class="text-muted">S/O ${student.father_name || 'N/A'}</small>
            </td>
            <td>${cls.class_name || '-'} (${cls.section || '-'})</td>
            <td class="fw-bold text-primary">${r.percentage}%</td>
            <td><span class="badge bg-primary px-2 py-1">${r.grade}</span></td>
            <td>${overallBadge}</td>
            <td class="text-end">
              <button class="btn btn-sm btn-primary" onclick="viewSingleAdminCard(${r.id})">
                <i class="fa-solid fa-eye me-1"></i>View & Print Card
              </button>
            </td>
          </tr>
        `;
      });

    } catch (err) {
      console.error('Load result cards error:', err);
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-danger">${err.message}</td></tr>`;
    }
  }

  window.viewSingleAdminCard = async function(resultId) {
    try {
      const res = await fetch(`/api/results/${resultId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const container = document.getElementById('adminPrintableCardContainer');
      container.innerHTML = generateResultCardHtml(data);

      const modal = new bootstrap.Modal(document.getElementById('adminResultCardModal'));
      modal.show();
    } catch (err) {
      alert(err.message || 'Failed to render result card.');
    }
  };

  // Helper: get school name based on class level
  function getSchoolInfo(className) {
    if (!className) return { name: 'Waseem Science & Commerce Academy', subtitle: 'Official Student Academic Performance Report' };
    const cn = className.toLowerCase();
    const numMatch = cn.match(/\d+/);
    if (!numMatch) {
      return { name: 'Waseem Kids Campus School', subtitle: 'Official Student Academic Performance Report' };
    }
    const num = parseInt(numMatch[0]);
    if (num <= 5)  return { name: 'Waseem Kids Campus School',      subtitle: 'Official Student Academic Performance Report' };
    if (num <= 10) return { name: 'Waseem Model High School',       subtitle: 'Official Student Academic Performance Report' };
    return             { name: 'Waseem Science & Commerce Academy', subtitle: 'Official Student Academic Performance Report' };
  }

  function generateResultCardHtml(cardData) {
    const student = cardData.Student || {};
    const cls = cardData.Class || {};
    const session = cardData.AcademicYear || {};
    const subjects = cardData.ResultSubjects || [];

    const schoolInfo = getSchoolInfo(cls.class_name || '');

    let subjectsTableRows = '';
    subjects.forEach(rs => {
      const sub = rs.Subject || {};
      const isPass = Number(rs.marks) >= Number(sub.passing_marks || 33);
      subjectsTableRows += `
        <tr>
          <td class="fw-bold text-start ps-3">${sub.subject_name || 'Subject'}</td>
          <td class="text-center">${sub.total_marks || 100}</td>
          <td class="text-center">${sub.passing_marks || 33}</td>
          <td class="text-center fw-bold ${isPass ? 'text-primary' : 'text-danger'}">${rs.marks}</td>
          <td class="text-center">
            <span class="badge ${isPass ? 'bg-success' : 'bg-danger'} px-2 py-1">${isPass ? 'Pass' : 'Fail'}</span>
          </td>
        </tr>
      `;
    });

    const overallBadge = cardData.overall_status === 'Pass' 
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
          <div class="badge bg-dark text-white px-3 py-1 fs-7 text-uppercase">${cardData.exam_type} - Session ${session.year_name || ''}</div>
        </div>

        <!-- Student Meta Details -->
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
            <div class="fw-bold text-warning fs-6"><i class="fa-solid fa-trophy me-1"></i>${cardData.position ? cardData.position + ' Place' : '-'}</div>
          </div>
        </div>

        <!-- Subjects Breakdown Table -->
        <div class="table-responsive mb-3">
          <table class="table table-bordered table-sm align-middle text-center mb-0">
            <thead style="background: #1e3c72; color: #ffffff;">
              <tr>
                <th class="text-start ps-3">Subject Name</th>
                <th style="width: 110px;">Total Marks</th>
                <th style="width: 110px;">Passing Marks</th>
                <th style="width: 130px;">Obtained Marks</th>
                <th style="width: 100px;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${subjectsTableRows}
            </tbody>
          </table>
        </div>

        <!-- Summary & Overall Status Box -->
        <div class="row g-2 p-3 border rounded bg-light mb-4 text-center align-items-center">
          <div class="col-4 col-md-2">
            <span class="text-muted small">Total</span>
            <h5 class="fw-bold mb-0 text-dark">${cardData.total_marks}</h5>
          </div>
          <div class="col-4 col-md-2">
            <span class="text-muted small">Obtained</span>
            <h5 class="fw-bold mb-0 text-primary">${cardData.obtained_marks}</h5>
          </div>
          <div class="col-4 col-md-2">
            <span class="text-muted small">Percentage</span>
            <h5 class="fw-bold mb-0 text-dark">${cardData.percentage}%</h5>
          </div>
          <div class="col-4 col-md-2">
            <span class="text-muted small">Grade</span>
            <h5 class="fw-bold mb-0 text-success">${cardData.grade}</h5>
          </div>
          <div class="col-8 col-md-4">
            ${overallBadge}
          </div>
        </div>

        <!-- Remarks -->
        <div class="p-2 mb-4 bg-white border rounded text-start">
          <span class="text-muted small fw-semibold">Teacher / Principal Remarks:</span>
          <p class="mb-0 text-dark fst-italic ps-2">${cardData.remarks || 'Keep up the good effort and consistent performance.'}</p>
        </div>

        <!-- Signatures -->
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

  function printSingleModalCard() {
    const printContent = document.getElementById('adminPrintableCardContainer').innerHTML;
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    printWindow.document.write(`
      <html>
        <head>
          <title>Result Card Print</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
          <style>
            @media print {
              body { margin: 0; padding: 15px; background: #fff !important; }
              .result-card-print-area { border: 2px solid #333 !important; padding: 25px !important; }
              @page { size: A4 portrait; margin: 10mm; }
            }
          </style>
        </head>
        <body>
          ${printContent}
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  async function bulkPrintClassCards() {
    if (!cachedCardsList || cachedCardsList.length === 0) {
      alert('No cards loaded to print.');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=800');
    printWindow.document.write(`
      <html>
        <head>
          <title>Bulk Class Result Cards Print</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
          <style>
            @media print {
              .page-break { page-break-after: always; break-after: page; }
              body { margin: 0; padding: 10px; background: #fff !important; }
              .result-card-print-area { border: 2px solid #333 !important; padding: 25px !important; margin-bottom: 20px; }
              @page { size: A4 portrait; margin: 10mm; }
            }
          </style>
        </head>
        <body>
    `);

    // Fetch full details for all cards in sequence
    for (let i = 0; i < cachedCardsList.length; i++) {
      try {
        const res = await fetch(`/api/results/${cachedCardsList[i].id}`);
        const fullCardData = await res.json();
        const cardHtml = generateResultCardHtml(fullCardData);
        printWindow.document.write(`
          <div class="${i < cachedCardsList.length - 1 ? 'page-break' : ''}">
            ${cardHtml}
          </div>
        `);
      } catch (e) {
        console.error('Fetch card for bulk print error:', e);
      }
    }

    printWindow.document.write(`
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  // --- 4. STUDENT ACADEMIC HISTORY ---
  async function loadStudentAcademicHistory() {
    const studentId = document.getElementById('resHistoryStudentSelect').value;
    if (!studentId) {
      alert('Please select a student.');
      return;
    }

    try {
      const res = await fetch(`/api/results/student-history?studentId=${studentId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const area = document.getElementById('studentResHistoryArea');
      area.classList.remove('d-none');

      const s = data.student;
      document.getElementById('resHistName').textContent = s.name || '-';
      document.getElementById('resHistRoll').textContent = s.roll_number || '-';
      document.getElementById('resHistFather').textContent = s.father_name || 'N/A';
      document.getElementById('resHistReg').textContent = s.registration_number || 'N/A';
      document.getElementById('resHistTotalExams').textContent = `${data.history.length} Exam Terms Recorded`;
      if (s.photo) {
        document.getElementById('resHistAvatar').src = s.photo;
      } else {
        document.getElementById('resHistAvatar').src = '/img/logo.png';
      }

      const tbody = document.querySelector('#studentResHistoryTable tbody');
      if (data.history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4 text-muted">No academic examination records found for this student.</td></tr>';
        return;
      }

      tbody.innerHTML = '';
      data.history.forEach(h => {
        const overallBadge = h.overallStatus === 'Pass'
          ? '<span class="badge bg-success px-2 py-1">Pass</span>'
          : '<span class="badge bg-danger px-2 py-1">Fail</span>';

        tbody.innerHTML += `
          <tr>
            <td class="fw-bold text-primary">${h.examType}</td>
            <td>${h.className}</td>
            <td>${h.academicYear}</td>
            <td class="text-center">${h.totalMarks}</td>
            <td class="text-center fw-bold text-dark">${h.obtainedMarks}</td>
            <td class="text-center fw-bold">${h.percentage}%</td>
            <td class="text-center"><span class="badge bg-primary px-2 py-1">${h.grade}</span></td>
            <td class="text-center">${overallBadge}</td>
            <td class="text-end">
              <button class="btn btn-sm btn-outline-primary" onclick="viewSingleAdminCard(${h.id})">
                <i class="fa-solid fa-eye me-1"></i>View Card
              </button>
            </td>
          </tr>
        `;
      });

    } catch (err) {
      console.error('Load student history error:', err);
      alert(err.message || 'Failed to load student history.');
    }
  }

  // --- 5. SUBJECT PERFORMANCE ANALYTICS ---
  async function loadSubjectPerformanceAnalytics() {
    const classId = document.getElementById('perfSubjectClassSelect').value;
    const subjectId = document.getElementById('perfSubjectSelect').value;
    const examType = document.getElementById('perfSubjectExamSelect').value;

    if (!classId || !subjectId) {
      alert('Please select both Class and Subject.');
      return;
    }
    if (!activeSessionId) {
      alert('No active session found.');
      return;
    }

    try {
      const res = await fetch(`/api/results/subject-performance?classId=${classId}&subjectId=${subjectId}&examType=${encodeURIComponent(examType)}&academicYearId=${activeSessionId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      document.getElementById('subjectPerfStatsArea').classList.remove('d-none');
      document.getElementById('subjectFailedStudentsCard').classList.remove('d-none');

      document.getElementById('statSubAvgMarks').textContent = data.averageMarks;
      document.getElementById('statSubTotalMarks').textContent = `out of ${data.subject.totalMarks} (Passing: ${data.subject.passingMarks})`;
      document.getElementById('statSubPassRate').textContent = `${data.passPercentage}%`;
      document.getElementById('statSubPassedCount').textContent = `${data.passingCount} passed (${data.evaluatedCount} evaluated)`;
      document.getElementById('statSubFailedCount').textContent = data.failingCount;
      document.getElementById('statSubHighLow').textContent = `${data.highestMarks} / ${data.lowestMarks}`;

      const tbody = document.querySelector('#subjectFailedStudentsTable tbody');
      if (data.failedStudents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-success fw-semibold"><i class="fa-solid fa-circle-check me-2"></i>Excellent! No students failed in this subject.</td></tr>';
        return;
      }

      tbody.innerHTML = '';
      data.failedStudents.forEach(f => {
        const deficit = Number(f.passingMarks) - Number(f.obtainedMarks);
        tbody.innerHTML += `
          <tr>
            <td class="fw-semibold">${f.roll_number}</td>
            <td class="fw-bold">${f.name}</td>
            <td>${f.father_name || 'N/A'}</td>
            <td class="fw-bold text-danger">${f.obtainedMarks} / ${f.totalMarks}</td>
            <td>${f.passingMarks} Marks</td>
            <td class="text-danger fw-bold">-${deficit} Marks Needed</td>
          </tr>
        `;
      });

    } catch (err) {
      console.error('Load subject performance error:', err);
      alert(err.message || 'Failed to load subject performance analytics.');
    }
  }

});


