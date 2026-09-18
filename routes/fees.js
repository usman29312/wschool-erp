const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Fee, FeeStructure, Student, StudentEnrollment, Class, AcademicYear, FeePayment } = require('../models');
const { isAuthenticated, isAdmin } = require('./middleware');
const { sequelize } = require('../config/database');

function hasCustomFee(student) {
  return student && student.custom_fee !== null && student.custom_fee !== undefined;
}

function tuitionForStudent(student, structure) {
  if (hasCustomFee(student)) return Number(student.custom_fee);
  return structure ? Number(structure.monthly_fee) || 0 : 0;
}

function otherChargesOf(structure) {
  return structure ? Number(structure.other_charges) || 0 : 0;
}

function applyAmountToFee(fee, newAmount) {
  fee.amount = Number(Number(newAmount).toFixed(2));
  const paid = Number(fee.paid_amount);
  fee.remaining_amount = Number((fee.amount - paid).toFixed(2));
  if (fee.remaining_amount <= 0) {
    fee.status = 'Paid';
    fee.remaining_amount = 0;
  } else if (paid > 0) {
    fee.status = 'Partial';
  } else {
    fee.status = 'Pending';
  }
}

async function recalculateUnpaidFees({ classId, academicYearId, studentId, newStructure }) {
  const where = {
    academic_year_id: academicYearId,
    status: { [Op.ne]: 'Paid' }
  };
  if (classId) where.class_id = classId;
  if (studentId) where.student_id = studentId;

  const fees = await Fee.findAll({
    where,
    include: [{ model: Student, attributes: ['id', 'custom_fee'] }]
  });

  let updated = 0;
  for (const fee of fees) {
    const nextAmount = tuitionForStudent(fee.Student, newStructure) + otherChargesOf(newStructure);
    const remaining = Number((nextAmount - Number(fee.paid_amount)).toFixed(2));
    if (Number(fee.amount) === Number(nextAmount.toFixed(2)) && Number(fee.remaining_amount) === remaining) {
      continue;
    }

    applyAmountToFee(fee, nextAmount);
    await fee.save();
    updated += 1;
  }

  return updated;
}

// 1. FEE STRUCTURES (Admin only)
// GET structures
router.get('/structures', isAuthenticated, async (req, res) => {
  try {
    const { classId, academicYearId } = req.query;
    const filter = {};
    if (classId) filter.class_id = classId;
    if (academicYearId) filter.academic_year_id = academicYearId;

    const structures = await FeeStructure.findAll({
      where: filter,
      include: [
        { model: Class, attributes: ['class_name', 'section'] },
        { model: AcademicYear, attributes: ['year_name'] }
      ]
    });
    return res.json(structures);
  } catch (error) {
    console.error('Fetch structures error:', error);
    return res.status(500).json({ error: 'Failed to retrieve fee structures.' });
  }
});

// POST create or update structure (Admin only)
router.post('/structures', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { class_id, academic_year_id, monthly_fee, admission_fee, exam_fee, other_charges } = req.body;
    if (!class_id || !academic_year_id) {
      return res.status(400).json({ error: 'Class and Academic Year are required.' });
    }

    const [structure, created] = await FeeStructure.findOrCreate({
      where: { class_id, academic_year_id },
      defaults: {
        monthly_fee: monthly_fee || 0,
        admission_fee: admission_fee || 0,
        exam_fee: exam_fee || 0,
        other_charges: other_charges || 0
      }
    });

    if (!created) {
      structure.monthly_fee = monthly_fee !== undefined ? monthly_fee : structure.monthly_fee;
      structure.admission_fee = admission_fee !== undefined ? admission_fee : structure.admission_fee;
      structure.exam_fee = exam_fee !== undefined ? exam_fee : structure.exam_fee;
      structure.other_charges = other_charges !== undefined ? other_charges : structure.other_charges;
      await structure.save();
    }

    const vouchersUpdated = await recalculateUnpaidFees({
      classId: class_id,
      academicYearId: academic_year_id,
      newStructure: structure
    });

    return res.status(created ? 201 : 200).json({
      message: vouchersUpdated
        ? `Fee structure saved. ${vouchersUpdated} unpaid bill(s) updated. Paid bills were left unchanged.`
        : 'Fee structure configured successfully.',
      structure,
      vouchersUpdated
    });
  } catch (error) {
    console.error('Save fee structure error:', error);
    return res.status(500).json({ error: 'Failed to configure fee structure.' });
  }
});


// 2. FEE RECORDS
// GET student fee records with filters
router.get('/records', isAuthenticated, async (req, res) => {
  try {
    const { classId, academicYearId, month, status, studentId } = req.query;
    const filter = {};
    if (classId) filter.class_id = classId;
    if (academicYearId) filter.academic_year_id = academicYearId;
    if (month) filter.month = month;
    if (status) filter.status = status;
    if (studentId) filter.student_id = studentId;

    // Auto-sync missing fee vouchers for enrolled students in this session & month
    if (academicYearId && month) {
      const enrollWhere = { academic_year_id: academicYearId };
      if (classId) enrollWhere.class_id = classId;

      const enrollments = await StudentEnrollment.findAll({ where: enrollWhere });
      for (const enroll of enrollments) {
        const existingFee = await Fee.findOne({
          where: { student_id: enroll.student_id, month, academic_year_id: academicYearId }
        });
        if (!existingFee) {
          const structure = await FeeStructure.findOne({
            where: { class_id: enroll.class_id, academic_year_id: academicYearId }
          });
          const studentObj = await Student.findByPk(enroll.student_id);
          if (studentObj) {
            if (!structure && !hasCustomFee(studentObj)) continue;
            let baseFee = hasCustomFee(studentObj)
              ? Number(studentObj.custom_fee)
              : (structure ? Number(structure.monthly_fee) : 0);
            let totalAmount = baseFee + (structure ? Number(structure.other_charges) : 0);

            await Fee.create({
              student_id: enroll.student_id,
              class_id: enroll.class_id,
              academic_year_id: academicYearId,
              month,
              amount: totalAmount,
              paid_amount: 0,
              remaining_amount: totalAmount,
              status: 'Pending'
            });
          }
        }
      }
    }

    const records = await Fee.findAll({
      where: filter,
      include: [
        { model: Student, attributes: ['id', 'name', 'father_name', 'roll_number', 'custom_fee'] },
        { model: Class, attributes: ['class_name', 'section'] },
        { model: AcademicYear, attributes: ['year_name'] }
      ],
      order: [['month', 'ASC'], [Student, 'name', 'ASC']]
    });

    return res.json(records);
  } catch (error) {
    console.error('Fetch fee records error:', error);
    return res.status(500).json({ error: 'Failed to retrieve fee records.' });
  }
});

// POST Generate bulk fee records for a class & month (Admin only)
router.post('/records/generate', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { class_id, academic_year_id, month, includeAdmission, includeExam } = req.body;
    if (!class_id || !academic_year_id || !month) {
      return res.status(400).json({ error: 'Please specify Class, Academic Year, and Month.' });
    }

    // 1. Fetch fee structure for class
    const structure = await FeeStructure.findOne({ where: { class_id, academic_year_id } });
    if (!structure) {
      return res.status(400).json({ 
        error: 'No fee structure configured for this class/session. Please define class fees first.' 
      });
    }

    // 2. Fetch all enrolled students
    const enrollments = await StudentEnrollment.findAll({
      where: { class_id, academic_year_id }
    });

    if (enrollments.length === 0) {
      return res.status(404).json({ error: 'No students currently enrolled in this class.' });
    }

    let generatedCount = 0;
    let updatedCount = 0;
    for (const enroll of enrollments) {
      const studentObj = await Student.findByPk(enroll.student_id);
      
      let baseFee = hasCustomFee(studentObj)
        ? Number(studentObj.custom_fee) 
        : Number(structure.monthly_fee);

      let totalAmount = baseFee + Number(structure.other_charges);
      if (includeAdmission) totalAmount += Number(structure.admission_fee);
      if (includeExam) totalAmount += Number(structure.exam_fee);

      const [fee, created] = await Fee.findOrCreate({
        where: { student_id: enroll.student_id, month, academic_year_id },
        defaults: {
          class_id,
          amount: totalAmount,
          paid_amount: 0,
          remaining_amount: totalAmount,
          status: 'Pending'
        }
      });
      if (created) {
        generatedCount++;
      } else if (fee.status !== 'Paid') {
        applyAmountToFee(fee, totalAmount);
        await fee.save();
        updatedCount++;
      }
    }

    return res.status(201).json({ 
      message: `Generated ${generatedCount} fee voucher(s). ${updatedCount} unpaid existing bill(s) updated to the current fee.`
    });
  } catch (error) {
    console.error('Generate fees error:', error);
    return res.status(500).json({ error: 'Failed to generate bulk fee vouchers.' });
  }
});

// PUT Pay Fee / Update Fee voucher amount (Admin only)
router.put('/records/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { paid_amount } = req.body;
    if (paid_amount === undefined || isNaN(paid_amount) || paid_amount < 0) {
      return res.status(400).json({ error: 'Please provide a valid paid amount.' });
    }

    const fee = await Fee.findByPk(req.params.id);
    if (!fee) {
      return res.status(404).json({ error: 'Fee record not found.' });
    }

    const oldPaid = Number(fee.paid_amount);
    const newPaid = Number(paid_amount);
    const delta = newPaid - oldPaid;

    fee.paid_amount = newPaid;
    fee.remaining_amount = Number(fee.amount) - fee.paid_amount;
    
    if (fee.remaining_amount <= 0) {
      fee.status = 'Paid';
      fee.remaining_amount = 0;
    } else if (fee.paid_amount > 0) {
      fee.status = 'Partial';
    } else {
      fee.status = 'Pending';
    }

    await fee.save();

    // Log transaction history for the difference to keep it consistent
    if (delta !== 0) {
      await FeePayment.create({
        fee_id: fee.id,
        amount: delta,
        payment_date: new Date().toISOString().substring(0, 10),
        payment_method: 'Direct Adjustment',
        notes: `Direct modification from legacy endpoint (adjustment of PKR ${delta.toFixed(2)})`
      });
    }

    return res.json({ message: 'Payment record updated successfully.', fee });
  } catch (error) {
    console.error('Update payment error:', error);
    return res.status(500).json({ error: 'Failed to update fee details.' });
  }
});

// GET Financial Stats (Admin only)
router.get('/stats', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { academicYearId } = req.query;
    if (!academicYearId) {
      return res.status(400).json({ error: 'Academic Year ID is required.' });
    }

    // Sum total collected & total pending
    const summary = await Fee.findAll({
      where: { academic_year_id: academicYearId },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalExpected'],
        [sequelize.fn('SUM', sequelize.col('paid_amount')), 'totalPaid'],
        [sequelize.fn('SUM', sequelize.col('remaining_amount')), 'totalPending']
      ],
      raw: true
    });

    // Group by month
    const monthlyCollection = await Fee.findAll({
      where: { academic_year_id: academicYearId },
      attributes: [
        'month',
        [sequelize.fn('SUM', sequelize.col('paid_amount')), 'collected'],
        [sequelize.fn('SUM', sequelize.col('remaining_amount')), 'pending']
      ],
      group: ['month'],
      raw: true
    });

    return res.json({
      totals: summary[0] || { totalExpected: 0, totalPaid: 0, totalPending: 0 },
      monthly: monthlyCollection
    });
  } catch (error) {
    console.error('Fetch fee stats error:', error);
    return res.status(500).json({ error: 'Failed to fetch financial stats.' });
  }
});

// POST Record transaction payment for a monthly voucher
router.post('/records/:id/payments', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { amount, payment_date, payment_method, notes } = req.body;
    if (amount === undefined || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Please provide a valid positive payment amount.' });
    }
    if (!payment_date) {
      return res.status(400).json({ error: 'Payment date is required.' });
    }

    const fee = await Fee.findByPk(req.params.id);
    if (!fee) {
      return res.status(404).json({ error: 'Fee record not found.' });
    }

    const maxAllowed = Number(fee.amount) - Number(fee.paid_amount);
    if (Number(amount) > maxAllowed) {
      return res.status(400).json({ error: `Amount exceeds remaining balance of PKR ${maxAllowed.toFixed(2)}.` });
    }

    // 1. Create FeePayment transaction record
    const payment = await FeePayment.create({
      fee_id: fee.id,
      amount: Number(amount),
      payment_date,
      payment_method: payment_method || 'Cash',
      notes
    });

    // 2. Update monthly Fee record
    fee.paid_amount = Number(fee.paid_amount) + Number(amount);
    fee.remaining_amount = Number(fee.amount) - fee.paid_amount;

    if (fee.remaining_amount <= 0) {
      fee.status = 'Paid';
      fee.remaining_amount = 0;
    } else if (fee.paid_amount > 0) {
      fee.status = 'Partial';
    } else {
      fee.status = 'Pending';
    }

    await fee.save();

    return res.status(201).json({ message: 'Payment recorded successfully.', payment, fee });
  } catch (error) {
    console.error('Record payment error:', error);
    return res.status(500).json({ error: 'Failed to record payment transaction.' });
  }
});

// GET Payment history for a specific fee record
router.get('/records/:id/payments', isAuthenticated, async (req, res) => {
  try {
    const payments = await FeePayment.findAll({
      where: { fee_id: req.params.id },
      order: [['payment_date', 'DESC'], ['id', 'DESC']]
    });
    return res.json(payments);
  } catch (error) {
    console.error('Fetch payments error:', error);
    return res.status(500).json({ error: 'Failed to retrieve payment history.' });
  }
});

// PUT Set or clear a student's custom monthly fee
router.put('/students/:studentId/custom-fee', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { custom_fee, updateCurrentVoucher, academicYearId } = req.body;
    const student = await Student.findByPk(req.params.studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    student.custom_fee = (custom_fee === '' || custom_fee === null || custom_fee === undefined) ? null : Number(custom_fee);
    await student.save();

    let vouchersUpdated = 0;
    const shouldUpdateVouchers = updateCurrentVoucher !== false;

    if (shouldUpdateVouchers) {
      const session = academicYearId
        ? await AcademicYear.findByPk(academicYearId)
        : await AcademicYear.findOne({ where: { status: 'active' } });
      if (session) {
        const enrollment = await StudentEnrollment.findOne({
          where: { student_id: student.id, academic_year_id: session.id }
        });
        const classId = enrollment ? enrollment.class_id : null;
        const structure = classId
          ? await FeeStructure.findOne({ where: { class_id: classId, academic_year_id: session.id } })
          : null;

        vouchersUpdated = await recalculateUnpaidFees({
          studentId: student.id,
          academicYearId: session.id,
          newStructure: structure
        });
      }
    }

    return res.json({ 
      message: vouchersUpdated
        ? `Student custom fee updated. ${vouchersUpdated} unpaid bill(s) recalculated. Paid bills were left unchanged.`
        : 'Student custom fee updated successfully.',
      custom_fee: student.custom_fee,
      vouchersUpdated
    });
  } catch (error) {
    console.error('Update custom fee error:', error);
    return res.status(500).json({ error: 'Failed to update student custom fee.' });
  }
});

module.exports = router;
