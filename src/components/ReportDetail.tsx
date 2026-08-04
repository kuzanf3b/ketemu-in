import { useState } from 'react';
import { Report, User } from '../types';
import { X, Phone, CheckCircle2, Calendar, MapPin, Tag, UserRound, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import ConfirmModal from './ConfirmModal';

interface ReportDetailProps {
  report: Report;
  currentUser: User | null;
  onClose: () => void;
  onResolve: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function ReportDetail({ report, currentUser, onClose, onResolve, onDelete }: ReportDetailProps) {
  const [loading, setLoading] = useState(false);
  const [showResolveConfirm, setShowResolveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isOwner = currentUser?.id_user === report.id_user;
  const isAdmin = currentUser?.is_admin === true;
  const isSolved = report.status_selesai;

  const handleResolveClick = () => {
    if (!currentUser) return;
    setShowResolveConfirm(true);
  };

  const executeResolve = async () => {
    setShowResolveConfirm(false);
    setLoading(true);
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

  // Build the WhatsApp message link
  const getWhatsAppLink = () => {
    if (!report.user_whatsapp) return '#';
    let phone = report.user_whatsapp.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) {
      phone = '62' + phone.substring(1);
    }
    const text = `Halo ${report.user_nama}, saya melihat laporan Anda di aplikasi Ketemu.in mengenai "${report.judul}". Apakah barang/hewan tersebut sudah ada perkembangan?`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  };

  // Render proper Indonesian date format
  const formatDate = (dateStr: string) => {
    try {
      const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
      return new Date(dateStr).toLocaleDateString('id-ID', options);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="relative bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col"
      >
        {/* Header/Close bar */}
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-900/60 text-white hover:bg-slate-900/80 transition-colors backdrop-blur-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Main Visual Image */}
          <div className="relative h-72 md:h-96 w-full bg-slate-100">
            <img
              src={report.foto_url}
              alt={report.judul}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-6">
              <div className="space-y-2 text-white">
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide shadow-md ${
                      report.tipe_laporan === 'HILANG' ? 'bg-rose-500' : 'bg-emerald-500'
                    }`}
                  >
                    {report.tipe_laporan}
                  </span>
                  <span className="bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5" />
                    {report.kategori}
                  </span>
                </div>
                <h2 className="text-xl md:text-2xl font-extrabold tracking-tight leading-tight">
                  {report.judul}
                </h2>
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="p-6 space-y-6">
            <div className="bg-slate-50 rounded-2xl p-4 flex flex-wrap gap-y-4 gap-x-6 text-sm">
              <div className="flex items-center gap-2.5 min-w-[200px]">
                <MapPin className="w-5 h-5 text-slate-900 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Perkiraan Lokasi</span>
                  <span className="text-slate-700 font-medium">{report.lokasi}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 min-w-[200px]">
                <Calendar className="w-5 h-5 text-slate-900 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Tanggal Kejadian</span>
                  <span className="text-slate-700 font-medium">{formatDate(report.tgl_kejadian)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 min-w-[200px]">
                <UserRound className="w-5 h-5 text-slate-900 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Pelapor (Warga)</span>
                  <span className="text-slate-700 font-medium">{report.user_nama}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Detail & Ciri-ciri Ciri</h4>
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line bg-slate-50/40 p-4 rounded-xl border border-slate-100">
                {report.deskripsi}
              </p>
            </div>

            {/* Quick warning if solved */}
            {isSolved && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-emerald-800">Laporan Telah Selesai</h4>
                  <p className="text-xs text-emerald-600 mt-1 leading-normal">
                    Barang atau hewan yang dilaporkan ini sudah ditemukan/dikembalikan ke pemiliknya. Tombol hubungi WhatsApp telah dinonaktifkan demi privasi.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions bar */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-2 w-full md:w-auto">
            {(isOwner || isAdmin) && !isSolved && (
              <button
                id="btn-resolve-report"
                onClick={handleResolveClick}
                disabled={loading}
                className="w-full md:w-auto px-4 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Tandai Selesai
              </button>
            )}

            {(isOwner || isAdmin) && (
              <button
                id="btn-delete-report"
                onClick={handleDeleteClick}
                disabled={loading}
                className="w-full md:w-auto px-4 py-2.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Hapus
              </button>
            )}
          </div>

          <div className="w-full md:w-auto flex justify-end">
            {isSolved ? (
              <button
                id="btn-whatsapp-disabled"
                disabled
                className="w-full md:w-auto px-6 py-3 bg-slate-200 text-slate-500 font-bold rounded-xl text-sm flex items-center justify-center gap-2 cursor-not-allowed"
              >
                <Phone className="w-4 h-4" />
                WhatsApp Dinonaktifkan
              </button>
            ) : (
              <a
                id="btn-whatsapp-cta"
                href={getWhatsAppLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full md:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4 fill-white" />
                Hubungi via WhatsApp
              </a>
            )}
          </div>
        </div>
      </motion.div>

      {/* Custom Confirm Modals */}
      <ConfirmModal
        isOpen={showResolveConfirm}
        title="Tandai Selesai"
        message="Apakah Anda yakin ingin menandai laporan ini sebagai SELESAI? Tindakan ini akan mengarsipkan laporan dan menonaktifkan tombol WhatsApp."
        confirmText="Ya, Selesai"
        cancelText="Batal"
        onConfirm={executeResolve}
        onCancel={() => setShowResolveConfirm(false)}
      />

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Hapus Laporan"
        message="Apakah Anda yakin ingin menghapus laporan ini secara permanen? Tindakan ini tidak dapat dibatalkan."
        confirmText="Ya, Hapus"
        cancelText="Batal"
        onConfirm={executeDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        isDanger
      />
    </div>
  );
}
