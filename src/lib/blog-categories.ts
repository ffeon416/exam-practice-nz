export interface BlogCategory {
  slug: string;
  name: string;
}

// StudyAce canonical taxonomy. Post frontmatter `category:` must EXACTLY match
// one of the `name` values below (case-sensitive). The URL uses `slug`.
export const BLOG_CATEGORIES: BlogCategory[] = [
  { slug: "exam-strategy", name: "Exam Strategy" },
  { slug: "study-methods", name: "Study Methods" },
  { slug: "subject-guides", name: "Subject Guides" },
  { slug: "mock-exam-practice", name: "Mock Exam Practice" },
  { slug: "mindset-and-test-anxiety", name: "Mindset & Test Anxiety" },
  { slug: "ai-in-education", name: "AI in Education" },
  { slug: "parents-and-teachers", name: "Parents & Teachers" },
];

export function categoryToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function getCategoryName(slug: string): string | undefined {
  return BLOG_CATEGORIES.find((c) => c.slug === slug)?.name;
}

export function postMatchesCategory(postCategory: string | undefined, slug: string): boolean {
  if (!postCategory) return false;
  return categoryToSlug(postCategory) === slug;
}
