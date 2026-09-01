import { Report, Category } from '../types';
import ReportCard from './ReportCard';
import ThemeToggle from './ThemeToggle';
import { 
  Search, 
  ArrowRight, 
  Compass, 
  FileText,
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
  const totalPost = reports.length;
  const totalHilang = reports.filter(r => r.tipe_laporan === 'HILANG' && !r.status_selesai).length;
  const totalDitemukan = reports.filter(r => r.tipe_laporan === 'DITEMUKAN' && !r.status_selesai).length;
  const totalSelesai = reports.filter(r => r.status_selesai).length;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      
      {/* Top Header Navbar */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-xs border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img className="w-9 h-9 object-contain dark:invert" src={logoBlack} alt="KetemuIn Logo" referrerPolicy="no-referrer" />
            <div>
              <h1 className="font-serif text-xl font-semibold tracking-tight text-foreground leading-none">
                KetemuIn
              </h1>
              <span className="text-[11px] text-muted-foreground font-medium">Lost & Found RW 04</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
            <button
              id="landing-btn-login"
              onClick={onNavigateToLogin}
              className="px-4 py-2 rounded-[var(--radius)] bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              Masuk / Daftar
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-14 md:py-20 border-b border-border bg-card/40">
        <div className="max-w-3xl mx-auto px-4 text-center space-y-5">
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foreground leading-tight">
            Lapor dan Temukan Barang Hilang di Lingkungan RW 04
          </h2>
          
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Papan informasi warga untuk memposting barang hilang atau temuan dan menghubungkan pelapor langsung melalui WhatsApp.
          </p>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              id="hero-btn-explore"
              onClick={() => {
                const element = document.getElementById('laporan-terkini-section');
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-5 py-2.5 rounded-[var(--radius)] bg-card border border-border text-foreground text-xs font-medium hover:bg-muted transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Compass className="w-4 h-4 text-muted-foreground" />
              Lihat Semua Laporan
            </button>
            <button
              id="hero-btn-login-start"
              onClick={onNavigateToLogin}
              className="px-5 py-2.5 rounded-[var(--radius)] bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 cursor-pointer shadow-xs"
            >
              Buat Laporan Baru
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Real Statistics Row */}
      <section className="py-6 bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-3">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">Total Laporan</span>
              <span className="font-serif text-2xl md:text-3xl font-bold text-foreground mt-0.5 block">{totalPost}</span>
            </div>
            <div className="p-3 md:border-l md:border-border">
              <span className="text-[11px] font-medium text-[var(--chart-1)] uppercase tracking-wider block">Barang Hilang</span>
              <span className="font-serif text-2xl md:text-3xl font-bold text-[var(--chart-1)] mt-0.5 block">{totalHilang}</span>
            </div>
            <div className="p-3 md:border-l md:border-border">
              <span className="text-[11px] font-medium text-foreground uppercase tracking-wider block">Barang Ditemukan</span>
              <span className="font-serif text-2xl md:text-3xl font-bold text-foreground mt-0.5 block">{totalDitemukan}</span>
            </div>
            <div className="p-3 md:border-l md:border-border">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">Selesai / Kembali</span>
              <span className="font-serif text-2xl md:text-3xl font-bold text-muted-foreground mt-0.5 block">{totalSelesai}</span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-12 border-b border-border">
        <div className="max-w-6xl mx-auto px-4">
          <div className="mb-8">
            <h3 className="font-serif text-2xl font-semibold text-foreground tracking-tight">Cara Kerja</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Alur pelaporan dan serah terima barang di lingkungan warga.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-card rounded-[var(--radius)] border border-border space-y-2">
              <span className="font-serif text-xl font-bold text-muted-foreground">01</span>
              <h4 className="font-sans text-sm font-semibold text-foreground">Laporkan Barang</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Isi rincian nama barang, kategori, foto, perkiraan lokasi, dan tanggal kejadian.
              </p>
            </div>

            <div className="p-5 bg-card rounded-[var(--radius)] border border-border space-y-2">
              <span className="font-serif text-xl font-bold text-muted-foreground">02</span>
              <h4 className="font-sans text-sm font-semibold text-foreground">Cek Papan Pengumuman</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Warga dapat menelusuri laporan aktif berdasarkan kategori dan kata kunci pencarian.
              </p>
            </div>

            <div className="p-5 bg-card rounded-[var(--radius)] border border-border space-y-2">
              <span className="font-serif text-xl font-bold text-muted-foreground">03</span>
              <h4 className="font-sans text-sm font-semibold text-foreground">Hubungi & Serah Terima</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Hubungi pelapor via WhatsApp untuk verifikasi kepemilikan dan serah terima barang.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Reports Board Section */}
      <section id="laporan-terkini-section" className="py-12 max-w-6xl w-full mx-auto px-4 flex-1">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <h3 className="font-serif text-2xl font-semibold text-foreground tracking-tight">Papan Laporan Warga</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Daftar barang hilang dan barang temuan terbaru di lingkungan RW 04.
            </p>
          </div>
          
          <div className="bg-card border border-border rounded-[var(--radius)] p-3 flex items-center gap-2.5 max-w-md">
            <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">
              Masuk atau buat akun untuk dapat menghubungi kontak pelapor langsung via WhatsApp.
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="bg-card rounded-[var(--radius)] p-4 border border-border space-y-3 mb-6 shadow-xs">
          <div className="flex flex-col md:flex-row gap-2.5">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
                <Search className="w-4 h-4" />
              </span>
              <input
                id="landing-search-input"
                type="text"
                placeholder="Cari berdasarkan nama barang, lokasi, atau deskripsi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-background border border-border rounded-[var(--radius)] focus:outline-none focus:ring-2 focus:ring-ring transition-colors text-foreground"
              />
            </div>

            {/* Status Filter */}
            <div className="flex gap-1 bg-muted p-1 rounded-[var(--radius)] border border-border shrink-0">
              {['Semua', 'HILANG', 'DITEMUKAN'].map((tipe) => (
                <button
                  key={tipe}
                  id={`landing-status-filter-${tipe}`}
                  onClick={() => setSelectedTipe(tipe)}
                  className={`px-3 py-1 text-xs font-semibold rounded-[var(--radius)] transition-colors cursor-pointer ${
                    selectedTipe === tipe
                      ? tipe === 'HILANG'
                        ? 'bg-[var(--chart-1)] text-white shadow-xs'
                        : tipe === 'DITEMUKAN'
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tipe === 'HILANG' ? 'Kehilangan' : tipe === 'DITEMUKAN' ? 'Penemuan' : 'Semua'}
                </button>
              ))}
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1">
            <span className="text-xs font-medium text-muted-foreground shrink-0 mr-1">Kategori:</span>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                id={`landing-category-filter-${cat}`}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-[var(--radius)] text-xs font-medium shrink-0 transition-colors cursor-pointer border ${
                  selectedCategory === cat
                    ? 'border-primary bg-primary text-primary-foreground font-semibold'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Reports Content List */}
        {loading && reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin"></div>
            <p className="text-muted-foreground text-xs">Memuat laporan...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-card rounded-[var(--radius)] p-12 text-center border border-border max-w-md mx-auto">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <h4 className="font-sans text-sm font-semibold text-foreground">Tidak Ada Laporan</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Tidak ditemukan laporan yang sesuai dengan filter atau kata kunci saat ini.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('Semua');
                setSelectedTipe('Semua');
              }}
              className="mt-3 text-xs text-foreground hover:underline font-medium cursor-pointer"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
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
      <footer className="bg-card border-t border-border py-6 text-center text-xs text-muted-foreground">
        <div className="max-w-6xl mx-auto px-4">
          <p className="font-medium text-foreground">KetemuIn RW 04</p>
          <p className="mt-1">Sistem informasi barang hilang dan temuan lingkungan warga.</p>
        </div>
      </footer>
    </div>
  );
}
