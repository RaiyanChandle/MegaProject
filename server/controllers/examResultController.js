import { 
  Exam, 
  ExamResult, 
  Enrollment, 
  Student, 
  Subject, 
  Class, 
  Division, 
  Department, 
  AcademicTerm, 
  AssessmentComponent, 
  ComponentMark, 
  SubjectResult, 
  Teacher, 
  ExamStaff, 
  SubjectAllocation,
  HallTicket,
  sequelize 
} from '../models/index.js';
import { computeSubjectResult } from '../services/subjectResultService.js';
import { Op } from 'sequelize';

/**
 * =====================================================================
 * T11.5: EXAM RESULT WORKFLOW (TEACHER ENTRY & EXAM CELL VERIFICATION)
 * =====================================================================
 * Invariants & Rules:
 * - Rule 19: isPass derived from exam.passingMarks at write time.
 * - Rule 20: Two-stage verification workflow:
 *     1. Teacher evaluates papers and enters marks in DRAFT or SUBMITTED status.
 *        While in DRAFT or SUBMITTED, marks are pending and NEVER leak into
 *        ComponentMark or SubjectResult.
 *     2. Exam Cell formally verifies and approves (VERIFIED) or rejects (REJECTED).
 *        Upon VERIFIED:
 *        - Status moves to VERIFIED, recording verifiedById and verifiedAt.
 *        - If exam links to assessmentComponentId, marks automatically sync
 *          to ComponentMark (with sourceExamId).
 *        - SubjectResult is dynamically computed/updated via computeSubjectResult.
 *        If REJECTED:
 *        - Rejection reason is stored, and submission returns to teacher for revision.
 * - Rule 23: Keyed by enrollmentId, never mixed across attempts.
 * =====================================================================
 */

/**
 * 1. Fetch scheduled exams available for the logged-in Teacher to enter marks.
 * Returns exams for subjects allocated to this teacher.
 */
export const getTeacherExams = async (req, res) => {
  const teacherId = req.user.id;

  try {
    // Find all subject allocations for this teacher
    const allocations = await SubjectAllocation.findAll({
      where: { teacherId },
      attributes: ['subjectId', 'classId']
    });

    if (allocations.length === 0) {
      return res.json([]);
    }

    const subjectIds = [...new Set(allocations.map(a => a.subjectId))];
    const classIds = [...new Set(allocations.map(a => a.classId).filter(Boolean))];

    // Find exams for these subjects
    const exams = await Exam.findAll({
      where: {
        subjectId: { [Op.in]: subjectIds },
        ...(classIds.length > 0 ? { classId: { [Op.in]: classIds } } : {})
      },
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
        { 
          model: Class, 
          as: 'class', 
          attributes: ['id', 'name', 'semesterNumber', 'batchYear'],
          include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
        },
        { model: AcademicTerm, as: 'academicTerm', attributes: ['id', 'name', 'isCurrent'] },
        { model: AssessmentComponent, as: 'assessmentComponent', attributes: ['id', 'name', 'maxMarks', 'category'] },
        { 
          model: ExamResult, 
          as: 'results', 
          attributes: ['id', 'status', 'marksObtained', 'rejectionReason', 'enteredAt', 'verifiedAt']
        }
      ],
      order: [['examDate', 'DESC']]
    });

    // Format exams with evaluation progress summary
    const formatted = exams.map(exam => {
      const plain = exam.toJSON();
      const results = plain.results || [];
      const totalResults = results.length;
      
      let overallStatus = 'PENDING_ENTRY'; // PENDING_ENTRY, DRAFT, SUBMITTED, VERIFIED, REJECTED
      let rejectionReason = null;

      if (totalResults > 0) {
        const hasRejected = results.some(r => r.status === 'REJECTED');
        const hasSubmitted = results.some(r => r.status === 'SUBMITTED');
        const hasVerified = results.every(r => r.status === 'VERIFIED');
        const hasDraft = results.some(r => r.status === 'DRAFT');

        if (hasRejected) {
          overallStatus = 'REJECTED';
          const rejectedResult = results.find(r => r.status === 'REJECTED' && r.rejectionReason);
          rejectionReason = rejectedResult ? rejectedResult.rejectionReason : 'Needs revision as requested by Exam Cell.';
        } else if (hasVerified) {
          overallStatus = 'VERIFIED';
        } else if (hasSubmitted) {
          overallStatus = 'SUBMITTED';
        } else if (hasDraft) {
          overallStatus = 'DRAFT';
        }
      }

      return {
        id: plain.id,
        examType: plain.examType,
        examDate: plain.examDate,
        maxMarks: plain.maxMarks,
        passingMarks: plain.passingMarks,
        subject: plain.subject,
        class: plain.class,
        academicTerm: plain.academicTerm,
        assessmentComponent: plain.assessmentComponent,
        totalEntries: totalResults,
        status: overallStatus,
        rejectionReason,
        isLocked: overallStatus === 'SUBMITTED' || overallStatus === 'VERIFIED'
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching teacher exams for evaluation:', error);
    res.status(500).json({ error: 'Failed to fetch scheduled exams' });
  }
};

/**
 * 2. Get marksheet roster for an exam.
 * Accessible by allocated Teacher, Exam Staff, or Super Admin.
 */
export const getExamMarksheet = async (req, res) => {
  const { examId } = req.params;

  try {
    const exam = await Exam.findByPk(examId, {
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
        { 
          model: Class, 
          as: 'class', 
          attributes: ['id', 'name', 'semesterNumber', 'batchYear'],
          include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
        },
        { model: AcademicTerm, as: 'academicTerm', attributes: ['id', 'name', 'isCurrent'] },
        { model: AssessmentComponent, as: 'assessmentComponent', attributes: ['id', 'name', 'maxMarks', 'category'] }
      ]
    });

    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    // 1. Fetch all student enrollments eligible for this exam (matching subject & term)
    const enrollments = await Enrollment.findAll({
      where: {
        subjectId: exam.subjectId,
        academicTermId: exam.academicTermId,
        status: { [Op.in]: ['ENROLLED', 'PASSED', 'FAILED'] }
      },
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'name', 'instituteId', 'rollNumber', 'email'],
          include: [
            { 
              model: Division, 
              as: 'division', 
              attributes: ['id', 'name'],
              where: exam.classId ? { classId: exam.classId } : undefined,
              required: !!exam.classId
            }
          ]
        },
        {
          model: HallTicket,
          as: 'hallTickets',
          where: { examId: exam.id },
          required: false,
          attributes: ['seatNumber', 'examCenter']
        }
      ],
      order: [
        [{ model: Student, as: 'student' }, 'rollNumber', 'ASC'],
        [{ model: Student, as: 'student' }, 'instituteId', 'ASC']
      ]
    });

    // 2. Fetch existing results for this exam
    const existingResults = await ExamResult.findAll({
      where: { examId },
      include: [
        { model: Teacher, as: 'enteredByTeacher', attributes: ['id', 'name'] },
        { model: ExamStaff, as: 'verifiedByStaff', attributes: ['id', 'name'] }
      ]
    });

    const resultMap = new Map();
    existingResults.forEach(r => resultMap.set(r.enrollmentId, r));

    // Determine overall marksheet status
    let marksheetStatus = 'NOT_STARTED';
    let rejectionReason = null;
    let submittedBy = null;
    let submittedAt = null;
    let verifiedBy = null;
    let verifiedAt = null;

    if (existingResults.length > 0) {
      const anyRejected = existingResults.some(r => r.status === 'REJECTED');
      const allVerified = existingResults.every(r => r.status === 'VERIFIED');
      const anySubmitted = existingResults.some(r => r.status === 'SUBMITTED');

      if (anyRejected) {
        marksheetStatus = 'REJECTED';
        const rej = existingResults.find(r => r.status === 'REJECTED' && r.rejectionReason);
        rejectionReason = rej ? rej.rejectionReason : null;
      } else if (allVerified) {
        marksheetStatus = 'VERIFIED';
      } else if (anySubmitted) {
        marksheetStatus = 'SUBMITTED';
      } else {
        marksheetStatus = 'DRAFT';
      }

      const sample = existingResults[0];
      submittedBy = sample.enteredByTeacher?.name || null;
      submittedAt = sample.enteredAt;
      verifiedBy = sample.verifiedByStaff?.name || null;
      verifiedAt = sample.verifiedAt;
    }

    // 3. Construct student roster with marks & hall ticket info
    const studentsRoster = enrollments.map(enr => {
      const res = resultMap.get(enr.id);
      const hallTicket = enr.hallTickets?.[0];

      return {
        enrollmentId: enr.id,
        attemptNumber: enr.attemptNumber,
        isBacklog: (enr.attemptNumber || 1) > 1,
        studentId: enr.student?.id,
        studentName: enr.student?.name,
        instituteId: enr.student?.instituteId,
        rollNumber: enr.student?.rollNumber,
        divisionName: enr.student?.division?.name || '--',
        seatNumber: hallTicket?.seatNumber || 'Assigned at Hall',
        marksObtained: res ? res.marksObtained : null,
        isPass: res ? res.isPass : null,
        status: res ? res.status : 'NOT_ENTERED',
        rejectionReason: res ? res.rejectionReason : null,
        resultId: res ? res.id : null
      };
    });

    res.json({
      exam: exam.toJSON(),
      marksheetStatus,
      rejectionReason,
      submittedBy,
      submittedAt,
      verifiedBy,
      verifiedAt,
      totalStudents: enrollments.length,
      gradedCount: existingResults.filter(r => r.marksObtained !== null).length,
      studentsRoster
    });
  } catch (error) {
    console.error('Error fetching exam marksheet:', error);
    res.status(500).json({ error: 'Failed to load exam marksheet' });
  }
};

/**
 * 3. Teacher bulk enters/saves marks for an exam.
 * Accepts: { marksList: [{ enrollmentId, marksObtained }], action: 'SAVE_DRAFT' | 'SUBMIT' }
 */
export const saveExamMarks = async (req, res) => {
  const { examId } = req.params;
  const { marksList = [], action = 'SAVE_DRAFT' } = req.body;
  const teacherId = req.user.id;

  if (!['SAVE_DRAFT', 'SUBMIT'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action. Must be SAVE_DRAFT or SUBMIT.' });
  }

  const transaction = await sequelize.transaction();

  try {
    const exam = await Exam.findByPk(examId, { transaction });
    if (!exam) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Exam not found' });
    }

    // Check if exam is already verified
    const existingVerified = await ExamResult.findOne({
      where: { examId, status: 'VERIFIED' },
      transaction
    });

    if (existingVerified) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'This marksheet has already been verified and published by the Exam Cell. Marks can no longer be edited.' 
      });
    }

    const newStatus = action === 'SUBMIT' ? 'SUBMITTED' : 'DRAFT';
    let processedCount = 0;

    for (const item of marksList) {
      const { enrollmentId, marksObtained } = item;
      if (!enrollmentId) continue;

      let marksVal = null;
      let isPassVal = null;

      if (marksObtained !== null && marksObtained !== undefined && marksObtained !== '') {
        const num = Number(marksObtained);
        if (isNaN(num) || num < 0) {
          await transaction.rollback();
          return res.status(400).json({ error: `Invalid mark value for enrollment ${enrollmentId}` });
        }
        if (num > exam.maxMarks) {
          await transaction.rollback();
          return res.status(400).json({ 
            error: `Marks obtained (${num}) cannot exceed exam maximum marks (${exam.maxMarks})` 
          });
        }
        marksVal = num;
        // Rule 19: is_pass derived from passing_marks at write time
        isPassVal = marksVal >= exam.passingMarks;
      }

      const [resultRecord, created] = await ExamResult.findOrCreate({
        where: { examId, enrollmentId },
        defaults: {
          marksObtained: marksVal,
          isPass: isPassVal,
          status: newStatus,
          enteredById: teacherId,
          enteredAt: new Date(),
          rejectionReason: null
        },
        transaction
      });

      if (!created) {
        resultRecord.marksObtained = marksVal;
        resultRecord.isPass = isPassVal;
        resultRecord.status = newStatus;
        resultRecord.enteredById = teacherId;
        resultRecord.enteredAt = new Date();
        resultRecord.rejectionReason = null; // Clear any previous rejection
        await resultRecord.save({ transaction });
      }

      processedCount++;
    }

    await transaction.commit();

    const msg = action === 'SUBMIT' 
      ? `Marksheet submitted successfully to Exam Cell for formal verification (${processedCount} students).`
      : `Marks draft saved successfully (${processedCount} students).`;

    res.json({ message: msg, status: newStatus, processedCount });
  } catch (error) {
    await transaction.rollback();
    console.error('Error saving exam marks:', error);
    res.status(500).json({ error: error.message || 'Failed to save exam marks' });
  }
};

/**
 * 4. Exam Staff: Fetch all exams and their evaluation/submission status for verification.
 */
export const getExamStaffSubmissions = async (req, res) => {
  const { academicTermId, examType, departmentId } = req.query;

  try {
    const where = {};
    if (academicTermId) where.academicTermId = academicTermId;
    if (examType) where.examType = examType;

    const classWhere = {};
    if (departmentId) classWhere.departmentId = departmentId;

    const exams = await Exam.findAll({
      where,
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
        { 
          model: Class, 
          as: 'class', 
          where: Object.keys(classWhere).length > 0 ? classWhere : undefined,
          attributes: ['id', 'name', 'semesterNumber', 'batchYear'],
          include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
        },
        { model: AcademicTerm, as: 'academicTerm', attributes: ['id', 'name', 'isCurrent'] },
        { model: AssessmentComponent, as: 'assessmentComponent', attributes: ['id', 'name', 'maxMarks', 'category'] },
        { 
          model: ExamResult, 
          as: 'results',
          include: [
            { model: Teacher, as: 'enteredByTeacher', attributes: ['id', 'name'] },
            { model: ExamStaff, as: 'verifiedByStaff', attributes: ['id', 'name'] }
          ]
        }
      ],
      order: [
        ['examDate', 'DESC']
      ]
    });

    const formatted = exams.map(exam => {
      const plain = exam.toJSON();
      const results = plain.results || [];
      const totalResults = results.length;

      let submissionStatus = 'NO_SUBMISSION';
      let rejectionReason = null;
      let enteredBy = null;
      let enteredAt = null;
      let verifiedBy = null;
      let verifiedAt = null;

      if (totalResults > 0) {
        const anyRejected = results.some(r => r.status === 'REJECTED');
        const anySubmitted = results.some(r => r.status === 'SUBMITTED');
        const allVerified = results.every(r => r.status === 'VERIFIED');

        if (anyRejected) {
          submissionStatus = 'REJECTED';
          const rej = results.find(r => r.status === 'REJECTED' && r.rejectionReason);
          rejectionReason = rej ? rej.rejectionReason : null;
        } else if (allVerified) {
          submissionStatus = 'VERIFIED';
        } else if (anySubmitted) {
          submissionStatus = 'SUBMITTED';
        } else {
          submissionStatus = 'DRAFT';
        }

        const sample = results[0];
        enteredBy = sample.enteredByTeacher?.name || null;
        enteredAt = sample.enteredAt;
        verifiedBy = sample.verifiedByStaff?.name || null;
        verifiedAt = sample.verifiedAt;
      }

      // Count pass/fail
      const passedCount = results.filter(r => r.isPass === true).length;
      const failedCount = results.filter(r => r.isPass === false).length;

      return {
        id: plain.id,
        examType: plain.examType,
        examDate: plain.examDate,
        maxMarks: plain.maxMarks,
        passingMarks: plain.passingMarks,
        subject: plain.subject,
        class: plain.class,
        academicTerm: plain.academicTerm,
        assessmentComponent: plain.assessmentComponent,
        totalEntries: totalResults,
        passedCount,
        failedCount,
        status: submissionStatus,
        rejectionReason,
        enteredBy,
        enteredAt,
        verifiedBy,
        verifiedAt
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching exam submissions for exam cell:', error);
    res.status(500).json({ error: 'Failed to fetch exam submissions' });
  }
};

/**
 * 5. Exam Staff: Formally VERIFY and APPROVE exam results.
 * Synchronizes marks into ComponentMark and recalculates SubjectResult (Rule 20).
 */
export const verifyExamResults = async (req, res) => {
  const { examId } = req.params;
  const verifiedById = req.user.id;

  const transaction = await sequelize.transaction();

  try {
    const exam = await Exam.findByPk(examId, {
      include: [
        { model: AssessmentComponent, as: 'assessmentComponent' }
      ],
      transaction
    });

    if (!exam) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Exam not found' });
    }

    const results = await ExamResult.findAll({
      where: { 
        examId,
        status: { [Op.in]: ['SUBMITTED', 'DRAFT', 'REJECTED'] }
      },
      transaction
    });

    if (results.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'No submitted exam results found to verify. The subject teacher must submit marks first.' 
      });
    }

    const verifiedDate = new Date();
    const affectedEnrollmentIds = new Set();

    // 1. Mark results as VERIFIED and derive isPass
    for (const result of results) {
      result.status = 'VERIFIED';
      result.verifiedById = verifiedById;
      result.verifiedAt = verifiedDate;
      result.rejectionReason = null;
      if (result.marksObtained !== null && result.marksObtained !== undefined) {
        result.isPass = Number(result.marksObtained) >= exam.passingMarks;
      }
      await result.save({ transaction });

      affectedEnrollmentIds.add(result.enrollmentId);

      // 2. Rule 20: If exam is linked to an AssessmentComponent, automatically sync into ComponentMark
      if (exam.assessmentComponentId && result.marksObtained !== null) {
        const [compMark, created] = await ComponentMark.findOrCreate({
          where: {
            componentId: exam.assessmentComponentId,
            enrollmentId: result.enrollmentId
          },
          defaults: {
            marksObtained: result.marksObtained,
            enteredById: result.enteredById,
            sourceExamId: exam.id,
            enteredAt: verifiedDate
          },
          transaction
        });

        if (!created) {
          compMark.marksObtained = result.marksObtained;
          compMark.sourceExamId = exam.id;
          compMark.enteredById = result.enteredById;
          compMark.enteredAt = verifiedDate;
          await compMark.save({ transaction });
        }
      }
    }

    // 3. Rule 20 & Flow 11: Recompute SubjectResult for all affected student enrollments
    for (const enrollmentId of affectedEnrollmentIds) {
      try {
        await computeSubjectResult(enrollmentId, transaction);
      } catch (err) {
        console.warn(`Could not compute SubjectResult for enrollment ${enrollmentId}:`, err.message);
      }
    }

    await transaction.commit();

    res.json({
      message: `Exam results formally verified and approved successfully (${results.length} students). Official component marks and subject results synchronized.`,
      verifiedCount: results.length,
      examId
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error verifying exam results:', error);
    res.status(500).json({ error: error.message || 'Failed to verify exam results' });
  }
};

/**
 * 6. Exam Staff: REJECT submitted exam results with feedback.
 * Accepts: { rejectionReason: string }
 */
export const rejectExamResults = async (req, res) => {
  const { examId } = req.params;
  const { rejectionReason } = req.body;
  const verifiedById = req.user.id;

  if (!rejectionReason || !rejectionReason.trim()) {
    return res.status(400).json({ error: 'Please provide a clear rejection reason explaining what needs revision.' });
  }

  const transaction = await sequelize.transaction();

  try {
    const results = await ExamResult.findAll({
      where: { 
        examId,
        status: { [Op.in]: ['SUBMITTED', 'DRAFT'] }
      },
      transaction
    });

    if (results.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'No pending submitted results found to reject.' });
    }

    for (const result of results) {
      result.status = 'REJECTED';
      result.verifiedById = verifiedById;
      result.verifiedAt = new Date();
      result.rejectionReason = rejectionReason.trim();
      await result.save({ transaction });
    }

    await transaction.commit();

    res.json({
      message: `Marksheet returned to teacher for revision with reason: "${rejectionReason.trim()}".`,
      rejectedCount: results.length,
      examId
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error rejecting exam results:', error);
    res.status(500).json({ error: error.message || 'Failed to reject exam results' });
  }
};
