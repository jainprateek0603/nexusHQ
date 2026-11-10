export const EMBEDDING_DIM = 64;

export function slugify(input: string): string {
  const slug = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "workspace";
}

const MENTION = /@([a-zA-Z0-9._-]{1,64})/g;

export function extractMentions(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(MENTION)) {
    const token = match[1];
    if (token) found.add(token.toLowerCase());
  }
  return [...found];
}

export function chunkText(text: string, size = 500, overlap = 80): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (overlap >= size) overlap = Math.floor(size / 5);
  const chunks: string[] = [];
  let index = 0;
  while (index < clean.length && chunks.length < 40) {
    const end = Math.min(clean.length, index + size);
    chunks.push(clean.slice(index, end));
    if (end === clean.length) break;
    index = end - overlap;
  }
  return chunks;
}

export function hashEmbedding(text: string): number[] {
  const vector = new Array<number>(EMBEDDING_DIM).fill(0);
  const tokens = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  if (tokens.length === 0) {
    vector[0] = 1;
    return vector;
  }
  for (const token of tokens) {
    let hash = 2166136261;
    for (let index = 0; index < token.length; index += 1) {
      hash ^= token.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    const bucket = Math.abs(hash) % EMBEDDING_DIM;
    const sign = (hash & 1) === 0 ? 1 : -1;
    vector[bucket] = (vector[bucket] ?? 0) + sign;
  }
  let norm = 0;
  for (const value of vector) norm += value * value;
  norm = Math.sqrt(norm) || 1;
  return vector.map((value) => value / norm);
}

export function cosineSimilarity(left: number[], right: number[]): number {
  if (left.length === 0 || left.length !== right.length) return 0;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    const a = left[index] ?? 0;
    const b = right[index] ?? 0;
    dot += a * b;
    leftNorm += a * a;
    rightNorm += b * b;
  }
  const denom = Math.sqrt(leftNorm) * Math.sqrt(rightNorm);
  if (denom === 0) return 0;
  return dot / denom;
}

export function reduceEmbedding(values: number[], dimensions = EMBEDDING_DIM): number[] {
  if (values.length === dimensions) return values;
  const reduced = new Array<number>(dimensions).fill(0);
  if (values.length === 0) return reduced;
  for (let index = 0; index < values.length; index += 1) {
    reduced[index % dimensions] = (reduced[index % dimensions] ?? 0) + (values[index] ?? 0);
  }
  let norm = 0;
  for (const value of reduced) norm += value * value;
  norm = Math.sqrt(norm) || 1;
  return reduced.map((value) => value / norm);
}

export interface VisibleSource {
  sourceType: "DOCUMENT" | "TASK" | "MESSAGE";
  sourceId: string;
}

export interface RetrievalChunk {
  sourceType: VisibleSource["sourceType"];
  sourceId: string;
  title: string;
  content: string;
  score: number;
}

export function filterChunksByPermission(
  chunks: readonly RetrievalChunk[],
  visible: readonly VisibleSource[],
): RetrievalChunk[] {
  const allowed = new Set(visible.map((source) => `${source.sourceType}:${source.sourceId}`));
  return chunks.filter((chunk) => allowed.has(`${chunk.sourceType}:${chunk.sourceId}`));
}

export function extractActionItems(notes: string): { title: string; description: string }[] {
  const items: { title: string; description: string }[] = [];
  for (const line of notes.split(/\r?\n/)) {
    const trimmed = line.trim();
    const match = trimmed.match(/^(?:[-*]|\d+[.)]|todo:?)\s+(.+)$/i);
    const title = match?.[1]?.trim();
    if (!title) continue;
    items.push({ title: title.slice(0, 200), description: "" });
    if (items.length >= 30) break;
  }
  return items;
}

export const QUEUES = {
  mail: "mail",
  webhook: "webhook",
  index: "index",
  embed: "embed",
} as const;

export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const CHANNEL_TYPES = ["PUBLIC", "PRIVATE", "DM"] as const;
export type ChannelType = (typeof CHANNEL_TYPES)[number];

export const WEBHOOK_EVENTS = [
  "task.created",
  "task.updated",
  "task.deleted",
  "document.created",
  "document.updated",
  "message.created",
  "member.invited",
  "member.joined",
] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];
