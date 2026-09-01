import React, { useState, useRef } from 'react';
import { User, Category } from '../types';
import { X, Calendar, MapPin, Tag, Image as ImageIcon, AlertCircle, Upload } from 'lucide-react';
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
    'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=600&q=80', // smartwatch
    'https://images.unsplash.com/photo-1585060544812-6b45742d762f?auto=format&fit=crop&w=600&q=80', // phone
    'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=600&q=80', // laptop
  ],
  Kunci: [
    'https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=600&q=80', // keys
    'https://images.unsplash.com/photo-1620216524385-d6015dcba401?auto=format&fit=crop&w=600&q=80', // car keys
  ],
  Dompet: [
    'https://images.unsplash.com/photo-1627124718515-47f9931b3e4a?auto=format&fit=crop&w=600&q=80', // wallet
    'https://images.unsplash.com/photo-1598343175492-9e7dc0e63cc6?auto=format&fit=crop&w=600&q=80', // pink wallet
  ],
  Hewan: [
    'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=600&q=80', // dog
    'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=600&q=80', // cat
    'https://images.unsplash.com/photo-1452857297128-d9c29adba80b?auto=format&fit=crop&w=600&q=80', // rabbit
  ],
  Dokumen: [
    'https://images.unsplash.com/photo-1568667256549-094345857637?auto=format&fit=crop&w=600&q=80', // files
    'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80', // passport/id
  ],
  Lainnya: [
    'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80', // backpack
    'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=600&q=80', // helmet
    'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=600&q=80', // bicycle
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

  // Default to first preset of the category
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
        // Let's keep dimensions at high-fidelity but light: 500 max width or height
        const MAX_WIDTH = 500;
        const MAX_HEIGHT = 500;
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
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7); // 70% quality jpeg
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
      setError('Harap isi semua kolom wajib.');
      setLoading(false);
      return;
    }

    // Use default category image if none is uploaded
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/60 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="relative bg-card w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-border max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-accent">
          <div>
            <h3 className="text-lg font-bold text-foreground">Buat Laporan Baru</h3>
            <p className="text-xs text-muted-foreground">Tulis info barang/hewan hilang atau ditemukan</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-muted-foreground rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Tipe Laporan Toggle */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground block">Tipe Laporan</label>
            <div className="grid grid-cols-2 gap-2 bg-muted p-1.5 rounded-2xl">
              <button
                type="button"
                id="btn-toggle-hilang"
                onClick={() => setTipeLaporan('HILANG')}
                className={`py-2 text-center text-xs font-bold rounded-xl transition-all ${
                  tipeLaporan === 'HILANG'
                    ? 'bg-rose-500 text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-muted-foreground'
                }`}
              >
                🔴 HILANG / KEHILANGAN
              </button>
              <button
                type="button"
                id="btn-toggle-ditemukan"
                onClick={() => setTipeLaporan('DITEMUKAN')}
                className={`py-2 text-center text-xs font-bold rounded-xl transition-all ${
                  tipeLaporan === 'DITEMUKAN'
                    ? 'bg-emerald-500 text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-muted-foreground'
                }`}
              >
                🟢 DITEMUKAN / PENEMUAN
              </button>
            </div>
          </div>

          {/* Kategori Selector */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground block">Kategori</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setKategori(cat);
                    if (!fotoUrl.startsWith('data:image/')) {
                      setFotoUrl(''); // reset if not a custom uploaded base64 image
                    }
                  }}
                  className={`py-2 text-center text-xs font-semibold border rounded-xl transition-all ${
                    kategori === cat
                      ? 'border-slate-900 bg-accent text-foreground font-bold'
                      : 'border-border text-muted-foreground hover:border-border hover:bg-accent'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Judul Laporan */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground block">Judul Laporan</label>
            <input
              id="form-report-title"
              type="text"
              placeholder="Contoh: Kunci Motor Scoopy Hitam"
              maxLength={150}
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              className="w-full px-4 py-2 text-sm bg-accent border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/5 focus:border-primary transition-all text-foreground"
              required
            />
          </div>

          {/* Deskripsi */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground block">Deskripsi & Ciri Khusus</label>
            <textarea
              id="form-report-desc"
              rows={3}
              placeholder="Tulis ciri-ciri detail (misal: warna casing, gantungan kunci boneka beruang, bekas lecet, dll)"
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-accent border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/5 focus:border-primary transition-all text-foreground resize-none"
              required
            />
          </div>

          {/* Lokasi Kejadian */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground block">Perkiraan Lokasi</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                <MapPin className="w-4 h-4" />
              </span>
              <input
                id="form-report-loc"
                type="text"
                placeholder="Contoh: Depan warung kelontong RT 02"
                value={lokasi}
                onChange={(e) => setLokasi(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-accent border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/5 focus:border-primary transition-all text-foreground"
                required
              />
            </div>
          </div>

          {/* Tanggal Kejadian */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground block">Tanggal Kejadian</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                <Calendar className="w-4 h-4" />
              </span>
              <input
                id="form-report-date"
                type="date"
                value={tglKejadian}
                onChange={(e) => setTglKejadian(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-accent border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/5 focus:border-primary transition-all text-foreground"
                required
              />
            </div>
          </div>

          {/* Foto Upload dengan Drag and Drop */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground block">Foto Barang</label>
            
            {fotoUrl ? (
              <div className="relative rounded-2xl border border-border overflow-hidden bg-accent aspect-video flex items-center justify-center">
                <img src={fotoUrl} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setFotoUrl('')}
                  className="absolute top-2 right-2 p-2 bg-red-500/85 hover:bg-red-600 text-primary-foreground rounded-full transition-all shadow-md"
                  title="Hapus Foto"
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
                className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                  dragActive
                    ? 'border-slate-900 bg-accent'
                    : 'border-border bg-accent/50 hover:border-border hover:bg-accent'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="p-3 bg-card rounded-full shadow-sm text-muted-foreground border border-border">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-muted-foreground">Tarik & lepas gambar di sini, atau klik untuk memilih</p>
                  <p className="text-[10px] text-muted-foreground mt-1 font-semibold">PNG, JPG, JPEG (Maks. 10MB). Laporan tanpa foto akan menggunakan gambar ilustrasi default.</p>
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border bg-accent flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all"
          >
            Batal
          </button>
          <button
            id="btn-submit-report"
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 text-sm font-bold text-primary-foreground bg-primary hover:bg-secondary rounded-xl transition-all disabled:opacity-50"
          >
            {loading ? 'Menyimpan...' : 'Kirim Laporan'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

