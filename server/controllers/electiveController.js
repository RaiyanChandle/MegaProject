import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { 
  ElectiveSlot, 
  ElectiveOption, 
  Subject, 
  Class, 
  Department, 
  Student, 
  Division, 
  Enrollment, 
  StudentElectiveChoice,
  ParentStudent,
  AcademicTerm
} from '../models/index.js';
import { lockExpiredElectives } from '../jobs/electiveLockJob.js';

export const createSlot = async (req, res) => {
  const { classId, slotName, slotType, credits, registrationOpensAt, registrationClosesAt } = req.body;
  const departmentId = req.user.departmentId;

  if (!classId || !slotName || !slotType || !credits) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const targetClass = await Class.findOne({ where: { id: classId, departmentId } });
    if (!targetClass) {
      return res.status(404).json({ error: 'Class not found in your department' });
    }

    const slot = await ElectiveSlot.create({ 
      classId, 
      slotName, 
      slotType, 
      credits,
      registrationOpensAt: registrationOpensAt || null,
      registrationClosesAt: registrationClosesAt || null
    });
    res.status(201).json(slot);
  } catch (error) {
    console.error('Create slot error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSlots = async (req, res) => {
  const { classId } = req.query;
  const departmentId = req.user.departmentId;

  if (!classId) return res.status(400).json({ error: 'classId is required' });

  try {
    // Auto-lock any slots whose window has passed
    await lockExpiredElectives();

    const targetClass = await Class.findOne({ where: { id: classId, departmentId } });
    if (!targetClass) return res.status(404).json({ error: 'Class not found' });

    const slots = await ElectiveSlot.findAll({
      where: { classId },
      include: [
        {
          model: ElectiveOption,
          as: 'options',
          include: [
            { 
              model: Subject, 
              as: 'subject', 
              attributes: ['code', 'name', 'credits'] 
            },
            {
              model: Department,
              as: 'offeredByDepartment',
              attributes: ['name']
            }
          ]
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    res.json(slots);
  } catch (error) {
    console.error('Get slots error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateSlot = async (req, res) => {
  const { id } = req.params;
  const { slotName, slotType, credits, registrationOpensAt, registrationClosesAt } = req.body;
  const departmentId = req.user.departmentId;

  try {
    const slot = await ElectiveSlot.findByPk(id, { include: [{ model: Class, as: 'class' }] });
    if (!slot || slot.class.departmentId !== departmentId) return res.status(404).json({ error: 'Slot not found' });

    const updates = {};
    if (slotName !== undefined) updates.slotName = slotName;
    if (slotType !== undefined) updates.slotType = slotType;
    if (credits !== undefined) updates.credits = credits;
    if (registrationOpensAt !== undefined) updates.registrationOpensAt = registrationOpensAt || null;
    if (registrationClosesAt !== undefined) updates.registrationClosesAt = registrationClosesAt || null;

    await slot.update(updates);
    res.json(slot);
  } catch (error) {
    console.error('Update slot error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteSlot = async (req, res) => {
  const { id } = req.params;
  const departmentId = req.user.departmentId;

  try {
    const slot = await ElectiveSlot.findByPk(id, { include: [{ model: Class, as: 'class' }] });
    if (!slot || slot.class.departmentId !== departmentId) return res.status(404).json({ error: 'Slot not found' });

    await slot.destroy();
    res.json({ message: 'Slot deleted' });
  } catch (error) {
    console.error('Delete slot error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addOption = async (req, res) => {
  const { slotId, subjectId, maxCapacity } = req.body;
  const departmentId = req.user.departmentId;

  if (!slotId || !subjectId) return res.status(400).json({ error: 'slotId and subjectId required' });

  try {
    const slot = await ElectiveSlot.findByPk(slotId, { include: [{ model: Class, as: 'class' }] });
    if (!slot || slot.class.departmentId !== departmentId) return res.status(404).json({ error: 'Slot not found' });

    const subject = await Subject.findByPk(subjectId);
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    // Validate credits match using numeric conversion
    if (Number(subject.credits) !== Number(slot.credits)) {
      return res.status(400).json({ 
        error: `Subject '${subject.name}' has ${subject.credits} credit(s), but slot '${slot.slotName}' requires exactly ${slot.credits} credit(s). All options in a slot must carry the same credit weight.` 
      });
    }

    // Validate OE cross-department access
    if (slot.slotType === 'PROGRAM_ELECTIVE' && subject.departmentId !== departmentId) {
      return res.status(403).json({ error: 'Program Electives must be from your own department' });
    }

    // Check if option already exists
    const existing = await ElectiveOption.findOne({ where: { slotId, subjectId } });
    if (existing) {
      return res.status(400).json({ error: `Subject '${subject.name}' (${subject.code}) is already an option in this slot.` });
    }

    const option = await ElectiveOption.create({
      slotId,
      subjectId,
      offeredByDepartmentId: subject.departmentId,
      maxCapacity: maxCapacity ? parseInt(maxCapacity, 10) : null
    });

    res.status(201).json(option);
  } catch (error) {
    console.error('Add option error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'This subject is already an option in this slot.' });
    }
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const removeOption = async (req, res) => {
  const { id } = req.params;
  const departmentId = req.user.departmentId;

  try {
    const option = await ElectiveOption.findByPk(id, {
      include: [{ model: ElectiveSlot, as: 'slot', include: [{ model: Class, as: 'class' }] }]
    });

    if (!option || option.slot.class.departmentId !== departmentId) {
      return res.status(404).json({ error: 'Option not found' });
    }

    await option.destroy();
    res.json({ message: 'Option removed' });
  } catch (error) {
    console.error('Remove option error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getStudentElectiveSlots = async (req, res) => {
  try {
    // Ensure any expired slots are locked immediately
    await lockExpiredElectives();

    let studentId = req.user.id;

    // Support parent viewing student's electives (Rule 32 & Flow 15)
    if (req.user.role === 'PARENT') {
      studentId = req.query.studentId;
      if (!studentId) {
        return res.status(400).json({ error: 'studentId is required for parent access' });
      }
      const link = await ParentStudent.findOne({ where: { parentId: req.user.id, studentId } });
      if (!link) {
        return res.status(403).json({ error: 'Access denied: student is not linked to your parent account' });
      }
    }

    const student = await Student.findByPk(studentId, {
      include: [
        {
          model: Division,
          as: 'division',
          include: [{ model: Class, as: 'class' }]
        }
      ]
    });

    if (!student) {
      return res.status(404).json({ error: 'Student record not found' });
    }

    let classId = student.division?.classId;

    // Fallback 1: recent enrollment class
    if (!classId) {
      const recentEnrollment = await Enrollment.findOne({
        where: { studentId },
        order: [['createdAt', 'DESC']]
      });
      if (recentEnrollment) {
        classId = recentEnrollment.classId;
      }
    }

    // Fallback 2: batch class for department
    if (!classId && student.departmentId && student.batchYear) {
      const batchClass = await Class.findOne({
        where: { departmentId: student.departmentId, batchYear: student.batchYear },
        order: [['semesterNumber', 'DESC']]
      });
      if (batchClass) {
        classId = batchClass.id;
      }
    }

    if (!classId) {
      return res.json({
        classInfo: null,
        slots: [],
        message: 'No class assigned yet. Please contact your department administrator.'
      });
    }

    const targetClass = await Class.findByPk(classId, {
      include: [{ model: Department, as: 'department', attributes: ['name', 'code'] }]
    });

    const slots = await ElectiveSlot.findAll({
      where: { classId },
      include: [
        {
          model: ElectiveOption,
          as: 'options',
          include: [
            {
              model: Subject,
              as: 'subject',
              attributes: ['id', 'name', 'code', 'credits', 'departmentId']
            },
            {
              model: Department,
              as: 'offeredByDepartment',
              attributes: ['id', 'name', 'code']
            }
          ]
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    if (slots.length === 0) {
      return res.json({
        classInfo: {
          id: targetClass?.id,
          name: targetClass?.name,
          semesterNumber: targetClass?.semesterNumber,
          batchYear: targetClass?.batchYear,
          department: targetClass?.department?.name
        },
        slots: []
      });
    }

    const slotIds = slots.map(s => s.id);

    // Fetch existing choices by this student
    const studentChoices = await StudentElectiveChoice.findAll({
      where: { studentId, slotId: slotIds },
      include: [
        {
          model: Subject,
          as: 'chosenSubject',
          attributes: ['id', 'name', 'code']
        }
      ]
    });

    const choiceMap = new Map();
    for (const choice of studentChoices) {
      choiceMap.set(choice.slotId, choice);
    }

    // Fetch seat counts (only CONFIRMED and LOCKED count toward capacity, as per Rule 10 & 11)
    const confirmedCounts = await StudentElectiveChoice.findAll({
      where: {
        slotId: slotIds,
        status: { [Op.in]: ['CONFIRMED', 'LOCKED'] }
      },
      attributes: [
        'slotId',
        'chosenSubjectId',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['slotId', 'chosenSubjectId'],
      raw: true
    });

    const countMap = new Map();
    for (const row of confirmedCounts) {
      countMap.set(`${row.slotId}_${row.chosenSubjectId}`, parseInt(row.count, 10));
    }

    const now = new Date();

    const enrichedSlots = slots.map(slot => {
      const opensAt = slot.registrationOpensAt ? new Date(slot.registrationOpensAt) : null;
      const closesAt = slot.registrationClosesAt ? new Date(slot.registrationClosesAt) : null;

      let windowStatus = 'NOT_SCHEDULED';
      let isWindowOpen = false;

      if (opensAt && closesAt) {
        if (now < opensAt) {
          windowStatus = 'UPCOMING';
          isWindowOpen = false;
        } else if (now > closesAt) {
          windowStatus = 'CLOSED';
          isWindowOpen = false;
        } else {
          windowStatus = 'OPEN';
          isWindowOpen = true;
        }
      } else if (opensAt && !closesAt) {
        if (now >= opensAt) {
          windowStatus = 'OPEN';
          isWindowOpen = true;
        } else {
          windowStatus = 'UPCOMING';
          isWindowOpen = false;
        }
      } else if (!opensAt && closesAt) {
        if (now <= closesAt) {
          windowStatus = 'OPEN';
          isWindowOpen = true;
        } else {
          windowStatus = 'CLOSED';
          isWindowOpen = false;
        }
      } else {
        // No explicit dates: treat as OPEN
        windowStatus = 'OPEN';
        isWindowOpen = true;
      }

      const studentChoice = choiceMap.get(slot.id) || null;

      const options = (slot.options || []).map(opt => {
        const confirmedCount = countMap.get(`${slot.id}_${opt.subjectId}`) || 0;
        const maxCapacity = opt.maxCapacity;
        const seatsRemaining = maxCapacity === null ? null : Math.max(0, maxCapacity - confirmedCount);
        const isFull = maxCapacity !== null && seatsRemaining <= 0;
        const isSelectedByStudent = studentChoice ? studentChoice.chosenSubjectId === opt.subjectId : false;

        return {
          id: opt.id,
          slotId: opt.slotId,
          subjectId: opt.subjectId,
          subjectName: opt.subject?.name,
          subjectCode: opt.subject?.code,
          credits: opt.subject?.credits,
          offeredByDepartmentId: opt.offeredByDepartmentId,
          offeredByDepartmentName: opt.offeredByDepartment?.name,
          maxCapacity,
          confirmedCount,
          seatsRemaining,
          isFull,
          isSelectedByStudent
        };
      });

      return {
        id: slot.id,
        slotName: slot.slotName,
        slotType: slot.slotType,
        credits: slot.credits,
        registrationOpensAt: slot.registrationOpensAt,
        registrationClosesAt: slot.registrationClosesAt,
        windowStatus,
        isWindowOpen,
        studentChoice: studentChoice ? {
          id: studentChoice.id,
          chosenSubjectId: studentChoice.chosenSubjectId,
          chosenSubjectName: studentChoice.chosenSubject?.name,
          chosenSubjectCode: studentChoice.chosenSubject?.code,
          status: studentChoice.status,
          chosenAt: studentChoice.chosenAt
        } : null,
        options
      };
    });

    res.json({
      classInfo: {
        id: targetClass?.id,
        name: targetClass?.name,
        semesterNumber: targetClass?.semesterNumber,
        batchYear: targetClass?.batchYear,
        department: targetClass?.department?.name
      },
      slots: enrichedSlots
    });
  } catch (error) {
    console.error('Get student elective slots error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const chooseElective = async (req, res) => {
  const { slotId, subjectId } = req.body;
  const studentId = req.user.id;

  if (!slotId || !subjectId) {
    return res.status(400).json({ error: 'slotId and subjectId are required' });
  }

  try {
    const student = await Student.findByPk(studentId, {
      include: [
        {
          model: Division,
          as: 'division',
          include: [{ model: Class, as: 'class' }]
        }
      ]
    });

    if (!student) {
      return res.status(404).json({ error: 'Student record not found' });
    }

    let classId = student.division?.classId;
    if (!classId) {
      const recentEnrollment = await Enrollment.findOne({
        where: { studentId },
        order: [['createdAt', 'DESC']]
      });
      if (recentEnrollment) classId = recentEnrollment.classId;
    }
    if (!classId && student.departmentId && student.batchYear) {
      const batchClass = await Class.findOne({
        where: { departmentId: student.departmentId, batchYear: student.batchYear },
        order: [['semesterNumber', 'DESC']]
      });
      if (batchClass) classId = batchClass.id;
    }

    const slot = await ElectiveSlot.findByPk(slotId, {
      include: [{ model: ElectiveOption, as: 'options' }]
    });

    if (!slot) {
      return res.status(404).json({ error: 'Elective slot not found' });
    }

    if (classId && slot.classId !== classId) {
      return res.status(403).json({ error: 'This elective slot does not belong to your assigned class' });
    }

    // Registration window validation
    const now = new Date();
    if (slot.registrationOpensAt && now < new Date(slot.registrationOpensAt)) {
      return res.status(400).json({ error: 'Registration window has not opened yet' });
    }
    if (slot.registrationClosesAt && now > new Date(slot.registrationClosesAt)) {
      return res.status(400).json({ error: 'Registration window has closed' });
    }

    // Verify subject is an option in this slot
    const validOption = slot.options?.find(opt => opt.subjectId === subjectId);
    if (!validOption) {
      return res.status(400).json({ error: 'Selected subject is not an option for this slot' });
    }

    // Check existing choice
    const existingChoice = await StudentElectiveChoice.findOne({
      where: { studentId, slotId }
    });

    if (existingChoice && existingChoice.status === 'LOCKED') {
      return res.status(400).json({ error: 'This elective choice is locked and cannot be modified' });
    }

    let choice;
    if (existingChoice) {
      choice = await existingChoice.update({
        chosenSubjectId: subjectId,
        status: 'PENDING',
        chosenAt: new Date()
      });
    } else {
      choice = await StudentElectiveChoice.create({
        studentId,
        slotId,
        chosenSubjectId: subjectId,
        status: 'PENDING',
        chosenAt: new Date()
      });
    }

    res.json({
      message: 'Elective choice saved as pending. Please confirm your choice to reserve your seat.',
      choice
    });
  } catch (error) {
    console.error('Choose elective error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const confirmElective = async (req, res) => {
  const { slotId, subjectId } = req.body;
  const studentId = req.user.id;

  if (!slotId) {
    return res.status(400).json({ error: 'slotId is required' });
  }

  const t = await sequelize.transaction();

  try {
    const student = await Student.findByPk(studentId, {
      include: [
        {
          model: Division,
          as: 'division',
          include: [{ model: Class, as: 'class' }]
        }
      ],
      transaction: t
    });

    if (!student) {
      await t.rollback();
      return res.status(404).json({ error: 'Student record not found' });
    }

    let classId = student.division?.classId;
    if (!classId) {
      const recentEnrollment = await Enrollment.findOne({
        where: { studentId },
        order: [['createdAt', 'DESC']],
        transaction: t
      });
      if (recentEnrollment) classId = recentEnrollment.classId;
    }
    if (!classId && student.departmentId && student.batchYear) {
      const batchClass = await Class.findOne({
        where: { departmentId: student.departmentId, batchYear: student.batchYear },
        order: [['semesterNumber', 'DESC']],
        transaction: t
      });
      if (batchClass) classId = batchClass.id;
    }

    const slot = await ElectiveSlot.findByPk(slotId, { transaction: t });
    if (!slot) {
      await t.rollback();
      return res.status(404).json({ error: 'Elective slot not found' });
    }

    if (classId && slot.classId !== classId) {
      await t.rollback();
      return res.status(403).json({ error: 'This elective slot does not belong to your assigned class' });
    }

    // Window validation
    const now = new Date();
    if (slot.registrationOpensAt && now < new Date(slot.registrationOpensAt)) {
      await t.rollback();
      return res.status(400).json({ error: 'Registration window has not opened yet' });
    }
    if (slot.registrationClosesAt && now > new Date(slot.registrationClosesAt)) {
      await t.rollback();
      return res.status(400).json({ error: 'Registration window has closed' });
    }

    // Check existing choice with lock
    const existingChoice = await StudentElectiveChoice.findOne({
      where: { studentId, slotId },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (existingChoice && existingChoice.status === 'LOCKED') {
      await t.rollback();
      return res.status(400).json({ error: 'This elective choice is locked and cannot be modified' });
    }

    const targetSubjectId = subjectId || existingChoice?.chosenSubjectId;
    if (!targetSubjectId) {
      await t.rollback();
      return res.status(400).json({ error: 'No subject selected for confirmation' });
    }

    // Row lock on ElectiveOption to serialize capacity check against concurrent transactions (Rule 11)
    const option = await ElectiveOption.findOne({
      where: { slotId, subjectId: targetSubjectId },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!option) {
      await t.rollback();
      return res.status(400).json({ error: 'Selected subject is not an option for this slot' });
    }

    // Capacity verification: count confirmed/locked choices
    if (option.maxCapacity !== null) {
      const confirmedCount = await StudentElectiveChoice.count({
        where: {
          slotId,
          chosenSubjectId: targetSubjectId,
          status: { [Op.in]: ['CONFIRMED', 'LOCKED'] },
          studentId: { [Op.ne]: studentId }
        },
        transaction: t
      });

      if (confirmedCount >= option.maxCapacity) {
        await t.rollback();
        return res.status(400).json({ 
          error: `Seat capacity of ${option.maxCapacity} has been reached for this subject. Please choose another option.` 
        });
      }
    }

    // Find active academic term
    const currentTerm = await AcademicTerm.findOne({
      where: { isCurrent: true },
      transaction: t
    });

    if (!currentTerm) {
      await t.rollback();
      return res.status(400).json({ error: 'No active academic term found. Please contact administration.' });
    }

    // If changing from another previously confirmed subject, remove previous enrollment
    const prevSubjectId = (existingChoice && existingChoice.status === 'CONFIRMED' && existingChoice.chosenSubjectId !== targetSubjectId)
      ? existingChoice.chosenSubjectId
      : null;

    if (prevSubjectId) {
      await Enrollment.destroy({
        where: {
          studentId,
          subjectId: prevSubjectId,
          academicTermId: currentTerm.id,
          classId: slot.classId
        },
        transaction: t
      });
    }

    // Update or create StudentElectiveChoice with CONFIRMED
    let choice;
    if (existingChoice) {
      choice = await existingChoice.update({
        chosenSubjectId: targetSubjectId,
        status: 'CONFIRMED',
        chosenAt: new Date()
      }, { transaction: t });
    } else {
      choice = await StudentElectiveChoice.create({
        studentId,
        slotId,
        chosenSubjectId: targetSubjectId,
        status: 'CONFIRMED',
        chosenAt: new Date()
      }, { transaction: t });
    }

    // Transactionally create or ensure Enrollment (Rule 10: Enrollment created only on confirm)
    const [enrollment] = await Enrollment.findOrCreate({
      where: {
        studentId,
        subjectId: targetSubjectId,
        academicTermId: currentTerm.id,
        attemptNumber: 1
      },
      defaults: {
        classId: slot.classId,
        status: 'ENROLLED'
      },
      transaction: t
    });

    if (enrollment.status !== 'ENROLLED') {
      await enrollment.update({ status: 'ENROLLED' }, { transaction: t });
    }

    await t.commit();

    res.json({
      message: 'Elective choice confirmed and enrolled successfully',
      choice,
      enrollment
    });
  } catch (error) {
    if (!t.finished) await t.rollback();
    console.error('Confirm elective error:', error);
    res.status(500).json({ error: 'Internal server error during elective confirmation' });
  }
};

export const lockClosedSlotsManual = async (req, res) => {
  try {
    const result = await lockExpiredElectives();
    res.json({
      message: `Elective lock job completed: locked ${result.lockedChoicesCount} confirmed choices across ${result.closedSlotsCount} closed slots.`,
      ...result
    });
  } catch (error) {
    console.error('Manual lock error:', error);
    res.status(500).json({ error: 'Failed to process elective lock job' });
  }
};

/**
 * Admin view of all student choices in a given elective slot.
 */
export const getSlotChoices = async (req, res) => {
  const { slotId } = req.params;
  const user = req.user;

  try {
    const slot = await ElectiveSlot.findByPk(slotId, {
      include: [
        { model: Class, as: 'class' },
        { 
          model: ElectiveOption, 
          as: 'options',
          include: [
            { model: Subject, as: 'subject', attributes: ['id', 'name', 'code', 'credits'] },
            { model: Department, as: 'offeredByDepartment', attributes: ['id', 'name', 'code'] }
          ]
        }
      ]
    });

    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    if (user.role === 'DEPARTMENT_ADMIN' && slot.class.departmentId !== user.departmentId) {
      return res.status(403).json({ error: 'Unauthorized to view choices for this slot' });
    }

    const choices = await StudentElectiveChoice.findAll({
      where: { slotId },
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'instituteId', 'rollNumber', 'name', 'email'],
          include: [
            {
              model: Division,
              as: 'division',
              attributes: ['id', 'name']
            }
          ]
        },
        {
          model: Subject,
          as: 'chosenSubject',
          attributes: ['id', 'name', 'code', 'credits']
        }
      ],
      order: [['status', 'ASC'], ['createdAt', 'DESC']]
    });

    res.json({
      slot: {
        id: slot.id,
        slotName: slot.slotName,
        slotType: slot.slotType,
        credits: slot.credits,
        options: slot.options
      },
      choices
    });
  } catch (error) {
    console.error('Get slot choices error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * T9.5: Admin-approved swap after lock (Rule 13, Flow 5 Step 6).
 * Modifies choice, withdraws old Enrollment, creates new Enrollment in a single transaction.
 */
export const adminSwapElective = async (req, res) => {
  const { studentId, slotId, newSubjectId, overrideCapacity = false, reason = '' } = req.body;
  const user = req.user;

  if (!studentId || !slotId || !newSubjectId) {
    return res.status(400).json({ error: 'studentId, slotId, and newSubjectId are required' });
  }

  const t = await sequelize.transaction();

  try {
    const slot = await ElectiveSlot.findByPk(slotId, {
      include: [{ model: Class, as: 'class' }],
      transaction: t
    });

    if (!slot) {
      await t.rollback();
      return res.status(404).json({ error: 'Elective slot not found' });
    }

    if (user.role === 'DEPARTMENT_ADMIN' && slot.class.departmentId !== user.departmentId) {
      await t.rollback();
      return res.status(403).json({ error: 'Unauthorized to modify electives for this slot' });
    }

    // Verify student exists
    const student = await Student.findByPk(studentId, { transaction: t });
    if (!student) {
      await t.rollback();
      return res.status(404).json({ error: 'Student record not found' });
    }

    // Find student's current elective choice row with lock
    const currentChoice = await StudentElectiveChoice.findOne({
      where: { studentId, slotId },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!currentChoice) {
      await t.rollback();
      return res.status(404).json({ error: 'No elective choice found for this student in this slot' });
    }

    if (currentChoice.chosenSubjectId === newSubjectId) {
      await t.rollback();
      return res.status(400).json({ error: 'Student is already enrolled in this elective subject' });
    }

    const oldSubjectId = currentChoice.chosenSubjectId;

    // Lock target ElectiveOption row to serialize capacity checks (Rule 11)
    const targetOption = await ElectiveOption.findOne({
      where: { slotId, subjectId: newSubjectId },
      include: [{ model: Subject, as: 'subject' }],
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!targetOption) {
      await t.rollback();
      return res.status(400).json({ error: 'The selected new subject is not a valid option for this slot' });
    }

    // Capacity verification
    if (targetOption.maxCapacity !== null && !overrideCapacity) {
      const confirmedCount = await StudentElectiveChoice.count({
        where: {
          slotId,
          chosenSubjectId: newSubjectId,
          status: { [Op.in]: ['CONFIRMED', 'LOCKED'] },
          studentId: { [Op.ne]: studentId }
        },
        transaction: t
      });

      if (confirmedCount >= targetOption.maxCapacity) {
        await t.rollback();
        return res.status(400).json({
          error: `Seat capacity of ${targetOption.maxCapacity} has been reached for '${targetOption.subject?.name}'. Enable capacity override if this swap has explicit administrative authorization.`
        });
      }
    }

    // Find current active academic term
    const currentTerm = await AcademicTerm.findOne({
      where: { isCurrent: true },
      transaction: t
    });

    if (!currentTerm) {
      await t.rollback();
      return res.status(400).json({ error: 'No active academic term found. Please configure an active academic term.' });
    }

    // Adjust old Enrollment per Rule 9 & Flow 5 step 6:
    // Mark old enrollment as WITHDRAWN so historical audit records remain consistent
    const oldEnrollment = await Enrollment.findOne({
      where: {
        studentId,
        subjectId: oldSubjectId,
        academicTermId: currentTerm.id,
        classId: slot.classId
      },
      transaction: t
    });

    if (oldEnrollment) {
      await oldEnrollment.update({ status: 'WITHDRAWN' }, { transaction: t });
    }

    // Create or re-activate new Enrollment
    const [newEnrollment, created] = await Enrollment.findOrCreate({
      where: {
        studentId,
        subjectId: newSubjectId,
        academicTermId: currentTerm.id,
        attemptNumber: 1
      },
      defaults: {
        classId: slot.classId,
        status: 'ENROLLED'
      },
      transaction: t
    });

    if (!created && newEnrollment.status !== 'ENROLLED') {
      await newEnrollment.update({ status: 'ENROLLED' }, { transaction: t });
    }

    // Update StudentElectiveChoice to LOCKED with new subject
    await currentChoice.update({
      chosenSubjectId: newSubjectId,
      status: 'LOCKED',
      chosenAt: new Date()
    }, { transaction: t });

    await t.commit();

    console.log(`[AdminElectiveSwap] Student ${student.instituteId || studentId} swapped from ${oldSubjectId} to ${newSubjectId} in slot ${slot.slotName}. Reason: ${reason || 'N/A'}`);

    res.json({
      message: `Elective successfully swapped to '${targetOption.subject?.name || newSubjectId}'.`,
      choice: currentChoice,
      newEnrollment,
      previousSubjectId: oldSubjectId,
      reason
    });
  } catch (error) {
    if (!t.finished) await t.rollback();
    console.error('Admin swap elective error:', error);
    res.status(500).json({ error: error.message || 'Internal server error during administrative swap' });
  }
};
