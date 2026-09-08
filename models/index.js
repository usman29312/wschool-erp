const { sequelize } = require('../config/database');
const User = require('./User');
const AcademicYear = require('./AcademicYear');
const Class = require('./Class');
const Student = require('./Student');
const StudentEnrollment = require('./StudentEnrollment');
const Teacher = require('./Teacher');
const TeacherAttendance = require('./TeacherAttendance');
const Subject = require('./Subject');
const TeacherAssignment = require('./TeacherAssignment');
const Attendance = require('./Attendance');
const FeeStructure = require('./FeeStructure');
const Fee = require('./Fee');
const Result = require('./Result');
const ResultSubject = require('./ResultSubject');
const TeacherSalaryPayment = require('./TeacherSalaryPayment');
const Notice = require('./Notice');
const FeePayment = require('./FeePayment');


// 1. User & Teacher Relationship
User.hasOne(Teacher, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Teacher.belongsTo(User, { foreignKey: 'user_id', onDelete: 'CASCADE' });

// 2. Student Enrollments Relationships
Student.hasMany(StudentEnrollment, { foreignKey: 'student_id', onDelete: 'CASCADE' });
StudentEnrollment.belongsTo(Student, { foreignKey: 'student_id', onDelete: 'CASCADE' });

Class.hasMany(StudentEnrollment, { foreignKey: 'class_id', onDelete: 'CASCADE' });
StudentEnrollment.belongsTo(Class, { foreignKey: 'class_id', onDelete: 'CASCADE' });

AcademicYear.hasMany(StudentEnrollment, { foreignKey: 'academic_year_id', onDelete: 'CASCADE' });
StudentEnrollment.belongsTo(AcademicYear, { foreignKey: 'academic_year_id', onDelete: 'CASCADE' });

// Promotion Lineage & Auditing
StudentEnrollment.belongsTo(StudentEnrollment, { as: 'PromotedFrom', foreignKey: 'promoted_from_enrollment_id', onDelete: 'SET NULL' });
StudentEnrollment.belongsTo(User, { as: 'Promoter', foreignKey: 'promoted_by', onDelete: 'SET NULL' });

// 3. Subjects Relationships
Class.hasMany(Subject, { foreignKey: 'class_id', onDelete: 'CASCADE' });
Subject.belongsTo(Class, { foreignKey: 'class_id', onDelete: 'CASCADE' });

// 4. Teacher Assignments Relationships
Teacher.hasMany(TeacherAssignment, { foreignKey: 'teacher_id', onDelete: 'CASCADE' });
TeacherAssignment.belongsTo(Teacher, { foreignKey: 'teacher_id', onDelete: 'CASCADE' });

Class.hasMany(TeacherAssignment, { foreignKey: 'class_id', onDelete: 'CASCADE' });
TeacherAssignment.belongsTo(Class, { foreignKey: 'class_id', onDelete: 'CASCADE' });

Teacher.hasMany(Subject, { foreignKey: 'teacher_id', onDelete: 'SET NULL' });
Subject.belongsTo(Teacher, { foreignKey: 'teacher_id', onDelete: 'SET NULL' });

AcademicYear.hasMany(TeacherAssignment, { foreignKey: 'academic_year_id', onDelete: 'CASCADE' });
TeacherAssignment.belongsTo(AcademicYear, { foreignKey: 'academic_year_id', onDelete: 'CASCADE' });

// 5. Student Attendance Relationships
Student.hasMany(Attendance, { foreignKey: 'student_id', onDelete: 'CASCADE' });
Attendance.belongsTo(Student, { foreignKey: 'student_id', onDelete: 'CASCADE' });

Class.hasMany(Attendance, { foreignKey: 'class_id', onDelete: 'CASCADE' });
Attendance.belongsTo(Class, { foreignKey: 'class_id', onDelete: 'CASCADE' });

Teacher.hasMany(Attendance, { foreignKey: 'teacher_id', onDelete: 'SET NULL' });
Attendance.belongsTo(Teacher, { foreignKey: 'teacher_id', onDelete: 'SET NULL' });

AcademicYear.hasMany(Attendance, { foreignKey: 'academic_year_id', onDelete: 'CASCADE' });
Attendance.belongsTo(AcademicYear, { foreignKey: 'academic_year_id', onDelete: 'CASCADE' });

// 6. Teacher Attendance Relationships
Teacher.hasMany(TeacherAttendance, { foreignKey: 'teacher_id', onDelete: 'CASCADE' });
TeacherAttendance.belongsTo(Teacher, { foreignKey: 'teacher_id', onDelete: 'CASCADE' });

AcademicYear.hasMany(TeacherAttendance, { foreignKey: 'academic_year_id', onDelete: 'CASCADE' });
TeacherAttendance.belongsTo(AcademicYear, { foreignKey: 'academic_year_id', onDelete: 'CASCADE' });

// 7. Fee Structure Relationships
Class.hasMany(FeeStructure, { foreignKey: 'class_id', onDelete: 'CASCADE' });
FeeStructure.belongsTo(Class, { foreignKey: 'class_id', onDelete: 'CASCADE' });

AcademicYear.hasMany(FeeStructure, { foreignKey: 'academic_year_id', onDelete: 'CASCADE' });
FeeStructure.belongsTo(AcademicYear, { foreignKey: 'academic_year_id', onDelete: 'CASCADE' });

// 8. Fee Vouchers/Payments Relationships
Student.hasMany(Fee, { foreignKey: 'student_id', onDelete: 'CASCADE' });
Fee.belongsTo(Student, { foreignKey: 'student_id', onDelete: 'CASCADE' });

Class.hasMany(Fee, { foreignKey: 'class_id', onDelete: 'CASCADE' });
Fee.belongsTo(Class, { foreignKey: 'class_id', onDelete: 'CASCADE' });

AcademicYear.hasMany(Fee, { foreignKey: 'academic_year_id', onDelete: 'CASCADE' });
Fee.belongsTo(AcademicYear, { foreignKey: 'academic_year_id', onDelete: 'CASCADE' });

// Fee -> FeePayment Relationships
Fee.hasMany(FeePayment, { foreignKey: 'fee_id', onDelete: 'CASCADE' });
FeePayment.belongsTo(Fee, { foreignKey: 'fee_id', onDelete: 'CASCADE' });


// 9. Results Header Relationships
Student.hasMany(Result, { foreignKey: 'student_id', onDelete: 'CASCADE' });
Result.belongsTo(Student, { foreignKey: 'student_id', onDelete: 'CASCADE' });

Class.hasMany(Result, { foreignKey: 'class_id', onDelete: 'CASCADE' });
Result.belongsTo(Class, { foreignKey: 'class_id', onDelete: 'CASCADE' });

AcademicYear.hasMany(Result, { foreignKey: 'academic_year_id', onDelete: 'CASCADE' });
Result.belongsTo(AcademicYear, { foreignKey: 'academic_year_id', onDelete: 'CASCADE' });

// 10. Result Subjects Relationships
Result.hasMany(ResultSubject, { foreignKey: 'result_id', onDelete: 'CASCADE' });
ResultSubject.belongsTo(Result, { foreignKey: 'result_id', onDelete: 'CASCADE' });

Subject.hasMany(ResultSubject, { foreignKey: 'subject_id', onDelete: 'CASCADE' });
ResultSubject.belongsTo(Subject, { foreignKey: 'subject_id', onDelete: 'CASCADE' });

const TeacherSalaryRecord = require('./TeacherSalaryRecord');

// 11. Teacher Salary Records & Payments Relationships
Teacher.hasMany(TeacherSalaryRecord, { foreignKey: 'teacher_id', onDelete: 'CASCADE' });
TeacherSalaryRecord.belongsTo(Teacher, { foreignKey: 'teacher_id', onDelete: 'CASCADE' });

AcademicYear.hasMany(TeacherSalaryRecord, { foreignKey: 'academic_year_id', onDelete: 'CASCADE' });
TeacherSalaryRecord.belongsTo(AcademicYear, { foreignKey: 'academic_year_id', onDelete: 'CASCADE' });

TeacherSalaryRecord.hasMany(TeacherSalaryPayment, { foreignKey: 'salary_record_id', onDelete: 'CASCADE' });
TeacherSalaryPayment.belongsTo(TeacherSalaryRecord, { foreignKey: 'salary_record_id', onDelete: 'CASCADE' });

Teacher.hasMany(TeacherSalaryPayment, { foreignKey: 'teacher_id', onDelete: 'CASCADE' });
TeacherSalaryPayment.belongsTo(Teacher, { foreignKey: 'teacher_id', onDelete: 'CASCADE' });

const PasswordReset = require('./PasswordReset');

module.exports = {
  sequelize,
  User,
  AcademicYear,
  Class,
  Student,
  StudentEnrollment,
  Teacher,
  TeacherAttendance,
  Subject,
  TeacherAssignment,
  Attendance,
  FeeStructure,
  Fee,
  Result,
  ResultSubject,
  TeacherSalaryRecord,
  TeacherSalaryPayment,
  Notice,
  FeePayment,
  PasswordReset
};
