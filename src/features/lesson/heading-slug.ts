import GithubSlugger from "github-slugger";

/**
 * Mirrors rehype-slug (github-slugger) so the table of contents links match
 * the ids generated at MDX compile time. A fresh slugger per call means
 * duplicates get the same base; the TOC lists headings once each anyway.
 */
export function headingSlug(text: string): string {
  return new GithubSlugger().slug(text);
}
