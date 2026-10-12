import { 
  HallTicket, 
  Exam, 
  Enrollment, 
  Student, 
  Class, 
  Division,
  Subject, 
  Department, 
  AcademicTerm, 
  ExamStaff 
} from '../models/index.js';
import { Op } from 'sequelize';

/**
 * =====================================================================
 * T11.4: HALL TICKET CONTROLLER
 * =====================================================================
 * Invariants & Requirements:
 * - Separate hall tickets for MSE (MIDTERM) and ESE (FINAL) exams.
 * - Hall tickets generated per enrollmentId (not per student) - Rule 18.
 *   Backlog re-attempt students get a separate hall ticket under their
 *   re-attempt enrollment.
 * - Idempotent generation: updates or preserves existing tickets.
 * - Official printable format with IBM Plex Serif, IBM Plex Mono,
 *   and grayscale-safe print styling.
 * =====================================================================
 */

/**
 * Generate hall tickets in bulk for an exam type and academic term.
 * Handled by Exam Staff / Super Admin.
 */
export const generateHallTickets = async (req, res) => {
  const { 
    academicTermId, 
    examType, 
    classId, 
    examCenter = 'Main Campus Examination Block',
    seatPrefix
  } = req.body;

  const generatedById = req.user.id;

  if (!academicTermId) {
    return res.status(400).json({ error: 'Academic term is required' });
  }

  if (!examType || !['MIDTERM', 'FINAL', 'MAKEUP', 'INTERNAL'].includes(examType)) {
    return res.status(400).json({ 
      error: 'Valid examType is required (MIDTERM for MSE, FINAL for ESE, MAKEUP for Backlogs, or INTERNAL)' 
    });
  }

  try {
    // 1. Find all scheduled exams matching the term and exam type
    const examWhere = {
      academicTermId,
      examType
    };
    if (classId) {
      examWhere.classId = classId;
    }

    const scheduledExams = await Exam.findAll({
      where: examWhere,
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
        { model: Class, as: 'class', attributes: ['id', 'name', 'semesterNumber'] }
      ],
      order: [['examDate', 'ASC']]
    });

    if (scheduledExams.length === 0) {
      const typeLabel = examType === 'MIDTERM' ? 'MSE (Midterm)' : examType === 'FINAL' ? 'ESE (Final)' : examType;
      return res.status(404).json({ 
        error: `No scheduled ${typeLabel} exams found for the selected academic term${classId ? ' and class' : ''}. Please schedule exams first.` 
      });
    }

    let createdCount = 0;
    let updatedCount = 0;
    const prefix = seatPrefix || (examType === 'MIDTERM' ? 'MSE-' : examType === 'FINAL' ? 'ESE-' : 'MK-');

    // 2. For each exam, find all eligible enrollments
    for (const exam of scheduledExams) {
      const enrollments = await Enrollment.findAll({
        where: {
          subjectId: exam.subjectId,
          academicTermId: exam.academicTermId,
          status: { [Op.in]: ['ENROLLED', 'PASSED', 'FAILED'] }
        },
        include: [
          {
            model: Student,
            as: 'student',
            attributes: ['id', 'name', 'instituteId', 'rollNumber']
          }
        ],
        order: [
          [{ model: Student, as: 'student' }, 'instituteId', 'ASC']
        ]
      });

      // 3. Create or update HallTicket row for each enrollment
      for (let i = 0; i < enrollments.length; i++) {
        const enr = enrollments[i];
        if (!enr.student) continue;

        // Systematic seat number: e.g. MSE-001 or ESE-001 based on student index
        const seatNumber = `${prefix}${String(i + 1).padStart(3, '0')}`;

        const [ticket, created] = await HallTicket.findOrCreate({
          where: {
            enrollmentId: enr.id,
            examId: exam.id,
            studentId: enr.student.id
          },
          defaults: {
            seatNumber,
            examCenter,
            generatedById,
            generatedAt: new Date()
          }
        });

        if (created) {
          createdCount++;
        } else {
          // If already exists, ensure seatNumber and center are populated
          let changed = false;
          if (!ticket.seatNumber) {
            ticket.seatNumber = seatNumber;
            changed = true;
          }
          if (!ticket.examCenter) {
            ticket.examCenter = examCenter;
            changed = true;
          }
          if (changed) {
            ticket.generatedById = generatedById;
            ticket.generatedAt = new Date();
            await ticket.save();
            updatedCount++;
          }
        }
      }
    }

    res.json({
      message: `Hall tickets processed successfully: ${createdCount} created, ${updatedCount} updated across ${scheduledExams.length} examinations.`,
      createdCount,
      updatedCount,
      totalProcessed: createdCount + updatedCount,
      examsCount: scheduledExams.length,
      examType
    });
  } catch (error) {
    console.error('Error generating hall tickets:', error);
    res.status(500).json({ error: 'Failed to generate hall tickets' });
  }
};

/**
 * List hall tickets with multi-dimensional filtering (Exam Staff / Admins).
 */
export const getHallTickets = async (req, res) => {
  const { 
    academicTermId, 
    examType, 
    classId, 
    departmentId, 
    studentId, 
    examId, 
    search 
  } = req.query;

  try {
    const where = {};
    if (studentId) where.studentId = studentId;
    if (examId) where.examId = examId;

    const examWhere = {};
    if (academicTermId) examWhere.academicTermId = academicTermId;
    if (examType) examWhere.examType = examType;
    if (classId) examWhere.classId = classId;

    const classWhere = {};
    if (departmentId) classWhere.departmentId = departmentId;

    const studentWhere = {};
    if (search) {
      studentWhere[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { instituteId: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const tickets = await HallTicket.findAll({
      where,
      include: [
        {
          model: Student,
          as: 'student',
          where: Object.keys(studentWhere).length > 0 ? studentWhere : undefined,
          attributes: ['id', 'name', 'instituteId', 'rollNumber', 'email', 'departmentId'],
          include: [
            { model: Department, as: 'department', attributes: ['id', 'name', 'code'] }
          ]
        },
        {
          model: Exam,
          as: 'exam',
          where: Object.keys(examWhere).length > 0 ? examWhere : undefined,
          include: [
            { model: Subject, as: 'subject', attributes: ['id', 'name', 'code', 'credits'] },
            { 
              model: Class, 
              as: 'class', 
              where: Object.keys(classWhere).length > 0 ? classWhere : undefined,
              attributes: ['id', 'name', 'semesterNumber', 'batchYear'],
              include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
            },
            { model: AcademicTerm, as: 'academicTerm', attributes: ['id', 'name', 'isCurrent'] }
          ]
        },
        {
          model: Enrollment,
          as: 'enrollment',
          attributes: ['id', 'attemptNumber', 'status']
        },
        {
          model: ExamStaff,
          as: 'generatedBy',
          attributes: ['id', 'name', 'instituteId']
        }
      ],
      order: [
        [{ model: Exam, as: 'exam' }, 'examDate', 'ASC'],
        ['seatNumber', 'ASC']
      ]
    });

    res.json(tickets);
  } catch (error) {
    console.error('Error fetching hall tickets:', error);
    res.status(500).json({ error: 'Failed to fetch hall tickets' });
  }
};

/**
 * Get Hall Tickets for the logged-in Student (or linked Parent).
 * Groups tickets by Exam Type (MSE / ESE / MAKEUP) and Term into official printable hall tickets!
 */
export const getMyHallTickets = async (req, res) => {
  let studentId = req.user.id;

  // If Parent, allow child studentId query param
  if (req.user.role === 'PARENT') {
    studentId = req.query.studentId;
    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required for parent view' });
    }
  }

  try {
    const student = await Student.findByPk(studentId, {
      attributes: ['id', 'name', 'instituteId', 'rollNumber', 'email'],
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
        { 
          model: Division, 
          as: 'division', 
          attributes: ['id', 'name'],
          include: [{ model: Class, as: 'class', attributes: ['id', 'name', 'semesterNumber', 'batchYear'] }]
        }
      ]
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const studentJson = student.toJSON();
    studentJson.class = studentJson.division?.class || null;

    // Fetch all hall ticket entries for this student
    const rawTickets = await HallTicket.findAll({
      where: { studentId },
      include: [
        {
          model: Exam,
          as: 'exam',
          include: [
            { model: Subject, as: 'subject', attributes: ['id', 'name', 'code', 'credits'] },
            { 
              model: Class, 
              as: 'class', 
              attributes: ['id', 'name', 'semesterNumber'],
              include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
            },
            { model: AcademicTerm, as: 'academicTerm', attributes: ['id', 'name', 'isCurrent'] }
          ]
        },
        {
          model: Enrollment,
          as: 'enrollment',
          attributes: ['id', 'attemptNumber', 'status']
        },
        {
          model: ExamStaff,
          as: 'generatedBy',
          attributes: ['id', 'name', 'instituteId']
        }
      ],
      order: [
        [{ model: Exam, as: 'exam' }, 'examDate', 'ASC']
      ]
    });

    // Group hall tickets by [academicTermId + '_' + examType + '_' + (attemptNumber > 1 ? 'BACKLOG' : 'REGULAR')]
    // This delivers SEPARATE Hall Tickets for MSE and ESE, and separate for Backlog Makeups (Rule 18)
    const groupedMap = {};

    for (const ticket of rawTickets) {
      if (!ticket.exam) continue;

      const exam = ticket.exam;
      const term = exam.academicTerm;
      const examType = exam.examType; // 'MIDTERM', 'FINAL', 'MAKEUP'
      const isBacklog = (ticket.enrollment?.attemptNumber || 1) > 1;
      const groupKey = `${exam.academicTermId}_${examType}_${isBacklog ? 'BACKLOG' : 'REGULAR'}`;

      if (!groupedMap[groupKey]) {
        let typeTitle = 'Mid-Semester Examination (MSE)';
        if (examType === 'FINAL') typeTitle = 'End-Semester Examination (ESE)';
        else if (examType === 'MAKEUP') typeTitle = 'Backlog / Re-attempt Examination';
        else if (examType === 'INTERNAL') typeTitle = 'Continuous Assessment Examination';

        groupedMap[groupKey] = {
          id: groupKey,
          academicTermId: exam.academicTermId,
          academicTermName: term?.name || 'Academic Term',
          isCurrentTerm: term?.isCurrent || false,
          examType,
          isBacklog,
          attemptNumber: ticket.enrollment?.attemptNumber || 1,
          title: `${typeTitle}${isBacklog ? ' (Re-attempt)' : ''}`,
          hallTicketNumber: `HT-${examType}-${student.instituteId}-${ticket.enrollment?.attemptNumber || 1}`,
          student: studentJson,
          seatNumber: ticket.seatNumber || 'Assigned at Hall',
          examCenter: ticket.examCenter || 'Main Examination Block',
          generatedAt: ticket.generatedAt,
          generatedBy: ticket.generatedBy,
          exams: []
        };
      }

      groupedMap[groupKey].exams.push({
        hallTicketId: ticket.id,
        enrollmentId: ticket.enrollmentId,
        examId: exam.id,
        subjectId: exam.subject?.id,
        subjectName: exam.subject?.name,
        subjectCode: exam.subject?.code,
        credits: exam.subject?.credits,
        className: exam.class?.name,
        semesterNumber: exam.class?.semesterNumber,
        examDate: exam.examDate,
        maxMarks: exam.maxMarks,
        passingMarks: exam.passingMarks,
        seatNumber: ticket.seatNumber || groupedMap[groupKey].seatNumber,
        examCenter: ticket.examCenter || groupedMap[groupKey].examCenter
      });
    }

    const groupedTickets = Object.values(groupedMap);
    res.json(groupedTickets);
  } catch (error) {
    console.error('Error fetching student hall tickets:', error);
    res.status(500).json({ error: 'Failed to fetch hall tickets' });
  }
};

/**
 * Delete a single hall ticket (Exam Staff / Super Admin).
 */
export const deleteHallTicket = async (req, res) => {
  const { id } = req.params;

  try {
    const ticket = await HallTicket.findByPk(id);
    if (!ticket) {
      return res.status(404).json({ error: 'Hall ticket not found' });
    }

    await ticket.destroy();
    res.json({ message: 'Hall ticket revoked successfully', id });
  } catch (error) {
    console.error('Error deleting hall ticket:', error);
    res.status(500).json({ error: 'Failed to delete hall ticket' });
  }
};

/**
 * Bulk revoke/clear hall tickets for a specific exam or term & examType.
 */
export const bulkDeleteHallTickets = async (req, res) => {
  const { examId, academicTermId, examType, classId } = req.body;

  try {
    const where = {};
    if (examId) {
      where.examId = examId;
    } else if (academicTermId && examType) {
      const exams = await Exam.findAll({
        where: {
          academicTermId,
          examType,
          ...(classId ? { classId } : {})
        },
        attributes: ['id']
      });
      where.examId = { [Op.in]: exams.map(e => e.id) };
    } else {
      return res.status(400).json({ error: 'Provide either examId or (academicTermId and examType)' });
    }

    const count = await HallTicket.destroy({ where });
    res.json({ message: `Successfully revoked ${count} hall tickets.`, revokedCount: count });
  } catch (error) {
    console.error('Error bulk deleting hall tickets:', error);
    res.status(500).json({ error: 'Failed to revoke hall tickets' });
  }
};
