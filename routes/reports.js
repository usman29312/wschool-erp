const express = require('express');
const router = express.Router();
const { Student, Teacher, Class, AcademicYear, Fee, TeacherSalaryRecord, TeacherSalaryPayment, StudentEnrollment, sequelize } = require('../models');
const { isAuthenticated, isAdmin } = require('./middleware');
const { Op } = require('sequelize');

// Helper to calculate calendar year from academic year name (e.g. "2026-2027" or "2026") and month name
function getCalendarYear(academicYearName, monthName) {
  const parts = academicYearName.split('-');
  if (parts.length === 2) {
    const firstYear = parseInt(parts[0]);
    const secondYear = parseInt(parts[1]);
    const firstHalfMonths = ['July', 'August', 'September', 'October', 'November', 'December'];
    if (firstHalfMonths.includes(monthName)) {
      return firstYear;
    } else {
      return secondYear;
    }
  }
  return parseInt(academicYearName) || new Date().getFullYear();
}

// Helper to get date range for a calendar year and month
function getMonthDateRange(year, monthName) {
  const monthMap = {
    'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6,
    'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12
  };
  const monthNum = monthMap[monthName] || (new Date().getMonth() + 1);
  const monthStr = String(monthNum).padStart(2, '0');
  
  const lastDay = new Date(year, monthNum, 0).getDate();
  const lastDayStr = String(lastDay).padStart(2, '0');

  const startStr = `${year}-${monthStr}-01`;
  const endStr = `${year}-${monthStr}-${lastDayStr}`;
  return { startStr, endStr };
}

// GET overall admin dashboard summary stats
router.get('/dashboard-stats', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { month, academicYearId, mode } = req.query;

    let session = null;
    if (academicYearId) {
      session = await AcademicYear.findByPk(academicYearId);
    } else {
      session = await AcademicYear.findOne({ where: { status: 'active' } });
    }

    if (!session) {
      return res.json({
        totalStudents: 0,
        totalTeachers: 0,
        totalClasses: 0,
        activeSession: 'None',
        expectedFees: '0.00',
        collectedFees: '0.00',
        pendingFees: '0.00',
        teacherSalaries: '0.00',
        otherExpenses: '0.00',
        netRevenue: '0.00',
        salaryPayable: '0.00',
        payrollSummary: {
          totalSalaryDue: '0.00',
          totalSalaryPaid: '0.00',
          totalSalaryRemaining: '0.00',
          paidTeachersCount: 0,
          partialTeachersCount: 0,
          pendingTeachersCount: 0
        }
      });
    }

    // 1. Counts
    const totalStudents = await Student.count({
      include: [{
        association: 'StudentEnrollments',
        where: { academic_year_id: session.id }
      }]
    });
    const totalTeachers = await Teacher.count();
    const totalClasses = await Class.count();

    // 2. Financial Calculations
    let expectedFees = 0;
    let collectedFees = 0;
    let pendingFees = 0;
    let teacherSalaries = 0;
    let otherExpenses = 0.00;

    const isOverallMode = mode === 'overall';

    // Filter fees
    const feeFilter = { academic_year_id: session.id };
    if (month && !isOverallMode) {
      feeFilter.month = month;
    }

    const feeTotals = await Fee.findOne({
      where: feeFilter,
      attributes: [
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalExpected'],
        [sequelize.fn('SUM', sequelize.col('paid_amount')), 'totalPaid'],
        [sequelize.fn('SUM', sequelize.col('remaining_amount')), 'totalPending']
      ],
      raw: true
    });

    if (feeTotals) {
      expectedFees = Number(feeTotals.totalExpected || 0);
      collectedFees = Number(feeTotals.totalPaid || 0);
      pendingFees = Number(feeTotals.totalPending || 0);
    }

    // Filter teacher salaries (actual money paid out)
    if (month && !isOverallMode) {
      const calendarYear = getCalendarYear(session.year_name, month);
      const { startStr, endStr } = getMonthDateRange(calendarYear, month);
      const salaryTotals = await TeacherSalaryPayment.findOne({
        where: {
          payment_date: {
            [Op.between]: [startStr, endStr]
          }
        },
        attributes: [
          [sequelize.fn('SUM', sequelize.col('amount')), 'totalPaid']
        ],
        raw: true
      });
      if (salaryTotals) {
        teacherSalaries = Number(salaryTotals.totalPaid || 0);
      }
    } else {
      const salaryTotals = await TeacherSalaryPayment.findOne({
        attributes: [
          [sequelize.fn('SUM', sequelize.col('amount')), 'totalPaid']
        ],
        raw: true
      });
      if (salaryTotals) {
        teacherSalaries = Number(salaryTotals.totalPaid || 0);
      }
    }

    const netRevenue = collectedFees - teacherSalaries - otherExpenses;

    // 3. Teacher Payroll Summary (Monthly records)
    const recordFilter = { academic_year_id: session.id };
    if (month && !isOverallMode) {
      recordFilter.month = month;
    }

    const records = await TeacherSalaryRecord.findAll({
      where: recordFilter
    });

    let totalSalaryDue = 0;
    let totalSalaryPaid = 0;
    let totalSalaryRemaining = 0;
    let paidTeachersCount = 0;
    let partialTeachersCount = 0;
    let pendingTeachersCount = 0;

    records.forEach(r => {
      totalSalaryDue += Number(r.basic_salary);
      totalSalaryPaid += Number(r.paid_amount);
      totalSalaryRemaining += Number(r.remaining_amount);

      if (r.status === 'Paid') paidTeachersCount++;
      else if (r.status === 'Partial') partialTeachersCount++;
      else pendingTeachersCount++;
    });

    return res.json({
      totalStudents,
      totalTeachers,
      totalClasses,
      activeSession: session.year_name,
      activeSessionId: session.id,
      expectedFees: expectedFees.toFixed(2),
      collectedFees: collectedFees.toFixed(2),
      pendingFees: pendingFees.toFixed(2),
      teacherSalaries: teacherSalaries.toFixed(2),
      otherExpenses: otherExpenses.toFixed(2),
      netRevenue: netRevenue.toFixed(2),
      salaryPayable: totalSalaryRemaining.toFixed(2),
      payrollSummary: {
        totalSalaryDue: totalSalaryDue.toFixed(2),
        totalSalaryPaid: totalSalaryPaid.toFixed(2),
        totalSalaryRemaining: totalSalaryRemaining.toFixed(2),
        paidTeachersCount,
        partialTeachersCount,
        pendingTeachersCount
      }
    });
  } catch (error) {
    console.error('Fetch dashboard stats error:', error);
    return res.status(500).json({ error: 'Failed to retrieve dashboard statistics.' });
  }
});

// GET Class-wise Fee Collection Report
router.get('/class-wise-fees', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { month, academicYearId } = req.query;
    if (!month || !academicYearId) {
      return res.status(400).json({ error: 'Month and Academic Year ID are required.' });
    }

    const classes = await Class.findAll();
    const report = [];

    for (const cls of classes) {
      // 1. Get student count enrolled in this class for the session
      const studentCount = await StudentEnrollment.count({
        where: { class_id: cls.id, academic_year_id: academicYearId }
      });

      // 2. Sum fee records for this class, month, and session
      const feeStats = await Fee.findOne({
        where: { class_id: cls.id, month, academic_year_id: academicYearId },
        attributes: [
          [sequelize.fn('SUM', sequelize.col('amount')), 'expected'],
          [sequelize.fn('SUM', sequelize.col('paid_amount')), 'collected'],
          [sequelize.fn('SUM', sequelize.col('remaining_amount')), 'pending']
        ],
        raw: true
      });

      const expected = feeStats ? Number(feeStats.expected || 0) : 0.00;
      const collected = feeStats ? Number(feeStats.collected || 0) : 0.00;
      const pending = feeStats ? Number(feeStats.pending || 0) : 0.00;
      const collectionRate = expected > 0 ? Math.round((collected / expected) * 100) : 0;

      report.push({
        id: cls.id,
        class_name: cls.class_name,
        section: cls.section,
        studentCount,
        expected,
        collected,
        pending,
        collectionRate
      });
    }

    return res.json(report);
  } catch (error) {
    console.error('Fetch class-wise fees error:', error);
    return res.status(500).json({ error: 'Failed to retrieve class-wise fee summary.' });
  }
});

// GET Monthly Revenue Comparison Chart Data (Income vs Salary Expenses vs Net Revenue)
router.get('/revenue-chart', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { academicYearId } = req.query;
    let session = null;
    if (academicYearId) {
      session = await AcademicYear.findByPk(academicYearId);
    } else {
      session = await AcademicYear.findOne({ where: { status: 'active' } });
    }

    if (!session) {
      return res.json({ months: [], income: [], expenses: [], netRevenue: [] });
    }

    const monthList = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const chartData = {
      months: monthList,
      income: [],
      expenses: [],
      netRevenue: []
    };

    for (const m of monthList) {
      // 1. Fee collection for month m
      const feeSum = await Fee.findOne({
        where: { academic_year_id: session.id, month: m },
        attributes: [[sequelize.fn('SUM', sequelize.col('paid_amount')), 'collected']],
        raw: true
      });
      const collected = Number(feeSum ? feeSum.collected : 0);

      // 2. Salary expense for month m
      const calendarYear = getCalendarYear(session.year_name, m);
      const { startStr, endStr } = getMonthDateRange(calendarYear, m);
      const salSum = await TeacherSalaryPayment.findOne({
        where: {
          payment_date: { [Op.between]: [startStr, endStr] }
        },
        attributes: [[sequelize.fn('SUM', sequelize.col('amount')), 'paidSalaries']],
        raw: true
      });
      const salaryExpense = Number(salSum ? salSum.paidSalaries : 0);

      const net = collected - salaryExpense;

      chartData.income.push(collected);
      chartData.expenses.push(salaryExpense);
      chartData.netRevenue.push(net);
    }

    return res.json(chartData);
  } catch (error) {
    console.error('Fetch revenue chart error:', error);
    return res.status(500).json({ error: 'Failed to retrieve revenue chart data.' });
  }
});

// GET Overall / All-Time Cumulative Financial Stats
router.get('/overall-stats', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const feeTotals = await Fee.findOne({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalExpected'],
        [sequelize.fn('SUM', sequelize.col('paid_amount')), 'totalCollected'],
        [sequelize.fn('SUM', sequelize.col('remaining_amount')), 'totalPending']
      ],
      raw: true
    });

    const salaryTotals = await TeacherSalaryPayment.findOne({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalSalaries']
      ],
      raw: true
    });

    const totalCollected = Number(feeTotals ? feeTotals.totalCollected : 0);
    const totalExpected = Number(feeTotals ? feeTotals.totalExpected : 0);
    const totalPending = Number(feeTotals ? feeTotals.totalPending : 0);
    const totalSalaries = Number(salaryTotals ? salaryTotals.totalSalaries : 0);
    const totalExpenses = totalSalaries; // Plus other expenses if added
    const totalNetRevenue = totalCollected - totalExpenses;

    const totalStudents = await Student.count();
    const totalTeachers = await Teacher.count();
    const totalClasses = await Class.count();

    return res.json({
      totalStudents,
      totalTeachers,
      totalClasses,
      totalExpected: totalExpected.toFixed(2),
      totalCollected: totalCollected.toFixed(2),
      totalPending: totalPending.toFixed(2),
      totalSalaries: totalSalaries.toFixed(2),
      totalExpenses: totalExpenses.toFixed(2),
      totalNetRevenue: totalNetRevenue.toFixed(2)
    });
  } catch (error) {
    console.error('Fetch overall stats error:', error);
    return res.status(500).json({ error: 'Failed to retrieve overall financial stats.' });
  }
});

module.exports = router;
