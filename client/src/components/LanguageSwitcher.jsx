import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/I18nContext';

const LANGUAGES = [
  { value: 'es', label: 'Espanol' },
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Francais' },
  { value: 'it', label: 'Italiano' },
  { value: 'pt', label: 'Portugues' },
];

function LanguageSwitcher({ className = '' }) {
  const { language, changeLanguage } = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const activeCode = (language || 'en').toUpperCase();

  useEffect(() => {
    const onDocumentClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onDocumentClick);
    return () => document.removeEventListener('mousedown', onDocumentClick);
  }, []);

  return (
    <div className={`language-menu ${className}`.trim()} ref={containerRef}>
      <button
        type="button"
        className="language-menu-trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        title="Select language"
      >
        <span className="language-menu-icon" aria-hidden="true">
          <svg
            className="language-menu-icon-svg"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
            <path d="M3.8 9H20.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M3.8 15H20.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M12 3C9.2 6 9.2 18 12 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M12 3C14.8 6 14.8 18 12 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <span className="language-menu-code">{activeCode}</span>
      </button>
      {open && (
        <div className="language-menu-dropdown" role="menu">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.value}
              type="button"
              role="menuitemradio"
              aria-checked={language === lang.value}
              className={`language-menu-item ${language === lang.value ? 'active' : ''}`}
              onClick={() => {
                changeLanguage(lang.value);
                setOpen(false);
              }}
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default LanguageSwitcher;
