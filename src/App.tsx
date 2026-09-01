import { useState, useEffect } from 'react';
import { User, Report, Category } from './types';
import LoginRegister from './components/LoginRegister';
import ReportCard from './components/ReportCard';
import ReportDetail from './components/ReportDetail';
import ReportForm from './components/ReportForm';
import ProfileView from './components/ProfileView';
import LandingPage from './components/LandingPage';
import ThemeToggle from './components/ThemeToggle';
import { Search, Plus, SlidersHorizontal, Compass, UserRound, CheckCircle2, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, handleFirestoreError, OperationType } from './lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import logoBlack from './assets/logo-black.png';

const CATEGORIES: ('Semua' | Category)[] = ['Semua', 'Elektronik', 'Kunci', 'Dompet', 'Hewan', 'Dokumen', 'Lainnya'];

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('ketemuin_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem('ketemuin_theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('ketemuin_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('ketemuin_theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  const [viewState, setViewState] = useState<'landing' | 'login'>('landing');

  const [currentTab, setCurrentTab] = useState<'home' | 'profile' | 'approval'>('home');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [selectedTipe, setSelectedTipe] = useState<string>('Semua');
  const [authInitialized, setAuthInitialized] = useState(false);

  const visibleHomeReports = reports.filter(r => r.status_disetujui !== false || r.id_user === currentUser?.id_user);
  const pendingReports = reports.filter(r => r.status_disetujui === false);

  // Modals state
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Sync with Firebase auth state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        const saved = localStorage.getItem('ketemuin_user');
        if (saved) {
          setCurrentUser(JSON.parse(saved));
        }
      } else {
        setCurrentUser(null);
        localStorage.removeItem('ketemuin_user');
      }
      setAuthInitialized(true);
    });
    return () => unsubscribe();
  }, []);

  // Fetch reports
  const fetchReports = async () => {
    setLoading(true);
    try {
      const reportsRef = collection(db, 'reports');
      let q = query(reportsRef);

      if (selectedCategory !== 'Semua') {
        q = query(q, where('kategori', '==', selectedCategory));
      }
      if (selectedTipe !== 'Semua') {
        q = query(q, where('tipe_laporan', '==', selectedTipe));
      }

      const querySnapshot = await getDocs(q);
      let fetchedReports: Report[] = [];
      querySnapshot.forEach((docSnap) => {
        fetchedReports.push({ id_report: docSnap.id, ...docSnap.data() } as Report);
      });

      if (searchQuery) {
        const sq = searchQuery.toLowerCase();
        fetchedReports = fetchedReports.filter(r =>
          (r.judul || '').toLowerCase().includes(sq) ||
          (r.deskripsi || '').toLowerCase().includes(sq) ||
          (r.lokasi || '').toLowerCase().includes(sq)
        );
      }

      fetchedReports.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setReports(fetchedReports);
    } catch (err) {
      console.error('Error fetching reports:', err);
      handleFirestoreError(err, OperationType.GET, 'reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authInitialized) {
      fetchReports();
    }
  }, [authInitialized, currentUser, searchQuery, selectedCategory, selectedTipe]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('ketemuin_user', JSON.stringify(user));
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Error signing out:', err);
    }
    setCurrentUser(null);
    localStorage.removeItem('ketemuin_user');
    setCurrentTab('home');
  };

  const handleReportCreated = () => {
    setShowAddModal(false);
    fetchReports();
  };

  const handleReportResolved = (id: string) => {
    setReports(prev =>
      prev.map(r => r.id_report === id ? { ...r, status_selesai: true } : r)
    );
    if (selectedReport && selectedReport.id_report === id) {
      setSelectedReport(prev => prev ? { ...prev, status_selesai: true } : null);
    }
    fetchReports();
  };

  const handleReportDeleted = (id: string) => {
    setReports(prev => prev.filter(r => r.id_report !== id));
    setSelectedReport(null);
    fetchReports();
  };

  const handleReportApproved = (id: string) => {
    setReports(prev =>
      prev.map(r => r.id_report === id ? { ...r, status_disetujui: true } : r)
    );
    if (selectedReport && selectedReport.id_report === id) {
      setSelectedReport(prev => prev ? { ...prev, status_disetujui: true } : null);
    }
    fetchReports();
  };

  if (!authInitialized) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
        <div className="flex flex-col items-center gap-2.5">
          <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground text-xs font-medium">Menghubungkan layanan...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    if (viewState === 'landing') {
      return (
        <>
          <LandingPage
            reports={reports.filter(r => r.status_disetujui !== false)}
            loading={loading}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            selectedTipe={selectedTipe}
            setSelectedTipe={setSelectedTipe}
            onNavigateToLogin={() => setViewState('login')}
            onReportClick={(report) => setSelectedReport(report)}
            isDark={isDark}
            onToggleTheme={toggleTheme}
          />
          <AnimatePresence>
            {selectedReport && (
              <ReportDetail
                report={selectedReport}
                currentUser={currentUser}
                onClose={() => setSelectedReport(null)}
                onResolve={handleReportResolved}
                onDelete={handleReportDeleted}
              />
            )}
          </AnimatePresence>
        </>
      );
    }

    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 relative">
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <button
            onClick={() => setViewState('landing')}
            className="px-3.5 py-1.5 bg-card hover:bg-muted text-foreground border border-border text-xs font-medium rounded-[var(--radius)] flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali ke Beranda
          </button>
        </div>
        <div className="absolute top-4 right-4">
          <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
        </div>
        <LoginRegister onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">

      {/* Top Navbar Header */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-xs border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img className="w-9 h-9 object-contain dark:invert" src={logoBlack} alt="KetemuIn Logo" referrerPolicy="no-referrer" />
            <div>
              <h1 className="font-serif text-xl font-semibold tracking-tight text-foreground leading-none">
                KetemuIn
              </h1>
              <span className="text-[11px] text-muted-foreground font-medium">Lost & Found RW 04</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle isDark={isDark} onToggle={toggleTheme} />

            {/* Navigation Tabs */}
            <div className="flex bg-muted p-1 rounded-[var(--radius)] border border-border">
              <button
                id="nav-btn-home"
                onClick={() => setCurrentTab('home')}
                className={`px-3 py-1 rounded-[var(--radius)] text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                  currentTab === 'home'
                    ? 'bg-card text-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Beranda</span>
              </button>

              {currentUser?.is_admin && (
                <button
                  id="nav-btn-approval"
                  onClick={() => setCurrentTab('approval')}
                  className={`px-3 py-1 rounded-[var(--radius)] text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                    currentTab === 'approval'
                      ? 'bg-card text-foreground font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Persetujuan</span>
                  {pendingReports.length > 0 && (
                    <span className="bg-[var(--chart-1)] text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                      {pendingReports.length}
                    </span>
                  )}
                </button>
              )}

              <button
                id="nav-btn-profile"
                onClick={() => setCurrentTab('profile')}
                className={`px-3 py-1 rounded-[var(--radius)] text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                  currentTab === 'profile'
                    ? 'bg-card text-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <UserRound className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Profil</span>
              </button>
            </div>

            <button
              id="btn-header-add"
              onClick={() => setShowAddModal(true)}
              className="hidden md:flex px-3.5 py-1.5 rounded-[var(--radius)] bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Lapor Barang
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 pb-24">
        {currentTab === 'approval' && currentUser?.is_admin ? (
          <div className="space-y-5">
            <div className="bg-card border border-border rounded-[var(--radius)] p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-serif text-lg font-semibold text-foreground flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
                  Persetujuan Laporan Petugas
                </h3>
                <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
                  Tinjau laporan barang yang diajukan warga sebelum dipublikasikan pada papan pengumuman publik.
                </p>
              </div>
              <div className="bg-secondary text-secondary-foreground text-xs px-3 py-1 rounded-full border border-border font-medium shrink-0">
                {pendingReports.length} Laporan Menunggu
              </div>
            </div>

            {pendingReports.length === 0 ? (
              <div className="bg-card rounded-[var(--radius)] p-12 text-center border border-border max-w-md mx-auto">
                <CheckCircle2 className="w-8 h-8 text-foreground mx-auto mb-2" />
                <h4 className="font-sans text-sm font-semibold text-foreground">Tidak Ada Antrean</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Semua laporan dari warga telah disetujui atau sudah diproses.
                </p>
              </div>
            ) : (
              <motion.div
                layout
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {pendingReports.map((report) => (
                  <ReportCard
                    key={report.id_report}
                    report={report}
                    onClick={() => setSelectedReport(report)}
                  />
                ))}
              </motion.div>
            )}
          </div>
        ) : currentTab === 'home' ? (
          <div className="space-y-5">

            {/* Header Greeting */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-2xl font-semibold text-foreground tracking-tight">
                  Halo, {currentUser.nama_lengkap}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Daftar laporan barang hilang dan penemuan aktif di lingkungan RW 04.
                </p>
              </div>
              
              <button
                onClick={() => setShowAddModal(true)}
                className="sm:hidden w-full py-2.5 px-4 rounded-[var(--radius)] bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Buat Laporan Baru
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-card rounded-[var(--radius)] p-4 border border-border space-y-3 shadow-xs">
              <div className="flex flex-col md:flex-row gap-2.5">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    id="search-input"
                    type="text"
                    placeholder="Cari berdasarkan nama barang, lokasi, atau kata kunci..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-background border border-border rounded-[var(--radius)] focus:outline-none focus:ring-2 focus:ring-ring transition-colors text-foreground"
                  />
                </div>

                {/* Status Toggle */}
                <div className="flex gap-1 bg-muted p-1 rounded-[var(--radius)] border border-border shrink-0">
                  {['Semua', 'HILANG', 'DITEMUKAN'].map((tipe) => (
                    <button
                      key={tipe}
                      id={`status-filter-${tipe}`}
                      onClick={() => setSelectedTipe(tipe)}
                      className={`px-3 py-1 text-xs font-semibold rounded-[var(--radius)] transition-colors cursor-pointer ${
                        selectedTipe === tipe
                          ? tipe === 'HILANG'
                            ? 'bg-[var(--chart-1)] text-white shadow-xs'
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
                    id={`category-filter-${cat}`}
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

            {/* Reports Grid Content */}
            {loading && visibleHomeReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin"></div>
                <p className="text-muted-foreground text-xs">Memuat daftar laporan...</p>
              </div>
            ) : visibleHomeReports.length === 0 ? (
              <div className="bg-card rounded-[var(--radius)] p-12 text-center border border-border max-w-md mx-auto">
                <SlidersHorizontal className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <h4 className="font-sans text-sm font-semibold text-foreground">Tidak Ada Laporan</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Tidak ditemukan laporan yang sesuai dengan kriteria pencarian Anda.
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
                {visibleHomeReports.map((report) => (
                  <ReportCard
                    key={report.id_report}
                    report={report}
                    onClick={() => setSelectedReport(report)}
                  />
                ))}
              </motion.div>
            )}
          </div>
        ) : (
          /* Profile view */
          <ProfileView
            currentUser={currentUser}
            reports={reports}
            onLogout={handleLogout}
            onReportClick={setSelectedReport}
            onResolve={handleReportResolved}
            onDelete={handleReportDeleted}
          />
        )}
      </main>

      {/* Floating Action Button (FAB) for Mobile */}
      {currentTab === 'home' && (
        <button
          id="btn-fab-add"
          onClick={() => setShowAddModal(true)}
          className="md:hidden fixed bottom-6 right-6 z-40 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity cursor-pointer"
          title="Buat Laporan Baru"
        >
          <Plus className="w-5 h-5" />
        </button>
      )}

      {/* Footer */}
      <footer className="bg-card border-t border-border py-5 text-center text-xs text-muted-foreground">
        <p>© 2026 KetemuIn RW 04</p>
      </footer>

      {/* Overlays / Modals */}
      <AnimatePresence>
        {selectedReport && (
          <ReportDetail
            report={selectedReport}
            currentUser={currentUser}
            onClose={() => setSelectedReport(null)}
            onResolve={handleReportResolved}
            onDelete={handleReportDeleted}
            onApprove={handleReportApproved}
          />
        )}

        {showAddModal && (
          <ReportForm
            currentUser={currentUser}
            onClose={() => setShowAddModal(false)}
            onSuccess={handleReportCreated}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
