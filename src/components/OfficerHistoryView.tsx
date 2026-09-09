import React, { useState, useEffect, useMemo } from 'react';
import { User, Report, ArchivedReport } from '../types';
import { fetchArchivedReportsFromDb } from '../lib/reportArchive';
import {
  History,
  Archive,
  CheckCircle2,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Calendar,
  MapPin,
  Tag,
  UserRound,
  ShieldCheck,
  AlertTriangle,
  Info,
  X,
  ExternalLink,
  SlidersHorizontal,
  ChevronRight,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface OfficerHistoryViewProps {
  currentUser: User;
  activeReports: Report[];
  onRefreshActiveReports?: () => void;
}

type HistoryTab = 'all' | 'archived' | 'resolved' | 'rejected';

export default function OfficerHistoryView({
  currentUser,
  activeReports,
  onRefreshActiveReports,
}: OfficerHistoryViewProps) {
  const [archivedReports, setArchivedReports] = useState<ArchivedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTab, setCurrentTab] = useState<HistoryTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterDeletedBy, setFilterDeletedBy] = useState<string>('ALL');
  const [selectedItem, setSelectedItem] = useState<{
    type: 'archived' | 'active';
    data: ArchivedReport | Report;
  } | null>(null);

  // Load archived reports from Firestore
  const loadArchive = async () => {
    try {
      setRefreshing(true);
      const data = await fetchArchivedReportsFromDb();
      setArchivedReports(data);
    } catch (err) {
      console.error('Failed to load officer archive:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadArchive();
  }, []);

  const handleManualRefresh = () => {
    loadArchive();
    if (onRefreshActiveReports) {
      onRefreshActiveReports();
    }
  };

  // Derive categories list from both sources
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    activeReports.forEach((r) => r.kategori && set.add(r.kategori));
    archivedReports.forEach((r) => r.kategori && set.add(r.kategori));
    return Array.from(set).sort();
  }, [activeReports, archivedReports]);

  // Unified items list
  interface UnifiedHistoryItem {
    id: string;
    source: 'archived' | 'active';
    reportId: string;
    judul: string;
    deskripsi: string;
    foto_url?: string;
    tipe_laporan: 'HILANG' | 'DITEMUKAN';
    kategori: string;
    lokasi: string;
    tgl_kejadian: string;
    created_at: string;
    status_selesai: boolean;
    selesai_at?: string;
    user_nama?: string;
    user_whatsapp?: string;
    status_disetujui?: boolean;
    // Archive fields
    is_deleted: boolean;
    deleted_at?: string;
    deleted_by_name?: string;
    deleted_by_role?: 'petugas' | 'warga' | 'sistem';
    delete_reason?: string;
    rawArchived?: ArchivedReport;
    rawReport?: Report;
  }

  const unifiedList: UnifiedHistoryItem[] = useMemo(() => {
    const list: UnifiedHistoryItem[] = [];

    // 1. Add all archived (deleted/purged) reports
    archivedReports.forEach((arch) => {
      list.push({
        id: `arch-${arch.id_archive || arch.id_report}`,
        source: 'archived',
        reportId: arch.id_report,
        judul: arch.judul,
        deskripsi: arch.deskripsi,
        foto_url: arch.foto_url,
        tipe_laporan: arch.tipe_laporan,
        kategori: arch.kategori || 'Lainnya',
        lokasi: arch.lokasi,
        tgl_kejadian: arch.tgl_kejadian,
        created_at: arch.created_at,
        status_selesai: arch.status_selesai,
        selesai_at: arch.selesai_at,
        user_nama: arch.user_nama,
        user_whatsapp: arch.user_whatsapp,
        status_disetujui: arch.status_disetujui,
        is_deleted: true,
        deleted_at: arch.deleted_at,
        deleted_by_name: arch.deleted_by_name,
        deleted_by_role: arch.deleted_by_role,
        delete_reason: arch.delete_reason,
        rawArchived: arch,
      });
    });

    // 2. Add resolved and active reports from current active feed
    activeReports.forEach((rep) => {
      // If report is already archived under same ID, avoid duplicate in list
      if (archivedReports.some((a) => a.id_report === rep.id_report)) {
        return;
      }
      list.push({
        id: `act-${rep.id_report}`,
        source: 'active',
        reportId: rep.id_report,
        judul: rep.judul,
        deskripsi: rep.deskripsi,
        foto_url: rep.foto_url,
        tipe_laporan: rep.tipe_laporan,
        kategori: rep.kategori || 'Lainnya',
        lokasi: rep.lokasi,
        tgl_kejadian: rep.tgl_kejadian,
        created_at: rep.created_at,
        status_selesai: rep.status_selesai,
        selesai_at: rep.selesai_at,
        user_nama: rep.user_nama,
        user_whatsapp: rep.user_whatsapp,
        status_disetujui: rep.status_disetujui,
        is_deleted: false,
        rawReport: rep,
      });
    });

    // Sort by latest action time (deleted_at || selesai_at || created_at)
    list.sort((a, b) => {
      const timeA = new Date(a.deleted_at || a.selesai_at || a.created_at || 0).getTime();
      const timeB = new Date(b.deleted_at || b.selesai_at || b.created_at || 0).getTime();
      return timeB - timeA;
    });

    return list;
  }, [archivedReports, activeReports]);

  // Summary counts
  const totalArchived = archivedReports.length;
  const totalResolved = unifiedList.filter((item) => item.status_selesai).length;
  const totalRejected = archivedReports.filter(
    (a) =>
      a.delete_reason?.toLowerCase().includes('ditolak') ||
      a.delete_reason?.toLowerCase().includes('tidak disetujui')
  ).length;
  const totalTracked = unifiedList.length;

  // Filtered list based on current active tab & filters
  const filteredItems = useMemo(() => {
    return unifiedList.filter((item) => {
      // Tab filter
      if (currentTab === 'archived' && !item.is_deleted) return false;
      if (currentTab === 'resolved' && !item.status_selesai) return false;
      if (
        currentTab === 'rejected' &&
        (!item.is_deleted ||
          !(
            item.delete_reason?.toLowerCase().includes('ditolak') ||
            item.delete_reason?.toLowerCase().includes('tidak disetujui')
          ))
      ) {
        return false;
      }

      // Type filter
      if (filterType !== 'ALL' && item.tipe_laporan !== filterType) return false;

      // Category filter
      if (filterCategory !== 'ALL' && item.kategori !== filterCategory) return false;

      // Deleted by filter
      if (filterDeletedBy !== 'ALL') {
        if (!item.is_deleted) return false;
        if (filterDeletedBy === 'WARGA' && item.deleted_by_role !== 'warga') return false;
        if (filterDeletedBy === 'PETUGAS' && item.deleted_by_role !== 'petugas') return false;
        if (filterDeletedBy === 'SISTEM' && item.deleted_by_role !== 'sistem') return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.judul.toLowerCase().includes(q);
        const matchDesc = item.deskripsi?.toLowerCase().includes(q);
        const matchUser = item.user_nama?.toLowerCase().includes(q);
        const matchLoc = item.lokasi?.toLowerCase().includes(q);
        const matchReason = item.delete_reason?.toLowerCase().includes(q);
        const matchId = item.reportId.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchUser && !matchLoc && !matchReason && !matchId) {
          return false;
        }
      }

      return true;
    });
  }, [unifiedList, currentTab, filterType, filterCategory, filterDeletedBy, searchQuery]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const formatShortDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-card border border-border rounded-[var(--radius)] p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4 shadow-2xs">
        <div className="space-y-1">
          <h2 className="font-serif text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
            <History className="w-5 h-5 text-primary shrink-0" />
            Riwayat & Arsip Laporan Petugas
          </h2>
          <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
            Log audit terpadu untuk menelusuri seluruh laporan yang pernah diproses, dituntaskan, maupun
            <strong> laporan yang telah dihapus</strong>. Laporan yang dihapus tetap tersimpan di sini
            sebagai arsip petugas dan tidak dapat dilihat oleh warga umum.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
          <button
            id="btn-refresh-history"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="min-h-[36px] px-3 py-1.5 rounded-[var(--radius)] bg-secondary hover:bg-muted text-secondary-foreground text-xs font-medium border border-border transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Muat Ulang Riwayat & Arsip"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Memuat...' : 'Segarkan'}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-card border border-border rounded-[var(--radius)] p-3.5 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Total Riwayat</span>
            <History className="w-4 h-4 text-primary" />
          </div>
          <div className="text-xl sm:text-2xl font-serif font-bold text-foreground mt-1">
            {totalTracked}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Semua data tercatat</p>
        </div>

        <div className="bg-card border border-border rounded-[var(--radius)] p-3.5 sm:p-4 shadow-2xs border-l-4 border-l-destructive">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-destructive">
              Arsip Dihapus
            </span>
            <Archive className="w-4 h-4 text-destructive" />
          </div>
          <div className="text-xl sm:text-2xl font-serif font-bold text-destructive mt-1">
            {totalArchived}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Khusus dilihat petugas</p>
        </div>

        <div className="bg-card border border-border rounded-[var(--radius)] p-3.5 sm:p-4 shadow-2xs border-l-4 border-l-[var(--chart-1)]">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--chart-1)]">
              Selesai / Tuntas
            </span>
            <CheckCircle2 className="w-4 h-4 text-[var(--chart-1)]" />
          </div>
          <div className="text-xl sm:text-2xl font-serif font-bold text-foreground mt-1">
            {totalResolved}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Barang berhasil kembali</p>
        </div>

        <div className="bg-card border border-border rounded-[var(--radius)] p-3.5 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Ditolak</span>
            <AlertTriangle className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-xl sm:text-2xl font-serif font-bold text-foreground mt-1">
            {totalRejected}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Tidak disetujui petugas</p>
        </div>
      </div>

      {/* Tabs & Filters Bar */}
      <div className="bg-card border border-border rounded-[var(--radius)] p-3.5 sm:p-4 space-y-3.5 shadow-2xs">
        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border text-xs">
          <button
            id="tab-history-all"
            onClick={() => setCurrentTab('all')}
            className={`min-h-[34px] px-3.5 py-1.5 rounded-[var(--radius)] font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              currentTab === 'all'
                ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Semua Riwayat</span>
            <span className="text-[10px] opacity-85 ml-1">({unifiedList.length})</span>
          </button>

          <button
            id="tab-history-archived"
            onClick={() => setCurrentTab('archived')}
            className={`min-h-[34px] px-3.5 py-1.5 rounded-[var(--radius)] font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              currentTab === 'archived'
                ? 'bg-destructive text-white font-semibold shadow-xs'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Arsip Dihapus</span>
            <span className="text-[10px] opacity-85 ml-1">({totalArchived})</span>
          </button>

          <button
            id="tab-history-resolved"
            onClick={() => setCurrentTab('resolved')}
            className={`min-h-[34px] px-3.5 py-1.5 rounded-[var(--radius)] font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              currentTab === 'resolved'
                ? 'bg-[var(--chart-1)] text-white font-semibold shadow-xs'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Selesai / Tuntas</span>
            <span className="text-[10px] opacity-85 ml-1">({totalResolved})</span>
          </button>

          <button
            id="tab-history-rejected"
            onClick={() => setCurrentTab('rejected')}
            className={`min-h-[34px] px-3.5 py-1.5 rounded-[var(--radius)] font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              currentTab === 'rejected'
                ? 'bg-orange-600 text-white font-semibold shadow-xs'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Ditolak</span>
            <span className="text-[10px] opacity-85 ml-1">({totalRejected})</span>
          </button>
        </div>

        {/* Search and Secondary Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
          {/* Search */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="input-search-history"
              type="text"
              placeholder="Cari judul, pelapor, kontak, lokasi, alasan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full min-h-[36px] pl-9 pr-8 py-1.5 text-xs bg-background border border-border rounded-[var(--radius)] text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type Filter */}
          <div className="sm:col-span-2">
            <select
              id="select-filter-type"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full min-h-[36px] px-2.5 py-1.5 text-xs bg-background border border-border rounded-[var(--radius)] text-foreground cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">Semua Tipe</option>
              <option value="HILANG">Barang Hilang</option>
              <option value="DITEMUKAN">Barang Ditemukan</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="sm:col-span-2">
            <select
              id="select-filter-category"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full min-h-[36px] px-2.5 py-1.5 text-xs bg-background border border-border rounded-[var(--radius)] text-foreground cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">Semua Kategori</option>
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Deleted By Filter (Only if all or archived tab) */}
          <div className="sm:col-span-3">
            <select
              id="select-filter-deleted-by"
              value={filterDeletedBy}
              onChange={(e) => setFilterDeletedBy(e.target.value)}
              className="w-full min-h-[36px] px-2.5 py-1.5 text-xs bg-background border border-border rounded-[var(--radius)] text-foreground cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">Semua Sumber Status</option>
              <option value="WARGA">Dihapus oleh Warga</option>
              <option value="PETUGAS">Dihapus oleh Petugas</option>
              <option value="SISTEM">Dihapus Otomatis (24 Jam)</option>
            </select>
          </div>
        </div>

        {/* Notice Info Box */}
        <div className="p-3 bg-muted/60 border border-border rounded-[var(--radius)] flex items-center justify-between text-xs text-muted-foreground gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
            <span>
              Menampilkan <strong>{filteredItems.length}</strong> riwayat data. Rekaman arsip disimpan
              secara aman khusus untuk akses verifikasi Petugas RW.
            </span>
          </div>
          {(searchQuery || filterType !== 'ALL' || filterCategory !== 'ALL' || filterDeletedBy !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterType('ALL');
                setFilterCategory('ALL');
                setFilterDeletedBy('ALL');
              }}
              className="text-xs text-primary font-medium hover:underline shrink-0 cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Main List Table / Cards */}
      {loading ? (
        <div className="bg-card border border-border rounded-[var(--radius)] p-12 text-center text-muted-foreground">
          <RefreshCw className="w-7 h-7 mx-auto mb-2 animate-spin text-primary" />
          <p className="text-xs font-medium">Memuat log riwayat dan arsip laporan...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-card border border-border rounded-[var(--radius)] p-12 text-center text-muted-foreground space-y-2">
          <Archive className="w-10 h-10 mx-auto text-muted-foreground/60" />
          <h4 className="text-sm font-semibold text-foreground">Tidak Ada Riwayat Ditemukan</h4>
          <p className="text-xs max-w-sm mx-auto">
            Tidak ada data riwayat atau arsip laporan yang sesuai dengan kriteria filter saat ini.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Desktop Table View */}
          <div className="hidden md:block bg-card border border-border rounded-[var(--radius)] overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/70 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="py-3 px-4">Laporan & Kategori</th>
                  <th className="py-3 px-3">Tipe</th>
                  <th className="py-3 px-3">Pelapor</th>
                  <th className="py-3 px-3">Status / Riwayat</th>
                  <th className="py-3 px-3">Waktu Kejadian & Log</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredItems.map((item) => {
                  const isArchived = item.is_deleted;
                  const isSolved = item.status_selesai;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-muted/40 transition-colors cursor-pointer"
                      onClick={() =>
                        setSelectedItem({
                          type: item.source,
                          data: item.rawArchived || item.rawReport!,
                        })
                      }
                    >
                      {/* Title & Category */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-[var(--radius)] bg-muted border border-border overflow-hidden shrink-0 flex items-center justify-center">
                            {item.foto_url ? (
                              <img
                                src={item.foto_url}
                                alt={item.judul}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <Tag className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0 max-w-xs">
                            <div className="font-semibold text-foreground truncate text-xs sm:text-sm">
                              {item.judul}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                              <span className="bg-secondary px-1.5 py-0.5 rounded text-[10px] font-medium border border-border">
                                {item.kategori}
                              </span>
                              <span className="truncate flex items-center gap-1">
                                <MapPin className="w-3 h-3 shrink-0" />
                                {item.lokasi}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Tipe Laporan */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            item.tipe_laporan === 'HILANG'
                              ? 'bg-destructive/15 text-destructive border border-destructive/30'
                              : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {item.tipe_laporan}
                        </span>
                      </td>

                      {/* Pelapor */}
                      <td className="py-3.5 px-3">
                        <div className="text-foreground font-medium truncate max-w-[130px]">
                          {item.user_nama || 'Warga'}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {item.user_whatsapp || '-'}
                        </div>
                      </td>

                      {/* Status / History Badge */}
                      <td className="py-3.5 px-3">
                        {isArchived ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-destructive/15 text-destructive border border-destructive/30">
                              <Archive className="w-3 h-3 shrink-0" />
                              <span>Diarsipkan (Dihapus)</span>
                            </span>
                            <div className="text-[10px] text-muted-foreground line-clamp-1">
                              Oleh: <strong>{item.deleted_by_name || 'Warga'}</strong>
                            </div>
                          </div>
                        ) : isSolved ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--chart-1)]/15 text-[var(--chart-1)] border border-[var(--chart-1)]/30">
                              <CheckCircle2 className="w-3 h-3 shrink-0" />
                              <span>Selesai / Kembali</span>
                            </span>
                            {item.selesai_at && (
                              <div className="text-[10px] text-muted-foreground">
                                {formatShortDate(item.selesai_at)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-secondary text-secondary-foreground border border-border">
                            <Clock className="w-3 h-3 shrink-0 text-primary" />
                            <span>Sedang Tayang</span>
                          </span>
                        )}
                      </td>

                      {/* Timestamps */}
                      <td className="py-3.5 px-3 text-muted-foreground">
                        <div className="text-[11px]">
                          Kejadian: <span className="text-foreground">{formatShortDate(item.tgl_kejadian)}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {isArchived
                            ? `Dihapus: ${formatDate(item.deleted_at)}`
                            : isSolved
                            ? `Selesai: ${formatDate(item.selesai_at)}`
                            : `Dibuat: ${formatDate(item.created_at)}`}
                        </div>
                      </td>

                      {/* Action Button */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          id={`btn-detail-history-${item.reportId}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItem({
                              type: item.source,
                              data: item.rawArchived || item.rawReport!,
                            });
                          }}
                          className="min-h-[32px] px-2.5 py-1 text-xs bg-secondary hover:bg-muted text-secondary-foreground font-medium rounded-[var(--radius)] border border-border transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Audit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {filteredItems.map((item) => {
              const isArchived = item.is_deleted;
              const isSolved = item.status_selesai;

              return (
                <div
                  key={item.id}
                  onClick={() =>
                    setSelectedItem({
                      type: item.source,
                      data: item.rawArchived || item.rawReport!,
                    })
                  }
                  className="bg-card border border-border rounded-[var(--radius)] p-3.5 space-y-3 cursor-pointer hover:border-primary/50 transition-colors shadow-2xs"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-[var(--radius)] bg-muted border border-border overflow-hidden shrink-0 flex items-center justify-center">
                      {item.foto_url ? (
                        <img
                          src={item.foto_url}
                          alt={item.judul}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Tag className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            item.tipe_laporan === 'HILANG'
                              ? 'bg-destructive/15 text-destructive border border-destructive/30'
                              : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {item.tipe_laporan}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatShortDate(item.deleted_at || item.selesai_at || item.created_at)}
                        </span>
                      </div>
                      <h4 className="font-semibold text-foreground text-xs sm:text-sm line-clamp-1">
                        {item.judul}
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                        {item.kategori} • {item.lokasi}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-border flex items-center justify-between gap-2 text-xs">
                    <div>
                      {isArchived ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-destructive">
                          <Archive className="w-3 h-3" />
                          Diarsipkan: {item.deleted_by_name || 'Warga'}
                        </span>
                      ) : isSolved ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--chart-1)]">
                          <CheckCircle2 className="w-3 h-3" />
                          Selesai / Kembali
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          Sedang Tayang
                        </span>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItem({
                          type: item.source,
                          data: item.rawArchived || item.rawReport!,
                        });
                      }}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      Detail Audit <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* History Detail / Audit Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div
            id="modal-history-detail"
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-xs overflow-y-auto"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-[var(--radius)] w-full max-w-lg shadow-xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-border flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        selectedItem.data.tipe_laporan === 'HILANG'
                          ? 'bg-destructive/15 text-destructive border border-destructive/30'
                          : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {selectedItem.data.tipe_laporan}
                    </span>
                    <span className="bg-secondary text-secondary-foreground text-[10px] px-2 py-0.5 rounded font-medium border border-border">
                      {selectedItem.data.kategori}
                    </span>
                    {selectedItem.type === 'archived' ? (
                      <span className="bg-destructive/15 text-destructive text-[10px] px-2 py-0.5 rounded font-bold border border-destructive/30 flex items-center gap-1">
                        <Archive className="w-3 h-3" />
                        ARSIP DIHAPUS
                      </span>
                    ) : selectedItem.data.status_selesai ? (
                      <span className="bg-[var(--chart-1)]/15 text-[var(--chart-1)] text-[10px] px-2 py-0.5 rounded font-bold border border-[var(--chart-1)]/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        SELESAI
                      </span>
                    ) : (
                      <span className="bg-secondary text-secondary-foreground text-[10px] px-2 py-0.5 rounded font-medium border border-border">
                        AKTIF
                      </span>
                    )}
                  </div>
                  <h3 className="font-serif text-base sm:text-lg font-bold text-foreground line-clamp-2">
                    {selectedItem.data.judul}
                  </h3>
                </div>

                <button
                  id="btn-close-history-modal"
                  onClick={() => setSelectedItem(null)}
                  className="p-1 rounded-[var(--radius)] hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
                {/* Notice banner for deleted report */}
                {selectedItem.type === 'archived' && (
                  <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-[var(--radius)] flex items-start gap-2.5 text-destructive">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-semibold text-xs">Laporan Telah Dihapus dari Feed Publik</p>
                      <p className="text-[11px] opacity-90 leading-relaxed">
                        Data ini tidak lagi terlihat oleh warga umum. Log di bawah ini disimpan khusus
                        untuk keperluan audit dan pemantauan riwayat oleh Petugas RW.
                      </p>
                    </div>
                  </div>
                )}

                {/* Photo if available */}
                {selectedItem.data.foto_url && (
                  <div className="rounded-[var(--radius)] border border-border overflow-hidden max-h-56 bg-muted flex items-center justify-center">
                    <img
                      src={selectedItem.data.foto_url}
                      alt={selectedItem.data.judul}
                      className="w-full h-full object-contain max-h-56"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                {/* Audit & Archival Details Card (if archived) */}
                {selectedItem.type === 'archived' && (
                  <div className="bg-muted/70 border border-border rounded-[var(--radius)] p-3.5 space-y-2">
                    <h4 className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                      Informasi Log Penghapusan
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-muted-foreground block">Waktu Dihapus:</span>
                        <span className="font-medium text-foreground">
                          {formatDate((selectedItem.data as ArchivedReport).deleted_at)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Dihapus Oleh:</span>
                        <span className="font-medium text-foreground">
                          {(selectedItem.data as ArchivedReport).deleted_by_name || 'Warga'} (
                          {(selectedItem.data as ArchivedReport).deleted_by_role?.toUpperCase() || 'WARGA'})
                        </span>
                      </div>
                    </div>
                    <div className="pt-1.5 border-t border-border">
                      <span className="text-muted-foreground block text-[11px]">Alasan Penghapusan:</span>
                      <p className="font-medium text-foreground text-xs mt-0.5 bg-background p-2 rounded border border-border">
                        {(selectedItem.data as ArchivedReport).delete_reason || 'Dihapus dari feed aktif'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Description */}
                <div className="space-y-1">
                  <span className="font-semibold text-muted-foreground block text-[11px] uppercase tracking-wider">
                    Deskripsi Barang
                  </span>
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap bg-background p-3 rounded-[var(--radius)] border border-border">
                    {selectedItem.data.deskripsi || '-'}
                  </p>
                </div>

                {/* Key metadata grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div className="p-2.5 bg-muted/40 rounded-[var(--radius)] border border-border space-y-0.5">
                    <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                      <MapPin className="w-3 h-3 text-primary" /> Lokasi Kejadian:
                    </span>
                    <p className="font-medium text-foreground">{selectedItem.data.lokasi}</p>
                  </div>

                  <div className="p-2.5 bg-muted/40 rounded-[var(--radius)] border border-border space-y-0.5">
                    <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                      <Calendar className="w-3 h-3 text-primary" /> Tanggal Kejadian:
                    </span>
                    <p className="font-medium text-foreground">{formatDate(selectedItem.data.tgl_kejadian)}</p>
                  </div>

                  <div className="p-2.5 bg-muted/40 rounded-[var(--radius)] border border-border space-y-0.5">
                    <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                      <UserRound className="w-3 h-3 text-primary" /> Nama Pelapor:
                    </span>
                    <p className="font-medium text-foreground">{selectedItem.data.user_nama || 'Warga'}</p>
                  </div>

                  <div className="p-2.5 bg-muted/40 rounded-[var(--radius)] border border-border space-y-0.5">
                    <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                      <ExternalLink className="w-3 h-3 text-primary" /> WhatsApp Pelapor:
                    </span>
                    <p className="font-medium text-foreground">{selectedItem.data.user_whatsapp || '-'}</p>
                  </div>
                </div>

                {/* Timeline info */}
                <div className="p-3 bg-secondary/60 rounded-[var(--radius)] border border-border space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ID Laporan:</span>
                    <span className="font-mono text-foreground">{selectedItem.data.id_report}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dibuat Pada:</span>
                    <span className="text-foreground">{formatDate(selectedItem.data.created_at)}</span>
                  </div>
                  {selectedItem.data.selesai_at && (
                    <div className="flex justify-between text-[var(--chart-1)]">
                      <span className="font-medium">Waktu Diselesaikan:</span>
                      <span className="font-semibold">{formatDate(selectedItem.data.selesai_at)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-3.5 sm:p-4 border-t border-border bg-card flex items-center justify-end">
                <button
                  id="btn-close-modal-bottom"
                  onClick={() => setSelectedItem(null)}
                  className="min-h-[36px] px-4 py-1.5 bg-primary text-primary-foreground font-semibold rounded-[var(--radius)] text-xs hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Tutup Rincian
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
