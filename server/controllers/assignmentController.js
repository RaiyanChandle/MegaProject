import { 
  Assignment, 
  Submission, 
  Subject, 
  Teacher, 
  Division, 
  Enrollment, 
  Student, 
  AcademicTerm, 
  SubjectAllocation 
} from '../models/index.js';
import { Op } from 'sequelize';

/**
 * T8.4: Teacher creates assignment
 * subjectId, divisionId (optional, null = entire class), title, description, marks, deadline, optional pdfUrl
 */
export const createAssignment = async (req, res) => {
  const { subjectId, divisionId, title, description, marks, deadline } = req.body;
  const user = req.user;

  if (!subjectId || !title || !description || !marks || !deadline) {
    return res.status(400).json({ 
      error: 'Subject ID, title, description, total marks, and deadline are required.' 
    });
  }

  // Validate deadline is in the future
  const deadlineDate = new Date(deadline);
  if (isNaN(deadlineDate.getTime())) {
    return res.status(400).json({ error: 'Invalid deadline date format.' });
  }

  if (deadlineDate <= new Date()) {
    return res.status(400).json({ error: 'Assignment deadline must be a future date and time.' });
  }

  try {
    let teacherId = user.id;

    // RBAC: verify teacher allocation or department admin permission
    if (user.role === 'TEACHER') {
      const allocation = await SubjectAllocation.findOne({
        where: {
          teacherId: user.id,
          subjectId,
          ...(divisionId ? { [Op.or]: [{ divisionId }, { divisionId: null }] } : {})
        }
      });

      if (!allocation) {
        return res.status(403).json({ 
          error: 'Forbidden: You are not allocated to teach this subject.' 
        });
      }
    } else if (user.role === 'DEPARTMENT_ADMIN') {
      const subject = await Subject.findByPk(subjectId);
      if (!subject || subject.departmentId !== user.departmentId) {
        return res.status(403).json({ error: 'Forbidden: Subject not found in your department.' });
      }

      const allocation = await SubjectAllocation.findOne({ where: { subjectId } });
      if (allocation) teacherId = allocation.teacherId;
    } else {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions to create assignments.' });
    }

    const assignment = await Assignment.create({
      teacherId,
      subjectId,
      divisionId: divisionId || null, // null = entire class (Rule 29 wildcard)
      title: title.trim(),
      description: description.trim(),
      marks: parseInt(marks, 10),
      deadline: deadlineDate,
      pdfUrl: req.fileUrl || null // attached brief/problem sheet if uploaded
    });

    const populatedAssignment = await Assignment.findByPk(assignment.id, {
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code', 'subjectType'] },
        { model: Teacher, as: 'teacher', attributes: ['id', 'name', 'instituteId'] },
        { model: Division, as: 'division', attributes: ['id', 'name'] }
      ]
    });

    res.status(201).json(populatedAssignment);
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ error: 'Internal server error while creating assignment.' });
  }
};

/**
 * List assignments for Teachers & Department Admins
 */
export const getAssignments = async (req, res) => {
  const { subjectId, divisionId } = req.query;
  const user = req.user;

  try {
    let whereClause = {};
    if (subjectId) whereClause.subjectId = subjectId;
    if (divisionId) whereClause.divisionId = divisionId;

    if (user.role === 'TEACHER') {
      whereClause.teacherId = user.id;
    }

    const assignments = await Assignment.findAll({
      where: whereClause,
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code', 'subjectType'] },
        { model: Teacher, as: 'teacher', attributes: ['id', 'name', 'instituteId'] },
        { model: Division, as: 'division', attributes: ['id', 'name'] },
        { 
          model: Submission, 
          as: 'submissions', 
          attributes: ['id', 'status', 'marksAwarded', 'submittedAt'] 
        }
      ],
      order: [['deadline', 'DESC']]
    });

    const formattedAssignments = assignments.map(a => {
      const aObj = a.toJSON();
      const subs = aObj.submissions || [];
      aObj.stats = {
        totalSubmissions: subs.length,
        acceptedCount: subs.filter(s => s.status === 'ACCEPTED').length,
        pendingReviewCount: subs.filter(s => s.status === 'SUBMITTED' || s.status === 'UPLOAD').length
      };
      return aObj;
    });

    res.json(formattedAssignments);
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({ error: 'Internal server error while fetching assignments.' });
  }
};

/**
 * Get Assignment by ID with all student submissions (for grading / review)
 */
export const getAssignmentById = async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  try {
    const assignment = await Assignment.findByPk(id, {
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code', 'subjectType', 'departmentId'] },
        { model: Teacher, as: 'teacher', attributes: ['id', 'name', 'instituteId'] },
        { model: Division, as: 'division', attributes: ['id', 'name'] },
        {
          model: Submission,
          as: 'submissions',
          include: [
            { 
              model: Student, 
              as: 'student', 
              attributes: ['id', 'name', 'instituteId', 'rollNumber', 'email', 'divisionId'],
              include: [{ model: Division, as: 'division', attributes: ['id', 'name'] }]
            },
            {
              model: Enrollment,
              as: 'enrollment',
              attributes: ['id', 'attemptNumber', 'status']
            }
          ]
        }
      ]
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found.' });
    }

    if (user.role === 'TEACHER' && assignment.teacherId !== user.id) {
      return res.status(403).json({ error: 'Forbidden: You did not create this assignment.' });
    }

    if (user.role === 'DEPARTMENT_ADMIN' && assignment.subject.departmentId !== user.departmentId) {
      return res.status(403).json({ error: 'Forbidden: Assignment belongs to another department.' });
    }

    res.json(assignment);
  } catch (error) {
    console.error('Get assignment by ID error:', error);
    res.status(500).json({ error: 'Internal server error while fetching assignment details.' });
  }
};

/**
 * T8.4: Student view of assignments
 * Scoped strictly to subjects the student is actively enrolled in (via Enrollment table).
 * Wildcard null divisionId is included alongside matching student divisionId (Rule 29).
 */
export const getStudentAssignments = async (req, res) => {
  const studentId = req.user.id;
  const { subjectId } = req.query;

  try {
    const student = await Student.findByPk(studentId, {
      attributes: ['id', 'name', 'divisionId', 'departmentId']
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const currentTerm = await AcademicTerm.findOne({ where: { isCurrent: true } });

    // Fetch student's enrollments (Rule 1 & 6: source of truth is Enrollment)
    const enrollmentWhere = {
      studentId,
      status: { [Op.in]: ['ENROLLED', 'PASSED'] }
    };
    if (currentTerm) {
      enrollmentWhere.academicTermId = currentTerm.id;
    }

    const enrollments = await Enrollment.findAll({
      where: enrollmentWhere,
      attributes: ['id', 'subjectId', 'classId', 'attemptNumber']
    });

    if (enrollments.length === 0) {
      return res.json([]);
    }

    const enrolledSubjectIds = enrollments.map(e => e.subjectId);
    const enrollmentMap = new Map();
    enrollments.forEach(e => enrollmentMap.set(e.subjectId, e.id));

    if (subjectId && !enrolledSubjectIds.includes(subjectId)) {
      return res.status(403).json({ error: 'Forbidden: You are not enrolled in this subject.' });
    }

    const targetSubjectIds = subjectId ? [subjectId] : enrolledSubjectIds;

    // Fetch assignments for enrolled subjects
    const assignments = await Assignment.findAll({
      where: {
        subjectId: { [Op.in]: targetSubjectIds },
        [Op.or]: [
          { divisionId: null },
          ...(student.divisionId ? [{ divisionId: student.divisionId }] : [])
        ]
      },
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code', 'credits', 'subjectType'] },
        { model: Teacher, as: 'teacher', attributes: ['id', 'name', 'instituteId'] },
        { model: Division, as: 'division', attributes: ['id', 'name'] },
        {
          model: Submission,
          as: 'submissions',
          where: { studentId },
          required: false
        }
      ],
      order: [['deadline', 'ASC']]
    });

    const now = new Date();
    const studentAssignments = assignments.map(a => {
      const aObj = a.toJSON();
      const studentSubmission = aObj.submissions && aObj.submissions.length > 0 ? aObj.submissions[0] : null;
      const isPastDeadline = now > new Date(aObj.deadline);

      aObj.enrollmentId = enrollmentMap.get(aObj.subjectId);
      aObj.submission = studentSubmission;
      aObj.isPastDeadline = isPastDeadline;
      aObj.hasSubmitted = !!studentSubmission;

      delete aObj.submissions;
      return aObj;
    });

    res.json(studentAssignments);
  } catch (error) {
    console.error('Get student assignments error:', error);
    res.status(500).json({ error: 'Internal server error while fetching student assignments.' });
  }
};

/**
 * T8.4: Student submits work before the deadline (one per enrollment)
 * Requires file upload via uploadSubmissionMiddleware.
 * Enforces deadline check and one-submission-per-enrollment rule.
 */
export const submitAssignment = async (req, res) => {
  const { id } = req.params; // assignmentId
  const studentId = req.user.id;

  if (!req.fileUrl) {
    return res.status(400).json({ error: 'Please select a document or archive file to submit.' });
  }

  try {
    const assignment = await Assignment.findByPk(id);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found.' });
    }

    // 1. Deadline verification (student submits before the deadline)
    const now = new Date();
    if (now > new Date(assignment.deadline)) {
      return res.status(400).json({ 
        error: `Submission rejected: The deadline for this assignment (${new Date(assignment.deadline).toLocaleString()}) has passed.` 
      });
    }

    // 2. Resolve Student Enrollment for this subject (Rules 1, 6)
    const currentTerm = await AcademicTerm.findOne({ where: { isCurrent: true } });
    const enrollmentWhere = {
      studentId,
      subjectId: assignment.subjectId,
      status: 'ENROLLED'
    };
    if (currentTerm) {
      enrollmentWhere.academicTermId = currentTerm.id;
    }

    const enrollment = await Enrollment.findOne({ where: enrollmentWhere });
    if (!enrollment) {
      return res.status(403).json({ 
        error: 'Forbidden: You are not actively enrolled in the subject for this assignment.' 
      });
    }

    // 3. One per enrollment check (unique index [assignmentId, enrollmentId])
    let submission = await Submission.findOne({
      where: {
        assignmentId: id,
        enrollmentId: enrollment.id
      }
    });

    if (submission) {
      // If already accepted/graded, block overwriting
      if (submission.status === 'ACCEPTED') {
        return res.status(400).json({ 
          error: 'This assignment has already been evaluated and accepted. Re-submission is not permitted.' 
        });
      }

      // Allow updating submission before deadline
      await submission.update({
        fileUrl: req.fileUrl,
        status: 'SUBMITTED',
        submittedAt: now
      });

      return res.json({ 
        message: 'Assignment submission updated successfully.', 
        submission 
      });
    }

    // Create new submission
    submission = await Submission.create({
      assignmentId: id,
      enrollmentId: enrollment.id, // strictly keyed by enrollmentId (Flow 8)
      studentId,
      fileUrl: req.fileUrl,
      status: 'SUBMITTED',
      submittedAt: now
    });

    res.status(201).json({ 
      message: 'Assignment submitted successfully.', 
      submission 
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'You have already submitted for this assignment.' });
    }
    console.error('Submit assignment error:', error);
    res.status(500).json({ error: 'Internal server error while submitting assignment.' });
  }
};

/**
 * Delete Assignment
 */
export const deleteAssignment = async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  try {
    const assignment = await Assignment.findByPk(id, {
      include: [{ model: Subject, as: 'subject', attributes: ['departmentId'] }]
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found.' });
    }

    if (user.role === 'TEACHER' && assignment.teacherId !== user.id) {
      return res.status(403).json({ error: 'Forbidden: You can only delete your own assignments.' });
    }

    if (user.role === 'DEPARTMENT_ADMIN' && assignment.subject.departmentId !== user.departmentId) {
      return res.status(403).json({ error: 'Forbidden: Assignment belongs to another department.' });
    }

    // Clean up submissions for this assignment
    await Submission.destroy({ where: { assignmentId: id } });
    await assignment.destroy();

    res.json({ message: 'Assignment deleted successfully.' });
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({ error: 'Internal server error while deleting assignment.' });
  }
};

/**
 * T8.5: Teacher grades student submission:
 * sets marksAwarded, optional feedback, status to 'ACCEPTED', acceptedAt timestamp (Flow 8)
 */
export const gradeSubmission = async (req, res) => {
  const { id, submissionId } = req.params; // assignmentId, submissionId
  const { marksAwarded, feedback } = req.body;
  const user = req.user;

  if (marksAwarded === undefined || marksAwarded === null || marksAwarded === '') {
    return res.status(400).json({ error: 'Marks awarded is required to evaluate the submission.' });
  }

  const marksNum = parseInt(marksAwarded, 10);
  if (isNaN(marksNum) || marksNum < 0) {
    return res.status(400).json({ error: 'Marks awarded must be a non-negative integer.' });
  }

  try {
    const assignment = await Assignment.findByPk(id, {
      include: [{ model: Subject, as: 'subject', attributes: ['departmentId'] }]
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found.' });
    }

    // RBAC: verify teacher allocation/ownership or department admin
    if (user.role === 'TEACHER' && assignment.teacherId !== user.id) {
      return res.status(403).json({ error: 'Forbidden: You did not create this assignment.' });
    }

    if (user.role === 'DEPARTMENT_ADMIN' && assignment.subject?.departmentId !== user.departmentId) {
      return res.status(403).json({ error: 'Forbidden: Assignment belongs to another department.' });
    }

    if (marksNum > assignment.marks) {
      return res.status(400).json({ 
        error: `Marks awarded (${marksNum}) cannot exceed total assignment marks (${assignment.marks}).` 
      });
    }

    const submission = await Submission.findOne({
      where: {
        id: submissionId,
        assignmentId: id
      },
      include: [
        { 
          model: Student, 
          as: 'student', 
          attributes: ['id', 'name', 'rollNumber', 'email'],
          include: [{ model: Division, as: 'division', attributes: ['id', 'name'] }]
        }
      ]
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found for this assignment.' });
    }

    // Update submission with grade, feedback, status = ACCEPTED, acceptedAt = now
    await submission.update({
      marksAwarded: marksNum,
      feedback: feedback && typeof feedback === 'string' ? feedback.trim() : null,
      status: 'ACCEPTED',
      acceptedAt: new Date()
    });

    res.json({
      message: 'Submission evaluated and accepted successfully.',
      submission
    });
  } catch (error) {
    console.error('Grade submission error:', error);
    res.status(500).json({ error: 'Internal server error while grading submission.' });
  }
};
