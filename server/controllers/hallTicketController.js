import { 
  HallTicket, 
  Exam, 
  Enrollment, 
  Student, 
  Subject, 
  Class, 
  Department, 
  Division, 
  AcademicTerm, 
  ExamStaff,
  sequelize 
} from '../models/index.js';
import { Op } from 'sequelize';

/**
 * Batch generate Hall Tickets for all enrolled students of an Exam or Term (Rule 18 / Flow 11)
 * Generates one HallTicket per enrollmentId. Reuses student seat number within same term.
 */
export const generateHallTickets = async (req, res) => {
  const { 
    examId, 
    examIds, // array of selected exam IDs from preview
    academicTermId,
    classId,
    departmentId,
    examType, // 'MIDTERM', 'FINAL', etc.
    examCenter = 'Main Campus Examination Center', 
    seatPrefix = 'SEAT-', 
    startSequence = 1,
    attemptFilter // optional: 'ALL', 'REGULAR' (attempt=1), 'BACKLOG' (attempt>1)
  } = req.body;

  if (!examId && !examIds && !academicTermId && !classId) {
    return res.status(400).json({ error: 'Exam selection, Class ID, or Academic Term ID is required' });
  }

  try {
    let targetExams = [];

    if (examIds && Array.isArray(examIds) && examIds.length > 0) {
      targetExams = await Exam.findAll({
        where: { id: { [Op.in]: examIds } },
        include: [
          { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
          { model: Class, as: 'class', attributes: ['id', 'batchYear', 'semesterNumber'] },
          { model: AcademicTerm, as: 'academicTerm', attributes: ['id', 'name'] }
        ]
      });
      if (targetExams.length === 0) {
        return res.status(404).json({ error: 'None of the selected exams were found' });
      }
    } else if (examId && examId !== 'ALL_IN_TERM') {
      const singleExam = await Exam.findByPk(examId, {
        include: [
          { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
          { model: Class, as: 'class', attributes: ['id', 'batchYear', 'semesterNumber'] },
          { model: AcademicTerm, as: 'academicTerm', attributes: ['id', 'name'] }
        ]
      });
      if (!singleExam) {
        return res.status(404).json({ error: 'Exam not found' });
      }
      targetExams = [singleExam];
    } else {
      // Find all exams matching the class, term, and examType criteria
      const examWhere = {};
      if (academicTermId) examWhere.academicTermId = academicTermId;
      if (classId) examWhere.classId = classId;
      if (examType && examType !== 'ALL') examWhere.examType = examType;

      targetExams = await Exam.findAll({
        where: examWhere,
        include: [
          { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
          { model: Class, as: 'class', attributes: ['id', 'batchYear', 'semesterNumber'] },
          { model: AcademicTerm, as: 'academicTerm', attributes: ['id', 'name'] }
        ]
      });

      if (targetExams.length === 0) {
        return res.status(400).json({ 
          error: `No scheduled ${examType ? `'${examType}' ` : ''}exams found for the selected criteria.` 
        });
      }
    }

    let totalGenerated = 0;
    let totalSkipped = 0;
    let sequence = Number(startSequence) || 1;

    for (const exam of targetExams) {
      // Find all active enrollments for this subject and term
      const enrollmentWhere = {
        subjectId: exam.subjectId,
        academicTermId: exam.academicTermId,
        status: 'ENROLLED'
      };

      if (attemptFilter === 'REGULAR') {
        enrollmentWhere.attemptNumber = 1;
      } else if (attemptFilter === 'BACKLOG') {
        enrollmentWhere.attemptNumber = { [Op.gt]: 1 };
      } else if (exam.examType === 'MAKEUP') {
        enrollmentWhere.attemptNumber = { [Op.gt]: 1 };
      }

      const enrollments = await Enrollment.findAll({
        where: enrollmentWhere,
        include: [
          { 
            model: Student, 
            as: 'student', 
            attributes: ['id', 'name', 'instituteId', 'rollNumber', 'divisionId', 'departmentId'],
            include: [{ model: Division, as: 'division', attributes: ['name', 'classId'] }]
          }
        ],
        order: [
          [{ model: Student, as: 'student' }, 'instituteId', 'ASC']
        ]
      });

      // Existing hall tickets for this exam
      const existingTickets = await HallTicket.findAll({
        where: { examId: exam.id },
        attributes: ['enrollmentId']
      });
      const existingEnrollmentIds = new Set(existingTickets.map(t => t.enrollmentId));

      for (const enrollment of enrollments) {
        if (existingEnrollmentIds.has(enrollment.id)) {
          totalSkipped++;
          continue;
        }

        if (departmentId && enrollment.student?.departmentId && enrollment.student.departmentId !== departmentId) {
          continue;
        }

        // Rule 18 & Rule 10: Backlog re-attempts carry the original classId (curriculum class)
        // Check if either the enrollment's classId or the student's current division classId matches
        if (classId) {
          const matchesEnrollmentClass = enrollment.classId === classId;
          const matchesStudentDivisionClass = enrollment.student?.division?.classId === classId;
          if (!matchesEnrollmentClass && !matchesStudentDivisionClass) {
            continue;
          }
        }

        // Check if student already has a seat number assigned in this academic term & exam series
        let seatNumber = null;
        const existingStudentTicketInTerm = await HallTicket.findOne({
          where: { studentId: enrollment.studentId },
          include: [{
            model: Exam,
            as: 'exam',
            where: { 
              academicTermId: exam.academicTermId,
              examType: exam.examType 
            }
          }]
        });

        if (existingStudentTicketInTerm && existingStudentTicketInTerm.seatNumber) {
          // Keep consistent seat number across all exams in the same series
          seatNumber = existingStudentTicketInTerm.seatNumber;
        } else {
          const paddedNum = String(sequence).padStart(3, '0');
          seatNumber = `${seatPrefix}${paddedNum}`;
          sequence++;
        }

        await HallTicket.create({
          enrollmentId: enrollment.id,
          examId: exam.id,
          studentId: enrollment.studentId,
          seatNumber,
          examCenter,
          generatedById: req.user?.id || null,
          generatedAt: new Date()
        });

        totalGenerated++;
      }
    }

    res.status(201).json({
      message: `Generated ${totalGenerated} hall tickets across ${targetExams.length} exam(s) (${totalSkipped} already existed).`,
      generatedCount: totalGenerated,
      skippedCount: totalSkipped,
      examsCovered: targetExams.length
    });

  } catch (error) {
    console.error('Generate Hall Tickets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Preview exams and candidate counts before generating hall tickets
 */
export const getPreviewExams = async (req, res) => {
  const { 
    academicTermId, 
    departmentId, 
    classId, 
    examType,
    attemptFilter 
  } = req.query;

  if (!classId && !academicTermId && !departmentId) {
    return res.status(400).json({ error: 'Department, Class, or Academic Term is required for preview' });
  }

  try {
    const examWhere = {};
    if (academicTermId) examWhere.academicTermId = academicTermId;
    if (classId) examWhere.classId = classId;
    if (examType && examType !== 'ALL') examWhere.examType = examType;

    const exams = await Exam.findAll({
      where: examWhere,
      include: [
        { 
          model: Subject, 
          as: 'subject', 
          attributes: ['id', 'name', 'code', 'credits', 'subjectType'] 
        },
        { 
          model: Class, 
          as: 'class', 
          attributes: ['id', 'name', 'batchYear', 'semesterNumber'],
          where: departmentId ? { departmentId } : undefined,
          include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
        },
        { 
          model: AcademicTerm, 
          as: 'academicTerm', 
          attributes: ['id', 'name', 'isCurrent'] 
        }
      ],
      order: [['examDate', 'ASC']]
    });

    // For each exam, compute enrollmentCount and ticketCount (filtering attemptNumber by examType / attemptFilter)
    const examsWithStats = await Promise.all(exams.map(async (exam) => {
      const enrollmentWhere = {
        subjectId: exam.subjectId,
        academicTermId: exam.academicTermId,
        status: 'ENROLLED'
      };

      if (attemptFilter === 'REGULAR') {
        enrollmentWhere.attemptNumber = 1;
      } else if (attemptFilter === 'BACKLOG' || exam.examType === 'MAKEUP') {
        enrollmentWhere.attemptNumber = { [Op.gt]: 1 };
      }

      const [enrollmentCount, ticketCount] = await Promise.all([
        Enrollment.count({
          where: enrollmentWhere
        }),
        HallTicket.count({
          where: { examId: exam.id }
        })
      ]);

      const exJson = exam.toJSON();
      exJson.enrollmentCount = enrollmentCount;
      exJson.ticketCount = ticketCount;
      return exJson;
    }));

    // Find student count for the selected class or backlog candidates
    let candidateStudentCount = 0;
    if (examType === 'MAKEUP' || attemptFilter === 'BACKLOG') {
      const subjectIds = exams.map(e => e.subjectId);
      if (subjectIds.length > 0) {
        const distinctBacklogStudents = await Enrollment.findAll({
          where: {
            subjectId: { [Op.in]: subjectIds },
            academicTermId: academicTermId || exams[0]?.academicTermId,
            attemptNumber: { [Op.gt]: 1 },
            status: 'ENROLLED'
          },
          attributes: ['studentId'],
          group: ['studentId']
        });
        candidateStudentCount = distinctBacklogStudents.length;
      }
    } else if (classId) {
      const divisions = await Division.findAll({ where: { classId }, attributes: ['id'] });
      const divisionIds = divisions.map(d => d.id);
      if (divisionIds.length > 0) {
        candidateStudentCount = await Student.count({
          where: { divisionId: { [Op.in]: divisionIds } }
        });
      }
    }

    res.json({
      exams: examsWithStats,
      totalExams: examsWithStats.length,
      candidateStudentCount
    });
  } catch (error) {
    console.error('Get Preview Exams error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * List Hall Tickets with filtering
 */
export const getHallTickets = async (req, res) => {
  const { 
    examId, 
    studentId, 
    academicTermId, 
    departmentId, 
    classId,
    examType,
    search 
  } = req.query;

  try {
    const where = {};
    if (examId) where.examId = examId;
    if (studentId) where.studentId = studentId;

    const examWhere = {};
    if (academicTermId) examWhere.academicTermId = academicTermId;
    if (classId) examWhere.classId = classId;
    if (examType && examType !== 'ALL') examWhere.examType = examType;

    const studentWhere = {};
    if (departmentId) studentWhere.departmentId = departmentId;

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      studentWhere[Op.or] = [
        sequelize.where(sequelize.fn('lower', sequelize.col('student.name')), { [Op.like]: q }),
        sequelize.where(sequelize.fn('lower', sequelize.col('student.instituteId')), { [Op.like]: q })
      ];
    }

    const hallTickets = await HallTicket.findAll({
      where,
      include: [
        {
          model: Student,
          as: 'student',
          where: Object.keys(studentWhere).length > 0 ? studentWhere : undefined,
          attributes: ['id', 'name', 'instituteId', 'rollNumber', 'email', 'batchYear', 'departmentId'],
          include: [
            { model: Division, as: 'division', attributes: ['id', 'name'] },
            { model: Department, as: 'department', attributes: ['id', 'name', 'code'] }
          ]
        },
        {
          model: Exam,
          as: 'exam',
          where: Object.keys(examWhere).length > 0 ? examWhere : undefined,
          include: [
            { model: Subject, as: 'subject', attributes: ['id', 'name', 'code', 'subjectType', 'credits'] },
            { 
              model: Class, 
              as: 'class', 
              attributes: ['id', 'batchYear', 'semesterNumber'],
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
        ['createdAt', 'DESC']
      ]
    });

    res.json(hallTickets);
  } catch (error) {
    console.error('Get Hall Tickets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get unified Student Admit Card with strictly isolated exams for a term & exam series
 */
export const getStudentAdmitCard = async (req, res) => {
  const studentId = (req.params.studentId === 'me' || !req.params.studentId) ? req.user?.id : req.params.studentId;
  const { academicTermId, examType } = req.query;

  // Security check: Student can only view their own admit card
  if (req.user?.role === 'STUDENT' && req.user.id !== studentId) {
    return res.status(403).json({ error: 'Unauthorized to view hall ticket for another student' });
  }

  try {
    const student = await Student.findByPk(studentId, {
      attributes: ['id', 'name', 'instituteId', 'rollNumber', 'email', 'batchYear', 'departmentId'],
      include: [
        { model: Division, as: 'division', attributes: ['id', 'name'] },
        { model: Department, as: 'department', attributes: ['id', 'name', 'code'] }
      ]
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const examWhere = {};
    if (academicTermId) examWhere.academicTermId = academicTermId;
    if (examType && examType !== 'ALL') examWhere.examType = examType;

    const tickets = await HallTicket.findAll({
      where: { studentId },
      include: [
        {
          model: Exam,
          as: 'exam',
          where: Object.keys(examWhere).length > 0 ? examWhere : undefined,
          include: [
            { model: Subject, as: 'subject', attributes: ['id', 'name', 'code', 'subjectType', 'credits'] },
            { 
              model: Class, 
              as: 'class', 
              attributes: ['id', 'batchYear', 'semesterNumber'],
              include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
            },
            { model: AcademicTerm, as: 'academicTerm', attributes: ['id', 'name', 'startDate', 'endDate', 'isCurrent'] }
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

    // Find all ticket exam types available for this student in this term
    const allTermTickets = await HallTicket.findAll({
      where: { studentId },
      include: [{
        model: Exam,
        as: 'exam',
        where: academicTermId ? { academicTermId } : undefined,
        attributes: ['id', 'examType', 'academicTermId']
      }]
    });
    const availableExamTypes = [...new Set(allTermTickets.map(t => t.exam?.examType).filter(Boolean))];

    if (tickets.length === 0) {
      return res.status(404).json({ 
        error: `No hall tickets found for ${examType ? `'${examType}' ` : ''}examinations in the selected academic term`,
        availableExamTypes
      });
    }

    // Determine target examType (if not explicitly passed, pick the first ticket's examType so we NEVER mix series)
    const targetType = (examType && examType !== 'ALL') ? examType : tickets[0].exam?.examType;
    const filteredTickets = tickets.filter(t => t.exam?.examType === targetType);

    if (filteredTickets.length === 0) {
      return res.status(404).json({ 
        error: `No hall tickets found for '${targetType}' examinations`,
        availableExamTypes
      });
    }

    const primary = filteredTickets[0];
    const allExams = filteredTickets.map(t => ({
      ticketId: t.id,
      seatNumber: t.seatNumber,
      examCenter: t.examCenter,
      examId: t.examId,
      examDate: t.exam?.examDate,
      startTime: t.exam?.startTime,
      durationMinutes: t.exam?.durationMinutes,
      examType: t.exam?.examType,
      subject: t.exam?.subject,
      class: t.exam?.class,
      academicTerm: t.exam?.academicTerm,
      attemptNumber: t.enrollment?.attemptNumber || 1
    }));

    res.json({
      id: primary.id,
      seatNumber: primary.seatNumber,
      examCenter: primary.examCenter,
      generatedAt: primary.generatedAt,
      examType: targetType,
      student,
      academicTerm: primary.exam?.academicTerm,
      enrollment: primary.enrollment,
      allExams,
      availableExamTypes
    });

  } catch (error) {
    console.error('Get Student Admit Card error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get distinct available hall ticket exam types for a student in a term
 */
export const getStudentTicketTypes = async (req, res) => {
  const { studentId } = req.params;
  const { academicTermId } = req.query;

  try {
    const tickets = await HallTicket.findAll({
      where: { studentId },
      include: [{
        model: Exam,
        as: 'exam',
        where: academicTermId ? { academicTermId } : undefined,
        attributes: ['id', 'examType', 'academicTermId']
      }]
    });

    const types = [...new Set(tickets.map(t => t.exam?.examType).filter(Boolean))];
    res.json({ availableExamTypes: types });
  } catch (err) {
    console.error('Error getting student ticket types:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get single Hall Ticket by ID with full printable metadata + all student exams in same series
 */
export const getHallTicketById = async (req, res) => {
  const { id } = req.params;

  try {
    const ticket = await HallTicket.findByPk(id, {
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'name', 'instituteId', 'rollNumber', 'email', 'batchYear', 'departmentId'],
          include: [
            { model: Division, as: 'division', attributes: ['id', 'name'] },
            { model: Department, as: 'department', attributes: ['id', 'name', 'code'] }
          ]
        },
        {
          model: Exam,
          as: 'exam',
          include: [
            { model: Subject, as: 'subject', attributes: ['id', 'name', 'code', 'subjectType', 'credits'] },
            { 
              model: Class, 
              as: 'class', 
              attributes: ['id', 'batchYear', 'semesterNumber'],
              include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
            },
            { model: AcademicTerm, as: 'academicTerm', attributes: ['id', 'name', 'startDate', 'endDate', 'isCurrent'] }
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
      ]
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Hall ticket not found' });
    }

    // Fetch ONLY other hall tickets / exams for this student in the same term AND SAME EXAM TYPE (never mix)
    const termId = ticket.exam?.academicTermId;
    const currentExamType = ticket.exam?.examType;
    const allStudentTickets = await HallTicket.findAll({
      where: { studentId: ticket.studentId },
      include: [
        {
          model: Exam,
          as: 'exam',
          where: {
            ...(termId ? { academicTermId: termId } : {}),
            ...(currentExamType ? { examType: currentExamType } : {})
          },
          include: [
            { model: Subject, as: 'subject', attributes: ['id', 'name', 'code', 'subjectType', 'credits'] }
          ]
        },
        {
          model: Enrollment,
          as: 'enrollment',
          attributes: ['id', 'attemptNumber', 'status']
        }
      ],
      order: [
        [{ model: Exam, as: 'exam' }, 'examDate', 'ASC']
      ]
    });

    const ticketData = ticket.toJSON();
    ticketData.examType = currentExamType;
    ticketData.allExams = allStudentTickets.map(st => ({
      ticketId: st.id,
      seatNumber: st.seatNumber,
      examCenter: st.examCenter,
      examId: st.examId,
      examDate: st.exam?.examDate,
      startTime: st.exam?.startTime,
      durationMinutes: st.exam?.durationMinutes,
      examType: st.exam?.examType,
      subject: st.exam?.subject,
      attemptNumber: st.enrollment?.attemptNumber || 1
    }));

    res.json(ticketData);
  } catch (error) {
    console.error('Get Hall Ticket by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update Hall Ticket (seat number or center)
 */
export const updateHallTicket = async (req, res) => {
  const { id } = req.params;
  const { seatNumber, examCenter, applyToAllExams = true } = req.body;

  try {
    const ticket = await HallTicket.findByPk(id, {
      include: [{ model: Exam, as: 'exam' }]
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Hall ticket not found' });
    }

    const updates = {};
    if (seatNumber !== undefined) updates.seatNumber = seatNumber;
    if (examCenter !== undefined) updates.examCenter = examCenter;

    if (applyToAllExams && ticket.studentId && ticket.exam?.academicTermId) {
      // Find all tickets for this student in the same academic term
      const termTickets = await HallTicket.findAll({
        where: { studentId: ticket.studentId },
        include: [{
          model: Exam,
          as: 'exam',
          where: { academicTermId: ticket.exam.academicTermId }
        }]
      });

      for (const t of termTickets) {
        await t.update(updates);
      }
    } else {
      await ticket.update(updates);
    }

    res.json({ message: 'Hall ticket updated successfully', ticket });
  } catch (error) {
    console.error('Update Hall Ticket error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete / Revoke Hall Ticket
 */
export const deleteHallTicket = async (req, res) => {
  const { id } = req.params;
  const { revokeAllForStudent = false } = req.query;

  try {
    const ticket = await HallTicket.findByPk(id, {
      include: [{ model: Exam, as: 'exam' }]
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Hall ticket not found' });
    }

    if (revokeAllForStudent === 'true' && ticket.studentId && ticket.exam?.academicTermId) {
      const termTickets = await HallTicket.findAll({
        where: { studentId: ticket.studentId },
        include: [{
          model: Exam,
          as: 'exam',
          where: { academicTermId: ticket.exam.academicTermId }
        }]
      });

      for (const t of termTickets) {
        await t.destroy();
      }
      res.json({ message: `Revoked ${termTickets.length} hall tickets for student across term.` });
    } else {
      await ticket.destroy();
      res.json({ message: 'Hall ticket deleted successfully', id });
    }
  } catch (error) {
    console.error('Delete Hall Ticket error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
