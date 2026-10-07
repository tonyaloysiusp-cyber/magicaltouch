import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Terms of Service · Magical Touch Design',
  description: 'The terms for using Magical Touch Design.',
};

const EMAIL = 'hellomagicaltouch.design@gmail.com';

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="8 October 2026">
      <p>
        These terms apply when you use Magical Touch Design at magicaltouchdesign.com. By creating an account or using the service, you agree to them.
        If you don&apos;t agree, please don&apos;t use the service.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>Give accurate information when you sign up and keep your password private. You are responsible for activity on your account.</li>
        <li>Tell us at <a href={`mailto:${EMAIL}`}>{EMAIL}</a> if you think someone else has used your account.</li>
        <li>You can delete your account at any time from your Profile page.</li>
      </ul>

      <h2>Your designs belong to you</h2>
      <ul>
        <li>You own the designs you create, and the text, photos and other material you add to them.</li>
        <li>
          You choose where each project is stored: your computer, your own Google Drive / OneDrive / Dropbox, or your Magical Touch Design account. Projects
          on your computer or in your own drive are under your control; please keep your own copies of anything important.
        </li>
        <li>
          When you keep designs in your account, you give us permission to store and display them to you only so we can provide the service. We don&apos;t
          use your designs for anything else.
        </li>
      </ul>

      <h2>Templates and included content</h2>
      <ul>
        <li>Templates, illustrations and other content provided by Magical Touch Design remain ours or our licensors&apos;.</li>
        <li>
          When you use a template, you get your own copy to edit, and you may use the finished design for your personal or business purposes. You may not
          resell or redistribute the templates themselves, or offer them as templates in another product.
        </li>
        <li>Fonts are provided only inside the editor under their own licences and are not packaged into project files.</li>
      </ul>

      <h2>Acceptable use</h2>
      <p>Please don&apos;t use Magical Touch Design to:</p>
      <ul>
        <li>create or share content that is illegal, hateful, harassing, sexually exploits anyone, or infringes someone else&apos;s rights;</li>
        <li>impersonate a person or organisation, or create misleading or fraudulent material;</li>
        <li>try to break into, overload or interfere with the service, or access other people&apos;s accounts or data.</li>
      </ul>
      <p>We may suspend or close accounts that break these rules.</p>

      <h2>E-mails</h2>
      <p>
        We send account e-mails (verification, welcome, password and security notices) as part of the service. Offers and news are sent only if you opt in,
        and you can unsubscribe at any time.
      </p>

      <h2>The service</h2>
      <ul>
        <li>
          Magical Touch Design is a growing, early-stage service. We work hard to keep it available and to protect your work, but it is provided &quot;as
          is&quot;, and features may change, be added or be removed.
        </li>
        <li>
          To the extent the law allows, we are not responsible for indirect losses, or for loss of designs you did not save or keep copies of. Nothing in
          these terms limits rights you have under consumer protection laws that cannot be excluded.
        </li>
      </ul>

      <h2>Changes to these terms</h2>
      <p>
        We may update these terms. We will change the date above and, for important changes, let you know by e-mail or on the website. Continuing to use the
        service after a change means you accept the updated terms.
      </p>

      <h2>Contact</h2>
      <p>
        Questions? Write to <a href={`mailto:${EMAIL}`}>{EMAIL}</a>. See also our <a href="/privacy">Privacy Policy</a>.
      </p>
    </LegalPage>
  );
}
