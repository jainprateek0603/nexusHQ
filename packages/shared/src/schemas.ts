import { z } from "zod";
import { PERMISSIONS } from "./permissions";
import { PLAN_IDS } from "./plans";
import { CHANNEL_TYPES, PRIORITIES, TASK_STATUSES, WEBHOOK_EVENTS } from "./text";

const email = z
  .string()
  .trim()
  .email()
  .max(320)
  .transform((value) => value.toLowerCase());

const password = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(200)
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), {
    message: "Use at least one letter and one number.",
  });

const id = z.string().min(1).max(64);
const shortText = z.string().trim().min(1).max(200);

export const signupSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email,
  password,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(200),
});

export const mfaSchema = z.object({
  mfaToken: z.string().min(10),
  code: z.string().trim().min(6).max(16),
});

export const totpCodeSchema = z.object({
  code: z.string().trim().min(6).max(16),
});

export const totpDisableSchema = z.object({
  password: z.string().min(1).max(200),
  code: z.string().trim().min(6).max(16),
});

export const createOrgSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export const updateOrgSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export const inviteSchema = z.object({
  email,
  role: z.enum(["ADMIN", "MEMBER", "GUEST"]),
});

export const updateMemberSchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "MEMBER", "GUEST"]),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(20).max(200),
});

export const createProjectSchema = z.object({
  name: shortText,
  key: z
    .string()
    .trim()
    .min(2)
    .max(8)
    .regex(/^[A-Za-z][A-Za-z0-9]+$/, "Use letters and numbers, starting with a letter.")
    .transform((value) => value.toUpperCase()),
  description: z.string().max(4000).optional(),
});

export const updateProjectSchema = z.object({
  name: shortText.optional(),
  description: z.string().max(4000).optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

export const createSprintSchema = z.object({
  name: shortText,
  goal: z.string().max(2000).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

export const updateSprintSchema = createSprintSchema.partial().extend({
  status: z.enum(["PLANNED", "ACTIVE", "COMPLETED"]).optional(),
});

export const createLabelSchema = z.object({
  name: z.string().trim().min(1).max(40),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

export const createTaskSchema = z.object({
  title: shortText,
  description: z.string().max(20000).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  assigneeId: id.nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  parentId: id.nullable().optional(),
  sprintId: id.nullable().optional(),
  labelIds: z.array(id).max(20).optional(),
});

export const updateTaskSchema = createTaskSchema.partial();

export const moveTaskSchema = z.object({
  status: z.enum(TASK_STATUSES),
  position: z.number(),
});

export const dependencySchema = z.object({
  dependsOnId: id,
});

export const commentSchema = z.object({
  body: z.string().trim().min(1).max(10000),
  parentId: id.optional(),
  anchorText: z.string().max(500).optional(),
});

export const createDocumentSchema = z.object({
  title: z.string().trim().min(1).max(200),
  parentId: id.nullable().optional(),
  icon: z.string().max(16).optional(),
});

export const updateDocumentSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  parentId: id.nullable().optional(),
  icon: z.string().max(16).nullable().optional(),
  position: z.number().optional(),
});

export const createChannelSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9][a-z0-9-]*$/, "Use lowercase letters, numbers, and hyphens."),
  description: z.string().max(500).optional(),
  type: z.enum(["PUBLIC", "PRIVATE"]).default("PUBLIC"),
  memberIds: z.array(id).max(50).optional(),
});

export const updateChannelSchema = z.object({
  name: createChannelSchema.shape.name.optional(),
  description: z.string().max(500).optional(),
});

export const dmSchema = z.object({
  userId: id,
});

export const createMessageSchema = z.object({
  body: z.string().trim().min(1).max(8000),
  parentId: id.optional(),
  attachmentIds: z.array(id).max(8).optional(),
});

export const updateMessageSchema = z.object({
  body: z.string().trim().min(1).max(8000),
});

export const reactionSchema = z.object({
  emoji: z.string().trim().min(1).max(16),
});

export const channelMemberSchema = z.object({
  userId: id,
});

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(25).default(15),
});

export const notificationReadSchema = z.object({
  ids: z.array(id).max(100).optional(),
  all: z.boolean().optional(),
});

export const preferenceSchema = z.object({
  emailDigest: z.enum(["OFF", "DAILY", "WEEKLY"]),
  inApp: z.boolean(),
  emailMentions: z.boolean(),
});

export const askSchema = z.object({
  question: z.string().trim().min(1).max(4000),
});

export const summarizeDocumentSchema = z.object({
  documentId: id,
});

export const summarizeThreadSchema = z.object({
  messageId: id,
});

export const notesToTasksSchema = z.object({
  projectId: id,
  notes: z.string().trim().min(1).max(20000),
  sprintId: id.optional(),
});

export const draftDocumentSchema = z.object({
  title: z.string().trim().min(1).max(200),
  outline: z.string().trim().min(1).max(20000),
  parentId: id.optional(),
});

export const weeklyStatusSchema = z.object({
  projectId: id,
  saveAsDocument: z.boolean().optional(),
});

export const checkoutSchema = z.object({
  plan: z.enum(["PRO", "TEAM"]),
});

export const createApiKeySchema = z.object({
  name: shortText,
  scopes: z.array(z.enum(PERMISSIONS)).min(1).max(PERMISSIONS.length),
  expiresAt: z.string().datetime().optional(),
});

export const createWebhookSchema = z.object({
  url: z.string().url().max(500),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1),
});

export const updateWebhookSchema = z.object({
  url: z.string().url().max(500).optional(),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1).optional(),
  enabled: z.boolean().optional(),
});

export const featureFlagSchema = z.object({
  description: z.string().max(300),
  enabled: z.boolean(),
  orgAllowlist: z.array(id).max(500),
});

export const grantSchema = z.object({
  userId: id,
  resourceType: z.enum(["PROJECT", "DOCUMENT", "CHANNEL"]),
  resourceId: id,
});

export const pageQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const taskListQuerySchema = pageQuerySchema.extend({
  status: z.enum(TASK_STATUSES).optional(),
  assigneeId: id.optional(),
  sprintId: id.optional(),
  labelId: id.optional(),
  parentId: id.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const aiTaskDraftSchema = z.object({
  tasks: z
    .array(
      z.object({
        title: shortText,
        description: z.string().max(4000).optional(),
        priority: z.enum(PRIORITIES).optional(),
      }),
    )
    .max(30),
});

export const planSchema = z.enum(PLAN_IDS);
export const channelTypeSchema = z.enum(CHANNEL_TYPES);

export type SignupInput = z.infer<typeof signupSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
