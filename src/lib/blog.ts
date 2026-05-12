import fs from "fs";
import path from "path";
import matter from "gray-matter";
import readingTime from "reading-time";

const BLOG_DIR = path.join(process.cwd(), "content/blog");

export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  tags: string[];
  image?: string;
  readingTime: string;
  category?: string;
  keywords?: string[];
  leadMagnet?: string;
  hub?: boolean;
}

export interface Post extends PostMeta {
  content: string;
}

// Filename → slug. Strips an optional YYYY-MM-DD- prefix so authors can use either
// `2026-05-12-foo.mdx` or `foo.mdx`. The date in the prefix is informational; the
// actual publish date is the frontmatter `date:`.
function extractSlug(filename: string): string {
  const withoutExt = filename.replace(/\.mdx$/, "");
  return withoutExt.replace(/^\d{4}-\d{2}-\d{2}-/, "");
}

function todayCutoff(): Date {
  const t = new Date();
  t.setHours(23, 59, 59, 999);
  return t;
}

export function getAllPosts(): PostMeta[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".mdx"));
  const cutoff = todayCutoff();

  const posts: PostMeta[] = files.map((filename) => {
    const slug = extractSlug(filename);
    const filePath = path.join(BLOG_DIR, filename);
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(fileContent);

    return {
      slug,
      title: data.title || "Untitled",
      description: data.description || "",
      date: data.date || new Date().toISOString(),
      author: data.author || "Study Ace",
      tags: data.tags || [],
      image: data.image,
      readingTime: readingTime(content).text,
      category: data.category,
      keywords: data.keywords,
      leadMagnet: data.leadMagnet,
      hub: data.hub === true,
    };
  });

  return posts
    .filter((p) => new Date(p.date) <= cutoff)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function findFileBySlug(slug: string): string | null {
  if (!fs.existsSync(BLOG_DIR)) return null;
  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".mdx"));

  const exact = `${slug}.mdx`;
  if (files.includes(exact)) return exact;

  const match = files.find((f) => extractSlug(f) === slug && /^\d{4}-\d{2}-\d{2}-/.test(f));
  return match || null;
}

export function getPostBySlug(slug: string): Post | null {
  const filename = findFileBySlug(slug);
  if (!filename) return null;

  const filePath = path.join(BLOG_DIR, filename);
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(fileContent);

  return {
    slug,
    title: data.title || "Untitled",
    description: data.description || "",
    date: data.date || new Date().toISOString(),
    author: data.author || "Study Ace",
    tags: data.tags || [],
    image: data.image,
    readingTime: readingTime(content).text,
    content,
    category: data.category,
    keywords: data.keywords,
    leadMagnet: data.leadMagnet,
    hub: data.hub === true,
  };
}

export function getAllPostSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  const cutoff = todayCutoff();

  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .filter((f) => {
      const filePath = path.join(BLOG_DIR, f);
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const { data } = matter(fileContent);
      return new Date(data.date || new Date()) <= cutoff;
    })
    .map((f) => extractSlug(f));
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-NZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
