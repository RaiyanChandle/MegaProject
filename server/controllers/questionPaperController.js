import { 
  QuestionPaper, 
  Exam, 
  Subject, 
  Class, 
  Department, 
  AcademicTerm, 
  ExamStaff 
} from '../models/index.js';
import { QUESTION_PAPER_STATUSES } from '../models/constants.js';
import { Op } from 'sequelize';

/**
 * Upload / Create a Question Paper for an Exam
 */
export const createQuestionPaper = async (req, res) => {
  const { examId, status = 'DRAFT' } = req.body;
  // fileUrl can come from upload middleware (req.fileUrl) or body (req.body.fileUrl)
  const fileUrl = req.fileUrl || req.body.fileUrl;

  if (!examId) {
    return res.status(400).json({ error: 'Exam ID is required' });
  }

  if (!fileUrl) {
    return res.status(400).json({ error: 'Please upload a document or provide a valid fileUrl' });
  }

  if (status && !QUESTION_PAPER_STATUSES.includes(status)) {
    return res.status(400).json({ 
      error: `Invalid status. Must be one of: ${QUESTION_PAPER_STATUSES.join(', ')}` 
    });
  }

  try {
    const exam = await Exam.findByPk(examId, {
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
        { 
          model: Class, 
          as: 'class', 
          attributes: ['id', 'batchYear', 'semesterNumber'],
          include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
        },
        { model: AcademicTerm, as: 'academicTerm', attributes: ['id', 'name'] }
      ]
    });

    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const createdById = req.user?.id;
    if (!createdById) {
      return res.status(401).json({ error: 'Unauthorized: User ID missing' });
    }

    const paper = await QuestionPaper.create({
      examId,
      createdById,
      fileUrl,
      status: status || 'DRAFT'
    });

    const fullPaper = await QuestionPaper.findByPk(paper.id, {
      include: [
        {
          model: Exam,
          as: 'exam',
          include: [
            { model: Subject, as: 'subject', attributes: ['id', 'name', 'code', 'subjectType'] },
            { 
              model: Class, 
              as: 'class', 
              attributes: ['id', 'batchYear', 'semesterNumber'],
              include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
            },
            { model: AcademicTerm, as: 'academicTerm', attributes: ['id', 'name', 'isCurrent'] }
          ]
        },
        { model: ExamStaff, as: 'createdBy', attributes: ['id', 'name', 'instituteId', 'email'] }
      ]
    });

    res.status(201).json(fullPaper);
  } catch (error) {
    console.error('Create QuestionPaper error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * List Question Papers with filtering
 */
export const getQuestionPapers = async (req, res) => {
  const { examId, status, academicTermId, departmentId, search } = req.query;

  try {
    const where = {};
    if (examId) where.examId = examId;
    if (status && status !== 'ALL') where.status = status;

    const examWhere = {};
    if (academicTermId) examWhere.academicTermId = academicTermId;

    const classWhere = {};
    if (departmentId) classWhere.departmentId = departmentId;

    const subjectWhere = {};
    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      subjectWhere[Op.or] = [
        { name: { [Op.iLike || Op.like]: q } },
        { code: { [Op.iLike || Op.like]: q } }
      ];
    }

    const papers = await QuestionPaper.findAll({
      where,
      include: [
        {
          model: Exam,
          as: 'exam',
          where: Object.keys(examWhere).length > 0 ? examWhere : undefined,
          include: [
            { 
              model: Subject, 
              as: 'subject', 
              where: Object.keys(subjectWhere).length > 0 ? subjectWhere : undefined,
              attributes: ['id', 'name', 'code', 'subjectType'] 
            },
            { 
              model: Class, 
              as: 'class', 
              where: Object.keys(classWhere).length > 0 ? classWhere : undefined,
              attributes: ['id', 'batchYear', 'semesterNumber'],
              include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
            },
            { model: AcademicTerm, as: 'academicTerm', attributes: ['id', 'name', 'isCurrent'] }
          ]
        },
        { model: ExamStaff, as: 'createdBy', attributes: ['id', 'name', 'instituteId', 'email'] }
      ],
      order: [
        ['createdAt', 'DESC']
      ]
    });

    res.json(papers);
  } catch (error) {
    console.error('Get QuestionPapers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get single Question Paper by ID
 */
export const getQuestionPaperById = async (req, res) => {
  const { id } = req.params;

  try {
    const paper = await QuestionPaper.findByPk(id, {
      include: [
        {
          model: Exam,
          as: 'exam',
          include: [
            { model: Subject, as: 'subject', attributes: ['id', 'name', 'code', 'subjectType'] },
            { 
              model: Class, 
              as: 'class', 
              attributes: ['id', 'batchYear', 'semesterNumber'],
              include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
            },
            { model: AcademicTerm, as: 'academicTerm', attributes: ['id', 'name', 'isCurrent'] }
          ]
        },
        { model: ExamStaff, as: 'createdBy', attributes: ['id', 'name', 'instituteId', 'email'] }
      ]
    });

    if (!paper) {
      return res.status(404).json({ error: 'Question paper not found' });
    }

    res.json(paper);
  } catch (error) {
    console.error('Get QuestionPaper by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Workflow status update: DRAFT → SUBMITTED → APPROVED
 */
export const updateQuestionPaperStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !QUESTION_PAPER_STATUSES.includes(status)) {
    return res.status(400).json({ 
      error: `Valid status is required. Must be one of: ${QUESTION_PAPER_STATUSES.join(', ')}` 
    });
  }

  try {
    const paper = await QuestionPaper.findByPk(id);
    if (!paper) {
      return res.status(404).json({ error: 'Question paper not found' });
    }

    const currentStatus = paper.status;

    // Validate workflow transition rules
    // Valid transitions:
    // DRAFT -> SUBMITTED
    // SUBMITTED -> APPROVED (approval) OR DRAFT (returned for revisions)
    // APPROVED -> SUBMITTED (reopened for review)
    if (currentStatus === status) {
      return res.status(200).json(paper);
    }

    if (currentStatus === 'DRAFT' && status !== 'SUBMITTED') {
      return res.status(400).json({ 
        error: 'Draft question papers must be submitted for review before approval.' 
      });
    }

    await paper.update({ status });

    const updated = await QuestionPaper.findByPk(id, {
      include: [
        {
          model: Exam,
          as: 'exam',
          include: [
            { model: Subject, as: 'subject', attributes: ['id', 'name', 'code', 'subjectType'] },
            { 
              model: Class, 
              as: 'class', 
              attributes: ['id', 'batchYear', 'semesterNumber'],
              include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
            },
            { model: AcademicTerm, as: 'academicTerm', attributes: ['id', 'name', 'isCurrent'] }
          ]
        },
        { model: ExamStaff, as: 'createdBy', attributes: ['id', 'name', 'instituteId', 'email'] }
      ]
    });

    res.json(updated);
  } catch (error) {
    console.error('Update QuestionPaper status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update Question Paper file or details
 */
export const updateQuestionPaper = async (req, res) => {
  const { id } = req.params;
  const fileUrl = req.fileUrl || req.body.fileUrl;

  try {
    const paper = await QuestionPaper.findByPk(id);
    if (!paper) {
      return res.status(404).json({ error: 'Question paper not found' });
    }

    if (paper.status === 'APPROVED') {
      return res.status(400).json({ 
        error: 'Approved question papers are locked and cannot be replaced directly. Reopen review first.' 
      });
    }

    const updates = {};
    if (fileUrl) updates.fileUrl = fileUrl;

    await paper.update(updates);

    const updated = await QuestionPaper.findByPk(id, {
      include: [
        {
          model: Exam,
          as: 'exam',
          include: [
            { model: Subject, as: 'subject', attributes: ['id', 'name', 'code', 'subjectType'] },
            { 
              model: Class, 
              as: 'class', 
              attributes: ['id', 'batchYear', 'semesterNumber'],
              include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
            },
            { model: AcademicTerm, as: 'academicTerm', attributes: ['id', 'name', 'isCurrent'] }
          ]
        },
        { model: ExamStaff, as: 'createdBy', attributes: ['id', 'name', 'instituteId', 'email'] }
      ]
    });

    res.json(updated);
  } catch (error) {
    console.error('Update QuestionPaper error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete Question Paper
 */
export const deleteQuestionPaper = async (req, res) => {
  const { id } = req.params;

  try {
    const paper = await QuestionPaper.findByPk(id);
    if (!paper) {
      return res.status(404).json({ error: 'Question paper not found' });
    }

    if (paper.status === 'APPROVED' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(400).json({ 
        error: 'Approved question papers cannot be deleted. Move back to draft/submitted first.' 
      });
    }

    await paper.destroy();
    res.json({ message: 'Question paper deleted successfully', id });
  } catch (error) {
    console.error('Delete QuestionPaper error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
