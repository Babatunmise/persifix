import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { articles } from "@/data/articles";

export const metadata = {
  title: "The Journal | Sanctos",
  description: "Clear, clinically reviewed insights on cardiovascular health.",
};

export default function JournalIndexPage() {
  return (
    <div className="bg-[#fcfcfc] text-[#121212] min-h-screen">
      <Container className="py-20 max-w-3xl">
        <div className="mb-16">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            The Journal
          </h1>
          <p className="mt-4 text-lg text-neutral-600 max-w-[65ch]">
            Clinically reviewed insights on cardiovascular health. No noise. No panic. Just clarity.
          </p>
        </div>

        <div className="space-y-12">
          {articles.map((article) => (
            <article key={article.slug} className="group relative flex flex-col items-start">
              <div className="flex items-center gap-x-4 text-xs font-medium text-neutral-500 mb-3">
                <time dateTime={article.publishedAt}>
                  {new Date(article.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </time>
                <span aria-hidden="true">·</span>
                <span>{article.region}</span>
              </div>
              
              <h2 className="text-2xl font-semibold tracking-tight text-[#121212] group-hover:text-neutral-600 transition-colors">
                <Link href={`/journal/${article.slug}`}>
                  <span className="absolute inset-0" />
                  {article.title}
                </Link>
              </h2>
              
              <p className="mt-3 text-lg text-neutral-600 max-w-[65ch] leading-relaxed">
                {article.answerBox}
              </p>
              
              <div className="mt-4 text-sm font-medium text-[#121212] border-b border-[#121212] pb-1 group-hover:border-neutral-600 group-hover:text-neutral-600 transition-colors">
                Read article
              </div>
            </article>
          ))}
        </div>
      </Container>
    </div>
  );
}