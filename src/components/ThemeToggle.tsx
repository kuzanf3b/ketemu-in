import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  isDark: boolean;
  onToggle: () => void;
}

export default function ThemeToggle({ isDark, onToggle }: ThemeToggleProps) {
  return (
    <button
      id="btn-theme-toggle"
      type="button"
      onClick={onToggle}
      aria-label={isDark ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
      className="p-2 text-foreground hover:bg-muted rounded-[var(--radius)] border border-border transition-colors cursor-pointer flex items-center justify-center"
      title={isDark ? 'Mode Terang' : 'Mode Gelap'}
    >
      {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-muted-foreground" />}
    </button>
  );
}
