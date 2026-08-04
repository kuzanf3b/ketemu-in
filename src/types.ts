export interface User {
  id_user: string;
  nama_lengkap: string;
  no_whatsapp: string;
  created_at: string;
  is_admin?: boolean;
}

export interface Report {
  id_report: string;
  id_user: string;
  tipe_laporan: 'HILANG' | 'DITEMUKAN';
  kategori: string;
  judul: string;
  deskripsi: string;
  foto_url: string;
  lokasi: string;
  tgl_kejadian: string;
  status_selesai: boolean;
  created_at: string;
  // Included when fetched with user relation
  user_nama?: string;
  user_whatsapp?: string;
}

export type Category = 'Elektronik' | 'Kunci' | 'Dompet' | 'Hewan' | 'Dokumen' | 'Lainnya';
