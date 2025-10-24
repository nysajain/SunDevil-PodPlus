import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import SignUp from './pages/SignUp';
import PodDashboard from './pages/PodDashboard';
import Store from './pages/Store';
import CaptainConsole from './pages/CaptainConsole';
import Home from './pages/Home';
import CaptainApply from './pages/CaptainApply';
import ApplySuccess from './pages/ApplySuccess';
import { Role, getRole, setRole } from './lib/roles';
import { currentUserId as getCurrentUserId } from './lib/roles';
import { getPoints, transferLegacyPoints } from './lib/points';

interface SessionState {
  currentUserId: string | null;
  role: Role;
  points: number;
  displayName: string | null;
}

const isBrowser = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

const readSession = (): SessionState => {
  if (!isBrowser()) {
    return { currentUserId: null, role: 'student', points: 0, displayName: null };
  }
  const currentUserId = getCurrentUserId();
  const role = getRole();
  if (currentUserId) {
    transferLegacyPoints(currentUserId);
  }
  const displayName = localStorage.getItem('currentUserName');
  const points = getPoints(currentUserId);
  return { currentUserId, role, points, displayName };
};

const roleLabel = (role: Role): string => {
  switch (role) {
    case 'captain':
      return 'Captain';
    case 'captain-candidate':
      return 'Captain (Pending)';
    default:
      return 'Student';
  }
};

const App: React.FC = () => {
  const location = useLocation();
  const [session, setSession] = useState<SessionState>(() => readSession());

  useEffect(() => {
    const handleStorage = () => setSession(readSession());
    const handlePointsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<number | undefined>).detail;
      setSession((prev) => ({ ...prev, points: typeof detail === 'number' ? detail : readSession().points }));
    };
    const handleSessionUpdated = () => setSession(readSession());
    const handleRoleUpdated = () => setSession(readSession());

    window.addEventListener('storage', handleStorage);
    window.addEventListener('pods:points-updated', handlePointsUpdated as EventListener);
    window.addEventListener('pods:session-updated', handleSessionUpdated);
    window.addEventListener('pods:role-updated', handleRoleUpdated);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('pods:points-updated', handlePointsUpdated as EventListener);
      window.removeEventListener('pods:session-updated', handleSessionUpdated);
      window.removeEventListener('pods:role-updated', handleRoleUpdated);
    };
  }, []);

  const navLinks = useMemo(
    () => [
      { to: '/', label: 'Home' },
      { to: '/dashboard', label: 'Dashboard' },
      { to: '/store', label: 'Store' },
    ],
    []
  );

  const isCaptainish = session.role === 'captain' || session.role === 'captain-candidate';

  const handleSelectRole = (target: 'student' | 'captain') => {
    if (!isBrowser()) return;
    if (target === 'student') {
      setRole('student');
      return;
    }
    if (session.role === 'captain-candidate') {
      return;
    }
    setRole('captain');
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 backdrop-blur bg-white/70 border-b border-white/40">
        <nav className="max-w-6xl mx-auto flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between gap-4">
            <NavLink to="/" className="flex items-center gap-2 text-asuMaroon font-extrabold text-xl">
              <span aria-hidden>☀️</span>
              <span>SunDevil Pods+</span>
            </NavLink>
            <div className="flex items-center gap-2 rounded-full border border-asuMaroon/30 bg-white/70 px-1 py-0.5 text-xs font-semibold text-asuMaroon shadow-sm">
              <button
                type="button"
                onClick={() => handleSelectRole('student')}
                className={`rounded-full px-3 py-1 transition ${
                  session.role === 'student'
                    ? 'bg-asuMaroon text-white shadow'
                    : 'hover:bg-asuMaroon/10'
                }`}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => handleSelectRole('captain')}
                className={`rounded-full px-3 py-1 transition ${
                  session.role === 'captain' || session.role === 'captain-candidate'
                    ? 'bg-asuGold text-black shadow'
                    : 'hover:bg-asuGold/30'
                } ${session.role === 'captain-candidate' ? 'cursor-not-allowed opacity-80' : ''}`}
              >
                {session.role === 'captain-candidate' ? 'Captain (Pending)' : 'Captain'}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `text-sm font-semibold px-3 py-1 rounded-full transition-colors ${
                    isActive ? 'bg-asuMaroon text-white shadow-sm' : 'text-asuMaroon/80 hover:bg-asuMaroon/10'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
            {isCaptainish && (
              <NavLink
                to="/captain"
                className={({ isActive }) =>
                  `text-sm font-semibold px-3 py-1 rounded-full transition-colors ${
                    isActive ? 'bg-asuGold text-black shadow-sm' : 'text-asuMaroon/80 hover:bg-asuGold/30'
                  }`
                }
              >
                Captain
              </NavLink>
            )}
            {session.role === 'captain' && (
              <div className="flex items-center gap-2 bg-asuMaroon text-white text-sm font-semibold px-3 py-1 rounded-full shadow">
                <span>{session.points.toLocaleString()}</span>
                <span className="uppercase tracking-wide text-xs">pts</span>
              </div>
            )}
            {session.role === 'captain-candidate' && (
              <span className="text-xs font-semibold text-asuMaroon/70">{roleLabel(session.role)}</span>
            )}
          </div>
        </nav>
      </header>
      <main className="py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/dashboard" element={<PodDashboard />} />
            <Route path="/store" element={<Store />} />
            <Route path="/captain" element={<CaptainConsole />} />
            <Route path="/apply" element={<CaptainApply />} />
            <Route path="/apply/success" element={<ApplySuccess />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default App;
