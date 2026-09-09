import { Report } from '../types';
import { auth } from './firebase';
import { archiveAndDeleteReport } from './reportArchive';

export const AUTO_DELETE_HOURS = 24;
export const AUTO_DELETE_MS = AUTO_DELETE_HOURS * 60 * 60 * 1000;

export interface AutoDeleteStatus {
  isResolved: boolean;
  isExpired: boolean;
  remainingMs: number;
  remainingHours: number;
  remainingMinutes: number;
  formattedCountdown: string;
}

/**
 * Calculates whether a resolved report has exceeded 24 hours
 * and computes remaining countdown time.
 */
export function getAutoDeleteStatus(report: Report): AutoDeleteStatus {
  if (!report.status_selesai) {
    return {
      isResolved: false,
      isExpired: false,
      remainingMs: 0,
      remainingHours: 0,
      remainingMinutes: 0,
      formattedCountdown: ''
    };
  }

  // Use selesai_at if available; fallback to created_at if old report
  const resolvedTimeStr = report.selesai_at || report.created_at;
  const resolvedTimestamp = new Date(resolvedTimeStr).getTime();
  const now = Date.now();
  const elapsedMs = now - resolvedTimestamp;
  const remainingMs = Math.max(0, AUTO_DELETE_MS - elapsedMs);
  const isExpired = elapsedMs >= AUTO_DELETE_MS;

  const totalMinutes = Math.floor(remainingMs / (60 * 1000));
  const remainingHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  let formattedCountdown = '';
  if (isExpired) {
    formattedCountdown = 'Kedaluwarsa (proses hapus)';
  } else if (remainingHours > 0) {
    formattedCountdown = `Dihapus dlm ${remainingHours} jam ${remainingMinutes} mnt`;
  } else if (remainingMinutes > 0) {
    formattedCountdown = `Dihapus dlm ${remainingMinutes} menit`;
  } else {
    formattedCountdown = 'Dihapus dlm < 1 menit';
  }

  return {
    isResolved: true,
    isExpired,
    remainingMs,
    remainingHours,
    remainingMinutes,
    formattedCountdown
  };
}

/**
 * Scans a list of reports, identifies any reports that have been resolved
 * for more than 24 hours, and asynchronously deletes them from Firestore.
 * Returns the IDs of the deleted reports. Only executes if a user is authenticated.
 */
export async function purgeExpiredResolvedReports(reports: Report[]): Promise<string[]> {
  // Only authenticated sessions can perform delete operations
  if (!auth.currentUser) {
    return [];
  }

  const expiredReports = reports.filter(r => {
    if (!r.status_selesai) return false;
    const status = getAutoDeleteStatus(r);
    return status.isExpired;
  });

  if (expiredReports.length === 0) {
    return [];
  }

  const deletedIds: string[] = [];

  for (const report of expiredReports) {
    try {
      await archiveAndDeleteReport(report, {
        deletedByUid: auth.currentUser.uid,
        deletedByName: auth.currentUser.displayName || 'Sistem Pembersihan Otomatis',
        deletedByRole: 'sistem',
        deleteReason: 'Otomatis diarsipkan & dihapus dari feed setelah 24 jam status selesai'
      });
      deletedIds.push(report.id_report);
    } catch (err) {
      // Background cleanup should silently catch if not authorized or network fails
      console.warn(`Auto-purge skipped for report ${report.id_report}:`, err);
    }
  }

  return deletedIds;
}
