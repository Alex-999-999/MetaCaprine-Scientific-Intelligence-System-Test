import { useI18n } from '../i18n/I18nContext';

function FooterPageLayout({ title, children }) {
  return (
    <div className="container">
      <div className="footer-page-wrapper">
        <article className="card footer-page-card">
          <h1 className="footer-page-title">{title}</h1>
          {children}
        </article>
      </div>
    </div>
  );
}

export function AboutPage() {
  const { t } = useI18n();

  return (
    <FooterPageLayout title={t('footerAboutPageTitle')}>
      <p className="footer-page-lead">{t('footerAboutLead')}</p>
      <p className="footer-page-paragraph">{t('footerAboutParagraph1')}</p>
      <p className="footer-page-paragraph">{t('footerAboutParagraph2')}</p>
    </FooterPageLayout>
  );
}

export function ContactPage() {
  const { t } = useI18n();

  return (
    <FooterPageLayout title={t('footerContactPageTitle')}>
      <p className="footer-page-lead">{t('footerContactLead')}</p>
      <section className="footer-page-section">
        <h2 className="footer-page-section-title">{t('footerContactSupportTitle')}</h2>
        <p className="footer-page-paragraph">{t('footerContactSupportBody')}</p>
      </section>
      <section className="footer-page-section">
        <h2 className="footer-page-section-title">{t('footerContactConsultingTitle')}</h2>
        <p className="footer-page-paragraph">{t('footerContactConsultingBody')}</p>
      </section>
    </FooterPageLayout>
  );
}

export function PrivacyPage() {
  const { t } = useI18n();

  return (
    <FooterPageLayout title={t('footerPrivacyPageTitle')}>
      <ul className="footer-page-list">
        <li>
          <strong>{t('footerPrivacyItem1Title')}:</strong> {t('footerPrivacyItem1Body')}
        </li>
        <li>
          <strong>{t('footerPrivacyItem2Title')}:</strong> {t('footerPrivacyItem2Body')}
        </li>
        <li>
          <strong>{t('footerPrivacyItem3Title')}:</strong> {t('footerPrivacyItem3Body')}
        </li>
      </ul>
    </FooterPageLayout>
  );
}

export function TermsPage() {
  const { t } = useI18n();

  return (
    <FooterPageLayout title={t('footerTermsPageTitle')}>
      <section className="footer-page-section">
        <h2 className="footer-page-section-title">{t('footerTermsPurposeTitle')}</h2>
        <p className="footer-page-paragraph">{t('footerTermsPurposeBody')}</p>
      </section>
      <ol className="footer-page-ordered-list">
        <li>
          <strong>{t('footerTermsClause1Title')}:</strong> {t('footerTermsClause1Body')}
        </li>
        <li>
          <strong>{t('footerTermsClause2Title')}:</strong> {t('footerTermsClause2Body')}
        </li>
        <li>
          <strong>{t('footerTermsClause3Title')}:</strong> {t('footerTermsClause3Body')}
        </li>
        <li>
          <strong>{t('footerTermsClause4Title')}:</strong> {t('footerTermsClause4Body')}
        </li>
      </ol>
    </FooterPageLayout>
  );
}

