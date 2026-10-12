import sequelize from '../config/database.js';
import { 
  SubjectAllocation, 
  Subject, 
  Class, 
  Division, 
  Student, 
  Enrollment, 
  AssessmentComponent, 
  ComponentMark, 
  SubjectResult, 
  AcademicTerm,
  ParentStudent
} from '../models/index.js';
import { computeSubjectResult } from '../services/subjectResultService.js';
import { Op } from 'sequelize';

/**
 * Fetch subjects allocated to the logged-in teacher.
 */
export const getTeacherAllocatedSubjects = async (req, res) => {
  const teacherId = req.user.id;

  try {
    const allocations = await SubjectAllocation.findAll({
      where: { teacherId },
      include: [
        {
          model: Subject,
          as: 'subject',
          include: [
            {
              model: AssessmentComponent,
              as: 'assessmentComponents',
              attributes: ['id', 'name', 'maxMarks', 'category', 'entryMethod', 'sequenceOrder']
            }
          ]
        },
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'name', 'semesterNumber', 'batchYear', 'departmentId']
        },
        {
          model: Division,
          as: 'division',
          attributes: ['id', 'name']
        }
      ],
      order: [
        ['createdAt', 'DESC'],
        [{ model: Subject, as: 'subject' }, { model: AssessmentComponent, as: 'assessmentComponents' }, 'sequenceOrder', 'ASC']
      ]
    });

    res.json(allocations);
  } catch (error) {
    console.error('Get teacher allocated subjects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Fetch marks-entry grid data for a specific subject (and optional division).
 */
export const getMarksGrid = async (req, res) => {
  const { subjectId, divisionId } = req.query;
  const user = req.user;

  if (!subjectId) {
    return res.status(400).json({ error: 'subjectId is required' });
  }

  try {
    // 1. Fetch Subject and Assessment Components
    const subject = await Subject.findByPk(subjectId, {
      include: [
        {
          model: AssessmentComponent,
          as: 'assessmentComponents',
          attributes: ['id', 'name', 'maxMarks', 'category', 'entryMethod', 'sequenceOrder']
        },
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'name', 'semesterNumber', 'batchYear', 'departmentId']
        }
      ],
      order: [
        [{ model: AssessmentComponent, as: 'assessmentComponents' }, 'sequenceOrder', 'ASC']
      ]
    });

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    // 2. Fetch current active academic term
    const currentTerm = await AcademicTerm.findOne({ where: { isCurrent: true } });
    if (!currentTerm) {
      return res.status(400).json({ error: 'No active academic term configured' });
    }

    // 3. Authorization check
    if (user.role === 'TEACHER') {
      const allocation = await SubjectAllocation.findOne({
        where: { teacherId: user.id, subjectId }
      });
      if (!allocation) {
        return res.status(403).json({ error: 'You are not allocated to teach this subject' });
      }
    } else if (user.role === 'DEPARTMENT_ADMIN') {
      if (subject.departmentId !== user.departmentId) {
        return res.status(403).json({ error: 'Unauthorized to view marks for this department' });
      }
    }

    // 4. Student filter (by division if provided)
    const studentWhere = {};
    if (divisionId) {
      studentWhere.divisionId = divisionId;
    }

    // 5. Fetch all active enrollments for this subject
    const enrollments = await Enrollment.findAll({
      where: {
        subjectId,
        academicTermId: currentTerm.id,
        status: { [Op.in]: ['ENROLLED', 'PASSED', 'FAILED'] }
      },
      include: [
        {
          model: Student,
          as: 'student',
          where: studentWhere,
          attributes: ['id', 'instituteId', 'rollNumber', 'name', 'email', 'divisionId'],
          include: [
            {
              model: Division,
              as: 'division',
              attributes: ['id', 'name']
            }
          ]
        },
        {
          model: ComponentMark,
          as: 'componentMarks',
          attributes: ['id', 'componentId', 'marksObtained', 'enteredAt', 'enteredById']
        },
        {
          model: SubjectResult,
          as: 'subjectResult',
          attributes: ['id', 'totalMarksObtained', 'totalMaxMarks', 'isPass', 'computedAt']
        }
      ],
      order: [
        [{ model: Student, as: 'student' }, 'rollNumber', 'ASC']
      ]
    });

    // 6. Map into grid rows
    const rows = enrollments.map(enr => {
      const marksMap = {};
      enr.componentMarks?.forEach(cm => {
        marksMap[cm.componentId] = cm.marksObtained;
      });

      return {
        enrollmentId: enr.id,
        studentId: enr.student.id,
        rollNumber: enr.student.rollNumber,
        instituteId: enr.student.instituteId,
        studentName: enr.student.name,
        divisionName: enr.student.division?.name || '—',
        attemptNumber: enr.attemptNumber,
        marks: marksMap,
        subjectResult: enr.subjectResult ? {
          totalMarksObtained: enr.subjectResult.totalMarksObtained,
          totalMaxMarks: enr.subjectResult.totalMaxMarks,
          isPass: enr.subjectResult.isPass,
          computedAt: enr.subjectResult.computedAt
        } : null
      };
    });

    res.json({
      subject: {
        id: subject.id,
        name: subject.name,
        code: subject.code,
        credits: subject.credits,
        components: subject.assessmentComponents || []
      },
      currentTerm: {
        id: currentTerm.id,
        name: currentTerm.name
      },
      rows
    });
  } catch (error) {
    console.error('Get marks grid error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Save marks for students per component (supports keyboard grid bulk/partial saving).
 */
export const saveMarks = async (req, res) => {
  const { subjectId, marks } = req.body; // marks: [{ enrollmentId, componentId, marksObtained }]
  const user = req.user;

  if (!subjectId || !Array.isArray(marks) || marks.length === 0) {
    return res.status(400).json({ error: 'subjectId and an array of marks entries are required' });
  }

  // Verify authorization: Teachers cannot directly edit continuous assessment marks
  if (user.role === 'TEACHER') {
    return res.status(403).json({ 
      error: 'Direct editing of Continuous Assessment marks is prohibited. Teachers must evaluate marks through Official Examination Evaluation (MSE & ESE). Marks will be added to Continuous Assessment once verified by the Exam Cell.' 
    });
  }

  // Pre-load components for this subject to validate maxMarks
  const components = await AssessmentComponent.findAll({
    where: { subjectId },
    attributes: ['id', 'name', 'maxMarks']
  });
  const compMap = new Map();
  components.forEach(c => compMap.set(c.id, c));

  // Validate all marks before starting transaction
  for (const item of marks) {
    const comp = compMap.get(item.componentId);
    if (!comp) {
      return res.status(400).json({ error: `Invalid component ID: ${item.componentId}` });
    }
    if (item.marksObtained !== null && item.marksObtained !== undefined && item.marksObtained !== '') {
      const num = Number(item.marksObtained);
      if (isNaN(num) || num < 0) {
        return res.status(400).json({ error: `Marks cannot be negative for component '${comp.name}'` });
      }
      if (num > comp.maxMarks) {
        return res.status(400).json({ 
          error: `Marks obtained (${num}) cannot exceed max marks (${comp.maxMarks}) for component '${comp.name}'` 
        });
      }
    }
  }

  const t = await sequelize.transaction();

  try {
    const updatedEnrollmentIds = new Set();

    for (const item of marks) {
      const { enrollmentId, componentId } = item;
      const rawVal = item.marksObtained;
      const marksObtained = (rawVal === '' || rawVal === null || rawVal === undefined) 
        ? null 
        : Number(rawVal);

      const [compMark, created] = await ComponentMark.findOrCreate({
        where: { componentId, enrollmentId },
        defaults: {
          marksObtained,
          enteredById: user.id,
          enteredAt: new Date()
        },
        transaction: t
      });

      if (!created) {
        await compMark.update({
          marksObtained,
          enteredById: user.id,
          enteredAt: new Date()
        }, { transaction: t });
      }

      updatedEnrollmentIds.add(enrollmentId);
    }

    // Recompute SubjectResults for all modified enrollments (Rule 24, Flow 10 Step 5)
    const computedResults = [];
    for (const enrId of updatedEnrollmentIds) {
      const resObj = await computeSubjectResult(enrId, t);
      if (resObj) computedResults.push(resObj);
    }

    await t.commit();

    res.json({
      message: `Successfully saved marks for ${marks.length} record(s).`,
      savedCount: marks.length,
      computedResults
    });
  } catch (error) {
    if (!t.finished) await t.rollback();
    console.error('Save marks error:', error);
    res.status(500).json({ error: error.message || 'Internal server error while saving marks' });
  }
};

/**
 * Student and Parent view of component marks and subject results.
 */
export const getStudentMarks = async (req, res) => {
  const user = req.user;
  let studentId = req.query.studentId || user.id;

  try {
    if (user.role === 'PARENT') {
      if (!req.query.studentId) {
        // Fetch first linked child
        const link = await ParentStudent.findOne({ where: { parentId: user.id } });
        if (!link) {
          return res.status(404).json({ error: 'No student linked to this parent account' });
        }
        studentId = link.studentId;
      } else {
        // Verify link
        const link = await ParentStudent.findOne({
          where: { parentId: user.id, studentId: req.query.studentId }
        });
        if (!link) {
          return res.status(403).json({ error: 'Unauthorized to view marks for this student' });
        }
      }
    } else if (user.role === 'STUDENT') {
      studentId = user.id;
    }

    const currentTerm = await AcademicTerm.findOne({ where: { isCurrent: true } });

    const enrollments = await Enrollment.findAll({
      where: {
        studentId,
        ...(currentTerm ? { academicTermId: currentTerm.id } : {})
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
          as: 'subjectResult',
          attributes: ['id', 'totalMarksObtained', 'totalMaxMarks', 'isPass', 'computedAt']
        },
        {
          model: AcademicTerm,
          as: 'academicTerm',
          attributes: ['id', 'name']
        }
      ],
      order: [
        [{ model: Subject, as: 'subject' }, 'name', 'ASC'],
        [{ model: Subject, as: 'subject' }, { model: AssessmentComponent, as: 'assessmentComponents' }, 'sequenceOrder', 'ASC']
      ]
    });

    const subjectsData = enrollments.map(enr => {
      const markMap = new Map();
      enr.componentMarks?.forEach(cm => {
        markMap.set(cm.componentId, cm.marksObtained);
      });

      const components = (enr.subject?.assessmentComponents || []).map(comp => {
        const marksObtained = markMap.has(comp.id) ? markMap.get(comp.id) : null;
        const maxMarks = Number(comp.maxMarks);
        const percentage = marksObtained !== null && maxMarks > 0 
          ? Number(((marksObtained / maxMarks) * 100).toFixed(1)) 
          : null;

        return {
          id: comp.id,
          name: comp.name,
          category: comp.category,
          maxMarks,
          marksObtained,
          percentage
        };
      });

      return {
        enrollmentId: enr.id,
        subjectId: enr.subject?.id,
        subjectName: enr.subject?.name,
        subjectCode: enr.subject?.code,
        subjectType: enr.subject?.subjectType,
        credits: enr.subject?.credits,
        attemptNumber: enr.attemptNumber,
        enrollmentStatus: enr.status,
        components,
        subjectResult: enr.subjectResult ? {
          totalMarksObtained: enr.subjectResult.totalMarksObtained,
          totalMaxMarks: enr.subjectResult.totalMaxMarks,
          percentage: enr.subjectResult.totalMaxMarks > 0 
            ? Number(((enr.subjectResult.totalMarksObtained / enr.subjectResult.totalMaxMarks) * 100).toFixed(2)) 
            : 0,
          isPass: enr.subjectResult.isPass,
          computedAt: enr.subjectResult.computedAt
        } : null
      };
    });

    res.json({
      studentId,
      academicTerm: currentTerm ? currentTerm.name : null,
      subjects: subjectsData
    });
  } catch (error) {
    console.error('Get student marks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
