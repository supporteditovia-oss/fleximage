import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  integer,
  jsonb,
  inet,
  primaryKey,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "./locales";

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email"),
  full_name: text("full_name"),
  avatar_url: text("avatar_url"),
  preferred_locale: text("preferred_locale", { enum: SUPPORTED_LOCALES })
    .default(DEFAULT_LOCALE)
    .notNull(),
  role: text("role", { enum: ["user", "admin"] })
    .default("user")
    .notNull(),
  is_subscriber: boolean("is_subscriber").default(false).notNull(),
  stripe_customer_id: text("stripe_customer_id"),
  stripe_subscription_id: text("stripe_subscription_id"),
  subscription_status: text("subscription_status"),
  has_accepted_terms: boolean("has_accepted_terms").default(false).notNull(),
  credits: integer("credits").default(0).notNull(),
  generation_count: integer("generation_count").default(0).notNull(),
  last_active_at: timestamp("last_active_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertProfileSchema = createInsertSchema(profiles, {
  email: z.string().email(),
  full_name: z.string().min(2).max(100).optional(),
  preferred_locale: z.enum(SUPPORTED_LOCALES).optional().default(DEFAULT_LOCALE),
});

export const updateProfileSchema = insertProfileSchema.partial();

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type UpdateProfileRequest = z.infer<typeof updateProfileSchema>;

// --- Categories ---
export const templateCategories = pgTable("template_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  name_en: text("name_en"),
  description: text("description"),
  display_order: integer("display_order").default(0).notNull(),
  is_active: boolean("is_active").default(true).notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const categories = templateCategories;

export const insertCategorySchema = createInsertSchema(templateCategories, {
  name: z.string().min(2).max(100),
  name_en: z.string().max(100).nullable().optional(),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().max(500).nullable().optional(),
  is_active: z.boolean().optional().default(true),
  display_order: z.number().int().min(0).optional().default(0),
}).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const updateCategorySchema = insertCategorySchema.partial();

export type Category = typeof templateCategories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export interface TemplateInputSchema {
  video_prompt_text?: string;
  [key: string]: unknown;
}

// --- Templates ---
export const templates = pgTable("templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  category_id: uuid("category_id").references(() => templateCategories.id, {
    onDelete: "set null",
  }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  name_en: text("name_en"),
  description: text("description"),
  prompt_text: text("prompt_text").notNull(),
  generation_type: text("generation_type", { enum: ["image", "video", "both"] })
    .default("image")
    .notNull(),
  input_schema: jsonb("input_schema").$type<TemplateInputSchema>().notNull(),
  example_before_url: text("example_before_url"),
  example_after_url: text("example_after_url"),
  cover_url: text("cover_url"),
  keywords: text("keywords").array().notNull(),
  icon: text("icon"),
  display_order: integer("display_order").default(0).notNull(),
  is_featured: boolean("is_featured").default(false).notNull(),
  is_active: boolean("is_active").default(true).notNull(),
  created_by: uuid("created_by").references(() => profiles.id, {
    onDelete: "set null",
  }),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const promptTemplates = templates;

// --- Template reference images (per-image prompts) ---
export const templateReferenceImages = pgTable("template_reference_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  template_id: uuid("template_id")
    .references(() => templates.id, { onDelete: "cascade" })
    .notNull(),
  url: text("url").notNull(),
  image_prompt: text("image_prompt").notNull(),
  video_prompt: text("video_prompt"),
  display_order: integer("display_order").default(0).notNull(),
  requires_face_asset: boolean("requires_face_asset").default(true).notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type TemplateReferenceImage = typeof templateReferenceImages.$inferSelect;

export type ReferenceImageDto = {
  id: string;
  url: string;
  image_prompt: string;
  video_prompt: string | null;
  display_order: number;
  requires_face_asset: boolean;
};

export const uploadReferenceImageItemSchema = z.object({
  image: z.string().min(1),
  image_prompt: z.string().min(10).max(2000),
  video_prompt: z.string().max(2000).nullable().optional(),
  requires_face_asset: z.boolean().optional().default(true),
});

export const updateReferenceImageSchema = z.object({
  image_prompt: z.string().min(10).max(2000).optional(),
  video_prompt: z.string().max(2000).nullable().optional(),
  requires_face_asset: z.boolean().optional(),
});

export const insertPromptTemplateSchema = z.object({
  name: z.string().min(2).max(200),
  name_en: z.string().max(200).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  prompt_text: z.string().min(10).max(2000),
  category: z.string().max(100).nullable().optional(),
  is_active: z.boolean().optional().default(true),
  video_prompt_text: z.string().max(2000).nullable().optional(),
  example_before_url: z.string().max(500).nullable().optional(),
  example_after_url: z.string().max(500).nullable().optional(),
  keywords: z.string().max(1000).nullable().optional(),
  icon: z.string().max(100).nullable().optional(),
  generation_type: z.enum(["image", "video", "both"]).optional().default("image"),
});

export const updatePromptTemplateSchema = insertPromptTemplateSchema.partial();

export type Template = typeof templates.$inferSelect;
export type PromptTemplate = {
  id: string;
  name: string;
  name_en?: string | null;
  description?: string | null;
  prompt_text: string;
  category: string | null;
  categoryName?: string | null;
  categoryNameEn?: string | null;
  category_id?: string | null;
  is_active: boolean;
  reference_image_count: number;
  /** At least one reference image can be used without face capture */
  has_face_optional_reference_image: boolean;
  /** User must complete face capture before generating with this template */
  requires_face_capture: boolean;
  video_prompt_text: string | null;
  example_before_url: string | null;
  example_after_url: string | null;
  keywords: string | null;
  icon: string | null;
  generation_type?: "image" | "video" | "both";
  display_order?: number;
  is_featured?: boolean;
  created_by?: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};
export type InsertPromptTemplate = z.infer<typeof insertPromptTemplateSchema>;

// --- Generations ---
export const generations = pgTable("generations", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id")
    .references(() => profiles.id, { onDelete: "cascade" })
    .notNull(),
  template_id: uuid("template_id").references(() => templates.id, {
    onDelete: "set null",
  }),
  generation_type: text("generation_type", { enum: ["image", "video"] })
    .notNull(),
  status: text("status", {
    enum: ["queued", "processing", "succeeded", "failed"],
  })
    .default("queued")
    .notNull(),
  prompt: text("prompt").notNull(),
  final_prompt: text("final_prompt").notNull(),
  provider: text("provider", { enum: ["kie", "runway", "oneshot", "fallback"] }),
  provider_task_id: text("provider_task_id"),
  provider_attempts: jsonb("provider_attempts").$type<unknown[]>().notNull(),
  aspect_ratio: text("aspect_ratio"),
  input_assets: jsonb("input_assets").$type<string[]>().notNull(),
  output_assets: jsonb("output_assets").$type<string[]>().notNull(),
  watermarked_assets: jsonb("watermarked_assets").$type<string[]>().notNull(),
  fail_message: text("fail_message"),
  cost_time: integer("cost_time"),
  credit_cost: integer("credit_cost").default(0).notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  completed_at: timestamp("completed_at", { withTimezone: true }),
});

export type Generation = typeof generations.$inferSelect;

export const insertGenerationSchema = z.object({
  final_prompt: z.string().min(1).max(2000),
  provider_task_id: z.string().min(1),
});

export type InsertGeneration = z.infer<typeof insertGenerationSchema>;

// --- Face capture sessions ---
export const faceCaptureSessions = pgTable("face_capture_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id")
    .references(() => profiles.id, { onDelete: "cascade" })
    .notNull(),
  status: text("status", { enum: ["completed", "failed"] })
    .default("completed")
    .notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const faceCaptureAssets = pgTable(
  "face_capture_assets",
  {
    session_id: uuid("session_id")
      .references(() => faceCaptureSessions.id, { onDelete: "cascade" })
      .notNull(),
    user_id: uuid("user_id")
      .references(() => profiles.id, { onDelete: "cascade" })
      .notNull(),
    pose_id: text("pose_id", {
      enum: ["frontal", "profile-right", "profile-left"],
    }).notNull(),
    storage_bucket: text("storage_bucket").default("face-captures").notNull(),
    storage_path: text("storage_path").notNull(),
    content_type: text("content_type").default("image/jpeg").notNull(),
    byte_size: integer("byte_size").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.session_id, table.pose_id] }),
  }),
);

export type FaceCaptureSession = typeof faceCaptureSessions.$inferSelect;
export type FaceCaptureAsset = typeof faceCaptureAssets.$inferSelect;

// --- Favorite Templates ---
export const favoriteTemplates = pgTable("favorite_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id")
    .references(() => profiles.id, { onDelete: "cascade" })
    .notNull(),
  template_id: uuid("template_id")
    .references(() => templates.id, { onDelete: "cascade" })
    .notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type FavoriteTemplate = typeof favoriteTemplates.$inferSelect;

// --- Generation events and rate tracking ---
export const generationEvents = pgTable("generation_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  generation_id: uuid("generation_id").references(() => generations.id, {
    onDelete: "cascade",
  }),
  user_id: uuid("user_id").references(() => profiles.id, {
    onDelete: "set null",
  }),
  event_type: text("event_type").notNull(),
  provider: text("provider", { enum: ["kie", "runway", "oneshot", "fallback"] }),
  provider_task_id: text("provider_task_id"),
  status_from: text("status_from"),
  status_to: text("status_to"),
  ip_address: inet("ip_address"),
  user_agent: text("user_agent"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const generationRateLimits = pgTable(
  "generation_rate_limits",
  {
    subject_type: text("subject_type", { enum: ["ip", "user"] }).notNull(),
    subject_hash: text("subject_hash").notNull(),
    window_start: timestamp("window_start", { withTimezone: true }).notNull(),
    window_seconds: integer("window_seconds").notNull(),
    request_count: integer("request_count").default(0).notNull(),
    first_seen_at: timestamp("first_seen_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    last_seen_at: timestamp("last_seen_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    pk: primaryKey({
      columns: [
        table.subject_type,
        table.subject_hash,
        table.window_start,
        table.window_seconds,
      ],
    }),
  }),
);

// --- Subscriptions ---
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id")
    .references(() => profiles.id, { onDelete: "cascade" })
    .notNull(),
  stripe_subscription_id: text("stripe_subscription_id").notNull(),
  stripe_customer_id: text("stripe_customer_id").notNull(),
  status: text("status").default("active").notNull(),
  price_id: text("price_id").notNull(),
  plan_type: text("plan_type", {
    enum: ["discovery", "essential", "ultimate", "weekly", "monthly", "image", "video"],
  })
    .default("discovery")
    .notNull(),
  credits_per_cycle: integer("credits_per_cycle").default(2500).notNull(),
  billing_interval: text("billing_interval", { enum: ["week", "month"] })
    .default("month")
    .notNull(),
  current_period_start: timestamp("current_period_start", {
    withTimezone: true,
  }),
  current_period_end: timestamp("current_period_end", { withTimezone: true }),
  cancel_at_period_end: boolean("cancel_at_period_end").default(false),
  canceled_at: timestamp("canceled_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;

// --- Credit ledger ---
export const creditLedger = pgTable("credit_ledger", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id")
    .references(() => profiles.id, { onDelete: "cascade" })
    .notNull(),
  generation_id: uuid("generation_id").references(() => generations.id, {
    onDelete: "set null",
  }),
  subscription_id: uuid("subscription_id").references(() => subscriptions.id, {
    onDelete: "set null",
  }),
  delta: integer("delta").notNull(),
  balance_after: integer("balance_after").notNull(),
  reason: text("reason", {
    enum: [
      "subscription_grant",
      "generation_charge",
      "admin_adjustment",
      "refund",
      "system_adjustment",
    ],
  }).notNull(),
  idempotency_key: text("idempotency_key"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type CreditLedgerEntry = typeof creditLedger.$inferSelect;

// --- App settings ---
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  description: text("description"),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// --- Video generation ---
export const generateVideoBodySchema = z.object({
  prompt: z.string().min(1).max(2000),
  video_prompt: z.string().min(1).max(2000).optional(),
  aspect_ratio: z.string().optional(),
  images: z.array(z.string()).max(1).optional(),
  template_id: z.string().uuid().optional(),
  text_values: z.array(z.string().max(500)).optional(),
  use_face_asset: z.boolean().optional(),
});
