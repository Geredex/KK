import { type Tournament, type InsertTournament, type Player, type InsertPlayer, type Match, type InsertMatch, type UpdateMatchScore, type CompleteMatch } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Tournament methods
  createTournament(tournament: InsertTournament): Promise<Tournament>;
  getTournament(id: string): Promise<Tournament | undefined>;
  updateTournamentStatus(id: string, status: string, currentRound?: number): Promise<Tournament | undefined>;
  deleteTournament(id: string): Promise<boolean>;
  
  // Player methods
  addPlayer(player: InsertPlayer): Promise<Player>;
  getPlayersByTournament(tournamentId: string): Promise<Player[]>;
  updatePlayer(id: string, name: string): Promise<Player | undefined>;
  deletePlayer(id: string): Promise<boolean>;
  
  // Match methods
  createMatch(match: InsertMatch): Promise<Match>;
  getMatchesByTournament(tournamentId: string): Promise<Match[]>;
  getMatchesByRound(tournamentId: string, round: number): Promise<Match[]>;
  updateMatchScore(id: string, scores: UpdateMatchScore): Promise<Match | undefined>;
  completeMatch(id: string, result: CompleteMatch): Promise<Match | undefined>;
  updateMatchStatus(id: string, status: string): Promise<Match | undefined>;
  updateMatch(id: string, updates: Partial<Match>): Promise<Match | undefined>;
  getMatch(id: string): Promise<Match | undefined>;
}

export class MemStorage implements IStorage {
  private tournaments: Map<string, Tournament>;
  private players: Map<string, Player>;
  private matches: Map<string, Match>;

  constructor() {
    this.tournaments = new Map();
    this.players = new Map();
    this.matches = new Map();
  }

  // Tournament methods
  async createTournament(insertTournament: InsertTournament): Promise<Tournament> {
    const id = randomUUID();
    const defaultRounds = insertTournament.size === 16 ? 4 : 5;
    const totalRounds = insertTournament.totalRounds || defaultRounds;
    const tournament: Tournament = {
      id,
      name: insertTournament.name,
      size: insertTournament.size,
      status: "setup",
      currentRound: 1,
      totalRounds,
      createdAt: new Date(),
    };
    this.tournaments.set(id, tournament);
    return tournament;
  }

  async getTournament(id: string): Promise<Tournament | undefined> {
    return this.tournaments.get(id);
  }

  async updateTournamentStatus(id: string, status: string, currentRound?: number): Promise<Tournament | undefined> {
    const tournament = this.tournaments.get(id);
    if (!tournament) return undefined;
    
    const updated = { ...tournament, status, ...(currentRound && { currentRound }) };
    this.tournaments.set(id, updated);
    return updated;
  }

  async deleteTournament(id: string): Promise<boolean> {
    return this.tournaments.delete(id);
  }

  // Player methods
  async addPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const id = randomUUID();
    const existingPlayers = Array.from(this.players.values()).filter(p => p.tournamentId === insertPlayer.tournamentId);
    const position = existingPlayers.length + 1;
    
    // Automatically assign belt color: odd positions get red, even positions get blue
    const beltColor = position % 2 === 1 ? "red" : "blue";
    
    const player: Player = {
      id,
      name: insertPlayer.name,
      tournamentId: insertPlayer.tournamentId,
      position,
      beltColor: insertPlayer.beltColor || beltColor,
    };
    this.players.set(id, player);
    return player;
  }

  async getPlayersByTournament(tournamentId: string): Promise<Player[]> {
    return Array.from(this.players.values())
      .filter(player => player.tournamentId === tournamentId)
      .sort((a, b) => a.position - b.position);
  }

  async updatePlayer(id: string, name: string): Promise<Player | undefined> {
    const player = this.players.get(id);
    if (!player) return undefined;
    
    const updated = { ...player, name };
    this.players.set(id, updated);
    return updated;
  }

  async deletePlayer(id: string): Promise<boolean> {
    return this.players.delete(id);
  }

  // Match methods
  async createMatch(insertMatch: InsertMatch): Promise<Match> {
    const id = randomUUID();
    const match: Match = {
      id,
      tournamentId: insertMatch.tournamentId,
      round: insertMatch.round,
      position: insertMatch.position,
      player1Id: insertMatch.player1Id || null,
      player2Id: insertMatch.player2Id || null,
      player1Score: 0,
      player2Score: 0,
      player1Ippon: 0,
      player1Wazari: 0,
      player1Yuko: 0,
      player1Warnings: 0,
      player2Ippon: 0,
      player2Wazari: 0,
      player2Yuko: 0,
      player2Warnings: 0,
      status: "pending",
      winnerId: null,
      startTime: null,
      endTime: null,
    };
    this.matches.set(id, match);
    return match;
  }

  async getMatchesByTournament(tournamentId: string): Promise<Match[]> {
    return Array.from(this.matches.values())
      .filter(match => match.tournamentId === tournamentId)
      .sort((a, b) => a.round - b.round || a.position - b.position);
  }

  async getMatchesByRound(tournamentId: string, round: number): Promise<Match[]> {
    return Array.from(this.matches.values())
      .filter(match => match.tournamentId === tournamentId && match.round === round)
      .sort((a, b) => a.position - b.position);
  }

  async updateMatchScore(id: string, scores: UpdateMatchScore): Promise<Match | undefined> {
    const match = this.matches.get(id);
    if (!match) return undefined;
    
    const updated = { 
      ...match, 
      player1Score: scores.player1Score,
      player2Score: scores.player2Score,
      player1Ippon: scores.player1Ippon ?? match.player1Ippon,
      player1Wazari: scores.player1Wazari ?? match.player1Wazari,
      player1Yuko: scores.player1Yuko ?? match.player1Yuko,
      player1Warnings: scores.player1Warnings ?? match.player1Warnings,
      player2Ippon: scores.player2Ippon ?? match.player2Ippon,
      player2Wazari: scores.player2Wazari ?? match.player2Wazari,
      player2Yuko: scores.player2Yuko ?? match.player2Yuko,
      player2Warnings: scores.player2Warnings ?? match.player2Warnings,
      status: "in_progress",
      ...(match.startTime === null && { startTime: new Date() })
    };
    this.matches.set(id, updated);
    return updated;
  }

  async completeMatch(id: string, result: CompleteMatch): Promise<Match | undefined> {
    const match = this.matches.get(id);
    if (!match) return undefined;
    
    const updated = { 
      ...match, 
      player1Score: result.player1Score,
      player2Score: result.player2Score,
      player1Ippon: result.player1Ippon ?? match.player1Ippon,
      player1Wazari: result.player1Wazari ?? match.player1Wazari,
      player1Yuko: result.player1Yuko ?? match.player1Yuko,
      player1Warnings: result.player1Warnings ?? match.player1Warnings,
      player2Ippon: result.player2Ippon ?? match.player2Ippon,
      player2Wazari: result.player2Wazari ?? match.player2Wazari,
      player2Yuko: result.player2Yuko ?? match.player2Yuko,
      player2Warnings: result.player2Warnings ?? match.player2Warnings,
      winnerId: result.winnerId,
      status: "completed",
      endTime: new Date(),
      ...(match.startTime === null && { startTime: new Date() })
    };
    this.matches.set(id, updated);
    return updated;
  }

  async updateMatchStatus(id: string, status: string): Promise<Match | undefined> {
    const match = this.matches.get(id);
    if (!match) return undefined;
    
    const updated = { 
      ...match, 
      status,
      ...(status === "in_progress" && match.startTime === null && { startTime: new Date() })
    };
    this.matches.set(id, updated);
    return updated;
  }

  async updateMatch(id: string, updates: Partial<Match>): Promise<Match | undefined> {
    const match = this.matches.get(id);
    if (!match) return undefined;
    
    const updated = { ...match, ...updates };
    this.matches.set(id, updated);
    return updated;
  }

  async getMatch(id: string): Promise<Match | undefined> {
    return this.matches.get(id);
  }
}

export const storage = new MemStorage();
