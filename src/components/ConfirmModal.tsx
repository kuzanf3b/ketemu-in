import { X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDanger?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  isDanger = false,
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-foreground/45 backdrop-blur-xs"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="relative bg-card text-card-foreground w-full max-w-sm rounded-[var(--radius)] p-5 shadow-lg border border-border z-10 flex flex-col gap-4"
          >
            {/* Close Button */}
            <button
              onClick={onCancel}
              aria-label="Tutup"
              className="absolute top-3.5 right-3.5 p-1 rounded-[var(--radius)] hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon & Title */}
            <div className="flex items-start gap-3 mt-1">
              <div
                className={`p-2.5 rounded-[var(--radius)] shrink-0 border ${
                  isDanger
                    ? 'bg-error-background text-error border-error'
                    : 'bg-success-background text-success border-success'
                }`}
              >
                {isDanger ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
              </div>
              <div className="space-y-1 pr-4">
                <h3 className="font-sans text-base font-semibold text-foreground leading-tight">
                  {title}
                </h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {message}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-2 justify-end">
              <button
                type="button"
                onClick={onCancel}
                className="px-3.5 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-muted bg-secondary rounded-[var(--radius)] border border-border transition-colors cursor-pointer"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={`px-4 py-1.5 text-xs font-semibold rounded-[var(--radius)] transition-opacity hover:opacity-90 shadow-xs cursor-pointer ${
                  isDanger
                    ? 'bg-destructive text-destructive-foreground'
                    : 'bg-primary text-primary-foreground'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
