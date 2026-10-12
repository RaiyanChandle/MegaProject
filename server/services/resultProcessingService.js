import { 
  Enrollment, 
  Subject, 
  AssessmentComponent, 
  ComponentMark, 
  SubjectResult,
  ResultCard,
  Student,
  Class,
  Division,
  AcademicTerm,
  ExamStaff,
  Department
} from '../models/index.js';
import { computeSubjectResult } from './subjectResultService.js';
import { Op } from 'sequelize';

/**
 * =====================================================================
 * T11.6: 3 RESULT GENERATION MODES (MSE, ESE, COMBINED)
 * =====================================================================
 * - 'MSE'      : Mid Semester Examination result evaluation only.
 *                Evaluates MSE assessment components. SGPA is NULL (N/A).
 * - 'ESE'      : End Semester Examination result evaluation only.
 *                Evaluates ESE assessment components. SGPA is NULL (N/A).
 * - 'COMBINED' : Comprehensive Final Semester Grade Report across ALL components.
 *                Calculates UGC/AICTE letter grades (O, A+, A, B+, B, C, P, F),
 *                credit points, and generates SGPA (Semester Grade Point Average).
 * =====================================================================
 */

/**
 * Maps percentage to letter grade and 10-point grade point (COMBINED mode only).
 */
export const getGradeAndPoints = (percentage, isPass) => {
  if (isPass === false) {
    return { grade: 'F', gradePoint: 0, description: 'Fail / ATKT' };
  }
  if (percentage === null || percentage === undefined || isNaN(percentage)) {
    return { grade: '—', gradePoint: 0, description: 'Incomplete' };
  }

  const pct = Number(percentage);
  if (pct >= 90.0) return { grade: 'O', gradePoint: 10, description: 'Outstanding' };
  if (pct >= 80.0) return { grade: 'A+', gradePoint: 9, description: 'Excellent' };
  if (pct >= 70.0) return { grade: 'A', gradePoint: 8, description: 'Very Good' };
  if (pct >= 60.0) return { grade: 'B+', gradePoint: 7, description: 'Good' };
  if (pct >= 55.0) return { grade: 'B', gradePoint: 6, description: 'Above Average' };
  if (pct >= 50.0) return { grade: 'C', gradePoint: 5, description: 'Average' };
  if (pct >= 40.0) return { grade: 'P', gradePoint: 4, description: 'Pass' };
  return { grade: 'F', gradePoint: 0, description: 'Fail / Backlog' };
};

/**
 * Helper to match component to evaluation type:
 * MSE: name includes MSE or Mid
 * ESE: name includes ESE, End, Final, or category is EXTERNAL
 */
const matchesResultType = (comp, resultType) => {
  if (resultType === 'COMBINED') return true;
  const nameUpper = (comp.name || '').toUpperCase();
  if (resultType === 'MSE') {
    return nameUpper.includes('MSE') || nameUpper.includes('MID');
  }
  if (resultType === 'ESE') {
    return nameUpper.includes('ESE') || nameUpper.includes('END') || comp.category === 'EXTERNAL';
  }
  return true;
};

/**
 * Computes, saves, and returns the ResultCard for a single student.
 * @param {string} studentId 
 * @param {string} academicTermId 
 * @param {'MSE'|'ESE'|'COMBINED'} resultType 
 * @param {string|null} processedById 
 * @param {object|null} transaction 
 */
export const computeStudentResultCard = async (
  studentId, 
  academicTermId, 
  resultType = 'COMBINED', 
  processedById = null, 
  transaction = null
) => {
  const normType = ['MSE', 'ESE', 'COMBINED'].includes(resultType?.toUpperCase()) 
    ? resultType.toUpperCase() 
    : 'COMBINED';

  const student = await Student.findByPk(studentId, {
    include: [
      {
        model: Division,
        as: 'division',
        include: [
          {
            model: Class,
            as: 'class',
            include: [{ model: Department, as: 'department' }]
          }
        ]
      }
    ],
    transaction
  });

  if (!student) {
    throw new Error(`Student with ID ${studentId} not found`);
  }

  // Fetch all active enrollments for this student in the term
  const enrollments = await Enrollment.findAll({
    where: {
      studentId,
      academicTermId,
      status: 'ENROLLED'
    },
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
      },
      {
        model: ComponentMark,
        as: 'componentMarks',
        attributes: ['id', 'componentId', 'marksObtained', 'enteredAt']
      },
      {
        model: SubjectResult,
        as: 'subjectResult'
      }
    ],
    transaction
  });

  if (enrollments.length === 0) {
    return {
      student: {
        id: student.id,
        name: student.name,
        rollNumber: student.rollNumber,
        instituteId: student.instituteId
      },
      resultType: normType,
      hasEnrollments: false,
      message: 'No active course enrollments found for this term'
    };
  }

  // Ensure SubjectResult is updated if COMBINED mode
  if (normType === 'COMBINED') {
    for (const enr of enrollments) {
      if (!enr.subjectResult) {
        await computeSubjectResult(enr.id, transaction);
        enr.subjectResult = await SubjectResult.findOne({
          where: { enrollmentId: enr.id },
          transaction
        });
      }
    }
  }

  let totalCredits = 0;
  let earnedCredits = 0;
  let totalCreditPoints = 0;
  let totalMarksObtained = 0;
  let totalMaxMarks = 0;
  let allCoursesGraded = true;
  let allCoursesPassed = true;

  const subjectsBreakdown = [];

  for (const enr of enrollments) {
    const subj = enr.subject;
    const credits = Number(subj?.credits || 0);
    const allComps = subj?.assessmentComponents || [];
    const markMap = new Map();
    enr.componentMarks?.forEach(cm => {
      if (cm.marksObtained !== null && cm.marksObtained !== undefined) {
        markMap.set(cm.componentId, Number(cm.marksObtained));
      }
    });

    if (normType === 'COMBINED') {
      // COMBINED MODE: Uses complete SubjectResult
      totalCredits += credits;
      const res = enr.subjectResult;
      const marksObtained = res?.totalMarksObtained ?? null;
      const maxMarks = res?.totalMaxMarks ?? 0;
      const isPass = res?.isPass ?? null;

      if (marksObtained !== null) totalMarksObtained += Number(marksObtained);
      totalMaxMarks += Number(maxMarks);

      if (isPass === null) {
        allCoursesGraded = false;
        allCoursesPassed = false;
      } else if (isPass === false) {
        allCoursesPassed = false;
      } else if (isPass === true) {
        earnedCredits += credits;
      }

      const pct = marksObtained !== null && maxMarks > 0 
        ? Number(((marksObtained / maxMarks) * 100).toFixed(2)) 
        : null;

      const { grade, gradePoint, description } = getGradeAndPoints(pct, isPass);
      const creditPoints = credits * gradePoint;
      totalCreditPoints += creditPoints;

      subjectsBreakdown.push({
        enrollmentId: enr.id,
        subjectId: subj?.id,
        subjectCode: subj?.code,
        subjectName: subj?.name,
        subjectType: subj?.subjectType,
        credits,
        attemptNumber: enr.attemptNumber,
        marksObtained,
        maxMarks,
        percentage: pct,
        grade,
        gradePoint,
        gradeDescription: description,
        creditPoints,
        isPass
      });
    } else {
      // MSE OR ESE MODE: Filter components matching MSE or ESE
      const targetComps = allComps.filter(c => matchesResultType(c, normType));
      
      let compMarksObtained = 0;
      let compMaxMarks = 0;
      let hasMarks = false;
      let allTargetCompsHaveMarks = targetComps.length > 0;

      targetComps.forEach(tc => {
        compMaxMarks += Number(tc.maxMarks || 0);
        if (markMap.has(tc.id)) {
          compMarksObtained += markMap.get(tc.id);
          hasMarks = true;
        } else {
          allTargetCompsHaveMarks = false;
        }
      });

      if (hasMarks) totalMarksObtained += compMarksObtained;
      totalMaxMarks += compMaxMarks;

      let coursePercentage = null;
      let coursePass = null;

      if (allTargetCompsHaveMarks && compMaxMarks > 0) {
        coursePercentage = Number(((compMarksObtained / compMaxMarks) * 100).toFixed(2));
        coursePass = coursePercentage >= 40.0;
        if (!coursePass) allCoursesPassed = false;
      } else {
        allCoursesGraded = false;
        allCoursesPassed = false;
      }

      subjectsBreakdown.push({
        enrollmentId: enr.id,
        subjectId: subj?.id,
        subjectCode: subj?.code,
        subjectName: subj?.name,
        subjectType: subj?.subjectType,
        credits,
        evaluationComponent: targetComps.map(c => c.name).join(', ') || normType,
        marksObtained: hasMarks ? compMarksObtained : null,
        maxMarks: compMaxMarks,
        percentage: coursePercentage,
        grade: '—', // No letter grade for individual MSE/ESE
        gradePoint: null, // No grade points for individual MSE/ESE
        creditPoints: null,
        isPass: coursePass
      });
    }
  }

  // Calculate term percentage
  const termPercentage = totalMaxMarks > 0 
    ? Number(((totalMarksObtained / totalMaxMarks) * 100).toFixed(2)) 
    : 0;

  // SGPA is generated ONLY on COMBINED result!
  let sgpa = null;
  if (normType === 'COMBINED') {
    sgpa = totalCredits > 0 
      ? Number((totalCreditPoints / totalCredits).toFixed(2)) 
      : 0;
  }

  let standing = 'INCOMPLETE';
  if (allCoursesGraded) {
    standing = allCoursesPassed ? 'PASS' : normType === 'COMBINED' ? 'ATKT' : 'FAIL';
  }

  // Persist into ResultCard (keyed by studentId, academicTermId, resultType)
  const [resultCard, created] = await ResultCard.findOrCreate({
    where: { 
      studentId, 
      academicTermId,
      resultType: normType
    },
    defaults: {
      studentId,
      academicTermId,
      resultType: normType,
      totalMarks: totalMarksObtained,
      totalMaxMarks,
      percentage: termPercentage,
      sgpa, // null for MSE and ESE; float for COMBINED
      standing,
      processedById,
      processedAt: new Date()
    },
    transaction
  });

  if (!created) {
    await resultCard.update({
      totalMarks: totalMarksObtained,
      totalMaxMarks,
      percentage: termPercentage,
      sgpa,
      standing,
      processedById,
      processedAt: new Date()
    }, { transaction });
  }

  return {
    resultCardId: resultCard.id,
    resultType: normType,
    student: {
      id: student.id,
      name: student.name,
      rollNumber: student.rollNumber,
      instituteId: student.instituteId,
      className: student.division?.class?.name,
      divisionName: student.division?.name,
      departmentName: student.division?.class?.department?.name
    },
    academicTermId,
    totalCredits: normType === 'COMBINED' ? totalCredits : null,
    earnedCredits: normType === 'COMBINED' ? earnedCredits : null,
    totalMarksObtained,
    totalMaxMarks,
    percentage: termPercentage,
    sgpa, // Only present when resultType === 'COMBINED'
    standing,
    processedAt: resultCard.processedAt,
    subjects: subjectsBreakdown
  };
};

/**
 * Batch result processing across cohort for MSE, ESE, or COMBINED results.
 */
export const processBatchCohortResults = async ({
  academicTermId,
  classId = null,
  resultType = 'COMBINED',
  processedById = null
}) => {
  const normType = ['MSE', 'ESE', 'COMBINED'].includes(resultType?.toUpperCase()) 
    ? resultType.toUpperCase() 
    : 'COMBINED';

  const whereEnrollment = {
    academicTermId,
    status: 'ENROLLED'
  };

  const studentWhere = {};
  if (classId) {
    const divisions = await Division.findAll({
      where: { classId },
      attributes: ['id']
    });
    const divisionIds = divisions.map(d => d.id);
    studentWhere.divisionId = { [Op.in]: divisionIds };
  }

  const enrollments = await Enrollment.findAll({
    where: whereEnrollment,
    attributes: ['studentId'],
    include: [
      {
        model: Student,
        as: 'student',
        where: Object.keys(studentWhere).length > 0 ? studentWhere : undefined,
        attributes: ['id']
      }
    ],
    group: ['studentId', 'student.id']
  });

  const studentIds = [...new Set(enrollments.map(e => e.studentId))];

  let processedCount = 0;
  let passedCount = 0;
  let failedCount = 0;
  let incompleteCount = 0;
  let sgpaSum = 0;
  let highestSgpa = 0;
  const processedResults = [];

  for (const sId of studentIds) {
    try {
      const res = await computeStudentResultCard(sId, academicTermId, normType, processedById);
      if (res && res.resultCardId) {
        processedCount++;
        processedResults.push(res);

        if (normType === 'COMBINED' && res.sgpa !== null) {
          sgpaSum += res.sgpa;
          if (res.sgpa > highestSgpa) highestSgpa = res.sgpa;
        }

        if (res.standing === 'PASS') passedCount++;
        else if (res.standing === 'ATKT' || res.standing === 'FAIL') failedCount++;
        else incompleteCount++;
      }
    } catch (err) {
      console.error(`Failed to process result for student ${sId}:`, err);
    }
  }

  const averageSgpa = (normType === 'COMBINED' && processedCount > 0) 
    ? Number((sgpaSum / processedCount).toFixed(2)) 
    : null;

  return {
    resultType: normType,
    totalStudents: studentIds.length,
    processedCount,
    passedCount,
    failedCount,
    incompleteCount,
    passPercentage: processedCount > 0 ? Number(((passedCount / processedCount) * 100).toFixed(1)) : 0,
    averageSgpa, // null for MSE / ESE
    highestSgpa: normType === 'COMBINED' ? highestSgpa : null,
    results: processedResults
  };
};

/**
 * Retrieves cohort result cards for a given resultType ('MSE', 'ESE', or 'COMBINED').
 */
export const getCohortResultCards = async ({
  academicTermId,
  classId = null,
  resultType = 'COMBINED'
}) => {
  const normType = ['MSE', 'ESE', 'COMBINED'].includes(resultType?.toUpperCase()) 
    ? resultType.toUpperCase() 
    : 'COMBINED';

  const studentWhere = {};
  if (classId) {
    const divisions = await Division.findAll({
      where: { classId },
      attributes: ['id']
    });
    const divisionIds = divisions.map(d => d.id);
    studentWhere.divisionId = { [Op.in]: divisionIds };
  }

  const resultCards = await ResultCard.findAll({
    where: { 
      academicTermId,
      resultType: normType
    },
    include: [
      {
        model: Student,
        as: 'student',
        where: Object.keys(studentWhere).length > 0 ? studentWhere : undefined,
        attributes: ['id', 'name', 'rollNumber', 'instituteId'],
        include: [
          {
            model: Division,
            as: 'division',
            attributes: ['id', 'name'],
            include: [
              {
                model: Class,
                as: 'class',
                attributes: ['id', 'name', 'semesterNumber'],
                include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
              }
            ]
          }
        ]
      },
      {
        model: ExamStaff,
        as: 'processedBy',
        attributes: ['id', 'name']
      },
      {
        model: AcademicTerm,
        as: 'academicTerm',
        attributes: ['id', 'name', 'isCurrent']
      }
    ],
    order: [
      [{ model: Student, as: 'student' }, 'rollNumber', 'ASC']
    ]
  });

  let totalCards = resultCards.length;
  let passedCount = 0;
  let failedCount = 0;
  let sgpaSum = 0;
  let highestSgpa = 0;
  const gradeDistribution = {
    'O (10)': 0,
    'A+ (9)': 0,
    'A (8)': 0,
    'B+ (7)': 0,
    'B (6)': 0,
    'C (5)': 0,
    'P (4)': 0,
    'F (0)': 0
  };

  const formatted = resultCards.map(rc => {
    const plain = rc.get({ plain: true });
    const s = plain.student;
    const sgpaVal = plain.sgpa !== null ? Number(plain.sgpa) : null;

    if (normType === 'COMBINED' && sgpaVal !== null) {
      sgpaSum += sgpaVal;
      if (sgpaVal > highestSgpa) highestSgpa = sgpaVal;

      if (sgpaVal >= 9.5) gradeDistribution['O (10)']++;
      else if (sgpaVal >= 8.5) gradeDistribution['A+ (9)']++;
      else if (sgpaVal >= 7.5) gradeDistribution['A (8)']++;
      else if (sgpaVal >= 6.5) gradeDistribution['B+ (7)']++;
      else if (sgpaVal >= 5.5) gradeDistribution['B (6)']++;
      else if (sgpaVal >= 4.5) gradeDistribution['C (5)']++;
      else if (sgpaVal >= 4.0) gradeDistribution['P (4)']++;
      else gradeDistribution['F (0)']++;
    }

    const isPassed = plain.standing === 'PASS';
    if (isPassed) passedCount++;
    else failedCount++;

    return {
      id: plain.id,
      studentId: s.id,
      rollNumber: s.rollNumber,
      studentName: s.name,
      instituteId: s.instituteId,
      className: s.division?.class?.name || '—',
      divisionName: s.division?.name || '—',
      departmentName: s.division?.class?.department?.name || '—',
      resultType: plain.resultType || normType,
      totalMarks: plain.totalMarks,
      totalMaxMarks: plain.totalMaxMarks,
      percentage: plain.percentage,
      sgpa: sgpaVal, // null for MSE / ESE; number for COMBINED
      standing: plain.standing,
      processedBy: plain.processedBy?.name || 'Exam Controller',
      processedAt: plain.processedAt,
      academicTerm: plain.academicTerm
    };
  });

  return {
    resultType: normType,
    totalStudents: totalCards,
    passedCount,
    failedCount,
    passPercentage: totalCards > 0 ? Number(((passedCount / totalCards) * 100).toFixed(1)) : 0,
    averageSgpa: (normType === 'COMBINED' && totalCards > 0) ? Number((sgpaSum / totalCards).toFixed(2)) : null,
    highestSgpa: normType === 'COMBINED' ? highestSgpa : null,
    gradeDistribution: normType === 'COMBINED' ? gradeDistribution : null,
    resultCards: formatted
  };
};
