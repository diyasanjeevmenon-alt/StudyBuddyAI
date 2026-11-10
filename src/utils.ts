export const COVERS = [
  { bg: "#991b1b", band: "#fbbf24" }, // Crimson
  { bg: "#065f46", band: "#fbbf24" }, // Emerald
  { bg: "#1e40af", band: "#fcd34d" }, // Sapphire
  { bg: "#b45309", band: "#fde68a" }, // Amber
  { bg: "#6b21a8", band: "#fcd34d" }, // Violet
  { bg: "#0f766e", band: "#fef08a" }, // Teal
  { bg: "#831843", band: "#fbbf24" }, // Mulberry
  { bg: "#374151", band: "#fbbf24" }, // Slate
];

export function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const coverFor = (id: string) => COVERS[hash(id) % COVERS.length];

export function sizeFor(id: string): { w: number; h: number } {
  const h = hash(id + "size");
  return { w: 48 + (h % 5) * 5, h: 255 + ((h >> 3) % 5) * 16 };
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export const SOURCE_LABEL: Record<string, string> = {
  text: "pasted notes",
  pdf: "a PDF file",
  youtube: "a YouTube video",
  image: "a study photo",
};
