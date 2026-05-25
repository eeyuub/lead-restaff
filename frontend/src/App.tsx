import { useEffect, useState } from 'react';
import { NavLink, Route, Routes, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Radar, Users, Send, LogOut } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import ScrapeLauncher from './pages/ScrapeLauncher';
import LeadsList from './pages/LeadsList';
import LeadDetail from './pages/LeadDetail';
import OutreachJobs from './pages/OutreachJobs';
import OutreachJobDetail from './pages/OutreachJobDetail';
import Login from './pages/Login';
import { api, auth } from './lib/api';

export default function App() {
  const [authed, setAuthed] = useState(auth.isAuthed());
  const navigate = useNavigate();
  const location = useLocation();

  // Boot-time verification — if a stored key was revoked server-side
  // (e.g. INTERNAL_API_KEY rotated), kick the user back to /login.
  useEffect(() => {
    if (!auth.isAuthed()) return;
    api
      .post('/auth/verify')
      .catch(() => {
        /* 401 already handled by api.ts → emits restaff:unauthenticated */
      });
  }, []);

  // Listen for global auth events.
  useEffect(() => {
    function onUnauth() {
      setAuthed(false);
      if (location.pathname !== '/login') {
        navigate('/login', { replace: true });
      }
    }
    function onAuth() {
      setAuthed(true);
    }
    window.addEventListener('restaff:unauthenticated', onUnauth);
    window.addEventListener('restaff:authenticated', onAuth);
    return () => {
      window.removeEventListener('restaff:unauthenticated', onUnauth);
      window.removeEventListener('restaff:authenticated', onAuth);
    };
  }, [navigate, location.pathname]);

  function logout() {
    auth.clear();
    setAuthed(false);
    navigate('/login', { replace: true });
  }

  if (!authed) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 border-r border-ink-800 bg-ink-900/50 flex flex-col">
        <div className="px-5 py-6 border-b border-ink-800">
          <h1 className="font-display text-2xl italic text-ink-50">
            Restaff<span className="text-flame">.</span>
          </h1>
          <p className="text-[10px] font-mono uppercase tracking-widest text-ink-400 mt-1">
            Lead Engine
          </p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <NavItem to="/dashboard" icon={<LayoutDashboard size={14} />}>Dashboard</NavItem>
          <NavItem to="/scrape" icon={<Radar size={14} />}>New scrape</NavItem>
          <NavItem to="/leads" icon={<Users size={14} />}>Leads</NavItem>
          <NavItem to="/outreach/jobs" icon={<Send size={14} />}>Outreach jobs</NavItem>
        </nav>
        <div className="px-3 pb-3">
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-ink-300 hover:text-ink-50 hover:bg-ink-800/50 transition-colors"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
        <div className="px-5 py-4 border-t border-ink-800 text-[10px] font-mono text-ink-500 leading-relaxed">
          v0.1 · Internal
          <br />
          <span className="text-ink-600">Wiicode × Restaff</span>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/login" element={<Navigate to="/dashboard" replace />} />
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/scrape" element={<ScrapeLauncher />} />
          <Route path="/leads" element={<LeadsList />} />
          <Route path="/leads/:id" element={<LeadDetail />} />
          <Route path="/outreach/jobs" element={<OutreachJobs />} />
          <Route path="/outreach/jobs/:id" element={<OutreachJobDetail />} />
        </Routes>
      </main>
    </div>
  );
}

function NavItem({ to, icon, children }: { to: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
          isActive
            ? 'bg-ink-800 text-ink-50 border-l-2 border-flame'
            : 'text-ink-300 border-l-2 border-transparent hover:text-ink-50 hover:bg-ink-800/50'
        }`
      }
    >
      {icon}
      {children}
    </NavLink>
  );
}
