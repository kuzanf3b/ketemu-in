import { Report, ArchivedReport } from '../types';
import { db, handleFirestoreError, OperationType } from './firebase';
import { doc, setDoc, deleteDoc, getDocs, collection } from 'firebase/firestore';

export interface ArchiveParams {
  deletedByUid: string;
  deletedByName: string;
  deletedByRole: 'petugas' | 'warga' | 'sistem';
  deleteReason: string;
}

/**
 * Archives a report snapshot into the 'archived_reports' collection.
 * This collection is accessible only by Petugas/Admin in security rules.
 */
export async function archiveReport(
  report: Report,
  params: ArchiveParams
): Promise<void> {
  const archiveDocId = report.id_report;
  const nowIso = new Date().toISOString();

  const archiveData: ArchivedReport = {
    id_archive: archiveDocId,
    id_report: report.id_report,
    id_user: report.id_user,
    tipe_laporan: report.tipe_laporan,
    kategori: report.kategori || 'Lainnya',
    judul: report.judul,
    deskripsi: report.deskripsi || '',
    foto_url: report.foto_url || '',
    lokasi: report.lokasi || '',
    tgl_kejadian: report.tgl_kejadian || nowIso,
    status_selesai: !!report.status_selesai,
    selesai_at: report.selesai_at || '',
    created_at: report.created_at || nowIso,
    user_nama: report.user_nama || 'Warga',
    user_whatsapp: report.user_whatsapp || '',
    status_disetujui: report.status_disetujui ?? true,
    deleted_at: nowIso,
    deleted_by_uid: params.deletedByUid,
    deleted_by_name: params.deletedByName || 'Petugas/Warga',
    deleted_by_role: params.deletedByRole,
    delete_reason: params.deleteReason || 'Dihapus dari daftar aktif'
  };

  try {
    await setDoc(doc(db, 'archived_reports', archiveDocId), archiveData);
  } catch (fsErr) {
    handleFirestoreError(fsErr, OperationType.WRITE, `archived_reports/${archiveDocId}`);
  }
}

/**
 * Archives the report first to 'archived_reports', then deletes it from 'reports'.
 * This ensures that regular users will no longer see the report in public queries,
 * while Petugas maintains a complete audit history.
 */
export async function archiveAndDeleteReport(
  report: Report,
  params: ArchiveParams
): Promise<void> {
  try {
    // 1. Attempt archive write
    await archiveReport(report, params);
  } catch (archiveErr) {
    console.warn('Failed to archive report before deletion, proceeding with delete:', archiveErr);
  }

  // 2. Delete original document from active reports collection
  try {
    await deleteDoc(doc(db, 'reports', report.id_report));
  } catch (fsErr) {
    handleFirestoreError(fsErr, OperationType.DELETE, `reports/${report.id_report}`);
  }
}

/**
 * Fetches all archived reports (available only for Petugas/Admin).
 */
export async function fetchArchivedReportsFromDb(): Promise<ArchivedReport[]> {
  try {
    const snap = await getDocs(collection(db, 'archived_reports'));
    const list: ArchivedReport[] = [];
    snap.forEach((d) => {
      const data = d.data() as ArchivedReport;
      list.push({
        ...data,
        id_archive: d.id,
      });
    });

    // Sort by deleted_at descending
    list.sort((a, b) => {
      const timeA = new Date(a.deleted_at || a.created_at || 0).getTime();
      const timeB = new Date(b.deleted_at || b.created_at || 0).getTime();
      return timeB - timeA;
    });

    return list;
  } catch (fsErr) {
    handleFirestoreError(fsErr, OperationType.LIST, 'archived_reports');
    return [];
  }
}
