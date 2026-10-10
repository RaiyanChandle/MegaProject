import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { ElectiveSlot, StudentElectiveChoice } from '../models/index.js';

/**
 * Scans for all elective slots whose registration window has closed
 * and transitions all 'CONFIRMED' choices to 'LOCKED'.
 * 
 * Flow 5 Step 6: "After the registration window closes, all CONFIRMED choices move to LOCKED."
 * Rule 13: "Once a student_elective_choices row is locked, treat it as immutable in normal flow."
 */
export const lockExpiredElectives = async () => {
  try {
    const now = new Date();

    // 1. Find all slots with closed registration windows
    const closedSlots = await ElectiveSlot.findAll({
      where: {
        registrationClosesAt: {
          [Op.ne]: null,
          [Op.lte]: now
        }
      },
      attributes: ['id', 'slotName', 'registrationClosesAt']
    });

    if (!closedSlots || closedSlots.length === 0) {
      return { closedSlotsCount: 0, lockedChoicesCount: 0, withdrawnChoicesCount: 0 };
    }

    const closedSlotIds = closedSlots.map(s => s.id);

    // 2. Perform atomic batch update for CONFIRMED -> LOCKED
    const [lockedChoicesCount] = await StudentElectiveChoice.update(
      { status: 'LOCKED' },
      {
        where: {
          slotId: { [Op.in]: closedSlotIds },
          status: 'CONFIRMED'
        }
      }
    );

    // 3. Mark unconfirmed PENDING choices in closed slots as WITHDRAWN so they don't linger
    const [withdrawnChoicesCount] = await StudentElectiveChoice.update(
      { status: 'WITHDRAWN' },
      {
        where: {
          slotId: { [Op.in]: closedSlotIds },
          status: 'PENDING'
        }
      }
    );

    if (lockedChoicesCount > 0 || withdrawnChoicesCount > 0) {
      console.log(`[ElectiveLockJob] Auto-locked ${lockedChoicesCount} confirmed choices and marked ${withdrawnChoicesCount} pending choices as withdrawn across ${closedSlots.length} closed slots.`);
    }

    return {
      closedSlotsCount: closedSlots.length,
      lockedChoicesCount,
      withdrawnChoicesCount
    };
  } catch (error) {
    console.error('[ElectiveLockJob] Error locking expired electives:', error);
    throw error;
  }
};

/**
 * Initializes periodic execution of the elective lock job
 * @param {number} intervalMinutes - Interval in minutes (default: 5)
 */
export const initElectiveLockJob = (intervalMinutes = 5) => {
  // Run on startup
  lockExpiredElectives().catch(err => console.error('[ElectiveLockJob] Startup execution error:', err));

  // Schedule interval
  const intervalMs = intervalMinutes * 60 * 1000;
  const timer = setInterval(() => {
    lockExpiredElectives().catch(err => console.error('[ElectiveLockJob] Periodic execution error:', err));
  }, intervalMs);

  if (timer.unref) {
    timer.unref();
  }

  console.log(`[ElectiveLockJob] Initialized (running every ${intervalMinutes} minutes)`);
  return timer;
};
