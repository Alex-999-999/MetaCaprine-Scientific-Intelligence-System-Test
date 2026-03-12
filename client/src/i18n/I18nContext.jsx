import { createContext, useContext, useState, useEffect } from 'react';
import { translations } from './translations';

const I18nContext = createContext();

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

export const I18nProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    // Get language from localStorage or default to Spanish
    const savedLanguage = localStorage.getItem('language');
    return savedLanguage || 'es';
  });

  useEffect(() => {
    // Save language preference to localStorage
    localStorage.setItem('language', language);
  }, [language]);

  const getNestedValue = (obj, keys) => {
    let value = obj;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return undefined;
      }
    }
    return value;
  };

  const interpolateParams = (value, params) => {
    if (typeof value !== 'string' || !params) return value;

    // Support both {param} and {{param}} placeholder formats.
    return value.replace(/\{\{(\w+)\}\}|\{(\w+)\}/g, (match, paramKey1, paramKey2) => {
      const paramKey = paramKey1 || paramKey2;
      return params[paramKey] !== undefined ? params[paramKey] : match;
    });
  };

  const t = (key, params = {}) => {
    const keys = key.split('.');
    const localizedValue = getNestedValue(translations[language], keys);
    const fallbackValue = getNestedValue(translations.en, keys);
    const value = localizedValue ?? fallbackValue;

    if (value === undefined || value === null) {
      return key;
    }

    return interpolateParams(value, params) || key;
  };

  const changeLanguage = (lang) => {
    if (translations[lang]) {
      setLanguage(lang);
    }
  };

  return (
    <I18nContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};
