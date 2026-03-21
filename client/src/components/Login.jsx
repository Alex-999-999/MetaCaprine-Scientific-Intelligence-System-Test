import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { useI18n } from '../i18n/I18nContext';
import { BRAND_ASSETS } from '../utils/assetCatalog';
import LanguageSwitcher from './LanguageSwitcher';
import ModernIcon from './icons/ModernIcon';

function Login({ onLogin }) {
  const { t, language } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [country, setCountry] = useState('');
  const [customCountry, setCustomCountry] = useState('');
  const [city, setCity] = useState('');
  const [goatsCount, setGoatsCount] = useState('');
  const [transformsProducts, setTransformsProducts] = useState('no');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [preferredCurrency, setPreferredCurrency] = useState('USD');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const locale = useMemo(() => {
    const map = { en: 'en', es: 'es', fr: 'fr', it: 'it', pt: 'pt' };
    return map[language] || 'en';
  }, [language]);

  const friendlyText = (es, en) => (language === 'es' ? es : en);

  const validateBeforeSubmit = () => {
    if (!email.trim()) {
      return friendlyText('Ingresa tu correo para continuar.', 'Please enter your email to continue.');
    }

    if (isForgotPassword) return '';

    if (!password.trim()) {
      return friendlyText('Ingresa tu contraseña para continuar.', 'Please enter your password to continue.');
    }

    if (!isRegister) return '';

    if (!name.trim()) return friendlyText('Completa tu nombre.', 'Please enter your first name.');
    if (!lastName.trim()) return friendlyText('Completa tu apellido.', 'Please enter your last name.');
    if (!country.trim()) return friendlyText('Selecciona tu país.', 'Please select your country.');
    if (country === '__other__' && !customCountry.trim()) {
      return friendlyText('Escribe tu país.', 'Please type your country.');
    }
    if (!city.trim()) return friendlyText('Ingresa tu ciudad.', 'Please enter your city.');
    if (goatsCount === '' || Number(goatsCount) < 0) {
      return friendlyText('Ingresa una cantidad válida de cabras.', 'Please enter a valid number of goats.');
    }
    if (!sex.trim()) return friendlyText('Selecciona el sexo.', 'Please select sex.');
    if (age === '' || Number(age) < 0) {
      return friendlyText('Ingresa una edad válida.', 'Please enter a valid age.');
    }
    if (!acceptedTerms) {
      return friendlyText(
        'Debes aceptar los términos y condiciones para crear tu cuenta.',
        'You must accept terms and conditions to create your account.'
      );
    }

    return '';
  };

  const countryOptions = useMemo(() => {
    const latamPriorityCodes = [
      'AR', // Argentina
      'BO', // Bolivia
      'BR', // Brazil
      'CL', // Chile
      'CO', // Colombia
      'CR', // Costa Rica
      'CU', // Cuba
      'DO', // Dominican Republic
      'EC', // Ecuador
      'SV', // El Salvador
      'GT', // Guatemala
      'HN', // Honduras
      'MX', // Mexico
      'NI', // Nicaragua
      'PA', // Panama
      'PY', // Paraguay
      'PE', // Peru
      'PR', // Puerto Rico
      'UY', // Uruguay
      'VE', // Venezuela
      'BZ', // Belize
      'GY', // Guyana
      'HT', // Haiti
      'JM', // Jamaica
      'SR', // Suriname
      'TT', // Trinidad and Tobago
      'BS', // Bahamas
      'BB', // Barbados
      'AG', // Antigua and Barbuda
      'DM', // Dominica
      'GD', // Grenada
      'KN', // Saint Kitts and Nevis
      'LC', // Saint Lucia
      'VC', // Saint Vincent and the Grenadines
    ];

    const prioritizeLatam = (options) => {
      const byCode = new Map(options.map((option) => [option.code, option]));
      const prioritized = latamPriorityCodes
        .map((countryCode) => byCode.get(countryCode))
        .filter(Boolean);
      const prioritizedValues = new Set(prioritized.map((option) => option.value));
      const remaining = options.filter((option) => !prioritizedValues.has(option.value));
      return [...prioritized, ...remaining];
    };

    const fallbackCountries = [
      { code: 'AG', value: 'Antigua and Barbuda', label: 'Antigua and Barbuda' },
      { code: 'AR', value: 'Argentina', label: 'Argentina' },
      { code: 'BS', value: 'Bahamas', label: 'Bahamas' },
      { code: 'BB', value: 'Barbados', label: 'Barbados' },
      { code: 'BZ', value: 'Belize', label: 'Belize' },
      { code: 'BO', value: 'Bolivia', label: 'Bolivia' },
      { code: 'BR', value: 'Brazil', label: 'Brazil' },
      { code: 'DM', value: 'Dominica', label: 'Dominica' },
      { code: 'CA', value: 'Canada', label: 'Canada' },
      { code: 'CL', value: 'Chile', label: 'Chile' },
      { code: 'CO', value: 'Colombia', label: 'Colombia' },
      { code: 'CR', value: 'Costa Rica', label: 'Costa Rica' },
      { code: 'CU', value: 'Cuba', label: 'Cuba' },
      { code: 'DO', value: 'Dominican Republic', label: 'Dominican Republic' },
      { code: 'EC', value: 'Ecuador', label: 'Ecuador' },
      { code: 'SV', value: 'El Salvador', label: 'El Salvador' },
      { code: 'FR', value: 'France', label: 'France' },
      { code: 'DE', value: 'Germany', label: 'Germany' },
      { code: 'GD', value: 'Grenada', label: 'Grenada' },
      { code: 'GT', value: 'Guatemala', label: 'Guatemala' },
      { code: 'GY', value: 'Guyana', label: 'Guyana' },
      { code: 'HT', value: 'Haiti', label: 'Haiti' },
      { code: 'HN', value: 'Honduras', label: 'Honduras' },
      { code: 'IT', value: 'Italy', label: 'Italy' },
      { code: 'JM', value: 'Jamaica', label: 'Jamaica' },
      { code: 'KN', value: 'Saint Kitts and Nevis', label: 'Saint Kitts and Nevis' },
      { code: 'LC', value: 'Saint Lucia', label: 'Saint Lucia' },
      { code: 'MX', value: 'Mexico', label: 'Mexico' },
      { code: 'NI', value: 'Nicaragua', label: 'Nicaragua' },
      { code: 'PA', value: 'Panama', label: 'Panama' },
      { code: 'PY', value: 'Paraguay', label: 'Paraguay' },
      { code: 'PE', value: 'Peru', label: 'Peru' },
      { code: 'PT', value: 'Portugal', label: 'Portugal' },
      { code: 'PR', value: 'Puerto Rico', label: 'Puerto Rico' },
      { code: 'ES', value: 'Spain', label: 'Spain' },
      { code: 'SR', value: 'Suriname', label: 'Suriname' },
      { code: 'TT', value: 'Trinidad and Tobago', label: 'Trinidad and Tobago' },
      { code: 'GB', value: 'United Kingdom', label: 'United Kingdom' },
      { code: 'US', value: 'United States', label: 'United States' },
      { code: 'UY', value: 'Uruguay', label: 'Uruguay' },
      { code: 'VE', value: 'Venezuela', label: 'Venezuela' },
      { code: 'VC', value: 'Saint Vincent and the Grenadines', label: 'Saint Vincent and the Grenadines' },
    ];

    if (
      typeof Intl === 'undefined' ||
      typeof Intl.DisplayNames !== 'function' ||
      typeof Intl.supportedValuesOf !== 'function'
    ) {
      return prioritizeLatam(fallbackCountries);
    }

    try {
      const englishNames = new Intl.DisplayNames(['en'], { type: 'region' });
      const localizedNames = new Intl.DisplayNames([locale], { type: 'region' });
      const codes = Intl.supportedValuesOf('region').filter((code) => code.length === 2);
      const options = codes
        .map((code) => {
          const value = englishNames.of(code) || code;
          return {
            code,
            value,
            label: localizedNames.of(code) || value,
          };
        })
        .sort((a, b) => a.label.localeCompare(b.label, locale));
      return options.length ? prioritizeLatam(options) : prioritizeLatam(fallbackCountries);
    } catch {
      return prioritizeLatam(fallbackCountries);
    }
  }, [locale]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validationMessage = validateBeforeSubmit();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setLoading(true);

    try {
      const endpoint = isForgotPassword ? '/auth/forgot-password' : isRegister ? '/auth/register' : '/auth/login';
      const payload = isForgotPassword
        ? { email }
        : isRegister
          ? {
              email,
              password,
              name,
              last_name: lastName,
              country: country === '__other__' ? customCountry.trim() : country,
              city,
              goats_count: goatsCount,
              transforms_products: transformsProducts === 'yes',
              age,
              sex,
              preferred_currency: preferredCurrency,
              accepted_terms: acceptedTerms,
              accepted_terms_version: 'hito2-v1',
            }
          : { email, password };

      const response = await api.post(endpoint, payload);
      
      if (isForgotPassword) {
        setSuccess(response.data.message || t('forgotPasswordEmailSent'));
      } else if (isRegister) {
        // Show success message for registration
        setSuccess(response.data.message || t('registerSuccessVerifyEmail'));
        // Don't auto-login, let user verify email first
        setTimeout(() => {
          setIsRegister(false);
          setIsForgotPassword(false);
          setSuccess('');
        }, 5000);
      } else {
        // Login - check email verification
        const user = response.data.user;
        if (!user.email_verified) {
          setError(t('verifyEmailBeforeLogin'));
          return;
        }
        onLogin(user, response.data.token);
        navigate('/dashboard');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || t('loginError');
      setError(typeof errorMessage === 'string' ? errorMessage : t('loginError'));
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-header">
        <Link to="/" className="login-logo-link">
          <div className="login-logo-container">
            <img src={BRAND_ASSETS.logo} alt="Livestock Simulators Logo" className="login-logo-image" />
          </div>
          <h1 className="login-title">{t('appTitle')}</h1>
        </Link>
        <div className="login-language-switcher">
          <LanguageSwitcher className="login-language-menu" />
        </div>
      </div>

      <div className="login-form-wrapper">
        <div className="login-card">
          <div className="login-card-header">
            <h2 className="login-card-title">
              {isForgotPassword ? (t('forgotPassword')) : isRegister ? t('register') : t('login')}
            </h2>
            <p className="login-card-subtitle">
              {isForgotPassword
                ? (t('forgotPasswordSubtitle'))
                : isRegister 
                ? (t('registerSubtitle'))
                : (t('loginSubtitle'))
              }
            </p>
          </div>

          {error && (
            <div className="login-error-message">
              {error}
            </div>
          )}

          {success && (
            <div style={{
              padding: '12px 16px',
              background: 'rgba(22, 163, 74, 0.1)',
              border: '1px solid var(--accent-success)',
              borderRadius: '8px',
              color: 'var(--accent-success)',
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <ModernIcon name="checkCircle" size={16} />
                {success}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            {isRegister && (
              <>
                <div className="form-group">
                  <label>{t('name')}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('name')}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="form-group">
                  <label>{t('lastName')}</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder={t('lastName')}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="form-group">
                  <label>{t('country')}</label>
                  <select
                    value={country}
                    onChange={(e) => {
                      const nextCountry = e.target.value;
                      setCountry(nextCountry);
                      if (nextCountry !== '__other__') {
                        setCustomCountry('');
                      }
                    }}
                    required
                    disabled={loading}
                  >
                    <option value="">{t('selectCountry')}</option>
                    {countryOptions.map((countryOption) => (
                      <option key={countryOption.code} value={countryOption.value}>
                        {countryOption.label}
                      </option>
                    ))}
                    <option value="__other__">{t('countryOtherOption')}</option>
                  </select>
                </div>
                {country === '__other__' && (
                  <div className="form-group">
                    <label>{t('specifyCountry')}</label>
                    <input
                      type="text"
                      value={customCountry}
                      onChange={(e) => setCustomCountry(e.target.value)}
                      placeholder={t('specifyCountry')}
                      required
                      disabled={loading}
                    />
                  </div>
                )}
                <div className="form-group">
                  <label>{t('city')}</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder={t('city')}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="form-group">
                  <label>{t('goatsCount')}</label>
                  <input
                    type="number"
                    min="0"
                    value={goatsCount}
                    onChange={(e) => setGoatsCount(e.target.value)}
                    placeholder={t('goatsCount')}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="form-group">
                  <label>{t('transformsProducts')}</label>
                  <select
                    value={transformsProducts}
                    onChange={(e) => setTransformsProducts(e.target.value)}
                    disabled={loading}
                  >
                    <option value="no">{t('no')}</option>
                    <option value="yes">{t('yes')}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>{t('age')}</label>
                  <input
                    type="number"
                    min="0"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder={t('age')}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="form-group">
                  <label>{t('sex')}</label>
                  <select
                    value={sex}
                    onChange={(e) => setSex(e.target.value)}
                    required
                    disabled={loading}
                  >
                    <option value="">{t('selectSex')}</option>
                    <option value="female">{t('female')}</option>
                    <option value="male">{t('male')}</option>
                    <option value="other">{t('otherOption')}</option>
                    <option value="prefer_not_to_say">{t('preferNotToSay')}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>{t('preferredCurrency')}</label>
                  <select
                    value={preferredCurrency}
                    onChange={(e) => setPreferredCurrency(e.target.value)}
                    disabled={loading}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="CAD">CAD</option>
                    <option value="MXN">MXN</option>
                    <option value="COP">COP</option>
                    <option value="ARS">ARS</option>
                    <option value="CLP">CLP</option>
                    <option value="PEN">PEN</option>
                    <option value="BRL">BRL</option>
                    <option value="UYU">UYU</option>
                  </select>
                </div>
              </>
            )}

            <div className="form-group">
              <label>{t('email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('email')}
                required
                disabled={loading}
              />
            </div>

            {!isForgotPassword && (
            <div className="form-group">
              <label>{t('password')}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('password')}
                  required
                  disabled={loading}
                  style={{ paddingRight: '45px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.2em',
                    padding: '5px',
                    color: 'var(--accent-success)',
                  }}
                  disabled={loading}
                  title={showPassword ? t('hidePassword') : t('showPassword')}
                >
                  <ModernIcon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
                </button>
              </div>
            </div>
            )}

            {isRegister && (
              <label className="terms-checkbox-label">
                <input
                  type="checkbox"
                  className="terms-checkbox-input"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  disabled={loading}
                  required
                />
                <span>{t('onboardingAgreeTerms')}</span>
              </label>
            )}

            <button
              type="submit"
              className="btn btn-primary login-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <span className="login-loading">
                  <span className="login-spinner"></span>
                  {isForgotPassword ? (t('sending')) : isRegister ? t('registering') : t('signingIn')}
                </span>
              ) : (
                isForgotPassword ? (t('sendResetLink')) : isRegister ? t('register') : t('login')
              )}
            </button>
          </form>

          <div className="login-card-footer">
            <button
              type="button"
              className="login-toggle-btn"
              onClick={() => {
                setIsRegister(!isRegister);
                setIsForgotPassword(false);
                setError('');
                setEmail('');
                setPassword('');
                setName('');
                setLastName('');
                setCountry('');
                setCustomCountry('');
                setCity('');
                setGoatsCount('');
                setTransformsProducts('no');
                setAge('');
                setSex('');
                setPreferredCurrency('USD');
                setAcceptedTerms(false);
              }}
              disabled={loading}
            >
              {isRegister ? t('alreadyHaveAccount') : t('noAccount')}
            </button>
            {!isRegister && (
              <button
                type="button"
                className="login-toggle-btn"
                onClick={() => {
                  setIsForgotPassword(!isForgotPassword);
                  setIsRegister(false);
                  setError('');
                  setSuccess('');
                  setPassword('');
                }}
                disabled={loading}
              >
                {isForgotPassword ? (t('backToLogin')) : (t('forgotPassword'))}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;


