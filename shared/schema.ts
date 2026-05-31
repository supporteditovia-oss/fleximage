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

// --- Template input schema DTOs ---
export interface ImageSlot {
  label: string;
  required: boolean;
}

export interface TextFieldSlot {
  label: string;
  required: boolean;
}

export interface TemplateInputSchema {
  image_slots?: ImageSlot[];
  text_fields?: TextFieldSlot[];
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

export const insertPromptTemplateSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(500).nullable().optional(),
  prompt_text: z.string().min(10).max(2000),
  category: z.string().max(100).nullable().optional(),
  is_active: z.boolean().optional().default(true),
  image_slots: z.string().max(2000).nullable().optional(),
  text_fields: z.string().max(2000).nullable().optional(),
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
  description?: string | null;
  prompt_text: string;
  category: string | null;
  category_id?: string | null;
  is_active: boolean;
  image_slots: string | null;
  text_fields: string | null;
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
  cost_time: text("cost_time"),
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
  plan_type: text("plan_type", { enum: ["weekly", "monthly", "image", "video"] })
    .default("weekly")
    .notNull(),
  credits_per_cycle: integer("credits_per_cycle").default(100).notNull(),
  billing_interval: text("billing_interval", { enum: ["week", "month"] })
    .default("week")
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
  aspect_ratio: z.string().optional(),
  images: z.array(z.string()).max(1).optional(),
});
