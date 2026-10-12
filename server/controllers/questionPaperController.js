import { 
  QuestionPaper, 
  Exam, 
  Subject, 
  Class, 
  Department, 
  AcademicTerm, 
  ExamStaff,
  Teacher,
  SubjectAllocation,
  AssessmentComponent
} from '../models/index.js';
import { Op } from 'sequelize';

/**
 * =====================================================================
 * T11.3: QUESTION PAPER CONTROLLER
 * =====================================================================
 * Real-world University Governance Flow:
 * 1. Faculty Member (Teacher) prepares & uploads paper (DRAFT).
 * 2. Faculty Member submits paper to Exam Staff for review (SUBMITTED).
 * 3. Exam Staff inspects the submitted paper in a dedicated verification modal:
 *    - VERIFY & APPROVE (APPROVED): Formally approved for examinations.
 *    - REJECT / CANNOT VERIFY (REJECTED): Sends feedback remarks back to faculty.
 * 4. Faculty dashboard displays verification result and allows re-uploading.
 * =====================================================================
 */

const PAPER_INCLUDES = [
  {
    model: Teacher,
    as: 'teacherCreatedBy',
    attributes: ['id', 'name', 'instituteId', 'email']
  },
  {
    model: ExamStaff,
    as: 'createdBy',
    attributes: ['id', 'name', 'instituteId', 'email']
  },
  {
    model: ExamStaff,
    as: 'verifiedBy',
    attributes: ['id', 'name', 'instituteId', 'email']
  }
];

/**
 * Get assigned exams for the logged-in Faculty / Teacher member.
 */
export const getTeacherAssignedExams = async (req, res) => {
  const teacherId = req.user.id;

  try {
    // Find all subject allocations for this teacher
    const allocations = await SubjectAllocation.findAll({
      where: { teacherId },
      attributes: ['subjectId', 'classId'],
    });

    if (allocations.length === 0) {
      return res.json([]);
    }

    const subjectIds = [...new Set(allocations.map(a => a.subjectId))];
    const classIds = [...new Set(allocations.map(a => a.classId))];

    // Find exams matching teacher's subjects and classes
    const exams = await Exam.findAll({
      where: {
        subjectId: { [Op.in]: subjectIds },
        classId: { [Op.in]: classIds }
      },
      include: [
        {
          model: Subject,
          as: 'subject',
          attributes: ['id', 'name', 'code', 'credits']
        },
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'name', 'batchYear', 'semesterNumber'],
          include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
        },
        {
          model: AcademicTerm,
          as: 'academicTerm',
          attributes: ['id', 'name', 'isCurrent']
        },
        {
          model: AssessmentComponent,
          as: 'assessmentComponent',
          attributes: ['id', 'name', 'maxMarks', 'category']
        }
      ],
      order: [
        ['examDate', 'ASC'],
        ['createdAt', 'DESC']
      ]
    });

    // Populate question papers for each exam
    const enhanced = await Promise.all(
      exams.map(async (exam) => {
        const plain = exam.toJSON();
        const papers = await QuestionPaper.findAll({
          where: { examId: exam.id },
          include: PAPER_INCLUDES,
          order: [['createdAt', 'DESC']]
        });
        return {
          ...plain,
          questionPapers: papers,
          latestQuestionPaper: papers[0] || null
        };
      })
    );

    res.json(enhanced);
  } catch (error) {
    console.error('Error fetching teacher assigned exams:', error);
    res.status(500).json({ error: 'Failed to fetch assigned exams for question papers' });
  }
};

/**
 * List question papers with filtering (Exam Staff / Super Admin).
 */
export const getQuestionPapers = async (req, res) => {
  const { examId, status, academicTermId } = req.query;

  try {
    const where = {};
    if (examId) where.examId = examId;
    if (status) where.status = status;

    const examWhere = {};
    if (academicTermId) examWhere.academicTermId = academicTermId;

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
              attributes: ['id', 'name', 'code', 'credits']
            },
            {
              model: Class,
              as: 'class',
              attributes: ['id', 'name', 'semesterNumber', 'batchYear'],
              include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
            },
            {
              model: AcademicTerm,
              as: 'academicTerm',
              attributes: ['id', 'name', 'isCurrent']
            }
          ]
        },
        ...PAPER_INCLUDES
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(papers);
  } catch (error) {
    console.error('Error fetching question papers:', error);
    res.status(500).json({ error: 'Failed to fetch question papers' });
  }
};

/**
 * Get question papers for a specific exam.
 */
export const getQuestionPapersByExam = async (req, res) => {
  const { examId } = req.params;

  try {
    const papers = await QuestionPaper.findAll({
      where: { examId },
      include: PAPER_INCLUDES,
      order: [['createdAt', 'DESC']]
    });

    res.json(papers);
  } catch (error) {
    console.error('Error fetching question papers by exam:', error);
    res.status(500).json({ error: 'Failed to fetch question papers for this exam' });
  }
};

/**
 * Create/Upload a question paper.
 * Faculty members upload Drafts or Submit for review.
 * Exam staff may also upload as administrative override.
 */
export const createQuestionPaper = async (req, res) => {
  const { examId, fileUrl, status = 'DRAFT' } = req.body;
  const createdById = req.user.id;

  // fileUrl can come from body or from upload middleware req.fileUrl
  const finalFileUrl = req.fileUrl || fileUrl;

  if (!examId) {
    return res.status(400).json({ error: 'Exam ID is required' });
  }

  if (!finalFileUrl) {
    return res.status(400).json({ error: 'Question paper file or file URL is required' });
  }

  const validStatuses = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  // Teachers cannot directly mark as APPROVED - must be verified by Exam Staff
  if (req.user.role === 'TEACHER' && status === 'APPROVED') {
    return res.status(403).json({ 
      error: 'Faculty members cannot mark question papers as APPROVED. Submit for Exam Staff verification instead.' 
    });
  }

  try {
    const exam = await Exam.findByPk(examId, {
      include: [
        { model: Subject, as: 'subject' },
        { model: Class, as: 'class' }
      ]
    });
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    // Verify teacher allocation if user is TEACHER
    if (req.user.role === 'TEACHER') {
      const allocation = await SubjectAllocation.findOne({
        where: {
          teacherId: req.user.id,
          subjectId: exam.subjectId,
          classId: exam.classId
        }
      });
      if (!allocation) {
        if (req.user.departmentId && exam.class?.departmentId && req.user.departmentId !== exam.class.departmentId) {
          return res.status(403).json({ error: 'You are not allocated to teach this subject/class.' });
        }
      }
    }

    const paper = await QuestionPaper.create({
      examId,
      createdById,
      fileUrl: finalFileUrl,
      status,
      verificationRemarks: null
    });

    const populatedPaper = await QuestionPaper.findByPk(paper.id, {
      include: [
        {
          model: Exam,
          as: 'exam',
          include: [
            { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
            { model: Class, as: 'class', attributes: ['id', 'name'] }
          ]
        },
        ...PAPER_INCLUDES
      ]
    });

    res.status(201).json(populatedPaper);
  } catch (error) {
    console.error('Error creating question paper:', error);
    res.status(500).json({ error: 'Failed to create question paper' });
  }
};

/**
 * Transition question paper status:
 * - Faculty (Teacher): DRAFT -> SUBMITTED (Submit to Exam Staff)
 * - Exam Staff / Admin:
 *     SUBMITTED -> APPROVED (Verified & Cleared)
 *     SUBMITTED -> REJECTED (Cannot be verified; sends remarks)
 *     REJECTED / APPROVED -> DRAFT (Re-open)
 */
export const updateQuestionPaperStatus = async (req, res) => {
  const { id } = req.params;
  const { status, remarks, verificationRemarks, fileUrl } = req.body;

  const validStatuses = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  // Role validation: Only EXAM_STAFF or SUPER_ADMIN can APPROVE or REJECT
  if (req.user.role === 'TEACHER' && (status === 'APPROVED' || status === 'REJECTED')) {
    return res.status(403).json({ 
      error: 'Only Exam Staff can verify, approve, or reject question papers.' 
    });
  }

  try {
    const paper = await QuestionPaper.findByPk(id);
    if (!paper) {
      return res.status(404).json({ error: 'Question paper not found' });
    }

    // Faculty can only edit papers they created and when not APPROVED
    if (req.user.role === 'TEACHER' && paper.status === 'APPROVED') {
      return res.status(400).json({ 
        error: 'This question paper has already been approved by Exam Staff and cannot be modified.' 
      });
    }

    if (status) {
      paper.status = status;

      if (status === 'APPROVED') {
        paper.verifiedById = req.user.id;
        paper.verifiedAt = new Date();
        paper.verificationRemarks = verificationRemarks || remarks || 'Verified and approved by Exam Staff';
      } else if (status === 'REJECTED') {
        paper.verifiedById = req.user.id;
        paper.verifiedAt = new Date();
        paper.verificationRemarks = verificationRemarks || remarks || 'Cannot be verified. Please review and re-upload revised paper.';
      } else if (status === 'SUBMITTED') {
        // Faculty re-submitted or submitted
        paper.verificationRemarks = null;
      }
    }

    if (fileUrl || req.fileUrl) {
      paper.fileUrl = req.fileUrl || fileUrl;
    }

    await paper.save();

    const updated = await QuestionPaper.findByPk(id, {
      include: [
        {
          model: Exam,
          as: 'exam',
          include: [
            { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
            { model: Class, as: 'class', attributes: ['id', 'name'] }
          ]
        },
        ...PAPER_INCLUDES
      ]
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating question paper status:', error);
    res.status(500).json({ error: 'Failed to update question paper status' });
  }
};

/**
 * Delete question paper.
 */
export const deleteQuestionPaper = async (req, res) => {
  const { id } = req.params;

  try {
    const paper = await QuestionPaper.findByPk(id);
    if (!paper) {
      return res.status(404).json({ error: 'Question paper not found' });
    }

    // Protect approved question papers from accidental deletion
    if (paper.status === 'APPROVED' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(400).json({ 
        error: 'Approved question paper cannot be deleted directly. Contact Super Admin or reject first.' 
      });
    }

    // Teacher can only delete if in DRAFT and created by them
    if (req.user.role === 'TEACHER') {
      if (paper.status !== 'DRAFT') {
        return res.status(403).json({ error: 'Faculty can only delete draft question papers.' });
      }
      if (paper.createdById !== req.user.id) {
        return res.status(403).json({ error: 'You can only delete your own draft papers.' });
      }
    }

    await paper.destroy();
    res.json({ message: 'Question paper deleted successfully', id });
  } catch (error) {
    console.error('Error deleting question paper:', error);
    res.status(500).json({ error: 'Failed to delete question paper' });
  }
};
