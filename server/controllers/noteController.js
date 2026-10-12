import { Note, Subject, Teacher, Division, Class, Enrollment, Student, AcademicTerm, SubjectAllocation, ParentStudent } from '../models/index.js';
import { Op } from 'sequelize';

/**
 * T8.2: Create / Upload Note
 * Teacher uploads note (topic + pdfUrl), tied to their allocated subject & optional division.
 */
export const createNote = async (req, res) => {
  const { subjectId, topic, divisionId } = req.body;
  const user = req.user;

  if (!subjectId || !topic) {
    return res.status(400).json({ error: 'Subject ID and topic are required.' });
  }

  if (!req.fileUrl) {
    return res.status(400).json({ error: 'Please upload a study material / note document (PDF, Word, PPT, etc.).' });
  }

  try {
    let teacherId = user.id;

    // RBAC and allocation validation
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

      // If admin uploads, optionally specify teacherId or use allocation
      if (req.body.teacherId) {
        teacherId = req.body.teacherId;
      } else {
        const allocation = await SubjectAllocation.findOne({ where: { subjectId } });
        if (allocation) teacherId = allocation.teacherId;
      }
    } else {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions to upload notes.' });
    }

    const note = await Note.create({
      teacherId,
      subjectId,
      divisionId: divisionId || null, // null = entire class (Rule 29 wildcard)
      topic: topic.trim(),
      pdfUrl: req.fileUrl
    });

    const populatedNote = await Note.findByPk(note.id, {
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code', 'subjectType'] },
        { model: Teacher, as: 'teacher', attributes: ['id', 'name', 'instituteId'] },
        { model: Division, as: 'division', attributes: ['id', 'name'] }
      ]
    });

    res.status(201).json(populatedNote);
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ error: 'Internal server error while creating note.' });
  }
};

/**
 * List Notes for Teachers & Dept Admins
 */
export const getNotes = async (req, res) => {
  const { subjectId, divisionId } = req.query;
  const user = req.user;

  try {
    let whereClause = {};
    if (subjectId) whereClause.subjectId = subjectId;
    if (divisionId) whereClause.divisionId = divisionId;

    if (user.role === 'TEACHER') {
      whereClause.teacherId = user.id;
    }

    const notes = await Note.findAll({
      where: whereClause,
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code', 'subjectType'] },
        { model: Teacher, as: 'teacher', attributes: ['id', 'name', 'instituteId'] },
        { model: Division, as: 'division', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(notes);
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ error: 'Internal server error while fetching notes.' });
  }
};

/**
 * T8.2: Get Notes for Enrolled Student
 * Students see notes ONLY for subjects they are actively enrolled in (via Enrollment table).
 * Wildcard null divisionId is included alongside matching student divisionId (Rule 29).
 */
export const getStudentNotes = async (req, res) => {
  const studentId = req.user.id;
  const { subjectId } = req.query;

  try {
    const student = await Student.findByPk(studentId, {
      attributes: ['id', 'name', 'divisionId', 'departmentId']
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    // Resolve current academic term
    const currentTerm = await AcademicTerm.findOne({ where: { isCurrent: true } });

    // Fetch student's enrollments (Rule 1 & 6: key off enrollments, captures backlogs too)
    const enrollmentWhere = {
      studentId,
      status: { [Op.in]: ['ENROLLED', 'PASSED'] }
    };
    if (currentTerm) {
      enrollmentWhere.academicTermId = currentTerm.id;
    }

    const enrollments = await Enrollment.findAll({
      where: enrollmentWhere,
      attributes: ['subjectId', 'classId', 'attemptNumber']
    });

    if (enrollments.length === 0) {
      return res.json([]);
    }

    const enrolledSubjectIds = enrollments.map(e => e.subjectId);

    // If specific subject requested, verify student is enrolled in it
    if (subjectId && !enrolledSubjectIds.includes(subjectId)) {
      return res.status(403).json({ error: 'Forbidden: You are not enrolled in this subject.' });
    }

    const targetSubjectIds = subjectId ? [subjectId] : enrolledSubjectIds;

    // Query notes scoped to enrolled subjects AND (class-wide null division OR student's division)
    const notes = await Note.findAll({
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
        { model: Division, as: 'division', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(notes);
  } catch (error) {
    console.error('Get student notes error:', error);
    res.status(500).json({ error: 'Internal server error while fetching student notes.' });
  }
};

/**
 * Get Student Notes by studentId (for Parents viewing ward notes)
 */
export const getStudentNotesById = async (req, res) => {
  const { studentId } = req.params;
  const user = req.user;

  // Authorization check for parents
  if (user.role === 'PARENT') {
    const isLinked = await ParentStudent.findOne({
      where: { parentId: user.id, studentId }
    });
    if (!isLinked) {
      return res.status(403).json({ error: 'Forbidden: Student is not linked to your parent account.' });
    }
  }

  try {
    const student = await Student.findByPk(studentId, {
      attributes: ['id', 'name', 'divisionId', 'departmentId']
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const currentTerm = await AcademicTerm.findOne({ where: { isCurrent: true } });
    const enrollmentWhere = {
      studentId,
      status: { [Op.in]: ['ENROLLED', 'PASSED'] }
    };
    if (currentTerm) {
      enrollmentWhere.academicTermId = currentTerm.id;
    }

    const enrollments = await Enrollment.findAll({
      where: enrollmentWhere,
      attributes: ['subjectId']
    });

    const enrolledSubjectIds = enrollments.map(e => e.subjectId);

    const notes = await Note.findAll({
      where: {
        subjectId: { [Op.in]: enrolledSubjectIds },
        [Op.or]: [
          { divisionId: null },
          ...(student.divisionId ? [{ divisionId: student.divisionId }] : [])
        ]
      },
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code', 'credits', 'subjectType'] },
        { model: Teacher, as: 'teacher', attributes: ['id', 'name', 'instituteId'] },
        { model: Division, as: 'division', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(notes);
  } catch (error) {
    console.error('Get student notes by ID error:', error);
    res.status(500).json({ error: 'Internal server error while fetching notes.' });
  }
};

/**
 * Delete Note
 */
export const deleteNote = async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  try {
    const note = await Note.findByPk(id, {
      include: [{ model: Subject, as: 'subject', attributes: ['departmentId'] }]
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found.' });
    }

    // Permission check
    if (user.role === 'TEACHER' && note.teacherId !== user.id) {
      return res.status(403).json({ error: 'Forbidden: You can only delete your own notes.' });
    }

    if (user.role === 'DEPARTMENT_ADMIN' && note.subject.departmentId !== user.departmentId) {
      return res.status(403).json({ error: 'Forbidden: Note belongs to another department.' });
    }

    await note.destroy();
    res.json({ message: 'Note deleted successfully.' });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Internal server error while deleting note.' });
  }
};
