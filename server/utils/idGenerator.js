import db from '../models/index.js';

/**
 * Atomically reserves and generates a block of institute IDs.
 * @param {string} prefix - The ID prefix (e.g., 'STKIT', 'FCKIT').
 * @param {number} count - Number of IDs to generate (default 1).
 * @param {object} transaction - Optional Sequelize transaction.
 * @returns {Promise<string[]>} Array of generated IDs.
 */
export async function generateInstituteIds(prefix, count = 1, transaction = null) {
  if (count <= 0) return [];

  // Execute an atomic UPDATE ... RETURNING to avoid race conditions.
  const query = `
    UPDATE id_sequences
    SET "lastUsed" = "lastUsed" + :count, "updatedAt" = NOW()
    WHERE prefix = :prefix
    RETURNING "lastUsed"
  `;

  const [results] = await db.sequelize.query(query, {
    replacements: { prefix, count },
    transaction,
  });

  if (!results || results.length === 0) {
    throw new Error(`IdSequence for prefix ${prefix} not found. Ensure it is seeded.`);
  }

  const endValue = results[0].lastUsed;
  const startValue = endValue - count + 1;

  const ids = [];
  for (let i = startValue; i <= endValue; i++) {
    ids.push(`${prefix}${String(i).padStart(4, '0')}`);
  }

  return ids;
}
