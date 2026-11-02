import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import { DRIVE_FOLDER_NAME } from "@/lib/drive/files";
import { LEGAL_LINKS, SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${SITE.name} collects, uses and protects information, including data accessed through Google Drive.`,
  alternates: { canonical: LEGAL_LINKS.privacy },
};

const mail = <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>;
const ext = (href: string, text: string) => (
  <a href={href} target="_blank" rel="noopener noreferrer">
    {text}
    <span className="visually-hidden"> (opens in a new tab)</span>
  </a>
);
const domain = SITE.url.replace("https://", "");

const SECTIONS: LegalSection[] = [
  {
    id: "who-we-are",
    title: "Who we are",
    body: (
      <p>
        {SITE.name} (<a href={SITE.url}>{domain}</a>, the “Service”) is a free practice tracker for data structures,
        algorithms and competitive programming, operated by {SITE.operator} (“we”, “us” or “our”). This Privacy Policy
        describes the information the Service processes, the purposes for which it is processed, and the choices available to
        you. If you have any questions about this policy, please contact us at {mail}.
      </p>
    ),
  },
  {
    id: "on-your-device",
    title: "Information stored on your device",
    body: (
      <>
        <p>
          The Service does not require an account. Information you create is stored in your browser on your own device, and
          includes:
        </p>
        <ul>
          <li>your problem sets, including their names, selected sources, problems and completion status;</li>
          <li>your practice timings and timer state; and</li>
          <li>your display preference (light or dark theme).</li>
        </ul>
        <p>
          This information is not transmitted to us, and we are therefore unable to view, recover or delete it on your behalf.
          You may delete an individual set from the My Sets page at any time, or remove all stored information by clearing this
          site&rsquo;s data in your browser settings. When you export a set, a copy is saved to your device or, if you so choose,
          to your Google Drive as described below.
        </p>
      </>
    ),
  },
  {
    id: "google-drive",
    title: "Google Drive and Google user data",
    body: (
      <>
        <p>
          Use of Google Drive is optional. You are asked to sign in with Google only when you choose to save sets to Google Drive
          or to import a workbook from it.
        </p>
        <p>
          <strong>Permissions requested.</strong> The Service asks only for permission to access the Google Drive files that you
          create with it or choose to open with it, which Google describes as “See, edit, create and delete only the specific
          Google Drive files you use with this app”. It does not request your name, email address, contacts or other account
          information, and it cannot access the other files in your Google Drive.
        </p>
        <p>
          <strong>How the data is used.</strong> Google user data is used solely to provide the import and export features you
          request:
        </p>
        <ul>
          <li>
            <strong>Export:</strong> the workbook you export is saved to a “{DRIVE_FOLDER_NAME}” folder in your Google Drive.
          </li>
          <li>
            <strong>Import:</strong> you select a workbook in your Google Drive, and its sets are added to the Service in your
            browser once you confirm.
          </li>
        </ul>
        <p>
          The Service does not modify or delete any other file. Files it saves remain in your Google Drive until you remove them.
        </p>
        <p>
          <strong>Storage.</strong> Your files are transferred directly between your browser and Google. We do not store your
          files, their contents or your Google sign-in on our servers, and the access Google grants for a session expires
          automatically.
        </p>
        <p>
          <strong>Sharing.</strong> We do not sell, rent or share Google user data with any third party, do not use it for
          advertising, and do not use it to develop, improve or train artificial intelligence or machine learning models. No
          person at {SITE.name} reviews your Google user data.
        </p>
        <p>
          <strong>Limited Use.</strong> {SITE.name}&rsquo;s use and transfer to any other app of information received from Google
          APIs will adhere to the{" "}
          {ext("https://developers.google.com/terms/api-services-user-data-policy", "Google API Services User Data Policy")},
          including the Limited Use requirements.
        </p>
        <p>
          <strong>Revoking access.</strong> You may revoke the Service&rsquo;s access at any time from your Google Account at{" "}
          {ext("https://myaccount.google.com/connections", "myaccount.google.com/connections")}. Files you have already exported
          remain in your Google Drive until you delete them. Your use of Google sign-in and Google Drive is also subject to the{" "}
          {ext("https://policies.google.com/privacy", "Google Privacy Policy")}.
        </p>
      </>
    ),
  },
  {
    id: "hosting",
    title: "Hosting and technical information",
    body: (
      <>
        <p>
          The Service is hosted by Cloudflare, which processes standard technical information, such as your IP address and
          browser type, to deliver the Service and protect it against abuse. We do not use this information to identify you.
          Cloudflare processes it in accordance with the{" "}
          {ext("https://www.cloudflare.com/privacypolicy/", "Cloudflare Privacy Policy")}.
        </p>
        <p>
          Problem lists from LeetCode and Codeforces are obtained from those sites&rsquo; public listings and do not involve any
          information about you.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies, analytics and advertising",
    body: (
      <p>
        The Service does not set cookies, does not use analytics or tracking technologies, and does not display advertising. If you
        use the Google Drive features, Google&rsquo;s sign-in and file selection screens may use Google&rsquo;s own cookies, which
        are governed by Google&rsquo;s privacy policy.
      </p>
    ),
  },
  {
    id: "other-sites",
    title: "Third-party websites",
    body: (
      <p>
        Problems in the Service link to the websites that publish them, including takeUforward, NeetCode, LeetCode and Codeforces.
        These websites are not operated by us, and their own privacy policies apply when you visit them.
      </p>
    ),
  },
  {
    id: "retention",
    title: "Data retention",
    body: (
      <ul>
        <li>Information stored in your browser is retained until you delete it or clear this site&rsquo;s data.</li>
        <li>Access granted by Google expires automatically and is not stored.</li>
        <li>Files exported to Google Drive are retained until you delete them.</li>
        <li>Technical request information is retained by Cloudflare in accordance with its own retention policies.</li>
      </ul>
    ),
  },
  {
    id: "security",
    title: "Security",
    body: (
      <p>
        The Service is provided only over encrypted (HTTPS) connections and requests the minimum Google Drive access needed for
        its features. Because your practice data is stored in your browser, it is accessible to anyone with access to your
        browser profile; we recommend that you secure your device accordingly.
      </p>
    ),
  },
  {
    id: "children",
    title: "Children’s privacy",
    body: (
      <p>
        The Service is not directed to children under the age of 13, or under the minimum age of digital consent in their country
        of residence, and we do not knowingly collect personal information from them. If you believe that a child has provided
        personal information through the Service, please contact us at {mail}.
      </p>
    ),
  },
  {
    id: "your-rights",
    title: "Your rights and choices",
    body: (
      <>
        <p>
          Depending on your location, you may have the right to access, correct, delete or port personal information, or to object
          to its processing. Because we do not hold your practice data or your Google user data, you can exercise most of these
          rights directly: by deleting sets in the Service, clearing this site&rsquo;s data in your browser, deleting exported
          files from Google Drive, and revoking the Service&rsquo;s access in your Google Account.
        </p>
        <p>
          For any other request, or to ask what information we hold about you, please contact us at {mail}. We aim to respond
          within 30 days.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <p>
        We may update this Privacy Policy from time to time. If we change how the Service processes information, we will update
        this policy and the “Last updated” date before the change takes effect and, where required for Google user data, obtain
        your consent. The current version is always available at{" "}
        <Link href={LEGAL_LINKS.privacy}>{domain}/privacy</Link>.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact us",
    body: (
      <p>
        For questions or requests concerning this Privacy Policy, please contact {SITE.operator} at {mail}.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      kicker="Privacy Policy"
      title={
        <>
          Privacy <span className="serif-accent">Policy</span>
        </>
      }
      lede={`How ${SITE.name} collects, uses and protects information, including data accessed through Google Drive, and the choices available to you.`}
      summary={
        <ul>
          <li>The Service does not use accounts, cookies, analytics or advertising.</li>
          <li>Your problem sets and timings are stored in your browser and are never transmitted to us.</li>
          <li>
            Google Drive is optional. The Service can access only the files it saves to your Drive and the files you select for
            import. We do not store or share your Google user data.
          </li>
          <li>You may delete your data and revoke Google Drive access at any time.</li>
        </ul>
      }
      sections={SECTIONS}
      related="terms"
    />
  );
}
