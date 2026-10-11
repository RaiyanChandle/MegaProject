import { 
  Exam, 
  Subject, 
  Class, 
  AcademicTerm, 
  AssessmentComponent, 
  ExamStaff, 
  Department,
  ExamResult,
  HallTicket,
  QuestionPaper,
  sequelize 
} from '../models/index.js';
import { EXAM_TYPES } from '../models/constants.js';
import { Op } from 'sequelize';

/**
 * Schedule a new Exam (Exam Staff or Super Admin)
 */
export const createExam = async (req, res) => {
  const {
    subjectId,
    classId,
    academicTermId,
    componentId,
    examType = 'FINAL',
    examDate,
    maxMarks,
    passingMarks
  } = req.body;

  // Basic validation
  if (!subjectId || !classId || !academicTermId) {
    return res.status(400).json({ error: 'Subject, Class, and Academic Term are required' });
  }

  if (maxMarks === undefined || maxMarks === null || isNaN(Number(maxMarks)) || Number(maxMarks) <= 0) {
    return res.status(400).json({ error: 'Max Marks must be a positive number greater than 0' });
  }

  if (passingMarks === undefined || passingMarks === null || isNaN(Number(passingMarks)) || Number(passingMarks) < 0) {
    return res.status(400).json({ error: 'Passing Marks must be a non-negative number' });
  }

  const numMaxMarks = Number(maxMarks);
  const numPassingMarks = Number(passingMarks);

  if (numPassingMarks > numMaxMarks) {
    return res.status(400).json({ error: 'Passing marks cannot be greater than maximum marks (total marks)' });
  }

  if (!EXAM_TYPES.includes(examType)) {
    return res.status(400).json({ error: `Invalid exam type. Must be one of: ${EXAM_TYPES.join(', ')}` });
  }

  try {
    // Verify subject exists
    const subject = await Subject.findByPk(subjectId);
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    // Verify class exists
    const classRecord = await Class.findByPk(classId);
    if (!classRecord) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Verify academic term exists
    const term = await AcademicTerm.findByPk(academicTermId);
    if (!term) {
      return res.status(404).json({ error: 'Academic term not found' });
    }

    // If componentId is provided, verify it exists and belongs to the subject
    let component = null;
    if (componentId) {
      component = await AssessmentComponent.findOne({
        where: { id: componentId, subjectId }
      });
      if (!component) {
        return res.status(400).json({ 
          error: 'Assessment component not found or does not belong to the selected subject' 
        });
      }
    }

    // Check for duplicate exam schedule
    const duplicateWhere = {
      subjectId,
      classId,
      academicTermId,
      examType
    };
    if (componentId) {
      duplicateWhere.componentId = componentId;
    }

    const existingExam = await Exam.findOne({ where: duplicateWhere });
    if (existingExam) {
      return res.status(400).json({
        error: `An exam for this subject, class, and term with type '${examType}' already exists.`
      });
    }

    // Resolve AssessmentComponent: If componentId is null/empty, resolve or create one for this exam
    let resolvedComponentId = componentId || null;
    if (!resolvedComponentId) {
      const compName = examType === 'MIDTERM' 
        ? 'Mid Sem Exam' 
        : examType === 'FINAL' 
          ? 'End Sem Exam' 
          : `${examType.charAt(0) + examType.slice(1).toLowerCase()} Exam`;

      let comp = await AssessmentComponent.findOne({
        where: { subjectId, name: compName }
      });
      if (!comp) {
        comp = await AssessmentComponent.findOne({
          where: { subjectId }
        });
      }
      if (!comp) {
        comp = await AssessmentComponent.create({
          subjectId,
          name: compName,
          maxMarks: numMaxMarks,
          category: (examType === 'INTERNAL' || examType === 'PRACTICAL') ? 'INTERNAL' : 'EXTERNAL',
          entryMethod: 'FORMAL_EXAM',
          sequenceOrder: 1
        });
      }
      resolvedComponentId = comp.id;
    }

    // Create exam
    const scheduledById = req.user?.id || null;
    const exam = await Exam.create({
      subjectId,
      classId,
      academicTermId,
      componentId: resolvedComponentId,
      examType,
      examDate: examDate ? new Date(examDate) : null,
      maxMarks: numMaxMarks,
      passingMarks: numPassingMarks,
      scheduledById
    });

    // Fetch full exam with relations
    const fullExam = await Exam.findByPk(exam.id, {
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code', 'subjectType'] },
        { 
          model: Class, 
          as: 'class', 
          attributes: ['id', 'batchYear', 'semesterNumber'],
          include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
        },
        { model: AcademicTerm, as: 'academicTerm', attributes: ['id', 'name', 'isCurrent'] },
        { model: AssessmentComponent, as: 'assessmentComponent', attributes: ['id', 'name', 'category', 'maxMarks'] },
        { model: ExamStaff, as: 'scheduledBy', attributes: ['id', 'name', 'instituteId'] }
      ]
    });

    res.status(201).json(fullExam);
  } catch (error) {
    console.error('Create Exam error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * List Exams with filtering
 */
export const getExams = async (req, res) => {
  const { 
    academicTermId, 
    classId, 
    departmentId, 
    subjectId, 
    examType,
    search 
  } = req.query;

  try {
    const where = {};
    if (academicTermId) where.academicTermId = academicTermId;
    if (classId) where.classId = classId;
    if (subjectId) where.subjectId = subjectId;
    if (examType) where.examType = examType;

    const classWhere = {};
    if (departmentId) {
      classWhere.departmentId = departmentId;
    }

    const subjectWhere = {};
    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      subjectWhere[Op.or] = [
        sequelize.where(sequelize.fn('lower', sequelize.col('subject.name')), { [Op.like]: q }),
        sequelize.where(sequelize.fn('lower', sequelize.col('subject.code')), { [Op.like]: q })
      ];
    }

    const exams = await Exam.findAll({
      where,
      include: [
        { 
          model: Subject, 
          as: 'subject', 
          where: Object.keys(subjectWhere).length > 0 ? subjectWhere : undefined,
          attributes: ['id', 'name', 'code', 'subjectType', 'departmentId'] 
        },
        { 
          model: Class, 
          as: 'class', 
          where: Object.keys(classWhere).length > 0 ? classWhere : undefined,
          attributes: ['id', 'batchYear', 'semesterNumber', 'departmentId'],
          include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
        },
        { model: AcademicTerm, as: 'academicTerm', attributes: ['id', 'name', 'isCurrent'] },
        { model: AssessmentComponent, as: 'assessmentComponent', attributes: ['id', 'name', 'category', 'maxMarks'] },
        { model: ExamStaff, as: 'scheduledBy', attributes: ['id', 'name', 'instituteId'] }
      ],
      order: [
        ['examDate', 'ASC'],
        ['createdAt', 'DESC']
      ]
    });

    res.json(exams);
  } catch (error) {
    console.error('Get Exams error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get single Exam by ID with counts
 */
export const getExamById = async (req, res) => {
  const { id } = req.params;

  try {
    const exam = await Exam.findByPk(id, {
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code', 'subjectType', 'departmentId'] },
        { 
          model: Class, 
          as: 'class', 
          attributes: ['id', 'batchYear', 'semesterNumber', 'departmentId'],
          include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
        },
        { model: AcademicTerm, as: 'academicTerm', attributes: ['id', 'name', 'isCurrent', 'startDate', 'endDate'] },
        { model: AssessmentComponent, as: 'assessmentComponent', attributes: ['id', 'name', 'category', 'maxMarks'] },
        { model: ExamStaff, as: 'scheduledBy', attributes: ['id', 'name', 'instituteId', 'email'] },
        { model: QuestionPaper, as: 'questionPapers' }
      ]
    });

    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const [resultsCount, hallTicketsCount] = await Promise.all([
      ExamResult.count({ where: { examId: id } }),
      HallTicket.count({ where: { examId: id } })
    ]);

    const examData = exam.toJSON();
    examData.resultsCount = resultsCount;
    examData.hallTicketsCount = hallTicketsCount;

    res.json(examData);
  } catch (error) {
    console.error('Get Exam by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update Exam
 */
export const updateExam = async (req, res) => {
  const { id } = req.params;
  const {
    componentId,
    examType,
    examDate,
    maxMarks,
    passingMarks
  } = req.body;

  try {
    const exam = await Exam.findByPk(id);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    // Check if results or hall tickets already exist before mutating marks/type
    const [resultsCount] = await Promise.all([
      ExamResult.count({ where: { examId: id } })
    ]);

    if (resultsCount > 0 && (maxMarks !== undefined || passingMarks !== undefined)) {
      return res.status(400).json({ 
        error: 'Cannot modify max marks or passing marks after results have been recorded' 
      });
    }

    const updates = {};

    if (examType !== undefined) {
      if (!EXAM_TYPES.includes(examType)) {
        return res.status(400).json({ error: `Invalid exam type. Must be one of: ${EXAM_TYPES.join(', ')}` });
      }
      updates.examType = examType;
    }

    if (examDate !== undefined) {
      updates.examDate = examDate ? new Date(examDate) : null;
    }

    if (maxMarks !== undefined) {
      const numMax = Number(maxMarks);
      if (isNaN(numMax) || numMax <= 0) {
        return res.status(400).json({ error: 'Max Marks must be greater than 0' });
      }
      updates.maxMarks = numMax;
    }

    if (passingMarks !== undefined) {
      const numPass = Number(passingMarks);
      if (isNaN(numPass) || numPass < 0) {
        return res.status(400).json({ error: 'Passing Marks must be non-negative' });
      }
      updates.passingMarks = numPass;
    }

    const currentMax = updates.maxMarks !== undefined ? updates.maxMarks : exam.maxMarks;
    const currentPass = updates.passingMarks !== undefined ? updates.passingMarks : exam.passingMarks;

    if (currentPass > currentMax) {
      return res.status(400).json({ error: 'Passing marks cannot be greater than maximum marks (total marks)' });
    }

    if (componentId !== undefined) {
      if (componentId) {
        const comp = await AssessmentComponent.findOne({
          where: { id: componentId, subjectId: exam.subjectId }
        });
        if (!comp) {
          return res.status(400).json({ 
            error: 'Assessment component not found or does not belong to this subject' 
          });
        }
        updates.componentId = componentId;
      } else {
        updates.componentId = null;
      }
    }

    await exam.update(updates);

    const updatedExam = await Exam.findByPk(id, {
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code', 'subjectType'] },
        { 
          model: Class, 
          as: 'class', 
          attributes: ['id', 'batchYear', 'semesterNumber'],
          include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
        },
        { model: AcademicTerm, as: 'academicTerm', attributes: ['id', 'name', 'isCurrent'] },
        { model: AssessmentComponent, as: 'assessmentComponent', attributes: ['id', 'name', 'category', 'maxMarks'] },
        { model: ExamStaff, as: 'scheduledBy', attributes: ['id', 'name', 'instituteId'] }
      ]
    });

    res.json(updatedExam);
  } catch (error) {
    console.error('Update Exam error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete Exam
 */
export const deleteExam = async (req, res) => {
  const { id } = req.params;

  try {
    const exam = await Exam.findByPk(id);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    // Safety checks: Cannot delete if results or hall tickets exist
    const [resultsCount, hallTicketsCount] = await Promise.all([
      ExamResult.count({ where: { examId: id } }),
      HallTicket.count({ where: { examId: id } })
    ]);

    if (resultsCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete this exam because exam results have already been entered' 
      });
    }

    if (hallTicketsCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete this exam because hall tickets have already been generated' 
      });
    }

    await exam.destroy();
    res.json({ message: 'Exam deleted successfully', id });
  } catch (error) {
    console.error('Delete Exam error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * T11.5: Get all candidates & result entry sheet for an Exam
 */
export const getExamResults = async (req, res) => {
  const { id } = req.params;

  try {
    const exam = await Exam.findByPk(id, {
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code', 'credits'] },
        { 
          model: Class, 
          as: 'class', 
          attributes: ['id', 'batchYear', 'semesterNumber'],
          include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
        },
        { model: AcademicTerm, as: 'academicTerm', attributes: ['id', 'name', 'isCurrent'] },
        { model: AssessmentComponent, as: 'assessmentComponent', attributes: ['id', 'name', 'maxMarks', 'category'] }
      ]
    });

    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    // Find all active enrollments for this subject and term
    const { Enrollment, Student, Division } = await import('../models/index.js');
    const enrollments = await Enrollment.findAll({
      where: {
        subjectId: exam.subjectId,
        academicTermId: exam.academicTermId,
        status: 'ENROLLED'
      },
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'name', 'instituteId', 'rollNumber', 'departmentId'],
          include: [{ model: Division, as: 'division', attributes: ['id', 'name'] }]
        },
        {
          model: HallTicket,
          as: 'hallTickets',
          where: { examId: exam.id },
          required: false,
          attributes: ['id', 'seatNumber', 'examCenter']
        },
        {
          model: ExamResult,
          as: 'examResults',
          where: { examId: exam.id },
          required: false,
          attributes: ['id', 'marksObtained', 'isPass', 'enteredAt']
        }
      ],
      order: [
        [{ model: Student, as: 'student' }, 'instituteId', 'ASC']
      ]
    });

    // Format list for table/sheet
    const students = enrollments.map(enr => {
      const result = enr.examResults && enr.examResults.length > 0 ? enr.examResults[0] : null;
      const hallTicket = enr.hallTickets && enr.hallTickets.length > 0 ? enr.hallTickets[0] : null;

      return {
        enrollmentId: enr.id,
        attemptNumber: enr.attemptNumber,
        student: enr.student,
        seatNumber: hallTicket?.seatNumber || '—',
        examCenter: hallTicket?.examCenter || '—',
        resultId: result?.id || null,
        marksObtained: result?.marksObtained !== undefined ? result.marksObtained : null,
        isPass: result?.isPass !== undefined ? result.isPass : null,
        enteredAt: result?.enteredAt || null
      };
    });

    res.json({
      exam,
      summary: {
        totalEnrolled: enrollments.length,
        resultsEntered: students.filter(s => s.marksObtained !== null).length,
        passedCount: students.filter(s => s.isPass === true).length,
        failedCount: students.filter(s => s.isPass === false).length,
        maxMarks: exam.maxMarks,
        passingMarks: exam.passingMarks
      },
      students
    });

  } catch (error) {
    console.error('Get Exam Results error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * T11.5: Bulk enter Exam Results & sync into mapped ComponentMark
 */
export const enterExamResults = async (req, res) => {
  const { id } = req.params;
  const { results } = req.body; // Array of { enrollmentId, marksObtained }

  if (!Array.isArray(results) || results.length === 0) {
    return res.status(400).json({ error: 'Results array is required and must not be empty' });
  }

  try {
    const exam = await Exam.findByPk(id, {
      include: [
        { model: AssessmentComponent, as: 'assessmentComponent', attributes: ['id', 'name', 'maxMarks', 'category'] },
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] }
      ]
    });

    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const { ComponentMark } = await import('../models/index.js');
    const { computeSubjectResult } = await import('../services/subjectResultService.js');

    // Validation
    for (const r of results) {
      if (!r.enrollmentId) {
        return res.status(400).json({ error: 'enrollmentId is required for each result row' });
      }

      if (r.marksObtained !== null && r.marksObtained !== undefined && r.marksObtained !== '') {
        const val = Number(r.marksObtained);
        if (isNaN(val) || val < 0) {
          return res.status(400).json({ error: 'Marks obtained cannot be negative or invalid number' });
        }
        if (val > exam.maxMarks) {
          return res.status(400).json({ 
            error: `Marks obtained (${val}) cannot exceed examination max marks (${exam.maxMarks})` 
          });
        }
      }
    }

    const t = await sequelize.transaction();

    try {
      let savedCount = 0;
      let passCount = 0;
      let failCount = 0;
      const affectedEnrollmentIds = new Set();

      // Ensure exam has a mapped AssessmentComponent so results flow into ComponentMark and SubjectResult
      let mappedCompId = exam.componentId;
      if (!mappedCompId) {
        const compName = exam.examType === 'MIDTERM' 
          ? 'Mid Sem Exam' 
          : exam.examType === 'FINAL' 
            ? 'End Sem Exam' 
            : `${exam.examType.charAt(0) + exam.examType.slice(1).toLowerCase()} Exam`;

        let comp = await AssessmentComponent.findOne({
          where: { subjectId: exam.subjectId, name: compName },
          transaction: t
        });

        if (!comp) {
          comp = await AssessmentComponent.findOne({
            where: { subjectId: exam.subjectId },
            transaction: t
          });
        }

        if (!comp) {
          comp = await AssessmentComponent.create({
            subjectId: exam.subjectId,
            name: compName,
            maxMarks: exam.maxMarks,
            category: (exam.examType === 'INTERNAL' || exam.examType === 'PRACTICAL') ? 'INTERNAL' : 'EXTERNAL',
            entryMethod: 'FORMAL_EXAM',
            sequenceOrder: 1
          }, { transaction: t });
        }

        mappedCompId = comp.id;
        await exam.update({ componentId: mappedCompId }, { transaction: t });
        exam.componentId = mappedCompId;
      }

      for (const r of results) {
        const { enrollmentId } = r;
        const rawVal = r.marksObtained;
        const marksObtained = (rawVal === null || rawVal === undefined || rawVal === '') 
          ? null 
          : Number(rawVal);

        // Derive isPass from Exam.passingMarks (rules 27)
        let isPass = null;
        if (marksObtained !== null) {
          if (isNaN(marksObtained) || marksObtained < 0) {
            return res.status(400).json({ error: 'Marks obtained cannot be negative or invalid' });
          }
          if (marksObtained > Number(exam.maxMarks)) {
            return res.status(400).json({ 
              error: `Marks obtained (${marksObtained}) cannot be greater than maximum marks (${exam.maxMarks}) for this exam` 
            });
          }
          isPass = marksObtained >= Number(exam.passingMarks);
          if (isPass) passCount++;
          else failCount++;
        }

        // Upsert ExamResult
        const [examResult, created] = await ExamResult.findOrCreate({
          where: { examId: exam.id, enrollmentId },
          defaults: {
            marksObtained,
            isPass,
            enteredAt: new Date()
          },
          transaction: t
        });

        if (!created) {
          await examResult.update({
            marksObtained,
            isPass,
            enteredAt: new Date()
          }, { transaction: t });
        }

        // Sync into mapped ComponentMark (if exam has a component)
        if (mappedCompId) {
          const [compMark, compCreated] = await ComponentMark.findOrCreate({
            where: {
              componentId: mappedCompId,
              enrollmentId
            },
            defaults: {
              marksObtained,
              enteredAt: new Date(),
              sourceExamId: exam.id,
              enteredById: req.user?.id || null
            },
            transaction: t
          });

          if (!compCreated) {
            await compMark.update({
              marksObtained,
              enteredAt: new Date(),
              sourceExamId: exam.id,
              enteredById: req.user?.id || null
            }, { transaction: t });
          }
        }

        savedCount++;
        affectedEnrollmentIds.add(enrollmentId);
      }

      await t.commit();

      // Recalculate SubjectResult if component was synced
      if (mappedCompId) {
        for (const enrId of affectedEnrollmentIds) {
          try {
            await computeSubjectResult(enrId);
          } catch (e) {
            console.error(`Error recalculating SubjectResult for enrollment ${enrId}:`, e.message);
          }
        }
      }

      res.json({
        message: `Successfully processed results for ${savedCount} candidates.`,
        savedCount,
        passCount,
        failCount,
        syncedToComponent: !!mappedCompId,
        mappedComponentName: exam.assessmentComponent?.name || null
      });

    } catch (txError) {
      await t.rollback();
      throw txError;
    }

  } catch (error) {
    console.error('Enter Exam Results error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
