import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { SuperAdmin, DepartmentAdmin, Teacher, Student, ExamStaff, Parent } from '../models/index.js';

export const login = async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Identifier and password are required' });
  }

  try {
    let user = null;
    let role = null;
    let userId = null;

    // Check if identifier is an email (for parents)
    if (identifier.includes('@')) {
      user = await Parent.findOne({ where: { email: identifier } });
      if (user) role = 'PARENT';
    } else {
      // It's an instituteId, resolve by prefix
      const prefix = identifier.substring(0, 5).toUpperCase();
      const whereClause = { instituteId: identifier };

      switch (prefix) {
        case 'STKIT':
          user = await Student.findOne({ where: whereClause });
          if (user) role = 'STUDENT';
          break;
        case 'FCKIT':
          user = await Teacher.findOne({ where: whereClause });
          if (user) role = 'TEACHER';
          break;
        case 'DAKIT':
          user = await DepartmentAdmin.findOne({ where: whereClause });
          if (user) role = 'DEPARTMENT_ADMIN';
          break;
        case 'SAKIT':
          user = await SuperAdmin.findOne({ where: whereClause });
          if (user) role = 'SUPER_ADMIN';
          break;
        case 'EXKIT':
          user = await ExamStaff.findOne({ where: whereClause });
          if (user) role = 'EXAM_STAFF';
          break;
        default:
          // Unknown prefix
          return res.status(401).json({ error: 'Invalid credentials' });
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const payload = {
      id: user.id,
      role: role,
      instituteId: user.instituteId || null,
      departmentId: user.departmentId || null
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        role: role,
        instituteId: user.instituteId || null,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const { id, role } = req.user;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'oldPassword and newPassword are required' });
  }

  try {
    let userModel;
    switch (role) {
      case 'STUDENT': userModel = Student; break;
      case 'TEACHER': userModel = Teacher; break;
      case 'DEPARTMENT_ADMIN': userModel = DepartmentAdmin; break;
      case 'SUPER_ADMIN': userModel = SuperAdmin; break;
      case 'EXAM_STAFF': userModel = ExamStaff; break;
      case 'PARENT': userModel = Parent; break;
      default: return res.status(401).json({ error: 'Invalid user role' });
    }

    const user = await userModel.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect old password' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashedPassword });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
