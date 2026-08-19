import React, { useState } from 'react';
import { Report, User } from '../types';
import { User as UserIcon, Phone, CheckCircle2, AlertTriangle, LogOut, Trash2, Calendar, MapPin } from 'lucide-react';
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

  // Filter reports submitted by the logged in user
  const userReports = reports.filter((r) => r.id_user === currentUser.id_user);

  const totalReports = userReports.length;
  const resolvedReports = userReports.filter((r) => r.status_selesai).length;
  const activeReports = totalReports - resolvedReports;

  const handleResolveClick = (e: React.MouseEvent, report: Report) => {
    e.stopPropagation(); // Prevent opening detail view
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
    e.stopPropagation(); // Prevent opening detail view
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

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <div id="profile-card" className="bg-card rounded-3xl p-6 border border-border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center text-foreground">
            <UserIcon className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-foreground">{currentUser.nama_lengkap}</h2>
              {currentUser.is_admin && (
                <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Admin RT
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm mt-0.5">
              <Phone className="w-3.5 h-3.5 text-muted-foreground" />
              <span>+{currentUser.no_whatsapp}</span>
            </div>
          </div>
        </div>

        <button
          id="btn-logout"
          onClick={onLogout}
          className="px-4 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/80 rounded-xl transition-all flex items-center gap-1.5 shrink-0 self-stretch md:self-auto justify-center"
        >
          <LogOut className="w-4 h-4" />
          Keluar Aplikasi
        </button>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm text-center">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Total Pos</span>
          <span className="text-2xl font-black text-foreground mt-1 block">{totalReports}</span>
        </div>
        <div className="bg-rose-50/50 rounded-2xl p-4 border border-rose-100/50 shadow-sm text-center">
          <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest block">Aktif</span>
          <span className="text-2xl font-black text-rose-600 mt-1 block">{activeReports}</span>
        </div>
        <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100/50 shadow-sm text-center">
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest block">Selesai</span>
          <span className="text-2xl font-black text-emerald-600 mt-1 block">{resolvedReports}</span>
        </div>
      </div>

      {/* User's Reports Section */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-foreground">Daftar Laporan Saya</h3>

        {userReports.length === 0 ? (
          <div className="bg-card rounded-3xl p-12 text-center border border-border shadow-inner">
            <p className="text-muted-foreground text-sm">Anda belum pernah membuat laporan apa pun.</p>
            <p className="text-xs text-muted-foreground mt-1">Gunakan tombol (+) di beranda untuk memulai.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {userReports.map((report) => (
              <motion.div
                key={report.id_report}
                layout
                onClick={() => onReportClick(report)}
                className={`p-4 bg-card hover:bg-accent border rounded-2xl flex items-center justify-between gap-4 transition-all cursor-pointer ${
                  report.status_selesai ? 'border-emerald-100 bg-emerald-50/5 opacity-80' : 'border-border'
                }`}
              >
                <div className="flex items-center gap-4 overflow-hidden">
                  <img
                    src={report.foto_url}
                    alt={report.judul}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-xl object-cover shrink-0"
                  />
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wide ${
                          report.tipe_laporan === 'HILANG'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {report.tipe_laporan}
                      </span>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{report.kategori}</span>
                    </div>
                    <h4 className={`text-sm font-bold text-foreground mt-0.5 truncate ${
                      report.status_selesai ? 'line-through text-muted-foreground' : ''
                    }`}>
                      {report.judul}
                    </h4>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate max-w-[120px]">{report.lokasi}</span>
                      </span>
                      <span>•</span>
                      <span>{formatDate(report.tgl_kejadian)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!report.status_selesai ? (
                    <button
                      id={`btn-profile-resolve-${report.id_report}`}
                      type="button"
                      onClick={(e) => handleResolveClick(e, report)}
                      className="p-2 bg-muted hover:bg-secondary text-foreground rounded-xl transition-all"
                      title="Tandai Selesai"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <span className="text-emerald-600 text-xs font-bold flex items-center gap-1 pr-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Selesai
                    </span>
                  )}
                  <button
                    id={`btn-profile-delete-${report.id_report}`}
                    type="button"
                    onClick={(e) => handleDeleteClick(e, report)}
                    className="p-2 hover:bg-rose-50 text-muted-foreground hover:text-rose-600 rounded-xl transition-all"
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

      {/* Custom Confirm Modals */}
      <ConfirmModal
        isOpen={pendingResolveReport !== null}
        title="Tandai Selesai"
        message={`Apakah Anda yakin ingin menandai laporan "${pendingResolveReport?.judul}" sebagai SELESAI? Tindakan ini akan mengarsipkan laporan.`}
        confirmText="Ya, Selesai"
        cancelText="Batal"
        onConfirm={executeResolve}
        onCancel={() => setPendingResolveReport(null)}
      />

      <ConfirmModal
        isOpen={pendingDeleteReport !== null}
        title="Hapus Laporan"
        message={`Apakah Anda yakin ingin menghapus laporan "${pendingDeleteReport?.judul}" secara permanen? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Ya, Hapus"
        cancelText="Batal"
        onConfirm={executeDelete}
        onCancel={() => setPendingDeleteReport(null)}
        isDanger
      />
    </div>
  );
}

