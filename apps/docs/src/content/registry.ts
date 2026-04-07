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

// Import all markdown files
import gettingStartedMd from "/content/docs/getting-started.md?raw";
import inventoryOverviewMd from "/content/docs/inventory/overview.md?raw";
import qrScanningMd from "/content/docs/inventory/qr-scanning.md?raw";
import apiReferenceMd from "/content/docs/api/reference.md?raw";

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

function parseDoc(raw: string, slug: string, category?: string): DocPage {
  const { data, content } = parseFrontmatter(raw);
  return {
    slug,
    title: data.title || slug,
    description: data.description || "",
    content,
    category,
  };
}

const allDocs: DocPage[] = [
  parseDoc(gettingStartedMd, "getting-started"),
  parseDoc(inventoryOverviewMd, "inventory/overview", "Inventar"),
  parseDoc(qrScanningMd, "inventory/qr-scanning", "Inventar"),
  parseDoc(apiReferenceMd, "api/reference", "API"),
];

export function getAllDocs(): DocPage[] {
  return allDocs;
}

export function getDocBySlug(slug: string): DocPage | undefined {
  return allDocs.find((doc) => doc.slug === slug);
}

export function getDocCategories(): DocCategory[] {
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
