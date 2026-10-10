import { Library, SuperAdmin } from '../models/index.js';
import { Op } from 'sequelize';

/**
 * T8.3: Upload Library Resource
 * Admins upload general institute-wide resources (handbooks, guides, syllabus copies, e-books).
 */
export const uploadResource = async (req, res) => {
  const { title } = req.body;
  const user = req.user;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Resource title is required.' });
  }

  if (!req.fileUrl) {
    return res.status(400).json({ error: 'Please select a document or file to upload.' });
  }

  try {
    // Determine uploadedById. If user is SUPER_ADMIN, use user.id.
    // If user is DEPARTMENT_ADMIN, find a SuperAdmin to link or use user.id if supported.
    let uploadedById = user.id;
    if (user.role !== 'SUPER_ADMIN') {
      const superAdmin = await SuperAdmin.findOne();
      if (superAdmin) {
        uploadedById = superAdmin.id;
      }
    }

    const item = await Library.create({
      title: title.trim(),
      url: req.fileUrl,
      uploadedById
    });

    const populatedItem = await Library.findByPk(item.id, {
      include: [
        { model: SuperAdmin, as: 'uploadedBy', attributes: ['id', 'name', 'email'] }
      ]
    });

    res.status(201).json(populatedItem);
  } catch (error) {
    console.error('Upload library resource error:', error);
    res.status(500).json({ error: 'Internal server error while saving library resource.' });
  }
};

/**
 * T8.3: List Library Resources
 * Everyone views: Students, Teachers, Admins, Exam Staff, Parents.
 */
export const getResources = async (req, res) => {
  const { search } = req.query;

  try {
    let whereClause = {};
    if (search && search.trim()) {
      whereClause.title = { [Op.iLike]: `%${search.trim()}%` };
    }

    const resources = await Library.findAll({
      where: whereClause,
      include: [
        { model: SuperAdmin, as: 'uploadedBy', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(resources);
  } catch (error) {
    console.error('Get library resources error:', error);
    res.status(500).json({ error: 'Internal server error while fetching library resources.' });
  }
};

/**
 * Delete Library Resource
 */
export const deleteResource = async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  // Only Admins can delete
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'DEPARTMENT_ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Only administrators can delete library resources.' });
  }

  try {
    const resource = await Library.findByPk(id);
    if (!resource) {
      return res.status(404).json({ error: 'Library resource not found.' });
    }

    await resource.destroy();
    res.json({ message: 'Resource removed from library successfully.' });
  } catch (error) {
    console.error('Delete library resource error:', error);
    res.status(500).json({ error: 'Internal server error while deleting library resource.' });
  }
};
