import {
  computeStudentResultCard,
  processBatchCohortResults,
  getCohortResultCards
} from '../services/resultProcessingService.js';
import { AcademicTerm, Student, ParentStudent } from '../models/index.js';

/**
 * 1. Process Results (Single Student or Cohort Batch)
 * Options: MSE, ESE, or COMBINED (SGPA is generated ONLY on COMBINED)
 * Roles: EXAM_STAFF, SUPER_ADMIN
 */
export const processResults = async (req, res) => {
  const { academicTermId, classId, studentId, resultType = 'COMBINED' } = req.body;
  const processedById = req.user.id;

  const validTypes = ['MSE', 'ESE', 'COMBINED'];
  const normType = validTypes.includes(resultType?.toUpperCase()) ? resultType.toUpperCase() : 'COMBINED';

  try {
    let termId = academicTermId;
    if (!termId) {
      const currentTerm = await AcademicTerm.findOne({ where: { isCurrent: true } });
      if (!currentTerm) {
        return res.status(400).json({ error: 'No active academic term found. Please select an academic term.' });
      }
      termId = currentTerm.id;
    }

    if (studentId) {
      // Process single student
      const result = await computeStudentResultCard(studentId, termId, normType, processedById);
      return res.json({
        message: `${normType} result card computed successfully for student ${result.student.name}`,
        result
      });
    }

    // Process cohort batch (class or entire term)
    const summary = await processBatchCohortResults({
      academicTermId: termId,
      classId: classId || null,
      resultType: normType,
      processedById
    });

    res.json({
      message: `Processed ${normType} results for ${summary.processedCount} students successfully.${normType === 'COMBINED' ? ' SGPA generated.' : ' (SGPA applies to Combined Results only).' }`,
      summary
    });
  } catch (error) {
    console.error('Error processing result cards:', error);
    res.status(500).json({ error: error.message || 'Failed to process results' });
  }
};

/**
 * 2. Get Cohort Result Cards (Term, Class & ResultType analytics)
 * Roles: EXAM_STAFF, SUPER_ADMIN, DEPARTMENT_ADMIN
 */
export const getCohortResults = async (req, res) => {
  const { academicTermId, classId, resultType = 'COMBINED' } = req.query;

  const validTypes = ['MSE', 'ESE', 'COMBINED'];
  const normType = validTypes.includes(resultType?.toUpperCase()) ? resultType.toUpperCase() : 'COMBINED';

  try {
    let termId = academicTermId;
    if (!termId) {
      const currentTerm = await AcademicTerm.findOne({ where: { isCurrent: true } });
      if (currentTerm) {
        termId = currentTerm.id;
      }
    }

    if (!termId) {
      return res.status(400).json({ error: 'Academic term ID is required' });
    }

    const data = await getCohortResultCards({
      academicTermId: termId,
      classId: classId || null,
      resultType: normType
    });

    res.json(data);
  } catch (error) {
    console.error('Error fetching cohort results:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch cohort results' });
  }
};

/**
 * 3. Get Full Student Result Card Details (MSE, ESE, or COMBINED)
 * Roles: EXAM_STAFF, SUPER_ADMIN, DEPARTMENT_ADMIN, TEACHER, STUDENT, PARENT
 */
export const getStudentResultCard = async (req, res) => {
  const { studentId } = req.params;
  const { academicTermId, resultType = 'COMBINED' } = req.query;
  const user = req.user;

  const validTypes = ['MSE', 'ESE', 'COMBINED'];
  const normType = validTypes.includes(resultType?.toUpperCase()) ? resultType.toUpperCase() : 'COMBINED';

  try {
    // Security verification
    if (user.role === 'STUDENT' && user.id !== studentId) {
      return res.status(403).json({ error: 'Unauthorized to view another student\'s result' });
    }
    if (user.role === 'PARENT') {
      const link = await ParentStudent.findOne({
        where: { parentId: user.id, studentId }
      });
      if (!link) {
        return res.status(403).json({ error: 'Unauthorized to view this student\'s result' });
      }
    }

    let termId = academicTermId;
    if (!termId) {
      const currentTerm = await AcademicTerm.findOne({ where: { isCurrent: true } });
      if (currentTerm) {
        termId = currentTerm.id;
      }
    }

    if (!termId) {
      return res.status(400).json({ error: 'Academic term ID is required' });
    }

    const result = await computeStudentResultCard(studentId, termId, normType);
    res.json(result);
  } catch (error) {
    console.error('Error fetching student result card:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch student result card' });
  }
};

/**
 * 4. Get Student's Own Result Card (for Student or Parent session)
 * Roles: STUDENT, PARENT
 */
export const getMyResultCard = async (req, res) => {
  const user = req.user;
  const { academicTermId, studentId: queryStudentId, resultType = 'COMBINED' } = req.query;

  const validTypes = ['MSE', 'ESE', 'COMBINED'];
  const normType = validTypes.includes(resultType?.toUpperCase()) ? resultType.toUpperCase() : 'COMBINED';

  try {
    let targetStudentId = user.id;

    if (user.role === 'PARENT') {
      if (queryStudentId) {
        const link = await ParentStudent.findOne({
          where: { parentId: user.id, studentId: queryStudentId }
        });
        if (!link) {
          return res.status(403).json({ error: 'Unauthorized to view marks for this student' });
        }
        targetStudentId = queryStudentId;
      } else {
        const firstLink = await ParentStudent.findOne({ where: { parentId: user.id } });
        if (!firstLink) {
          return res.status(404).json({ error: 'No student linked to this parent account' });
        }
        targetStudentId = firstLink.studentId;
      }
    }

    let termId = academicTermId;
    if (!termId) {
      const currentTerm = await AcademicTerm.findOne({ where: { isCurrent: true } });
      if (currentTerm) {
        termId = currentTerm.id;
      }
    }

    if (!termId) {
      return res.status(400).json({ error: 'Academic term ID is required' });
    }

    const result = await computeStudentResultCard(targetStudentId, termId, normType);
    res.json(result);
  } catch (error) {
    console.error('Error fetching my result card:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch result card' });
  }
};
