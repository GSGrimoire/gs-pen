import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const diagnosticEvents = sqliteTable('diagnostic_events', {
  id: text('id').primaryKey(),
  createdAt: integer('created_at').notNull(),
  expiresAt: integer('expires_at').notNull(),
  payload: text('payload').notNull(),
}, t => [index('diagnostic_expiry').on(t.expiresAt)]);
export const requestBudget = sqliteTable('request_budget', {
  scope: text('scope').primaryKey(),
  window: integer('window').notNull(),
  used: integer('used').notNull(),
});
export const extractions = sqliteTable('extractions', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  sourceUrl: text('source_url').notNull(),
  platform: text('platform').notNull(),
  createdAt: integer('created_at').notNull(),
  expiresAt: integer('expires_at').notNull(),
  payload: text('payload').notNull(),
}, t => [index('extraction_owner_created').on(t.ownerId,t.createdAt),index('extraction_expiry').on(t.expiresAt)]);

export const contentJobs = sqliteTable('content_jobs', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  inputHash: text('input_hash').notNull(),
  version: integer('version').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  payload: text('payload').notNull(),
}, t => [uniqueIndex('content_owner_input').on(t.ownerId,t.inputHash), index('content_owner_updated').on(t.ownerId,t.updatedAt)]);
