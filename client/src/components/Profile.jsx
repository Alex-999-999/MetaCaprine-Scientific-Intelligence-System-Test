import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { getAvatar, saveAvatar } from '../utils/avatar';
import api from '../utils/api';

function Profile({ user, onUserUpdate }) {
  const { t } = useI18n();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [country, setCountry] = useState(user?.country || '');
  const [city, setCity] = useState(user?.city || '');
  const [goatsCount, setGoatsCount] = useState(user?.goats_count || '');
  const [transformsProducts, setTransformsProducts] = useState(user?.transforms_products ? 'yes' : 'no');
  const [age, setAge] = useState(user?.age || '');
  const [sex, setSex] = useState(user?.sex || '');
  const [preferredCurrency, setPreferredCurrency] = useState(user?.preferred_currency || 'USD');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatar, setAvatar] = useState(getAvatar() || null);
  const [loading, setLoading] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [billingStatus, setBillingStatus] = useState({
    configured: false,
    checkout_ready: false,
    has_paid_access: false,
    can_manage_billing: false,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [billingNotice, setBillingNotice] = useState('');

  const hasProAccess = ['pro', 'pro_user', 'premium', 'admin'].includes(user?.role) || (user?.features || []).includes('module2');
  const canManageBilling = hasProAccess || billingStatus.has_paid_access;

  const getBillingErrorMessage = (billingError) => {
    const apiMessage = billingError?.response?.data?.error;
    const rawMessage = String(apiMessage || billingError?.message || '').toLowerCase();

    if (
      rawMessage.includes('missing stripe_secret_key') ||
      rawMessage.includes('missing stripe_price_pro_monthly')
    ) {
      return t('billingUnavailable');
    }

    if (rawMessage.includes('could not start checkout') || rawMessage.includes('could not open billing portal')) {
      return t('billingActionFailed');
    }

    return t('billingActionFailed');
  };

  const loadBillingStatus = async () => {
    try {
      const response = await api.get('/billing/status');
      setBillingStatus(response.data || {});
    } catch (billingError) {
      console.error('Error fetching billing status:', billingError);
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await api.get('/auth/me');
        const userData = response.data.user;
        setName(userData.name || '');
        setEmail(userData.email || '');
        setLastName(userData.last_name || '');
        setCountry(userData.country || '');
        setCity(userData.city || '');
        setGoatsCount(userData.goats_count || '');
        setTransformsProducts(userData.transforms_products ? 'yes' : 'no');
        setAge(userData.age || '');
        setSex(userData.sex || '');
        setPreferredCurrency(userData.preferred_currency || 'USD');
        onUserUpdate({ ...user, ...userData });
      } catch (fetchError) {
        console.error('Error fetching user data:', fetchError);
      } finally {
        await loadBillingStatus();
        setFetching(false);
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const billingState = params.get('billing');
    if (!billingState) return;

    const applyBillingState = async () => {
      setError('');
      setSuccess('');

      if (billingState === 'success') {
        setBillingNotice(t('billingReturnSuccess'));
        await loadBillingStatus();
      } else if (billingState === 'cancelled') {
        setBillingNotice(t('billingReturnCancelled'));
      } else {
        setBillingNotice(t('billingReturnUnknown'));
      }

      params.delete('billing');
      const nextQuery = params.toString();
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash || ''}`;
      window.history.replaceState({}, '', nextUrl);
    };

    applyBillingState();
  }, [t]);

  useEffect(() => {
    setName(user?.name || '');
    setEmail(user?.email || '');
    setLastName(user?.last_name || '');
    setCountry(user?.country || '');
    setCity(user?.city || '');
    setGoatsCount(user?.goats_count || '');
    setTransformsProducts(user?.transforms_products ? 'yes' : 'no');
    setAge(user?.age || '');
    setSex(user?.sex || '');
    setPreferredCurrency(user?.preferred_currency || 'USD');
    setAvatar(getAvatar() || null);
  }, [user]);

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError(t('avatarSizeError'));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      setAvatar(base64String);
      saveAvatar(base64String);
      setSuccess(t('avatarUpdated'));
      setTimeout(() => setSuccess(''), 3000);
    };
    reader.readAsDataURL(file);
  };

  const handleProfileUpdate = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await api.put('/auth/profile', {
        name,
        last_name: lastName,
        country,
        city,
        goats_count: goatsCount,
        transforms_products: transformsProducts === 'yes',
        age,
        sex,
        preferred_currency: preferredCurrency,
      });
      onUserUpdate(response.data.user);
      setSuccess(t('nameUpdated'));
      setTimeout(() => setSuccess(''), 3000);
    } catch (updateError) {
      setError(updateError.response?.data?.error || updateError.message || t('updateError'));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }

    if (newPassword.length < 6) {
      setError(t('passwordLengthError'));
      return;
    }

    setLoading(true);
    try {
      const response = await api.put('/auth/password', {
        currentPassword,
        newPassword,
      });
      setSuccess(response.data.message || t('passwordUpdated'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (updateError) {
      setError(updateError.response?.data?.error || updateError.message || t('updateError'));
    } finally {
      setLoading(false);
    }
  };

  const handleBillingAction = async () => {
    setError('');
    setSuccess('');
    setBillingNotice('');
    setBillingLoading(true);

    try {
      const origin = window.location.origin;

      if (canManageBilling) {
        setSuccess(t('openingBillingPortal'));
        const response = await api.post('/billing/create-portal-session', {
          returnUrl: `${origin}/profile`,
        });
        if (!response.data?.url) {
          throw new Error(t('billingActionFailed'));
        }
        window.location.assign(response.data.url);
        return;
      }

      if (!billingStatus.checkout_ready) {
        setError(t('billingUnavailable'));
        return;
      }

      setSuccess(t('redirectingToCheckout'));
      const response = await api.post('/billing/create-checkout-session', {
        successUrl: `${origin}/profile?billing=success`,
        cancelUrl: `${origin}/profile?billing=cancelled`,
      });

      if (!response.data?.url) {
        throw new Error(t('billingActionFailed'));
      }

      window.location.assign(response.data.url);
    } catch (billingError) {
      setError(getBillingErrorMessage(billingError));
    } finally {
      setBillingLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">{t('profile')}</h1>
          <p className="page-subtitle">{t('manageProfile')}</p>
        </div>
      </div>

      <div className="profile-content">
        <div className="card">
          <h2 className="card-section-title">{t('profilePicture')}</h2>
          <div className="avatar-section">
            <div className="avatar-preview">
              {avatar ? (
                <img src={avatar} alt={t('avatarAlt')} className="avatar-image-large" />
              ) : (
                <div className="avatar-placeholder-large">
                  {(user?.name || user?.email || t('defaultUserInitial')).charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="avatar-upload">
              <label htmlFor="avatar-upload" className="btn btn-primary">
                {t('uploadAvatar')}
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
              />
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setAvatar(null);
                  saveAvatar(null);
                  setSuccess(t('avatarRemoved'));
                  setTimeout(() => setSuccess(''), 3000);
                }}
                disabled={!avatar}
              >
                {t('removeAvatar')}
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="card-section-title">{t('userInformation')}</h2>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <form onSubmit={handleProfileUpdate}>
            <div className="form-group">
              <label htmlFor="email">{t('email')}</label>
              <input
                id="email"
                type="email"
                value={fetching ? '' : email}
                disabled
                className="form-input"
                placeholder={fetching ? t('loading') : ''}
                style={{ backgroundColor: 'var(--bg-tertiary)', cursor: 'not-allowed' }}
              />
              <small className="form-hint">{t('emailCannotChange')}</small>
            </div>

            <div className="form-group">
              <label>{t('name')}</label>
              <input type="text" value={name} onChange={(event) => setName(event.target.value)} className="form-input" required />
            </div>

            <div className="form-group">
              <label>{t('lastName')}</label>
              <input type="text" value={lastName} onChange={(event) => setLastName(event.target.value)} className="form-input" />
            </div>

            <div className="form-group">
              <label>{t('country')}</label>
              <input type="text" value={country} onChange={(event) => setCountry(event.target.value)} className="form-input" />
            </div>

            <div className="form-group">
              <label>{t('city')}</label>
              <input type="text" value={city} onChange={(event) => setCity(event.target.value)} className="form-input" />
            </div>

            <div className="form-group">
              <label>{t('goatsCount')}</label>
              <input type="number" min="0" value={goatsCount} onChange={(event) => setGoatsCount(event.target.value)} className="form-input" />
            </div>

            <div className="form-group">
              <label>{t('transformsProducts')}</label>
              <select value={transformsProducts} onChange={(event) => setTransformsProducts(event.target.value)} className="form-input">
                <option value="no">{t('no')}</option>
                <option value="yes">{t('yes')}</option>
              </select>
            </div>

            <div className="form-group">
              <label>{t('age')}</label>
              <input type="number" min="0" value={age} onChange={(event) => setAge(event.target.value)} className="form-input" />
            </div>

            <div className="form-group">
              <label>{t('sex')}</label>
              <select value={sex} onChange={(event) => setSex(event.target.value)} className="form-input">
                <option value="">{t('selectSex')}</option>
                <option value="female">{t('female')}</option>
                <option value="male">{t('male')}</option>
                <option value="other">{t('otherOption')}</option>
                <option value="prefer_not_to_say">{t('preferNotToSay')}</option>
              </select>
            </div>

            <div className="form-group">
              <label>{t('preferredCurrency')}</label>
              <select value={preferredCurrency} onChange={(event) => setPreferredCurrency(event.target.value)} className="form-input">
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

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? t('saving') : t('updateName')}
              </button>
            </div>
          </form>
        </div>

        <div className="card">
          <h2 className="card-section-title">{t('changePassword')}</h2>
          <form onSubmit={handlePasswordUpdate}>
            <div className="form-group">
              <label>{t('currentPassword')}</label>
              <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="form-input" required />
            </div>

            <div className="form-group">
              <label>{t('newPassword')}</label>
              <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="form-input" required minLength={6} />
            </div>

            <div className="form-group">
              <label>{t('confirmPassword')}</label>
              <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="form-input" required minLength={6} />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? t('updating') : t('updatePassword')}
              </button>
            </div>
          </form>
        </div>

        <div className="card">
          <h2 className="card-section-title">{canManageBilling ? t('manageBilling') : t('unlockFullAnalysis')}</h2>
          {billingNotice && <div className="success-message">{billingNotice}</div>}
          <p style={{ marginBottom: '12px', color: 'var(--text-secondary)' }}>
            {t('module2BasicSimulationMessage')}
          </p>
          {!billingStatus.checkout_ready && !canManageBilling && (
            <p style={{ marginBottom: '12px', color: 'var(--accent-warning)' }}>
              {t('billingUnavailable')}
            </p>
          )}
          <button type="button" className="btn btn-primary" onClick={handleBillingAction} disabled={billingLoading}>
            {billingLoading ? t('saving') : canManageBilling ? t('manageBilling') : t('upgradeToPro')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Profile;

