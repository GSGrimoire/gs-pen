import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
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
