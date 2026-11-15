import type { Metadata } from "next";
import LegalDraftPage, { type LegalSection } from "@/app/components/LegalDraftPage";

export const metadata: Metadata = {
  title: "Terms of Service (Draft) | BusinessOS",
  description: "Draft BusinessOS Terms of Service pending business-owner and legal review.",
  robots: { index: false, follow: false },
};

const sections: LegalSection[] = [
  {
    title: "1. Provider and effective date",
    paragraphs: [
      "These draft terms concern use of BusinessOS, an application that provides account-based customer, sales, invoicing, expense, task, and appointment workflows.",
      "Provider: [OWNER: insert the full legal name and address of the service provider]. Effective date: [OWNER/COUNSEL: set the effective date after approval]. Governing jurisdiction: [COUNSEL: specify after legal review].",
    ],
  },
  {
    title: "2. Accounts and access",
    paragraphs: [
      "BusinessOS is designed as a single-user workspace for each account. [OWNER/COUNSEL: define eligibility, age requirements, account security responsibilities, and what happens when an account is shared or compromised.]",
      "[OWNER: describe account creation, verification, suspension, recovery, and closure rules. Confirm that these terms match the actual product and support process.]",
    ],
  },
  {
    title: "3. Acceptable use",
    paragraphs: [
      "[OWNER/COUNSEL: specify permitted and prohibited uses, including applicable restrictions on unlawful content, misuse, security testing, and interference with the service.]",
      "[OWNER: state any customer responsibilities concerning the accuracy and lawful use of information entered into the application.]",
    ],
  },
  {
    title: "4. Service scope and changes",
    paragraphs: [
      "The application currently presents customer records, sales pipelines, invoices and quotes, expenses, tasks, appointments, and account settings. The availability and details of specific functions may depend on the deployed version.",
      "[OWNER/COUNSEL: define availability commitments, support channels, maintenance, feature changes, and any notice requirements. Do not imply service levels unless they are approved and supportable.]",
    ],
  },
  {
    title: "5. Fees and payment",
    paragraphs: [
      "[OWNER: confirm whether the service is paid, free, trial-based, or not yet offered commercially. If applicable, specify prices, billing periods, taxes, payment provider, cancellation, refunds, and any price-change notice.]",
      "No price or payment obligation is stated in this draft.",
    ],
  },
  {
    title: "6. User content and third parties",
    paragraphs: [
      "[COUNSEL: define ownership of user-provided content and the limited permissions, if any, needed to operate the service.]",
      "[OWNER/COUNSEL: identify relevant third-party services and their applicable terms. Confirm the production provider list before publishing.]",
    ],
  },
  {
    title: "7. Suspension, termination, and disputes",
    paragraphs: [
      "[OWNER/COUNSEL: describe termination by the account holder or provider, suspension grounds, effects on stored data, and any applicable notice or export process.]",
      "[COUNSEL: draft legally appropriate warranties, disclaimers, liability limits, indemnities, dispute resolution, governing law, and consumer-rights language for the jurisdictions served.]",
    ],
  },
  {
    title: "8. Contact and notices",
    paragraphs: [
      "Questions or legal notices: [OWNER: provide an approved contact email and postal address, and specify any required notice method.]",
    ],
  },
];

const reviewItems = [
  "Provider legal name, address, contact details, effective date, and governing jurisdiction.",
  "Eligibility, account responsibilities, service availability, support, suspension, termination, and data handling on closure.",
  "Acceptable-use rules and user-content rights.",
  "Whether fees apply; if so, complete pricing, billing, tax, cancellation, and refund terms.",
  "Third-party service list and any applicable contractual terms.",
  "Counsel-approved warranty, liability, indemnity, dispute, consumer-rights, and governing-law clauses.",
  "Confirm every statement against the actual product, operational practices, and launch jurisdictions.",
];

export default function TermsPage() {
  return (
    <LegalDraftPage
      title="Terms of Service"
      summary="A review draft describing the topics that need to be settled for use of BusinessOS. This text is incomplete and is not an approved agreement or legal advice."
      updatedLabel="Draft prepared 15 November 2026 · Effective date not set"
      sections={sections}
      reviewItems={reviewItems}
    />
  );
}
