import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTournamentSchema, insertPlayerSchema, updateMatchScoreSchema, completeMatchSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Tournament routes
  app.post("/api/tournaments", async (req, res) => {
    try {
      const tournamentData = insertTournamentSchema.parse(req.body);
      const tournament = await storage.createTournament(tournamentData);
      res.json(tournament);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/tournaments/:id", async (req, res) => {
    try {
      const tournament = await storage.getTournament(req.params.id);
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }
      res.json(tournament);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/tournaments/:id/status", async (req, res) => {
    try {
      const { status, currentRound } = req.body;
      const tournament = await storage.updateTournamentStatus(req.params.id, status, currentRound);
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }
      res.json(tournament);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Player routes
  app.post("/api/tournaments/:tournamentId/players", async (req, res) => {
    try {
      const playerData = insertPlayerSchema.parse({
        ...req.body,
        tournamentId: req.params.tournamentId
      });
      const player = await storage.addPlayer(playerData);
      res.json(player);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/tournaments/:tournamentId/players", async (req, res) => {
    try {
      const players = await storage.getPlayersByTournament(req.params.tournamentId);
      res.json(players);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/players/:id", async (req, res) => {
    try {
      const { name } = req.body;
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ message: "Name is required" });
      }
      const player = await storage.updatePlayer(req.params.id, name);
      if (!player) {
        return res.status(404).json({ message: "Player not found" });
      }
      res.json(player);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/players/:id", async (req, res) => {
    try {
      const deleted = await storage.deletePlayer(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Player not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Match routes
  app.get("/api/tournaments/:tournamentId/matches", async (req, res) => {
    try {
      const matches = await storage.getMatchesByTournament(req.params.tournamentId);
      res.json(matches);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/tournaments/:tournamentId/matches/round/:round", async (req, res) => {
    try {
      const round = parseInt(req.params.round);
      const matches = await storage.getMatchesByRound(req.params.tournamentId, round);
      res.json(matches);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/matches/:id/score", async (req, res) => {
    try {
      const scoreData = updateMatchScoreSchema.parse(req.body);
      const match = await storage.updateMatchScore(req.params.id, scoreData);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      res.json(match);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/matches/:id/complete", async (req, res) => {
    try {
      const resultData = completeMatchSchema.parse(req.body);
      const match = await storage.completeMatch(req.params.id, resultData);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      // Advance winner to next round if not final round
      const tournament = await storage.getTournament(match.tournamentId);
      if (tournament && match.round < tournament.totalRounds) {
        const allMatches = await storage.getMatchesByTournament(match.tournamentId);
        const nextRoundMatches = allMatches.filter(m => m.round === match.round + 1);
        
        // Find the corresponding match in the next round
        const nextMatchPosition = Math.ceil(match.position / 2);
        const nextMatch = nextRoundMatches.find(m => m.position === nextMatchPosition);
        
        if (nextMatch) {
          // Determine if winner goes to player1 or player2 slot
          const isPlayer1Slot = (match.position % 2 === 1);
          
          if (isPlayer1Slot && !nextMatch.player1Id) {
            await storage.updateMatch(nextMatch.id, { player1Id: resultData.winnerId });
          } else if (!isPlayer1Slot && !nextMatch.player2Id) {
            await storage.updateMatch(nextMatch.id, { player2Id: resultData.winnerId });
          }
        }
      }

      res.json(match);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/matches/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      const match = await storage.updateMatchStatus(req.params.id, status);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      res.json(match);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/matches/:id", async (req, res) => {
    try {
      const match = await storage.getMatch(req.params.id);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      res.json(match);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Generate bracket for tournament
  app.post("/api/tournaments/:tournamentId/generate-bracket", async (req, res) => {
    try {
      const tournamentId = req.params.tournamentId;
      const tournament = await storage.getTournament(tournamentId);
      const players = await storage.getPlayersByTournament(tournamentId);
      
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }

      if (players.length !== tournament.size) {
        return res.status(400).json({ message: `Need exactly ${tournament.size} players to generate bracket` });
      }

      // For non-power-of-2 player counts, we need to handle byes in the first round
      const isPowerOfTwo = (tournament.size & (tournament.size - 1)) === 0;
      let firstRoundMatches = [];
      
      if (isPowerOfTwo) {
        // Standard bracket for power of 2
        for (let i = 0; i < players.length; i += 2) {
          const match = await storage.createMatch({
            tournamentId,
            round: 1,
            position: Math.floor(i / 2) + 1,
            player1Id: players[i].id,
            player2Id: players[i + 1].id,
            status: "pending"
          });
          firstRoundMatches.push(match);
        }
      } else {
        // Handle non-power-of-2 with byes
        const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(tournament.size)));
        const byes = nextPowerOfTwo - tournament.size;
        const firstRoundPlayers = tournament.size - byes;
        
        // Create matches for players who don't get byes
        for (let i = 0; i < firstRoundPlayers; i += 2) {
          const match = await storage.createMatch({
            tournamentId,
            round: 1,
            position: Math.floor(i / 2) + 1,
            player1Id: players[i].id,
            player2Id: players[i + 1].id,
            status: "pending"
          });
          firstRoundMatches.push(match);
        }
        
        // Automatically advance bye players to round 2
        const byeWinners = players.slice(firstRoundPlayers);
        // We'll handle bye advancement in the next round creation
      }

      // Generate subsequent round matches (empty for now)
      for (let round = 2; round <= tournament.totalRounds; round++) {
        const matchesInRound = Math.pow(2, tournament.totalRounds - round);
        for (let position = 1; position <= matchesInRound; position++) {
          await storage.createMatch({
            tournamentId,
            round,
            position,
            player1Id: null,
            player2Id: null,
            status: "pending"
          });
        }
      }

      // Update tournament status
      await storage.updateTournamentStatus(tournamentId, "active");

      const allMatches = await storage.getMatchesByTournament(tournamentId);
      res.json(allMatches);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
