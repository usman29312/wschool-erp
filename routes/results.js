const express = require('express');
const router = express.Router();
const { Result, ResultSubject, Subject, Student, Class, AcademicYear, TeacherAssignment, StudentEnrollment, User } = require('../models');
const { isAuthenticated, isAdmin } = require('./middleware');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

// Helper function to calculate board grading scales
function calculateGrade(percentage) {
  const pct = Number(percentage);
  if (pct >= 80) return 'A+';
  if (pct >= 70) return 'A';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 40) return 'D';
  if (pct >= 33) return 'E';
  return 'F';
}

// Helper to assign dynamic ordinal ranks (e.g. 1st, 2nd, 2nd, 4th) based on percentage
function attachDynamicPositions(resultsList) {
  if (!resultsList || resultsList.length === 0) return [];
  const sorted = [...resultsList].sort((a, b) => Number(b.percentage) - Number(a.percentage));
  let currentRank = 1;
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && Number(sorted[i].percentage) === Number(sorted[i - 1].percentage)) {
      sorted[i].position = sorted[i - 1].position;
    } else {
      sorted[i].position = currentRank;
    }
    currentRank++;
  }
  return sorted;
}

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

// 1. GET list of results with filtering and dynamic ranking
// GET /api/results?classId=X&academicYearId=Y&examType=Z&studentId=A&grade=B&overallStatus=Pass&status=Completed
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const { classId, academicYearId, examType, studentId, grade, overallStatus, status, isPublished, isLocked, search } = req.query;

    // Teacher class permission check
    if (req.session.role === 'teacher' && classId) {
      const isAssigned = await verifyTeacherClassAssignment(req.session.teacherId, classId, academicYearId);
      if (!isAssigned) {
        return res.status(403).json({ error: 'Access denied. You are not assigned to this class for the active session.' });
      }
    }

    const filter = { is_archived: false };
    if (classId) filter.class_id = classId;
    if (academicYearId) filter.academic_year_id = academicYearId;
    if (examType) filter.exam_type = examType;
    if (studentId) filter.student_id = studentId;
    if (grade) filter.grade = grade;
    if (overallStatus) filter.overall_status = overallStatus;
    if (status) filter.status = status;
    if (isPublished !== undefined && isPublished !== '') filter.is_published = isPublished === 'true' || isPublished === '1';
    if (isLocked !== undefined && isLocked !== '') filter.is_locked = isLocked === 'true' || isLocked === '1';

    const studentInclude = {
      model: Student,
      attributes: ['id', 'name', 'father_name', 'roll_number', 'registration_number', 'photo']
    };
    if (search && search.trim()) {
      studentInclude.where = {
        [Op.or]: [
          { name: { [Op.like]: `%${search.trim()}%` } },
          { roll_number: { [Op.like]: `%${search.trim()}%` } },
          { father_name: { [Op.like]: `%${search.trim()}%` } }
        ]
      };
    }

    const results = await Result.findAll({
      where: filter,
      include: [
        studentInclude,
        { model: Class, attributes: ['id', 'class_name', 'section'] },
        { model: AcademicYear, attributes: ['id', 'year_name'] },
        { 
          model: ResultSubject,
          include: [{ model: Subject, attributes: ['id', 'subject_name', 'total_marks', 'passing_marks'] }]
        }
      ],
      order: [['percentage', 'DESC']]
    });

    const plainResults = results.map(r => r.toJSON());
    const rankedResults = attachDynamicPositions(plainResults);

    return res.json(rankedResults);
  } catch (error) {
    console.error('Fetch results error:', error);
    return res.status(500).json({ error: 'Failed to retrieve result records.' });
  }
});

// 2. GET class results overview analytics (For Admin Overview & Teacher Overview)
// GET /api/results/overview?classId=X&examType=Z&academicYearId=Y
router.get('/overview', isAuthenticated, async (req, res) => {
  try {
    const { classId, examType, academicYearId } = req.query;
    if (!classId || !examType || !academicYearId) {
      return res.status(400).json({ error: 'Class, Exam Type, and Academic Year are required.' });
    }

    // Teacher check
    if (req.session.role === 'teacher') {
      const isAssigned = await verifyTeacherClassAssignment(req.session.teacherId, classId, academicYearId);
      if (!isAssigned) {
        return res.status(403).json({ error: 'Access denied. You are not assigned to this class.' });
      }
    }

    const totalEnrolled = await StudentEnrollment.count({
      where: { class_id: classId, academic_year_id: academicYearId }
    });

    const results = await Result.findAll({
      where: { class_id: classId, exam_type: examType, academic_year_id: academicYearId, is_archived: false },
      include: [{ model: Student, attributes: ['id', 'name', 'roll_number'] }]
    });

    let completedCount = 0;
    let inProgressCount = 0;
    let publishedCount = 0;
    let lockedCount = 0;
    let passedCount = 0;
    let failedCount = 0;
    let totalPercentage = 0;
    let highestPercentage = 0;
    let lowestPercentage = 100;

    const gradeDistribution = { 'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'E': 0, 'F': 0 };

    results.forEach(r => {
      const pct = Number(r.percentage);
      totalPercentage += pct;

      if (r.status === 'Completed') completedCount++;
      else inProgressCount++;

      if (r.is_published) publishedCount++;
      if (r.is_locked) lockedCount++;

      if (r.overall_status === 'Pass') passedCount++;
      else failedCount++;

      if (pct > highestPercentage) highestPercentage = pct;
      if (pct < lowestPercentage) lowestPercentage = pct;

      if (gradeDistribution[r.grade] !== undefined) {
        gradeDistribution[r.grade]++;
      }
    });

    const evaluatedCount = results.length;
    const classAverage = evaluatedCount > 0 ? (totalPercentage / evaluatedCount).toFixed(2) : '0.00';
    if (evaluatedCount === 0) lowestPercentage = 0;

    return res.json({
      classId,
      examType,
      academicYearId,
      totalEnrolled,
      evaluatedCount,
      completedCount,
      inProgressCount,
      pendingEvaluationCount: Math.max(0, totalEnrolled - evaluatedCount),
      publishedCount,
      lockedCount,
      passedCount,
      failedCount,
      passRate: evaluatedCount > 0 ? Math.round((passedCount / evaluatedCount) * 100) : 0,
      failRate: evaluatedCount > 0 ? Math.round((failedCount / evaluatedCount) * 100) : 0,
      classAverage: Number(classAverage),
      highestPercentage: Number(highestPercentage),
      lowestPercentage: Number(lowestPercentage),
      gradeDistribution
    });
  } catch (error) {
    console.error('Result overview error:', error);
    return res.status(500).json({ error: 'Failed to retrieve result overview.' });
  }
});

// 3. GET student result history across terms/sessions
// GET /api/results/student-history?studentId=X&academicYearId=Y
router.get('/student-history', isAuthenticated, async (req, res) => {
  try {
    const { studentId, academicYearId } = req.query;
    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required.' });
    }

    const student = await Student.findByPk(studentId, {
      attributes: ['id', 'name', 'father_name', 'roll_number', 'registration_number', 'photo']
    });
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const whereClause = { student_id: studentId, is_archived: false };
    if (academicYearId) whereClause.academic_year_id = academicYearId;

    const results = await Result.findAll({
      where: whereClause,
      include: [
        { model: Class, attributes: ['id', 'class_name', 'section'] },
        { model: AcademicYear, attributes: ['id', 'year_name'] },
        {
          model: ResultSubject,
          include: [{ model: Subject, attributes: ['id', 'subject_name', 'total_marks', 'passing_marks'] }]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    const history = results.map(r => {
      const plain = r.toJSON();
      const subjectsDetail = (plain.ResultSubjects || []).map(rs => ({
        subjectId: rs.subject_id,
        subjectName: rs.Subject ? rs.Subject.subject_name : 'Subject',
        totalMarks: rs.Subject ? rs.Subject.total_marks : 100,
        passingMarks: rs.Subject ? rs.Subject.passing_marks : 33,
        obtainedMarks: rs.marks,
        isPass: Number(rs.marks) >= Number(rs.Subject ? rs.Subject.passing_marks : 33)
      }));

      return {
        id: plain.id,
        examType: plain.exam_type,
        academicYear: plain.AcademicYear ? plain.AcademicYear.year_name : '-',
        className: plain.Class ? `${plain.Class.class_name} - Sec ${plain.Class.section}` : '-',
        totalMarks: plain.total_marks,
        obtainedMarks: plain.obtained_marks,
        percentage: plain.percentage,
        grade: plain.grade,
        overallStatus: plain.overall_status,
        status: plain.status,
        isPublished: plain.is_published,
        isLocked: plain.is_locked,
        remarks: plain.remarks,
        createdAt: plain.created_at,
        subjects: subjectsDetail
      };
    });

    return res.json({ student, history });
  } catch (error) {
    console.error('Student result history error:', error);
    return res.status(500).json({ error: 'Failed to retrieve student result history.' });
  }
});

// 4. GET subject performance analytics for a class & exam
// GET /api/results/subject-performance?classId=X&examType=Z&subjectId=S&academicYearId=Y
router.get('/subject-performance', isAuthenticated, async (req, res) => {
  try {
    const { classId, examType, subjectId, academicYearId } = req.query;
    if (!classId || !examType || !subjectId || !academicYearId) {
      return res.status(400).json({ error: 'Class, Exam Type, Subject, and Academic Year are required.' });
    }

    const subject = await Subject.findByPk(subjectId);
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found.' });
    }

    const results = await Result.findAll({
      where: { class_id: classId, exam_type: examType, academic_year_id: academicYearId, is_archived: false },
      include: [
        { model: Student, attributes: ['id', 'name', 'roll_number', 'father_name'] },
        { 
          model: ResultSubject,
          where: { subject_id: subjectId }
        }
      ]
    });

    let totalMarksObtained = 0;
    let highestMarks = 0;
    let lowestMarks = subject.total_marks;
    let passingCount = 0;
    let failingCount = 0;
    const failedStudentsList = [];

    results.forEach(r => {
      const rs = r.ResultSubjects && r.ResultSubjects[0];
      if (rs) {
        const marks = Number(rs.marks);
        totalMarksObtained += marks;
        if (marks > highestMarks) highestMarks = marks;
        if (marks < lowestMarks) lowestMarks = marks;

        if (marks >= subject.passing_marks) {
          passingCount++;
        } else {
          failingCount++;
          if (r.Student) {
            failedStudentsList.push({
              id: r.Student.id,
              name: r.Student.name,
              roll_number: r.Student.roll_number,
              father_name: r.Student.father_name,
              obtainedMarks: marks,
              passingMarks: subject.passing_marks,
              totalMarks: subject.total_marks
            });
          }
        }
      }
    });

    const evaluatedCount = results.length;
    if (evaluatedCount === 0) lowestMarks = 0;
    const averageMarks = evaluatedCount > 0 ? (totalMarksObtained / evaluatedCount).toFixed(1) : '0.0';
    const passPercentage = evaluatedCount > 0 ? Math.round((passingCount / evaluatedCount) * 100) : 0;

    return res.json({
      subject: {
        id: subject.id,
        name: subject.subject_name,
        totalMarks: subject.total_marks,
        passingMarks: subject.passing_marks
      },
      evaluatedCount,
      averageMarks: Number(averageMarks),
      highestMarks,
      lowestMarks,
      passingCount,
      failingCount,
      passPercentage,
      failedStudents: failedStudentsList
    });
  } catch (error) {
    console.error('Subject performance error:', error);
    return res.status(500).json({ error: 'Failed to retrieve subject performance analytics.' });
  }
});

// 5. GET export results as CSV or Excel format
// GET /api/results/export?classId=X&examType=Z&academicYearId=Y&format=csv
router.get('/export', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { classId, examType, academicYearId, format = 'csv' } = req.query;
    if (!classId || !examType || !academicYearId) {
      return res.status(400).json({ error: 'Class, Exam Type, and Academic Year are required.' });
    }

    const cls = await Class.findByPk(classId);
    const session = await AcademicYear.findByPk(academicYearId);

    const results = await Result.findAll({
      where: { class_id: classId, exam_type: examType, academic_year_id: academicYearId, is_archived: false },
      include: [
        { model: Student, attributes: ['name', 'father_name', 'roll_number', 'registration_number'] },
        { model: Class, attributes: ['class_name', 'section'] },
        { model: AcademicYear, attributes: ['year_name'] }
      ],
      order: [['percentage', 'DESC']]
    });

    const plainResults = results.map(r => r.toJSON());
    const rankedResults = attachDynamicPositions(plainResults);

    const className = cls ? `${cls.class_name}_Sec_${cls.section}` : `Class_${classId}`;
    const filename = `Result_Sheet_${className}_${examType.replace(/\s+/g, '_')}_${Date.now()}`;

    if (format === 'xls') {
      let html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Result Sheet</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
        <body>
          <h2>Waseem Science & Commerce Academy</h2>
          <h3>Result Sheet: ${cls ? cls.class_name : ''} - ${examType} (${session ? session.year_name : ''})</h3>
          <table border="1">
            <tr style="background-color:#1e3c72; color:#ffffff;">
              <th>Position</th>
              <th>Roll No</th>
              <th>Student Name</th>
              <th>Father Name</th>
              <th>Total Marks</th>
              <th>Obtained Marks</th>
              <th>Percentage</th>
              <th>Grade</th>
              <th>Overall Status</th>
              <th>Workflow Status</th>
              <th>Published</th>
              <th>Locked</th>
            </tr>
      `;

      rankedResults.forEach(r => {
        html += `
          <tr>
            <td>${r.position}</td>
            <td>${r.Student ? r.Student.roll_number : '-'}</td>
            <td>${r.Student ? r.Student.name : '-'}</td>
            <td>${r.Student ? r.Student.father_name : '-'}</td>
            <td>${r.total_marks}</td>
            <td>${r.obtained_marks}</td>
            <td>${r.percentage}%</td>
            <td>${r.grade}</td>
            <td>${r.overall_status}</td>
            <td>${r.status}</td>
            <td>${r.is_published ? 'Yes' : 'No'}</td>
            <td>${r.is_locked ? 'Yes' : 'No'}</td>
          </tr>
        `;
      });

      html += `</table></body></html>`;

      res.setHeader('Content-Type', 'application/vnd.ms-excel');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xls"`);
      return res.send(html);
    } else {
      // CSV with UTF-8 BOM
      let csv = '\uFEFF';
      csv += 'Position,Roll No,Student Name,Father Name,Class,Session,Exam Type,Total Marks,Obtained Marks,Percentage,Grade,Overall Status,Workflow Status,Published,Locked\n';

      rankedResults.forEach(r => {
        const roll = r.Student ? `"${r.Student.roll_number}"` : '""';
        const name = r.Student ? `"${r.Student.name.replace(/"/g, '""')}"` : '""';
        const father = r.Student ? `"${r.Student.father_name.replace(/"/g, '""')}"` : '""';
        const cName = cls ? `"${cls.class_name} - Sec ${cls.section}"` : '""';
        const sName = session ? `"${session.year_name}"` : '""';
        const ex = `"${r.exam_type}"`;
        const tot = r.total_marks;
        const obt = r.obtained_marks;
        const pct = r.percentage;
        const grd = r.grade;
        const pos = r.position;
        const oStatus = r.overall_status;
        const wfStatus = r.status;
        const pub = r.is_published ? 'Yes' : 'No';
        const lck = r.is_locked ? 'Yes' : 'No';

        csv += `${pos},${roll},${name},${father},${cName},${sName},${ex},${tot},${obt},${pct},${grd},${pos ? oStatus : ''},${wfStatus},${pub},${lck}\n`;
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.send(csv);
    }
  } catch (error) {
    console.error('Export results error:', error);
    return res.status(500).json({ error: 'Failed to export result sheet.' });
  }
});

// 6. PUT publish results (Admin only)
// POST /api/results/publish
router.post('/publish', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { classId, examType, academicYearId, resultIds } = req.body;
    const filter = { is_archived: false };

    if (resultIds && Array.isArray(resultIds) && resultIds.length > 0) {
      filter.id = resultIds;
    } else if (classId && examType && academicYearId) {
      filter.class_id = classId;
      filter.exam_type = examType;
      filter.academic_year_id = academicYearId;
    } else {
      return res.status(400).json({ error: 'Please specify Class, Exam, and Session, or provide resultIds.' });
    }

    const [updatedCount] = await Result.update({
      is_published: true,
      published_at: new Date(),
      published_by: req.session.userId
    }, { where: filter });

    return res.json({ message: `Successfully published ${updatedCount} result card(s).`, updatedCount });
  } catch (error) {
    console.error('Publish results error:', error);
    return res.status(500).json({ error: 'Failed to publish results.' });
  }
});

// 7. PUT unpublish results (Admin only)
// POST /api/results/unpublish
router.post('/unpublish', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { classId, examType, academicYearId, resultIds } = req.body;
    const filter = { is_archived: false };

    if (resultIds && Array.isArray(resultIds) && resultIds.length > 0) {
      filter.id = resultIds;
    } else if (classId && examType && academicYearId) {
      filter.class_id = classId;
      filter.exam_type = examType;
      filter.academic_year_id = academicYearId;
    } else {
      return res.status(400).json({ error: 'Please specify Class, Exam, and Session, or provide resultIds.' });
    }

    const [updatedCount] = await Result.update({
      is_published: false
    }, { where: filter });

    return res.json({ message: `Successfully unpublished ${updatedCount} result card(s).`, updatedCount });
  } catch (error) {
    console.error('Unpublish results error:', error);
    return res.status(500).json({ error: 'Failed to unpublish results.' });
  }
});

// 8. PUT lock results (Admin only)
// POST /api/results/lock
router.post('/lock', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { classId, examType, academicYearId, resultIds } = req.body;
    const filter = { is_archived: false };

    if (resultIds && Array.isArray(resultIds) && resultIds.length > 0) {
      filter.id = resultIds;
    } else if (classId && examType && academicYearId) {
      filter.class_id = classId;
      filter.exam_type = examType;
      filter.academic_year_id = academicYearId;
    } else {
      return res.status(400).json({ error: 'Please specify Class, Exam, and Session, or provide resultIds.' });
    }

    const [updatedCount] = await Result.update({
      is_locked: true,
      locked_at: new Date(),
      locked_by: req.session.userId
    }, { where: filter });

    return res.json({ message: `Successfully locked ${updatedCount} result card(s). Marks editing is now disabled.`, updatedCount });
  } catch (error) {
    console.error('Lock results error:', error);
    return res.status(500).json({ error: 'Failed to lock results.' });
  }
});

// 9. PUT unlock results (Admin only)
// POST /api/results/unlock
router.post('/unlock', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { classId, examType, academicYearId, resultIds } = req.body;
    const filter = { is_archived: false };

    if (resultIds && Array.isArray(resultIds) && resultIds.length > 0) {
      filter.id = resultIds;
    } else if (classId && examType && academicYearId) {
      filter.class_id = classId;
      filter.exam_type = examType;
      filter.academic_year_id = academicYearId;
    } else {
      return res.status(400).json({ error: 'Please specify Class, Exam, and Session, or provide resultIds.' });
    }

    const [updatedCount] = await Result.update({
      is_locked: false
    }, { where: filter });

    return res.json({ message: `Successfully unlocked ${updatedCount} result card(s). Editing is re-enabled.`, updatedCount });
  } catch (error) {
    console.error('Unlock results error:', error);
    return res.status(500).json({ error: 'Failed to unlock results.' });
  }
});

// 10. GET single student's complete result card details (with dynamic rank)
// GET /api/results/:id
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const result = await Result.findOne({
      where: { id: req.params.id, is_archived: false },
      include: [
        { model: Student },
        { model: Class },
        { model: AcademicYear },
        { 
          model: ResultSubject,
          include: [{ model: Subject, attributes: ['id', 'subject_name', 'total_marks', 'passing_marks'] }]
        }
      ]
    });

    if (!result) {
      return res.status(404).json({ error: 'Result card not found.' });
    }

    // Dynamic rank calculation in its class & exam
    const classResults = await Result.findAll({
      where: { 
        class_id: result.class_id, 
        exam_type: result.exam_type, 
        academic_year_id: result.academic_year_id,
        is_archived: false 
      },
      attributes: ['id', 'percentage'],
      order: [['percentage', 'DESC']]
    });

    const ranked = attachDynamicPositions(classResults.map(r => r.toJSON()));
    const myRankItem = ranked.find(r => r.id === result.id);
    const position = myRankItem ? myRankItem.position : 1;

    const data = result.toJSON();
    data.position = position;

    // Attach subject pass/fail flags
    if (data.ResultSubjects) {
      data.ResultSubjects.forEach(rs => {
        const passMarks = rs.Subject ? rs.Subject.passing_marks : 33;
        rs.is_pass = Number(rs.marks) >= Number(passMarks);
      });
    }

    return res.json(data);
  } catch (error) {
    console.error('Fetch result card error:', error);
    return res.status(500).json({ error: 'Failed to retrieve result details.' });
  }
});

// 11. POST submit / update result marks (With Transaction, Lock Check, Validation, Option 1 Pass/Fail)
// POST /api/results/submit
router.post('/submit', isAuthenticated, async (req, res) => {
  try {
    const { studentId, classId, academicYearId, examType, remarks, marks } = req.body;
    
    if (!studentId || !classId || !academicYearId || !examType || !marks || !Array.isArray(marks)) {
      return res.status(400).json({ error: 'Missing student, class, session, exam type, or marks details.' });
    }

    // 1. Teacher permission check
    if (req.session.role === 'teacher') {
      const isAssigned = await verifyTeacherClassAssignment(req.session.teacherId, classId, academicYearId);
      if (!isAssigned) {
        return res.status(403).json({ error: 'Access denied. You are not assigned to this class for the active session.' });
      }
    }

    // 2. Fetch class subjects to validate total marks and count total subjects
    const classSubjects = await Subject.findAll({ where: { class_id: classId } });
    if (classSubjects.length === 0) {
      return res.status(400).json({ error: 'No subjects configured for this class yet.' });
    }

    const subjectMap = {};
    classSubjects.forEach(sub => {
      subjectMap[sub.id] = sub;
    });

    // Validate marks payload
    for (const score of marks) {
      const subject = subjectMap[score.subjectId];
      if (!subject) {
        return res.status(400).json({ error: `Subject ID ${score.subjectId} is not valid for this class.` });
      }
      
      const obtained = Number(score.obtainedMarks);
      if (isNaN(obtained) || obtained < 0 || obtained > subject.total_marks) {
        return res.status(400).json({ 
          error: `Marks for ${subject.subject_name} must be between 0 and ${subject.total_marks}.` 
        });
      }
    }

    // 3. Managed Transaction for atomic save
    const savedResult = await sequelize.transaction(async (t) => {
      // Find or Create Result header
      let [resultRecord, created] = await Result.findOrCreate({
        where: { student_id: studentId, exam_type: examType, academic_year_id: academicYearId },
        defaults: {
          class_id: classId,
          percentage: 0.00,
          grade: 'F',
          remarks: remarks || '',
          status: 'In Progress'
        },
        transaction: t
      });

      // Check if locked
      if (!created && resultRecord.is_locked) {
        throw new Error('LOCKED_ERROR: This result has been locked by Admin and cannot be modified.');
      }

      // Upsert subject marks
      for (const score of marks) {
        const [rs, rsCreated] = await ResultSubject.findOrCreate({
          where: { result_id: resultRecord.id, subject_id: score.subjectId },
          defaults: { marks: score.obtainedMarks },
          transaction: t
        });
        if (!rsCreated) {
          rs.marks = score.obtainedMarks;
          await rs.save({ transaction: t });
        }
      }

      // Fetch all entered subject marks for this result to compute total, percentage, grade, overall pass/fail
      const allResultSubjects = await ResultSubject.findAll({
        where: { result_id: resultRecord.id },
        include: [{ model: Subject, attributes: ['id', 'total_marks', 'passing_marks'] }],
        transaction: t
      });

      let totalMaxMarks = 0;
      let totalObtainedMarks = 0;
      let hasAnySubjectFailed = false;

      allResultSubjects.forEach(rs => {
        const sub = rs.Subject;
        if (sub) {
          const max = Number(sub.total_marks || 100);
          const pass = Number(sub.passing_marks || 33);
          const obt = Number(rs.marks || 0);

          totalMaxMarks += max;
          totalObtainedMarks += obt;

          if (obt < pass) {
            hasAnySubjectFailed = true;
          }
        }
      });

      const percentage = totalMaxMarks > 0 ? Number(((totalObtainedMarks / totalMaxMarks) * 100).toFixed(2)) : 0.00;
      const grade = calculateGrade(percentage);

      // Option 1 Overall Pass/Fail Rule:
      // Pass if: All subjects are passed (hasAnySubjectFailed === false) AND percentage >= 33.
      // If even 1 subject is failed OR percentage < 33, Overall Status is Fail.
      const overallStatus = (!hasAnySubjectFailed && percentage >= 33) ? 'Pass' : 'Fail';

      // Status Lifecycle:
      // If entered subjects count >= class configured subjects count -> Completed, else In Progress
      const status = allResultSubjects.length >= classSubjects.length ? 'Completed' : 'In Progress';

      resultRecord.class_id = classId;
      resultRecord.total_marks = totalMaxMarks;
      resultRecord.obtained_marks = totalObtainedMarks;
      resultRecord.percentage = percentage;
      resultRecord.grade = grade;
      resultRecord.overall_status = overallStatus;
      resultRecord.status = status;
      if (remarks !== undefined) resultRecord.remarks = remarks;

      await resultRecord.save({ transaction: t });
      return resultRecord;
    });

    return res.status(201).json({ 
      message: 'Result marks saved and computed successfully.', 
      result: savedResult 
    });
  } catch (error) {
    if (error.message && error.message.startsWith('LOCKED_ERROR:')) {
      return res.status(403).json({ error: error.message.replace('LOCKED_ERROR: ', '') });
    }
    console.error('Submit result error:', error);
    return res.status(500).json({ error: 'Failed to record student results: ' + error.message });
  }
});

// 12. Soft Archive / Void result (Admin only)
// DELETE /api/results/:id
router.delete('/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const result = await Result.findByPk(req.params.id);
    if (!result) {
      return res.status(404).json({ error: 'Result card not found.' });
    }

    if (result.is_locked) {
      return res.status(403).json({ error: 'Cannot archive a locked result. Please unlock it first.' });
    }

    result.is_archived = true;
    result.archived_at = new Date();
    result.archived_by = req.session.userId;
    await result.save();

    return res.json({ message: 'Result card archived successfully.' });
  } catch (error) {
    console.error('Archive result error:', error);
    return res.status(500).json({ error: 'Failed to archive result record.' });
  }
});

module.exports = router;

