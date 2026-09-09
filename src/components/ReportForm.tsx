import React, { useState, useRef } from 'react';
import { User, Category, TipeLaporan } from '../types';
import { X, Upload, Camera, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';

interface ReportFormProps {
  currentUser: User;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES: Category[] = ['Elektronik', 'Kunci', 'Dompet', 'Hewan', 'Dokumen', 'Lainnya'];

export default function ReportForm({ currentUser, onClose, onSuccess }: ReportFormProps) {
  const [tipeLaporan, setTipeLaporan] = useState<TipeLaporan>('HILANG');
  const [judul, setJudul] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [kategori, setKategori] = useState<Category>('Elektronik');
  const [lokasi, setLokasi] = useState('');
  const [tglKejadian, setTglKejadian] = useState(() => new Date().toISOString().split('T')[0]);
  
  // Image handling
  const [fotoUrl, setFotoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resize & compress image into base64 data URL
  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Harap unggah file gambar (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran gambar maksimal 5MB.');
      return;
    }

    setUploading(true);
    setError('');

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setFotoUrl(dataUrl);
        setUploading(false);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImageUpload(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!judul.trim()) {
      setError('Nama atau judul barang wajib diisi.');
      return;
    }
    if (!deskripsi.trim()) {
      setError('Deskripsi atau ciri-ciri barang wajib diisi.');
      return;
    }
    if (!lokasi.trim()) {
      setError('Lokasi kejadian wajib diisi.');
      return;
    }

    setUploading(true);

    try {
      const fallbackPlaceholder = tipeLaporan === 'HILANG'
        ? 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=800&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&auto=format&fit=crop&q=80';

      const finalFotoUrl = fotoUrl || fallbackPlaceholder;

      const reportDocRef = doc(collection(db, 'reports'));
      const reportId = reportDocRef.id;
      const currentAuthUid = auth.currentUser?.uid || currentUser.id_user;

      const newReportData = {
        id_report: reportId,
        id_user: currentAuthUid,
        user_nama: currentUser.nama_lengkap || 'Warga RW 04',
        user_whatsapp: currentUser.no_whatsapp || '',
        tipe_laporan: tipeLaporan,
        judul: judul.trim(),
        deskripsi: deskripsi.trim(),
        kategori,
        lokasi: lokasi.trim(),
        tgl_kejadian: tglKejadian,
        foto_url: finalFotoUrl,
        status_selesai: false,
        status_disetujui: currentUser.is_admin ? true : false,
        created_at: new Date().toISOString()
      };

      try {
        await setDoc(reportDocRef, newReportData);
      } catch (fsErr) {
        handleFirestoreError(fsErr, OperationType.CREATE, `reports/${reportId}`);
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error creating report:', err);
      let displayMessage = 'Gagal menyimpan laporan. Silakan periksa kembali formulir atau koneksi Anda.';
      try {
        const parsed = JSON.parse(err.message);
        if (parsed && parsed.error) {
          displayMessage = parsed.error;
        }
      } catch {
        if (err.message) displayMessage = err.message;
      }
      setError(displayMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-foreground/50 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        transition={{ duration: 0.15 }}
        className="relative bg-card text-card-foreground w-full max-w-lg rounded-t-[1rem] sm:rounded-[var(--radius)] overflow-hidden shadow-2xl border border-border max-h-[92vh] sm:max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-border flex items-center justify-between bg-card shrink-0">
          <div>
            <h2 className="font-serif text-lg sm:text-xl font-semibold text-foreground">Buat Laporan Baru</h2>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">Informasi barang hilang atau temuan di RW 04</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup form"
            className="p-2 text-muted-foreground hover:text-foreground rounded-full sm:rounded-[var(--radius)] hover:bg-muted transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 rounded-[var(--radius)] border border-error bg-error-background p-3 text-xs sm:text-sm text-foreground">
              <AlertCircle className="w-4 h-4 shrink-0 text-error mt-0.5" />
              <p className="flex-1 leading-relaxed">{error}</p>
            </div>
          )}

          {/* Tipe Laporan Toggle */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground block">Tipe Laporan</label>
            <div className="grid grid-cols-2 gap-1.5 bg-muted p-1 rounded-[var(--radius)] border border-border">
              <button
                type="button"
                id="btn-toggle-hilang"
                onClick={() => setTipeLaporan('HILANG')}
                className={`min-h-[40px] py-2 text-center text-xs font-semibold rounded-[var(--radius)] transition-colors cursor-pointer ${
                  tipeLaporan === 'HILANG'
                    ? 'bg-[var(--chart-1)] text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                HILANG / KEHILANGAN
              </button>
              <button
                type="button"
                id="btn-toggle-ditemukan"
                onClick={() => setTipeLaporan('DITEMUKAN')}
                className={`min-h-[40px] py-2 text-center text-xs font-semibold rounded-[var(--radius)] transition-colors cursor-pointer ${
                  tipeLaporan === 'DITEMUKAN'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                DITEMUKAN / TEMUAN
              </button>
            </div>
          </div>

          {/* Image Upload Area */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground block">
              Foto Barang <span className="text-muted-foreground font-normal text-xs">(Opsional)</span>
            </label>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />

            {fotoUrl ? (
              <div className="relative h-44 sm:h-48 w-full rounded-[var(--radius)] overflow-hidden border border-border bg-muted">
                <img
                  src={fotoUrl}
                  alt="Preview"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setFotoUrl('')}
                  className="absolute top-2 right-2 p-1.5 bg-card/90 text-foreground border border-border rounded-full hover:bg-card transition-colors cursor-pointer shadow-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-muted rounded-[var(--radius)] p-5 text-center cursor-pointer hover:border-foreground/40 hover:bg-muted/30 transition-colors flex flex-col items-center justify-center gap-1.5"
              >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <Camera className="w-5 h-5" />
                </div>
                <p className="text-xs font-medium text-foreground">
                  Ketuk untuk ambil foto / pilih dari galeri
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Mendukung JPG, PNG (Maks. 5MB)
                </p>
              </div>
            )}
          </div>

          {/* Judul Barang */}
          <div className="space-y-1.5">
            <label htmlFor="form-input-judul" className="text-sm font-medium text-foreground block">
              Nama Barang <span className="text-[var(--chart-1)]">*</span>
            </label>
            <input
              id="form-input-judul"
              type="text"
              required
              placeholder="Contoh: Dompet Kulit Cokelat, Kunci Motor Vario"
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-background border border-border rounded-[var(--radius)] focus:outline-none focus:ring-2 focus:ring-ring text-foreground min-h-[42px]"
            />
          </div>

          {/* Kategori & Tanggal (Responsive grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="form-select-kategori" className="text-sm font-medium text-foreground block">
                Kategori <span className="text-[var(--chart-1)]">*</span>
              </label>
              <select
                id="form-select-kategori"
                value={kategori}
                onChange={(e) => setKategori(e.target.value as Category)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-background border border-border rounded-[var(--radius)] focus:outline-none focus:ring-2 focus:ring-ring text-foreground min-h-[42px]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="form-input-tanggal" className="text-sm font-medium text-foreground block">
                Tanggal Kejadian <span className="text-[var(--chart-1)]">*</span>
              </label>
              <input
                id="form-input-tanggal"
                type="date"
                required
                value={tglKejadian}
                onChange={(e) => setTglKejadian(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-background border border-border rounded-[var(--radius)] focus:outline-none focus:ring-2 focus:ring-ring text-foreground min-h-[42px]"
              />
            </div>
          </div>

          {/* Lokasi */}
          <div className="space-y-1.5">
            <label htmlFor="form-input-lokasi" className="text-sm font-medium text-foreground block">
              Perkiraan Lokasi <span className="text-[var(--chart-1)]">*</span>
            </label>
            <input
              id="form-input-lokasi"
              type="text"
              required
              placeholder="Contoh: Lapangan Voli RT 02, Pos Ronda RT 04"
              value={lokasi}
              onChange={(e) => setLokasi(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-background border border-border rounded-[var(--radius)] focus:outline-none focus:ring-2 focus:ring-ring text-foreground min-h-[42px]"
            />
          </div>

          {/* Deskripsi */}
          <div className="space-y-1.5">
            <label htmlFor="form-input-deskripsi" className="text-sm font-medium text-foreground block">
              Deskripsi & Ciri Khusus <span className="text-[var(--chart-1)]">*</span>
            </label>
            <textarea
              id="form-input-deskripsi"
              rows={3}
              required
              placeholder="Jelaskan warna, tanda pengenal, kondisi fisik, atau ciri khas barang tersebut..."
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-background border border-border rounded-[var(--radius)] focus:outline-none focus:ring-2 focus:ring-ring text-foreground resize-none"
            />
          </div>

          {/* User Contact Preview */}
          <div className="p-3 bg-muted/60 rounded-[var(--radius)] border border-border space-y-1">
            <div className="text-[11px] text-muted-foreground">Kontak Pelapor (Otomatis):</div>
            <div className="text-xs font-medium text-foreground flex items-center justify-between">
              <span>{currentUser.nama_lengkap}</span>
              <span className="font-mono text-muted-foreground">{currentUser.no_whatsapp}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial min-h-[42px] px-4 py-2 text-xs font-medium text-secondary-foreground bg-secondary hover:bg-muted rounded-[var(--radius)] border border-border transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              id="btn-submit-report"
              disabled={uploading}
              className="flex-1 sm:flex-initial min-h-[42px] px-5 py-2 text-xs font-semibold text-primary-foreground bg-primary hover:opacity-90 rounded-[var(--radius)] transition-opacity disabled:opacity-50 cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
            >
              {uploading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Kirim Laporan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
