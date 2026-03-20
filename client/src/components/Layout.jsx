import { useState, useEffect, useRef } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getAuthToken } from '../utils/auth';
import { getAvatar } from '../utils/avatar';
import { BRAND_ASSETS } from '../utils/assetCatalog';
import OnboardingModal from './OnboardingModal';
import LanguageSwitcher from './LanguageSwitcher';

function Sidebar({ user, onLogout }) {
  const { t } = useI18n();
  const location = useLocation();
  const isAuthenticated = !!getAuthToken();

  if (!isAuthenticated) return null;

  const NavIcon = ({ children }) => (
    <svg
      className="nav-icon-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );

  const menuItems = [
    {
      path: '/dashboard',
      icon: (
        <NavIcon>
          <path d="M3 20h18" />
          <path d="M6 20v-9" />
          <path d="M12 20V6" />
          <path d="M18 20v-5" />
        </NavIcon>
      ),
      label: t('dashboard')
    },
    {
      path: '/module1',
      icon: (
        <NavIcon>
          <path d="M12 3C9.5 6.6 7.5 9.2 7.5 12.8a4.5 4.5 0 1 0 9 0C16.5 9.2 14.5 6.6 12 3Z" />
          <path d="M10.2 14.2a2.4 2.4 0 0 0 3.6 0" />
        </NavIcon>
      ),
      label: `M1 - ${t('moduleTypes.milk_sale')}`
    },
    {
      path: '/module2',
      icon: (
        <NavIcon>
          <path d="m12 3 8 4.5-8 4.5-8-4.5L12 3Z" />
          <path d="M4 7.5V16.5L12 21l8-4.5V7.5" />
          <path d="M12 12v9" />
        </NavIcon>
      ),
      label: `M2 - ${t('moduleTypes.transformation')}`
    },
    {
      path: '/module3',
      icon: (
        <NavIcon>
          <path d="M3 12h4l2.5-5 5 10 2.5-5H21" />
        </NavIcon>
      ),
      label: `M3 - ${t('moduleTypes.lactation')}`,
    },
    {
      path: '/module4',
      icon: (
        <NavIcon>
          <path d="M3 20h18" />
          <path d="M4 16l5-5 4 3 7-8" />
        </NavIcon>
      ),
      label: t('sidebarConversionYield')
    },
    {
      path: '/module5',
      icon: (
        <NavIcon>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M3 10h18" />
          <path d="M8 14h3M13 14h3M8 18h3" />
        </NavIcon>
      ),
      label: t('sidebarPredictiveGestation')
    },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Link to="/dashboard" className="logo-link">
          <div className="logo-container">
            <img src={BRAND_ASSETS.logo} alt="MetaCaprine Logo" className="logo-image" />
          </div>
          <h1 className="site-title">{t('appTitle')}</h1>
        </Link>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-text">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function Settings({ showSidebar, setShowSidebar, showFooter, setShowFooter, darkMode, setDarkMode }) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const settingsRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="settings-container" ref={settingsRef}>
      <button
        className="settings-button"
        onClick={() => setIsOpen(!isOpen)}
        title={t('settings')}
      >
        <svg
          className="settings-icon-svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="12" cy="12" r="3.2" />
          <path d="M19.4 12a7.4 7.4 0 0 0-.06-.94l2.03-1.58-1.9-3.28-2.47.74a7.9 7.9 0 0 0-1.64-.95L15 3h-6l-.36 2.99c-.58.22-1.13.53-1.64.95l-2.47-.74-1.9 3.28 2.03 1.58a7.4 7.4 0 0 0 0 1.88L2.63 14.5l1.9 3.28 2.47-.74c.51.42 1.06.73 1.64.95L9 21h6l.36-2.99c.58-.22 1.13-.53 1.64-.95l2.47.74 1.9-3.28-2.03-1.56c.04-.31.06-.63.06-.96Z" />
        </svg>
      </button>
      {isOpen && (
        <div className="settings-dropdown">
          <div className="settings-header">
            <h3>{t('settings')}</h3>
          </div>
          <div className="settings-content">
            <div className="settings-item">
              <label className="settings-label">
                <span>{t('showSidebar')}</span>
                <div className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={showSidebar}
                    onChange={(e) => setShowSidebar(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </div>
              </label>
            </div>
            <div className="settings-item">
              <label className="settings-label">
                <span>{t('showFooter')}</span>
                <div className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={showFooter}
                    onChange={(e) => setShowFooter(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </div>
              </label>
            </div>
            <div className="settings-item">
              <label className="settings-label">
                <span>{t('darkMode')}</span>
                <div className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={darkMode}
                    onChange={(e) => setDarkMode(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UserAvatar({ user, onLogout }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [avatar, setAvatar] = useState(getAvatar());
  const avatarRef = useRef(null);

  // Update avatar when localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      setAvatar(getAvatar());
    };

    // Listen for storage events (when avatar is updated in Profile)
    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically (for same-tab updates)
    const interval = setInterval(() => {
      const currentAvatar = getAvatar();
      if (currentAvatar !== avatar) {
        setAvatar(currentAvatar);
      }
    }, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [avatar]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (avatarRef.current && !avatarRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleProfileClick = () => {
    setIsOpen(false);
    navigate('/profile');
  };

  const handleLogoutClick = () => {
    setIsOpen(false);
    onLogout();
  };

  return (
    <div className="user-avatar-container" ref={avatarRef}>
      <button
        className="user-avatar-button"
        onClick={() => setIsOpen(!isOpen)}
        title={user?.name || user?.email}
      >
        {avatar ? (
          <img src={avatar} alt="Avatar" className="user-avatar-image" />
        ) : (
          <div className="user-avatar-placeholder">
            {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
          </div>
        )}
      </button>
      {isOpen && (
        <div className="user-avatar-dropdown">
          <div className="avatar-dropdown-header">
            <div className="avatar-dropdown-avatar">
              {avatar ? (
                <img src={avatar} alt="Avatar" className="avatar-dropdown-image" />
              ) : (
                <div className="avatar-dropdown-placeholder">
                  {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="avatar-dropdown-info">
              <div className="avatar-dropdown-name">{user?.name || t('defaultUserName')}</div>
              <div className="avatar-dropdown-email">{user?.email}</div>
            </div>
          </div>
          <div className="avatar-dropdown-divider"></div>
          <button className="avatar-dropdown-item" onClick={handleProfileClick}>
            <span className="avatar-dropdown-icon">ðŸ‘¤</span>
            <span>{t('profile')}</span>
          </button>
          <button className="avatar-dropdown-item avatar-dropdown-item-danger" onClick={handleLogoutClick}>
            <span className="avatar-dropdown-icon">ðŸšª</span>
            <span>{t('logout')}</span>
          </button>
        </div>
      )}
    </div>
  );
}

function Header({ user, onLogout, showSidebar, setShowSidebar, showFooter, setShowFooter, darkMode, setDarkMode }) {
  const { t } = useI18n();
  const isAuthenticated = !!getAuthToken();
  const hasSidebar = isAuthenticated && showSidebar;

  return (
    <header className="site-header">
      <div className="header-content">
        <div className="header-left">
          {!hasSidebar && (
            <Link to="/dashboard" className="logo-link">
              <div className="logo-container">
                <img src={BRAND_ASSETS.logo} alt="MetaCaprine Logo" className="logo-image" />
              </div>
            </Link>
          )}
        </div>
        <nav className="header-nav">
          {isAuthenticated && !hasSidebar && (
            <>
              <Link to="/dashboard" className="nav-link">
                {t('dashboard')}
              </Link>
            </>
          )}
        </nav>
        <div className="header-right">
          <LanguageSwitcher className="header-language-menu" />
          {isAuthenticated && (
            <>
              <Settings
                showSidebar={showSidebar}
                setShowSidebar={setShowSidebar}
                showFooter={showFooter}
                setShowFooter={setShowFooter}
                darkMode={darkMode}
                setDarkMode={setDarkMode}
              />
              <UserAvatar user={user} onLogout={onLogout} />
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Footer() {
  const { t } = useI18n();

  return (
    <footer className="site-footer">
      <div className="footer-content">
        <div className="footer-section">
          <p className="footer-text">{t('footerText')}</p>
        </div>
        <div className="footer-links">
          <Link to="/about" className="footer-link">{t('about')}</Link>
          <Link to="/contact" className="footer-link">{t('contact')}</Link>
          <Link to="/privacy" className="footer-link">{t('privacy')}</Link>
          <Link to="/terms" className="footer-link">{t('terms')}</Link>
        </div>
      </div>
    </footer>
  );
}

function Layout({ children, user, onLogout }) {
  const isAuthenticated = !!getAuthToken();
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  
  // Load settings from localStorage
  const [showSidebar, setShowSidebar] = useState(() => {
    const saved = localStorage.getItem('showSidebar');
    return saved !== null ? saved === 'true' : true; // Default to true
  });
  
  const [showFooter, setShowFooter] = useState(() => {
    const saved = localStorage.getItem('showFooter');
    return saved !== null ? saved === 'true' : true; // Default to true
  });

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved !== null ? saved === 'true' : false; // Default to false (light mode)
  });

  // Onboarding modal state
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Check if user needs onboarding on mount
  useEffect(() => {
    if (isAuthenticated && user) {
      const onboardingCompleted = localStorage.getItem(`onboarding_completed_${user.id}`);
      if (!onboardingCompleted) {
        setShowOnboarding(true);
      }
    }
  }, [isAuthenticated, user]);

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('showSidebar', showSidebar.toString());
  }, [showSidebar]);

  useEffect(() => {
    localStorage.setItem('showFooter', showFooter.toString());
  }, [showFooter]);

  // Apply theme to document root on mount and when it changes
  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString());
    if (darkMode) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  }, [darkMode]);

  // Initialize theme on mount
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'true') {
      document.documentElement.classList.add('dark-mode');
    }
  }, []);

  // Adjust grid layout based on sidebar and footer visibility
  let gridClass = isAuthenticated 
    ? showSidebar 
      ? 'site-wrapper with-sidebar' 
      : 'site-wrapper without-sidebar'
    : 'site-wrapper';
  
  if (!showFooter) {
    gridClass += ' no-footer';
  }
  
  if (isAuthenticated) {
    return (
      <>
        <div className={gridClass}>
          {showSidebar && <Sidebar user={user} onLogout={onLogout} />}
          <Header 
            user={user} 
            onLogout={onLogout}
            showSidebar={showSidebar}
            setShowSidebar={setShowSidebar}
            showFooter={showFooter}
            setShowFooter={setShowFooter}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
          />
          <main className="site-main">
            {children}
          </main>
          {showFooter && <Footer />}
        </div>
        {showOnboarding && (
          <OnboardingModal 
            user={user} 
            onClose={() => setShowOnboarding(false)} 
          />
        )}
      </>
    );
  }
  
  // For login/registration page, don't show header and footer
  if (isLoginPage) {
    return (
      <div className="site-wrapper login-page">
        <main className="site-main">
          {children}
        </main>
      </div>
    );
  }
  
  return (
    <div className="site-wrapper">
      <Header 
        user={user} 
        onLogout={onLogout}
        showSidebar={showSidebar}
        setShowSidebar={setShowSidebar}
        showFooter={showFooter}
        setShowFooter={setShowFooter}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />
      <main className="site-main">
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  );
}

export default Layout;


