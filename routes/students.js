const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Student, StudentEnrollment, Class, AcademicYear, Teacher, TeacherAssignment, Attendance, Fee, FeeStructure, Result, User } = require('../models');
const { isAuthenticated, isAdmin } = require('./middleware');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'student-' + uniqueSuffix + path.extname(file.originalname));
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

// 1. GET list of students (filtered by class, academic year, status, or search)
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const { classId, academicYearId, status, search } = req.query;

    const enrollmentFilter = {};
    if (classId) enrollmentFilter.class_id = classId;
    if (academicYearId) enrollmentFilter.academic_year_id = academicYearId;
    if (status) enrollmentFilter.status = status;

    const studentFilter = {};
    if (search) {
      studentFilter[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { father_name: { [Op.like]: `%${search}%` } },
        { roll_number: { [Op.like]: `%${search}%` } },
        { registration_number: { [Op.like]: `%${search}%` } }
      ];
    }

    const students = await Student.findAll({
      where: studentFilter,
      include: [{
        model: StudentEnrollment,
        where: Object.keys(enrollmentFilter).length > 0 ? enrollmentFilter : undefined,
        required: Object.keys(enrollmentFilter).length > 0,
        include: [
          { model: Class, attributes: ['id', 'class_name', 'section'] },
          { model: AcademicYear, attributes: ['id', 'year_name', 'status'] }
        ]
      }],
      order: [[sequelize.literal('CAST(`Student`.`roll_number` AS UNSIGNED)'), 'ASC']]
    });

    // Compute total attendance
    const studentIds = students.map(s => s.id);
    let attendanceStats = [];
    if (studentIds.length > 0) {
      const attWhere = { student_id: studentIds };
      if (academicYearId) attWhere.academic_year_id = academicYearId;

      attendanceStats = await Attendance.findAll({
        where: attWhere,
        attributes: ['student_id', 'status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['student_id', 'status']
      });
    }

    const studentArray = students.map(s => s.toJSON());
    studentArray.forEach(s => {
      s.totalAttendance = { Present: 0, Absent: 0, Leave: 0 };
    });
    attendanceStats.forEach(stat => {
      const student = studentArray.find(s => s.id === stat.student_id);
      if (student && student.totalAttendance[stat.status] !== undefined) {
        student.totalAttendance[stat.status] = parseInt(stat.dataValues.count, 10);
      }
    });

    return res.json(studentArray);
  } catch (error) {
    console.error('Fetch students error:', error);
    return res.status(500).json({ error: 'Failed to retrieve students.' });
  }
});

// 2. GET single student details (including history)
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const student = await Student.findByPk(req.params.id, {
      include: [{
        model: StudentEnrollment,
        include: [
          { model: Class },
          { model: AcademicYear }
        ],
        order: [['id', 'DESC']]
      }]
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    return res.json(student);
  } catch (error) {
    console.error('Fetch student detail error:', error);
    return res.status(500).json({ error: 'Failed to retrieve student profile.' });
  }
});

// 3. GET student academic journey (Multi-session historical career)
// GET /api/students/:id/academic-journey
router.get('/:id/academic-journey', isAuthenticated, async (req, res) => {
  try {
    const student = await Student.findByPk(req.params.id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const enrollments = await StudentEnrollment.findAll({
      where: { student_id: student.id },
      include: [
        { model: Class, attributes: ['id', 'class_name', 'section'] },
        { model: AcademicYear, attributes: ['id', 'year_name', 'status'] },
        { 
          model: StudentEnrollment, 
          as: 'PromotedFrom',
          include: [
            { model: Class, attributes: ['class_name', 'section'] },
            { model: AcademicYear, attributes: ['year_name'] }
          ]
        },
        { model: User, as: 'Promoter', attributes: ['id', 'name', 'email'] }
      ],
      order: [['academic_year_id', 'ASC'], ['id', 'ASC']]
    });

    // Fetch related exams and attendance per enrollment
    const journey = [];
    for (const enr of enrollments) {
      const yearId = enr.academic_year_id;

      // Fetch exams for this year
      const results = await Result.findAll({
        where: { student_id: student.id, academic_year_id: yearId, is_archived: false },
        attributes: ['id', 'exam_type', 'total_marks', 'obtained_marks', 'percentage', 'grade', 'overall_status', 'status']
      });

      // Fetch attendance for this year
      const attStats = await Attendance.findAll({
        where: { student_id: student.id, academic_year_id: yearId },
        attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['status']
      });

      const attSummary = { Present: 0, Absent: 0, Leave: 0 };
      attStats.forEach(st => {
        if (attSummary[st.status] !== undefined) {
          attSummary[st.status] = parseInt(st.dataValues.count, 10);
        }
      });
      const totalDays = attSummary.Present + attSummary.Absent + attSummary.Leave;
      const attPct = (attSummary.Present + attSummary.Absent) > 0 
        ? Math.round((attSummary.Present / (attSummary.Present + attSummary.Absent)) * 100) 
        : 0;

      journey.push({
        enrollmentId: enr.id,
        academicYearId: enr.academic_year_id,
        sessionName: enr.AcademicYear ? enr.AcademicYear.year_name : 'Unknown',
        sessionStatus: enr.AcademicYear ? enr.AcademicYear.status : 'inactive',
        classId: enr.class_id,
        className: enr.Class ? `${enr.Class.class_name} - Section ${enr.Class.section}` : 'N/A',
        classTitle: enr.Class ? enr.Class.class_name : 'N/A',
        section: enr.Class ? enr.Class.section : 'N/A',
        sessionRollNumber: enr.roll_number || student.roll_number,
        enrollmentStatus: enr.status,
        promotedFrom: enr.PromotedFrom ? {
          className: `${enr.PromotedFrom.Class?.class_name} - ${enr.PromotedFrom.Class?.section}`,
          sessionName: enr.PromotedFrom.AcademicYear?.year_name
        } : null,
        promotedAt: enr.promoted_at,
        promotedBy: enr.Promoter ? enr.Promoter.name : null,
        remarks: enr.remarks,
        results,
        attendance: {
          ...attSummary,
          totalDays,
          attendancePercentage: attPct
        }
      });
    }

    return res.json({ student, journey });
  } catch (error) {
    console.error('Academic journey error:', error);
    return res.status(500).json({ error: 'Failed to retrieve student academic journey.' });
  }
});

// 4. POST admission (Admin or Teacher)
router.post('/', isAuthenticated, upload.single('photo'), async (req, res) => {
  try {
    const {
      name, father_name, dob, gender, contact, address, admission_date,
      roll_number, class_id, academic_year_id,
      guardian_name, guardian_phone, emergency_contact, blood_group, previous_school
    } = req.body;

    if (!name || !father_name || !dob || !gender || !admission_date || 
        !roll_number || !class_id || !academic_year_id ||
        !guardian_name || !guardian_phone || !emergency_contact) {
      return res.status(400).json({ error: 'Please fill out all required fields.' });
    }

    // Auto-generate registration number: find max numeric reg >= 2002312
    const [regResult] = await sequelize.query(
      "SELECT MAX(CAST(registration_number AS UNSIGNED)) as maxReg FROM students WHERE registration_number REGEXP '^[0-9]+$' AND CAST(registration_number AS UNSIGNED) >= 2002312",
      { type: sequelize.QueryTypes.SELECT }
    );
    const maxRegVal = regResult && regResult.maxReg ? parseInt(regResult.maxReg, 10) : 2002311;
    const registration_number = (maxRegVal + 1).toString();

    // Role-based validation
    if (req.session.role === 'teacher') {
      const teacher = await Teacher.findOne({ where: { user_id: req.session.userId } });
      if (!teacher) {
        return res.status(403).json({ error: 'Teacher profile not found.' });
      }
      const assignment = await TeacherAssignment.findOne({
        where: {
          teacher_id: teacher.id,
          class_id,
          academic_year_id
        }
      });
      if (!assignment) {
        return res.status(403).json({ error: 'You are not authorized to admit students to this class.' });
      }
    } else if (req.session.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const photoPath = req.file ? `/uploads/${req.file.filename}` : null;

    // Create student record
    const student = await Student.create({
      roll_number,
      registration_number,
      name,
      father_name,
      dob,
      gender,
      contact,
      address,
      photo: photoPath,
      admission_date,
      guardian_name,
      guardian_phone,
      emergency_contact,
      blood_group,
      previous_school
    });

    // Create student enrollment record for current year
    await StudentEnrollment.create({
      student_id: student.id,
      class_id,
      academic_year_id,
      roll_number,
      status: 'Active'
    });

    // Auto-generate fee voucher for current active month so student shows up in Fee Management immediately
    try {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const currentMonth = monthNames[new Date().getMonth()];
      
      const structure = await FeeStructure.findOne({ where: { class_id, academic_year_id } });
      let baseFee = (student.custom_fee !== null && student.custom_fee !== undefined)
        ? Number(student.custom_fee)
        : (structure ? Number(structure.monthly_fee) : 0);
      let totalAmount = baseFee + (structure ? Number(structure.other_charges) : 0);

      await Fee.findOrCreate({
        where: { student_id: student.id, month: currentMonth, academic_year_id },
        defaults: {
          class_id,
          amount: totalAmount,
          paid_amount: 0,
          remaining_amount: totalAmount,
          status: 'Pending'
        }
      });
    } catch (feeErr) {
      console.error('Auto fee voucher creation error on admission:', feeErr);
    }

    return res.status(201).json({ message: 'Student admitted successfully.', student });
  } catch (error) {
    console.error('Admit student error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Roll number or Registration number already exists.' });
    }
    return res.status(500).json({ error: 'Failed to admit student.' });
  }
});

// 5. PUT update student (Admin or Teacher)
router.put('/:id', isAuthenticated, upload.single('photo'), async (req, res) => {
  try {
    const student = await Student.findByPk(req.params.id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const {
      name, father_name, dob, gender, contact, address, admission_date,
      roll_number, class_id, academic_year_id,
      guardian_name, guardian_phone, emergency_contact, blood_group, previous_school
    } = req.body;

    // Role-based validation
    if (req.session.role === 'teacher') {
      const teacher = await Teacher.findOne({ where: { user_id: req.session.userId } });
      if (!teacher) {
        return res.status(403).json({ error: 'Teacher profile not found.' });
      }
      
      const currentEnrollment = await StudentEnrollment.findOne({
        where: { student_id: student.id },
        order: [['id', 'DESC']]
      });
      
      const targetClassId = class_id || (currentEnrollment ? currentEnrollment.class_id : null);
      const targetYearId = academic_year_id || (currentEnrollment ? currentEnrollment.academic_year_id : null);
      
      if (!targetClassId) {
        return res.status(400).json({ error: 'Class ID could not be determined.' });
      }

      const assignment = await TeacherAssignment.findOne({
        where: {
          teacher_id: teacher.id,
          class_id: targetClassId,
          academic_year_id: targetYearId
        }
      });
      if (!assignment) {
        return res.status(403).json({ error: 'You are not authorized to update students in this class.' });
      }
    } else if (req.session.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Update main model fields
    student.name = name || student.name;
    student.father_name = father_name || student.father_name;
    student.dob = dob || student.dob;
    student.gender = gender || student.gender;
    student.contact = contact || student.contact;
    student.address = address || student.address;
    student.admission_date = admission_date || student.admission_date;
    student.roll_number = roll_number || student.roll_number;
    student.guardian_name = guardian_name || student.guardian_name;
    student.guardian_phone = guardian_phone || student.guardian_phone;
    student.emergency_contact = emergency_contact || student.emergency_contact;
    student.blood_group = blood_group || student.blood_group;
    student.previous_school = previous_school || student.previous_school;

    if (req.file) {
      // Delete old photo if it exists
      if (student.photo) {
        const oldPath = path.join(__dirname, '../public', student.photo);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      student.photo = `/uploads/${req.file.filename}`;
    }

    await student.save();

    // Update active year's enrollment if applicable
    if (class_id && academic_year_id) {
      const enrollment = await StudentEnrollment.findOne({
        where: { student_id: student.id, academic_year_id }
      });
      if (enrollment) {
        enrollment.class_id = class_id;
        enrollment.roll_number = roll_number || enrollment.roll_number;
        await enrollment.save();
      } else {
        await StudentEnrollment.create({
          student_id: student.id,
          class_id,
          academic_year_id,
          roll_number: roll_number || student.roll_number,
          status: 'Active'
        });
      }
    }

    return res.json({ message: 'Student profile updated successfully.', student });
  } catch (error) {
    console.error('Update student error:', error);
    return res.status(500).json({ error: 'Failed to update student profile.' });
  }
});

// 6. POST promotion preview & conflict analysis (Admin only)
// POST /api/students/promotion/preview
router.post('/promotion/preview', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { sourceClassId, sourceAcademicYearId, targetClassId, targetAcademicYearId } = req.body;

    if (!sourceClassId || !sourceAcademicYearId || !targetClassId || !targetAcademicYearId) {
      return res.status(400).json({ error: 'Please specify Source Class, Source Session, Target Class, and Target Session.' });
    }

    if (Number(sourceAcademicYearId) === Number(targetAcademicYearId)) {
      return res.status(400).json({ 
        error: 'Source and Target Academic Sessions must be different for promotion. For transferring a student to another section in the same session, please use Section Transfer.' 
      });
    }

    const [sourceClass, targetClass, sourceSession, targetSession] = await Promise.all([
      Class.findByPk(sourceClassId),
      Class.findByPk(targetClassId),
      AcademicYear.findByPk(sourceAcademicYearId),
      AcademicYear.findByPk(targetAcademicYearId)
    ]);

    if (!sourceClass || !targetClass || !sourceSession || !targetSession) {
      return res.status(404).json({ error: 'Specified classes or academic sessions were not found.' });
    }

    // Fetch all active/enrolled students in source session and class
    const sourceEnrollments = await StudentEnrollment.findAll({
      where: { class_id: sourceClassId, academic_year_id: sourceAcademicYearId },
      include: [{ model: Student }],
      order: [[sequelize.literal('CAST(`StudentEnrollment`.`roll_number` AS UNSIGNED)'), 'ASC'], ['id', 'ASC']]
    });

    if (sourceEnrollments.length === 0) {
      return res.json({
        sourceClass: `${sourceClass.class_name} - ${sourceClass.section}`,
        sourceSession: sourceSession.year_name,
        targetClass: `${targetClass.class_name} - ${targetClass.section}`,
        targetSession: targetSession.year_name,
        students: [],
        summary: { totalSelected: 0, eligibleCount: 0, conflictCount: 0 }
      });
    }

    const studentIds = sourceEnrollments.map(e => e.student_id);

    // Check for existing enrollments in target academic session
    const existingTargetEnrollments = await StudentEnrollment.findAll({
      where: {
        student_id: studentIds,
        academic_year_id: targetAcademicYearId
      },
      include: [{ model: Class, attributes: ['class_name', 'section'] }]
    });

    const targetEnrollmentMap = {};
    existingTargetEnrollments.forEach(te => {
      targetEnrollmentMap[te.student_id] = te;
    });

    // Fetch latest exam results in source session (informative indicator)
    const recentResults = await Result.findAll({
      where: {
        student_id: studentIds,
        academic_year_id: sourceAcademicYearId,
        is_archived: false
      },
      order: [['id', 'DESC']]
    });

    const resultMap = {};
    recentResults.forEach(r => {
      if (!resultMap[r.student_id]) {
        resultMap[r.student_id] = {
          examType: r.exam_type,
          percentage: r.percentage,
          grade: r.grade,
          overallStatus: r.overall_status
        };
      }
    });

    // Fetch pending fees in source session (informative indicator)
    const feeRecords = await Fee.findAll({
      where: {
        student_id: studentIds,
        academic_year_id: sourceAcademicYearId,
        status: { [Op.in]: ['Pending', 'Partial'] }
      }
    });

    const feePendingMap = {};
    feeRecords.forEach(f => {
      feePendingMap[f.student_id] = (feePendingMap[f.student_id] || 0) + Number(f.remaining_amount || 0);
    });

    let conflictCount = 0;
    let eligibleCount = 0;

    const studentList = sourceEnrollments.map(enr => {
      const s = enr.Student;
      const targetConflict = targetEnrollmentMap[s.id];
      const isConflict = !!targetConflict;

      if (isConflict) {
        conflictCount++;
      } else {
        eligibleCount++;
      }

      return {
        studentId: s.id,
        enrollmentId: enr.id,
        name: s.name,
        fatherName: s.father_name,
        currentRollNumber: enr.roll_number || s.roll_number,
        suggestedTargetRollNumber: enr.roll_number || s.roll_number,
        currentStatus: enr.status,
        isAlreadyEnrolled: isConflict,
        existingTargetClass: targetConflict ? `${targetConflict.Class?.class_name} - ${targetConflict.Class?.section}` : null,
        latestExamResult: resultMap[s.id] || null,
        pendingFeeAmount: feePendingMap[s.id] || 0,
        hasPendingFee: (feePendingMap[s.id] || 0) > 0
      };
    });

    return res.json({
      sourceClass: `${sourceClass.class_name} - ${sourceClass.section}`,
      sourceSession: sourceSession.year_name,
      targetClass: `${targetClass.class_name} - ${targetClass.section}`,
      targetSession: targetSession.year_name,
      students: studentList,
      summary: {
        totalSelected: studentList.length,
        eligibleCount,
        conflictCount
      }
    });
  } catch (error) {
    console.error('Promotion preview error:', error);
    return res.status(500).json({ error: 'Failed to generate promotion preview: ' + error.message });
  }
});

// 7. POST promotion execution (Atomic Transaction) (Admin only)
// POST /api/students/promotion/execute
router.post('/promotion/execute', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { sourceAcademicYearId, targetClassId, targetAcademicYearId, promotions } = req.body;

    if (!sourceAcademicYearId || !targetClassId || !targetAcademicYearId || !Array.isArray(promotions) || promotions.length === 0) {
      return res.status(400).json({ error: 'Please provide valid source session, target class, target session, and promotion list.' });
    }

    if (Number(sourceAcademicYearId) === Number(targetAcademicYearId)) {
      return res.status(400).json({ error: 'Source and Target sessions must be different for promotion.' });
    }

    // Check for duplicate target roll numbers in payload
    const payloadRolls = [];
    for (const p of promotions) {
      const roll = (p.targetRollNumber || '').trim();
      if (roll) {
        if (payloadRolls.includes(roll)) {
          return res.status(400).json({ error: `Duplicate Target Roll Number detected in submission: Roll #${roll}. Each student in a class must have a unique roll number.` });
        }
        payloadRolls.push(roll);
      }
    }

    // Execute atomic promotion in managed transaction
    const results = await sequelize.transaction(async (t) => {
      const processed = [];

      for (const item of promotions) {
        const studentId = Number(item.studentId);
        const action = item.action || 'Promote'; // 'Promote' or 'Repeat'
        const remarks = item.remarks || '';

        // 1. Check if student already enrolled in target session
        const existingTargetEnr = await StudentEnrollment.findOne({
          where: { student_id: studentId, academic_year_id: targetAcademicYearId },
          transaction: t
        });

        if (existingTargetEnr) {
          throw new Error(`Student ID #${studentId} is already enrolled in target academic session. Cannot create duplicate enrollment.`);
        }

        // 2. Fetch student master record
        const student = await Student.findByPk(studentId, { transaction: t });
        if (!student) {
          throw new Error(`Student ID #${studentId} not found.`);
        }

        const targetRoll = (item.targetRollNumber || '').trim() || student.roll_number;

        // Check if targetRoll is already taken in targetClass and targetAcademicYear
        const duplicateRollCheck = await StudentEnrollment.findOne({
          where: {
            class_id: targetClassId,
            academic_year_id: targetAcademicYearId,
            roll_number: targetRoll
          },
          transaction: t
        });

        if (duplicateRollCheck) {
          throw new Error(`Roll Number #${targetRoll} is already assigned to another student in target class and session.`);
        }

        // 3. Find and update source enrollment
        const sourceEnr = await StudentEnrollment.findOne({
          where: { student_id: studentId, academic_year_id: sourceAcademicYearId },
          transaction: t
        });

        if (sourceEnr) {
          sourceEnr.status = (action === 'Repeat' ? 'Not Promoted' : 'Promoted');
          sourceEnr.promoted_at = new Date();
          sourceEnr.promoted_by = req.session.userId;
          if (remarks) sourceEnr.remarks = remarks;
          await sourceEnr.save({ transaction: t });
        }

        // 4. Create new enrollment in target session
        const newEnr = await StudentEnrollment.create({
          student_id: studentId,
          class_id: targetClassId,
          academic_year_id: targetAcademicYearId,
          roll_number: targetRoll,
          status: 'Active',
          promoted_from_enrollment_id: sourceEnr ? sourceEnr.id : null,
          promoted_at: new Date(),
          promoted_by: req.session.userId,
          remarks: remarks || (action === 'Repeat' ? 'Retained in class' : 'Promoted to new class')
        }, { transaction: t });

        // 5. Optional auto-fee voucher creation for target month
        try {
          const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
          const currentMonth = monthNames[new Date().getMonth()];
          const feeStructure = await FeeStructure.findOne({ 
            where: { class_id: targetClassId, academic_year_id: targetAcademicYearId },
            transaction: t
          });

          if (feeStructure) {
            let baseFee = (student.custom_fee !== null && student.custom_fee !== undefined)
              ? Number(student.custom_fee)
              : Number(feeStructure.monthly_fee || 0);
            let totalAmount = baseFee + Number(feeStructure.other_charges || 0);

            await Fee.findOrCreate({
              where: { student_id: studentId, month: currentMonth, academic_year_id: targetAcademicYearId },
              defaults: {
                class_id: targetClassId,
                amount: totalAmount,
                paid_amount: 0,
                remaining_amount: totalAmount,
                status: 'Pending'
              },
              transaction: t
            });
          }
        } catch (feeError) {
          console.warn('Fee voucher auto-creation notice on promotion:', feeError.message);
        }

        processed.push(newEnr);
      }

      return processed;
    });

    return res.status(201).json({
      message: `Successfully processed promotion for ${results.length} student(s).`,
      count: results.length
    });
  } catch (error) {
    console.error('Promotion execution error:', error);
    return res.status(400).json({ error: error.message || 'Failed to execute student promotion.' });
  }
});

// 8. POST section transfer within same academic session (Admin only)
// POST /api/students/section-transfer
router.post('/section-transfer', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { studentId, academicYearId, targetClassId, newRollNumber, remarks } = req.body;

    if (!studentId || !academicYearId || !targetClassId) {
      return res.status(400).json({ error: 'Please specify Student, Academic Session, and Target Class/Section.' });
    }

    const enrollment = await StudentEnrollment.findOne({
      where: { student_id: studentId, academic_year_id: academicYearId }
    });

    if (!enrollment) {
      return res.status(404).json({ error: 'Student enrollment for the specified academic session was not found.' });
    }

    if (Number(enrollment.class_id) === Number(targetClassId)) {
      return res.status(400).json({ error: 'Student is already enrolled in this exact class and section.' });
    }

    const targetClass = await Class.findByPk(targetClassId);
    if (!targetClass) {
      return res.status(404).json({ error: 'Target class/section not found.' });
    }

    const finalRoll = (newRollNumber || '').trim() || enrollment.roll_number;

    // Check if roll number is already taken in target class and session
    if (finalRoll) {
      const duplicateRoll = await StudentEnrollment.findOne({
        where: {
          class_id: targetClassId,
          academic_year_id: academicYearId,
          roll_number: finalRoll,
          student_id: { [Op.ne]: studentId }
        }
      });
      if (duplicateRoll) {
        return res.status(400).json({ error: `Roll Number #${finalRoll} is already taken in target class (${targetClass.class_name} - ${targetClass.section}).` });
      }
    }

    enrollment.class_id = targetClassId;
    enrollment.roll_number = finalRoll;
    enrollment.remarks = remarks || `Transferred to ${targetClass.class_name} - ${targetClass.section}`;
    await enrollment.save();

    return res.json({ 
      message: `Student transferred to ${targetClass.class_name} - Section ${targetClass.section} successfully.`,
      enrollment 
    });
  } catch (error) {
    console.error('Section transfer error:', error);
    return res.status(500).json({ error: 'Failed to transfer student section: ' + error.message });
  }
});

// 9. POST individual enrollment status update (Admin only)
// POST /api/students/status-update
router.post('/status-update', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { studentId, academicYearId, status, remarks } = req.body;

    if (!studentId || !academicYearId || !status) {
      return res.status(400).json({ error: 'Please specify Student, Academic Session, and new Status.' });
    }

    const validStatuses = ['Active', 'Promoted', 'Not Promoted', 'Left', 'Graduated', 'Transferred'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const enrollment = await StudentEnrollment.findOne({
      where: { student_id: studentId, academic_year_id: academicYearId }
    });

    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment record not found for this student and session.' });
    }

    enrollment.status = status;
    if (remarks !== undefined) enrollment.remarks = remarks;
    await enrollment.save();

    return res.json({ 
      message: `Student status updated to "${status}" successfully.`,
      enrollment 
    });
  } catch (error) {
    console.error('Status update error:', error);
    return res.status(500).json({ error: 'Failed to update student status.' });
  }
});

// 10. DELETE student record (Admin only)
router.delete('/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const student = await Student.findByPk(req.params.id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    // Delete photo if exists
    if (student.photo) {
      const photoPath = path.join(__dirname, '../public', student.photo);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }

    await student.destroy();
    return res.json({ message: 'Student record deleted successfully.' });
  } catch (error) {
    console.error('Delete student error:', error);
    return res.status(500).json({ error: 'Failed to delete student.' });
  }
});

module.exports = router;
