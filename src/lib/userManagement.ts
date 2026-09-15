import { User, Report } from '../types';
import { db, handleFirestoreError, OperationType, auth } from './firebase';
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { archiveReport } from './reportArchive';

export interface UserDeletionResult {
  archivedReportsCount: number;
  deletedUserId: string;
}

/**
 * Option C Implementation:
 * Safely deletes a user account and automatically archives all of their active reports
 * with a standardized audit trail so that:
 * 1. The public live feed is cleaned from inactive user posts.
 * 2. Officers (Petugas RW) retain complete historical records of lost & found items.
 * 3. The user document is deleted from Firestore.
 */
export async function deleteUserAndArchiveReports(
  userToDelete: User,
  performedBy: {
    uid: string;
    name: string;
    role: 'petugas' | 'warga';
  }
): Promise<UserDeletionResult> {
  const userId = userToDelete.id_user;

  try {
    // 1. Fetch all active reports owned by this user
    const reportsQuery = query(
      collection(db, 'reports'),
      where('id_user', '==', userId)
    );
    const reportsSnap = await getDocs(reportsQuery);

    const userReports: Report[] = [];
    reportsSnap.forEach((d) => {
      userReports.push({
        id_report: d.id,
        ...d.data(),
      } as Report);
    });

    // 2. Archive each report into `archived_reports` collection with clear audit reason
    const deleteReason =
      performedBy.role === 'petugas'
        ? `Akun warga (${userToDelete.nama_lengkap}) dihapus oleh Petugas RW. Laporan otomatis dialihkan ke arsip.`
        : `Pengguna (${userToDelete.nama_lengkap}) menghapus akunnya sendiri. Laporan otomatis dialihkan ke arsip.`;

    for (const report of userReports) {
      try {
        await archiveReport(report, {
          deletedByUid: performedBy.uid,
          deletedByName: performedBy.name,
          deletedByRole: performedBy.role,
          deleteReason: deleteReason,
        });
      } catch (archErr) {
        console.warn(`Failed to archive report ${report.id_report} during user deletion:`, archErr);
      }
    }

    // 3. Delete all active reports of this user
    for (const report of userReports) {
      try {
        await deleteDoc(doc(db, 'reports', report.id_report));
      } catch (delErr) {
        console.warn(`Failed to delete report ${report.id_report} during user deletion:`, delErr);
      }
    }

    // 4. Delete the user profile document from `users` collection
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (userDelErr) {
      handleFirestoreError(userDelErr, OperationType.DELETE, `users/${userId}`);
    }

    return {
      archivedReportsCount: userReports.length,
      deletedUserId: userId,
    };
  } catch (err) {
    console.error('Error during deleteUserAndArchiveReports:', err);
    throw err;
  }
}
