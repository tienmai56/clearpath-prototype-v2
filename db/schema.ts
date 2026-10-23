import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const studentIntakes = sqliteTable('student_intakes', {
  id: text('id').primaryKey(), owner: text('owner').notNull(), student: text('student').notNull(),
  drafts: text('drafts').notNull().default('{}'), updated: integer('updated').notNull(),
}, table => [uniqueIndex('student_intakes_owner_student').on(table.owner,table.student)]);

export const intakeFiles = sqliteTable('intake_files', {
  id: text('id').primaryKey(), intake: text('intake').notNull().references(() => studentIntakes.id, {onDelete:'cascade'}),
  name: text('name').notNull(), type: text('type').notNull(), size: integer('size').notNull(),
  objectKey: text('object_key').notNull(), source: text('source').notNull(), created: integer('created').notNull(),
}, table => [index('intake_files_intake').on(table.intake)]);

export const photoSessions = sqliteTable('photo_sessions', {
  id: text('id').primaryKey(), owner: text('owner').notNull(), tokenHash: text('token_hash').notNull(),
  student: text('student').notNull(), objective: text('objective').notNull(), expires: integer('expires').notNull(),
  maxFiles: integer('max_files').notNull(), fileCount: integer('file_count').notNull().default(0),
  intakeId: text('intake_id').references(() => studentIntakes.id),
}, table => [index('photo_sessions_owner').on(table.owner), index('photo_sessions_expiry').on(table.expires)]);

export const photoFiles = sqliteTable('photo_files', {
  id: text('id').primaryKey(), session: text('session').notNull().references(() => photoSessions.id, {onDelete: 'cascade'}),
  name: text('name').notNull(), type: text('type').notNull(), size: integer('size').notNull(), objectKey: text('object_key').notNull(),
  delivered: integer('delivered').notNull().default(0), created: integer('created').notNull(),
}, table => [index('photo_files_session').on(table.session)]);
