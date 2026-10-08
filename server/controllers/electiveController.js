import { ElectiveSlot, ElectiveOption, Subject, Class, Department } from '../models/index.js';

export const createSlot = async (req, res) => {
  const { classId, slotName, slotType, credits } = req.body;
  const departmentId = req.user.departmentId;

  if (!classId || !slotName || !slotType || !credits) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const targetClass = await Class.findOne({ where: { id: classId, departmentId } });
    if (!targetClass) {
      return res.status(404).json({ error: 'Class not found in your department' });
    }

    const slot = await ElectiveSlot.create({ classId, slotName, slotType, credits });
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
  const { slotName, slotType, credits } = req.body;
  const departmentId = req.user.departmentId;

  try {
    const slot = await ElectiveSlot.findByPk(id, { include: [{ model: Class, as: 'class' }] });
    if (!slot || slot.class.departmentId !== departmentId) return res.status(404).json({ error: 'Slot not found' });

    await slot.update({ slotName, slotType, credits });
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
