import React, { useState, useRef } from 'react';
import { User, Category } from '../types';
import { X, Calendar, MapPin, AlertCircle, Upload } from 'lucide-react';
import { motion } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';

interface ReportFormProps {
  currentUser: User;
  onClose: () => void;
  onSuccess: (newReport: any) => void;
}

const CATEGORIES: Category[] = ['Elektronik', 'Kunci', 'Dompet', 'Hewan', 'Dokumen', 'Lainnya'];

const CATEGORY_PRESETS: Record<Category, string[]> = {
  Elektronik: [
    'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1585060544812-6b45742d762f?auto=format&fit=crop&w=600&q=80',
  ],
  Kunci: [
    'https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=600&q=80',
  ],
  Dompet: [
    'https://images.unsplash.com/photo-1627124718515-47f9931b3e4a?auto=format&fit=crop&w=600&q=80',
  ],
  Hewan: [
    'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=600&q=80',
  ],
  Dokumen: [
    'https://images.unsplash.com/photo-1568667256549-094345857637?auto=format&fit=crop&w=600&q=80',
  ],
  Lainnya: [
    'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=600&q=80',
  ],
};

export default function ReportForm({ currentUser, onClose, onSuccess }: ReportFormProps) {
  const [tipeLaporan, setTipeLaporan] = useState<'HILANG' | 'DITEMUKAN'>('HILANG');
  const [kategori, setKategori] = useState<Category>('Elektronik');
  const [judul, setJudul] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [tglKejadian, setTglKejadian] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activePresets = CATEGORY_PRESETS[kategori] || CATEGORY_PRESETS['Lainnya'];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const processFile = (file: File) => {
    setError('');
    if (!file.type.startsWith('image/')) {
      setError('Format file harus berupa gambar (PNG, JPG, JPEG).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Ukuran gambar maksimal 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 600;
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
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.72);
          setFotoUrl(compressedBase64);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!judul.trim() || !deskripsi.trim() || !lokasi.trim() || !tglKejadian) {
      setError('Harap lengkapi semua kolom.');
      setLoading(false);
      return;
    }

    const finalFotoUrl = fotoUrl.trim() || activePresets[0];

    try {
      const reportsCollection = collection(db, 'reports');
      const newDocRef = doc(reportsCollection);
      const generatedId = newDocRef.id;

      const payload = {
        id_report: generatedId,
        id_user: currentUser.id_user,
        tipe_laporan: tipeLaporan,
        kategori,
        judul: judul.trim(),
        deskripsi: deskripsi.trim(),
        foto_url: finalFotoUrl,
        lokasi: lokasi.trim(),
        tgl_kejadian: tglKejadian,
        status_selesai: false,
        created_at: new Date().toISOString(),
        user_nama: currentUser.nama_lengkap,
        user_whatsapp: currentUser.no_whatsapp,
        status_disetujui: false
      };

      try {
        await setDoc(newDocRef, payload);
      } catch (fsErr) {
        handleFirestoreError(fsErr, OperationType.CREATE, `reports/${generatedId}`);
      }

      onSuccess(payload);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/45 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.15 }}
        className="relative bg-card text-card-foreground w-full max-w-lg rounded-[var(--radius)] overflow-hidden shadow-lg border border-border max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-card">
          <div>
            <h2 className="font-serif text-xl font-semibold text-foreground">Buat Laporan Baru</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Informasi barang hilang atau temuan di RW 04</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup form"
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-[var(--radius)] hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 text-xs font-medium text-destructive-foreground bg-destructive/90 rounded-[var(--radius)] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Tipe Laporan Toggle */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">Tipe Laporan</label>
            <div className="grid grid-cols-2 gap-2 bg-muted p-1 rounded-[var(--radius)] border border-border">
              <button
                type="button"
                id="btn-toggle-hilang"
                onClick={() => setTipeLaporan('HILANG')}
                className={`py-2 text-center text-xs font-semibold rounded-[var(--radius)] transition-colors cursor-pointer ${
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
                className={`py-2 text-center text-xs font-semibold rounded-[var(--radius)] transition-colors cursor-pointer ${
                  tipeLaporan === 'DITEMUKAN'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                DITEMUKAN / PENEMUAN
              </button>
            </div>
          </div>

          {/* Kategori Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">Kategori Barang</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setKategori(cat);
                    if (!fotoUrl.startsWith('data:image/')) {
                      setFotoUrl('');
                    }
                  }}
                  className={`py-1.5 px-2 text-center text-xs rounded-[var(--radius)] border transition-colors cursor-pointer ${
                    kategori === cat
                      ? 'border-primary bg-primary text-primary-foreground font-semibold'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Judul Laporan */}
          <div className="space-y-1.5">
            <label htmlFor="form-report-title" className="text-xs font-semibold text-foreground block">
              Nama Barang / Judul Laporan
            </label>
            <input
              id="form-report-title"
              type="text"
              placeholder="Misal: Dompet Kulit Cokelat, Kunci Motor Honda"
              maxLength={150}
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-card border border-border rounded-[var(--radius)] focus:outline-none focus:ring-2 focus:ring-ring transition-colors text-foreground"
              required
            />
          </div>

          {/* Deskripsi */}
          <div className="space-y-1.5">
            <label htmlFor="form-report-desc" className="text-xs font-semibold text-foreground block">
              Deskripsi & Ciri Khusus
            </label>
            <textarea
              id="form-report-desc"
              rows={3}
              placeholder="Jelaskan warna, tanda khusus, merk, atau isi barang secara jelas."
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-card border border-border rounded-[var(--radius)] focus:outline-none focus:ring-2 focus:ring-ring transition-colors text-foreground resize-none"
              required
            />
          </div>

          {/* Lokasi Kejadian */}
          <div className="space-y-1.5">
            <label htmlFor="form-report-loc" className="text-xs font-semibold text-foreground block">
              Perkiraan Lokasi di Lingkungan RW 04
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
                <MapPin className="w-4 h-4" />
              </span>
              <input
                id="form-report-loc"
                type="text"
                placeholder="Misal: Depan Pos Ronda RT 03, Lapangan RW"
                value={lokasi}
                onChange={(e) => setLokasi(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border rounded-[var(--radius)] focus:outline-none focus:ring-2 focus:ring-ring transition-colors text-foreground"
                required
              />
            </div>
          </div>

          {/* Tanggal Kejadian */}
          <div className="space-y-1.5">
            <label htmlFor="form-report-date" className="text-xs font-semibold text-foreground block">
              Tanggal Kejadian
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
                <Calendar className="w-4 h-4" />
              </span>
              <input
                id="form-report-date"
                type="date"
                value={tglKejadian}
                onChange={(e) => setTglKejadian(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border rounded-[var(--radius)] focus:outline-none focus:ring-2 focus:ring-ring transition-colors text-foreground"
                required
              />
            </div>
          </div>

          {/* Foto Upload */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">Foto Barang</label>
            
            {fotoUrl ? (
              <div className="relative rounded-[var(--radius)] border border-border overflow-hidden bg-muted aspect-video flex items-center justify-center">
                <img src={fotoUrl} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setFotoUrl('')}
                  className="absolute top-2 right-2 p-1.5 bg-background/80 hover:bg-destructive hover:text-white text-foreground rounded-[var(--radius)] border border-border transition-colors cursor-pointer"
                  title="Hapus foto"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border border-dashed rounded-[var(--radius)] p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                  dragActive
                    ? 'border-primary bg-accent'
                    : 'border-border bg-accent/40 hover:bg-accent'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Upload className="w-5 h-5 text-muted-foreground" />
                <div className="text-center space-y-0.5">
                  <p className="text-xs font-medium text-foreground">Klik untuk memilih foto atau seret file ke sini</p>
                  <p className="text-[11px] text-muted-foreground">PNG, JPG (Maks. 10MB). Jika kosong, sistem menggunakan foto standar.</p>
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-border bg-card flex gap-2.5 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-foreground hover:bg-muted border border-border rounded-[var(--radius)] transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            id="btn-submit-report"
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 text-xs font-semibold text-primary-foreground bg-primary hover:opacity-90 rounded-[var(--radius)] transition-opacity disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Menyimpan...' : 'Kirim Laporan'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
