import { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';
import api from '../utils/api';
import '../styles/OnboardingModal.css';

function OnboardingModal({ user, onClose }) {
  const { t } = useI18n();
  const [step, setStep] = useState(1);
  const [emailVerified, setEmailVerified] = useState(Boolean(user?.email_verified));
  const [agreedToTerms, setAgreedToTerms] = useState(Boolean(user?.accepted_terms));
  const [sendingVerification, setSendingVerification] = useState(false);

  const totalSteps = 3;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = () => {
    if (agreedToTerms) {
      // Save onboarding completion to localStorage
      localStorage.setItem(`onboarding_completed_${user.id}`, 'true');
      onClose();
    }
  };

  const handleSkip = () => {
    localStorage.setItem(`onboarding_completed_${user.id}`, 'true');
    onClose();
  };

  return (
    <div className="onboarding-backdrop">
      <div className="onboarding-modal">
        {/* Progress Bar */}
        <div className="onboarding-progress">
          <div className="onboarding-progress-bar" style={{ width: `${(step / totalSteps) * 100}%` }}></div>
        </div>

        {/* Header */}
        <div className="onboarding-header">
          <img src="/logo.png" alt="MetaCaprine Logo" className="onboarding-logo" />
          <h1 className="onboarding-title">{t('welcome')} {user?.name || t('defaultUserName')}</h1>
          <button className="onboarding-skip" onClick={handleSkip}>
            {t('skip')}
          </button>
        </div>

        {/* Content */}
        <div className="onboarding-content">
          {step === 1 && (
            <div className="onboarding-step">
              <div className="onboarding-icon">🐐</div>
              <h2>{t('onboardingWelcomeTitle')}</h2>
              <p>{t('onboardingWelcomeText')}</p>
              
              <div className="onboarding-features">
                <div className="onboarding-feature">
                  <span className="feature-icon">📊</span>
                  <div>
                    <h3>{t('onboardingFeature1Title')}</h3>
                    <p>{t('onboardingFeature1Text')}</p>
                  </div>
                </div>
                <div className="onboarding-feature">
                  <span className="feature-icon">🧀</span>
                  <div>
                    <h3>{t('onboardingFeature2Title')}</h3>
                    <p>{t('onboardingFeature2Text')}</p>
                  </div>
                </div>
                <div className="onboarding-feature">
                  <span className="feature-icon">🔬</span>
                  <div>
                    <h3>{t('onboardingFeature3Title')}</h3>
                    <p>{t('onboardingFeature3Text')}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="onboarding-step">
              <div className="onboarding-icon">⚖️</div>
              <h2>{t('onboardingLegalTitle')}</h2>
              <div className="onboarding-legal-content">
                <h3>{t('onboardingDataSources')}</h3>
                <p>{t('onboardingDataSourcesText')}</p>
                
                <h3>{t('onboardingLiability')}</h3>
                <p>{t('onboardingLiabilityText')}</p>
                
                <h3>{t('onboardingDataPrivacy')}</h3>
                <p>{t('onboardingDataPrivacyText')}</p>

                <div className="onboarding-checkbox">
                  <input
                    type="checkbox"
                    id="agree-terms"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                  />
                  <label htmlFor="agree-terms">
                    {t('onboardingAgreeTerms')}
                  </label>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="onboarding-step">
              <div className="onboarding-icon">📧</div>
              <h2>{t('onboardingEmailTitle')}</h2>
              <p>{t('onboardingEmailText')}</p>
              <div className="onboarding-email-display">
                {user?.email || 'user@example.com'}
              </div>
              
              {!emailVerified && (
                <>
                  <p style={{ marginTop: '1.5rem' }}>{t('onboardingEmailVerifyText')}</p>
                  <button
                    className="btn btn-primary"
                    style={{ marginTop: '1rem' }}
                    disabled={sendingVerification}
                    onClick={async () => {
                      setSendingVerification(true);
                      try {
                        await api.post('/auth/resend-verification');
                        setEmailVerified(true);
                      } catch (error) {
                        alert(error.response?.data?.error || (t('errorOccurred')));
                      } finally {
                        setSendingVerification(false);
                      }
                    }}
                  >
                    {sendingVerification ? (t('sending')) : (t('sendVerificationEmail'))}
                  </button>
                </>
              )}
              
              {emailVerified && (
                <div className="onboarding-success">
                  <span style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</span>
                  <p>{t('onboardingEmailSent')}</p>
                </div>
              )}

              <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>{t('onboardingGetStarted')}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
                  {t('onboardingGetStartedText')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="onboarding-footer">
          <div className="onboarding-steps">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <div
                key={index}
                className={`onboarding-step-dot ${step === index + 1 ? 'active' : ''} ${step > index + 1 ? 'completed' : ''}`}
              ></div>
            ))}
          </div>
          <div className="onboarding-buttons">
            {step > 1 && (
              <button className="btn btn-secondary" onClick={handlePrevious}>
                {t('previous')}
              </button>
            )}
            {step < totalSteps && (
              <button className="btn btn-primary" onClick={handleNext}>
                {t('next')}
              </button>
            )}
            {step === totalSteps && (
              <button 
                className="btn btn-primary" 
                onClick={handleComplete}
                disabled={!agreedToTerms}
              >
                {t('getStarted')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OnboardingModal;
