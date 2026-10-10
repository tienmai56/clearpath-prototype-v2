import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const photoSessions = sqliteTable('photo_sessions', {
  id: text('id').primaryKey(), owner: text('owner').notNull(), tokenHash: text('token_hash').notNull(),
  student: text('student').notNull(), objective: text('objective').notNull(), expires: integer('expires').notNull(),
  maxFiles: integer('max_files').notNull(), fileCount: integer('file_count').notNull().default(0),
}, table => [index('photo_sessions_owner').on(table.owner), index('photo_sessions_expiry').on(table.expires)]);

export const photoFiles = sqliteTable('photo_files', {
  id: text('id').primaryKey(), session: text('session').notNull().references(() => photoSessions.id, {onDelete: 'cascade'}),
  name: text('name').notNull(), type: text('type').notNull(), size: integer('size').notNull(), objectKey: text('object_key').notNull(),
  delivered: integer('delivered').notNull().default(0), created: integer('created').notNull(),
}, table => [index('photo_files_session').on(table.session)]);
