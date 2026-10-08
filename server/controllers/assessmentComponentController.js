import { AssessmentComponent, ComponentMark, Subject, Class } from '../models/index.js';

export const createComponent = async (req, res) => {
  const { subjectId, name, maxMarks, category } = req.body;
  const departmentId = req.user.departmentId;

  if (!subjectId || !name || maxMarks === undefined) {
    return res.status(400).json({ error: 'Subject ID, Name, and Max Marks are required' });
  }

  try {
    const subject = await Subject.findByPk(subjectId, {
      include: [{ model: Class, as: 'class', attributes: ['departmentId'] }]
    });

    if (!subject || subject.class.departmentId !== departmentId) {
      return res.status(404).json({ error: 'Subject not found in your department' });
    }

    const component = await AssessmentComponent.create({
      subjectId,
      name,
      maxMarks,
      category: category || 'INTERNAL',
      createdById: req.user.id
    });

    res.status(201).json(component);
  } catch (error) {
    console.error('Create component error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getComponents = async (req, res) => {
  const { subjectId } = req.query;
  const departmentId = req.user.departmentId;

  if (!subjectId) {
    return res.status(400).json({ error: 'subjectId query parameter is required' });
  }

  try {
    const subject = await Subject.findByPk(subjectId, {
      include: [{ model: Class, as: 'class', attributes: ['departmentId'] }]
    });

    if (!subject || subject.class.departmentId !== departmentId) {
      return res.status(404).json({ error: 'Subject not found in your department' });
    }

    const components = await AssessmentComponent.findAll({
      where: { subjectId },
      order: [['createdAt', 'ASC']]
    });
    
    res.json(components);
  } catch (error) {
    console.error('Get components error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateComponent = async (req, res) => {
  const { id } = req.params;
  const { name, maxMarks, category } = req.body;
  const departmentId = req.user.departmentId;

  try {
    const component = await AssessmentComponent.findByPk(id, {
      include: [{
        model: Subject, as: 'subject',
        include: [{ model: Class, as: 'class', attributes: ['departmentId'] }]
      }]
    });

    if (!component || component.subject.class.departmentId !== departmentId) {
      return res.status(404).json({ error: 'Component not found in your department' });
    }

    // Check if marks exist
    const marksCount = await ComponentMark.count({ where: { componentId: id } });
    if (marksCount > 0) {
      return res.status(403).json({ error: 'Cannot edit component: marks have already been entered for this component.' });
    }

    await component.update({ name, maxMarks, category });
    res.json(component);
  } catch (error) {
    console.error('Update component error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteComponent = async (req, res) => {
  const { id } = req.params;
  const departmentId = req.user.departmentId;

  try {
    const component = await AssessmentComponent.findByPk(id, {
      include: [{
        model: Subject, as: 'subject',
        include: [{ model: Class, as: 'class', attributes: ['departmentId'] }]
      }]
    });

    if (!component || component.subject.class.departmentId !== departmentId) {
      return res.status(404).json({ error: 'Component not found in your department' });
    }

    // Check if marks exist
    const marksCount = await ComponentMark.count({ where: { componentId: id } });
    if (marksCount > 0) {
      return res.status(403).json({ error: 'Cannot delete component: marks have already been entered for this component.' });
    }

    await component.destroy();
    res.json({ message: 'Component deleted successfully' });
  } catch (error) {
    console.error('Delete component error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
