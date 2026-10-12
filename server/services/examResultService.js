import { 
  Exam, 
  ExamResult, 
  AssessmentComponent, 
  ComponentMark, 
  Enrollment, 
  Subject 
} from '../models/index.js';
import { computeSubjectResult } from './subjectResultService.js';

/**
 * =====================================================================
 * T11.1 / T11.5: EXAM MARKS VERIFICATION WORKFLOW
 * =====================================================================
 * 
 * DECISION 3: Exam -> AssessmentComponent Mapping
 * - An Exam optionally and explicitly links to an AssessmentComponent via
 *   `Exam.assessmentComponentId`.
 * 
 * DECISION 5: Two-Stage Verification Workflow (Teacher Entry -> Exam Cell Verify)
 * 1. Step 1 (Teacher Entry): Allocated teacher evaluates student answer sheets
 *    and enters marks into `ExamResult`.
 *    - Status is set to 'DRAFT' (in-progress) or 'SUBMITTED' (dispatched to Exam Cell).
 *    - `enteredById` is set to Teacher ID.
 *    - Marks are NOT yet synced to ComponentMark or SubjectResult.
 * 
 * 2. Step 2 (Exam Cell Verification): Exam Staff (`EXKIT`) reviews the submitted marks.
 *    - If APPROVED: Status moves to 'VERIFIED', `verifiedById` & `verifiedAt` are recorded.
 *      - `isPass` is derived from `Exam.passingMarks`.
 *      - If `Exam.assessmentComponentId` exists, marks sync to `ComponentMark` (with `sourceExamId`).
 *      - `computeSubjectResult(enrollmentId)` is invoked to update final standing.
 *    - If REJECTED: Status moves to 'REJECTED' with `rejectionReason`, allowing teacher to revise.
 * =====================================================================
 */

/**
 * Teacher enters or updates exam marks (in DRAFT or SUBMITTED status).
 * 
 * @param {string} examId 
 * @param {Array<{ enrollmentId: string, marksObtained: number }>} resultsData 
 * @param {string} teacherId - Teacher ID entering the marks
 * @param {boolean} [submitForVerification=false] - If true, status is SUBMITTED, else DRAFT
 * @param {object} [transaction] 
 * @returns {Promise<Array<object>>}
 */
export const recordExamMarksByTeacher = async (
  examId, 
  resultsData, 
  teacherId, 
  submitForVerification = false, 
  transaction = null
) => {
  const exam = await Exam.findByPk(examId, { transaction });
  if (!exam) {
    throw new Error(`Exam ${examId} not found`);
  }

  const targetStatus = submitForVerification ? 'SUBMITTED' : 'DRAFT';
  const savedResults = [];

  for (const entry of resultsData) {
    const { enrollmentId, marksObtained } = entry;
    const numMarks = marksObtained !== null && marksObtained !== undefined ? Number(marksObtained) : null;

    if (numMarks !== null && (numMarks < 0 || numMarks > Number(exam.maxMarks))) {
      throw new Error(`Marks ${numMarks} out of bounds (0 - ${exam.maxMarks}) for enrollment ${enrollmentId}`);
    }

    let [examResult, created] = await ExamResult.findOrCreate({
      where: { examId, enrollmentId },
      defaults: {
        marksObtained: numMarks,
        status: targetStatus,
        enteredById: teacherId,
        enteredAt: new Date()
      },
      transaction
    });

    if (!created) {
      // If already verified, do not allow silent teacher mutation without exam cell unlock
      if (examResult.status === 'VERIFIED') {
        throw new Error(`Cannot modify verified result for enrollment ${enrollmentId}. Contact Exam Cell.`);
      }

      examResult.marksObtained = numMarks;
      examResult.status = targetStatus;
      examResult.enteredById = teacherId;
      examResult.enteredAt = new Date();
      examResult.rejectionReason = null; // Clear prior rejection if re-submitting
      await examResult.save({ transaction });
    }

    savedResults.push(examResult);
  }

  return savedResults;
};

/**
 * Exam Staff verifies and publishes submitted marks for an exam.
 * Synchronizes verified marks into ComponentMark and recomputes SubjectResult.
 * 
 * @param {string} examId 
 * @param {string} staffId - ExamStaff ID verifying the marks
 * @param {Array<string>} [enrollmentIds] - Optional array to verify specific enrollments, or all if omitted
 * @param {object} [transaction] 
 * @returns {Promise<Array<object>>}
 */
export const verifyExamResultsByExamStaff = async (
  examId, 
  staffId, 
  enrollmentIds = null, 
  transaction = null
) => {
  const exam = await Exam.findByPk(examId, {
    include: [
      {
        model: AssessmentComponent,
        as: 'assessmentComponent'
      }
    ],
    transaction
  });

  if (!exam) {
    throw new Error(`Exam ${examId} not found`);
  }

  const whereClause = { examId };
  if (enrollmentIds && Array.isArray(enrollmentIds) && enrollmentIds.length > 0) {
    whereClause.enrollmentId = enrollmentIds;
  }

  const examResults = await ExamResult.findAll({ where: whereClause, transaction });
  const verifiedResults = [];

  for (const result of examResults) {
    const numMarks = result.marksObtained !== null && result.marksObtained !== undefined 
      ? Number(result.marksObtained) 
      : null;

    // Rule 19: is_pass derived from passing_marks at write time
    const isPass = numMarks !== null ? numMarks >= Number(exam.passingMarks) : null;

    result.status = 'VERIFIED';
    result.isPass = isPass;
    result.verifiedById = staffId;
    result.verifiedAt = new Date();
    result.rejectionReason = null;
    await result.save({ transaction });

    verifiedResults.push(result);

    // Sync into ComponentMark if mapped to an AssessmentComponent
    if (exam.assessmentComponentId && numMarks !== null) {
      let [compMark, cmCreated] = await ComponentMark.findOrCreate({
        where: {
          componentId: exam.assessmentComponentId,
          enrollmentId: result.enrollmentId
        },
        defaults: {
          marksObtained: numMarks,
          sourceExamId: exam.id,
          enteredById: result.enteredById,
          enteredAt: new Date()
        },
        transaction
      });

      if (!cmCreated) {
        compMark.marksObtained = numMarks;
        compMark.sourceExamId = exam.id;
        compMark.enteredAt = new Date();
        await compMark.save({ transaction });
      }

      // Recompute SubjectResult for this enrollment
      await computeSubjectResult(result.enrollmentId, transaction);
    }
  }

  return verifiedResults;
};

/**
 * Exam Staff rejects submitted marks back to the teacher with a reason.
 * 
 * @param {string} examId 
 * @param {string} staffId - ExamStaff ID
 * @param {string} rejectionReason - Notes for teacher explaining required corrections
 * @param {Array<string>} [enrollmentIds] - Optional specific enrollments to reject, or all if omitted
 * @param {object} [transaction] 
 * @returns {Promise<Array<object>>}
 */
export const rejectExamResultsByExamStaff = async (
  examId, 
  staffId, 
  rejectionReason, 
  enrollmentIds = null, 
  transaction = null
) => {
  const whereClause = { examId };
  if (enrollmentIds && Array.isArray(enrollmentIds) && enrollmentIds.length > 0) {
    whereClause.enrollmentId = enrollmentIds;
  }

  const examResults = await ExamResult.findAll({ where: whereClause, transaction });
  for (const result of examResults) {
    result.status = 'REJECTED';
    result.rejectionReason = rejectionReason;
    result.verifiedById = staffId;
    result.verifiedAt = new Date();
    await result.save({ transaction });
  }

  return examResults;
};

/**
 * Direct entry by Exam Staff (backward-compatible convenience method that auto-verifies).
 */
export const recordExamResults = async (examId, resultsData, recordedByStaffId, transaction = null) => {
  const exam = await Exam.findByPk(examId, { transaction });
  if (!exam) {
    throw new Error(`Exam ${examId} not found`);
  }

  // 1. Save results
  for (const entry of resultsData) {
    const { enrollmentId, marksObtained } = entry;
    const numMarks = marksObtained !== null && marksObtained !== undefined ? Number(marksObtained) : null;
    const isPass = numMarks !== null ? numMarks >= Number(exam.passingMarks) : null;

    let [examResult, created] = await ExamResult.findOrCreate({
      where: { examId, enrollmentId },
      defaults: {
        marksObtained: numMarks,
        isPass,
        status: 'VERIFIED',
        verifiedById: recordedByStaffId,
        verifiedAt: new Date(),
        enteredAt: new Date()
      },
      transaction
    });

    if (!created) {
      examResult.marksObtained = numMarks;
      examResult.isPass = isPass;
      examResult.status = 'VERIFIED';
      examResult.verifiedById = recordedByStaffId;
      examResult.verifiedAt = new Date();
      await examResult.save({ transaction });
    }
  }

  // 2. Perform verification sync
  const enrollmentIds = resultsData.map(r => r.enrollmentId);
  return await verifyExamResultsByExamStaff(examId, recordedByStaffId, enrollmentIds, transaction);
};
