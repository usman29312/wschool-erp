const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Teacher, User, TeacherAssignment, TeacherAttendance, TeacherSalaryRecord, TeacherSalaryPayment, Class, Subject, AcademicYear, Fee, sequelize } = require('../models');
const { isAuthenticated, isAdmin } = require('./middleware');
const { Op } = require('sequelize');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage for Teacher Photos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'teacher-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images (.jpg, .jpeg, .png, .webp) are allowed!'));
  }
});

// GET all teachers
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const { month } = req.query;
    const targetMonth = month || new Date().toISOString().substring(0, 7);

    const teachers = await Teacher.findAll({
      include: [{ model: User, attributes: ['id', 'name', 'email', 'role'] }],
      order: [[User, 'name', 'ASC']]
    });

    const result = await Promise.all(teachers.map(async (t) => {
      const tJson = t.toJSON();
      const [yr, mo] = targetMonth.split('-').map(Number);
      const lastDay = new Date(yr, mo, 0).getDate();
      const startStr = `${targetMonth}-01`;
      const endStr = `${targetMonth}-${String(lastDay).padStart(2, '0')}`;

      const payments = await TeacherSalaryPayment.findAll({
        where: {
          teacher_id: t.id,
          payment_date: {
            [Op.between]: [startStr, endStr]
          }
        }
      });
      const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
      tJson.paid_this_month = totalPaid > 0;
      tJson.total_paid_this_month = totalPaid;
      return tJson;
    }));

    return res.json(result);
  } catch (error) {
    console.error('Fetch teachers error:', error);
    return res.status(500).json({ error: 'Failed to retrieve teachers.' });
  }
});

// POST create teacher (Admin only)
router.post('/', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { name, email, password, qualification, salary, joining_date } = req.body;

    if (!name || !email || !password || !joining_date) {
      return res.status(400).json({ error: 'Name, email, password, and joining date are required.' });
    }

    // Check if email already taken
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    // 1. Create system user
    const user = await User.create({
      name,
      email,
      password,
      role: 'teacher'
    });

    // 2. Create teacher profile
    const teacher = await Teacher.create({
      user_id: user.id,
      qualification,
      salary: salary || 0.00,
      joining_date
    });

    return res.status(201).json({ message: 'Teacher profile created successfully.', teacher });
  } catch (error) {
    console.error('Create teacher error:', error);
    return res.status(500).json({ error: 'Failed to create teacher profile.' });
  }
});

// POST upload teacher profile photo (Authenticated Teacher)
router.post('/photo', isAuthenticated, upload.single('photo'), async (req, res) => {
  try {
    if (req.session.role !== 'teacher') {
      return res.status(403).json({ error: 'Only teacher accounts can update their profile picture.' });
    }

    const teacher = await Teacher.findOne({ where: { user_id: req.session.userId } });
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher profile not found.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Please select an image file to upload.' });
    }

    // Delete old photo if exists and not default
    if (teacher.photo && teacher.photo !== '/img/logo.png') {
      const oldPath = path.join(__dirname, '../public', teacher.photo);
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch (e) {}
      }
    }

    const photoUrl = `/uploads/${req.file.filename}`;
    teacher.photo = photoUrl;
    await teacher.save();

    return res.json({
      message: 'Profile picture updated successfully.',
      photo: photoUrl
    });
  } catch (error) {
    console.error('Teacher photo upload error:', error);
    return res.status(500).json({ error: 'Failed to upload profile picture.' });
  }
});

// PUT update teacher (Admin only)
router.put('/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const teacher = await Teacher.findByPk(req.params.id, { include: [User] });
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher profile not found.' });
    }

    const { name, email, password, qualification, salary, joining_date } = req.body;

    // Update user info
    if (teacher.User) {
      teacher.User.name = name || teacher.User.name;
      if (email && email !== teacher.User.email) {
        // check unique email
        const existingEmail = await User.findOne({ where: { email, id: { [Op.ne]: teacher.User.id } } });
        if (existingEmail) {
          return res.status(400).json({ error: 'Email already registered.' });
        }
        teacher.User.email = email;
      }
      if (password) {
        teacher.User.password = password; // hooks will hash
      }
      await teacher.User.save();
    }

    // Update teacher info
    teacher.qualification = qualification !== undefined ? qualification : teacher.qualification;
    teacher.salary = salary !== undefined ? salary : teacher.salary;
    teacher.joining_date = joining_date || teacher.joining_date;
    await teacher.save();

    return res.json({ message: 'Teacher details updated successfully.', teacher });
  } catch (error) {
    console.error('Update teacher error:', error);
    return res.status(500).json({ error: 'Failed to update teacher.' });
  }
});

// DELETE teacher profile (Admin only)
router.delete('/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const teacher = await Teacher.findByPk(req.params.id);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher profile not found.' });
    }

    // Find and delete the User profile too (cascade)
    const user = await User.findByPk(teacher.user_id);
    if (user) {
      await user.destroy(); // cascades deletion of Teacher record due to DB configurations
    } else {
      await teacher.destroy();
    }

    return res.json({ message: 'Teacher profile deleted successfully.' });
  } catch (error) {
    console.error('Delete teacher error:', error);
    return res.status(500).json({ error: 'Failed to delete teacher.' });
  }
});

// GET list of all teacher assignments (filtered by session / teacher)
router.get('/assignments', isAuthenticated, async (req, res) => {
  try {
    const { teacherId, academicYearId } = req.query;
    const whereClause = {};
    if (teacherId) whereClause.teacher_id = teacherId;
    if (academicYearId) whereClause.academic_year_id = academicYearId;

    const assignments = await TeacherAssignment.findAll({
      where: whereClause,
      include: [
        { model: Teacher, include: [{ model: User, attributes: ['name', 'email'] }] },
        { model: Class, attributes: ['id', 'class_name', 'section'] },
        { model: AcademicYear, attributes: ['year_name'] }
      ]
    });
    return res.json(assignments);
  } catch (error) {
    console.error('Fetch assignments error:', error);
    return res.status(500).json({ error: 'Failed to retrieve teacher assignments.' });
  }
});

// POST assign teacher to Class -> Academic Year (Admin only)
router.post('/assignments', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { teacher_id, class_id, academic_year_id } = req.body;
    if (!teacher_id || !class_id || !academic_year_id) {
      return res.status(400).json({ error: 'Please provide teacher, class, and session.' });
    }

    // Verify combination unique
    const existing = await TeacherAssignment.findOne({
      where: { teacher_id, class_id, academic_year_id }
    });

    if (existing) {
      return res.status(400).json({ error: 'This class assignment already exists.' });
    }

    const assignment = await TeacherAssignment.create({
      teacher_id,
      class_id,
      academic_year_id
    });

    return res.status(201).json({ message: 'Teacher assigned successfully.', assignment });
  } catch (error) {
    console.error('Create assignment error:', error);
    return res.status(500).json({ error: 'Failed to map teacher assignment.' });
  }
});

// DELETE assignment (Admin only)
router.delete('/assignments/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const assign = await TeacherAssignment.findByPk(req.params.id);
    if (!assign) {
      return res.status(404).json({ error: 'Assignment not found.' });
    }
    await assign.destroy();
    return res.json({ message: 'Assignment removed successfully.' });
  } catch (error) {
    console.error('Delete assignment error:', error);
    return res.status(500).json({ error: 'Failed to remove assignment.' });
  }
});

// GET Teacher Attendance log
router.get('/attendance', isAuthenticated, async (req, res) => {
  try {
    const { date, academicYearId } = req.query;
    const filter = {};
    if (date) filter.date = date;
    if (academicYearId) filter.academic_year_id = academicYearId;

    const logs = await TeacherAttendance.findAll({
      where: filter,
      include: [
        { model: Teacher, include: [{ model: User, attributes: ['name'] }] }
      ],
      order: [['date', 'DESC']]
    });
    return res.json(logs);
  } catch (error) {
    console.error('Fetch teacher attendance error:', error);
    return res.status(500).json({ error: 'Failed to load teacher attendance logs.' });
  }
});

// POST Mark Teacher Attendance (Admin only)
router.post('/attendance', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { logs, date, academicYearId } = req.body;
    if (!logs || !Array.isArray(logs) || !date || !academicYearId) {
      return res.status(400).json({ error: 'Please provide attendance logs, date, and active session.' });
    }

    for (const log of logs) {
      const { teacherId, status } = log;
      const [entry, created] = await TeacherAttendance.findOrCreate({
        where: { teacher_id: teacherId, date, academic_year_id: academicYearId },
        defaults: { status }
      });
      if (!created) {
        entry.status = status;
        await entry.save();
      }
    }

    return res.json({ message: 'Teacher attendance saved successfully.' });
  } catch (error) {
    console.error('Save teacher attendance error:', error);
    return res.status(500).json({ error: 'Failed to save teacher attendance logs.' });
  }
});

// GET Teacher Attendance Monthly Summary
router.get('/attendance/summary', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { month, academicYearId } = req.query;
    if (!month || !academicYearId) {
      return res.status(400).json({ error: 'Please specify month and academicYearId.' });
    }

    const startDate = `${month}-01`;
    const [yr, mo] = month.split('-').map(Number);
    const endDate = new Date(yr, mo, 0).toISOString().substring(0, 10);

    const logs = await TeacherAttendance.findAll({
      where: {
        academic_year_id: academicYearId,
        date: { [Op.between]: [startDate, endDate] }
      },
      include: [{ model: Teacher, include: [{ model: User, attributes: ['name'] }] }]
    });

    const teachers = await Teacher.findAll({
      include: [{ model: User, attributes: ['name'] }]
    });

    // Build the per-teacher summary
    const summary = teachers.map(t => {
      let present = 0, absent = 0, leave = 0;
      logs.filter(l => l.teacher_id === t.id).forEach(l => {
        if (l.status === 'Present') present++;
        else if (l.status === 'Absent') absent++;
        else if (l.status === 'Leave') leave++;
      });
      return {
        id: t.id,
        name: t.User ? t.User.name : 'Unknown',
        present,
        absent,
        leave
      };
    });

    return res.json(summary);
  } catch (error) {
    console.error('Fetch teacher attendance summary error:', error);
    return res.status(500).json({ error: 'Failed to load teacher attendance summary.' });
  }
});

// POST Mark Teacher Attendance (Bulk)
router.post('/attendance/mark', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { logs, date, academicYearId } = req.body;
    if (!logs || !Array.isArray(logs) || !date || !academicYearId) {
      return res.status(400).json({ error: 'Missing log records, date, or session context.' });
    }

    for (const log of logs) {
      const { teacher_id, status } = log;
      const [entry, created] = await TeacherAttendance.findOrCreate({
        where: { teacher_id, date, academic_year_id: academicYearId },
        defaults: { status }
      });
      if (!created) {
        entry.status = status;
        await entry.save();
      }
    }

    return res.json({ message: 'Teacher attendance saved successfully.' });
  } catch (error) {
    console.error('Mark teacher attendance error:', error);
    return res.status(500).json({ error: 'Failed to save teacher attendance.' });
  }
});

// GET Teacher Payroll for a specific Month & Academic Session (Auto-creates missing vouchers for registered teachers)
router.get('/payroll', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { month, academicYearId } = req.query;
    if (!month || !academicYearId) {
      return res.status(400).json({ error: 'Please specify month and academicYearId.' });
    }

    const teachers = await Teacher.findAll({
      include: [{ model: User, attributes: ['id', 'name', 'email'] }],
      order: [[User, 'name', 'ASC']]
    });

    const payrollRecords = [];

    for (const t of teachers) {
      let [record, created] = await TeacherSalaryRecord.findOrCreate({
        where: { teacher_id: t.id, academic_year_id: academicYearId, month },
        defaults: {
          basic_salary: t.salary || 0.00,
          paid_amount: 0.00,
          remaining_amount: t.salary || 0.00,
          status: 'Pending'
        }
      });

      payrollRecords.push({
        id: record.id,
        teacher_id: t.id,
        academic_year_id: record.academic_year_id,
        month: record.month,
        basic_salary: record.basic_salary,
        paid_amount: record.paid_amount,
        remaining_amount: record.remaining_amount,
        status: record.status,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        Teacher: {
          id: t.id,
          qualification: t.qualification,
          joining_date: t.joining_date,
          User: t.User
        }
      });
    }

    return res.json(payrollRecords);
  } catch (error) {
    console.error('Fetch payroll error:', error);
    return res.status(500).json({ error: 'Failed to retrieve monthly payroll records.' });
  }
});

// POST Bulk Generate / Sync Payroll for a month
router.post('/payroll/generate', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { month, academicYearId } = req.body;
    if (!month || !academicYearId) {
      return res.status(400).json({ error: 'Please select Month and Active Session.' });
    }

    const teachers = await Teacher.findAll();
    let generatedCount = 0;

    for (const t of teachers) {
      const [record, created] = await TeacherSalaryRecord.findOrCreate({
        where: { teacher_id: t.id, academic_year_id: academicYearId, month },
        defaults: {
          basic_salary: t.salary || 0.00,
          paid_amount: 0.00,
          remaining_amount: t.salary || 0.00,
          status: 'Pending'
        }
      });
      if (created) generatedCount++;
    }

    return res.json({ message: `Payroll records generated for ${generatedCount} faculty members.` });
  } catch (error) {
    console.error('Generate payroll error:', error);
    return res.status(500).json({ error: 'Failed to generate monthly payroll records.' });
  }
});

// GET Single Salary Record Details with Transaction History
router.get('/salary-records/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const record = await TeacherSalaryRecord.findByPk(req.params.id, {
      include: [
        { model: Teacher, include: [{ model: User, attributes: ['name', 'email'] }] },
        { model: AcademicYear, attributes: ['year_name'] },
        { model: TeacherSalaryPayment, order: [['payment_date', 'DESC']] }
      ]
    });
    if (!record) {
      return res.status(404).json({ error: 'Salary record not found.' });
    }
    return res.json(record);
  } catch (error) {
    console.error('Fetch salary record error:', error);
    return res.status(500).json({ error: 'Failed to retrieve salary record.' });
  }
});

// POST Record Salary Payment against a TeacherSalaryRecord
router.post('/salary-records/:id/payments', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { amount, payment_date, payment_method, notes } = req.body;
    const payVal = Number(amount);

    if (!amount || isNaN(payVal) || payVal <= 0 || !payment_date) {
      return res.status(400).json({ error: 'Please provide a valid payment amount and date.' });
    }

    const record = await TeacherSalaryRecord.findByPk(req.params.id, {
      include: [{ model: Teacher, include: [User] }]
    });

    if (!record) {
      return res.status(404).json({ error: 'Salary record not found.' });
    }

    const remainingDue = Number(record.remaining_amount);
    if (payVal > remainingDue + 0.01) {
      return res.status(400).json({
        error: `Payment amount (PKR ${payVal.toLocaleString()}) exceeds the remaining salary due of PKR ${remainingDue.toLocaleString()}.`
      });
    }

    // Determine month date range for balance verification
    const [yrStr, moStr] = payment_date.split('-');
    const yr = parseInt(yrStr);
    const mo = parseInt(moStr);
    const lastDay = new Date(yr, mo, 0).getDate();
    const startStr = `${payment_date.substring(0, 7)}-01`;
    const endStr = `${payment_date.substring(0, 7)}-${String(lastDay).padStart(2, '0')}`;

    // 1. Calculate collected student fees for the record's month & session
    const feeTotals = await Fee.findOne({
      where: {
        academic_year_id: record.academic_year_id,
        month: record.month
      },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('paid_amount')), 'collected']
      ],
      raw: true
    });
    const collectedFees = Number(feeTotals ? feeTotals.collected : 0);

    // 2. Calculate existing teacher salary payments in this month range
    const salaryTotals = await TeacherSalaryPayment.findOne({
      where: {
        payment_date: {
          [Op.between]: [startStr, endStr]
        }
      },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('amount')), 'paidSalaries']
      ],
      raw: true
    });
    const existingSalaries = Number(salaryTotals ? salaryTotals.paidSalaries : 0);
    const availableBalance = collectedFees - existingSalaries;

    // 3. Strict Balance Validation: Cannot pay out more salary than available collected fee balance
    if (payVal > availableBalance) {
      const maxPayable = availableBalance < 0 ? 0 : availableBalance;
      return res.status(400).json({
        error: `Insufficient collected fee funds for ${record.month}! Total fee collected: PKR ${collectedFees.toLocaleString()}, Salaries paid so far: PKR ${existingSalaries.toLocaleString()}. Available balance is PKR ${maxPayable.toLocaleString()}. You cannot pay PKR ${payVal.toLocaleString()}.`
      });
    }

    // 4. Log transaction
    const payment = await TeacherSalaryPayment.create({
      teacher_id: record.teacher_id,
      salary_record_id: record.id,
      amount: payVal,
      payment_date,
      payment_method: payment_method || 'Cash',
      notes
    });

    // 5. Update record totals and status
    const newPaid = Number(record.paid_amount) + payVal;
    const newRemaining = Number(record.basic_salary) - newPaid;
    const finalRemaining = newRemaining <= 0 ? 0.00 : newRemaining;

    let newStatus = 'Pending';
    if (finalRemaining <= 0) newStatus = 'Paid';
    else if (newPaid > 0) newStatus = 'Partial';

    record.paid_amount = newPaid;
    record.remaining_amount = finalRemaining;
    record.status = newStatus;
    await record.save();

    return res.status(201).json({
      message: `Salary payment of PKR ${payVal.toLocaleString()} logged for ${record.Teacher.User.name}.`,
      payment,
      record
    });
  } catch (error) {
    console.error('Record salary payment error:', error);
    return res.status(500).json({ error: 'Failed to record salary payment.' });
  }
});

// POST Legacy / Direct Teacher ID Salary Payment Endpoint (Fallback)
router.post('/:id/payments', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { amount, payment_date, payment_method, notes, academicYearId } = req.body;
    const teacherId = req.params.id;

    let yearId = academicYearId;
    if (!yearId) {
      const activeYear = await AcademicYear.findOne({ where: { status: 'Active' } });
      if (activeYear) yearId = activeYear.id;
    }
    if (!yearId) {
      const firstYear = await AcademicYear.findOne();
      if (firstYear) yearId = firstYear.id;
    }
    if (!yearId) {
      return res.status(400).json({ error: 'Active academic session context missing.' });
    }

    const payDate = payment_date || new Date().toISOString().substring(0, 10);
    const dateObj = new Date(payDate);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[dateObj.getMonth()];

    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found.' });
    }

    const [record, created] = await TeacherSalaryRecord.findOrCreate({
      where: { teacher_id: teacher.id, academic_year_id: yearId, month: monthName },
      defaults: {
        basic_salary: teacher.salary || 0.00,
        paid_amount: 0.00,
        remaining_amount: teacher.salary || 0.00,
        status: 'Pending'
      }
    });

    // Forward logic to salary-record payment processing
    req.params.id = record.id;
    req.body.payment_date = payDate;

    // Execute payment logic against record
    const payVal = Number(amount);
    if (!amount || isNaN(payVal) || payVal <= 0) {
      return res.status(400).json({ error: 'Please provide a valid payment amount.' });
    }

    const remainingDue = Number(record.remaining_amount);
    if (payVal > remainingDue + 0.01) {
      return res.status(400).json({
        error: `Payment amount (PKR ${payVal.toLocaleString()}) exceeds the remaining salary due of PKR ${remainingDue.toLocaleString()}.`
      });
    }

    const [yrStr, moStr] = payDate.split('-');
    const yr = parseInt(yrStr);
    const mo = parseInt(moStr);
    const lastDay = new Date(yr, mo, 0).getDate();
    const startStr = `${payDate.substring(0, 7)}-01`;
    const endStr = `${payDate.substring(0, 7)}-${String(lastDay).padStart(2, '0')}`;

    const feeTotals = await Fee.findOne({
      where: { academic_year_id: record.academic_year_id, month: record.month },
      attributes: [[sequelize.fn('SUM', sequelize.col('paid_amount')), 'collected']],
      raw: true
    });
    const collectedFees = Number(feeTotals ? feeTotals.collected : 0);

    const salaryTotals = await TeacherSalaryPayment.findOne({
      where: { payment_date: { [Op.between]: [startStr, endStr] } },
      attributes: [[sequelize.fn('SUM', sequelize.col('amount')), 'paidSalaries']],
      raw: true
    });
    const existingSalaries = Number(salaryTotals ? salaryTotals.paidSalaries : 0);
    const availableBalance = collectedFees - existingSalaries;

    if (payVal > availableBalance) {
      const maxPayable = availableBalance < 0 ? 0 : availableBalance;
      return res.status(400).json({
        error: `Insufficient collected fee funds for ${record.month}! Total fee collected: PKR ${collectedFees.toLocaleString()}, Salaries paid so far: PKR ${existingSalaries.toLocaleString()}. Available balance is PKR ${maxPayable.toLocaleString()}. You cannot pay PKR ${payVal.toLocaleString()}.`
      });
    }

    const payment = await TeacherSalaryPayment.create({
      teacher_id: record.teacher_id,
      salary_record_id: record.id,
      amount: payVal,
      payment_date: payDate,
      payment_method: payment_method || 'Cash',
      notes
    });

    const newPaid = Number(record.paid_amount) + payVal;
    const newRemaining = Number(record.basic_salary) - newPaid;
    const finalRemaining = newRemaining <= 0 ? 0.00 : newRemaining;

    let newStatus = 'Pending';
    if (finalRemaining <= 0) newStatus = 'Paid';
    else if (newPaid > 0) newStatus = 'Partial';

    record.paid_amount = newPaid;
    record.remaining_amount = finalRemaining;
    record.status = newStatus;
    await record.save();

    return res.status(201).json({
      message: `Salary payment of PKR ${payVal.toLocaleString()} logged successfully.`,
      payment,
      record
    });
  } catch (error) {
    console.error('Legacy payment endpoint error:', error);
    return res.status(500).json({ error: 'Failed to record salary payment.' });
  }
});

// GET Multi-month Salary History for a Teacher
router.get('/:id/salary-history', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const records = await TeacherSalaryRecord.findAll({
      where: { teacher_id: req.params.id },
      include: [
        { model: AcademicYear, attributes: ['year_name'] },
        { model: TeacherSalaryPayment, order: [['payment_date', 'DESC']] }
      ],
      order: [['createdAt', 'DESC']]
    });
    return res.json(records);
  } catch (error) {
    console.error('Fetch teacher salary history error:', error);
    return res.status(500).json({ error: 'Failed to load teacher salary history.' });
  }
});

// PUT Update Basic Salary on a specific month record
router.put('/salary-records/:id/basic-salary', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { basic_salary } = req.body;
    const newBasic = Number(basic_salary);
    if (isNaN(newBasic) || newBasic < 0) {
      return res.status(400).json({ error: 'Please enter a valid non-negative basic salary.' });
    }

    const record = await TeacherSalaryRecord.findByPk(req.params.id);
    if (!record) {
      return res.status(404).json({ error: 'Salary record not found.' });
    }

    record.basic_salary = newBasic;
    const newRemaining = newBasic - Number(record.paid_amount);
    record.remaining_amount = newRemaining <= 0 ? 0.00 : newRemaining;
    if (record.remaining_amount <= 0 && Number(record.paid_amount) > 0) record.status = 'Paid';
    else if (Number(record.paid_amount) > 0) record.status = 'Partial';
    else record.status = 'Pending';

    await record.save();
    return res.json({ message: 'Monthly basic salary updated.', record });
  } catch (error) {
    console.error('Update basic salary error:', error);
    return res.status(500).json({ error: 'Failed to update basic salary.' });
  }
});

// GET legacy payments endpoint for backward compatibility
router.get('/:id/payments', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const payments = await TeacherSalaryPayment.findAll({
      where: { teacher_id: req.params.id },
      order: [['payment_date', 'DESC']]
    });
    return res.json(payments);
  } catch (error) {
    console.error('Fetch payments error:', error);
    return res.status(500).json({ error: 'Failed to retrieve payment history.' });
  }
});

module.exports = router;
