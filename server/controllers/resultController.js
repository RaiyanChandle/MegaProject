import {
  Student,
  Enrollment,
  Subject,
  SubjectResult,
  ResultCard,
  AcademicTerm,
  Class,
  Division,
  Department,
  ExamStaff,
  ParentStudent,
  Exam,
  ExamResult
} from '../models/index.js';
import { Op } from 'sequelize';

/**
 * =====================================================================
 * T11.6 — Result Card Generation & SGPA/CGPA Calculation by Exam Type
 * =====================================================================
 * SGPA Calculation (10-point grading scale):
 *   - Percentage per subject  → Grade Point (GP)
 *   - 90–100%  → 10   (O)
 *   - 80–89%   → 9    (A+)
 *   - 70–79%   → 8    (A)
 *   - 60–69%   → 7    (B+)
 *   - 50–59%   → 6    (B)
 *   - 40–49%   → 5    (C)
 *   - <40%     → 0    (F)
 *
 *   SGPA = Σ(credits × GP) / Σ(credits)
 *   Percentage = (totalMarksObtained / totalMaxMarks) × 100
 * =====================================================================
 */

const getGradePoint = (percentage) => {
  if (percentage >= 90) return 10;
  if (percentage >= 80) return 9;
  if (percentage >= 70) return 8;
  if (percentage >= 60) return 7;
  if (percentage >= 50) return 6;
  if (percentage >= 40) return 5;
  return 0;
};

const getGrade = (percentage) => {
  if (percentage >= 90) return 'O';
  if (percentage >= 80) return 'A+';
  if (percentage >= 70) return 'A';
  if (percentage >= 60) return 'B+';
  if (percentage >= 50) return 'B';
  if (percentage >= 40) return 'C';
  return 'F';
};

/**
 * Compute a result card for a single student in a given academic term & exam series.
 * Returns computed data (does NOT persist).
 * If any subject result is pending, identifies pendingSubjects and marks allGraded = false.
 */
const computeResultCardForStudent = async (studentId, academicTermId, examType = 'FINAL') => {
  const normExamType = (examType || 'FINAL').toUpperCase();

  const enrollments = await Enrollment.findAll({
    where: {
      studentId,
      academicTermId,
      status: { [Op.in]: ['ENROLLED', 'PASSED', 'FAILED'] }
    },
    include: [
      {
        model: Subject,
        as: 'subject',
        attributes: ['id', 'name', 'code', 'credits', 'subjectType']
      },
      {
        model: Class,
        as: 'class',
        attributes: ['id', 'name', 'semesterNumber']
      },
      {
        model: SubjectResult,
        as: 'subjectResult',
        attributes: ['id', 'totalMarksObtained', 'totalMaxMarks', 'isPass', 'computedAt']
      },
      {
        model: ExamResult,
        as: 'examResults',
        include: [
          {
            model: Exam,
            as: 'exam',
            attributes: ['id', 'examType', 'maxMarks', 'passingMarks', 'subjectId', 'classId', 'academicTermId', 'componentId']
          }
        ]
      }
    ]
  });

  if (enrollments.length === 0) return null;

  let totalCredits = 0;
  let earnedCredits = 0;
  let weightedGradePoints = 0;
  let grandTotalMarks = 0;
  let grandMaxMarks = 0;
  let allGraded = true;
  const pendingSubjects = [];

  const subjectBreakdown = [];

  for (const enr of enrollments) {
    const subj = enr.subject;
    const credits = subj?.credits || 0;
    totalCredits += credits;

    // Strict separation: find ExamResult for this specific examType
    const examRes = enr.examResults?.find(er => er.exam?.examType === normExamType);

    let scheduledExam = examRes?.exam;
    if (!scheduledExam) {
      scheduledExam = await Exam.findOne({
        where: {
          subjectId: enr.subjectId,
          academicTermId,
          examType: normExamType,
          ...(enr.classId ? { classId: enr.classId } : {})
        }
      });
    }

    let isSubjectPending = false;
    let pendingReason = '';
    let marksObtained = null;
    let maxMarks = null;
    let minMarks = null;
    let isPass = null;
    let percentage = null;
    let grade = null;
    let gradePoint = null;
    let creditPoints = null;

    if (examRes && examRes.marksObtained !== null && examRes.marksObtained !== undefined) {
      // Scored ExamResult found for this exam series
      marksObtained = Number(examRes.marksObtained);
      maxMarks = Number(scheduledExam?.maxMarks || examRes.exam?.maxMarks || 100);
      minMarks = Number(scheduledExam?.passingMarks || examRes.exam?.passingMarks || Math.round(maxMarks * 0.4));
      isPass = examRes.isPass !== null && examRes.isPass !== undefined ? examRes.isPass : (marksObtained >= minMarks);
      const rawPct = maxMarks > 0 ? (marksObtained / maxMarks) * 100 : 0;
      percentage = Number(Math.min(100, Math.max(0, rawPct)).toFixed(2));
      gradePoint = getGradePoint(percentage);
      grade = getGrade(percentage);
      creditPoints = Number((credits * gradePoint).toFixed(2));

      grandTotalMarks += marksObtained;
      grandMaxMarks += maxMarks;
      weightedGradePoints += credits * gradePoint;

      if (isPass) {
        earnedCredits += credits;
      }
    } else if (normExamType === 'FINAL' && !scheduledExam && enr.subjectResult && enr.subjectResult.totalMaxMarks > 0 && enr.subjectResult.totalMarksObtained !== null && enr.subjectResult.isPass !== null) {
      // Fallback for FINAL when components are used and SubjectResult is complete
      const sr = enr.subjectResult;
      marksObtained = Number(sr.totalMarksObtained);
      maxMarks = Number(sr.totalMaxMarks);
      minMarks = Math.round(maxMarks * 0.4);
      isPass = sr.isPass;
      const rawPct = maxMarks > 0 ? (marksObtained / maxMarks) * 100 : 0;
      percentage = Number(Math.min(100, Math.max(0, rawPct)).toFixed(2));
      gradePoint = getGradePoint(percentage);
      grade = getGrade(percentage);
      creditPoints = Number((credits * gradePoint).toFixed(2));

      grandTotalMarks += marksObtained;
      grandMaxMarks += maxMarks;
      weightedGradePoints += credits * gradePoint;

      if (isPass) {
        earnedCredits += credits;
      }
    } else {
      // Mark as PENDING
      allGraded = false;
      isSubjectPending = true;
      if (scheduledExam) {
        pendingReason = `${normExamType} exam marks not entered yet`;
      } else {
        pendingReason = `${normExamType} exam not scheduled / evaluation pending`;
      }

      pendingSubjects.push({
        subjectId: subj?.id,
        subjectName: subj?.name || 'Unknown Subject',
        subjectCode: subj?.code || '—',
        credits,
        reason: pendingReason
      });
    }

    subjectBreakdown.push({
      subjectId: subj?.id,
      subjectName: subj?.name,
      subjectCode: subj?.code,
      credits,
      subjectType: subj?.subjectType,
      marksObtained,
      maxMarks,
      minMarks,
      percentage,
      gradePoint,
      grade,
      creditPoints,
      isPass,
      isPending: isSubjectPending,
      pendingReason: isSubjectPending ? pendingReason : null
    });
  }

  const rawSgpa = totalCredits > 0 && allGraded ? (weightedGradePoints / totalCredits) : null;
  const sgpa = rawSgpa !== null ? Number(Math.min(10.0, Math.max(0, rawSgpa)).toFixed(2)) : null;

  // Ensure overall percentage never exceeds 100% on real data
  const rawGrandPct = grandMaxMarks > 0 && allGraded ? (grandTotalMarks / grandMaxMarks) * 100 : null;
  const percentage = rawGrandPct !== null ? Number(Math.min(100, Math.max(0, rawGrandPct)).toFixed(2)) : null;
  const overallGrade = percentage != null ? getGrade(percentage) : null;
  const overallPass = allGraded ? subjectBreakdown.every(s => s.isPass !== false) : null;

  // Award / Classification
  let classification = 'RESULT PENDING';
  if (allGraded && pendingSubjects.length === 0) {
    if (overallPass === false) {
      classification = 'FAIL / ATKT';
    } else if (percentage >= 75) {
      classification = 'FIRST CLASS WITH DISTINCTION';
    } else if (percentage >= 60) {
      classification = 'FIRST CLASS';
    } else if (percentage >= 50) {
      classification = 'SECOND CLASS';
    } else if (percentage >= 40) {
      classification = 'PASS CLASS';
    } else {
      classification = 'FAIL';
    }
  }

  return {
    studentId,
    academicTermId,
    examType: normExamType,
    allGraded: allGraded && pendingSubjects.length === 0,
    canGenerate: pendingSubjects.length === 0 && allGraded,
    pendingSubjects, // List of subjects whose marks are pending
    totalCredits,
    earnedCredits: allGraded ? earnedCredits : 0,
    sgpa,
    percentage,
    overallGrade,
    overallPass,
    classification,
    totalMarks: allGraded ? grandTotalMarks : null,
    maxMarks: grandMaxMarks > 0 ? grandMaxMarks : null,
    subjectBreakdown
  };
};

// ─────────────────────────────────────────────
// EXAM STAFF: Generate result cards for a class
// ─────────────────────────────────────────────

/**
 * GET /api/results/class-students?classId=&academicTermId=&examType=
 * Lists students in a class with their result summary and pending status.
 */
export const getClassResults = async (req, res) => {
  const { classId, academicTermId, examType = 'FINAL' } = req.query;
  const normExamType = (examType || 'FINAL').toUpperCase();

  if (!classId || !academicTermId) {
    return res.status(400).json({ error: 'classId and academicTermId are required' });
  }

  try {
    const enrollments = await Enrollment.findAll({
      where: { classId, academicTermId },
      attributes: ['studentId'],
      group: ['studentId'],
      raw: true
    });

    const studentIds = enrollments.map(e => e.studentId);

    if (studentIds.length === 0) {
      return res.json({ students: [], academicTermId, classId, examType: normExamType });
    }

    const students = await Student.findAll({
      where: { id: { [Op.in]: studentIds } },
      include: [
        { model: Division, as: 'division', attributes: ['id', 'name'] },
        {
          model: ResultCard,
          as: 'resultCards',
          where: { academicTermId, examType: normExamType },
          required: false,
          attributes: ['id', 'examType', 'totalMarks', 'percentage', 'sgpa', 'processedAt']
        }
      ],
      attributes: ['id', 'name', 'instituteId', 'rollNumber'],
      order: [['rollNumber', 'ASC']]
    });

    // Check pending status for each student
    const result = [];
    for (const s of students) {
      const computed = await computeResultCardForStudent(s.id, academicTermId, normExamType);
      result.push({
        id: s.id,
        name: s.name,
        instituteId: s.instituteId,
        rollNumber: s.rollNumber,
        division: s.division?.name || '—',
        resultCard: s.resultCards?.[0] || null,
        canGenerate: computed?.canGenerate || false,
        pendingSubjects: computed?.pendingSubjects || []
      });
    }

    res.json({ students: result, academicTermId, classId, examType: normExamType });
  } catch (error) {
    console.error('Get class results error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/results/generate
 * Generate (upsert) result cards for all students in a class for a given term and exam series.
 * Body: { classId, academicTermId, examType }
 * STRICT RULE: If ANY subject result is pending for a student, DO NOT generate for that student!
 */
export const generateResultCards = async (req, res) => {
  const { classId, academicTermId, examType = 'FINAL' } = req.body;
  const staffId = req.user.id;
  const normExamType = (examType || 'FINAL').toUpperCase();

  if (!classId || !academicTermId) {
    return res.status(400).json({ error: 'classId and academicTermId are required' });
  }

  try {
    // Get distinct students enrolled in this class & term
    const rawEnrollments = await Enrollment.findAll({
      where: { classId, academicTermId },
      include: [
        { model: Student, as: 'student', attributes: ['id', 'name', 'rollNumber', 'instituteId'] }
      ]
    });

    const studentMap = new Map();
    rawEnrollments.forEach(e => {
      if (e.student && !studentMap.has(e.studentId)) {
        studentMap.set(e.studentId, e.student);
      }
    });

    if (studentMap.size === 0) {
      return res.json({ message: 'No enrolled students found', generated: 0, results: [] });
    }

    const generated = [];
    const skippedPending = [];
    const errors = [];

    for (const [studentId, student] of studentMap.entries()) {
      try {
        const computed = await computeResultCardForStudent(studentId, academicTermId, normExamType);
        if (!computed) continue;

        // RULE: if one subject result is pending then dont generate the result
        if (!computed.canGenerate || (computed.pendingSubjects && computed.pendingSubjects.length > 0)) {
          skippedPending.push({
            studentId,
            studentName: student.name,
            rollNumber: student.rollNumber,
            instituteId: student.instituteId,
            pendingSubjects: computed.pendingSubjects
          });
          continue; // DO NOT PERSIST / GENERATE FOR THIS STUDENT
        }

        const [card, created] = await ResultCard.findOrCreate({
          where: { studentId, academicTermId, examType: normExamType },
          defaults: {
            examType: normExamType,
            totalMarks: computed.totalMarks,
            percentage: computed.percentage,
            sgpa: computed.sgpa,
            processedById: staffId,
            processedAt: new Date()
          }
        });

        if (!created) {
          await card.update({
            totalMarks: computed.totalMarks,
            percentage: computed.percentage,
            sgpa: computed.sgpa,
            processedById: staffId,
            processedAt: new Date()
          });
        }

        generated.push({
          studentId,
          examType: normExamType,
          sgpa: computed.sgpa,
          percentage: computed.percentage,
          overallPass: computed.overallPass,
          subjectsCount: computed.subjectBreakdown.length
        });
      } catch (err) {
        errors.push({ studentId, error: err.message });
      }
    }

    // If NO students generated because all have pending subjects:
    if (generated.length === 0 && skippedPending.length > 0) {
      const allPendingSubjSet = new Set();
      skippedPending.forEach(sp => {
        sp.pendingSubjects.forEach(s => allPendingSubjSet.add(`${s.subjectCode} - ${s.subjectName}`));
      });
      const pendingNames = Array.from(allPendingSubjSet);

      return res.status(400).json({
        error: `Cannot generate ${normExamType} results: ${pendingNames.length} subject(s) have pending results: ${pendingNames.join(', ')}`,
        pendingSubjects: pendingNames,
        skippedCount: skippedPending.length,
        skippedStudents: skippedPending
      });
    }

    res.json({
      message: `Generated ${normExamType} result cards for ${generated.length} student(s).${skippedPending.length > 0 ? ` Skipped ${skippedPending.length} student(s) with pending subjects.` : ''}`,
      examType: normExamType,
      generated: generated.length,
      skippedCount: skippedPending.length,
      skippedStudents: skippedPending,
      results: generated
    });
  } catch (error) {
    console.error('Generate result cards error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/results/student/:studentId?academicTermId=&examType=
 * Get detailed result card for a student.
 * Accessible by ExamStaff (any student) or Student (own).
 */
export const getStudentResultCard = async (req, res) => {
  const user = req.user;
  let { studentId } = req.params;
  const { academicTermId, examType = 'FINAL' } = req.query;
  const normExamType = (examType || 'FINAL').toUpperCase();

  // Normalize studentId
  if (studentId === 'me') {
    if (user.role === 'PARENT') {
      if (req.query.studentId) {
        studentId = req.query.studentId;
      } else {
        const firstLink = await ParentStudent.findOne({ where: { parentId: user.id } });
        if (!firstLink) {
          return res.status(404).json({ error: 'No linked student found for this parent' });
        }
        studentId = firstLink.studentId;
      }
    } else {
      studentId = user.id;
    }
  }

  // Authorization
  if (user.role === 'STUDENT' && studentId !== user.id) {
    return res.status(403).json({ error: 'You can only view your own result card' });
  }

  if (user.role === 'PARENT') {
    const link = await ParentStudent.findOne({ where: { parentId: user.id, studentId } });
    if (!link) return res.status(403).json({ error: 'Unauthorized to view this student\'s result card' });
  }

  try {
    // Resolve academic term
    let termId = academicTermId;
    let term;
    if (!termId) {
      term = await AcademicTerm.findOne({ where: { isCurrent: true } });
      if (!term) return res.status(400).json({ error: 'No active academic term found' });
      termId = term.id;
    } else {
      term = await AcademicTerm.findByPk(termId);
      if (!term) return res.status(404).json({ error: 'Academic term not found' });
    }

    // Get student info
    const student = await Student.findByPk(studentId, {
      include: [
        { model: Division, as: 'division', attributes: ['id', 'name'] },
        { model: Department, as: 'department', attributes: ['id', 'name', 'code'] }
      ],
      attributes: ['id', 'name', 'instituteId', 'rollNumber', 'batchYear', 'departmentId', 'divisionId']
    });

    if (!student) return res.status(404).json({ error: 'Student not found' });

    // Get class from enrollment
    const classEnrollment = await Enrollment.findOne({
      where: { studentId, academicTermId: termId },
      include: [{ model: Class, as: 'class', attributes: ['id', 'name', 'semesterNumber'] }]
    });

    // Compute live result card for this specific examType
    const computed = await computeResultCardForStudent(studentId, termId, normExamType);

    // Fetch persisted ResultCard for this specific examType
    const persistedCard = await ResultCard.findOne({
      where: { studentId, academicTermId: termId, examType: normExamType },
      include: [
        { model: ExamStaff, as: 'processedBy', attributes: ['id', 'name'], required: false }
      ]
    });

    const allTerms = await AcademicTerm.findAll({
      order: [['startDate', 'DESC']],
      attributes: ['id', 'name', 'isCurrent']
    });

    // College & Institution metadata for official headers
    const institute = {
      name: "KOLHAPUR INSTITUTE OF TECHNOLOGY'S COLLEGE OF ENGINEERING (AUTONOMOUS)",
      shortName: 'KITCoEK (Autonomous)',
      affiliation: 'An Autonomous Institute Permanently Affiliated to Shivaji University, Kolhapur',
      accreditation: "Approved by AICTE New Delhi • Recognized by Govt. of Maharashtra • Accredited by NAAC with 'A+' Grade",
      address: 'Gokul Shirgaon, Kolhapur - 416234, Maharashtra, India',
      examOffice: 'OFFICE OF THE CONTROLLER OF EXAMINATIONS',
      documentTitle: `${normExamType} STATEMENT OF GRADES & MARKS / ${normExamType} GRADE REPORT`,
      website: 'www.kitcoek.in',
      phone: '+91 231 2638141'
    };

    const statementNumber = `KIT/AUT/${normExamType}-SG-${(term.name || 'TERM').replace(/\s+/g, '')}/${student.rollNumber || student.instituteId || student.id.slice(0, 6)}`;
    const declarationDate = persistedCard?.processedAt || new Date();

    res.json({
      institute,
      statementNumber,
      declarationDate,
      examType: normExamType,
      student: {
        id: student.id,
        name: student.name,
        instituteId: student.instituteId,
        rollNumber: student.rollNumber,
        batchYear: student.batchYear,
        division: student.division?.name || '—',
        department: student.department?.name || '—',
        departmentCode: student.department?.code || '',
        class: classEnrollment?.class?.name || '—',
        semesterNumber: classEnrollment?.class?.semesterNumber || null
      },
      academicTerm: {
        id: term.id,
        name: term.name
      },
      allTerms,
      computed,
      persistedCard: persistedCard ? {
        id: persistedCard.id,
        examType: persistedCard.examType,
        totalMarks: persistedCard.totalMarks,
        percentage: persistedCard.percentage,
        sgpa: persistedCard.sgpa,
        processedAt: persistedCard.processedAt,
        processedBy: persistedCard.processedBy?.name || null
      } : null
    });
  } catch (error) {
    console.error('Get student result card error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/results/my-result?academicTermId=&examType=
 * Student's own result card (alias for /student/me).
 */
export const getMyResultCard = async (req, res) => {
  req.params = { studentId: 'me' };
  return getStudentResultCard(req, res);
};

/**
 * GET /api/results/classes?academicTermId=&examType=
 * List classes with result card generation status for selected exam series.
 * For ExamStaff to pick a class.
 */
export const getClassesForResultGeneration = async (req, res) => {
  const { academicTermId, examType = 'FINAL' } = req.query;
  const normExamType = (examType || 'FINAL').toUpperCase();

  try {
    let termId = academicTermId;
    if (!termId) {
      const term = await AcademicTerm.findOne({ where: { isCurrent: true } });
      if (!term) return res.json({ classes: [], terms: [] });
      termId = term.id;
    }

    const terms = await AcademicTerm.findAll({
      order: [['startDate', 'DESC']],
      attributes: ['id', 'name', 'isCurrent']
    });

    // Get all classes that have enrollments in this term
    const enrollments = await Enrollment.findAll({
      where: { academicTermId: termId },
      attributes: ['classId'],
      group: ['classId'],
      raw: true
    });

    const classIds = enrollments.map(e => e.classId);

    if (classIds.length === 0) {
      return res.json({ classes: [], terms });
    }

    const classes = await Class.findAll({
      where: { id: { [Op.in]: classIds } },
      include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }],
      attributes: ['id', 'name', 'semesterNumber', 'batchYear', 'departmentId'],
      order: [['name', 'ASC']]
    });

    // Get count of result cards already generated per class for this term & examType
    const studentsPerClass = await Enrollment.findAll({
      where: { academicTermId: termId, classId: { [Op.in]: classIds } },
      attributes: ['classId', 'studentId'],
      group: ['classId', 'studentId'],
      raw: true
    });

    const studentsByClass = {};
    studentsPerClass.forEach(e => {
      if (!studentsByClass[e.classId]) studentsByClass[e.classId] = new Set();
      studentsByClass[e.classId].add(e.studentId);
    });

    const resultCards = await ResultCard.findAll({
      where: { academicTermId: termId, examType: normExamType },
      attributes: ['studentId']
    });

    // Map result cards by studentId
    const rcByStudentId = {};
    resultCards.forEach(rc => {
      rcByStudentId[rc.studentId] = true;
    });

    const classData = classes.map(cls => {
      const totalStudents = studentsByClass[cls.id]?.size || 0;
      const studentArr = [...(studentsByClass[cls.id] || [])];
      const generatedCount = studentArr.filter(sid => rcByStudentId[sid]).length;

      return {
        id: cls.id,
        name: cls.name,
        semesterNumber: cls.semesterNumber,
        batchYear: cls.batchYear,
        department: cls.department?.name || '—',
        departmentId: cls.departmentId,
        totalStudents,
        generatedCount,
        examType: normExamType,
        status: generatedCount === 0 ? 'NOT_GENERATED' : generatedCount < totalStudents ? 'PARTIAL' : 'COMPLETE'
      };
    });

    res.json({ classes: classData, terms, academicTermId: termId, examType: normExamType });
  } catch (error) {
    console.error('Get classes for result generation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
