import React, { useState, useMemo, FormEvent } from 'react';
import { User, Report, CategoryItem, DEFAULT_CATEGORIES } from '../types';
import { 
  Tag, 
  Plus, 
  Pencil, 
  Trash2, 
  Check, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Layers, 
  Search,
  ArrowRight
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch 
} from 'firebase/firestore';

interface CategoryManagementProps {
  currentUser: User;
  categories: CategoryItem[];
  reports: Report[];
  onCategoriesChanged: () => void;
  onRefreshReports: () => void;
}

export default function CategoryManagement({
  currentUser,
  categories,
  reports,
  onCategoriesChanged,
  onRefreshReports,
}: CategoryManagementProps) {
  const [newCatName, setNewCatName] = useState('');
  const [adding, setAdding] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Search/filter categories
  const [searchQuery, setSearchQuery] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [syncReportsOnEdit, setSyncReportsOnEdit] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  // Deleting state
  const [deletingCategory, setDeletingCategory] = useState<CategoryItem | null>(null);
  const [reassignTarget, setReassignTarget] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Resetting/Seeding default categories state
  const [isSeeding, setIsSeeding] = useState(false);

  // Calculate reports count per category
  const reportCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    reports.forEach((r) => {
      const cat = r.kategori || 'Lainnya';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [reports]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase().trim();
    return categories.filter((c) => c.nama.toLowerCase().includes(q));
  }, [categories, searchQuery]);

  const clearAlerts = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  // Add Category Handler
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAlerts();

    const trimmed = newCatName.trim();
    if (!trimmed) {
      setErrorMsg('Nama kategori tidak boleh kosong.');
      return;
    }

    if (trimmed.length > 50) {
      setErrorMsg('Nama kategori maksimal 50 karakter.');
      return;
    }

    // Check duplicate (case-insensitive)
    const exists = categories.some(
      (c) => c.nama.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      setErrorMsg(`Kategori "${trimmed}" sudah terdaftar.`);
      return;
    }

    setAdding(true);
    try {
      const docRef = doc(collection(db, 'categories'));
      const newCategory: CategoryItem = {
        id_kategori: docRef.id,
        nama: trimmed,
        created_at: new Date().toISOString(),
      };

      await setDoc(docRef, newCategory);
      setNewCatName('');
      setSuccessMsg(`Kategori "${trimmed}" berhasil ditambahkan.`);
      onCategoriesChanged();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'categories');
      setErrorMsg('Gagal menambahkan kategori. Silakan coba lagi.');
    } finally {
      setAdding(false);
    }
  };

  // Start Editing
  const startEdit = (cat: CategoryItem) => {
    clearAlerts();
    setEditingId(cat.id_kategori);
    setEditName(cat.nama);
    setSyncReportsOnEdit(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  // Save Edit Handler
  const handleSaveEdit = async (cat: CategoryItem) => {
    clearAlerts();
    const trimmed = editName.trim();
    if (!trimmed) {
      setErrorMsg('Nama kategori tidak boleh kosong.');
      return;
    }

    if (trimmed.length > 50) {
      setErrorMsg('Nama kategori maksimal 50 karakter.');
      return;
    }

    // Check duplicate with another category
    const isDuplicate = categories.some(
      (c) => c.id_kategori !== cat.id_kategori && c.nama.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setErrorMsg(`Nama kategori "${trimmed}" sudah digunakan.`);
      return;
    }

    if (trimmed === cat.nama) {
      cancelEdit();
      return;
    }

    setSavingEdit(true);
    try {
      const catDocRef = doc(db, 'categories', cat.id_kategori);
      await updateDoc(catDocRef, {
        nama: trimmed,
        updated_at: new Date().toISOString(),
      });

      // Synchronize existing reports if chosen
      if (syncReportsOnEdit) {
        const affectedReports = reports.filter((r) => r.kategori === cat.nama);
        if (affectedReports.length > 0) {
          const batch = writeBatch(db);
          affectedReports.forEach((r) => {
            const reportRef = doc(db, 'reports', r.id_report);
            batch.update(reportRef, { kategori: trimmed });
          });
          await batch.commit();
          onRefreshReports();
        }
      }

      setSuccessMsg(`Kategori berhasil diubah menjadi "${trimmed}".`);
      cancelEdit();
      onCategoriesChanged();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `categories/${cat.id_kategori}`);
      setErrorMsg('Gagal memperbarui kategori. Silakan coba lagi.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Start Delete
  const startDelete = (cat: CategoryItem) => {
    clearAlerts();
    if (categories.length <= 1) {
      setErrorMsg('Minimal harus ada satu kategori dalam sistem.');
      return;
    }

    // Default reassign target: find another category
    const otherCats = categories.filter((c) => c.id_kategori !== cat.id_kategori);
    const fallbackTarget = otherCats.find((c) => c.nama.toLowerCase() === 'lainnya') || otherCats[0];
    setReassignTarget(fallbackTarget ? fallbackTarget.nama : '');
    setDeletingCategory(cat);
  };

  // Confirm Delete Handler
  const handleConfirmDelete = async () => {
    if (!deletingCategory) return;
    clearAlerts();
    setIsDeleting(true);

    try {
      const affectedReports = reports.filter((r) => r.kategori === deletingCategory.nama);

      // Reassign affected reports if any
      if (affectedReports.length > 0 && reassignTarget) {
        const batch = writeBatch(db);
        affectedReports.forEach((r) => {
          const reportRef = doc(db, 'reports', r.id_report);
          batch.update(reportRef, { kategori: reassignTarget });
        });
        await batch.commit();
        onRefreshReports();
      }

      // Delete the category document
      const catDocRef = doc(db, 'categories', deletingCategory.id_kategori);
      await deleteDoc(catDocRef);

      setSuccessMsg(
        `Kategori "${deletingCategory.nama}" berhasil dihapus${
          affectedReports.length > 0 ? ` dan ${affectedReports.length} laporan dipindahkan ke "${reassignTarget}".` : '.'
        }`
      );
      setDeletingCategory(null);
      onCategoriesChanged();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `categories/${deletingCategory.id_kategori}`);
      setErrorMsg('Gagal menghapus kategori. Silakan coba lagi.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Seed / Reset Default Categories
  const handleSeedDefaults = async () => {
    clearAlerts();
    setIsSeeding(true);

    try {
      const batch = writeBatch(db);
      const existingNames = new Set(categories.map((c) => c.nama.toLowerCase()));

      let addedCount = 0;
      for (const defaultName of DEFAULT_CATEGORIES) {
        if (!existingNames.has(defaultName.toLowerCase())) {
          const newDocRef = doc(collection(db, 'categories'));
          batch.set(newDocRef, {
            id_kategori: newDocRef.id,
            nama: defaultName,
            created_at: new Date().toISOString(),
          });
          addedCount++;
        }
      }

      if (addedCount > 0) {
        await batch.commit();
        setSuccessMsg(`Berhasil menambahkan ${addedCount} kategori standar.`);
        onCategoriesChanged();
      } else {
        setSuccessMsg('Semua kategori standar sudah tersedia.');
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'categories');
      setErrorMsg('Gagal memuat kategori standar.');
    } finally {
      setIsSeeding(false);
    }
  };

  if (!currentUser.is_admin) {
    return (
      <div className="bg-card rounded-[var(--radius)] p-8 text-center border border-border max-w-md mx-auto my-8">
        <AlertTriangle className="w-10 h-10 text-warning mx-auto mb-3" />
        <h3 className="text-base font-semibold text-foreground">Akses Terbatas</h3>
        <p className="text-xs text-muted-foreground mt-1.5">
          Halaman pengelolaan kategori ini hanya dapat diakses oleh akun Petugas RW 04.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-card border border-border rounded-[var(--radius)] p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-serif text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary shrink-0" />
            Kelola Kategori Barang
          </h3>
          <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
            Tambah, ubah nama, atau hapus kategori barang hilang dan temuan untuk warga RW 04.
            Perubahan langsung tersinkronisasi ke seluruh formulir dan filter pencarian.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-secondary text-secondary-foreground text-xs px-3 py-1.5 rounded-full border border-border font-medium flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-primary" />
            <span>{categories.length} Kategori Aktif</span>
          </div>
          <button
            id="btn-seed-default-categories"
            type="button"
            onClick={handleSeedDefaults}
            disabled={isSeeding}
            className="min-h-[34px] px-3 py-1.5 rounded-[var(--radius)] bg-background hover:bg-muted text-foreground border border-border text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
            title="Muat atau lengkapi dengan 6 kategori standar bawaan"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${isSeeding ? 'animate-spin' : ''}`} />
            <span>Kategori Standar</span>
          </button>
        </div>
      </div>

      {/* Alert Notices */}
      {errorMsg && (
        <div className="p-3.5 rounded-[var(--radius)] bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg('')}
            className="text-destructive/80 hover:text-destructive cursor-pointer p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-[var(--radius)] bg-primary/10 border border-primary/30 text-foreground text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-primary" />
            <span className="font-medium">{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg('')}
            className="text-muted-foreground hover:text-foreground cursor-pointer p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Form Tambah Kategori Baru */}
      <div className="bg-card border border-border rounded-[var(--radius)] p-4 sm:p-5 shadow-xs">
        <h4 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
          <Plus className="w-4 h-4 text-primary" />
          Tambah Kategori Baru
        </h4>
        <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
              <Tag className="w-4 h-4" />
            </span>
            <input
              id="input-new-category-name"
              type="text"
              required
              placeholder="Contoh: Kendaraan, Aksesoris, Alat Musik, Payung..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              maxLength={50}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-background border border-border rounded-[var(--radius)] focus:outline-none focus:ring-2 focus:ring-ring text-foreground min-h-[42px]"
            />
          </div>
          <button
            id="btn-submit-new-category"
            type="submit"
            disabled={adding || !newCatName.trim()}
            className="min-h-[42px] px-5 py-2 rounded-[var(--radius)] bg-primary text-primary-foreground text-xs sm:text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {adding ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Tambah Kategori</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Daftar Kategori & Search */}
      <div className="bg-card border border-border rounded-[var(--radius)] p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div>
            <h4 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              Daftar Kategori ({categories.length})
            </h4>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
              Klik nama untuk mengedit atau gunakan tombol aksi di samping kanan.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-muted-foreground pointer-events-none">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input
              id="search-category-list"
              type="text"
              placeholder="Cari kategori..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-background border border-border rounded-[var(--radius)] focus:outline-none focus:ring-1 focus:ring-ring text-foreground min-h-[34px]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Categories Grid */}
        {filteredCategories.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground text-xs">
            {searchQuery ? (
              <p>Tidak ada kategori yang cocok dengan "{searchQuery}".</p>
            ) : (
              <div className="space-y-3">
                <p>Belum ada kategori yang terdaftar.</p>
                <button
                  type="button"
                  onClick={handleSeedDefaults}
                  className="px-4 py-2 text-xs font-semibold rounded-[var(--radius)] bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Muat 6 Kategori Standar
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredCategories.map((cat) => {
              const count = reportCountByCategory[cat.nama] || 0;
              const isEditing = editingId === cat.id_kategori;

              return (
                <div
                  key={cat.id_kategori}
                  id={`category-item-${cat.id_kategori}`}
                  className={`p-3.5 rounded-[var(--radius)] border transition-all ${
                    isEditing
                      ? 'border-primary bg-primary/5 shadow-xs'
                      : 'border-border bg-background hover:border-border/80'
                  }`}
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-muted-foreground block">
                          Ubah Nama Kategori
                        </label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          maxLength={50}
                          autoFocus
                          className="w-full px-3 py-1.5 text-xs sm:text-sm bg-card border border-border rounded-[var(--radius)] focus:outline-none focus:ring-2 focus:ring-ring text-foreground min-h-[38px]"
                        />
                      </div>

                      {count > 0 && (
                        <label className="flex items-start gap-2 cursor-pointer select-none text-[11px] text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={syncReportsOnEdit}
                            onChange={(e) => setSyncReportsOnEdit(e.target.checked)}
                            className="mt-0.5 rounded text-primary focus:ring-ring"
                          />
                          <span>
                            Perbarui juga <strong>{count} laporan</strong> yang saat ini menggunakan kategori "{cat.nama}".
                          </span>
                        </label>
                      )}

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={savingEdit}
                          className="min-h-[32px] px-3 py-1 rounded-[var(--radius)] bg-secondary text-secondary-foreground text-xs font-medium hover:bg-muted border border-border transition-colors cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(cat)}
                          disabled={savingEdit || !editName.trim()}
                          className="min-h-[32px] px-3.5 py-1 rounded-[var(--radius)] bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                        >
                          {savingEdit ? (
                            <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>Simpan</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0 text-foreground">
                          <Tag className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-xs sm:text-sm font-semibold text-foreground truncate">
                            {cat.nama}
                          </h5>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <span>{count} laporan terkait</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          id={`btn-edit-cat-${cat.id_kategori}`}
                          type="button"
                          onClick={() => startEdit(cat)}
                          className="p-2 min-w-[34px] min-h-[34px] rounded-[var(--radius)] text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors cursor-pointer flex items-center justify-center"
                          title={`Edit kategori ${cat.nama}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`btn-delete-cat-${cat.id_kategori}`}
                          type="button"
                          onClick={() => startDelete(cat)}
                          disabled={categories.length <= 1}
                          className="p-2 min-w-[34px] min-h-[34px] rounded-[var(--radius)] text-destructive hover:bg-destructive/10 border border-destructive/20 transition-colors cursor-pointer flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                          title={categories.length <= 1 ? 'Tidak dapat menghapus satu-satunya kategori' : `Hapus kategori ${cat.nama}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Konfirmasi Hapus Kategori */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
          <div className="relative bg-card text-card-foreground w-full max-w-md rounded-[var(--radius)] p-5 sm:p-6 border border-border shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-destructive/15 border border-destructive/20 text-destructive flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm sm:text-base font-semibold text-foreground">
                  Hapus Kategori "{deletingCategory.nama}"?
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tindakan ini akan menghapus kategori dari sistem.
                </p>
              </div>
            </div>

            {/* Reassign warning if reports exist */}
            {(reportCountByCategory[deletingCategory.nama] || 0) > 0 ? (
              <div className="p-3 bg-warning-background border border-warning/30 rounded-[var(--radius)] space-y-2">
                <div className="flex items-center gap-1.5 text-warning font-semibold text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    Ada {reportCountByCategory[deletingCategory.nama]} laporan menggunakan kategori ini
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Pilih kategori tujuan pemindahan untuk laporan-laporan tersebut:
                </p>
                <div className="space-y-1 pt-1">
                  <label htmlFor="select-reassign-target" className="text-[10px] uppercase font-bold text-muted-foreground">
                    Pindahkan Ke Kategori:
                  </label>
                  <select
                    id="select-reassign-target"
                    value={reassignTarget}
                    onChange={(e) => setReassignTarget(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-background border border-border rounded-[var(--radius)] text-foreground focus:ring-1 focus:ring-ring focus:outline-none"
                  >
                    {categories
                      .filter((c) => c.id_kategori !== deletingCategory.id_kategori)
                      .map((c) => (
                        <option key={c.id_kategori} value={c.nama}>
                          {c.nama}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Tidak ada laporan yang saat ini menggunakan kategori ini. Anda aman untuk menghapusnya.
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                disabled={isDeleting}
                className="min-h-[38px] px-4 py-2 rounded-[var(--radius)] bg-secondary text-secondary-foreground text-xs font-medium hover:bg-muted border border-border transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                id="btn-confirm-delete-category"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="min-h-[38px] px-4 py-2 rounded-[var(--radius)] bg-destructive text-destructive-foreground text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-destructive-foreground border-t-transparent rounded-full animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Kategori</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
