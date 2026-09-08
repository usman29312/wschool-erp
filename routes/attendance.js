const express = require('express');
const router = express.Router();
const { Attendance, Student, StudentEnrollment, Class, Teacher, User, TeacherAssignment, AcademicYear } = require('../models');
const { isAuthenticated } = require('./middleware');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

// Helper to check if a teacher is assigned to a class in an academic session
async function verifyTeacherClassAssignment(teacherId, classId, academicYearId) {
  if (!teacherId) return false;
  const assignment = await TeacherAssignment.findOne({
    where: {
      teacher_id: teacherId,
      class_id: classId,
      academic_year_id: academicYearId
    }
  });
  return !!assignment;
}

// GET student attendance logs (filtered by class, date, and academic year)
// GET /api/attendance?classId=X&date=YYYY-MM-DD&academicYearId=Y
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const { classId, date, academicYearId } = req.query;
    if (!classId || !date || !academicYearId) {
      return res.status(400).json({ error: 'Please specify Class, Date, and Academic Year.' });
    }

    // Teacher permission verification
    if (req.session.role === 'teacher') {
      const isAssigned = await verifyTeacherClassAssignment(req.session.teacherId, classId, academicYearId);
      if (!isAssigned) {
        return res.status(403).json({ error: 'Access denied. You are not assigned to this class for the active session.' });
      }
    }

    const logs = await Attendance.findAll({
      where: { class_id: classId, date, academic_year_id: academicYearId },
      include: [
        { model: Student, attributes: ['id', 'name', 'father_name', 'roll_number'] },
        { 
          model: Teacher, 
          attributes: ['id'],
          include: [{ model: User, attributes: ['name'] }]
        }
      ]
    });

    return res.json(logs);
  } catch (error) {
    console.error('Fetch student attendance error:', error);
    return res.status(500).json({ error: 'Failed to retrieve attendance log.' });
  }
});

// GET submission status for a class & date
// GET /api/attendance/status?classId=X&date=YYYY-MM-DD&academicYearId=Y
router.get('/status', isAuthenticated, async (req, res) => {
  try {
    const { classId, date, academicYearId } = req.query;
    if (!classId || !date || !academicYearId) {
      return res.status(400).json({ error: 'Please specify Class, Date, and Academic Year.' });
    }

    if (req.session.role === 'teacher') {
      const isAssigned = await verifyTeacherClassAssignment(req.session.teacherId, classId, academicYearId);
      if (!isAssigned) {
        return res.status(403).json({ error: 'Access denied. You are not assigned to this class.' });
      }
    }

    const [totalStudents, markedCount] = await Promise.all([
      StudentEnrollment.count({ where: { class_id: classId, academic_year_id: academicYearId } }),
      Attendance.count({ where: { class_id: classId, date, academic_year_id: academicYearId } })
    ]);

    return res.json({
      marked: markedCount > 0,
      markedCount,
      totalStudents,
      date,
      classId
    });
  } catch (error) {
    console.error('Attendance status error:', error);
    return res.status(500).json({ error: 'Failed to retrieve attendance status.' });
  }
});

// GET daily summary across classes (for Admin daily overview / Teacher assigned overview)
// GET /api/attendance/daily-summary?date=YYYY-MM-DD&academicYearId=Y
router.get('/daily-summary', isAuthenticated, async (req, res) => {
  try {
    const { date, academicYearId } = req.query;
    if (!date || !academicYearId) {
      return res.status(400).json({ error: 'Please specify Date and Academic Year.' });
    }

    let classes = [];
    if (req.session.role === 'teacher') {
      const assignments = await TeacherAssignment.findAll({
        where: { teacher_id: req.session.teacherId, academic_year_id: academicYearId },
        include: [{ model: Class }]
      });
      classes = assignments.map(a => a.Class).filter(Boolean);
    } else {
      classes = await Class.findAll({ order: [['id', 'ASC']] });
    }

    const summaryList = [];
    let overallStudents = 0;
    let overallPresent = 0;
    let overallAbsent = 0;
    let overallLeave = 0;
    let markedClasses = 0;

    for (const cls of classes) {
      const enrollments = await StudentEnrollment.findAll({
        where: { class_id: cls.id, academic_year_id: academicYearId },
        attributes: ['student_id']
      });
      const totalStudents = enrollments.length;

      const logs = await Attendance.findAll({
        where: { class_id: cls.id, date, academic_year_id: academicYearId },
        include: [{
          model: Teacher,
          attributes: ['id'],
          include: [{ model: User, attributes: ['name'] }]
        }]
      });

      let present = 0, absent = 0, leave = 0;
      let markedBy = null;
      logs.forEach(l => {
        if (l.status === 'Present') present++;
        else if (l.status === 'Absent') absent++;
        else if (l.status === 'Leave') leave++;
        if (!markedBy && l.Teacher && l.Teacher.User) {
          markedBy = l.Teacher.User.name;
        }
      });

      const isMarked = logs.length > 0;
      if (isMarked) markedClasses++;

      // Option B formula: Present / (Present + Absent) * 100
      const activeDays = present + absent;
      const percentage = activeDays > 0 ? Math.round((present / activeDays) * 100) : (isMarked ? 0 : null);

      overallStudents += totalStudents;
      overallPresent += present;
      overallAbsent += absent;
      overallLeave += leave;

      summaryList.push({
        classId: cls.id,
        className: `${cls.class_name} - Sec ${cls.section}`,
        totalStudents,
        marked: isMarked,
        present,
        absent,
        leave,
        notMarkedCount: Math.max(0, totalStudents - logs.length),
        percentage,
        markedBy: markedBy || (isMarked ? 'Admin / System' : 'Not Marked')
      });
    }

    const overallActive = overallPresent + overallAbsent;
    const overallPercentage = overallActive > 0 ? Math.round((overallPresent / overallActive) * 100) : 0;

    return res.json({
      date,
      academicYearId,
      classes: summaryList,
      overall: {
        totalClasses: classes.length,
        markedClasses,
        unmarkedClasses: Math.max(0, classes.length - markedClasses),
        totalStudents: overallStudents,
        totalPresent: overallPresent,
        totalAbsent: overallAbsent,
        totalLeave: overallLeave,
        overallPercentage
      }
    });
  } catch (error) {
    console.error('Daily attendance summary error:', error);
    return res.status(500).json({ error: 'Failed to retrieve daily attendance summary.' });
  }
});

// GET single student attendance history
// GET /api/attendance/student-history?studentId=X&academicYearId=Y&month=YYYY-MM
router.get('/student-history', isAuthenticated, async (req, res) => {
  try {
    const { studentId, academicYearId, month } = req.query;
    if (!studentId || !academicYearId) {
      return res.status(400).json({ error: 'Please specify studentId and academicYearId.' });
    }

    // Verify teacher permission if teacher
    if (req.session.role === 'teacher') {
      const enrollment = await StudentEnrollment.findOne({
        where: { student_id: studentId, academic_year_id: academicYearId }
      });
      if (!enrollment) {
        return res.status(404).json({ error: 'Student enrollment not found.' });
      }
      const isAssigned = await verifyTeacherClassAssignment(req.session.teacherId, enrollment.class_id, academicYearId);
      if (!isAssigned) {
        return res.status(403).json({ error: 'Access denied. Student is not in your assigned class.' });
      }
    }

    const student = await Student.findByPk(studentId, {
      attributes: ['id', 'name', 'father_name', 'roll_number', 'registration_number', 'photo']
    });
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const whereClause = {
      student_id: studentId,
      academic_year_id: academicYearId
    };

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const startDate = `${month}-01`;
      const [yr, mo] = month.split('-').map(Number);
      const endDate = new Date(yr, mo, 0).toISOString().substring(0, 10);
      whereClause.date = { [Op.between]: [startDate, endDate] };
    }

    const logs = await Attendance.findAll({
      where: whereClause,
      include: [
        { model: Class, attributes: ['class_name', 'section'] },
        { 
          model: Teacher, 
          attributes: ['id'],
          include: [{ model: User, attributes: ['name'] }]
        }
      ],
      order: [['date', 'DESC']]
    });

    let present = 0, absent = 0, leave = 0;
    logs.forEach(l => {
      if (l.status === 'Present') present++;
      else if (l.status === 'Absent') absent++;
      else if (l.status === 'Leave') leave++;
    });

    // Option B: Present / (Present + Absent) * 100
    const totalCounted = present + absent;
    const percentage = totalCounted > 0 ? Math.round((present / totalCounted) * 100) : 0;

    return res.json({
      student,
      logs: logs.map(l => ({
        id: l.id,
        date: l.date,
        status: l.status,
        className: l.Class ? `${l.Class.class_name} - Sec ${l.Class.section}` : '-',
        markedBy: l.Teacher && l.Teacher.User ? l.Teacher.User.name : 'Admin / System'
      })),
      summary: {
        present,
        absent,
        leave,
        totalRecordedDays: logs.length,
        attendanceDays: totalCounted,
        percentage
      }
    });
  } catch (error) {
    console.error('Student attendance history error:', error);
    return res.status(500).json({ error: 'Failed to retrieve student attendance history.' });
  }
});

// GET monthly attendance summary (Admin/Teacher view)
// GET /api/attendance/monthly?classId=X&academicYearId=Y&month=YYYY-MM
router.get('/monthly', isAuthenticated, async (req, res) => {
  try {
    const { classId, academicYearId, month } = req.query;
    if (!classId || !academicYearId || !month) {
      return res.status(400).json({ error: 'Please specify classId, academicYearId, and month (YYYY-MM).' });
    }

    // Teacher permission verification
    if (req.session.role === 'teacher') {
      const isAssigned = await verifyTeacherClassAssignment(req.session.teacherId, classId, academicYearId);
      if (!isAssigned) {
        return res.status(403).json({ error: 'Access denied. You are not assigned to this class for the active session.' });
      }
    }

    // Get all students in this class/year
    const enrollments = await StudentEnrollment.findAll({
      where: { class_id: classId, academic_year_id: academicYearId },
      include: [{ model: Student, attributes: ['id', 'name', 'roll_number', 'father_name'] }],
      order: [[sequelize.literal('CAST(`Student`.`roll_number` AS UNSIGNED)'), 'ASC']]
    });

    if (!enrollments.length) {
      return res.json({
        students: [],
        dates: [],
        summary: {
          totalStudents: 0,
          attendanceDaysCount: 0,
          classAveragePercentage: 0,
          lowAttendanceCount: 0,
          lowAttendanceThreshold: 75
        }
      });
    }

    const studentIds = enrollments.map(e => e.Student.id);

    // Date range for the month
    const startDate = `${month}-01`;
    const [yr, mo] = month.split('-').map(Number);
    const endDate = new Date(yr, mo, 0).toISOString().substring(0, 10); // last day of month

    const logs = await Attendance.findAll({
      where: {
        student_id: studentIds,
        class_id: classId,
        academic_year_id: academicYearId,
        date: { [Op.between]: [startDate, endDate] }
      },
      attributes: ['student_id', 'date', 'status'],
      order: [['date', 'ASC']]
    });

    // Build unique sorted date list
    const datesSet = new Set(logs.map(l => l.date));
    const dates = Array.from(datesSet).sort();

    let totalClassPresent = 0;
    let totalClassAbsent = 0;
    let lowAttendanceCount = 0;
    const LOW_THRESHOLD = 75;

    // Build per-student attendance map with Option B percentage
    const students = enrollments.map(e => {
      const st = e.Student;
      const record = {};
      let present = 0, absent = 0, leave = 0;
      logs.filter(l => l.student_id === st.id).forEach(l => {
        record[l.date] = l.status;
        if (l.status === 'Present') present++;
        else if (l.status === 'Absent') absent++;
        else if (l.status === 'Leave') leave++;
      });

      // Option B percentage: Present / (Present + Absent) * 100
      const activeDays = present + absent;
      const percentage = activeDays > 0 ? Math.round((present / activeDays) * 100) : (dates.length > 0 ? 0 : 100);

      totalClassPresent += present;
      totalClassAbsent += absent;
      if (activeDays > 0 && percentage < LOW_THRESHOLD) {
        lowAttendanceCount++;
      }

      return {
        id: st.id,
        name: st.name,
        roll_number: st.roll_number,
        father_name: st.father_name,
        record,
        summary: { present, absent, leave, percentage, activeDays }
      };
    });

    const totalActiveDays = totalClassPresent + totalClassAbsent;
    const classAveragePercentage = totalActiveDays > 0 
      ? Math.round((totalClassPresent / totalActiveDays) * 100) 
      : (dates.length > 0 ? 0 : 100);

    return res.json({ 
      students, 
      dates,
      summary: {
        totalStudents: enrollments.length,
        attendanceDaysCount: dates.length,
        classAveragePercentage,
        lowAttendanceCount,
        lowAttendanceThreshold: LOW_THRESHOLD
      }
    });
  } catch (error) {
    console.error('Monthly attendance error:', error);
    return res.status(500).json({ error: 'Failed to retrieve monthly attendance.' });
  }
});

// POST Mark student attendance (Admin or Teacher)
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { logs, date, classId, academicYearId } = req.body;
    if (!logs || !Array.isArray(logs) || !date || !classId || !academicYearId) {
      return res.status(400).json({ error: 'Missing log records, class, date, or session context.' });
    }

    const teacherId = req.session.role === 'teacher' ? req.session.teacherId : null;

    // Backend permission validation for teachers
    if (req.session.role === 'teacher') {
      const isAssigned = await verifyTeacherClassAssignment(teacherId, classId, academicYearId);
      if (!isAssigned) {
        return res.status(403).json({ error: 'Access denied. You are not assigned to mark attendance for this class.' });
      }
    }

    for (const log of logs) {
      const { studentId, status } = log;
      const [entry, created] = await Attendance.findOrCreate({
        where: { 
          student_id: studentId, 
          class_id: classId, 
          date, 
          academic_year_id: academicYearId 
        },
        defaults: {
          teacher_id: teacherId,
          status
        }
      });
      if (!created) {
        entry.status = status;
        entry.teacher_id = teacherId;
        await entry.save();
      }
    }

    return res.json({ message: 'Attendance records saved successfully.', count: logs.length });
  } catch (error) {
    console.error('Mark student attendance error:', error);
    return res.status(500).json({ error: 'Failed to save student attendance.' });
  }
});

module.exports = router;

