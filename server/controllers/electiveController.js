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
  ParentStudent
} from '../models/index.js';

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

    // Validate credits match
    if (subject.credits !== slot.credits) {
      return res.status(400).json({ error: `Subject credits (${subject.credits}) do not match the slot credits (${slot.credits}). All options in a slot must carry the same credit weight.` });
    }

    // Validate OE cross-department access
    if (slot.slotType === 'PROGRAM_ELECTIVE' && subject.departmentId !== departmentId) {
      return res.status(403).json({ error: 'Program Electives must be from your own department' });
    }

    const option = await ElectiveOption.create({
      slotId,
      subjectId,
      offeredByDepartmentId: subject.departmentId,
      maxCapacity: maxCapacity || null
    });

    res.status(201).json(option);
  } catch (error) {
    console.error('Add option error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'This subject is already an option in this slot.' });
    }
    res.status(500).json({ error: 'Internal server error' });
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
