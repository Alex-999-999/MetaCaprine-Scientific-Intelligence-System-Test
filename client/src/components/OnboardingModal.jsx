import { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';
import '../styles/OnboardingModal.css';

function OnboardingModal({ user, onClose }) {
  const { t } = useI18n();
  const [step, setStep] = useState(1);
  const [emailVerified, setEmailVerified] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

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
          <h1 className="onboarding-title">{t('welcome')} {user?.name || 'Usuario'}</h1>
          <button className="onboarding-skip" onClick={handleSkip}>
            {t('skip')}
          </button>
        </div>

        {/* Content */}
        <div className="onboarding-content">
          {step === 1 && (
            <div className="onboarding-step">
              <div className="onboarding-icon">🐐</div>
              <h2>{t('onboardingWelcomeTitle') || 'Welcome to MetaCaprine Intelligence'}</h2>
              <p>{t('onboardingWelcomeText') || 'The most advanced platform for analyzing profitability and production in dairy goat operations. Make data-driven decisions to maximize your margins and optimize your business.'}</p>
              
              <div className="onboarding-features">
                <div className="onboarding-feature">
                  <span className="feature-icon">📊</span>
                  <div>
                    <h3>{t('onboardingFeature1Title') || 'Production Analysis'}</h3>
                    <p>{t('onboardingFeature1Text') || 'Project and analyze profitability of raw milk sales with real production scenarios.'}</p>
                  </div>
                </div>
                <div className="onboarding-feature">
                  <span className="feature-icon">🧀</span>
                  <div>
                    <h3>{t('onboardingFeature2Title') || 'Transformation Simulation'}</h3>
                    <p>{t('onboardingFeature2Text') || 'Compare profitability of different dairy products and sales channels.'}</p>
                  </div>
                </div>
                <div className="onboarding-feature">
                  <span className="feature-icon">🔬</span>
                  <div>
                    <h3>{t('onboardingFeature3Title') || 'Scientific Breed Comparison'}</h3>
                    <p>{t('onboardingFeature3Text') || 'Compare breeds based on internationally validated ECM and productive life data.'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="onboarding-step">
              <div className="onboarding-icon">⚖️</div>
              <h2>{t('onboardingLegalTitle') || 'Important Legal Information'}</h2>
              <div className="onboarding-legal-content">
                <h3>{t('onboardingDataSources') || 'Data Sources and Accuracy'}</h3>
                <p>{t('onboardingDataSourcesText') || 'The data and parameters used in this platform come from official international sources and scientific studies. Results are projections based on average parameters and may vary depending on management practices, climate, genetics, and local conditions.'}</p>
                
                <h3>{t('onboardingLiability') || 'Limitation of Liability'}</h3>
                <p>{t('onboardingLiabilityText') || 'MetaCaprine Intelligence is a decision support tool. The calculations and results are estimates for planning purposes. We do not guarantee specific results. Production and economic decisions are the responsibility of the user.'}</p>
                
                <h3>{t('onboardingDataPrivacy') || 'Data Privacy'}</h3>
                <p>{t('onboardingDataPrivacyText') || 'Your production data and scenarios are private and secure. We do not share your information with third parties without your explicit consent.'}</p>

                <div className="onboarding-checkbox">
                  <input
                    type="checkbox"
                    id="agree-terms"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                  />
                  <label htmlFor="agree-terms">
                    {t('onboardingAgreeTerms') || 'I have read and agree to the terms and conditions'}
                  </label>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="onboarding-step">
              <div className="onboarding-icon">📧</div>
              <h2>{t('onboardingEmailTitle') || 'Email Verification'}</h2>
              <p>{t('onboardingEmailText') || 'Your registered email is:'}</p>
              <div className="onboarding-email-display">
                {user?.email || 'usuario@ejemplo.com'}
              </div>
              
              {!emailVerified && (
                <>
                  <p style={{ marginTop: '1.5rem' }}>{t('onboardingEmailVerifyText') || 'We recommend verifying your email to ensure you can recover your account and receive important updates.'}</p>
                  <button 
                    className="btn btn-primary" 
                    style={{ marginTop: '1rem' }}
                    onClick={() => {
                      setEmailVerified(true);
                      // In a real implementation, this would send a verification email
                      alert(t('onboardingEmailSent') || 'Verification email sent. Please check your inbox.');
                    }}
                  >
                    {t('sendVerificationEmail') || 'Send Verification Email'}
                  </button>
                </>
              )}
              
              {emailVerified && (
                <div className="onboarding-success">
                  <span style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</span>
                  <p>{t('onboardingEmailSent') || 'Verification email sent! Please check your inbox and spam folder.'}</p>
                </div>
              )}

              <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>{t('onboardingGetStarted') || 'Ready to Get Started?'}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
                  {t('onboardingGetStartedText') || 'Start with Module 1 to analyze your current production, or jump to Module 3 to compare breeds.'}
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
                {t('previous') || 'Previous'}
              </button>
            )}
            {step < totalSteps && (
              <button className="btn btn-primary" onClick={handleNext}>
                {t('next') || 'Next'}
              </button>
            )}
            {step === totalSteps && (
              <button 
                className="btn btn-primary" 
                onClick={handleComplete}
                disabled={!agreedToTerms}
              >
                {t('getStarted') || 'Get Started'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OnboardingModal;
