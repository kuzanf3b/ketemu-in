import React, { useState } from 'react';
import { Report, User } from '../types';
import { Phone, CheckCircle2, LogOut, Trash2, Calendar, MapPin, Tag, Hourglass } from 'lucide-react';
import { motion } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getAutoDeleteStatus } from '../lib/cleanupUtils';
import ConfirmModal from './ConfirmModal';

interface ProfileViewProps {
  currentUser: User;
  reports: Report[];
  onLogout: () => void;
  onReportClick: (report: Report) => void;
  onResolve: (id: string, selesaiAt?: string) => void;
  onDelete: (id: string) => void;
}

export default function ProfileView({
  currentUser,
  reports,
  onLogout,
  onReportClick,
  onResolve,
  onDelete,
}: ProfileViewProps) {
  const [pendingResolveReport, setPendingResolveReport] = useState<Report | null>(null);
  const [pendingDeleteReport, setPendingDeleteReport] = useState<Report | null>(null);

  const userReports = reports.filter((r) => r.id_user === currentUser.id_user);

  const totalReports = userReports.length;
  const resolvedReports = userReports.filter((r) => r.status_selesai).length;
  const activeReports = totalReports - resolvedReports;

  const handleResolveClick = (e: React.MouseEvent, report: Report) => {
    e.stopPropagation();
    setPendingResolveReport(report);
  };

  const executeResolve = async () => {
    if (!pendingResolveReport) return;
    const report = pendingResolveReport;
    setPendingResolveReport(null);
    const nowIso = new Date().toISOString();

    try {
      try {
        await updateDoc(doc(db, 'reports', report.id_report), {
          status_selesai: true,
          selesai_at: nowIso
        });
      } catch (fsErr) {
        handleFirestoreError(fsErr, OperationType.UPDATE, `reports/${report.id_report}`);
      }

      onResolve(report.id_report, nowIso);
    } catch (err: any) {
      let msg = err.message || 'Gagal memperbarui status laporan.';
      try {
        const parsed = JSON.parse(err.message);
        if (parsed?.error) msg = parsed.error;
      } catch {}
      alert(msg);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, report: Report) => {
    e.stopPropagation();
    setPendingDeleteReport(report);
  };

  const executeDelete = async () => {
    if (!pendingDeleteReport) return;
    const report = pendingDeleteReport;
    setPendingDeleteReport(null);

    try {
      try {
        await deleteDoc(doc(db, 'reports', report.id_report));
      } catch (fsErr) {
        handleFirestoreError(fsErr, OperationType.DELETE, `reports/${report.id_report}`);
      }

      onDelete(report.id_report);
    } catch (err: any) {
      let msg = err.message || 'Gagal menghapus laporan.';
      try {
        const parsed = JSON.parse(err.message);
        if (parsed?.error) msg = parsed.error;
      } catch {}
      alert(msg);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
      return new Date(dateStr).toLocaleDateString('id-ID', options);
    } catch {
      return dateStr;
    }
  };

  // Extract initials for serif avatar
  const getInitials = (name: string) => {
    if (!name) return 'W';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Profile Header Card */}
      <div id="profile-card" className="bg-card text-card-foreground rounded-[var(--radius)] p-4 sm:p-6 border border-border shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3.5 sm:gap-4">
          {/* Avatar with serif initials */}
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-muted text-foreground flex items-center justify-center font-serif text-lg sm:text-xl font-bold border border-border shrink-0">
            {getInitials(currentUser.nama_lengkap)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h2 className="font-serif text-lg sm:text-xl font-semibold text-foreground leading-tight">{currentUser.nama_lengkap}</h2>
              {currentUser.is_admin && (
                <span className="bg-secondary text-secondary-foreground text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full border border-border">
                  Petugas RW 04
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mt-1">
              <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span>+{currentUser.no_whatsapp}</span>
            </div>
          </div>
        </div>

        <button
          id="btn-logout"
          onClick={onLogout}
          className="min-h-[40px] px-4 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 border border-destructive/30 rounded-[var(--radius)] transition-colors flex items-center justify-center gap-1.5 w-full sm:w-auto cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Keluar
        </button>
      </div>

      {/* Stats Section (Responsive grid) */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        <div className="bg-card rounded-[var(--radius)] p-3 sm:p-4 border border-border text-center">
          <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-wider block truncate">Total Laporan</span>
          <span className="font-serif text-xl sm:text-2xl font-bold text-foreground mt-0.5 block">{totalReports}</span>
        </div>
        <div className="bg-card rounded-[var(--radius)] p-3 sm:p-4 border border-border text-center">
          <span className="text-[10px] sm:text-[11px] font-medium text-[var(--chart-1)] uppercase tracking-wider block truncate">Masih Aktif</span>
          <span className="font-serif text-xl sm:text-2xl font-bold text-[var(--chart-1)] mt-0.5 block">{activeReports}</span>
        </div>
        <div className="bg-card rounded-[var(--radius)] p-3 sm:p-4 border border-border text-center">
          <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-wider block truncate">Selesai</span>
          <span className="font-serif text-xl sm:text-2xl font-bold text-foreground mt-0.5 block">{resolvedReports}</span>
        </div>
      </div>

      {/* User's Reports Section */}
      <div className="space-y-3">
        <h3 className="font-sans text-sm sm:text-base font-semibold text-foreground">Daftar Laporan Saya</h3>

        {userReports.length === 0 ? (
          <div className="bg-card rounded-[var(--radius)] p-8 sm:p-10 text-center border border-border">
            <p className="text-foreground text-sm font-medium">Belum ada laporan yang Anda buat.</p>
            <p className="text-xs text-muted-foreground mt-1">Gunakan tombol Buat Laporan untuk memposting barang hilang atau temuan.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {userReports.map((report) => (
              <motion.div
                key={report.id_report}
                layout
                onClick={() => onReportClick(report)}
                className={`p-3 sm:p-3.5 bg-card hover:bg-accent border border-border rounded-[var(--radius)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-colors cursor-pointer shadow-xs ${
                  report.status_selesai ? 'opacity-85' : ''
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <img
                    src={report.foto_url}
                    alt={report.judul}
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-[var(--radius)] object-cover shrink-0 border border-border"
                  />
                  <div className="overflow-hidden space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.2 text-[10px] font-semibold rounded-full ${
                          report.tipe_laporan === 'HILANG'
                            ? 'bg-[var(--chart-1)] text-white'
                            : 'bg-[var(--chart-2)] text-[var(--primary-foreground)]'
                        }`}
                      >
                        {report.tipe_laporan}
                      </span>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Tag className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="truncate">{report.kategori}</span>
                      </span>
                    </div>
                    <h4 className={`text-xs sm:text-sm font-semibold text-foreground truncate ${
                      report.status_selesai ? 'line-through text-muted-foreground' : ''
                    }`}>
                      {report.judul}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate max-w-[120px] sm:max-w-[140px]">{report.lokasi}</span>
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span>{formatDate(report.tgl_kejadian)}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
                  {!report.status_selesai ? (
                    <button
                      id={`btn-profile-resolve-${report.id_report}`}
                      type="button"
                      onClick={(e) => handleResolveClick(e, report)}
                      className="min-h-[34px] px-3 py-1 bg-secondary hover:bg-muted text-secondary-foreground text-xs font-medium rounded-[var(--radius)] border border-border transition-colors flex items-center gap-1 cursor-pointer"
                      title="Tandai Selesai"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Selesai</span>
                    </button>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="bg-[var(--chart-5)] text-foreground text-xs font-medium px-2.5 py-1 rounded-full border border-border flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Selesai
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full border border-border">
                        <Hourglass className="w-3 h-3 text-[var(--chart-1)]" />
                        {getAutoDeleteStatus(report).formattedCountdown}
                      </span>
                    </div>
                  )}
                  <button
                    id={`btn-profile-delete-${report.id_report}`}
                    type="button"
                    onClick={(e) => handleDeleteClick(e, report)}
                    className="min-h-[34px] min-w-[34px] p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive border border-transparent hover:border-destructive/20 rounded-[var(--radius)] transition-colors cursor-pointer flex items-center justify-center"
                    title="Hapus Laporan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm Modals */}
      <ConfirmModal
        isOpen={pendingResolveReport !== null}
        title="Tandai Selesai / Ketemu"
        message={`Tandai laporan "${pendingResolveReport?.judul}" sebagai SELESAI? Laporan yang sudah selesai akan terhapus otomatis dari sistem setelah 24 jam.`}
        confirmText="Ya, Selesai"
        cancelText="Batal"
        onConfirm={executeResolve}
        onCancel={() => setPendingResolveReport(null)}
      />

      <ConfirmModal
        isOpen={pendingDeleteReport !== null}
        title="Hapus Laporan"
        message={`Hapus laporan "${pendingDeleteReport?.judul}" secara permanen?`}
        confirmText="Hapus"
        cancelText="Batal"
        onConfirm={executeDelete}
        onCancel={() => setPendingDeleteReport(null)}
        isDanger
      />
    </div>
  );
}
