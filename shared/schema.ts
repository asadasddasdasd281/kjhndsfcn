import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  productNumber: text("product_number").notNull().unique(),
  status: text("status").notNull().default("active"), // active, completed, archived
  createdAt: timestamp("created_at").defaultNow(),
  lastSaved: timestamp("last_saved").defaultNow(),
});

export const sessionData = pgTable("session_data", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => sessions.id),
  dataType: text("data_type").notNull(), // form, images, annotations
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const images = pgTable("images", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => sessions.id),
  originalName: text("original_name").notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  labeledPath: text("labeled_path"),
  annotationCount: integer("annotation_count").default(0),
  isLabeled: boolean("is_labeled").default(false),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const annotations = pgTable("annotations", {
  id: serial("id").primaryKey(),
  imageId: integer("image_id").references(() => images.id),
  sessionId: integer("session_id").references(() => sessions.id),
  boundingBox: jsonb("bounding_box").notNull(), // {x, y, width, height}
  category: text("category").notNull(),
  subcategories: text("subcategories").array().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const formData = pgTable("form_data", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => sessions.id),
  section: text("section").notNull(), // product_info, auth1, auth2, regional, feedback
  fieldName: text("field_name").notNull(),
  fieldValue: text("field_value"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Zod schemas
export const insertSessionSchema = createInsertSchema(sessions).pick({
  productNumber: true,
});

export const insertSessionDataSchema = createInsertSchema(sessionData).pick({
  sessionId: true,
  dataType: true,
  data: true,
});

export const insertImageSchema = createInsertSchema(images).pick({
  sessionId: true,
  originalName: true,
  fileName: true,
  filePath: true,
});

export const insertAnnotationSchema = createInsertSchema(annotations).pick({
  imageId: true,
  sessionId: true,
  boundingBox: true,
  category: true,
  subcategories: true,
});

export const insertFormDataSchema = createInsertSchema(formData).pick({
  sessionId: true,
  section: true,
  fieldName: true,
  fieldValue: true,
});

// Types
export type Session = typeof sessions.$inferSelect;
export type SessionData = typeof sessionData.$inferSelect;
export type Image = typeof images.$inferSelect;
export type Annotation = typeof annotations.$inferSelect;
export type FormData = typeof formData.$inferSelect;

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type InsertSessionData = z.infer<typeof insertSessionDataSchema>;
export type InsertImage = z.infer<typeof insertImageSchema>;
export type InsertAnnotation = z.infer<typeof insertAnnotationSchema>;
export type InsertFormData = z.infer<typeof insertFormDataSchema>;

// Additional types for the application
export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type LabelCategory = {
  id: string;
  name: string;
  subcategories: string[];
};

export type SessionProgress = {
  imageFlow: {
    uploadCount: number;
    labeledCount: number;
    annotationCount: number;
  };
  formFlow: {
    productInfoComplete: boolean;
    auth1Complete: boolean;
    auth2Complete: boolean;
    regionalComplete: boolean;
    feedbackComplete: boolean;
  };
};
