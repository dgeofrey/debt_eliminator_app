import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Home, Sun, Moon, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import Geo from './Geo';

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout }    = useAuth();
  const { theme, toggle }   = useTheme();
  const navigate             = useNavigate();

  const handleLogout = () => { logout(); navigate('/register'); };

  const navItems = [
    { to: '/',         label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/mortgage', label: 'Mortgage',  icon: Home },
  ];

  return (
    <div className="min-h-screen bg-ink-50 dark:bg-ink-950 text-ink-900 dark:text-white transition-colors">
      <div className="flex">

        {/* ── Desktop sidebar ── */}
        <aside className="hidden md:flex md:flex-col w-60 min-h-screen bg-white dark:bg-black border-r border-ink-100 dark:border-white/[0.06] fixed left-0 top-0">

          {/* Brand */}
          <div className="px-6 py-7 border-b border-ink-100 dark:border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-[10px] tracking-widest">DE</span>
              </div>
              <div>
                <p className="font-bold text-sm tracking-widest uppercase leading-none">Eliminator</p>
                <p className="text-[10px] text-ink-400 dark:text-white/30 mt-0.5 tracking-wider font-light">Strategic finance</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-0.5">
            <p className="eyebrow px-3 pt-2 pb-3">Workspace</p>
            {navItems.map(item => (
              <NavLink key={item.to} to={item.to} end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all font-medium ${
                    isActive
                      ? 'bg-ink-900 dark:bg-white text-white dark:text-ink-900'
                      : 'text-ink-500 dark:text-white/50 hover:text-ink-900 dark:hover:text-white hover:bg-ink-50 dark:hover:bg-white/[0.04]'
                  }`}>
                <item.icon className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* User */}
          <div className="px-4 py-5 border-t border-ink-100 dark:border-white/[0.06] space-y-3">
            <div className="flex items-center gap-3 px-1">
              <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {(user?.fullName || user?.email || '?').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate leading-tight">{user?.fullName || user?.email}</p>
                <p className="text-[11px] text-ink-400 dark:text-white/30 truncate font-light">{user?.email}</p>
              </div>
            </div>
            {user?.isSuperAdmin && (
              <div className="px-1">
                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  <Shield className="w-2.5 h-2.5" />Super Admin
                </span>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={toggle}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg border border-ink-200 dark:border-white/10 text-ink-500 dark:text-white/40 hover:text-ink-900 dark:hover:text-white hover:bg-ink-50 dark:hover:bg-white/[0.04] transition-colors tracking-wide">
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                {theme === 'dark' ? 'Light' : 'Dark'}
              </button>
              <button onClick={handleLogout}
                className="flex items-center justify-center px-3 py-2 text-xs rounded-lg border border-ink-200 dark:border-white/10 text-ink-400 dark:text-white/30 hover:text-rose-500 hover:border-rose-500/30 transition-colors"
                title="Sign out">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </aside>

        {/* ── Mobile top bar ── */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-10 bg-white/95 dark:bg-black/95 border-b border-ink-100 dark:border-white/[0.06] px-5 py-4 flex items-center justify-between backdrop-blur-lg">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center">
              <span className="text-white font-bold text-[9px] tracking-widest">DE</span>
            </div>
            <span className="font-bold text-sm tracking-widest uppercase">Eliminator</span>
          </div>
          <div className="flex gap-1">
            <button onClick={toggle} className="p-2 rounded-lg text-ink-400 dark:text-white/40 hover:text-ink-700 dark:hover:text-white transition-colors">
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={handleLogout} className="p-2 rounded-lg text-ink-400 dark:text-white/40 hover:text-rose-500 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Mobile bottom nav ── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-10 bg-white/95 dark:bg-black/95 border-t border-ink-100 dark:border-white/[0.06] flex backdrop-blur-lg">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                  isActive ? 'text-ink-900 dark:text-white' : 'text-ink-400 dark:text-white/30'
                }`}>
              <item.icon className="w-4 h-4" strokeWidth={2} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 md:ml-60 pt-16 md:pt-0 pb-20 md:pb-0 min-h-screen">
          {children}
        </main>

        <Geo />
      </div>
    </div>
  );
}
