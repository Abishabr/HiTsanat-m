import { Moon, Sun } from 'lucide-react';
import { Button } from './ui/button';
import { useTheme } from '../context/ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggleTheme}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}
