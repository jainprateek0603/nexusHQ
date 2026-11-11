import { describe, expect, it } from "vitest";
import { safeEqual } from "./errors";
import { permissionsForRole, roleHasPermission } from "./permissions";
import { isWithinLimit, limitsForPlan, periodExpired } from "./plans";
import { signupSchema } from "./schemas";
import {
  chunkText,
  cosineSimilarity,
  extractActionItems,
  extractMentions,
  filterChunksByPermission,
  hashEmbedding,
  slugify,
} from "./text";

describe("permissions", () => {
  it("gives the owner every permission and keeps admin below owner", () => {
    expect(roleHasPermission("OWNER", "org:delete")).toBe(true);
    expect(roleHasPermission("ADMIN", "org:delete")).toBe(false);
    expect(roleHasPermission("ADMIN", "members:role")).toBe(false);
    expect(roleHasPermission("ADMIN", "billing:manage")).toBe(true);
    expect(roleHasPermission("MEMBER", "ai:use")).toBe(true);
    expect(roleHasPermission("GUEST", "ai:use")).toBe(false);
    expect(roleHasPermission("GUEST", "tasks:delete")).toBe(false);
    expect(permissionsForRole("OWNER").length).toBeGreaterThan(permissionsForRole("ADMIN").length);
  });
});

describe("plans", () => {
  it("keeps free below pro below team", () => {
    expect(limitsForPlan("FREE").projects).toBeLessThan(limitsForPlan("PRO").projects);
    expect(limitsForPlan("PRO").aiRequestsPerMonth).toBeLessThan(limitsForPlan("TEAM").aiRequestsPerMonth);
    expect(limitsForPlan("nope").members).toBe(limitsForPlan("FREE").members);
    expect(isWithinLimit(4, 5)).toBe(true);
    expect(isWithinLimit(5, 5)).toBe(false);
  });

  it("detects a monthly period rollover", () => {
    const start = new Date("2026-01-15T00:00:00.000Z");
    expect(periodExpired(start, new Date("2026-02-14T00:00:00.000Z"))).toBe(false);
    expect(periodExpired(start, new Date("2026-02-15T00:00:00.000Z"))).toBe(true);
  });
});

describe("text helpers", () => {
  it("slugifies names", () => {
    expect(slugify("Northwind Labs")).toBe("northwind-labs");
    expect(slugify("!!!")).toBe("workspace");
  });

  it("extracts mentions and action items", () => {
    expect(extractMentions("Hi @Ada and @ada, cc @Lin")).toEqual(["ada", "lin"]);
    expect(extractActionItems("- Ship the board\nTODO: Write the note\nHello").map((item) => item.title)).toEqual([
      "Ship the board",
      "Write the note",
    ]);
  });

  it("chunks, embeds, and filters by permission", () => {
    const chunks = chunkText("a".repeat(900), 500, 50);
    expect(chunks.length).toBeGreaterThan(1);
    const left = hashEmbedding("quarterly roadmap launch");
    const right = hashEmbedding("quarterly roadmap launch");
    const other = hashEmbedding("unrelated cafeteria menu");
    expect(left).toHaveLength(64);
    expect(cosineSimilarity(left, right)).toBeCloseTo(1, 5);
    expect(cosineSimilarity(left, other)).toBeLessThan(0.9);
    const visible = filterChunksByPermission(
      [
        { sourceType: "DOCUMENT", sourceId: "d1", title: "A", content: "secret", score: 1 },
        { sourceType: "TASK", sourceId: "t1", title: "B", content: "ok", score: 0.5 },
      ],
      [{ sourceType: "TASK", sourceId: "t1" }],
    );
    expect(visible).toHaveLength(1);
    expect(visible[0]?.sourceId).toBe("t1");
  });
});

describe("schemas", () => {
  it("rejects weak passwords and accepts a normal signup", () => {
    expect(signupSchema.safeParse({ name: "Ada", email: "Ada@Example.com", password: "short" }).success).toBe(false);
    const parsed = signupSchema.parse({
      name: "Ada Lovelace",
      email: "Ada@Example.com",
      password: "correcthorse1",
    });
    expect(parsed.email).toBe("ada@example.com");
  });
});

describe("safeEqual", () => {
  it("matches equal strings and rejects different ones", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});
