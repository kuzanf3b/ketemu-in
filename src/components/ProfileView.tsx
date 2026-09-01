import React, { useState } from 'react';
import { Report, User } from '../types';
import { Phone, CheckCircle2, LogOut, Trash2, Calendar, MapPin, Tag } from 'lucide-react';
import { motion } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import ConfirmModal from './ConfirmModal';

interface ProfileViewProps {
  currentUser: User;
  reports: Report[];
  onLogout: () => void;
  onReportClick: (report: Report) => void;
  onResolve: (id: string) => void;
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

    try {
      try {
        await updateDoc(doc(db, 'reports', report.id_report), {
          status_selesai: true
        });
      } catch (fsErr) {
        handleFirestoreError(fsErr, OperationType.UPDATE, `reports/${report.id_report}`);
      }

      onResolve(report.id_report);
    } catch (err: any) {
      alert(err.message);
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
      alert(err.message);
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
    <div className="space-y-6">
      {/* Profile Header Card */}
      <div id="profile-card" className="bg-card text-card-foreground rounded-[var(--radius)] p-5 md:p-6 border border-border shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          {/* Avatar with serif initials */}
          <div className="w-14 h-14 rounded-full bg-muted text-foreground flex items-center justify-center font-serif text-xl font-bold border border-border shrink-0">
            {getInitials(currentUser.nama_lengkap)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-xl font-semibold text-foreground">{currentUser.nama_lengkap}</h2>
              {currentUser.is_admin && (
                <span className="bg-secondary text-secondary-foreground text-[11px] font-semibold px-2 py-0.5 rounded-full border border-border">
                  Petugas RW 04
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mt-1">
              <Phone className="w-3.5 h-3.5 text-muted-foreground" />
              <span>+{currentUser.no_whatsapp}</span>
            </div>
          </div>
        </div>

        <button
          id="btn-logout"
          onClick={onLogout}
          className="px-4 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 border border-destructive/30 rounded-[var(--radius)] transition-colors flex items-center gap-1.5 shrink-0 self-stretch md:self-auto justify-center cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Keluar
        </button>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-[var(--radius)] p-4 border border-border text-center">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">Total Laporan</span>
          <span className="font-serif text-2xl font-bold text-foreground mt-0.5 block">{totalReports}</span>
        </div>
        <div className="bg-card rounded-[var(--radius)] p-4 border border-border text-center">
          <span className="text-[11px] font-medium text-[var(--chart-1)] uppercase tracking-wider block">Masih Aktif</span>
          <span className="font-serif text-2xl font-bold text-[var(--chart-1)] mt-0.5 block">{activeReports}</span>
        </div>
        <div className="bg-card rounded-[var(--radius)] p-4 border border-border text-center">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">Selesai</span>
          <span className="font-serif text-2xl font-bold text-foreground mt-0.5 block">{resolvedReports}</span>
        </div>
      </div>

      {/* User's Reports Section */}
      <div className="space-y-3">
        <h3 className="font-sans text-base font-semibold text-foreground">Daftar Laporan Saya</h3>

        {userReports.length === 0 ? (
          <div className="bg-card rounded-[var(--radius)] p-10 text-center border border-border">
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
                className={`p-3.5 bg-card hover:bg-accent border border-border rounded-[var(--radius)] flex items-center justify-between gap-4 transition-colors cursor-pointer shadow-xs ${
                  report.status_selesai ? 'opacity-85' : ''
                }`}
              >
                <div className="flex items-center gap-3.5 overflow-hidden">
                  <img
                    src={report.foto_url}
                    alt={report.judul}
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-[var(--radius)] object-cover shrink-0 border border-border"
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
                        <Tag className="w-3 h-3 text-muted-foreground" />
                        {report.kategori}
                      </span>
                    </div>
                    <h4 className={`text-sm font-semibold text-foreground truncate ${
                      report.status_selesai ? 'line-through text-muted-foreground' : ''
                    }`}>
                      {report.judul}
                    </h4>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate max-w-[140px]">{report.lokasi}</span>
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span>{formatDate(report.tgl_kejadian)}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!report.status_selesai ? (
                    <button
                      id={`btn-profile-resolve-${report.id_report}`}
                      type="button"
                      onClick={(e) => handleResolveClick(e, report)}
                      className="px-2.5 py-1.5 bg-secondary hover:bg-muted text-secondary-foreground text-xs font-medium rounded-[var(--radius)] border border-border transition-colors flex items-center gap-1 cursor-pointer"
                      title="Tandai Selesai"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Selesai</span>
                    </button>
                  ) : (
                    <span className="bg-[var(--chart-5)] text-foreground text-xs font-medium px-2.5 py-1 rounded-full border border-border flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Selesai
                    </span>
                  )}
                  <button
                    id={`btn-profile-delete-${report.id_report}`}
                    type="button"
                    onClick={(e) => handleDeleteClick(e, report)}
                    className="p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive border border-transparent hover:border-destructive/20 rounded-[var(--radius)] transition-colors cursor-pointer"
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
        title="Tandai Selesai"
        message={`Tandai laporan "${pendingResolveReport?.judul}" sebagai SELESAI?`}
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
