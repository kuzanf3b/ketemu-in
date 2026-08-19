import React from 'react';
import { Report } from '../types';
import { MapPin, Calendar, Tag, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface ReportCardProps {
  report: Report;
  onClick: () => void;
  key?: string;
}

export default function ReportCard({ report, onClick }: ReportCardProps) {
  const isLost = report.tipe_laporan === 'HILANG';
  const isSolved = report.status_selesai;

  // Render proper Indonesian date format
  const formatDate = (dateStr: string) => {
    try {
      const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
      return new Date(dateStr).toLocaleDateString('id-ID', options);
    } catch {
      return dateStr;
    }
  };

  return (
    <motion.div
      layout
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      onClick={onClick}
      className={`group relative bg-card rounded-2xl overflow-hidden border transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md flex flex-col h-full ${
        isSolved ? 'border-emerald-100 bg-emerald-50/10 opacity-90' : 'border-border'
      }`}
    >
      {/* Label and Image Section */}
      <div className="relative h-48 w-full bg-muted overflow-hidden">
        <img
          src={report.foto_url}
          alt={report.judul}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        
        {/* Absolute top badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2 z-10">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide shadow-md ${
              isLost
                ? 'bg-rose-500 text-primary-foreground'
                : 'bg-emerald-500 text-primary-foreground'
            }`}
          >
            {report.tipe_laporan}
          </span>

          <span className="bg-primary/75 backdrop-blur-sm text-primary-foreground px-2.5 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1">
            <Tag className="w-3 h-3" />
            {report.kategori}
          </span>
        </div>

        {isSolved && (
          <div className="absolute inset-0 bg-primary/40 backdrop-blur-[1px] flex items-center justify-center">
            <div className="bg-emerald-600 text-primary-foreground px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm shadow-lg scale-105">
              <CheckCircle2 className="w-5 h-5" />
              SELESAI / KETEMU
            </div>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className={`text-base font-bold text-foreground leading-snug line-clamp-2 mb-2 group-hover:text-foreground transition-colors ${isSolved ? 'line-through text-muted-foreground' : ''}`}>
            {report.judul}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-4">
            {report.deskripsi}
          </p>
        </div>

        <div className="space-y-2 pt-3 border-t border-border text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">{report.lokasi}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span>{formatDate(report.tgl_kejadian)}</span>
            </div>
            
            <span className="text-[10px] text-muted-foreground">
              Oleh: <strong className="text-muted-foreground font-medium">{report.user_nama}</strong>
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

