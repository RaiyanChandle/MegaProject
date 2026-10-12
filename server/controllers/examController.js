import { 
  Exam, 
  ExamResult, 
  AssessmentComponent, 
  Subject, 
  Class, 
  Department, 
  AcademicTerm, 
  ExamStaff, 
  Enrollment,
  HallTicket,
  QuestionPaper,
  Teacher
} from '../models/index.js';
import { Op } from 'sequelize';

/**
 * =====================================================================
 * T11.2: EXAM SCHEDULING CONTROLLER (Exam Staff)
 * =====================================================================
 * Rules & Invariants:
 * - Flows 11: Exam Staff schedules an Exam for subject + class + term.
 * - Exam Types: MIDTERM, FINAL, INTERNAL, MAKEUP (Rule 17: backlog makeups are just exams with examType = 'MAKEUP').
 * - Assessment Component linkage: Decision 3 links Exam to AssessmentComponent via assessmentComponentId.
 * - Passing marks: Rule 19 requires is_pass to derive from passingMarks at write time; maxMarks & passingMarks must be strictly validated.
 * - Non-destructive: Cannot delete an exam if hall tickets or verified results exist.
 * =====================================================================
 */

/**
 * Form options metadata for exam scheduling:
 * Returns terms, departments, classes, subjects, and assessment components.
 */
export const getExamFormOptions = async (req, res) => {
  try {
    const terms = await AcademicTerm.findAll({
      order: [['startDate', 'DESC']]
    });

    const departments = await Department.findAll({
      include: [
        {
          model: Class,
          as: 'classes',
          attributes: ['id', 'name', 'batchYear', 'semesterNumber', 'departmentId'],
          include: [
            {
              model: Subject,
              as: 'subjects',
              attributes: ['id', 'name', 'code', 'credits', 'subjectType', 'classId', 'departmentId'],
              include: [
                {
                  model: AssessmentComponent,
                  as: 'assessmentComponents',
                  attributes: ['id', 'name', 'maxMarks', 'category', 'entryMethod', 'sequenceOrder']
                }
              ]
            }
          ]
        }
      ],
      order: [
        ['name', 'ASC'],
        [{ model: Class, as: 'classes' }, 'semesterNumber', 'ASC'],
        [{ model: Class, as: 'classes' }, { model: Subject, as: 'subjects' }, 'code', 'ASC']
      ]
    });

    res.json({
      academicTerms: terms,
      departments
    });
  } catch (error) {
    console.error('Error fetching exam form options:', error);
    res.status(500).json({ error: 'Failed to fetch form options' });
  }
};

/**
 * List exams with multi-dimensional filtering.
 */
export const getExams = async (req, res) => {
  const { academicTermId, classId, subjectId, examType, departmentId } = req.query;

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

    const exams = await Exam.findAll({
      where,
      include: [
        {
          model: Subject,
          as: 'subject',
          attributes: ['id', 'name', 'code', 'credits', 'subjectType']
        },
        {
          model: Class,
          as: 'class',
          where: Object.keys(classWhere).length > 0 ? classWhere : undefined,
          attributes: ['id', 'name', 'batchYear', 'semesterNumber', 'departmentId'],
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['id', 'name', 'code']
            }
          ]
        },
        {
          model: AcademicTerm,
          as: 'academicTerm',
          attributes: ['id', 'name', 'isCurrent', 'startDate', 'endDate']
        },
        {
          model: AssessmentComponent,
          as: 'assessmentComponent',
          attributes: ['id', 'name', 'maxMarks', 'category', 'entryMethod']
        },
        {
          model: ExamStaff,
          as: 'scheduledBy',
          attributes: ['id', 'name', 'instituteId', 'email']
        }
      ],
      order: [
        ['examDate', 'ASC'],
        ['createdAt', 'DESC']
      ]
    });

    // Populate enrollment counts and results count for each exam
    const enhancedExams = await Promise.all(
      exams.map(async (exam) => {
        const plain = exam.toJSON();

        // Count eligible enrollments in this subject and term
        const candidateCount = await Enrollment.count({
          where: {
            subjectId: exam.subjectId,
            academicTermId: exam.academicTermId,
            status: { [Op.in]: ['ENROLLED', 'PASSED', 'FAILED'] }
          }
        });

        // Count entered and verified results
        const resultCount = await ExamResult.count({
          where: { examId: exam.id }
        });

        const verifiedResultCount = await ExamResult.count({
          where: { examId: exam.id, status: 'VERIFIED' }
        });

        // Count generated hall tickets
        const hallTicketCount = await HallTicket.count({
          where: { examId: exam.id }
        });

        // Question papers for this exam (including faculty or staff creator and verifiedBy)
        const questionPapers = await QuestionPaper.findAll({
          where: { examId: exam.id },
          include: [
            { model: ExamStaff, as: 'createdBy', attributes: ['id', 'name', 'instituteId', 'email'] },
            { model: Teacher, as: 'teacherCreatedBy', attributes: ['id', 'name', 'instituteId', 'email'] },
            { model: ExamStaff, as: 'verifiedBy', attributes: ['id', 'name', 'instituteId', 'email'] }
          ],
          order: [['createdAt', 'DESC']]
        });

        return {
          ...plain,
          candidateCount,
          resultCount,
          verifiedResultCount,
          hallTicketCount,
          questionPapers,
          latestQuestionPaper: questionPapers[0] || null
        };
      })
    );

    res.json(enhancedExams);
  } catch (error) {
    console.error('Error fetching exams:', error);
    res.status(500).json({ error: 'Failed to fetch scheduled exams' });
  }
};

/**
 * Get single exam detail with stats.
 */
export const getExamById = async (req, res) => {
  const { id } = req.params;

  try {
    const exam = await Exam.findByPk(id, {
      include: [
        {
          model: Subject,
          as: 'subject',
          attributes: ['id', 'name', 'code', 'credits', 'subjectType', 'departmentId']
        },
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'name', 'batchYear', 'semesterNumber', 'departmentId'],
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['id', 'name', 'code']
            }
          ]
        },
        {
          model: AcademicTerm,
          as: 'academicTerm',
          attributes: ['id', 'name', 'isCurrent', 'startDate', 'endDate']
        },
        {
          model: AssessmentComponent,
          as: 'assessmentComponent',
          attributes: ['id', 'name', 'maxMarks', 'category', 'entryMethod']
        },
        {
          model: ExamStaff,
          as: 'scheduledBy',
          attributes: ['id', 'name', 'instituteId', 'email']
        }
      ]
    });

    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const plain = exam.toJSON();

    // Eligible candidates
    const eligibleEnrollments = await Enrollment.findAll({
      where: {
        subjectId: exam.subjectId,
        academicTermId: exam.academicTermId,
        status: { [Op.in]: ['ENROLLED', 'PASSED', 'FAILED'] }
      },
      attributes: ['id', 'studentId', 'attemptNumber', 'status']
    });

    plain.candidateCount = eligibleEnrollments.length;
    plain.resultCount = await ExamResult.count({ where: { examId: id } });
    plain.verifiedResultCount = await ExamResult.count({ where: { examId: id, status: 'VERIFIED' } });
    plain.hallTicketCount = await HallTicket.count({ where: { examId: id } });
    const questionPapers = await QuestionPaper.findAll({
      where: { examId: id },
      include: [
        { model: ExamStaff, as: 'createdBy', attributes: ['id', 'name', 'instituteId', 'email'] },
        { model: Teacher, as: 'teacherCreatedBy', attributes: ['id', 'name', 'instituteId', 'email'] },
        { model: ExamStaff, as: 'verifiedBy', attributes: ['id', 'name', 'instituteId', 'email'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    plain.questionPapers = questionPapers;
    plain.latestQuestionPaper = questionPapers[0] || null;

    res.json(plain);
  } catch (error) {
    console.error('Error fetching exam details:', error);
    res.status(500).json({ error: 'Failed to fetch exam details' });
  }
};

/**
 * Create a new exam schedule.
 */
export const createExam = async (req, res) => {
  const {
    subjectId,
    classId,
    academicTermId,
    examType = 'FINAL',
    examDate,
    maxMarks,
    passingMarks,
    assessmentComponentId
  } = req.body;

  // scheduledById from authenticated user
  const scheduledById = req.user.id;

  // Validation
  if (!subjectId || !classId || !academicTermId) {
    return res.status(400).json({ error: 'Subject, class, and academic term are required' });
  }

  const numMax = Number(maxMarks);
  const numPass = Number(passingMarks);

  if (isNaN(numMax) || numMax <= 0) {
    return res.status(400).json({ error: 'Max marks must be a positive number' });
  }

  if (isNaN(numPass) || numPass < 0) {
    return res.status(400).json({ error: 'Passing marks must be a non-negative number' });
  }

  if (numPass > numMax) {
    return res.status(400).json({ error: 'Passing marks cannot exceed maximum marks' });
  }

  const validTypes = ['MIDTERM', 'FINAL', 'INTERNAL', 'MAKEUP'];
  if (!validTypes.includes(examType)) {
    return res.status(400).json({ error: `Invalid exam type. Must be one of: ${validTypes.join(', ')}` });
  }

  try {
    // Verify subject belongs to the class or is a valid subject
    const subject = await Subject.findByPk(subjectId);
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    const targetClass = await Class.findByPk(classId);
    if (!targetClass) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const term = await AcademicTerm.findByPk(academicTermId);
    if (!term) {
      return res.status(404).json({ error: 'Academic term not found' });
    }

    // If assessmentComponentId is specified, verify it belongs to this subject
    if (assessmentComponentId) {
      const comp = await AssessmentComponent.findOne({
        where: { id: assessmentComponentId, subjectId }
      });
      if (!comp) {
        return res.status(400).json({ 
          error: 'Specified assessment component does not belong to this subject' 
        });
      }
    }

    // Check for duplicate exam schedule of identical type for this subject & term
    const duplicate = await Exam.findOne({
      where: {
        subjectId,
        classId,
        academicTermId,
        examType
      }
    });

    if (duplicate) {
      return res.status(400).json({
        error: `A ${examType} exam is already scheduled for this subject and term (ID: ${duplicate.id})`
      });
    }

    const newExam = await Exam.create({
      subjectId,
      classId,
      academicTermId,
      examType,
      examDate: examDate ? new Date(examDate) : null,
      maxMarks: numMax,
      passingMarks: numPass,
      assessmentComponentId: assessmentComponentId || null,
      scheduledById
    });

    // Reload with associations
    const createdExam = await Exam.findByPk(newExam.id, {
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
        },
        {
          model: ExamStaff,
          as: 'scheduledBy',
          attributes: ['id', 'name', 'instituteId']
        }
      ]
    });

    res.status(201).json(createdExam);
  } catch (error) {
    console.error('Error creating exam:', error);
    res.status(500).json({ error: 'Internal server error while scheduling exam' });
  }
};

/**
 * Update an existing exam schedule.
 */
export const updateExam = async (req, res) => {
  const { id } = req.params;
  const {
    examType,
    examDate,
    maxMarks,
    passingMarks,
    assessmentComponentId
  } = req.body;

  try {
    const exam = await Exam.findByPk(id);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    // Check if verified marks already exist
    const verifiedResultsCount = await ExamResult.count({
      where: { examId: id, status: 'VERIFIED' }
    });

    if (verifiedResultsCount > 0) {
      // Prevent mutating marking criteria if results are already published
      if (maxMarks !== undefined && Number(maxMarks) !== Number(exam.maxMarks)) {
        return res.status(400).json({ 
          error: 'Cannot modify max marks because verified results have already been published for this exam.' 
        });
      }
      if (passingMarks !== undefined && Number(passingMarks) !== Number(exam.passingMarks)) {
        return res.status(400).json({ 
          error: 'Cannot modify passing marks because verified results have already been published for this exam.' 
        });
      }
      if (assessmentComponentId !== undefined && assessmentComponentId !== exam.assessmentComponentId) {
        return res.status(400).json({ 
          error: 'Cannot reassign component linkage after marks have been verified.' 
        });
      }
    }

    if (maxMarks !== undefined) {
      const numMax = Number(maxMarks);
      if (isNaN(numMax) || numMax <= 0) {
        return res.status(400).json({ error: 'Max marks must be a positive number' });
      }
      exam.maxMarks = numMax;
    }

    if (passingMarks !== undefined) {
      const numPass = Number(passingMarks);
      if (isNaN(numPass) || numPass < 0) {
        return res.status(400).json({ error: 'Passing marks must be a non-negative number' });
      }
      if (numPass > Number(exam.maxMarks)) {
        return res.status(400).json({ error: 'Passing marks cannot exceed maximum marks' });
      }
      exam.passingMarks = numPass;
    }

    if (examType !== undefined) {
      const validTypes = ['MIDTERM', 'FINAL', 'INTERNAL', 'MAKEUP'];
      if (!validTypes.includes(examType)) {
        return res.status(400).json({ error: `Invalid exam type. Must be one of: ${validTypes.join(', ')}` });
      }
      exam.examType = examType;
    }

    if (examDate !== undefined) {
      exam.examDate = examDate ? new Date(examDate) : null;
    }

    if (assessmentComponentId !== undefined) {
      if (assessmentComponentId) {
        const comp = await AssessmentComponent.findOne({
          where: { id: assessmentComponentId, subjectId: exam.subjectId }
        });
        if (!comp) {
          return res.status(400).json({ 
            error: 'Specified assessment component does not belong to this subject' 
          });
        }
      }
      exam.assessmentComponentId = assessmentComponentId || null;
    }

    await exam.save();

    const updatedExam = await Exam.findByPk(id, {
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
        },
        {
          model: ExamStaff,
          as: 'scheduledBy',
          attributes: ['id', 'name', 'instituteId']
        }
      ]
    });

    res.json(updatedExam);
  } catch (error) {
    console.error('Error updating exam:', error);
    res.status(500).json({ error: 'Failed to update exam' });
  }
};

/**
 * Delete an exam schedule.
 * Protected against deleting exams with existing hall tickets or marks results.
 */
export const deleteExam = async (req, res) => {
  const { id } = req.params;

  try {
    const exam = await Exam.findByPk(id);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const resultCount = await ExamResult.count({ where: { examId: id } });
    if (resultCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete exam: ${resultCount} student mark submissions exist. Delete/reset results first.` 
      });
    }

    const hallTicketCount = await HallTicket.count({ where: { examId: id } });
    if (hallTicketCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete exam: ${hallTicketCount} hall tickets have already been generated for this exam.` 
      });
    }

    const questionPaperCount = await QuestionPaper.count({ where: { examId: id } });
    if (questionPaperCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete exam: Question papers are attached to this exam schedule.` 
      });
    }

    await exam.destroy();
    res.json({ message: 'Exam schedule deleted successfully', id });
  } catch (error) {
    console.error('Error deleting exam:', error);
    res.status(500).json({ error: 'Failed to delete exam' });
  }
};
