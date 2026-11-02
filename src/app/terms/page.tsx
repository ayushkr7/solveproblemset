import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import { LEGAL_LINKS, SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `The terms that govern your use of ${SITE.name}, a free practice tracker for data structures, algorithms and competitive programming.`,
  alternates: { canonical: LEGAL_LINKS.terms },
};

const mail = <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>;
const privacy = <Link href={LEGAL_LINKS.privacy}>Privacy Policy</Link>;
const ext = (href: string, text: string) => (
  <a href={href} target="_blank" rel="noopener noreferrer">
    {text}
    <span className="visually-hidden"> (opens in a new tab)</span>
  </a>
);
const domain = SITE.url.replace("https://", "");

const SECTIONS: LegalSection[] = [
  {
    id: "agreement",
    title: "Acceptance of these terms",
    body: (
      <p>
        These Terms of Service (the “Terms”) govern your access to and use of {SITE.name} at{" "}
        <a href={SITE.url}>{domain}</a> (the “Service”), operated by {SITE.operator} (“we”, “us” or “our”). By accessing or using
        the Service, you agree to be bound by these Terms and acknowledge our {privacy}. If you do not agree to these Terms, you
        must not use the Service.
      </p>
    ),
  },
  {
    id: "the-service",
    title: "Description of the Service",
    body: (
      <p>
        The Service allows you to create practice sets from curated problem sheets and from LeetCode and Codeforces, to time your
        practice, and to import and export sets as Excel workbooks, either on your device or in your Google Drive. The Service is
        provided free of charge and does not require an account. We may add, modify or remove features, or suspend or discontinue
        the Service, at any time and without notice.
      </p>
    ),
  },
  {
    id: "eligibility",
    title: "Eligibility",
    body: (
      <p>
        You must be at least 13 years of age, or the minimum age of digital consent in your country of residence, to use the
        Service. If you use the Service on behalf of an organisation, you represent that you are authorised to accept these Terms
        on its behalf.
      </p>
    ),
  },
  {
    id: "your-data",
    title: "Your data and backups",
    body: (
      <p>
        Your problem sets and timings are stored solely in your browser, and you retain all rights to them. Because this data is
        never transmitted to us, we are unable to restore it if it is lost, for example when browser data is cleared, when you
        change browser or device, or when you use private browsing. You are responsible for maintaining your own backups, which
        you can create by exporting a workbook.
      </p>
    ),
  },
  {
    id: "google-drive",
    title: "Google Drive integration",
    body: (
      <p>
        The Google Drive features are optional. By using them, you authorise the Service to create, read and update only the
        Google Drive files that it saves and the files that you select, as described in the {privacy}. Your use of Google&rsquo;s
        services is also subject to the {ext("https://policies.google.com/terms", "Google Terms of Service")}. You may revoke this
        authorisation at any time from {ext("https://myaccount.google.com/connections", "your Google Account")}. You are
        responsible for the files you choose to import and for retaining copies of any files that are important to you.
      </p>
    ),
  },
  {
    id: "third-party",
    title: "Third-party content and links",
    body: (
      <>
        <p>
          Problem titles, difficulty labels and links are sourced from takeUforward (Striver&rsquo;s sheets), NeetCode, LeetCode
          and Codeforces, and remain the property of their respective owners. Their names and trademarks are used solely to
          identify the problems concerned.{" "}
          <strong>{SITE.name} is not affiliated with, endorsed by or sponsored by any of them.</strong>
        </p>
        <p>
          Problems open on those websites and are subject to their respective terms. We do not control these websites and are not
          responsible for their content or availability, or for the accuracy of problem details, ratings and lists, which may
          change at their source.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    body: (
      <>
        <p>You agree that you will not:</p>
        <ul>
          <li>use the Service in violation of any applicable law or in a manner that infringes the rights of others;</li>
          <li>
            interfere with or disrupt the Service, including by sending automated or bulk requests to it, or by attempting to
            circumvent its limits or security measures;
          </li>
          <li>
            attempt to gain unauthorised access to the Service, its hosting infrastructure, or any other person&rsquo;s data or
            Google account;
          </li>
          <li>use the Service to distribute malware or files intended to harm other users&rsquo; devices; or</li>
          <li>resell the Service, or represent it as your own or as endorsed by us.</li>
        </ul>
      </>
    ),
  },
  {
    id: "intellectual-property",
    title: "Intellectual property",
    body: (
      <p>
        The {SITE.name} name, logo and site design are owned by us. Except for the limited right to use the Service in accordance
        with these Terms, nothing in these Terms grants you any rights in them. Where the source code of the Service is published
        under an open-source licence, that licence governs your use of the code. Third-party content is addressed under{" "}
        <a href="#third-party">Third-party content and links</a>.
      </p>
    ),
  },
  {
    id: "feedback",
    title: "Feedback",
    body: (
      <p>
        If you provide suggestions or other feedback about the Service, we may use it without restriction or obligation to you.
      </p>
    ),
  },
  {
    id: "disclaimer",
    title: "Disclaimer of warranties",
    body: (
      <p>
        The Service is provided free of charge on an “as is” and “as available” basis. To the fullest extent permitted by law, we
        disclaim all warranties, whether express or implied, including any implied warranties of merchantability, fitness for a
        particular purpose and non-infringement. We do not warrant that the Service will be uninterrupted, error-free or secure,
        that problem data or recorded timings will be accurate, or that the Service will meet your requirements. Nothing in the
        Service constitutes professional, career or educational advice.
      </p>
    ),
  },
  {
    id: "liability",
    title: "Limitation of liability",
    body: (
      <>
        <p>
          To the fullest extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential or
          punitive damages, or for any loss of data, profits or opportunities, arising out of or relating to your use of, or
          inability to use, the Service, even if we have been advised of the possibility of such damages. Because the Service is
          provided free of charge, our total liability for any claim arising out of or relating to the Service shall not exceed
          US$50.
        </p>
        <p>
          Some jurisdictions do not permit the exclusion or limitation of certain damages, so some of the above limitations may not
          apply to you. Nothing in these Terms excludes or limits any liability that cannot be excluded or limited by law, or any
          consumer rights that cannot be waived.
        </p>
      </>
    ),
  },
  {
    id: "indemnity",
    title: "Indemnification",
    body: (
      <p>
        To the extent permitted by law, you agree to indemnify us against any claims, losses, liabilities and reasonable expenses
        arising from your breach of these Terms or your misuse of the Service.
      </p>
    ),
  },
  {
    id: "termination",
    title: "Suspension and termination",
    body: (
      <p>
        You may stop using the Service at any time; clearing this site&rsquo;s data in your browser removes all information the
        Service has stored. We may suspend or restrict access to the Service for anyone who breaches these Terms or whose use
        presents a risk to the Service or its users. The provisions on intellectual property, feedback, disclaimer of warranties,
        limitation of liability, indemnification and general terms survive the end of your use of the Service.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to these terms",
    body: (
      <p>
        We may revise these Terms from time to time. When we do, we will update the “Last updated” date above and, for material
        changes, provide notice on the Service before the changes take effect. Your continued use of the Service after the
        revised Terms take effect constitutes your acceptance of them. The current version is always available at{" "}
        <Link href={LEGAL_LINKS.terms}>{domain}/terms</Link>.
      </p>
    ),
  },
  {
    id: "general",
    title: "General",
    body: (
      <p>
        These Terms, together with the {privacy}, constitute the entire agreement between you and us regarding the Service. If any
        provision of these Terms is held to be unenforceable, the remaining provisions will remain in full force and effect. Our
        failure to enforce any provision does not constitute a waiver of that provision. You may not assign or transfer your
        rights under these Terms; we may assign ours to any successor to the Service.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact us",
    body: <p>If you have any questions about these Terms, please contact us at {mail}.</p>,
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      kicker="Terms of Service"
      title={
        <>
          Terms of <span className="serif-accent">Service</span>
        </>
      }
      lede={`The terms that govern your access to and use of ${SITE.name}.`}
      summary={
        <ul>
          <li>The Service is free, requires no account and is provided without warranty.</li>
          <li>Your sets are stored in your browser; export a workbook to keep a backup.</li>
          <li>The Google Drive features are optional and access only the files you save or select.</li>
          <li>{SITE.name} is not affiliated with takeUforward, NeetCode, LeetCode or Codeforces.</li>
          <li>You agree to use the Service lawfully and not to disrupt it.</li>
        </ul>
      }
      sections={SECTIONS}
      related="privacy"
    />
  );
}
