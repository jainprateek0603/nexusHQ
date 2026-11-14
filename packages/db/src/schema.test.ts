import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const TENANT_EXEMPT = new Set([
  "User",
  "Session",
  "OAuthAccount",
  "TotpBackupCode",
  "MfaChallenge",
  "Organization",
  "StripeEvent",
  "FeatureFlag",
  "NotificationPreference",
]);

describe("schema", () => {
  it("puts orgId on every tenant-owned model", () => {
    const schema = readFileSync(resolve(import.meta.dirname, "../prisma/schema.prisma"), "utf8");
    const models = [...schema.matchAll(/model (\w+) \{([\s\S]*?)\n\}/g)];
    expect(models.length).toBeGreaterThan(20);
    for (const match of models) {
      const name = match[1];
      const body = match[2];
      if (!name || !body || TENANT_EXEMPT.has(name)) continue;
      expect(body, name).toMatch(/\borgId\b/);
    }
  });
});
