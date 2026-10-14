import { createContext, useContext, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { session } from './api.js';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Auditor from './pages/Auditor.jsx';
import RulePack from './pages/RulePack.jsx';
import History from './pages/History.jsx';
import HistoryDetail from './pages/HistoryDetail.jsx';

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

  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('nc-logout', onLogout);
    return () => window.removeEventListener('nc-logout', onLogout);
  }, []);

  const auth = {
    user,
    signIn(token, nextUser) {
      session.save(token, nextUser);
      setUser(nextUser || {});
    },
    signOut() {
      session.clear();
      setUser(null);
    },
  };

  return (
    <AuthContext.Provider value={auth}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route element={<Layout />}>
          <Route path="/" element={<RequireAuth><Auditor /></RequireAuth>} />
          <Route path="/rules" element={<RulePack />} />
          <Route path="/history" element={<RequireAuth><History /></RequireAuth>} />
          <Route path="/history/:id" element={<RequireAuth><HistoryDetail /></RequireAuth>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthContext.Provider>
  );
}
