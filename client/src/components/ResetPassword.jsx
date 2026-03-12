import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { useI18n } from '../i18n/I18nContext';

function ResetPassword() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError(t('missingResetToken'));
      return;
    }

    if (password.length < 6) {
      setError(t('passwordLengthError'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/reset-password', { token, password });
      setSuccess(response.data.message || t('passwordResetSuccess'));
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.error || t('unableResetPassword'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-form-wrapper">
        <div className="login-card">
          <div className="login-card-header">
            <h2 className="login-card-title">{t('resetPasswordTitle')}</h2>
            <p className="login-card-subtitle">{t('resetPasswordSubtitle')}</p>
          </div>

          {error && <div className="login-error-message">{error}</div>}
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
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label>{t('newPassword')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>{t('confirmPasswordLabel')}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
                required
                disabled={loading}
              />
            </div>
            <button type="submit" className="btn btn-primary login-submit-btn" disabled={loading}>
              {loading ? t('resetting') : t('resetPasswordTitle')}
            </button>
          </form>

          <div className="login-card-footer">
            <Link to="/login" className="login-toggle-btn">
              {t('backToLogin')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
