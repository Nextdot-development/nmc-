import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { api, session } from './api.js';
import Layout from './components/Layout.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Auditor from './pages/Auditor.jsx';
import RulePack from './pages/RulePack.jsx';
import History from './pages/History.jsx';
import HistoryDetail from './pages/HistoryDetail.jsx';
import Settings from './pages/Settings.jsx';
import Billing from './pages/Billing.jsx';
import AdminIssues from './pages/AdminIssues.jsx';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const RequireAuth = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
};

export default function App() {
  const [user, setUser] = useState(() => (session.token() ? session.user() || {} : null));
  const [account, setAccount] = useState(null);

  useEffect(() => {
    const onLogout = () => { setUser(null); setAccount(null); };
    window.addEventListener('nc-logout', onLogout);
    return () => window.removeEventListener('nc-logout', onLogout);
  }, []);

  // Plan and credit balance of the signed-in user
  const refreshAccount = useCallback(async () => {
    if (!session.token()) return null;
    try {
      const next = await api.account();
      setAccount(next);
      return next;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (user) refreshAccount();
  }, [user, refreshAccount]);

  const auth = {
    user,
    account,
    refreshAccount,
    setBalance(credits) {
      setAccount((a) => (a ? { ...a, credits } : a));
    },
    signIn(token, nextUser) {
      session.save(token, nextUser);
      setUser(nextUser || {});
    },
    signOut() {
      session.clear();
      setUser(null);
      setAccount(null);
    },
  };

  return (
    <AuthContext.Provider value={auth}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={user ? <Navigate to="/app" replace /> : <Login />} />
        <Route element={<Layout />}>
          <Route path="/app" element={<RequireAuth><Auditor /></RequireAuth>} />
          <Route path="/rules" element={<RulePack />} />
          <Route path="/history" element={<RequireAuth><History /></RequireAuth>} />
          <Route path="/history/:id" element={<RequireAuth><HistoryDetail /></RequireAuth>} />
          <Route path="/billing" element={<RequireAuth><Billing /></RequireAuth>} />
          <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
          <Route path="/admin/issues" element={<RequireAuth><AdminIssues /></RequireAuth>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthContext.Provider>
  );
}
