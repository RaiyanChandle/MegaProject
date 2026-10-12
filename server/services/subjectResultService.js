import { 
  Enrollment, 
  Subject, 
  AssessmentComponent, 
  ComponentMark, 
  SubjectResult,
  ExamResult
} from '../models/index.js';

/**
 * =====================================================================
 * T10.1: RESOLVE PRD OPEN DECISION 1 — PASS CRITERIA
 * =====================================================================
 * Rule 20: Total marks are composed of AssessmentComponents, never hardcoded.
 * Rule 24: Subject score is the sum of ComponentMark rows across that enrollment's components.
 * Flow 10 Step 5: Once components have marks entered, compute/update SubjectResult.
 *
 * PASS CRITERIA RULES:
 * 1. Overall Aggregate Requirement:
 *    - totalMarksObtained >= 0.40 * totalMaxMarks (40% aggregate threshold)
 * 2. External Component Requirement:
 *    - For every component with category = 'EXTERNAL' (e.g. End Sem exam / external oral),
 *      marksObtained >= 0.40 * component.maxMarks (40% individual minimum)
 * 3. Both conditions (1) and (2) must be satisfied for isPass = true.
 *    If all components have marks and either condition fails: isPass = false.
 *    If not all components have marks entered yet: isPass = null (Provisional / In-Progress).
 * =====================================================================
 */

/**
 * Computes and upserts SubjectResult for a single enrollment.
 * @param {string} enrollmentId 
 * @param {object} [transaction] - Optional Sequelize transaction
 * @returns {Promise<object>} The computed SubjectResult
 */
export const computeSubjectResult = async (enrollmentId, transaction = null) => {
  const enrollment = await Enrollment.findByPk(enrollmentId, {
    include: [
      {
        model: Subject,
        as: 'subject',
        include: [
          {
            model: AssessmentComponent,
            as: 'assessmentComponents',
            attributes: ['id', 'name', 'maxMarks', 'category', 'sequenceOrder']
          }
        ]
      }
    ],
    transaction
  });

  if (!enrollment || !enrollment.subject) {
    throw new Error(`Enrollment ${enrollmentId} or linked Subject not found`);
  }

  const components = enrollment.subject.assessmentComponents || [];

  // If no assessment components exist for this subject, totalMaxMarks = 0
  if (components.length === 0) {
    return null;
  }

  // Fetch all component marks recorded for this specific enrollment (Rule 23)
  const componentMarks = await ComponentMark.findAll({
    where: { enrollmentId },
    transaction
  });

  const markMap = new Map();
  const sourceExamMap = new Map();
  for (const cm of componentMarks) {
    if (cm.marksObtained !== null && cm.marksObtained !== undefined) {
      markMap.set(cm.componentId, Number(cm.marksObtained));
      if (cm.sourceExamId) {
        sourceExamMap.set(cm.componentId, cm.sourceExamId);
      }
    }
  }

  let totalMaxMarks = 0;
  let totalMarksObtained = 0;
  let allComponentsGraded = true;
  let passedAllExternalComponents = true;

  for (const comp of components) {
    const maxMarks = Number(comp.maxMarks);
    totalMaxMarks += maxMarks;

    if (markMap.has(comp.id)) {
      const marksObtained = markMap.get(comp.id);
      totalMarksObtained += marksObtained;

      // Check external component minimum threshold (40%)
      if (comp.category === 'EXTERNAL') {
        const minPassMarks = 0.40 * maxMarks;
        if (marksObtained < minPassMarks) {
          passedAllExternalComponents = false;
        }

        // If this component was sourced from a formal Exam, respect the Exam's passing threshold
        if (sourceExamMap.has(comp.id)) {
          const examId = sourceExamMap.get(comp.id);
          const er = await ExamResult.findOne({
            where: { examId, enrollmentId },
            transaction
          });
          if (er && er.isPass === false) {
            passedAllExternalComponents = false;
          }
        }
      }
    } else {
      allComponentsGraded = false;
    }
  }

  // Determine isPass
  let isPass = null;
  if (allComponentsGraded && totalMaxMarks > 0) {
    const aggregatePercentage = (totalMarksObtained / totalMaxMarks) * 100;
    const passedAggregate = aggregatePercentage >= 40.0;
    isPass = passedAggregate && passedAllExternalComponents;
  }

  // Upsert SubjectResult
  const [result, created] = await SubjectResult.findOrCreate({
    where: { enrollmentId },
    defaults: {
      totalMarksObtained,
      totalMaxMarks,
      isPass,
      computedAt: new Date()
    },
    transaction
  });

  if (!created) {
    await result.update({
      totalMarksObtained,
      totalMaxMarks,
      isPass,
      computedAt: new Date()
    }, { transaction });
  }

  return {
    enrollmentId,
    totalMarksObtained,
    totalMaxMarks,
    percentage: totalMaxMarks > 0 ? Number(Math.min(100, Math.max(0, (totalMarksObtained / totalMaxMarks) * 100)).toFixed(2)) : 0,
    isPass,
    allComponentsGraded,
    passedAllExternalComponents
  };
};

/**
 * Computes SubjectResults in batch for all enrollments under a given subject and academic term.
 */
export const computeSubjectResultsForSubject = async (subjectId, academicTermId, transaction = null) => {
  const enrollments = await Enrollment.findAll({
    where: {
      subjectId,
      academicTermId,
      status: 'ENROLLED'
    },
    attributes: ['id'],
    transaction
  });

  const results = [];
  for (const enr of enrollments) {
    const res = await computeSubjectResult(enr.id, transaction);
    if (res) results.push(res);
  }

  return results;
};
