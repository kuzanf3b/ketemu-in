import { useState } from 'react';
import { Report, Category } from '../types';
import ReportCard from './ReportCard';
import ThemeToggle from './ThemeToggle';
import { 
  Search, 
  ArrowRight, 
  Compass, 
  FileText,
  AlertCircle,
  X,
  SlidersHorizontal,
  Plus,
  Info
} from 'lucide-react';
import { motion } from 'motion/react';
import logoBlack from '../assets/logo-black.png';
import logoWhite from '../assets/logo-white.png';

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
  isDark: boolean;
  onToggleTheme: () => void;
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
  onReportClick,
  isDark,
  onToggleTheme
}: LandingPageProps) {
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const totalPost = reports.length;
  const totalHilang = reports.filter(r => r.tipe_laporan === 'HILANG' && !r.status_selesai).length;
  const totalDitemukan = reports.filter(r => r.tipe_laporan === 'DITEMUKAN' && !r.status_selesai).length;
  const totalSelesai = reports.filter(r => r.status_selesai).length;

  const hasActiveFilters = searchQuery !== '' || selectedCategory !== 'Semua' || selectedTipe !== 'Semua';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('Semua');
    setSelectedTipe('Semua');
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans antialiased">
      
      {/* Top Header Navbar */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <img
              className="w-8 h-8 sm:w-9 sm:h-9 object-contain"
              src={isDark ? logoWhite : logoBlack}
              alt="KetemuIn Logo"
              referrerPolicy="no-referrer"
            />
            <div>
              <h1 className="font-serif text-lg sm:text-xl font-semibold tracking-tight text-foreground leading-none">
                KetemuIn
              </h1>
              <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium block">Lost & Found RW 04</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
            <button
              id="landing-btn-login"
              onClick={onNavigateToLogin}
              className="min-h-[38px] px-3.5 sm:px-4 py-2 rounded-[var(--radius)] bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
            >
              <span>Masuk / Daftar</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-10 sm:py-14 md:py-20 border-b border-border bg-card/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center space-y-4 sm:space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/80 border border-border text-[11px] sm:text-xs text-foreground font-medium">
            <span className="w-2 h-2 rounded-full bg-[var(--chart-1)] animate-pulse"></span>
            Pusat Informasi & Penemuan Warga RW 04
          </div>

          <h2 className="font-serif text-2xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foreground leading-tight sm:leading-tight">
            Lapor dan Temukan Barang Hilang di Lingkungan RW 04
          </h2>
          
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Papan informasi warga untuk memposting barang hilang atau temuan dan menghubungkan pelapor langsung melalui WhatsApp.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3 pt-2">
            <button
              id="hero-btn-explore"
              onClick={() => {
                const element = document.getElementById('laporan-terkini-section');
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="min-h-[44px] px-5 py-2.5 rounded-[var(--radius)] bg-card border border-border text-foreground text-xs sm:text-sm font-medium hover:bg-muted transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Compass className="w-4 h-4 text-muted-foreground shrink-0" />
              Lihat Semua Laporan
            </button>
            <button
              id="hero-btn-login-start"
              onClick={onNavigateToLogin}
              className="min-h-[44px] px-5 py-2.5 rounded-[var(--radius)] bg-primary text-primary-foreground text-xs sm:text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4 shrink-0" />
              Buat Laporan Baru
            </button>
          </div>
        </div>
      </section>

      {/* Real Statistics Row (Responsive grid: 2 cols on mobile, 4 on tablet/desktop) */}
      <section className="py-4 sm:py-6 bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 text-center">
            <div className="p-2.5 sm:p-3 bg-background/60 sm:bg-transparent rounded-[var(--radius)] sm:rounded-none border sm:border-0 border-border">
              <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-wider block truncate">Total Laporan</span>
              <span className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-foreground mt-0.5 block">{totalPost}</span>
            </div>
            <div className="p-2.5 sm:p-3 bg-background/60 sm:bg-transparent rounded-[var(--radius)] sm:rounded-none border sm:border-0 border-border md:border-l md:border-border">
              <span className="text-[10px] sm:text-[11px] font-medium text-[var(--chart-1)] uppercase tracking-wider block truncate">Barang Hilang</span>
              <span className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-[var(--chart-1)] mt-0.5 block">{totalHilang}</span>
            </div>
            <div className="p-2.5 sm:p-3 bg-background/60 sm:bg-transparent rounded-[var(--radius)] sm:rounded-none border sm:border-0 border-border md:border-l md:border-border">
              <span className="text-[10px] sm:text-[11px] font-medium text-foreground uppercase tracking-wider block truncate">Ditemukan</span>
              <span className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-foreground mt-0.5 block">{totalDitemukan}</span>
            </div>
            <div className="p-2.5 sm:p-3 bg-background/60 sm:bg-transparent rounded-[var(--radius)] sm:rounded-none border sm:border-0 border-border md:border-l md:border-border">
              <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-wider block truncate">Selesai / Kembali</span>
              <span className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-muted-foreground mt-0.5 block">{totalSelesai}</span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-8 sm:py-12 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="mb-6 sm:mb-8">
            <h3 className="font-serif text-xl sm:text-2xl font-semibold text-foreground tracking-tight">Cara Kerja</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Alur pelaporan dan serah terima barang di lingkungan warga.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4">
            <div className="p-4 sm:p-5 bg-card rounded-[var(--radius)] border border-border space-y-2">
              <span className="font-serif text-lg sm:text-xl font-bold text-muted-foreground">01</span>
              <h4 className="font-sans text-sm font-semibold text-foreground">Laporkan Barang</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Isi rincian nama barang, kategori, foto, perkiraan lokasi, dan tanggal kejadian.
              </p>
            </div>

            <div className="p-4 sm:p-5 bg-card rounded-[var(--radius)] border border-border space-y-2">
              <span className="font-serif text-lg sm:text-xl font-bold text-muted-foreground">02</span>
              <h4 className="font-sans text-sm font-semibold text-foreground">Cek Papan Pengumuman</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Warga dapat menelusuri laporan aktif berdasarkan kategori dan kata kunci pencarian.
              </p>
            </div>

            <div className="p-4 sm:p-5 bg-card rounded-[var(--radius)] border border-border space-y-2 sm:col-span-2 md:col-span-1">
              <span className="font-serif text-lg sm:text-xl font-bold text-muted-foreground">03</span>
              <h4 className="font-sans text-sm font-semibold text-foreground">Hubungi & Serah Terima</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Hubungi pelapor via WhatsApp untuk verifikasi kepemilikan dan serah terima barang.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Reports Board Section */}
      <section id="laporan-terkini-section" className="py-8 sm:py-12 max-w-6xl w-full mx-auto px-4 sm:px-6 flex-1">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div>
            <h3 className="font-serif text-xl sm:text-2xl font-semibold text-foreground tracking-tight">Papan Laporan Warga</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Daftar barang hilang dan barang temuan terbaru di lingkungan RW 04.
            </p>
          </div>
          
          <div className="flex items-start gap-2.5 rounded-[var(--radius)] border border-info bg-info-background p-3 max-w-md shadow-xs">
            <Info className="w-4 h-4 text-info shrink-0 mt-0.5" />
            <p className="text-[11px] sm:text-xs text-foreground leading-relaxed">
              Masuk atau buat akun untuk dapat menghubungi kontak pelapor langsung via WhatsApp.
            </p>
          </div>
        </div>

        {/* Filter Controls (Sticky on mobile if needed, fluid on tablet/desktop) */}
        <div className="bg-card rounded-[var(--radius)] p-3.5 sm:p-4 border border-border space-y-3 mb-6 shadow-xs">
          
          {/* Main search and status toggle */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
                <Search className="w-4 h-4" />
              </span>
              <input
                id="landing-search-input"
                type="text"
                placeholder="Cari nama barang, lokasi, atau deskripsi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-background border border-border rounded-[var(--radius)] focus:outline-none focus:ring-2 focus:ring-ring transition-colors text-foreground h-[42px]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Segmented Control */}
            <div className="grid grid-cols-3 sm:flex gap-1 bg-muted p-1 rounded-[var(--radius)] border border-border shrink-0">
              {['Semua', 'HILANG', 'DITEMUKAN'].map((tipe) => (
                <button
                  key={tipe}
                  id={`landing-status-filter-${tipe}`}
                  onClick={() => setSelectedTipe(tipe)}
                  className={`min-h-[34px] px-2 sm:px-3 py-1 text-center text-xs font-semibold rounded-[var(--radius)] transition-colors cursor-pointer whitespace-nowrap ${
                    selectedTipe === tipe
                      ? tipe === 'HILANG'
                        ? 'bg-[var(--chart-1)] text-white shadow-xs'
                        : 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tipe === 'HILANG' ? 'Hilang' : tipe === 'DITEMUKAN' ? 'Temuan' : 'Semua'}
                </button>
              ))}
            </div>
          </div>

          {/* Category Chips with Horizontal Scroll indicator */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar scroll-smooth">
            <span className="text-xs font-medium text-muted-foreground shrink-0 mr-1 hidden sm:inline">Kategori:</span>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                id={`landing-category-filter-${cat}`}
                onClick={() => setSelectedCategory(cat)}
                className={`min-h-[32px] px-3 py-1 rounded-[var(--radius)] text-xs font-medium shrink-0 transition-colors cursor-pointer border whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'border-primary bg-primary text-primary-foreground font-semibold'
                    : 'border-border bg-background sm:bg-card text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {cat}
              </button>
            ))}

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="min-h-[32px] px-2.5 py-1 rounded-[var(--radius)] text-xs font-medium shrink-0 text-destructive hover:bg-destructive/10 border border-destructive/20 transition-colors cursor-pointer whitespace-nowrap"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>

        {/* Reports Content List */}
        {loading && reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin"></div>
            <p className="text-muted-foreground text-xs">Memuat laporan...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-card rounded-[var(--radius)] p-8 sm:p-12 text-center border border-border max-w-md mx-auto">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <h4 className="font-sans text-sm font-semibold text-foreground">Tidak Ada Laporan</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Tidak ditemukan laporan yang sesuai dengan filter atau kata kunci saat ini.
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="mt-3 text-xs text-foreground hover:underline font-medium cursor-pointer"
              >
                Reset Semua Filter
              </button>
            )}
          </div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4"
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

      {/* Footer */}
      <footer className="bg-card border-t border-border py-6 text-center text-xs text-muted-foreground mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-1">
          <p className="font-medium text-foreground">KetemuIn RW 04</p>
          <p>Sistem informasi barang hilang dan temuan lingkungan warga.</p>
        </div>
      </footer>
    </div>
  );
}
