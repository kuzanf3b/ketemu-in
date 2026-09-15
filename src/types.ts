export interface User {
  id_user: string;
  nama_lengkap: string;
  no_whatsapp: string;
  created_at: string;
  is_admin?: boolean;
}

export type TipeLaporan = "HILANG" | "DITEMUKAN";

export interface Report {
  id_report: string;
  id_user: string;
  tipe_laporan: TipeLaporan;
  kategori: string;
  judul: string;
  deskripsi: string;
  foto_url: string;
  lokasi: string;
  tgl_kejadian: string;
  status_selesai: boolean;
  selesai_at?: string;
  created_at: string;
  // Included when fetched with user relation
  user_nama?: string;
  user_whatsapp?: string;
  status_disetujui?: boolean;
}

export interface CategoryItem {
  id_kategori: string;
  nama: string;
  created_at?: string;
  updated_at?: string;
}

export interface ArchivedReport {
  id_archive: string;
  id_report: string;
  id_user: string;
  tipe_laporan: TipeLaporan;
  kategori: string;
  judul: string;
  deskripsi: string;
  foto_url?: string;
  lokasi: string;
  tgl_kejadian: string;
  status_selesai: boolean;
  selesai_at?: string;
  created_at: string;
  user_nama?: string;
  user_whatsapp?: string;
  status_disetujui?: boolean;
  deleted_at: string;
  deleted_by_uid: string;
  deleted_by_name: string;
  deleted_by_role: "petugas" | "warga" | "sistem";
  delete_reason: string;
}

export const DEFAULT_CATEGORIES: string[] = [
  "Elektronik",
  "Kunci",
  "Dompet",
  "Hewan",
  "Dokumen",
  "Lainnya",
];

export type Category = string;
