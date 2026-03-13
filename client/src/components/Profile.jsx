import { useState, useEffect } from 'react';
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
  const [upgrading, setUpgrading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const hasProAccess = ['pro', 'admin'].includes(user?.role) || (user?.features || []).includes('module2');

  // Fetch fresh user data from backend when component mounts
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
      } catch (error) {
        console.error('Error fetching user data:', error);
        // Fallback to prop data
        if (user?.name) {
          setName(user.name);
        }
        if (user?.email) {
          setEmail(user.email);
        }
      } finally {
        setFetching(false);
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
    if (user?.email) {
      setEmail(user.email);
    }
    setLastName(user?.last_name || '');
    setCountry(user?.country || '');
    setCity(user?.city || '');
    setGoatsCount(user?.goats_count || '');
    setTransformsProducts(user?.transforms_products ? 'yes' : 'no');
    setAge(user?.age || '');
    setSex(user?.sex || '');
    setPreferredCurrency(user?.preferred_currency || 'USD');
    const savedAvatar = getAvatar();
    if (savedAvatar) {
      setAvatar(savedAvatar);
    }
  }, [user]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
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
    }
  };

  const handleNameUpdate = async (e) => {
    e.preventDefault();
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
      const updatedUser = response.data.user;
      onUserUpdate(updatedUser);
      setSuccess(t('nameUpdated'));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || t('updateError'));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
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
    } catch (err) {
      setError(err.response?.data?.error || err.message || t('updateError'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeToPro = async () => {
    setError('');
    setSuccess('');
    setUpgrading(true);
    try {
      const response = await api.post('/auth/upgrade-to-pro');
      const updatedUser = response.data?.user;
      if (updatedUser) {
        onUserUpdate(updatedUser);
      }
      setSuccess(response.data?.message || t('upgradeToPro'));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || err.message || t('updateError'));
    } finally {
      setUpgrading(false);
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
        {/* Avatar Section */}
        <div className="card">
          <h2 className="card-section-title">{t('profilePicture')}</h2>
          <div className="avatar-section">
            <div className="avatar-preview">
              {avatar ? (
                <img src={avatar} alt="Avatar" className="avatar-image-large" />
              ) : (
                <div className="avatar-placeholder-large">
                  {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
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

        {/* User Info Section */}
        <div className="card">
          <h2 className="card-section-title">{t('userInformation')}</h2>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          
          <form onSubmit={handleNameUpdate}>
            <div className="form-group">
              <label htmlFor="email">{t('email')}</label>
              {fetching ? (
                <input
                  id="email"
                  type="email"
                  value=""
                  disabled
                  className="form-input"
                  placeholder={t('loading')}
                  style={{ backgroundColor: 'var(--bg-tertiary)', cursor: 'not-allowed' }}
                />
              ) : (
                <input
                  id="email"
                  type="email"
                  value={email || ''}
                  disabled
                  className="form-input"
                  placeholder={email ? '' : (t('noEmailAvailable'))}
                  style={{ backgroundColor: 'var(--bg-tertiary)', cursor: 'not-allowed' }}
                />
              )}
              <small className="form-hint">{t('emailCannotChange')}</small>
            </div>

            <div className="form-group">
              <label>{t('name')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('name')}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label>{t('lastName')}</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={t('lastName')}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>{t('country')}</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder={t('country')}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>{t('city')}</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={t('city')}
                className="form-input"
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
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>{t('transformsProducts')}</label>
              <select
                value={transformsProducts}
                onChange={(e) => setTransformsProducts(e.target.value)}
                className="form-input"
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
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>{t('sex')}</label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                className="form-input"
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
                className="form-input"
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

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? t('saving') : t('updateName')}
              </button>
            </div>
          </form>
        </div>

        {/* Password Change Section */}
        <div className="card">
          <h2 className="card-section-title">{t('changePassword')}</h2>
          
          <form onSubmit={handlePasswordUpdate}>
            <div className="form-group">
              <label>{t('currentPassword')}</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t('currentPassword')}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label>{t('newPassword')}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('newPassword')}
                className="form-input"
                required
                minLength={6}
              />
            </div>

            <div className="form-group">
              <label>{t('confirmPassword')}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('confirmPassword')}
                className="form-input"
                required
                minLength={6}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? t('updating') : t('updatePassword')}
              </button>
            </div>
          </form>
        </div>

        {/* Upgrade Section */}
        <div className="card">
          <h2 className="card-section-title">{t('unlockFullAnalysis')}</h2>
          <p style={{ marginBottom: '12px', color: 'var(--text-secondary)' }}>
            {t('module2BasicSimulationMessage')}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleUpgradeToPro}
            disabled={upgrading || hasProAccess}
            title={hasProAccess ? t('availableForProUsers') : ''}
          >
            {hasProAccess ? t('availableForProUsers') : (upgrading ? t('saving') : t('upgradeToPro'))}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Profile;
