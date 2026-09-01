import { useState, useEffect } from 'react';
import { User, Report, Category } from './types';
import LoginRegister from './components/LoginRegister';
import ReportCard from './components/ReportCard';
import ReportDetail from './components/ReportDetail';
import ReportForm from './components/ReportForm';
import ProfileView from './components/ProfileView';
import LandingPage from './components/LandingPage';
import { Search, Plus, SlidersHorizontal, Info, Compass, UserRound, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, handleFirestoreError, OperationType } from './lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import logo from './assets/logo-black.png'

const CATEGORIES: ('Semua' | Category)[] = ['Semua', 'Elektronik', 'Kunci', 'Dompet', 'Hewan', 'Dokumen', 'Lainnya'];

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('ketemuin_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [viewState, setViewState] = useState<'landing' | 'login'>('landing');

  const [currentTab, setCurrentTab] = useState<'home' | 'profile' | 'approval'>('home');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [selectedTipe, setSelectedTipe] = useState<string>('Semua'); // 'Semua' | 'HILANG' | 'DITEMUKAN'
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

  // Fetch reports on filter change
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

      // Filter by search query client-side
      if (searchQuery) {
        const sq = searchQuery.toLowerCase();
        fetchedReports = fetchedReports.filter(r =>
          (r.judul || '').toLowerCase().includes(sq) ||
          (r.deskripsi || '').toLowerCase().includes(sq) ||
          (r.lokasi || '').toLowerCase().includes(sq)
        );
      }

      // Sort by newest created_at first
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

  const handleReportCreated = (newReport: Report) => {
    setShowAddModal(false);
    fetchReports();
  };

  const handleReportResolved = (id: string) => {
    // Update local reports state
    setReports(prev =>
      prev.map(r => r.id_report === id ? { ...r, status_selesai: true } : r)
    );
    if (selectedReport && selectedReport.id_report === id) {
      setSelectedReport(prev => prev ? { ...prev, status_selesai: true } : null);
    }
    // Re-sync with backend to get latest stats
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
      <div className="min-h-screen bg-accent flex flex-col justify-center items-center p-4">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-foreground" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-muted-foreground text-xs font-semibold">Menghubungkan ke server...</p>
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
      <div className="min-h-screen bg-accent flex flex-col justify-center items-center p-4 relative">
        <button
          onClick={() => setViewState('landing')}
          className="absolute top-4 left-4 px-4 py-2 bg-card hover:bg-muted text-foreground border border-border text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          ← Kembali ke Beranda
        </button>
        <LoginRegister onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-accent text-foreground flex flex-col font-sans">

      {/* Top Navbar Header */}
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <img className="w-15" src={logo} alt="" />
            <div>
              <h1 className="text-lg font-black tracking-tight text-foreground">
                KetemuIn
              </h1>
              <p className="text-[10px] text-muted-foreground font-semibold tracking-wide">Lost & Found RW 04</p>
            </div>
          </div>

          {/* Navigation Control */}
          <div className="flex bg-muted p-1 rounded-xl">
            <button
              id="nav-btn-home"
              onClick={() => setCurrentTab('home')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                currentTab === 'home'
                  ? 'bg-card text-foreground shadow-sm border border-border/50'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Beranda
            </button>
            {currentUser?.is_admin && (
              <button
                id="nav-btn-approval"
                onClick={() => setCurrentTab('approval')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 relative ${
                  currentTab === 'approval'
                    ? 'bg-card text-foreground shadow-sm border border-border/50'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Persetujuan
                {pendingReports.length > 0 && (
                  <span className="bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black animate-pulse">
                    {pendingReports.length}
                  </span>
                )}
              </button>
            )}
            <button
              id="nav-btn-profile"
              onClick={() => setCurrentTab('profile')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                currentTab === 'profile'
                  ? 'bg-card text-foreground shadow-sm border border-border/50'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <UserRound className="w-3.5 h-3.5" />
              Profilku
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 pb-24">
        {currentTab === 'approval' && currentUser?.is_admin ? (
          <div className="space-y-6">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-amber-800 tracking-tight flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-amber-600" />
                  Persetujuan Laporan Petugas RW 04
                </h3>
                <p className="text-xs text-amber-700 leading-relaxed max-w-xl">
                  Berikut adalah daftar laporan penemuan atau kehilangan barang yang diajukan oleh warga. Tinjau kelayakan isi laporan sebelum disetujui untuk dipublikasikan ke papan beranda publik KetemuIn.
                </p>
              </div>
              <div className="bg-amber-100 text-amber-800 text-xs px-4 py-2 rounded-2xl font-black shrink-0 shadow-sm">
                {pendingReports.length} Laporan Tertunda
              </div>
            </div>

            {pendingReports.length === 0 ? (
              <div className="bg-card rounded-3xl p-16 text-center border border-border shadow-sm max-w-lg mx-auto">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-600 border border-emerald-100">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-foreground">Semua Laporan Bersih!</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                  Kerja bagus! Tidak ada laporan baru yang menunggu persetujuan petugas saat ini.
                </p>
              </div>
            ) : (
              <motion.div
                layout
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
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
          <div className="space-y-6">

            {/* Header Greeting & Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-foreground tracking-tight">
                  Halo, <span className="text-foreground">{currentUser.nama_lengkap}</span>! 👋
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Ada barang hilang atau ditemukan di sekitar lingkungan kita? Laporkan segera!
                </p>
              </div>

              {/* Informative notification widget */}
              <div className="bg-accent border border-border/60 rounded-2xl p-4 flex items-center gap-3 max-w-md shadow-sm">
                <Sparkles className="w-5 h-5 text-muted-foreground shrink-0 animate-pulse" />
                <p className="text-[11px] text-muted-foreground leading-normal font-medium">
                  <strong>Tips Jujur:</strong> Cantumkan deskripsi barang se-rinci mungkin, namun hindari memposting nomor pin atau detail isi dompet yang terlalu rahasia.
                </p>
              </div>
            </div>

            {/* Filter, Search & Sorting Controls */}
            <div className="bg-card rounded-3xl p-4 border border-border shadow-sm space-y-4">

              {/* Row 1: Search and Type Filter */}
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    id="search-input"
                    type="text"
                    placeholder="Cari kata kunci laporan (misal: dompet, honda, kucing...)"
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
                      id={`status-filter-${tipe}`}
                      onClick={() => setSelectedTipe(tipe)}
                      className={`flex-1 md:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
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
                      id={`category-filter-${cat}`}
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

            {/* Reports Grid Content */}
            {loading && visibleHomeReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <svg className="animate-spin h-8 w-8 text-foreground" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-muted-foreground text-xs">Memuat daftar laporan...</p>
              </div>
            ) : visibleHomeReports.length === 0 ? (
              <div className="bg-card rounded-3xl p-16 text-center border border-border shadow-sm max-w-lg mx-auto">
                <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                  <SlidersHorizontal className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-foreground">Laporan Tidak Ditemukan</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                  Belum ada laporan yang cocok dengan kata kunci atau filter yang Anda pilih saat ini.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('Semua');
                    setSelectedTipe('Semua');
                  }}
                  className="mt-4 text-xs text-foreground hover:text-muted-foreground font-bold underline transition-colors"
                >
                  Reset Semua Filter
                </button>
              </div>
            ) : (
              <motion.div
                layout
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
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

      {/* Floating Action Button (FAB) */}
      {currentTab === 'home' && (
        <button
          id="btn-fab-add"
          onClick={() => setShowAddModal(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-primary hover:bg-secondary text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all group"
          title="Buat Laporan Baru"
        >
          <Plus className="w-6 h-6 transition-transform group-hover:rotate-90" />
        </button>
      )}

      {/* Footer copyright */}
      <footer className="bg-card border-t border-border py-6 text-center text-xs text-muted-foreground">
        <p>© 2026 KetemuIn RW 04. Dibuat dengan kejujuran & kepedulian sosial.</p>
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

