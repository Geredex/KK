import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const tournaments = pgTable("tournaments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  size: integer("size").notNull(), // 16 or 32
  status: text("status").notNull().default("setup"), // setup, active, completed
  currentRound: integer("current_round").default(1),
  totalRounds: integer("total_rounds").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const players = pgTable("players", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  tournamentId: varchar("tournament_id").notNull(),
  position: integer("position").notNull(), // seeding position
  beltColor: text("belt_color").notNull().default("red"), // red or blue
});

export const matches = pgTable("matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull(),
  round: integer("round").notNull(),
  position: integer("position").notNull(), // position in round
  player1Id: varchar("player1_id"),
  player2Id: varchar("player2_id"),
  player1Score: integer("player1_score").default(0),
  player2Score: integer("player2_score").default(0),
  player1Ippon: integer("player1_ippon").default(0),
  player1Wazari: integer("player1_wazari").default(0),
  player1Yuko: integer("player1_yuko").default(0),
  player1Warnings: integer("player1_warnings").default(0),
  player2Ippon: integer("player2_ippon").default(0),
  player2Wazari: integer("player2_wazari").default(0),
  player2Yuko: integer("player2_yuko").default(0),
  player2Warnings: integer("player2_warnings").default(0),
  winnerId: varchar("winner_id"),
  status: text("status").notNull().default("pending"), // pending, in_progress, completed
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
});

export const insertTournamentSchema = createInsertSchema(tournaments).omit({
  id: true,
  createdAt: true,
}).extend({
  size: z.number().min(16).max(32),
  totalRounds: z.number().min(1).max(20).optional(),
});

export const insertPlayerSchema = createInsertSchema(players).omit({
  id: true,
  position: true,
});

export const insertMatchSchema = createInsertSchema(matches).omit({
  id: true,
  startTime: true,
  endTime: true,
});

export const updateMatchScoreSchema = z.object({
  player1Score: z.number().min(0),
  player2Score: z.number().min(0),
  player1Ippon: z.number().min(0).optional(),
  player1Wazari: z.number().min(0).optional(),
  player1Yuko: z.number().min(0).optional(),
  player1Warnings: z.number().min(0).optional(),
  player2Ippon: z.number().min(0).optional(),
  player2Wazari: z.number().min(0).optional(),
  player2Yuko: z.number().min(0).optional(),
  player2Warnings: z.number().min(0).optional(),
});

export const completeMatchSchema = z.object({
  winnerId: z.string(),
  player1Score: z.number().min(0),
  player2Score: z.number().min(0),
  player1Ippon: z.number().min(0).optional(),
  player1Wazari: z.number().min(0).optional(),
  player1Yuko: z.number().min(0).optional(),
  player1Warnings: z.number().min(0).optional(),
  player2Ippon: z.number().min(0).optional(),
  player2Wazari: z.number().min(0).optional(),
  player2Yuko: z.number().min(0).optional(),
  player2Warnings: z.number().min(0).optional(),
});

export type Tournament = typeof tournaments.$inferSelect;
export type InsertTournament = z.infer<typeof insertTournamentSchema>;
export type Player = typeof players.$inferSelect;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Match = typeof matches.$inferSelect;
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type UpdateMatchScore = z.infer<typeof updateMatchScoreSchema>;
export type CompleteMatch = z.infer<typeof completeMatchSchema>;
