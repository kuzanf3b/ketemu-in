import { useState, useEffect, useCallback } from "react";
import { User, Report, Category, CategoryItem, DEFAULT_CATEGORIES } from "./types";
import LoginRegister from "./components/LoginRegister";
import ReportCard from "./components/ReportCard";
import ReportDetail from "./components/ReportDetail";
import ReportForm from "./components/ReportForm";
import ProfileView from "./components/ProfileView";
import CategoryManagement from "./components/CategoryManagement";
import OfficerHistoryView from "./components/OfficerHistoryView";
import LandingPage from "./components/LandingPage";
import ThemeToggle from "./components/ThemeToggle";
import {
  Search,
  Plus,
  SlidersHorizontal,
  Compass,
  UserRound,
  CheckCircle2,
  ArrowLeft,
  X,
  Tag,
  History,
  Archive,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db, auth, handleFirestoreError, OperationType } from "./lib/firebase";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { signOut } from "firebase/auth";
import {
  purgeExpiredResolvedReports,
  getAutoDeleteStatus,
} from "./lib/cleanupUtils";
import logoBlack from "./assets/logo-black.png";
import logoWhite from "./assets/logo-white.png";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("ketemuin_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem("ketemuin_theme");
    if (savedTheme) {
      return savedTheme === "dark";
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("ketemuin_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("ketemuin_theme", "light");
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  const [viewState, setViewState] = useState<"landing" | "login">("landing");

  const [currentTab, setCurrentTab] = useState<
    "home" | "profile" | "approval" | "categories" | "history"
  >("home");
  const [reports, setReports] = useState<Report[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [categoryNames, setCategoryNames] = useState<string[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");
  const [selectedTipe, setSelectedTipe] = useState<string>("Semua");
  const [authInitialized, setAuthInitialized] = useState(false);

  // Fetch dynamic categories from Firestore
  const fetchCategories = useCallback(async () => {
    try {
      const catRef = collection(db, "categories");
      const catSnap = await getDocs(catRef);
      if (!catSnap.empty) {
        const loaded: CategoryItem[] = [];
        catSnap.forEach((d) => {
          const data = d.data();
          loaded.push({
            id_kategori: d.id,
            nama: data.nama || d.id,
            created_at: data.created_at,
            updated_at: data.updated_at,
          });
        });
        loaded.sort((a, b) => a.nama.localeCompare(b.nama));
        setCategories(loaded);
        setCategoryNames(loaded.map((c) => c.nama));
      } else {
        const defaults = DEFAULT_CATEGORIES.map((name) => ({
          id_kategori: name.toLowerCase(),
          nama: name,
        }));
        setCategories(defaults);
        setCategoryNames(DEFAULT_CATEGORIES);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
      setCategoryNames(DEFAULT_CATEGORIES);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Reset selected category if deleted
  useEffect(() => {
    if (selectedCategory !== "Semua" && !categoryNames.includes(selectedCategory)) {
      setSelectedCategory("Semua");
    }
  }, [categoryNames, selectedCategory]);

  const categoryChips = ["Semua", ...categoryNames];

  const visibleHomeReports = reports.filter(
    (r) => r.status_disetujui !== false || r.id_user === currentUser?.id_user,
  );
  const pendingReports = reports.filter((r) => r.status_disetujui === false);

  // Modals state
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const hasActiveFilters =
    searchQuery !== "" ||
    selectedCategory !== "Semua" ||
    selectedTipe !== "Semua";

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("Semua");
    setSelectedTipe("Semua");
  };

  // Sync with Firebase auth state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const saved = localStorage.getItem("ketemuin_user");
        let userLoaded = false;
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.id_user === firebaseUser.uid) {
              setCurrentUser(parsed);
              userLoaded = true;
            }
          } catch (e) {
            console.error("Error parsing stored user:", e);
          }
        }

        if (!userLoaded) {
          try {
            const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));
            if (userSnap.exists()) {
              const userData = userSnap.data() as User;
              setCurrentUser(userData);
              localStorage.setItem("ketemuin_user", JSON.stringify(userData));
            }
          } catch (err) {
            console.error("Error fetching user data on auth change:", err);
          }
        }
      } else {
        setCurrentUser(null);
        localStorage.removeItem("ketemuin_user");
      }
      setAuthInitialized(true);
    });
    return () => unsubscribe();
  }, []);

  // Fetch reports
  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const reportsRef = collection(db, "reports");
      let q = query(reportsRef);

      if (selectedCategory !== "Semua") {
        q = query(q, where("kategori", "==", selectedCategory));
      }
      if (selectedTipe !== "Semua") {
        q = query(q, where("tipe_laporan", "==", selectedTipe));
      }

      const querySnapshot = await getDocs(q);
      let fetchedReports: Report[] = [];
      querySnapshot.forEach((docSnap) => {
        fetchedReports.push({
          id_report: docSnap.id,
          ...docSnap.data(),
        } as Report);
      });

      // Auto-cleanup: Trigger Firestore deletion of any expired resolved reports (> 24 hours) for logged in sessions
      if (currentUser) {
        purgeExpiredResolvedReports(fetchedReports).catch((err) => {
          console.warn("Background auto-purge notice:", err);
        });
      }

      // Filter out expired items immediately so UI is always fresh
      fetchedReports = fetchedReports.filter(
        (r) => !getAutoDeleteStatus(r).isExpired,
      );

      if (searchQuery) {
        const sq = searchQuery.toLowerCase();
        fetchedReports = fetchedReports.filter(
          (r) =>
            (r.judul || "").toLowerCase().includes(sq) ||
            (r.deskripsi || "").toLowerCase().includes(sq) ||
            (r.lokasi || "").toLowerCase().includes(sq),
        );
      }

      fetchedReports.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      setReports(fetchedReports);
    } catch (err) {
      console.error("Error fetching reports:", err);
      handleFirestoreError(err, OperationType.GET, "reports");
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedTipe, searchQuery]);

  useEffect(() => {
    if (authInitialized) {
      fetchReports();
    }
  }, [authInitialized, currentUser, fetchReports]);

  // Periodic interval to purge resolved reports that pass the 24-hour mark while app is open
  useEffect(() => {
    const interval = setInterval(() => {
      setReports((prevReports) => {
        const hasExpired = prevReports.some(
          (r) => r.status_selesai && getAutoDeleteStatus(r).isExpired,
        );
        if (hasExpired) {
          if (currentUser) {
            purgeExpiredResolvedReports(prevReports).catch(console.warn);
          }
          return prevReports.filter((r) => !getAutoDeleteStatus(r).isExpired);
        }
        return prevReports;
      });
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [currentUser]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem("ketemuin_user", JSON.stringify(user));
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Error signing out:", err);
    }
    setCurrentUser(null);
    localStorage.removeItem("ketemuin_user");
    setCurrentTab("home");
  };

  const handleReportCreated = () => {
    setShowAddModal(false);
    fetchReports();
  };

  const handleReportResolved = (id: string, selesaiAt?: string) => {
    const resolvedTime = selesaiAt || new Date().toISOString();
    setReports((prev) =>
      prev.map((r) =>
        r.id_report === id
          ? { ...r, status_selesai: true, selesai_at: resolvedTime }
          : r,
      ),
    );
    if (selectedReport && selectedReport.id_report === id) {
      setSelectedReport((prev) =>
        prev
          ? { ...prev, status_selesai: true, selesai_at: resolvedTime }
          : null,
      );
    }
    fetchReports();
  };

  const handleReportDeleted = (id: string) => {
    setReports((prev) => prev.filter((r) => r.id_report !== id));
    setSelectedReport(null);
    fetchReports();
  };

  const handleReportApproved = (id: string) => {
    setReports((prev) =>
      prev.map((r) =>
        r.id_report === id ? { ...r, status_disetujui: true } : r,
      ),
    );
    if (selectedReport && selectedReport.id_report === id) {
      setSelectedReport((prev) =>
        prev ? { ...prev, status_disetujui: true } : null,
      );
    }
    fetchReports();
  };

  if (!authInitialized) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
        <div className="flex flex-col items-center gap-2.5">
          <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground text-xs font-medium">
            Menghubungkan layanan...
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    if (viewState === "landing") {
      return (
        <>
          <LandingPage
            reports={reports.filter((r) => r.status_disetujui !== false)}
            loading={loading}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            selectedTipe={selectedTipe}
            setSelectedTipe={setSelectedTipe}
            onNavigateToLogin={() => setViewState("login")}
            onReportClick={(report) => setSelectedReport(report)}
            isDark={isDark}
            onToggleTheme={toggleTheme}
            availableCategories={categoryNames}
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
      <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 relative antialiased">
        <div className="w-full max-w-md flex justify-between items-center mb-4">
          <button
            onClick={() => setViewState("landing")}
            className="min-h-[38px] px-3 py-1.5 bg-card hover:bg-muted text-foreground border border-border text-xs font-medium rounded-[var(--radius)] flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Beranda
          </button>
          <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
        </div>
        <LoginRegister onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans antialiased">
      {/* Top Navbar Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex justify-between items-center">
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
              <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium block">
                Lost & Found RW 04
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle isDark={isDark} onToggle={toggleTheme} />

            {/* Desktop / Tablet Navigation Tabs */}
            <div className="hidden sm:flex bg-muted p-1 rounded-[var(--radius)] border border-border">
              <button
                id="nav-btn-home"
                onClick={() => setCurrentTab("home")}
                className={`min-h-[34px] px-3 py-1 rounded-[var(--radius)] text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${currentTab === "home"
                    ? "bg-card text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Beranda</span>
              </button>

              {currentUser?.is_admin && (
                <button
                  id="nav-btn-approval"
                  onClick={() => setCurrentTab("approval")}
                  className={`min-h-[34px] px-3 py-1 rounded-[var(--radius)] text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${currentTab === "approval"
                      ? "bg-card text-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Persetujuan</span>
                  {pendingReports.length > 0 && (
                    <span className="bg-[var(--chart-1)] text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                      {pendingReports.length}
                    </span>
                  )}
                </button>
              )}

              {currentUser?.is_admin && (
                <button
                  id="nav-btn-categories"
                  onClick={() => setCurrentTab("categories")}
                  className={`min-h-[34px] px-3 py-1 rounded-[var(--radius)] text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${currentTab === "categories"
                      ? "bg-card text-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Kategori</span>
                </button>
              )}

              {currentUser?.is_admin && (
                <button
                  id="nav-btn-history"
                  onClick={() => setCurrentTab("history")}
                  className={`min-h-[34px] px-3 py-1 rounded-[var(--radius)] text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${currentTab === "history"
                      ? "bg-card text-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Riwayat</span>
                </button>
              )}

              <button
                id="nav-btn-profile"
                onClick={() => setCurrentTab("profile")}
                className={`min-h-[34px] px-3 py-1 rounded-[var(--radius)] text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${currentTab === "profile"
                    ? "bg-card text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <UserRound className="w-3.5 h-3.5" />
                <span>Profil</span>
              </button>
            </div>

            <button
              id="btn-header-add"
              onClick={() => setShowAddModal(true)}
              className="hidden sm:flex min-h-[36px] px-3.5 py-1.5 rounded-[var(--radius)] bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Lapor Barang
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-28 sm:pb-20">
        {currentTab === "history" && currentUser?.is_admin ? (
          <OfficerHistoryView
            currentUser={currentUser}
            activeReports={reports}
            onRefreshActiveReports={fetchReports}
          />
        ) : currentTab === "categories" && currentUser?.is_admin ? (
          <CategoryManagement
            currentUser={currentUser}
            categories={categories}
            reports={reports}
            onCategoriesChanged={fetchCategories}
            onRefreshReports={fetchReports}
          />
        ) : currentTab === "approval" && currentUser?.is_admin ? (
          <div className="space-y-4 sm:space-y-5">
            <div className="bg-card border border-border rounded-[var(--radius)] p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
              <div className="space-y-1">
                <h3 className="font-serif text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-muted-foreground shrink-0" />
                  Persetujuan Laporan Petugas
                </h3>
                <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
                  Tinjau laporan barang yang diajukan warga sebelum
                  dipublikasikan pada papan pengumuman publik.
                </p>
              </div>
              <div className="bg-secondary text-secondary-foreground text-xs px-3 py-1 rounded-full border border-border font-medium shrink-0">
                {pendingReports.length} Laporan Menunggu
              </div>
            </div>

            {pendingReports.length === 0 ? (
              <div className="bg-card rounded-[var(--radius)] p-8 sm:p-12 text-center border border-border max-w-md mx-auto">
                <CheckCircle2 className="w-8 h-8 text-foreground mx-auto mb-2" />
                <h4 className="font-sans text-sm font-semibold text-foreground">
                  Tidak Ada Antrean
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Semua laporan dari warga telah disetujui atau sudah diproses.
                </p>
              </div>
            ) : (
              <motion.div
                layout
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4"
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
        ) : currentTab === "home" ? (
          <div className="space-y-4 sm:space-y-5">
            {/* Header Greeting */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <h2 className="font-serif text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
                  Halo, {currentUser.nama_lengkap}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Daftar laporan barang hilang dan penemuan aktif di lingkungan
                  RW 04.
                </p>
              </div>

              <button
                onClick={() => setShowAddModal(true)}
                className="sm:hidden w-full min-h-[42px] py-2.5 px-4 rounded-[var(--radius)] bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Buat Laporan Baru
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-card rounded-[var(--radius)] p-3.5 sm:p-4 border border-border space-y-3 shadow-xs">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    id="search-input"
                    type="text"
                    placeholder="Cari nama barang, lokasi, atau kata kunci..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-background border border-border rounded-[var(--radius)] focus:outline-none focus:ring-2 focus:ring-ring transition-colors text-foreground min-h-[42px]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Status Toggle */}
                <div className="grid grid-cols-3 sm:flex gap-1 bg-muted p-1 rounded-[var(--radius)] border border-border shrink-0">
                  {["Semua", "HILANG", "DITEMUKAN"].map((tipe) => (
                    <button
                      key={tipe}
                      id={`status-filter-${tipe}`}
                      onClick={() => setSelectedTipe(tipe)}
                      className={`min-h-[34px] px-2 sm:px-3 py-1 text-center text-xs font-semibold rounded-[var(--radius)] transition-colors cursor-pointer whitespace-nowrap ${selectedTipe === tipe
                          ? tipe === "HILANG"
                            ? "bg-[var(--chart-1)] text-white shadow-xs"
                            : "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      {tipe === "HILANG"
                        ? "Hilang"
                        : tipe === "DITEMUKAN"
                          ? "Temuan"
                          : "Semua"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar scroll-smooth">
                <span className="text-xs font-medium text-muted-foreground shrink-0 mr-1 hidden sm:inline">
                  Kategori:
                </span>
                {categoryChips.map((cat) => (
                  <button
                    key={cat}
                    id={`category-filter-${cat}`}
                    onClick={() => setSelectedCategory(cat)}
                    className={`min-h-[32px] px-3 py-1 rounded-[var(--radius)] text-xs font-medium shrink-0 transition-colors cursor-pointer border whitespace-nowrap ${selectedCategory === cat
                        ? "border-primary bg-primary text-primary-foreground font-semibold"
                        : "border-border bg-background sm:bg-card text-muted-foreground hover:text-foreground hover:bg-muted"
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

                {currentUser?.is_admin && (
                  <button
                    id="btn-shortcut-kelola-kategori"
                    onClick={() => setCurrentTab("categories")}
                    className="min-h-[32px] px-2.5 py-1 rounded-[var(--radius)] text-xs font-medium shrink-0 bg-secondary text-secondary-foreground hover:bg-muted border border-border transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ml-auto"
                    title="Kelola Kategori Barang (Khusus Petugas)"
                  >
                    <Tag className="w-3.5 h-3.5 text-primary" />
                    <span>Kelola Kategori</span>
                  </button>
                )}
              </div>
            </div>

            {/* Reports Grid Content */}
            {loading && visibleHomeReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin"></div>
                <p className="text-muted-foreground text-xs">
                  Memuat daftar laporan...
                </p>
              </div>
            ) : visibleHomeReports.length === 0 ? (
              <div className="bg-card rounded-[var(--radius)] p-8 sm:p-12 text-center border border-border max-w-md mx-auto">
                <SlidersHorizontal className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <h4 className="font-sans text-sm font-semibold text-foreground">
                  Tidak Ada Laporan
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Tidak ditemukan laporan yang sesuai dengan kriteria pencarian
                  Anda.
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

      {/* Floating Action Button (FAB) for Mobile when on home tab */}
      {currentTab === "home" && (
        <button
          id="btn-fab-add"
          onClick={() => setShowAddModal(true)}
          className="sm:hidden fixed bottom-20 right-5 z-40 w-13 h-13 min-h-[52px] min-w-[52px] bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-xl hover:opacity-90 transition-transform active:scale-95 cursor-pointer"
          title="Buat Laporan Baru"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Mobile Bottom Navigation Bar (< 640px viewport) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border px-3 py-2 flex justify-around items-center">
        <button
          id="mobile-nav-btn-home"
          onClick={() => setCurrentTab("home")}
          className={`flex flex-col items-center justify-center min-w-[54px] min-h-[44px] py-1 px-2 rounded-[var(--radius)] transition-colors cursor-pointer ${currentTab === "home"
              ? "text-foreground font-semibold"
              : "text-muted-foreground"
            }`}
        >
          <Compass className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Beranda</span>
        </button>

        {currentUser?.is_admin && (
          <button
            id="mobile-nav-btn-approval"
            onClick={() => setCurrentTab("approval")}
            className={`flex flex-col items-center justify-center min-w-[54px] min-h-[44px] py-1 px-2 rounded-[var(--radius)] transition-colors cursor-pointer relative ${currentTab === "approval"
                ? "text-foreground font-semibold"
                : "text-muted-foreground"
              }`}
          >
            <div className="relative">
              <SlidersHorizontal className="w-5 h-5 mb-0.5" />
              {pendingReports.length > 0 && (
                <span className="absolute -top-1 -right-2 bg-[var(--chart-1)] text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {pendingReports.length}
                </span>
              )}
            </div>
            <span className="text-[10px]">Persetujuan</span>
          </button>
        )}

        {currentUser?.is_admin && (
          <button
            id="mobile-nav-btn-categories"
            onClick={() => setCurrentTab("categories")}
            className={`flex flex-col items-center justify-center min-w-[54px] min-h-[44px] py-1 px-2 rounded-[var(--radius)] transition-colors cursor-pointer ${currentTab === "categories"
                ? "text-foreground font-semibold"
                : "text-muted-foreground"
              }`}
          >
            <Tag className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Kategori</span>
          </button>
        )}

        {currentUser?.is_admin && (
          <button
            id="mobile-nav-btn-history"
            onClick={() => setCurrentTab("history")}
            className={`flex flex-col items-center justify-center min-w-[54px] min-h-[44px] py-1 px-2 rounded-[var(--radius)] transition-colors cursor-pointer ${currentTab === "history"
                ? "text-foreground font-semibold"
                : "text-muted-foreground"
              }`}
          >
            <History className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Riwayat</span>
          </button>
        )}

        <button
          id="mobile-nav-btn-profile"
          onClick={() => setCurrentTab("profile")}
          className={`flex flex-col items-center justify-center min-w-[54px] min-h-[44px] py-1 px-2 rounded-[var(--radius)] transition-colors cursor-pointer ${currentTab === "profile"
              ? "text-foreground font-semibold"
              : "text-muted-foreground"
            }`}
        >
          <UserRound className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Profil</span>
        </button>
      </nav>

      {/* Footer for desktop */}
      <footer className="hidden sm:block bg-card border-t border-border py-4 text-center text-xs text-muted-foreground mt-auto">
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

        {showAddModal && currentUser && (
          <ReportForm
            currentUser={currentUser}
            onClose={() => setShowAddModal(false)}
            onSuccess={handleReportCreated}
            availableCategories={categoryNames}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
