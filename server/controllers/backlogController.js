import { 
  Enrollment, 
  Subject, 
  Class, 
  Student, 
  AcademicTerm, 
  Department, 
  SubjectAllocation, 
  Teacher, 
  Division,
  sequelize 
} from '../models/index.js';
import { Op } from 'sequelize';

/**
 * =====================================================================
 * BACKLOG CONTROLLER — PHASE 12 (Flows 11a, Rules 6, 7, 8, 9)
 * =====================================================================
 * Rule 6: Student can have multiple concurrent enrollments across terms.
 * Rule 7: attemptNumber distinguishes first attempts from re-attempts.
 * Rule 8: When a student fails, DO NOT mutate existing row. Keep status = 'FAILED',
 *         create a NEW Enrollment row for the re-attempt term with attemptNumber + 1.
 * Rule 9: Re-attempt students attend alongside junior batches; session/attendance
 *         queries filter by (subjectId, termId) enrollments, not by batch.
 * =====================================================================
 */

/**
 * GET /api/backlogs/failed-enrollments
 * Query: ?academicTermId=&departmentId=&classId=&targetTermId=&search=
 * Returns list of failed enrollments eligible for re-attempt creation.
 */
export const getFailedEnrollments = async (req, res) => {
  const { academicTermId, departmentId, classId, targetTermId, search } = req.query;

  try {
    const whereClause = {
      status: 'FAILED'
    };

    if (academicTermId) {
      whereClause.academicTermId = academicTermId;
    }

    if (classId) {
      whereClause.classId = classId;
    }

    const studentWhere = {};
    if (departmentId) {
      studentWhere.departmentId = departmentId;
    }
    if (search && search.trim()) {
      const q = search.trim();
      studentWhere[Op.or] = [
        { name: { [Op.iLike]: `%${q}%` } },
        { instituteId: { [Op.iLike]: `%${q}%` } },
        { rollNumber: { [Op.iLike]: `%${q}%` } }
      ];
    }

    const failedEnrollments = await Enrollment.findAll({
      where: whereClause,
      include: [
        {
          model: Student,
          as: 'student',
          where: Object.keys(studentWhere).length > 0 ? studentWhere : undefined,
          attributes: ['id', 'name', 'instituteId', 'rollNumber', 'batchYear', 'departmentId'],
          include: [
            { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
            { model: Division, as: 'division', attributes: ['id', 'name'] }
          ]
        },
        {
          model: Subject,
          as: 'subject',
          attributes: ['id', 'name', 'code', 'credits', 'subjectType']
        },
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'name', 'batchYear', 'semesterNumber']
        },
        {
          model: AcademicTerm,
          as: 'academicTerm',
          attributes: ['id', 'name', 'isCurrent']
        }
      ],
      order: [
        [{ model: Student, as: 'student' }, 'rollNumber', 'ASC'],
        ['createdAt', 'DESC']
      ]
    });

    // Check if each failed enrollment already has a re-attempt in targetTermId or later terms
    const targetTerm = targetTermId 
      ? await AcademicTerm.findByPk(targetTermId)
      : await AcademicTerm.findOne({ where: { isCurrent: true } });

    const results = [];
    for (const enr of failedEnrollments) {
      // Check if student subsequently enrolled or passed this subject
      const laterEnrollments = await Enrollment.findAll({
        where: {
          studentId: enr.studentId,
          subjectId: enr.subjectId,
          attemptNumber: { [Op.gt]: enr.attemptNumber }
        },
        include: [{ model: AcademicTerm, as: 'academicTerm', attributes: ['id', 'name'] }]
      });

      const hasPassedLater = laterEnrollments.some(e => e.status === 'PASSED');
      const targetTermEnrollment = targetTerm 
        ? laterEnrollments.find(e => e.academicTermId === targetTerm.id)
        : null;

      // Check if teacher is allocated for this subject in target term (T12.3 preview)
      let teacherAllocated = null;
      if (targetTerm) {
        const allocation = await SubjectAllocation.findOne({
          where: { subjectId: enr.subjectId },
          include: [{ model: Teacher, as: 'teacher', attributes: ['id', 'name', 'instituteId'] }]
        });
        teacherAllocated = allocation ? allocation.teacher : null;
      }

      results.push({
        id: enr.id,
        studentId: enr.studentId,
        studentName: enr.student?.name,
        instituteId: enr.student?.instituteId,
        rollNumber: enr.student?.rollNumber,
        departmentName: enr.student?.department?.name,
        divisionName: enr.student?.division?.name || '—',
        subjectId: enr.subjectId,
        subjectName: enr.subject?.name,
        subjectCode: enr.subject?.code,
        credits: enr.subject?.credits,
        subjectType: enr.subject?.subjectType,
        originalClassId: enr.classId,
        originalClassName: enr.class?.name,
        originalBatchYear: enr.class?.batchYear,
        originalSemesterNumber: enr.class?.semesterNumber,
        failedTermId: enr.academicTermId,
        failedTermName: enr.academicTerm?.name,
        attemptNumber: enr.attemptNumber,
        status: enr.status,
        nextAttemptNumber: enr.attemptNumber + 1,
        hasPassedLater,
        alreadyEnrolledInTargetTerm: !!targetTermEnrollment,
        targetTermEnrollmentId: targetTermEnrollment?.id || null,
        targetTermEnrollmentStatus: targetTermEnrollment?.status || null,
        teacherAllocatedInNewTerm: !!teacherAllocated,
        allocatedTeacherName: teacherAllocated?.name || null
      });
    }

    res.json({
      totalFailed: results.length,
      targetTerm: targetTerm ? { id: targetTerm.id, name: targetTerm.name } : null,
      failedEnrollments: results
    });

  } catch (error) {
    console.error('Get failed enrollments error:', error);
    res.status(500).json({ error: 'Internal server error while fetching backlog candidates' });
  }
};

/**
 * POST /api/backlogs/create-reattempts
 * Body: { targetAcademicTermId, enrollmentIds: [...] }
 * T12.2: Create re-attempt enrollments for the next term (attemptNumber + 1, original class/subject).
 */
export const createReattemptEnrollments = async (req, res) => {
  const { targetAcademicTermId, enrollmentIds } = req.body;

  if (!targetAcademicTermId) {
    return res.status(400).json({ error: 'targetAcademicTermId is required' });
  }

  if (!Array.isArray(enrollmentIds) || enrollmentIds.length === 0) {
    return res.status(400).json({ error: 'enrollmentIds array is required and must not be empty' });
  }

  const t = await sequelize.transaction();

  try {
    // 1. Verify target academic term exists
    const targetTerm = await AcademicTerm.findByPk(targetAcademicTermId, { transaction: t });
    if (!targetTerm) {
      await t.rollback();
      return res.status(404).json({ error: 'Target academic term not found' });
    }

    // 2. Fetch the requested failed enrollments
    const sourceEnrollments = await Enrollment.findAll({
      where: {
        id: { [Op.in]: enrollmentIds }
      },
      include: [
        { model: Student, as: 'student', attributes: ['id', 'name', 'instituteId', 'rollNumber'] },
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code', 'credits'] },
        { model: Class, as: 'class', attributes: ['id', 'name', 'batchYear', 'semesterNumber'] }
      ],
      transaction: t
    });

    if (sourceEnrollments.length === 0) {
      await t.rollback();
      return res.status(404).json({ error: 'No matching enrollments found for the provided IDs' });
    }

    const createdEnrollments = [];
    const skippedEnrollments = [];

    for (const source of sourceEnrollments) {
      // Must be in FAILED status
      if (source.status !== 'FAILED') {
        skippedEnrollments.push({
          enrollmentId: source.id,
          studentName: source.student?.name,
          subjectCode: source.subject?.code,
          reason: `Enrollment status is '${source.status}', not 'FAILED'. Only failed subjects require re-attempt enrollment.`
        });
        continue;
      }

      // Check if student already passed this subject on a subsequent attempt
      const passedAttempt = await Enrollment.findOne({
        where: {
          studentId: source.studentId,
          subjectId: source.subjectId,
          status: 'PASSED'
        },
        transaction: t
      });

      if (passedAttempt) {
        skippedEnrollments.push({
          enrollmentId: source.id,
          studentName: source.student?.name,
          subjectCode: source.subject?.code,
          reason: `Student already passed this subject on attempt ${passedAttempt.attemptNumber}.`
        });
        continue;
      }

      // Check if an enrollment already exists for this subject in the target term
      const existingInTargetTerm = await Enrollment.findOne({
        where: {
          studentId: source.studentId,
          subjectId: source.subjectId,
          academicTermId: targetAcademicTermId
        },
        transaction: t
      });

      if (existingInTargetTerm) {
        skippedEnrollments.push({
          enrollmentId: source.id,
          studentName: source.student?.name,
          subjectCode: source.subject?.code,
          reason: `Student already has an active enrollment (attempt ${existingInTargetTerm.attemptNumber}) in target term '${targetTerm.name}'.`
        });
        continue;
      }

      // Calculate next attempt number (Rule 8: incremented attempt_number)
      const nextAttemptNumber = Number(source.attemptNumber || 1) + 1;

      // Rule 8: Never mutate existing row. Insert NEW row for re-attempt term
      // pointing to the original classId to preserve curriculum version
      const newEnrollment = await Enrollment.create({
        studentId: source.studentId,
        subjectId: source.subjectId,
        classId: source.classId, // Original curriculum class version preserved
        academicTermId: targetAcademicTermId,
        attemptNumber: nextAttemptNumber,
        status: 'ENROLLED'
      }, { transaction: t });

      createdEnrollments.push({
        id: newEnrollment.id,
        studentId: source.studentId,
        studentName: source.student?.name,
        instituteId: source.student?.instituteId,
        subjectId: source.subjectId,
        subjectName: source.subject?.name,
        subjectCode: source.subject?.code,
        originalClassId: source.classId,
        originalClassName: source.class?.name,
        targetAcademicTermId,
        targetTermName: targetTerm.name,
        previousAttemptNumber: source.attemptNumber,
        newAttemptNumber: nextAttemptNumber,
        status: newEnrollment.status
      });
    }

    await t.commit();

    res.status(201).json({
      message: `Successfully created ${createdEnrollments.length} re-attempt enrollment(s) in '${targetTerm.name}'.`,
      targetTerm: { id: targetTerm.id, name: targetTerm.name },
      createdCount: createdEnrollments.length,
      skippedCount: skippedEnrollments.length,
      createdEnrollments,
      skippedEnrollments
    });

  } catch (error) {
    await t.rollback();
    console.error('Create re-attempt enrollments error:', error);
    res.status(500).json({ error: error.message || 'Internal server error while creating re-attempt enrollments' });
  }
};

/**
 * GET /api/backlogs/student/:studentId
 * Returns complete backlog profile for a student (Rules 6, 7, 8).
 */
export const getStudentBacklogs = async (req, res) => {
  const { studentId } = req.params;

  try {
    const student = await Student.findByPk(studentId, {
      attributes: ['id', 'name', 'instituteId', 'rollNumber', 'batchYear'],
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
        { model: Division, as: 'division', attributes: ['id', 'name'] }
      ]
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Find all enrollments for this student where attemptNumber > 1 OR status === 'FAILED'
    const enrollments = await Enrollment.findAll({
      where: {
        studentId,
        [Op.or]: [
          { status: 'FAILED' },
          { attemptNumber: { [Op.gt]: 1 } }
        ]
      },
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code', 'credits', 'subjectType'] },
        { model: Class, as: 'class', attributes: ['id', 'name', 'semesterNumber'] },
        { model: AcademicTerm, as: 'academicTerm', attributes: ['id', 'name', 'isCurrent'] }
      ],
      order: [
        ['subjectId', 'ASC'],
        ['attemptNumber', 'ASC']
      ]
    });

    // Group by subject
    const subjectMap = new Map();
    enrollments.forEach(enr => {
      if (!subjectMap.has(enr.subjectId)) {
        subjectMap.set(enr.subjectId, {
          subject: enr.subject,
          originalClass: enr.class,
          attempts: []
        });
      }
      subjectMap.get(enr.subjectId).attempts.push({
        id: enr.id,
        term: enr.academicTerm?.name,
        termId: enr.academicTermId,
        isCurrentTerm: enr.academicTerm?.isCurrent,
        attemptNumber: enr.attemptNumber,
        status: enr.status,
        createdAt: enr.createdAt
      });
    });

    const backlogs = Array.from(subjectMap.values()).map(item => {
      const latestAttempt = item.attempts[item.attempts.length - 1];
      const isCleared = item.attempts.some(a => a.status === 'PASSED');
      return {
        subject: item.subject,
        originalClass: item.originalClass,
        isCleared,
        currentStatus: latestAttempt.status,
        latestAttemptNumber: latestAttempt.attemptNumber,
        latestAttemptId: latestAttempt.id,
        latestTerm: latestAttempt.term,
        attempts: item.attempts
      };
    });

    res.json({
      student,
      totalBacklogSubjects: backlogs.length,
      activeBacklogsCount: backlogs.filter(b => !b.isCleared).length,
      clearedBacklogsCount: backlogs.filter(b => b.isCleared).length,
      backlogs
    });

  } catch (error) {
    console.error('Get student backlogs error:', error);
    res.status(500).json({ error: 'Internal server error while fetching student backlogs' });
  }
};
