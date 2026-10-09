import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy Policy · Magical Touch Design',
  description: 'What Magical Touch Design collects, why, where it is kept, and the choices you have.',
};

const EMAIL = 'hellomagicaltouch.design@gmail.com';

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="8 October 2026">
      <p>
        Magical Touch Design (&quot;we&quot;, &quot;us&quot;) runs the online design application at magicaltouchdesign.com. This policy explains what
        information we collect, why we collect it, where it is kept, and the choices you have. We keep it short because we collect as little as we can.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account details:</strong> your e-mail address and password (stored only as a secure hash by our sign-in provider — we can never see it), your name, and, if you add them, a phone number and profile photo.</li>
        <li><strong>Profile photo:</strong> resized on your device before upload to small versions (512, 128 and 64 pixels). Hidden photo information such as GPS location is removed.</li>
        <li><strong>Designs you choose to keep in your account:</strong> if you pick &quot;My Magical Touch account&quot; when saving, the design, the photos inside it and its version history are stored with us. Photos you add to a design are not sent to us at any other time — if you save to your device or your own cloud drive, they never reach our servers.</li>
        <li><strong>Cloud drive links:</strong> if you connect Google Drive, OneDrive or Dropbox, we store which drive you connected, the account e-mail shown by that service, and a short list of your projects there (name, file id, small preview, size and date) so your dashboard can show them.</li>
        <li><strong>E-mail preferences and history:</strong> whether you agreed to receive offers and news, when you agreed or unsubscribed, and a record of marketing e-mails sent to you.</li>
        <li><strong>Basic technical data:</strong> sign-in times and the information browsers normally send, used to keep the service working and secure.</li>
      </ul>

      <h2>What we do not collect</h2>
      <ul>
        <li>Projects you save to <strong>your own device</strong> (computer, iPad or phone, as .mtd files) never reach our servers. The &quot;On this device&quot; list on your dashboard is kept only in your browser.</li>
        <li>Projects you save to <strong>Google Drive, OneDrive or Dropbox</strong> stay in your drive. We never store their contents, your passwords for those services, or their access keys — sign-in keys stay in your browser and expire within about an hour.</li>
        <li>We only ever access a <strong>Magical Touch Design folder</strong> in your cloud drive, never the rest of it.</li>
        <li>We do not sell your personal information.</li>
      </ul>

      <h2>Why we use it</h2>
      <ul>
        <li>To create and secure your account, and to let you sign in and reset your password.</li>
        <li>To provide the editor, templates, saving and opening of your projects.</li>
        <li>To send account e-mails you need: e-mail verification, a welcome message, password reset and password-changed notices. These are part of the service.</li>
        <li>To send offers, new templates and news <strong>only if you opted in</strong>. Every such e-mail has an unsubscribe link, and you can turn them off any time on your Profile page.</li>
      </ul>

      <h2>Where it is kept and who helps us</h2>
      <p>We use a small number of service providers to run Magical Touch Design:</p>
      <ul>
        <li><strong>Supabase</strong> — account sign-in, database and file storage.</li>
        <li><strong>Vercel</strong> — hosting the website.</li>
        <li><strong>Google (Gmail)</strong> — sending our e-mails from {EMAIL}.</li>
        <li><strong>Google, Microsoft and Dropbox</strong> — only when you choose to connect your own drive to save or open projects.</li>
      </ul>
      <p>These providers may process data in other countries. They handle it on our behalf to provide the service.</p>

      <h2>How long we keep it</h2>
      <p>
        We keep your account information while your account exists. When you delete your account (Profile → Delete my account), your profile, photo,
        account designs, version history and cloud-drive records are permanently deleted. Files on your computer or in your own cloud drive are not
        affected. A record of e-mails already sent may be kept without your account link.
      </p>

      <h2>Your choices and rights</h2>
      <ul>
        <li>Update your name, phone and photo on your Profile page.</li>
        <li>Turn offers and news on or off on your Profile page, or use the unsubscribe link in any marketing e-mail.</li>
        <li>Disconnect a cloud drive from Profile → Connected storage.</li>
        <li>Delete your account at any time from your Profile page.</li>
        <li>Ask us for a copy of your information, or to correct it, by writing to <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.</li>
      </ul>

      <h2>Security</h2>
      <p>
        Access to your data is restricted so that each person can only reach their own account information, and administrator tools are limited to
        authorised staff. We will never ask you to send your password or verification code by e-mail. Our only official e-mail address is {EMAIL};
        please check that messages claiming to be from us come from that exact address.
      </p>

      <h2>Children</h2>
      <p>Magical Touch Design is not directed at children under 13, and we do not knowingly collect their personal information.</p>

      <h2>Changes</h2>
      <p>If we change this policy, we will update the date above and, for important changes, let you know by e-mail or on the website.</p>

      <h2>Contact</h2>
      <p>
        Questions about privacy? Write to <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
