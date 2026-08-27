import React from 'react';
import { Report, Category } from '../types';
import ReportCard from './ReportCard';
import { 
  Search, 
  Sparkles, 
  ArrowRight, 
  Compass, 
  Tag, 
  MapPin, 
  Calendar, 
  HelpCircle,
  FileText,
  Phone,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import logoBlack from '../assets/logo-black.png';

interface LandingPageProps {
  reports: Report[];
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  selectedTipe: string;
  setSelectedTipe: (tipe: string) => void;
  onNavigateToLogin: () => void;
  onReportClick: (report: Report) => void;
}

const CATEGORIES: ('Semua' | Category)[] = ['Semua', 'Elektronik', 'Kunci', 'Dompet', 'Hewan', 'Dokumen', 'Lainnya'];

export default function LandingPage({
  reports,
  loading,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  selectedTipe,
  setSelectedTipe,
  onNavigateToLogin,
  onReportClick
}: LandingPageProps) {
  
  // Calculate statistics from actual database records
  const totalPost = reports.length;
  const totalHilang = reports.filter(r => r.tipe_laporan === 'HILANG' && !r.status_selesai).length;
  const totalDitemukan = reports.filter(r => r.tipe_laporan === 'DITEMUKAN' && !r.status_selesai).length;
  const totalSelesai = reports.filter(r => r.status_selesai).length;

  return (
    <div className="min-h-screen bg-accent text-foreground flex flex-col font-sans">
      
      {/* Top Header Navbar */}
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <img className="w-12 h-12 object-contain" src={logoBlack} alt="KetemuIn Logo" referrerPolicy="no-referrer" />
            <div>
              <h1 className="text-lg font-black tracking-tight text-foreground">
                KetemuIn
              </h1>
              <p className="text-[10px] text-muted-foreground font-semibold tracking-wide">Lost & Found RW 04</p>
            </div>
          </div>

          <button
            id="landing-btn-login"
            onClick={onNavigateToLogin}
            className="px-5 py-2 rounded-xl bg-primary hover:bg-secondary text-primary-foreground text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            Masuk / Daftar
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-background to-accent py-16 md:py-24 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-[11px] font-bold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            Platform Lost & Found Lingkungan Warga
          </div>
          
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-foreground leading-none">
            Kehilangan atau Menemukan Sesuatu di Sekitar RW 04?
          </h2>
          
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            KetemuIn adalah wadah kepedulian sosial digital antar tetangga. Laporkan barang hilang, posting penemuan barang tak dikenal, dan koordinasikan pengembaliannya secara mudah, aman, dan langsung via WhatsApp.
          </p>

          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <button
              id="hero-btn-explore"
              onClick={() => {
                const element = document.getElementById('laporan-terkini-section');
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-6 py-3 rounded-xl bg-card border border-border text-foreground text-xs font-extrabold transition-all hover:bg-muted shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Compass className="w-4 h-4 text-muted-foreground" />
              Telusuri Laporan
            </button>
            <button
              id="hero-btn-login-start"
              onClick={onNavigateToLogin}
              className="px-6 py-3 rounded-xl bg-primary hover:bg-secondary text-primary-foreground text-xs font-extrabold transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              Buat Laporan Baru
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Stats Counter Row */}
      <section className="py-8 bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-4 space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Total Laporan</span>
              <span className="text-3xl font-black text-foreground block">{totalPost}</span>
            </div>
            <div className="p-4 space-y-1 border-l border-border/50">
              <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest block">Sisa Kehilangan</span>
              <span className="text-3xl font-black text-rose-600 block">{totalHilang}</span>
            </div>
            <div className="p-4 space-y-1 border-l border-border/50">
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest block">Sisa Penemuan</span>
              <span className="text-3xl font-black text-emerald-600 block">{totalDitemukan}</span>
            </div>
            <div className="p-4 space-y-1 border-l border-border/50">
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest block">Selesai Kembali</span>
              <span className="text-3xl font-black text-primary block">{totalSelesai}</span>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works section */}
      <section className="py-16 bg-background border-b border-border">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center space-y-2 mb-12">
            <h3 className="text-2xl font-extrabold text-foreground tracking-tight">Cara Kerja KetemuIn</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Sistematisasi aksi sosial sederhana untuk membantu lingkungan RW 04 tetap rukun dan aman.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4 p-6 bg-accent rounded-3xl border border-border/40 shadow-sm">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center font-black text-lg">
                1
              </div>
              <h4 className="text-base font-bold text-foreground">Laporkan Kejadian</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tulis deskripsi, upload foto barang/hewan, sertakan perkiraan lokasi serta tanggal kejadian di lingkungan RW 04.
              </p>
            </div>

            <div className="space-y-4 p-6 bg-accent rounded-3xl border border-border/40 shadow-sm">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center font-black text-lg">
                2
              </div>
              <h4 className="text-base font-bold text-foreground">Verifikasi & Telusuri</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Warga lainnya menyaring kategori barang dan memverifikasi ciri fisik barang/hewan tersebut di mading warga digital ini.
              </p>
            </div>

            <div className="space-y-4 p-6 bg-accent rounded-3xl border border-border/40 shadow-sm">
              <div className="w-12 h-12 bg-primary/20 text-primary rounded-2xl flex items-center justify-center font-black text-lg">
                3
              </div>
              <h4 className="text-base font-bold text-foreground">Hubungi & Kembalikan</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Klaim kepemilikan dengan menghubungi pelapor secara langsung via WhatsApp untuk serah terima barang secara transparan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Items / Board Section */}
      <section id="laporan-terkini-section" className="py-16 max-w-6xl w-full mx-auto px-4 flex-1">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h3 className="text-2xl font-extrabold text-foreground tracking-tight">Papan Laporan Terkini</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Pantau barang hilang atau ditemukan yang baru saja dilaporkan oleh warga.
            </p>
          </div>
          
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3 max-w-md shadow-sm">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-[11px] text-amber-700 leading-normal font-medium">
              Untuk menjaga keamanan informasi dan privasi, Anda wajib <strong>masuk/daftar akun</strong> terlebih dahulu sebelum dapat menghubungi penemu atau pemilik barang.
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="bg-card rounded-3xl p-4 border border-border shadow-sm space-y-4 mb-8">
          {/* Row 1: Search and Type Filter */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                <Search className="w-4 h-4" />
              </span>
              <input
                id="landing-search-input"
                type="text"
                placeholder="Cari kata kunci laporan (misal: kunci, dompet, kucing...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-accent border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/5 focus:border-primary transition-all text-foreground"
              />
            </div>

            {/* Status Toggle (Semua, Kehilangan, Penemuan) */}
            <div className="flex gap-1 bg-muted p-1 rounded-xl shrink-0 self-start md:self-auto w-full md:w-auto">
              {['Semua', 'HILANG', 'DITEMUKAN'].map((tipe) => (
                <button
                  key={tipe}
                  id={`landing-status-filter-${tipe}`}
                  onClick={() => setSelectedTipe(tipe)}
                  className={`flex-1 md:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedTipe === tipe
                      ? tipe === 'HILANG'
                        ? 'bg-rose-500 text-primary-foreground shadow-sm'
                        : tipe === 'DITEMUKAN'
                        ? 'bg-emerald-500 text-primary-foreground shadow-sm'
                        : 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tipe === 'HILANG' ? 'Kehilangan' : tipe === 'DITEMUKAN' ? 'Penemuan' : 'Semua Status'}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: Category Chip Bar */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Kategori</span>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  id={`landing-category-filter-${cat}`}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-accent hover:bg-muted text-muted-foreground hover:text-foreground border border-border/40'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Reports Content List */}
        {loading && reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <svg className="animate-spin h-8 w-8 text-foreground" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-muted-foreground text-xs">Memuat daftar laporan...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-card rounded-3xl p-16 text-center border border-border shadow-sm max-w-lg mx-auto">
            <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-4 text-muted-foreground">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-foreground">Laporan Tidak Ditemukan</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              Belum ada laporan yang cocok dengan filter yang Anda pilih saat ini di database.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('Semua');
                setSelectedTipe('Semua');
              }}
              className="mt-4 text-xs text-foreground hover:text-muted-foreground font-bold underline transition-colors cursor-pointer"
            >
              Reset Semua Filter
            </button>
          </div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {reports.map((report) => (
              <ReportCard
                key={report.id_report}
                report={report}
                onClick={() => onReportClick(report)}
              />
            ))}
          </motion.div>
        )}
      </section>

      {/* Footer copyright */}
      <footer className="bg-card border-t border-border py-8 text-center text-xs text-muted-foreground">
        <div className="max-w-6xl mx-auto px-4 space-y-2">
          <p className="font-semibold text-foreground">KetemuIn RW 04 - Peduli & Saling Membantu</p>
          <p>© 2026 KetemuIn RW 04. Dibuat dengan kejujuran & kepedulian sosial lingkungan.</p>
        </div>
      </footer>
    </div>
  );
}
