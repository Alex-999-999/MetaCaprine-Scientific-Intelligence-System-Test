import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { I18nProvider, useI18n } from './i18n/I18nContext';
import Layout from './components/Layout';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import ResetPassword from './components/ResetPassword';
import Module1Production from './components/modules/Module1Production';
import Module2Transformation from './components/modules/Module2Transformation';
import Module3Lactation from './components/modules/Module3Lactation';
import Module4Investment from './components/modules/Module4Investment';
import Module5Gestation from './components/modules/Module5Gestation';
import VerifyEmail from './components/VerifyEmail';
import { AboutPage, ContactPage, PrivacyPage, TermsPage } from './components/FooterLegalPages';
import { getAuthToken, setAuthToken, removeAuthToken, getUser, setUser as saveUserToStorage } from './utils/auth';
import api from './utils/api';

function AppContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();

  useEffect(() => {
    const fetchUserData = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          // Fetch fresh user data from backend
          const response = await api.get('/auth/me');
          const userData = response.data.user;
          const userWithToken = { ...userData, token };
          setUser(userWithToken);
          saveUserToStorage(userWithToken);
        } catch (error) {
          console.error('Error fetching user data:', error);
          const status = error?.response?.status;
          const rawError = String(error?.response?.data?.error || error?.response?.data?.message || '').toLowerCase();
          const isInvalidSessionError =
            status === 401 ||
            (status === 403 && (
              rawError.includes('invalid or expired token') ||
              rawError.includes('access token required') ||
              rawError.includes('authentication required')
            ));

          if (isInvalidSessionError) {
            removeAuthToken();
            setUser(null);
          } else {
            // Fallback to cached user only if a token still exists.
            const savedUser = getUser();
            const currentToken = getAuthToken();
            if (savedUser && currentToken) {
              setUser(savedUser);
            } else {
              removeAuthToken();
              setUser(null);
            }
          }
        }
      }
      setLoading(false);
    };

    fetchUserData();
  }, []);

  const handleLogin = (userData, token) => {
    setAuthToken(token);
    const userWithToken = { ...userData, token };
    setUser(userWithToken);
    saveUserToStorage(userWithToken);
  };

  const handleUserUpdate = (updatedUser) => {
    const userWithToken = { ...updatedUser, token: updatedUser.token || getAuthToken() };
    setUser(userWithToken);
    saveUserToStorage(userWithToken);
  };

  const handleLogout = () => {
    removeAuthToken();
    setUser(null);
  };

  if (loading) {
    return (
      <Layout user={user} onLogout={handleLogout}>
        <div className="container">{t('loading')}</div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={handleLogout}>
      <Routes>
        <Route
          path="/login"
          element={
            user ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />
          }
        />
        <Route
          path="/verify-email"
          element={<VerifyEmail />}
        />
        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />
        <Route
          path="/dashboard"
          element={
            user ? (
              <Dashboard user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/module1"
          element={
            user ? (
              <Module1Production user={user} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/module2"
          element={
            user ? (
              <Module2Transformation user={user} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/module3"
          element={
            user ? (
              <Module3Lactation user={user} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/module4"
          element={
            user ? (
              <Module4Investment user={user} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/module5"
          element={
            user ? (
              <Module5Gestation user={user} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/profile"
          element={
            user ? (
              <Profile user={user} onUserUpdate={handleUserUpdate} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <I18nProvider>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AppContent />
      </Router>
    </I18nProvider>
  );
}

export default App;
