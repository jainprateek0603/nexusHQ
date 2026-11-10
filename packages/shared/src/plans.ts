export const PLAN_IDS = ["FREE", "PRO", "TEAM"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export interface PlanLimits {
  members: number;
  projects: number;
  aiRequestsPerMonth: number;
  uploadBytes: number;
  apiRequestsPerMinute: number;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  FREE: {
    members: 5,
    projects: 3,
    aiRequestsPerMonth: 40,
    uploadBytes: 5 * 1024 * 1024,
    apiRequestsPerMinute: 60,
  },
  PRO: {
    members: 25,
    projects: 100,
    aiRequestsPerMonth: 2000,
    uploadBytes: 25 * 1024 * 1024,
    apiRequestsPerMinute: 600,
  },
  TEAM: {
    members: 200,
    projects: 1000,
    aiRequestsPerMonth: 20000,
    uploadBytes: 100 * 1024 * 1024,
    apiRequestsPerMinute: 3000,
  },
};

export const PLAN_PRICES = {
  FREE: 0,
  PRO: 12,
  TEAM: 24,
} as const;

export function isPlan(value: string): value is PlanId {
  return (PLAN_IDS as readonly string[]).includes(value);
}

export function limitsForPlan(plan: string): PlanLimits {
  if (!isPlan(plan)) return PLAN_LIMITS.FREE;
  return PLAN_LIMITS[plan];
}

export function isWithinLimit(used: number, limit: number): boolean {
  return used < limit;
}

export function nextPeriodStart(start: Date, now = new Date()): Date {
  const boundary = new Date(start);
  boundary.setUTCMonth(boundary.getUTCMonth() + 1);
  if (now < boundary) return start;
  const rolled = new Date(now);
  rolled.setUTCDate(start.getUTCDate());
  rolled.setUTCHours(start.getUTCHours(), start.getUTCMinutes(), start.getUTCSeconds(), start.getUTCMilliseconds());
  if (rolled > now) rolled.setUTCMonth(rolled.getUTCMonth() - 1);
  return rolled;
}

export function periodExpired(start: Date, now = new Date()): boolean {
  const boundary = new Date(start);
  boundary.setUTCMonth(boundary.getUTCMonth() + 1);
  return now >= boundary;
}
