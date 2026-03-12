import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email"),
  full_name: text("full_name"),
  avatar_url: text("avatar_url"),
  role: text("role", { enum: ["user", "admin"] })
    .default("user")
    .notNull(),
  is_subscriber: boolean("is_subscriber").default(false).notNull(),
  stripe_customer_id: text("stripe_customer_id"),
  stripe_subscription_id: text("stripe_subscription_id"),
  subscription_status: text("subscription_status"),
  has_accepted_terms: boolean("has_accepted_terms").default(false).notNull(),
  credits: integer("credits").default(0).notNull(),
  last_active_at: timestamp("last_active_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertProfileSchema = createInsertSchema(profiles, {
  email: z.string().email(),
  full_name: z.string().min(2).max(100).optional(),
});

export const updateProfileSchema = insertProfileSchema.partial();

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type UpdateProfileRequest = z.infer<typeof updateProfileSchema>;

// --- Categories ---
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  is_active: boolean("is_active").default(true).notNull(),
  display_order: integer("display_order").default(0).notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const insertCategorySchema = createInsertSchema(categories, {
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100),
  is_active: z.boolean().optional().default(true),
  display_order: z.number().int().min(0).optional().default(0),
});

export const updateCategorySchema = insertCategorySchema
  .partial()
  .omit({ id: true as never });

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

// --- Image Slot type ---
export interface ImageSlot {
  label: string;
  required: boolean;
}

// --- Text Field Slot type ---
export interface TextFieldSlot {
  label: string;
  required: boolean;
}

// --- Prompt Templates ---
export const promptTemplates = pgTable("prompt_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  prompt_text: text("prompt_text").notNull(),
  category: text("category"),
  is_active: boolean("is_active").default(true).notNull(),
  image_slots: text("image_slots"),
  text_fields: text("text_fields"),
  example_before_url: text("example_before_url"),
  example_after_url: text("example_after_url"),
  keywords: text("keywords"),
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

export const insertPromptTemplateSchema = createInsertSchema(promptTemplates, {
  name: z.string().min(2).max(200),
  prompt_text: z.string().min(10).max(2000),
  category: z.string().max(100).optional().nullable(),
  image_slots: z.string().max(2000).optional(),
  text_fields: z.string().max(2000).optional(),
  example_before_url: z.string().max(500).optional(),
  example_after_url: z.string().max(500).optional(),
  keywords: z.string().max(1000).optional().nullable(),
});

export const updatePromptTemplateSchema = insertPromptTemplateSchema
  .partial()
  .omit({ id: true as never });

export type PromptTemplate = typeof promptTemplates.$inferSelect;
export type InsertPromptTemplate = z.infer<typeof insertPromptTemplateSchema>;

// --- Generated Pranks ---
export const generatedPranks = pgTable("generated_pranks", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id")
    .references(() => profiles.id, { onDelete: "cascade" })
    .notNull(),
  template_id: uuid("template_id").references(() => promptTemplates.id, {
    onDelete: "set null",
  }),
  final_prompt: text("final_prompt").notNull(),
  kie_task_id: text("kie_task_id").notNull(),
  status: text("status", { enum: ["waiting", "success", "fail"] })
    .default("waiting")
    .notNull(),
  result_urls: text("result_urls"),
  input_urls: text("input_urls"),
  fail_message: text("fail_message"),
  cost_time: text("cost_time"),
  aspect_ratio: text("aspect_ratio"),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const insertGeneratedPrankSchema = createInsertSchema(generatedPranks, {
  final_prompt: z.string().min(1).max(2000),
  kie_task_id: z.string().min(1),
});

export type GeneratedPrank = typeof generatedPranks.$inferSelect;
export type InsertGeneratedPrank = z.infer<typeof insertGeneratedPrankSchema>;
