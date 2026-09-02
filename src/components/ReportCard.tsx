import React from 'react';
import { Report } from '../types';
import { MapPin, Calendar, Tag, CheckCircle2, Clock, Hourglass } from 'lucide-react';
import { motion } from 'motion/react';
import { getAutoDeleteStatus } from '../lib/cleanupUtils';

interface ReportCardProps {
  key?: React.Key;
  report: Report;
  onClick: () => void;
}

export default function ReportCard({ report, onClick }: ReportCardProps) {
  const isLost = report.tipe_laporan === 'HILANG';
  const isSolved = report.status_selesai;
  const autoDeleteInfo = getAutoDeleteStatus(report);

  const formatDate = (dateStr: string) => {
    try {
      const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
      return new Date(dateStr).toLocaleDateString('id-ID', options);
    } catch {
      return dateStr;
    }
  };

  return (
    <motion.article
      id={`report-card-${report.id_report}`}
      layout
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      onClick={onClick}
      className={`group relative bg-card text-card-foreground rounded-[var(--radius)] overflow-hidden border border-border transition-all duration-150 cursor-pointer shadow-sm hover:shadow hover:bg-accent/40 flex flex-col h-full ${
        isSolved ? 'opacity-85' : ''
      }`}
    >
      {/* Thumbnail & Badges */}
      <div className="relative aspect-[4/3] w-full bg-muted overflow-hidden border-b border-border">
        <img
          src={report.foto_url}
          alt={report.judul}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
        />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 z-10">
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide shadow-xs ${
              isLost
                ? 'bg-[var(--chart-1)] text-white'
                : 'bg-[var(--chart-2)] text-[var(--primary-foreground)]'
            }`}
          >
            {report.tipe_laporan}
          </span>

          <span className="bg-card/90 backdrop-blur-xs text-foreground px-2 py-0.5 rounded-full text-xs font-medium border border-border flex items-center gap-1">
            <Tag className="w-3 h-3 text-muted-foreground" />
            {report.kategori}
          </span>
        </div>

        {report.status_disetujui === false && (
          <div className="absolute top-2.5 right-2.5 z-10">
            <span className="px-2 py-0.5 rounded-full bg-[var(--chart-1)] text-white text-xs font-semibold flex items-center gap-1 shadow-xs">
              <Clock className="w-3 h-3" />
              Menunggu Persetujuan
            </span>
          </div>
        )}

        {isSolved && (
          <div className="absolute inset-0 bg-background/70 backdrop-blur-xs flex flex-col items-center justify-center p-3 text-center gap-1.5">
            <div className="bg-[var(--chart-5)] text-foreground border border-border px-3 py-1.5 rounded-full flex items-center gap-1.5 font-semibold text-xs shadow-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              SELESAI / KETEMU
            </div>
            <div className="bg-background/90 text-foreground border border-border px-2.5 py-0.5 rounded-full flex items-center gap-1 text-[10px] font-medium shadow-xs">
              <Hourglass className="w-3 h-3 text-[var(--chart-1)]" />
              <span>{autoDeleteInfo.formattedCountdown}</span>
            </div>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <h3 className={`font-sans font-semibold text-base text-foreground leading-snug line-clamp-2 ${isSolved ? 'line-through text-muted-foreground' : ''}`}>
            {report.judul}
          </h3>
          <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed mt-1.5 font-normal">
            {report.deskripsi}
          </p>
        </div>

        <div className="space-y-1.5 pt-2.5 border-t border-border text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">{report.lokasi}</span>
          </div>

          <div className="flex items-center justify-between text-xs pt-0.5">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span>{formatDate(report.tgl_kejadian)}</span>
            </div>
            <span className="text-muted-foreground truncate max-w-[120px]">
              {report.user_nama}
            </span>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
