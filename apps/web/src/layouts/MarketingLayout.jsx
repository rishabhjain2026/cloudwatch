import { Link, Outlet } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { BrandMark } from '../components/BrandMark';
import { Button } from '../design-system';
import { useTheme } from '../context/ThemeContext';

export function MarketingLayout() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-canvas text-text">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="InfraPulse home">
            <BrandMark size="lg" />
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button as={Link} to="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
              Admin
            </Button>
            <Button as={Link} to="/dashboard" size="sm">
              Open demo
            </Button>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
