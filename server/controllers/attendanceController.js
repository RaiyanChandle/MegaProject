import { 
  AttendanceSession, 
  AttendanceRecord, 
  SubjectAllocation, 
  Enrollment, 
  Student, 
  Subject, 
  Class, 
  Division, 
  AcademicTerm, 
  ParentStudent, 
  Teacher 
} from '../models/index.js';
import sequelize from '../config/database.js';
import { Op } from 'sequelize';

/**
 * Helper to convert 12h (e.g. "09:00 AM") or 24h (e.g. "09:00") time strings to minutes from midnight
 */
export const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const cleaned = timeStr.trim().toUpperCase();

  // 12-hour format: "09:00 AM" or "9:30PM"
  const ampmMatch = cleaned.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = parseInt(ampmMatch[2], 10);
    const period = ampmMatch[3];
    if (hours === 12) {
      hours = period === 'AM' ? 0 : 12;
    } else if (period === 'PM') {
      hours += 12;
    }
    return hours * 60 + minutes;
  }

  // 24-hour format: "09:00" or "14:30"
  const militaryMatch = cleaned.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (militaryMatch) {
    const hours = parseInt(militaryMatch[1], 10);
    const minutes = parseInt(militaryMatch[2], 10);
    return hours * 60 + minutes;
  }

  return null;
};

/**
 * T7.1: Create Attendance Session
 * Only allocated teachers or department admins can create sessions.
 */
export const createSession = async (req, res) => {
  const { subjectId, classId, divisionId, date, startTime, endTime, topic } = req.body;
  const user = req.user;

  if (!subjectId || !classId || !date || !startTime || !endTime || !topic) {
    return res.status(400).json({ 
      error: 'Subject ID, Class ID, Date, Start Time, End Time, and Topic are required.' 
    });
  }

  // Validate start time < end time
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);

  if (startMinutes === null || endMinutes === null) {
    return res.status(400).json({
      error: 'Invalid time format. Please provide time as HH:MM AM/PM (e.g. 09:00 AM) or 24-hour HH:MM.'
    });
  }

  if (startMinutes >= endMinutes) {
    return res.status(400).json({
      error: 'Start time must be earlier than end time.'
    });
  }

  try {
    // 1. Verify Teacher is allocated to this subject & class (or Dept Admin owns the department)
    let assignedTeacherId = user.id;

    if (user.role === 'TEACHER') {
      const allocation = await SubjectAllocation.findOne({
        where: {
          teacherId: user.id,
          subjectId,
          classId,
          ...(divisionId ? { [Op.or]: [{ divisionId }, { divisionId: null }] } : {})
        }
      });

      if (!allocation) {
        return res.status(403).json({ 
          error: 'Forbidden: You are not allocated to teach this subject for this class.' 
        });
      }
    } else if (user.role === 'DEPARTMENT_ADMIN') {
      const targetClass = await Class.findOne({ 
        where: { id: classId, departmentId: user.departmentId } 
      });
      if (!targetClass) {
        return res.status(404).json({ error: 'Class not found in your department.' });
      }
      
      // If admin creates session, find who the teacher is or use body.teacherId
      if (req.body.teacherId) {
        assignedTeacherId = req.body.teacherId;
      } else {
        const allocation = await SubjectAllocation.findOne({ where: { subjectId, classId } });
        if (allocation) assignedTeacherId = allocation.teacherId;
      }
    } else {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions to create attendance sessions.' });
    }

    const session = await AttendanceSession.create({
      subjectId,
      classId,
      divisionId: divisionId || null,
      teacherId: assignedTeacherId,
      date,
      startTime,
      endTime,
      topic
    });

    const populatedSession = await AttendanceSession.findByPk(session.id, {
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code', 'subjectType'] },
        { model: Class, as: 'class', attributes: ['id', 'name', 'batchYear', 'semesterNumber'] },
        { model: Division, as: 'division', attributes: ['id', 'name'] },
        { model: Teacher, as: 'teacher', attributes: ['id', 'name', 'instituteId'] }
      ]
    });

    res.status(201).json(populatedSession);
  } catch (error) {
    console.error('Create attendance session error:', error);
    res.status(500).json({ error: 'Internal server error while creating attendance session.' });
  }
};

/**
 * List Attendance Sessions
 */
export const getSessions = async (req, res) => {
  const { subjectId, classId, divisionId, startDate, endDate } = req.query;
  const user = req.user;

  try {
    let whereClause = {};
    if (subjectId) whereClause.subjectId = subjectId;
    if (classId) whereClause.classId = classId;
    if (divisionId) whereClause.divisionId = divisionId;
    if (startDate && endDate) {
      whereClause.date = { [Op.between]: [startDate, endDate] };
    } else if (startDate) {
      whereClause.date = { [Op.gte]: startDate };
    } else if (endDate) {
      whereClause.date = { [Op.lte]: endDate };
    }

    if (user.role === 'TEACHER') {
      whereClause.teacherId = user.id;
    }

    const sessions = await AttendanceSession.findAll({
      where: whereClause,
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code', 'subjectType'] },
        { 
          model: Class, 
          as: 'class', 
          attributes: ['id', 'name', 'batchYear', 'semesterNumber', 'departmentId'],
          ...(user.role === 'DEPARTMENT_ADMIN' ? { where: { departmentId: user.departmentId } } : {})
        },
        { model: Division, as: 'division', attributes: ['id', 'name'] },
        { model: Teacher, as: 'teacher', attributes: ['id', 'name', 'instituteId'] },
        { model: AttendanceRecord, as: 'records', attributes: ['id', 'present'] }
      ],
      order: [['date', 'DESC'], ['startTime', 'DESC']]
    });

    const sessionsWithStats = sessions.map(session => {
      const records = session.records || [];
      const totalCount = records.length;
      const presentCount = records.filter(r => r.present).length;
      const absentCount = totalCount - presentCount;

      const sessionObj = session.toJSON();
      sessionObj.stats = {
        total: totalCount,
        present: presentCount,
        absent: absentCount,
        percentage: totalCount > 0 ? Number(((presentCount / totalCount) * 100).toFixed(1)) : 0
      };
      delete sessionObj.records;
      return sessionObj;
    });

    res.json(sessionsWithStats);
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Internal server error while fetching attendance sessions.' });
  }
};

/**
 * Get Session Details with its marked records
 */
export const getSessionById = async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  try {
    const session = await AttendanceSession.findByPk(id, {
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code', 'subjectType'] },
        { model: Class, as: 'class', attributes: ['id', 'name', 'batchYear', 'semesterNumber', 'departmentId'] },
        { model: Division, as: 'division', attributes: ['id', 'name'] },
        { model: Teacher, as: 'teacher', attributes: ['id', 'name', 'instituteId'] },
        { 
          model: AttendanceRecord, 
          as: 'records',
          include: [
            { 
              model: Student, 
              as: 'student', 
              attributes: ['id', 'name', 'instituteId', 'rollNumber', 'email', 'divisionId'] 
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

    if (!session) {
      return res.status(404).json({ error: 'Attendance session not found.' });
    }

    if (user.role === 'DEPARTMENT_ADMIN' && session.class.departmentId !== user.departmentId) {
      return res.status(403).json({ error: 'Forbidden: Session belongs to another department.' });
    }

    res.json(session);
  } catch (error) {
    console.error('Get session by ID error:', error);
    res.status(500).json({ error: 'Internal server error while fetching session details.' });
  }
};

/**
 * T7.2: Roster Endpoint
 * Enrolled students for subject + term, including backlog students (attemptNumber > 1).
 * Never keys off student.current_semester or filters by batch alone (Rules 1, 6, 9).
 */
export const getRoster = async (req, res) => {
  const { subjectId, classId, divisionId, academicTermId, sessionId } = req.query;

  if (!subjectId) {
    return res.status(400).json({ error: 'subjectId query parameter is required.' });
  }

  try {
    // 1. Resolve Academic Term (use provided or active term)
    let termId = academicTermId;
    if (!termId) {
      const currentTerm = await AcademicTerm.findOne({ where: { isCurrent: true } });
      if (!currentTerm) {
        return res.status(400).json({ error: 'No active academic term found. Please specify academicTermId.' });
      }
      termId = currentTerm.id;
    }

    // 2. Fetch all enrollments for this subject and term (Rule 6: fetch by (student_id, academic_term_id))
    const enrollments = await Enrollment.findAll({
      where: {
        subjectId,
        academicTermId: termId,
        status: 'ENROLLED'
      },
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'name', 'instituteId', 'rollNumber', 'email', 'divisionId'],
          include: [{ model: Division, as: 'division', attributes: ['id', 'name'] }]
        },
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'name', 'batchYear', 'semesterNumber']
        }
      ],
      order: [
        [{ model: Student, as: 'student' }, 'rollNumber', 'ASC']
      ]
    });

    // 3. If divisionId is passed, optionally filter students who belong to this division
    // But backlog students might attend sessions with junior batch (Rule 9).
    let filteredEnrollments = enrollments;
    if (divisionId) {
      filteredEnrollments = enrollments.filter(e => {
        // Match division or if student is in backlog (attemptNumber > 1), allow inclusion
        return e.student?.divisionId === divisionId || e.attemptNumber > 1;
      });
    }

    // 4. If sessionId is provided, fetch existing records for this session
    let existingRecordsMap = new Map();
    if (sessionId) {
      const records = await AttendanceRecord.findAll({
        where: { sessionId }
      });
      records.forEach(r => existingRecordsMap.set(r.enrollmentId, r));
    }

    // 5. Build roster list
    const roster = filteredEnrollments.map(e => {
      const existingRecord = existingRecordsMap.get(e.id);
      return {
        enrollmentId: e.id,
        studentId: e.student.id,
        name: e.student.name,
        instituteId: e.student.instituteId,
        rollNumber: e.student.rollNumber,
        email: e.student.email,
        division: e.student.division?.name || 'Unassigned',
        divisionId: e.student.divisionId,
        attemptNumber: e.attemptNumber,
        isBacklog: e.attemptNumber > 1,
        className: e.class?.name,
        present: existingRecord ? existingRecord.present : true, // default to present on initial view
        recordId: existingRecord ? existingRecord.id : null,
        markedAt: existingRecord ? existingRecord.markedAt : null,
        editedAt: existingRecord ? existingRecord.editedAt : null
      };
    });

    res.json({
      total: roster.length,
      academicTermId: termId,
      roster
    });
  } catch (error) {
    console.error('Get roster error:', error);
    res.status(500).json({ error: 'Internal server error while fetching roster.' });
  }
};

/**
 * T7.3 & T7.4: Bulk Mark Attendance & Edit with Audit Trail
 * - studentId is derived strictly from enrollment.studentId (Rule 14).
 * - editedAt is set separately from markedAt on edits (Rule 15).
 */
export const markAttendance = async (req, res) => {
  const { id } = req.params; // sessionId
  const { records } = req.body; // array of { enrollmentId, present }
  const user = req.user;

  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: 'records array is required and cannot be empty.' });
  }

  const t = await sequelize.transaction();

  try {
    const session = await AttendanceSession.findByPk(id, { transaction: t });
    if (!session) {
      await t.rollback();
      return res.status(404).json({ error: 'Attendance session not found.' });
    }

    // Authorization: teacher must be the creator/allocated, or Dept Admin
    if (user.role === 'TEACHER' && session.teacherId !== user.id) {
      await t.rollback();
      return res.status(403).json({ error: 'Forbidden: You did not create this attendance session.' });
    }

    const enrollmentIds = records.map(r => r.enrollmentId);
    const validEnrollments = await Enrollment.findAll({
      where: { id: enrollmentIds },
      attributes: ['id', 'studentId'],
      transaction: t
    });

    const enrollmentMap = new Map();
    validEnrollments.forEach(e => enrollmentMap.set(e.id, e.studentId));

    // Fetch existing attendance records for this session
    const existingRecords = await AttendanceRecord.findAll({
      where: {
        sessionId: id,
        enrollmentId: enrollmentIds
      },
      transaction: t
    });

    const existingMap = new Map();
    existingRecords.forEach(r => existingMap.set(r.enrollmentId, r));

    const recordsToCreate = [];
    let updatedCount = 0;
    const now = new Date();

    for (const item of records) {
      const studentId = enrollmentMap.get(item.enrollmentId);
      if (!studentId) {
        continue; // Skip invalid enrollmentId
      }

      const existing = existingMap.get(item.enrollmentId);
      const isPresent = Boolean(item.present);

      if (existing) {
        // T7.4: If present state changed or updating, set editedAt separately from markedAt (Rule 15)
        if (existing.present !== isPresent) {
          await existing.update({
            present: isPresent,
            editedAt: now
          }, { transaction: t });
          updatedCount++;
        }
      } else {
        // T7.3: Create new record
        recordsToCreate.push({
          sessionId: id,
          enrollmentId: item.enrollmentId,
          studentId, // derived from enrollment (Rule 14)
          present: isPresent,
          markedAt: now,
          editedAt: null
        });
      }
    }

    if (recordsToCreate.length > 0) {
      await AttendanceRecord.bulkCreate(recordsToCreate, { transaction: t });
    }

    await t.commit();

    res.json({
      message: 'Attendance saved successfully.',
      created: recordsToCreate.length,
      updated: updatedCount,
      total: recordsToCreate.length + updatedCount
    });
  } catch (error) {
    if (!t.finished) await t.rollback();
    console.error('Mark attendance error:', error);
    res.status(500).json({ error: 'Internal server error while saving attendance.' });
  }
};

/**
 * T7.5: Student Attendance View
 * Computed live from AttendanceRecord grouped by (studentId, subjectId, academicTermId) (Rule 16).
 * Highlights low attendance (< 75%).
 */
export const getStudentSummary = async (req, res) => {
  const user = req.user;
  const targetStudentId = req.params.studentId || req.query.studentId || (user.role === 'STUDENT' ? user.id : null);
  const { academicTermId } = req.query;

  if (!targetStudentId) {
    return res.status(400).json({ error: 'studentId is required.' });
  }

  // Authorization check
  if (user.role === 'STUDENT' && user.id !== targetStudentId) {
    return res.status(403).json({ error: 'Forbidden: You can only view your own attendance.' });
  }

  if (user.role === 'PARENT') {
    const isLinked = await ParentStudent.findOne({
      where: { parentId: user.id, studentId: targetStudentId }
    });
    if (!isLinked) {
      return res.status(403).json({ error: 'Forbidden: This student is not linked to your parent account.' });
    }
  }

  try {
    const student = await Student.findByPk(targetStudentId, {
      attributes: ['id', 'instituteId', 'name', 'rollNumber', 'batchYear', 'departmentId'],
      include: [
        { model: Division, as: 'division', attributes: ['id', 'name'] }
      ]
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    // Resolve Term
    let term = null;
    if (academicTermId) {
      term = await AcademicTerm.findByPk(academicTermId);
    } else {
      term = await AcademicTerm.findOne({ where: { isCurrent: true } });
    }

    if (!term) {
      return res.status(400).json({ error: 'No academic term found.' });
    }

    // Fetch student's enrollments in this term (Rule 1: key off enrollments, not current_semester)
    const enrollments = await Enrollment.findAll({
      where: {
        studentId: targetStudentId,
        academicTermId: term.id,
        status: { [Op.in]: ['ENROLLED', 'PASSED', 'FAILED'] }
      },
      include: [
        { 
          model: Subject, 
          as: 'subject', 
          attributes: ['id', 'name', 'code', 'credits', 'subjectType'] 
        },
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'name', 'batchYear', 'semesterNumber']
        }
      ]
    });

    // Compute live attendance for each enrollment
    let overallTotal = 0;
    let overallAttended = 0;

    const subjectsSummary = [];

    for (const enrollment of enrollments) {
      const records = await AttendanceRecord.findAll({
        where: { enrollmentId: enrollment.id },
        include: [
          {
            model: AttendanceSession,
            as: 'session',
            attributes: ['id', 'date', 'startTime', 'endTime', 'topic'],
            include: [{ model: Teacher, as: 'teacher', attributes: ['name'] }]
          }
        ],
        order: [[{ model: AttendanceSession, as: 'session' }, 'date', 'DESC']]
      });

      const totalSessions = records.length;
      const attendedSessions = records.filter(r => r.present).length;
      const absentSessions = totalSessions - attendedSessions;
      const percentage = totalSessions > 0 ? Number(((attendedSessions / totalSessions) * 100).toFixed(1)) : 100;
      const isLowAttendance = totalSessions > 0 && percentage < 75;

      overallTotal += totalSessions;
      overallAttended += attendedSessions;

      subjectsSummary.push({
        enrollmentId: enrollment.id,
        subjectId: enrollment.subject.id,
        subjectName: enrollment.subject.name,
        subjectCode: enrollment.subject.code,
        subjectType: enrollment.subject.subjectType,
        credits: enrollment.subject.credits,
        className: enrollment.class.name,
        attemptNumber: enrollment.attemptNumber,
        isBacklog: enrollment.attemptNumber > 1,
        totalSessions,
        attendedSessions,
        absentSessions,
        percentage,
        isLowAttendance,
        sessions: records.map(r => ({
          recordId: r.id,
          sessionId: r.session?.id,
          date: r.session?.date,
          startTime: r.session?.startTime,
          endTime: r.session?.endTime,
          topic: r.session?.topic,
          teacherName: r.session?.teacher?.name,
          present: r.present,
          markedAt: r.markedAt,
          editedAt: r.editedAt
        }))
      });
    }

    const overallPercentage = overallTotal > 0 ? Number(((overallAttended / overallTotal) * 100).toFixed(1)) : 100;

    res.json({
      student: {
        id: student.id,
        instituteId: student.instituteId,
        name: student.name,
        rollNumber: student.rollNumber,
        batchYear: student.batchYear,
        division: student.division?.name || 'Unassigned'
      },
      term: {
        id: term.id,
        name: term.name,
        isCurrent: term.isCurrent
      },
      overallStats: {
        totalSessions: overallTotal,
        attendedSessions: overallAttended,
        absentSessions: overallTotal - overallAttended,
        percentage: overallPercentage,
        isLowAttendance: overallTotal > 0 && overallPercentage < 75
      },
      subjects: subjectsSummary
    });
  } catch (error) {
    console.error('Get student attendance summary error:', error);
    res.status(500).json({ error: 'Internal server error while fetching student attendance.' });
  }
};

/**
 * T7.7: Department / Teacher Attendance Report
 * Aggregates student attendance % across a class/subject, identifies students at risk (< 75%).
 */
export const getAttendanceReport = async (req, res) => {
  const { subjectId, classId, divisionId, academicTermId } = req.query;
  const user = req.user;

  if (!subjectId) {
    return res.status(400).json({ error: 'subjectId is required for the attendance report.' });
  }

  try {
    let termId = academicTermId;
    if (!termId) {
      const currentTerm = await AcademicTerm.findOne({ where: { isCurrent: true } });
      if (!currentTerm) {
        return res.status(400).json({ error: 'No active academic term found.' });
      }
      termId = currentTerm.id;
    }

    const subject = await Subject.findByPk(subjectId, {
      attributes: ['id', 'name', 'code', 'subjectType', 'departmentId']
    });

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found.' });
    }

    // Role scoping
    if (user.role === 'DEPARTMENT_ADMIN' && subject.departmentId !== user.departmentId) {
      return res.status(403).json({ error: 'Forbidden: Subject belongs to another department.' });
    }

    // Fetch total sessions conducted for this subject & term
    let sessionWhere = { subjectId };
    if (classId) sessionWhere.classId = classId;
    if (divisionId) sessionWhere.divisionId = divisionId;

    const totalSessionsCount = await AttendanceSession.count({ where: sessionWhere });

    // Fetch all enrollments for this subject & term
    const enrollments = await Enrollment.findAll({
      where: {
        subjectId,
        academicTermId: termId,
        status: 'ENROLLED'
      },
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'instituteId', 'name', 'rollNumber', 'email', 'divisionId'],
          include: [{ model: Division, as: 'division', attributes: ['id', 'name'] }]
        },
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'name', 'batchYear', 'semesterNumber']
        }
      ],
      order: [[{ model: Student, as: 'student' }, 'rollNumber', 'ASC']]
    });

    let filteredEnrollments = enrollments;
    if (divisionId) {
      filteredEnrollments = enrollments.filter(e => e.student?.divisionId === divisionId || e.attemptNumber > 1);
    }

    const studentsReport = [];
    let cumulativePercentages = 0;

    for (const enrollment of filteredEnrollments) {
      const records = await AttendanceRecord.findAll({
        where: { enrollmentId: enrollment.id }
      });

      const totalStudentSessions = records.length;
      const attended = records.filter(r => r.present).length;
      const absent = totalStudentSessions - attended;
      const percentage = totalStudentSessions > 0 ? Number(((attended / totalStudentSessions) * 100).toFixed(1)) : 100;
      const isAtRisk = totalStudentSessions > 0 && percentage < 75;

      cumulativePercentages += percentage;

      studentsReport.push({
        enrollmentId: enrollment.id,
        studentId: enrollment.student.id,
        instituteId: enrollment.student.instituteId,
        name: enrollment.student.name,
        rollNumber: enrollment.student.rollNumber,
        division: enrollment.student.division?.name || 'Unassigned',
        attemptNumber: enrollment.attemptNumber,
        isBacklog: enrollment.attemptNumber > 1,
        totalSessions: totalStudentSessions,
        attended,
        absent,
        percentage,
        isAtRisk
      });
    }

    const totalEnrolled = studentsReport.length;
    const atRiskCount = studentsReport.filter(s => s.isAtRisk).length;
    const averagePercentage = totalEnrolled > 0 ? Number((cumulativePercentages / totalEnrolled).toFixed(1)) : 0;

    res.json({
      subject: {
        id: subject.id,
        name: subject.name,
        code: subject.code,
        subjectType: subject.subjectType
      },
      stats: {
        totalSessionsConducted: totalSessionsCount,
        totalStudentsEnrolled: totalEnrolled,
        atRiskCount,
        averagePercentage
      },
      students: studentsReport
    });
  } catch (error) {
    console.error('Attendance report error:', error);
    res.status(500).json({ error: 'Internal server error while generating attendance report.' });
  }
};
