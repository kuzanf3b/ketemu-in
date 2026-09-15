import React, { useState, useEffect, useMemo } from 'react';
import { User, Report } from '../types';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { deleteUserAndArchiveReports } from '../lib/userManagement';
import {
  Users,
  Search,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Shield,
  ShieldCheck,
  Phone,
  Calendar,
  Archive,
  FileText,
  UserRound,
  RefreshCw,
  Info
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';

interface UserManagementProps {
  currentUser: User;
  reports: Report[];
  onRefreshReports?: () => void;
}

export default function UserManagement({
  currentUser,
  reports,
  onRefreshReports,
}: UserManagementProps) {
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserToDelete, setSelectedUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch all registered users
  const fetchUsers = async () => {
    try {
      setRefreshing(true);
      const snap = await getDocs(collection(db, 'users'));
      const list: User[] = [];
      snap.forEach((d) => {
        const data = d.data() as User;
        list.push({
          id_user: d.id,
          nama_lengkap: data.nama_lengkap || 'Warga',
          no_whatsapp: data.no_whatsapp || '',
          rt_rw: data.rt_rw || '',
          created_at: data.created_at || '',
          is_admin: data.is_admin || false,
        });
      });
      list.sort((a, b) => (b.is_admin ? 1 : 0) - (a.is_admin ? 1 : 0));
      setUsersList(list);
    } catch (err) {
      console.error('Error fetching users:', err);
      setErrorMsg('Gagal memuat daftar warga.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter users by search
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return usersList;
    const q = searchQuery.toLowerCase();
    return usersList.filter(
      (u) =>
        u.nama_lengkap.toLowerCase().includes(q) ||
        u.no_whatsapp.includes(q) ||
        (u.rt_rw && u.rt_rw.toLowerCase().includes(q))
    );
  }, [usersList, searchQuery]);

  // Count reports by user
  const getUserReportCounts = (userId: string) => {
    const userReps = reports.filter((r) => r.id_user === userId);
    const active = userReps.filter((r) => !r.status_selesai).length;
    const resolved = userReps.filter((r) => r.status_selesai).length;
    return {
      total: userReps.length,
      active,
      resolved,
    };
  };

  const handleExecuteDeleteUser = async () => {
    if (!selectedUserToDelete) return;
    const userToDel = selectedUserToDelete;
    setIsDeleting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const result = await deleteUserAndArchiveReports(userToDel, {
        uid: currentUser.id_user,
        name: currentUser.nama_lengkap || 'Petugas RW',
        role: 'petugas',
      });

      setSuccessMsg(
        `Akun warga "${userToDel.nama_lengkap}" berhasil dihapus. ${
          result.archivedReportsCount > 0
            ? `${result.archivedReportsCount} laporan aktif otomatis dialihkan ke Arsip Petugas.`
            : 'Warga ini tidak memiliki laporan aktif.'
        }`
      );
      setSelectedUserToDelete(null);
      await fetchUsers();
      if (onRefreshReports) {
        onRefreshReports();
      }
    } catch (err: any) {
      console.error('Failed to delete user:', err);
      let msg = err.message || 'Gagal menghapus user.';
      try {
        const parsed = JSON.parse(err.message);
        if (parsed?.error) msg = parsed.error;
      } catch {}
      setErrorMsg(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!currentUser.is_admin) {
    return (
      <div className="bg-card rounded-[var(--radius)] p-8 text-center border border-border max-w-md mx-auto my-8">
        <AlertTriangle className="w-10 h-10 text-warning mx-auto mb-3" />
        <h3 className="font-serif text-lg font-semibold text-foreground">Akses Khusus Petugas</h3>
        <p className="text-xs text-muted-foreground mt-1.5">
          Halaman manajemen akun warga hanya dapat diakses oleh akun Petugas RW 04.
        </p>
      </div>
    );
  }

  const selectedUserCounts = selectedUserToDelete ? getUserReportCounts(selectedUserToDelete.id_user) : null;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header & Subtitle */}
      <div className="bg-card rounded-[var(--radius)] p-4 sm:p-6 border border-border shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-[var(--radius)] bg-secondary text-secondary-foreground">
              <Users className="w-4 h-4" />
            </span>
            <h2 className="font-serif text-lg sm:text-xl font-semibold text-foreground">
              Manajemen Akun Warga
            </h2>
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
            Kelola data akun warga RW 04. Penghapusan akun menggunakan <strong>Opsi C (Smart Archive)</strong>: Laporan aktif warga akan otomatis dipindahkan ke arsip petugas agar feed publik tetap bersih dan rekam jejak riwayat tetap aman.
          </p>
        </div>

        <button
          onClick={fetchUsers}
          disabled={refreshing}
          className="min-h-[36px] px-3.5 py-1.5 rounded-[var(--radius)] bg-background hover:bg-muted text-foreground border border-border text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs self-stretch sm:self-auto justify-center disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${refreshing ? 'animate-spin' : ''}`} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* Info Notice for Option C */}
      <div className="bg-info-background border border-info rounded-[var(--radius)] p-3.5 flex items-start gap-2.5 text-xs text-foreground shadow-2xs">
        <Info className="w-4 h-4 text-info shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Kebijakan Relasi Data (Opsi C):</strong> Saat Anda menghapus akun warga, sistem tidak akan menghilangkan data barang hilang/temuan begitu saja. Seluruh laporan yang bersangkutan langsung disimpan ke <strong>Arsip Riwayat Petugas</strong> dengan catatan audit otomatis.
        </div>
      </div>

      {/* Feedback Messages */}
      {successMsg && (
        <div className="p-3.5 bg-success-background text-success border border-success rounded-[var(--radius)] text-xs flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="flex-1">{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-success hover:opacity-80 cursor-pointer font-bold">×</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-error-background text-error border border-error rounded-[var(--radius)] text-xs flex items-center gap-2 shadow-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="text-error hover:opacity-80 cursor-pointer font-bold">×</button>
        </div>
      )}

      {/* Search & Counter Bar */}
      <div className="bg-card rounded-[var(--radius)] p-3 sm:p-4 border border-border flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari nama warga, WA, atau RT..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-[36px] pl-9 pr-3 py-1.5 text-xs bg-background border border-border rounded-[var(--radius)] text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="text-xs text-muted-foreground flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <span>Total: <strong>{usersList.length}</strong> Warga Terdaftar</span>
        </div>
      </div>

      {/* Users Table / List */}
      <div className="bg-card rounded-[var(--radius)] border border-border overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-muted-foreground">Memuat data warga...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-xs">
            {searchQuery ? 'Tidak ada warga yang sesuai dengan pencarian.' : 'Belum ada data warga terdaftar.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted text-muted-foreground font-medium border-b border-border">
                <tr>
                  <th className="py-3 px-4">Nama & Role</th>
                  <th className="py-3 px-3">Kontak WhatsApp</th>
                  <th className="py-3 px-3">Wilayah (RT/RW)</th>
                  <th className="py-3 px-3 text-center">Laporan Aktif</th>
                  <th className="py-3 px-3 text-center">Laporan Selesai</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map((user) => {
                  const counts = getUserReportCounts(user.id_user);
                  const isSelf = user.id_user === currentUser.id_user;

                  return (
                    <tr key={user.id_user} className="hover:bg-accent/40 transition-colors">
                      {/* Name & Role */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-serif font-bold text-xs shrink-0 border border-border">
                            {user.nama_lengkap.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              <span>{user.nama_lengkap}</span>
                              {isSelf && (
                                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.2 rounded-full border border-border">
                                  (Anda)
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5">
                              {user.is_admin ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.2 rounded-full border border-primary/20">
                                  <ShieldCheck className="w-3 h-3" />
                                  Petugas RW
                                </span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">
                                  Warga
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* WhatsApp */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5 text-foreground font-mono text-[11px]">
                          <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span>+{user.no_whatsapp}</span>
                        </div>
                      </td>

                      {/* RT/RW */}
                      <td className="py-3.5 px-3 text-muted-foreground">
                        {user.rt_rw || 'RT 00 / RW 04'}
                      </td>

                      {/* Active Reports Count */}
                      <td className="py-3.5 px-3 text-center">
                        {counts.active > 0 ? (
                          <span className="inline-flex items-center justify-center px-2 py-0.5 bg-[var(--chart-1)] text-white font-semibold rounded-full text-[10px]">
                            {counts.active} Aktif
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">0</span>
                        )}
                      </td>

                      {/* Resolved Reports Count */}
                      <td className="py-3.5 px-3 text-center">
                        {counts.resolved > 0 ? (
                          <span className="inline-flex items-center justify-center px-2 py-0.5 bg-success text-success-foreground font-semibold rounded-full text-[10px]">
                            {counts.resolved} Selesai
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">0</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {isSelf ? (
                          <span className="text-[11px] text-muted-foreground italic">
                            Akun Aktif Anda
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedUserToDelete(user)}
                            className="min-h-[32px] px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 border border-destructive/30 rounded-[var(--radius)] transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Hapus Akun Warga & Arsipkan Laporannya"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus Akun</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Deletion Confirmation Modal */}
      <ConfirmModal
        isOpen={selectedUserToDelete !== null}
        title="Hapus Akun Warga & Arsipkan Laporan"
        message={
          selectedUserToDelete
            ? `Apakah Anda yakin ingin menghapus akun "${selectedUserToDelete.nama_lengkap}"? ${
                selectedUserCounts && selectedUserCounts.total > 0
                  ? `\n\n📌 OPSI C DIJALANKAN: ${selectedUserCounts.total} laporan milik warga ini (${selectedUserCounts.active} aktif, ${selectedUserCounts.resolved} selesai) akan otomatis dipindahkan ke Arsip Petugas agar feed publik tetap bersih dan riwayat tersimpan aman.`
                  : '\nWarga ini belum memiliki laporan tersimpan.'
              }`
            : ''
        }
        confirmText={isDeleting ? 'Memproses Arsip...' : 'Hapus & Arsipkan'}
        cancelText="Batal"
        onConfirm={handleExecuteDeleteUser}
        onCancel={() => setSelectedUserToDelete(null)}
        isDanger
      />
    </div>
  );
}
