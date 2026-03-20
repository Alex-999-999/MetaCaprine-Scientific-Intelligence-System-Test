import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { useI18n } from '../i18n/I18nContext';
import ModernIcon from './icons/ModernIcon';

function VerifyEmail() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setMessage(t('noVerificationToken'));
        setLoading(false);
        return;
      }

      try {
        const response = await api.get(`/auth/verify-email?token=${token}`);
        setStatus('success');
        setMessage(response.data.message || t('emailVerifiedSuccess'));
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } catch (error) {
        setStatus('error');
        setMessage(error.response?.data?.error || error.response?.data?.message || t('verifyEmailFailed'));
        setLoading(false);
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  return (
    <div className="container" style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '80vh',
      flexDirection: 'column'
    }}>
      <div className="card" style={{ maxWidth: '500px', width: '100%', textAlign: 'center' }}>
        {status === 'verifying' && (
          <>
            <div style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
              <ModernIcon name="hourglass" size={48} />
            </div>
            <h2 style={{ marginBottom: '1rem' }}>{t('verifyingEmail')}</h2>
            <p style={{ color: 'var(--text-secondary)' }}>{t('verifyEmailWait')}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ marginBottom: '1rem', color: 'var(--accent-success)' }}>
              <ModernIcon name="checkCircle" size={48} />
            </div>
            <h2 style={{ marginBottom: '1rem', color: 'var(--accent-success)' }}>{t('emailVerifiedTitle')}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              {message}
            </p>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
              {t('redirectingToLogin')}
            </p>
            <button 
              className="btn btn-primary" 
              onClick={() => navigate('/login')}
              style={{ marginTop: '1rem' }}
            >
              {t('goToLogin')}
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ marginBottom: '1rem', color: 'var(--accent-error)' }}>
              <ModernIcon name="xCircle" size={48} />
            </div>
            <h2 style={{ marginBottom: '1rem', color: 'var(--accent-error)' }}>{t('verificationFailedTitle')}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              {message}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => navigate('/login')}
              >
                {t('goToLogin')}
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => navigate('/login', { state: { mode: 'register' } })}
              >
                {t('registerAgain')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default VerifyEmail;
