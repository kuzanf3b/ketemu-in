import { useState } from 'react';
import { Report, User } from '../types';
import { X, MessageCircle, CheckCircle2, Calendar, MapPin, Tag, UserRound, Trash2, Clock, Hourglass } from 'lucide-react';
import { motion } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getAutoDeleteStatus } from '../lib/cleanupUtils';
import ConfirmModal from './ConfirmModal';

interface ReportDetailProps {
  report: Report;
  currentUser: User | null;
  onClose: () => void;
  onResolve: (id: string, selesaiAt?: string) => void;
  onDelete: (id: string) => void;
  onApprove?: (id: string) => void;
}

export default function ReportDetail({
  report,
  currentUser,
  onClose,
  onResolve,
  onDelete,
  onApprove
}: ReportDetailProps) {
  const [loading, setLoading] = useState(false);
  const [showResolveConfirm, setShowResolveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);

  const isOwner = currentUser?.id_user === report.id_user;
  const isAdmin = currentUser?.is_admin === true;
  const isSolved = report.status_selesai;
  const autoDeleteInfo = getAutoDeleteStatus(report);

  const handleResolveClick = () => {
    if (!currentUser) return;
    setShowResolveConfirm(true);
  };

  const executeResolve = async () => {
    setShowResolveConfirm(false);
    setLoading(true);
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
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = () => {
    if (!currentUser) return;
    setShowDeleteConfirm(true);
  };

  const executeDelete = async () => {
    setShowDeleteConfirm(false);
    setLoading(true);
    try {
      try {
        await deleteDoc(doc(db, 'reports', report.id_report));
      } catch (fsErr) {
        handleFirestoreError(fsErr, OperationType.DELETE, `reports/${report.id_report}`);
      }

      onDelete(report.id_report);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveClick = () => {
    if (!currentUser) return;
    setShowApproveConfirm(true);
  };

  const executeApprove = async () => {
    setShowApproveConfirm(false);
    setLoading(true);
    try {
      try {
        await updateDoc(doc(db, 'reports', report.id_report), {
          status_disetujui: true
        });
      } catch (fsErr) {
        handleFirestoreError(fsErr, OperationType.UPDATE, `reports/${report.id_report}`);
      }

      if (onApprove) {
        onApprove(report.id_report);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getWhatsAppLink = () => {
    if (!report.user_whatsapp) return '#';
    let phone = report.user_whatsapp.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) {
      phone = '62' + phone.substring(1);
    }
    const text = `Halo ${report.user_nama}, saya melihat laporan Anda di KetemuIn mengenai "${report.judul}". Apakah barang ini sudah ada perkembangan?`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
      return new Date(dateStr).toLocaleDateString('id-ID', options);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-foreground/50 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        transition={{ duration: 0.15 }}
        className="relative bg-card text-card-foreground w-full max-w-2xl rounded-t-[1rem] sm:rounded-[var(--radius)] overflow-hidden shadow-2xl border border-border max-h-[92vh] sm:max-h-[90vh] flex flex-col"
      >
        {/* Unapproved Notice */}
        {report.status_disetujui === false && (
          <div className="px-4 py-2 bg-accent border-b border-border text-foreground text-xs font-medium flex items-center gap-2">
            <Clock className="w-4 h-4 shrink-0 text-[var(--chart-1)]" />
            <span>Laporan menunggu persetujuan petugas RW 04 sebelum ditampilkan di papan publik.</span>
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Tutup detail laporan"
          className="absolute top-3 right-3 z-20 p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full sm:rounded-[var(--radius)] bg-background/85 hover:bg-background text-foreground border border-border transition-colors cursor-pointer shadow-xs"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="overflow-y-auto flex-1">
          {/* Main Visual Image */}
          <div className="relative h-56 sm:h-72 md:h-80 w-full bg-muted border-b border-border">
            <img
              src={report.foto_url}
              alt={report.judul}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent flex items-end p-4 sm:p-5">
              <div className="space-y-1.5 w-full">
                <div className="flex flex-wrap gap-1.5">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      report.tipe_laporan === 'HILANG'
                        ? 'bg-[var(--chart-1)] text-white'
                        : 'bg-[var(--chart-2)] text-[var(--primary-foreground)]'
                    }`}
                  >
                    {report.tipe_laporan}
                  </span>
                  <span className="bg-card/90 border border-border px-2.5 py-0.5 rounded-full text-xs font-medium text-foreground flex items-center gap-1">
                    <Tag className="w-3 h-3 text-muted-foreground" />
                    {report.kategori}
                  </span>
                </div>
                <h2 className="font-serif text-xl sm:text-2xl md:text-3xl font-semibold text-foreground tracking-tight leading-tight">
                  {report.judul}
                </h2>
              </div>
            </div>
          </div>

          {/* Details Metadata */}
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div className="bg-accent/60 border border-border rounded-[var(--radius)] p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-xs">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] sm:text-[11px] text-muted-foreground uppercase font-medium block">Lokasi</span>
                  <span className="font-medium text-foreground text-xs sm:text-sm">{report.lokasi}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] sm:text-[11px] text-muted-foreground uppercase font-medium block">Tanggal Kejadian</span>
                  <span className="font-medium text-foreground text-xs sm:text-sm">{formatDate(report.tgl_kejadian)}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <UserRound className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] sm:text-[11px] text-muted-foreground uppercase font-medium block">Pelapor</span>
                  <span className="font-medium text-foreground text-xs sm:text-sm">{report.user_nama}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Deskripsi & Ciri Barang
              </h3>
              <p className="text-foreground text-xs sm:text-sm leading-relaxed whitespace-pre-line bg-background p-3.5 sm:p-4 rounded-[var(--radius)] border border-border">
                {report.deskripsi}
              </p>
            </div>

            {/* Solved Status Card */}
            {isSolved && (
              <div className="p-3.5 sm:p-4 bg-accent border border-border rounded-[var(--radius)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-foreground shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-foreground">Laporan Telah Selesai / Ketemu</h4>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                      Barang atau temuan ini telah berhasil diselesaikan. Kontak WhatsApp dinonaktifkan.
                    </p>
                  </div>
                </div>

                {/* 24-hour Auto-deletion countdown badge */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted border border-border text-[11px] font-medium text-foreground shrink-0 self-start sm:self-auto">
                  <Hourglass className="w-3.5 h-3.5 text-[var(--chart-1)] animate-pulse" />
                  <span>{autoDeleteInfo.formattedCountdown}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions (Responsive: full width on mobile, row on tablet/desktop) */}
        <div className="p-3.5 sm:p-4 border-t border-border bg-card flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
            {isAdmin && report.status_disetujui === false && (
              <button
                id="btn-approve-report"
                onClick={handleApproveClick}
                disabled={loading}
                className="flex-1 sm:flex-initial min-h-[42px] px-3.5 sm:px-4 py-2 text-xs font-medium text-white bg-[var(--chart-1)] hover:opacity-90 rounded-[var(--radius)] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Setujui</span>
              </button>
            )}

            {(isOwner || isAdmin) && !isSolved && (
              <button
                id="btn-resolve-report"
                onClick={handleResolveClick}
                disabled={loading}
                className="flex-1 sm:flex-initial min-h-[42px] px-3.5 sm:px-4 py-2 text-xs font-medium text-secondary-foreground bg-secondary hover:bg-muted border border-border rounded-[var(--radius)] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Selesai</span>
              </button>
            )}

            {(isOwner || isAdmin) && (
              <button
                id="btn-delete-report"
                onClick={handleDeleteClick}
                disabled={loading}
                className="min-h-[42px] px-3.5 sm:px-4 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 border border-destructive/30 rounded-[var(--radius)] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Hapus</span>
              </button>
            )}
          </div>

          <div className="w-full sm:w-auto flex justify-end">
            {isSolved ? (
              <button
                id="btn-whatsapp-disabled"
                disabled
                className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 bg-muted text-muted-foreground font-medium rounded-[var(--radius)] text-xs flex items-center justify-center gap-2 cursor-not-allowed border border-border"
              >
                <MessageCircle className="w-4 h-4" />
                Kontak Dinonaktifkan
              </button>
            ) : currentUser ? (
              <a
                id="btn-whatsapp-cta"
                href={getWhatsAppLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 bg-[var(--chart-1)] text-white hover:opacity-90 font-medium rounded-[var(--radius)] text-xs sm:text-sm shadow-xs transition-opacity flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Hubungi via WhatsApp
              </a>
            ) : (
              <button
                id="btn-whatsapp-login-prompt"
                onClick={() => {
                  onClose();
                  alert('Silakan masuk atau daftar akun terlebih dahulu untuk menghubungi pelapor.');
                }}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 bg-primary text-primary-foreground hover:opacity-90 font-medium rounded-[var(--radius)] text-xs sm:text-sm transition-opacity flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                Masuk untuk Hubungi
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Confirm Modals */}
      <ConfirmModal
        isOpen={showResolveConfirm}
        title="Tandai Selesai / Ketemu"
        message="Tandai laporan ini sebagai SELESAI / KETEMU? Laporan yang sudah selesai akan secara otomatis terhapus dari sistem setelah 24 jam."
        confirmText="Ya, Selesai"
        cancelText="Batal"
        onConfirm={executeResolve}
        onCancel={() => setShowResolveConfirm(false)}
      />

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Hapus Laporan"
        message="Hapus laporan ini secara permanen dari basis data?"
        confirmText="Hapus Permanen"
        cancelText="Batal"
        onConfirm={executeDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        isDanger
      />

      <ConfirmModal
        isOpen={showApproveConfirm}
        title="Setujui Laporan"
        message="Setujui laporan ini agar tampil pada papan pengumuman warga?"
        confirmText="Setujui"
        cancelText="Batal"
        onConfirm={executeApprove}
        onCancel={() => setShowApproveConfirm(false)}
      />
    </div>
  );
}
