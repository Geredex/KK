import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Match, Player } from "@shared/schema";

export default function MatchKata() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [player1Scores, setPlayer1Scores] = useState<number[]>([0, 0, 0, 0, 0]);
  const [player2Scores, setPlayer2Scores] = useState<number[]>([0, 0, 0, 0, 0]);

  const matchId = localStorage.getItem("currentMatchId");
  const tournamentId = localStorage.getItem("currentTournamentId");

  const { data: match } = useQuery<Match>({
    queryKey: ["/api/matches", matchId],
    enabled: !!matchId,
  });

  const { data: players = [] } = useQuery<Player[]>({
    queryKey: ["/api/tournaments", tournamentId, "players"],
    enabled: !!tournamentId,
  });

  // Hydrate scores from match data when it loads
  useEffect(() => {
    if (match) {
      if (match.player1KataScores && Array.isArray(match.player1KataScores)) {
        setPlayer1Scores(match.player1KataScores);
      }
      if (match.player2KataScores && Array.isArray(match.player2KataScores)) {
        setPlayer2Scores(match.player2KataScores);
      }
    }
  }, [match]);

  const updateScoreMutation = useMutation({
    mutationFn: async (data: { 
      player1Score: number; 
      player2Score: number;
      player1KataScores?: number[];
      player2KataScores?: number[];
    }) => {
      const response = await apiRequest("PATCH", `/api/matches/${matchId}/score`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches", matchId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", tournamentId, "matches"] });
    },
  });

  const completeMatchMutation = useMutation({
    mutationFn: async (data: { 
      winnerId: string; 
      player1Score: number; 
      player2Score: number;
      player1KataScores?: number[];
      player2KataScores?: number[];
    }) => {
      const response = await apiRequest("PATCH", `/api/matches/${matchId}/complete`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches", matchId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", tournamentId, "matches"] });
      toast({
        title: "Match Completed",
        description: "Kata match has been completed successfully.",
      });
      setLocation("/bracket");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete match",
        variant: "destructive",
      });
    },
  });

  // Calculate kata score: drop highest and lowest, sum the remaining 3
  const calculateKataScore = (scores: number[]): number => {
    if (scores.length !== 5) return 0;
    const validScores = scores.filter(s => s > 0);
    if (validScores.length < 3) return 0;
    
    // Sort scores to easily remove highest and lowest
    const sortedScores = [...validScores].sort((a, b) => a - b);
    
    // If we have exactly 5 scores, drop first (lowest) and last (highest)
    // Sum the middle 3
    if (sortedScores.length === 5) {
      const middleThree = sortedScores.slice(1, 4);
      return Number(middleThree.reduce((sum, score) => sum + score, 0).toFixed(2));
    }
    
    // If less than 5 scores, just sum what we have
    return Number(sortedScores.reduce((sum, score) => sum + score, 0).toFixed(2));
  };

  const handleScoreChange = (playerNumber: 1 | 2, judgeIndex: number, value: string) => {
    const score = parseFloat(value) || 0;
    
    if (playerNumber === 1) {
      const newScores = [...player1Scores];
      newScores[judgeIndex] = score;
      setPlayer1Scores(newScores);
    } else {
      const newScores = [...player2Scores];
      newScores[judgeIndex] = score;
      setPlayer2Scores(newScores);
    }
  };

  const handleSubmitScores = () => {
    const player1FinalScore = calculateKataScore(player1Scores);
    const player2FinalScore = calculateKataScore(player2Scores);

    updateScoreMutation.mutate({
      player1Score: player1FinalScore,
      player2Score: player2FinalScore,
      player1KataScores: player1Scores,
      player2KataScores: player2Scores,
    });

    toast({
      title: "Scores Updated",
      description: "Kata scores have been calculated and saved.",
    });
  };

  const handleEndMatch = () => {
    const player1FinalScore = calculateKataScore(player1Scores);
    const player2FinalScore = calculateKataScore(player2Scores);

    if (player1FinalScore === player2FinalScore) {
      toast({
        title: "Error",
        description: "Match cannot end in a tie. Please adjust scores.",
        variant: "destructive",
      });
      return;
    }

    const winnerId = player1FinalScore > player2FinalScore ? match!.player1Id! : match!.player2Id!;

    completeMatchMutation.mutate({
      winnerId,
      player1Score: player1FinalScore,
      player2Score: player2FinalScore,
      player1KataScores: player1Scores,
      player2KataScores: player2Scores,
    });
  };

  if (!matchId || !match) {
    return (
      <div className="max-w-4xl mx-auto p-6 pb-20 sm:pb-6">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No Match Selected</h2>
            <p className="text-gray-600 mb-6">Please select a match from the bracket.</p>
            <Button
              onClick={() => setLocation("/bracket")}
              className="bg-tournament-500 hover:bg-tournament-600"
            >
              Go to Bracket
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const player1 = players.find(p => p.id === match.player1Id);
  const player2 = players.find(p => p.id === match.player2Id);

  const player1FinalScore = calculateKataScore(player1Scores);
  const player2FinalScore = calculateKataScore(player2Scores);

  return (
    <div className="max-w-6xl mx-auto p-6 pb-20 sm:pb-6">
      <Card className="shadow-lg">
        <CardContent className="p-8">
          {/* Current Match Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Kata Scoring</h2>
            <div className="bg-tournament-50 rounded-lg p-4">
              <div className="text-lg font-semibold text-tournament-700 mb-1">Current Match</div>
              <div className="text-2xl font-bold text-gray-900">
                <span data-testid="text-current-player1">{player1?.name || "Player 1"}</span>
                <span className="text-tournament-500 mx-4">VS</span>
                <span data-testid="text-current-player2">{player2?.name || "Player 2"}</span>
              </div>
            </div>
          </div>

          {/* Scoring Instructions */}
          <div className="mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
              <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center">
                <i className="fas fa-info-circle mr-2"></i>Kata Scoring System
              </h4>
              <div className="text-xs text-blue-700 space-y-1">
                <div>📊 Each player receives scores from 5 judges</div>
                <div>❌ Highest and lowest scores are dropped</div>
                <div>➕ Final Score = Sum of the remaining 3 scores</div>
                <div>🏆 Player with higher final score wins</div>
              </div>
            </div>
          </div>

          {/* Scoring Grid */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Player 1 Scoring */}
            <div className={`rounded-xl p-6 ${
              player1?.beltColor === "red" 
                ? "bg-red-50 border-2 border-red-200" 
                : "bg-blue-50 border-2 border-blue-200"
            }`}>
              <h3 data-testid="text-player1-name" className={`text-xl font-semibold mb-4 text-center ${
                player1?.beltColor === "red" ? "text-red-800" : "text-blue-800"
              }`}>
                {player1?.name || "Player 1"} ({player1?.beltColor?.toUpperCase() || "RED"})
              </h3>

              {/* Final Score Display */}
              <div data-testid="text-player1-final-score" className={`text-4xl font-bold mb-6 text-center ${
                player1?.beltColor === "red" ? "text-red-600" : "text-blue-600"
              }`}>
                {player1FinalScore.toFixed(2)} points
              </div>

              {/* Judge Scores */}
              <div className="space-y-3">
                {[0, 1, 2, 3, 4].map((judgeIndex) => (
                  <div key={judgeIndex} className="flex items-center justify-between bg-white rounded-lg p-3">
                    <span className="font-semibold">Judge {judgeIndex + 1}:</span>
                    <Input
                      data-testid={`input-player1-judge${judgeIndex + 1}`}
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={player1Scores[judgeIndex] || ""}
                      onChange={(e) => handleScoreChange(1, judgeIndex, e.target.value)}
                      className="w-24 text-center font-bold"
                      placeholder="0.0"
                    />
                  </div>
                ))}
              </div>

              {/* Score Breakdown */}
              <div className="mt-4 text-sm text-gray-600 bg-white rounded-lg p-3">
                <div className="font-semibold mb-1">Calculation:</div>
                {player1Scores.filter(s => s > 0).length === 5 ? (
                  <>
                    <div className="text-red-500 line-through">Highest (dropped): {Math.max(...player1Scores).toFixed(2)}</div>
                    <div className="text-red-500 line-through">Lowest (dropped): {Math.min(...player1Scores.filter(s => s > 0)).toFixed(2)}</div>
                    <div className="text-green-600">Middle 3 scores summed</div>
                    <div className="font-bold mt-1 text-lg">Final Score: {player1FinalScore.toFixed(2)}</div>
                  </>
                ) : (
                  <div className="text-amber-600">Need all 5 judge scores</div>
                )}
              </div>
            </div>

            {/* Player 2 Scoring */}
            <div className={`rounded-xl p-6 ${
              player2?.beltColor === "red" 
                ? "bg-red-50 border-2 border-red-200" 
                : "bg-blue-50 border-2 border-blue-200"
            }`}>
              <h3 data-testid="text-player2-name" className={`text-xl font-semibold mb-4 text-center ${
                player2?.beltColor === "red" ? "text-red-800" : "text-blue-800"
              }`}>
                {player2?.name || "Player 2"} ({player2?.beltColor?.toUpperCase() || "BLUE"})
              </h3>

              {/* Final Score Display */}
              <div data-testid="text-player2-final-score" className={`text-4xl font-bold mb-6 text-center ${
                player2?.beltColor === "red" ? "text-red-600" : "text-blue-600"
              }`}>
                {player2FinalScore.toFixed(2)} points
              </div>

              {/* Judge Scores */}
              <div className="space-y-3">
                {[0, 1, 2, 3, 4].map((judgeIndex) => (
                  <div key={judgeIndex} className="flex items-center justify-between bg-white rounded-lg p-3">
                    <span className="font-semibold">Judge {judgeIndex + 1}:</span>
                    <Input
                      data-testid={`input-player2-judge${judgeIndex + 1}`}
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={player2Scores[judgeIndex] || ""}
                      onChange={(e) => handleScoreChange(2, judgeIndex, e.target.value)}
                      className="w-24 text-center font-bold"
                      placeholder="0.0"
                    />
                  </div>
                ))}
              </div>

              {/* Score Breakdown */}
              <div className="mt-4 text-sm text-gray-600 bg-white rounded-lg p-3">
                <div className="font-semibold mb-1">Calculation:</div>
                {player2Scores.filter(s => s > 0).length === 5 ? (
                  <>
                    <div className="text-red-500 line-through">Highest (dropped): {Math.max(...player2Scores).toFixed(2)}</div>
                    <div className="text-red-500 line-through">Lowest (dropped): {Math.min(...player2Scores.filter(s => s > 0)).toFixed(2)}</div>
                    <div className="text-green-600">Middle 3 scores summed</div>
                    <div className="font-bold mt-1 text-lg">Final Score: {player2FinalScore.toFixed(2)}</div>
                  </>
                ) : (
                  <div className="text-amber-600">Need all 5 judge scores</div>
                )}
              </div>
            </div>
          </div>

          {/* Match Actions */}
          <div className="flex justify-center space-x-4">
            <Button
              data-testid="button-submit-scores"
              onClick={handleSubmitScores}
              disabled={updateScoreMutation.isPending}
              className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 text-lg font-semibold shadow-lg"
              size="lg"
            >
              <i className="fas fa-save mr-3"></i>Save Scores
            </Button>
            <Button
              data-testid="button-end-match"
              onClick={handleEndMatch}
              disabled={completeMatchMutation.isPending}
              className="bg-tournament-500 hover:bg-tournament-600 text-white px-8 py-4 text-lg font-semibold shadow-lg"
              size="lg"
            >
              <i className="fas fa-flag-checkered mr-3"></i>End Match
            </Button>
            <Button
              data-testid="button-back-bracket"
              onClick={() => setLocation("/bracket")}
              variant="outline"
              className="px-8 py-4 text-lg font-semibold shadow-lg"
              size="lg"
            >
              <i className="fas fa-arrow-left mr-3"></i>Back to Bracket
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
