export interface User {
  id_user: string;
  nama_lengkap: string;
  no_whatsapp: string;
  created_at: string;
  is_admin?: boolean;
}

export type TipeLaporan = 'HILANG' | 'DITEMUKAN';

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

export type Category = 'Elektronik' | 'Kunci' | 'Dompet' | 'Hewan' | 'Dokumen' | 'Lainnya';
