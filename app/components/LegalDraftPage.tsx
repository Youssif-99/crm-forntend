import Link from "next/link";

export type LegalSection = {
  title: string;
  paragraphs: string[];
};

export default function LegalDraftPage({
  title,
  summary,
  sections,
  reviewItems,
  updatedLabel,
}: {
  title: string;
  summary: string;
  sections: LegalSection[];
  reviewItems: string[];
  updatedLabel: string;
}) {
  return (
    <main className="min-h-screen bg-[#f7f8fa] px-4 py-8 text-[#26334b] sm:px-6 sm:py-12">
      <article className="mx-auto max-w-3xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-[#27344c]">
            <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#172b55] text-white">B</span>
            BusinessOS
          </Link>
          <nav aria-label="Legal page navigation" className="flex flex-wrap gap-4 text-sm font-medium text-[#566bbd]">
            <Link href="/terms" className="hover:underline">Terms</Link>
            <Link href="/privacy" className="hover:underline">Privacy</Link>
            <Link href="/authPages/sign-up" className="hover:underline">Create account</Link>
          </nav>
        </header>

        <div className="rounded-2xl border border-[#e9edf2] bg-white p-5 shadow-sm sm:p-9">
          <p className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-900">
            Draft — owner and legal review required
          </p>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-[#26344d] sm:text-4xl">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-[#68758a]">{summary}</p>
          <p className="mt-4 rounded-lg bg-[#f5f6fa] px-4 py-3 text-sm leading-6 text-[#46536a]">
            Not approved for public use. All bracketed items and the full text below must be reviewed and approved by the business owner and qualified counsel before launch.
          </p>
          <p className="mt-4 text-xs text-[#788397]">{updatedLabel}</p>

          <div className="mt-8 space-y-8">
            {sections.map((section, index) => (
              <section key={section.title} aria-labelledby={`legal-section-${index}`}>
                <h2 id={`legal-section-${index}`} className="text-lg font-semibold text-[#26344d]">{section.title}</h2>
                <div className="mt-2 space-y-3 text-sm leading-7 text-[#566278]">
                  {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </div>
              </section>
            ))}
          </div>

          <section aria-labelledby="owner-review" className="mt-10 rounded-xl border border-amber-200 bg-amber-50/70 p-5">
            <h2 id="owner-review" className="text-base font-semibold text-amber-950">Items requiring owner approval</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-amber-950">
              {reviewItems.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>

          <footer className="mt-8 border-t border-[#edf0f4] pt-5 text-sm text-[#68758a]">
            <Link href="/" className="font-semibold text-[#566bbd] hover:underline">Back to BusinessOS</Link>
          </footer>
        </div>
      </article>
    </main>
  );
}
