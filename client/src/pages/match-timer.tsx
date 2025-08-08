import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Match, Player } from "@shared/schema";
import { formatTime } from "@/lib/tournament-logic";

export default function MatchTimer() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [timerSeconds, setTimerSeconds] = useState(120); // 2 minutes
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);

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

  const updateScoreMutation = useMutation({
    mutationFn: async (data: { 
      player1Score: number; 
      player2Score: number;
      player1Ippon?: number;
      player1Wazari?: number;
      player1Yuko?: number;
      player1Warnings?: number;
      player2Ippon?: number;
      player2Wazari?: number;
      player2Yuko?: number;
      player2Warnings?: number;
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
      player1Ippon?: number;
      player1Wazari?: number;
      player1Yuko?: number;
      player1Warnings?: number;
      player2Ippon?: number;
      player2Wazari?: number;
      player2Yuko?: number;
      player2Warnings?: number;
    }) => {
      const response = await apiRequest("PATCH", `/api/matches/${matchId}/complete`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches", matchId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", tournamentId, "matches"] });
      toast({
        title: "Match Completed",
        description: "Match has been completed successfully.",
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

  // Timer management
  useEffect(() => {
    if (isTimerRunning && timerSeconds > 0) {
      const interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            toast({
              title: "Time's Up!",
              description: "The match timer has ended.",
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setTimerInterval(interval);
    } else {
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
    }

    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [isTimerRunning, timerSeconds > 0]);

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

  const handleStartTimer = () => {
    setIsTimerRunning(true);
  };

  const handlePauseTimer = () => {
    setIsTimerRunning(false);
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds(120);
  };

  const handleKarateScore = (playerNumber: 1 | 2, scoreType: 'ippon' | 'wazari' | 'yuko' | 'warning', increment: boolean = true) => {
    const currentData = {
      player1Score: match.player1Score || 0,
      player2Score: match.player2Score || 0,
      player1Ippon: match.player1Ippon || 0,
      player1Wazari: match.player1Wazari || 0,
      player1Yuko: match.player1Yuko || 0,
      player1Warnings: match.player1Warnings || 0,
      player2Ippon: match.player2Ippon || 0,
      player2Wazari: match.player2Wazari || 0,
      player2Yuko: match.player2Yuko || 0,
      player2Warnings: match.player2Warnings || 0,
    };

    const change = increment ? 1 : -1;
    
    if (playerNumber === 1) {
      switch (scoreType) {
        case 'ippon':
          currentData.player1Ippon = Math.max(0, currentData.player1Ippon + change);
          break;
        case 'wazari':
          currentData.player1Wazari = Math.max(0, currentData.player1Wazari + change);
          break;
        case 'yuko':
          currentData.player1Yuko = Math.max(0, currentData.player1Yuko + change);
          break;
        case 'warning':
          currentData.player1Warnings = Math.max(0, currentData.player1Warnings + change);
          break;
      }
    } else {
      switch (scoreType) {
        case 'ippon':
          currentData.player2Ippon = Math.max(0, currentData.player2Ippon + change);
          break;
        case 'wazari':
          currentData.player2Wazari = Math.max(0, currentData.player2Wazari + change);
          break;
        case 'yuko':
          currentData.player2Yuko = Math.max(0, currentData.player2Yuko + change);
          break;
        case 'warning':
          currentData.player2Warnings = Math.max(0, currentData.player2Warnings + change);
          break;
      }
    }

    // Calculate total score based on karate scoring system
    // Ippon = 3 points, Wazari = 2 points, Yuko = 1 point
    currentData.player1Score = (currentData.player1Ippon * 3) + (currentData.player1Wazari * 2) + currentData.player1Yuko;
    currentData.player2Score = (currentData.player2Ippon * 3) + (currentData.player2Wazari * 2) + currentData.player2Yuko;
    
    updateScoreMutation.mutate(currentData);
  };

  const handleEndMatch = () => {
    const player1Score = match.player1Score || 0;
    const player2Score = match.player2Score || 0;
    
    if (player1Score === player2Score) {
      toast({
        title: "Error",
        description: "Match cannot end in a tie. Please adjust scores.",
        variant: "destructive",
      });
      return;
    }
    
    const winnerId = player1Score > player2Score ? match.player1Id! : match.player2Id!;
    
    completeMatchMutation.mutate({
      winnerId,
      player1Score,
      player2Score,
      player1Ippon: match.player1Ippon,
      player1Wazari: match.player1Wazari,
      player1Yuko: match.player1Yuko,
      player1Warnings: match.player1Warnings,
      player2Ippon: match.player2Ippon,
      player2Wazari: match.player2Wazari,
      player2Yuko: match.player2Yuko,
      player2Warnings: match.player2Warnings,
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 pb-20 sm:pb-6">
      <Card className="shadow-lg">
        <CardContent className="p-8">
          {/* Current Match Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Match Timer</h2>
            <div className="bg-tournament-50 rounded-lg p-4">
              <div className="text-lg font-semibold text-tournament-700 mb-1">Current Match</div>
              <div className="text-2xl font-bold text-gray-900">
                <span data-testid="text-current-player1">{player1?.name || "Player 1"}</span>
                <span className="text-tournament-500 mx-4">VS</span>
                <span data-testid="text-current-player2">{player2?.name || "Player 2"}</span>
              </div>
            </div>
          </div>

          {/* Timer Display */}
          <div className="text-center mb-8">
            <div className="bg-gray-900 rounded-2xl p-8 mb-6">
              <div
                data-testid="text-timer-display"
                className="text-8xl font-bold text-white font-mono"
              >
                {formatTime(timerSeconds)}
              </div>
              <div className="text-gray-400 text-lg mt-2">Match Time</div>
            </div>

            {/* Timer Controls */}
            <div className="flex justify-center space-x-4 mb-8">
              <Button
                data-testid="button-start-timer"
                onClick={handleStartTimer}
                disabled={isTimerRunning || timerSeconds === 0}
                className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 text-xl font-semibold shadow-lg"
                size="lg"
              >
                <i className="fas fa-play mr-3"></i>Start
              </Button>
              <Button
                data-testid="button-pause-timer"
                onClick={handlePauseTimer}
                disabled={!isTimerRunning}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-4 text-xl font-semibold shadow-lg"
                size="lg"
              >
                <i className="fas fa-pause mr-3"></i>Pause
              </Button>
              <Button
                data-testid="button-reset-timer"
                onClick={handleResetTimer}
                className="bg-red-500 hover:bg-red-600 text-white px-8 py-4 text-xl font-semibold shadow-lg"
                size="lg"
              >
                <i className="fas fa-redo mr-3"></i>Reset
              </Button>
            </div>
          </div>

          {/* Karate Scoring System */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Player 1 Scoring */}
            <div className={`score-section rounded-xl p-6 ${
              player1?.beltColor === "red" 
                ? "bg-red-50 border-2 border-red-200" 
                : "bg-blue-50 border-2 border-blue-200"
            }`}>
              <h3 data-testid="text-player1-name" className={`text-xl font-semibold mb-4 text-center ${
                player1?.beltColor === "red" ? "text-red-800" : "text-blue-800"
              }`}>
                {player1?.name || "Player 1"} ({player1?.beltColor?.toUpperCase() || "RED"})
              </h3>
              
              {/* Total Score Display */}
              <div data-testid="text-player1-score" className={`text-4xl font-bold mb-4 text-center ${
                player1?.beltColor === "red" ? "text-red-600" : "text-blue-600"
              }`}>
                {match.player1Score || 0} points
              </div>

              {/* Karate Scoring Buttons */}
              <div className="space-y-3">
                {/* Ippon */}
                <div className="flex items-center justify-between bg-white rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">Ippon (3pt):</span>
                    <span data-testid="text-player1-ippon" className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-bold">
                      {match.player1Ippon || 0}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      data-testid="button-decrement-ippon1"
                      onClick={() => handleKarateScore(1, 'ippon', false)}
                      disabled={updateScoreMutation.isPending}
                      className="bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-full text-sm"
                      size="sm"
                    >
                      -
                    </Button>
                    <Button
                      data-testid="button-increment-ippon1"
                      onClick={() => handleKarateScore(1, 'ippon', true)}
                      disabled={updateScoreMutation.isPending}
                      className="bg-green-500 hover:bg-green-600 text-white w-8 h-8 rounded-full text-sm"
                      size="sm"
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* Wazari */}
                <div className="flex items-center justify-between bg-white rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">Wazari (2pt):</span>
                    <span data-testid="text-player1-wazari" className="bg-orange-100 text-orange-800 px-2 py-1 rounded font-bold">
                      {match.player1Wazari || 0}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      data-testid="button-decrement-wazari1"
                      onClick={() => handleKarateScore(1, 'wazari', false)}
                      disabled={updateScoreMutation.isPending}
                      className="bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-full text-sm"
                      size="sm"
                    >
                      -
                    </Button>
                    <Button
                      data-testid="button-increment-wazari1"
                      onClick={() => handleKarateScore(1, 'wazari', true)}
                      disabled={updateScoreMutation.isPending}
                      className="bg-green-500 hover:bg-green-600 text-white w-8 h-8 rounded-full text-sm"
                      size="sm"
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* Yuko */}
                <div className="flex items-center justify-between bg-white rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">Yuko (1pt):</span>
                    <span data-testid="text-player1-yuko" className="bg-green-100 text-green-800 px-2 py-1 rounded font-bold">
                      {match.player1Yuko || 0}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      data-testid="button-decrement-yuko1"
                      onClick={() => handleKarateScore(1, 'yuko', false)}
                      disabled={updateScoreMutation.isPending}
                      className="bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-full text-sm"
                      size="sm"
                    >
                      -
                    </Button>
                    <Button
                      data-testid="button-increment-yuko1"
                      onClick={() => handleKarateScore(1, 'yuko', true)}
                      disabled={updateScoreMutation.isPending}
                      className="bg-green-500 hover:bg-green-600 text-white w-8 h-8 rounded-full text-sm"
                      size="sm"
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* Warnings */}
                <div className="flex items-center justify-between bg-white rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">Warnings:</span>
                    <span data-testid="text-player1-warnings" className="bg-red-100 text-red-800 px-2 py-1 rounded font-bold">
                      {match.player1Warnings || 0}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      data-testid="button-decrement-warnings1"
                      onClick={() => handleKarateScore(1, 'warning', false)}
                      disabled={updateScoreMutation.isPending}
                      className="bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-full text-sm"
                      size="sm"
                    >
                      -
                    </Button>
                    <Button
                      data-testid="button-increment-warnings1"
                      onClick={() => handleKarateScore(1, 'warning', true)}
                      disabled={updateScoreMutation.isPending}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white w-8 h-8 rounded-full text-sm"
                      size="sm"
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Player 2 Scoring */}
            <div className={`score-section rounded-xl p-6 ${
              player2?.beltColor === "red" 
                ? "bg-red-50 border-2 border-red-200" 
                : "bg-blue-50 border-2 border-blue-200"
            }`}>
              <h3 data-testid="text-player2-name" className={`text-xl font-semibold mb-4 text-center ${
                player2?.beltColor === "red" ? "text-red-800" : "text-blue-800"
              }`}>
                {player2?.name || "Player 2"} ({player2?.beltColor?.toUpperCase() || "BLUE"})
              </h3>
              
              {/* Total Score Display */}
              <div data-testid="text-player2-score" className={`text-4xl font-bold mb-4 text-center ${
                player2?.beltColor === "red" ? "text-red-600" : "text-blue-600"
              }`}>
                {match.player2Score || 0} points
              </div>

              {/* Karate Scoring Buttons */}
              <div className="space-y-3">
                {/* Ippon */}
                <div className="flex items-center justify-between bg-white rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">Ippon (3pt):</span>
                    <span data-testid="text-player2-ippon" className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-bold">
                      {match.player2Ippon || 0}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      data-testid="button-decrement-ippon2"
                      onClick={() => handleKarateScore(2, 'ippon', false)}
                      disabled={updateScoreMutation.isPending}
                      className="bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-full text-sm"
                      size="sm"
                    >
                      -
                    </Button>
                    <Button
                      data-testid="button-increment-ippon2"
                      onClick={() => handleKarateScore(2, 'ippon', true)}
                      disabled={updateScoreMutation.isPending}
                      className="bg-green-500 hover:bg-green-600 text-white w-8 h-8 rounded-full text-sm"
                      size="sm"
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* Wazari */}
                <div className="flex items-center justify-between bg-white rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">Wazari (2pt):</span>
                    <span data-testid="text-player2-wazari" className="bg-orange-100 text-orange-800 px-2 py-1 rounded font-bold">
                      {match.player2Wazari || 0}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      data-testid="button-decrement-wazari2"
                      onClick={() => handleKarateScore(2, 'wazari', false)}
                      disabled={updateScoreMutation.isPending}
                      className="bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-full text-sm"
                      size="sm"
                    >
                      -
                    </Button>
                    <Button
                      data-testid="button-increment-wazari2"
                      onClick={() => handleKarateScore(2, 'wazari', true)}
                      disabled={updateScoreMutation.isPending}
                      className="bg-green-500 hover:bg-green-600 text-white w-8 h-8 rounded-full text-sm"
                      size="sm"
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* Yuko */}
                <div className="flex items-center justify-between bg-white rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">Yuko (1pt):</span>
                    <span data-testid="text-player2-yuko" className="bg-green-100 text-green-800 px-2 py-1 rounded font-bold">
                      {match.player2Yuko || 0}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      data-testid="button-decrement-yuko2"
                      onClick={() => handleKarateScore(2, 'yuko', false)}
                      disabled={updateScoreMutation.isPending}
                      className="bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-full text-sm"
                      size="sm"
                    >
                      -
                    </Button>
                    <Button
                      data-testid="button-increment-yuko2"
                      onClick={() => handleKarateScore(2, 'yuko', true)}
                      disabled={updateScoreMutation.isPending}
                      className="bg-green-500 hover:bg-green-600 text-white w-8 h-8 rounded-full text-sm"
                      size="sm"
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* Warnings */}
                <div className="flex items-center justify-between bg-white rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">Warnings:</span>
                    <span data-testid="text-player2-warnings" className="bg-red-100 text-red-800 px-2 py-1 rounded font-bold">
                      {match.player2Warnings || 0}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      data-testid="button-decrement-warnings2"
                      onClick={() => handleKarateScore(2, 'warning', false)}
                      disabled={updateScoreMutation.isPending}
                      className="bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-full text-sm"
                      size="sm"
                    >
                      -
                    </Button>
                    <Button
                      data-testid="button-increment-warnings2"
                      onClick={() => handleKarateScore(2, 'warning', true)}
                      disabled={updateScoreMutation.isPending}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white w-8 h-8 rounded-full text-sm"
                      size="sm"
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Match Actions */}
          <div className="flex justify-center space-x-4">
            <Button
              data-testid="button-end-match"
              onClick={handleEndMatch}
              disabled={completeMatchMutation.isPending || (match.player1Score || 0) === (match.player2Score || 0)}
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
