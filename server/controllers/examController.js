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
    return res.status(400).json({ error: 'Passing marks cannot exceed maximum marks' });
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

    // Create exam
    const scheduledById = req.user?.id || null;
    const exam = await Exam.create({
      subjectId,
      classId,
      academicTermId,
      componentId: componentId || null,
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
      return res.status(400).json({ error: 'Passing marks cannot exceed maximum marks' });
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
