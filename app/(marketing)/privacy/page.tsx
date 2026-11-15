import type { Metadata } from "next";
import LegalDraftPage, { type LegalSection } from "@/app/components/LegalDraftPage";

export const metadata: Metadata = {
  title: "Privacy Policy (Draft) | BusinessOS",
  description: "Draft BusinessOS Privacy Policy pending business-owner and legal review.",
  robots: { index: false, follow: false },
};

const sections: LegalSection[] = [
  {
    title: "1. Who is responsible",
    paragraphs: [
      "This draft concerns information processed in connection with BusinessOS, an account-based application for customer, sales, finance, task, and appointment workflows.",
      "Controller/service provider identity: [OWNER/COUNSEL: identify the legal entity, role, address, and contact details, based on the actual operating arrangement]. Privacy contact: [OWNER: provide an approved contact].",
    ],
  },
  {
    title: "2. Information to inventory",
    paragraphs: [
      "Before publishing, the owner must verify the actual data inventory and distinguish account details (such as name, username, email, and profile preferences) from information an account holder enters into customer, deal, invoice, quote, expense, task, appointment, and file records.",
      "[OWNER/ENGINEERING: confirm whether and which authentication, session, security, diagnostic, device, network, and usage records are collected. Do not publish a category until it has been confirmed from production configuration and code.]",
    ],
  },
  {
    title: "3. Purposes and legal bases",
    paragraphs: [
      "[OWNER/COUNSEL: describe each processing purpose, its applicable legal basis where required, and whether any information is optional or required. Match each purpose to the verified data inventory.]",
      "Potential operational purposes to review include providing account access, saving the records entered by the account holder, supporting requested workflows, protecting the service, and responding to support or legal requests. These are review topics, not a final statement of actual practices or legal bases.",
    ],
  },
  {
    title: "4. Service providers and disclosures",
    paragraphs: [
      "[OWNER/ENGINEERING: identify the actual hosting, database, file-storage, email, monitoring, analytics, payment, and other providers used in each deployed environment. State what data each receives and why, after verification.]",
      "[COUNSEL: specify any other disclosure circumstances and the applicable safeguards or contractual terms. Do not claim that data is never shared unless that has been confirmed.]",
    ],
  },
  {
    title: "5. International processing",
    paragraphs: [
      "[OWNER/ENGINEERING: confirm the locations where data is hosted, accessed, backed up, or processed, including relevant provider regions.]",
      "[COUNSEL: describe applicable transfer mechanisms and notices for the actual countries and data flows.]",
    ],
  },
  {
    title: "6. Retention and deletion",
    paragraphs: [
      "[OWNER/ENGINEERING: document actual retention periods or objective criteria for account records, logs, backups, email records, and deleted data. Verify deletion-worker retries and provider backup/version behavior before describing deletion timelines.]",
      "[COUNSEL: describe applicable rights and deletion exceptions. No retention period or deletion guarantee is made in this draft.]",
    ],
  },
  {
    title: "7. Security, cookies, and choices",
    paragraphs: [
      "[OWNER/SECURITY: describe security measures only after confirming current controls, scope, and limitations. Do not promise absolute security or state certifications that have not been independently established.]",
      "[ENGINEERING/COUNSEL: inventory cookies, local storage, and similar technologies, including authentication/session cookies, and determine required disclosures or controls.]",
      "[COUNSEL: document applicable access, correction, deletion, objection, portability, complaint, and consent-withdrawal rights, how to exercise them, and any identity-verification process.]",
    ],
  },
  {
    title: "8. Children, changes, and contact",
    paragraphs: [
      "[OWNER/COUNSEL: set and verify any minimum-age rule and whether the service is intended for children. Do not publish an age threshold until approved.]",
      "[OWNER/COUNSEL: describe how policy changes will be communicated, when they take effect, and provide a contact for privacy questions and complaints.]",
    ],
  },
];

const reviewItems = [
  "Identify the responsible legal entity, its role, privacy contact, and jurisdictions served.",
  "Verify the complete data inventory, including account/customer content, files, authentication/security records, logs, email, and any analytics.",
  "Confirm purposes and legal bases by processing activity.",
  "List all production subprocessors/providers, data access, hosting locations, and international transfers.",
  "Approve retention periods and deletion practices only after validating backups, versions, retries, and operational procedures.",
  "Review security statements, cookies/session technologies, user rights, request handling, complaint routes, and exceptions.",
  "Set children/minimum-age language and policy-change notice process with counsel.",
  "Have qualified privacy counsel review the final text against actual operations and applicable law before public release.",
];

export default function PrivacyPage() {
  return (
    <LegalDraftPage
      title="Privacy Policy"
      summary="A review draft and data-inventory checklist for the information BusinessOS may process. Actual practices, providers, locations, retention, and legal requirements must be verified before publication."
      updatedLabel="Draft prepared 15 November 2026 · Effective date not set"
      sections={sections}
      reviewItems={reviewItems}
    />
  );
}
