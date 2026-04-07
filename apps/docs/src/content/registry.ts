// apps/docs/src/content/registry.ts

// Simple browser-compatible frontmatter parser
function parseFrontmatter(raw: string): { data: Record<string, string>; content: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };
  const frontmatter = match[1];
  const content = match[2];
  const data: Record<string, string> = {};
  frontmatter.split("\n").forEach((line) => {
    const idx = line.indexOf(":");
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      data[key] = value;
    }
  });
  return { data, content };
}

// Types
export interface DocPage {
  slug: string;
  title: string;
  description: string;
  content: string;
  category?: string;
}

export interface DocCategory {
  name: string;
  slug: string;
  pages: DocPage[];
}

// Fetch a single Markdown file
export async function getDocBySlug(slug: string): Promise<DocPage | undefined> {
  try {
    const res = await fetch(`/content/docs/${slug}.md`);
    if (!res.ok) return undefined;
    const raw = await res.text();
    const { data, content } = parseFrontmatter(raw);
    return {
      slug,
      title: data.title || slug,
      description: data.description || "",
      content,
      category: data.category,
    };
  } catch {
    return undefined;
  }
}

// Optional: List of all Markdown files you want to expose
// z.B. ["getting-started", "inventory/overview", "inventory/qr-scanning", "api/reference"]
export const allSlugs = [
  "start",
  "erste-schritte",
  "PWA/pwa-getting-started",
  "PWA/pwa-installation",
  "Inventar/overview",
  "Inventar/qr-scanning",
  "Dev/reference",
  "Dev/dev-getting-started",
];

// Fetch all docs dynamically
export async function getAllDocs(): Promise<DocPage[]> {
  const docs: DocPage[] = [];
  for (const slug of allSlugs) {
    const doc = await getDocBySlug(slug);
    if (doc) docs.push(doc);
  }
  return docs;
}

// Generate categories dynamically
export async function getDocCategories(): Promise<DocCategory[]> {
  const allDocs = await getAllDocs();
  const categoryMap = new Map<string, DocPage[]>();
  const uncategorized: DocPage[] = [];

  allDocs.forEach((doc) => {
    if (doc.category) {
      const existing = categoryMap.get(doc.category) || [];
      existing.push(doc);
      categoryMap.set(doc.category, existing);
    } else {
      uncategorized.push(doc);
    }
  });

  const categories: DocCategory[] = [];

  // Add uncategorized first
  if (uncategorized.length > 0) {
    categories.push({
      name: "Allgemein",
      slug: "general",
      pages: uncategorized,
    });
  }

  categoryMap.forEach((pages, name) => {
    categories.push({
      name,
      slug: name.toLowerCase(),
      pages,
    });
  });

  return categories;
}