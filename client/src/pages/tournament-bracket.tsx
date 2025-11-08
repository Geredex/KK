import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Tournament, Player, Match } from "@shared/schema";
import { getRoundName, getMatchStatusColor, getMatchStatusText, getNextMatch, getCurrentMatch, getCompletedMatchesCount, getTotalMatchesCount } from "@/lib/tournament-logic";

export default function TournamentBracket() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // For demo, we'll assume tournament ID is stored in localStorage or use first available
  const tournamentId = localStorage.getItem("currentTournamentId");

  const { data: tournament } = useQuery<Tournament>({
    queryKey: ["/api/tournaments", tournamentId],
    enabled: !!tournamentId,
  });

  const { data: players = [] } = useQuery<Player[]>({
    queryKey: ["/api/tournaments", tournamentId, "players"],
    enabled: !!tournamentId,
  });

  const { data: matches = [] } = useQuery<Match[]>({
    queryKey: ["/api/tournaments", tournamentId, "matches"],
    enabled: !!tournamentId,
  });

  const updateMatchStatusMutation = useMutation({
    mutationFn: async (data: { matchId: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/matches/${data.matchId}/status`, {
        status: data.status,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", tournamentId, "matches"] });
    },
  });

  if (!tournamentId || !tournament) {
    return (
      <div className="max-w-4xl mx-auto p-6 pb-20 sm:pb-6">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No Tournament Found</h2>
            <p className="text-gray-600 mb-6">Please create a tournament first.</p>
            <Button
              onClick={() => setLocation("/")}
              className="bg-tournament-500 hover:bg-tournament-600"
            >
              Create Tournament
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentMatch = getCurrentMatch(matches);
  const nextMatch = getNextMatch(matches);
  const completedMatches = getCompletedMatchesCount(matches);
  const totalMatches = getTotalMatchesCount(tournament.size);

  const getPlayerName = (playerId: string | null): string => {
    if (!playerId) return "TBD";
    const player = players.find(p => p.id === playerId);
    return player?.name || "TBD";
  };

  const getPlayerWithColor = (playerId: string | null) => {
    if (!playerId) return { name: "TBD", beltColor: "gray" };
    const player = players.find(p => p.id === playerId);
    return { name: player?.name || "TBD", beltColor: player?.beltColor || "gray" };
  };

  const getMatchesByRound = (round: number) => {
    return matches.filter(match => match.round === round).sort((a, b) => a.position - b.position);
  };

  const handleOpenTimer = (match: Match) => {
    if (match.status === "pending") {
      updateMatchStatusMutation.mutate({ matchId: match.id, status: "in_progress" });
    }
    localStorage.setItem("currentMatchId", match.id);
    // Route to the correct match page based on tournament type
    const route = tournament.type === "kata" ? "/kata" : "/timer";
    setLocation(route);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 pb-20 sm:pb-6">
      <Card className="shadow-lg">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 data-testid="text-tournament-name" className="text-2xl font-bold text-gray-900">
                {tournament.name}
              </h2>
              <p className="text-gray-600">
                Round <span data-testid="text-current-round">{tournament.currentRound}</span> of{" "}
                <span data-testid="text-total-rounds">{tournament.totalRounds}</span>
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                <span data-testid="text-completed-matches">{completedMatches}</span>/
                <span data-testid="text-total-matches">{totalMatches}</span> matches completed
              </div>
              <Button
                data-testid="button-reset-tournament"
                variant="outline"
                className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                onClick={() => {
                  if (confirm("Are you sure you want to reset the tournament?")) {
                    localStorage.removeItem("currentTournamentId");
                    localStorage.removeItem("currentMatchId");
                    setLocation("/");
                  }
                }}
              >
                <i className="fas fa-redo mr-2"></i>Reset
              </Button>
            </div>
          </div>

          {/* Bracket Visualization */}
          <div className="bracket-container overflow-x-auto">
            <div className="bracket-grid min-w-max flex gap-8 p-6">
              {Array.from({ length: tournament.totalRounds }, (_, roundIndex) => {
                const round = roundIndex + 1;
                const roundMatches = getMatchesByRound(round);
                const roundName = getRoundName(round, tournament.totalRounds);

                return (
                  <div key={round} className="bracket-round flex-shrink-0">
                    <h3 className="text-lg font-semibold text-center mb-4 text-gray-700">
                      {roundName}
                    </h3>
                    <div className="space-y-6">
                      {roundMatches.map((match) => {
                        const statusInfo = getMatchStatusText(match.status);
                        const player1Name = getPlayerName(match.player1Id);
                        const player2Name = getPlayerName(match.player2Id);
                        const canStart = match.status === "pending" && match.player1Id && match.player2Id;

                        const player1 = getPlayerWithColor(match.player1Id);
                        const player2 = getPlayerWithColor(match.player2Id);

                        return (
                          <div
                            key={match.id}
                            data-testid={`card-match-${match.id}`}
                            className={`match-card border-2 rounded-lg p-3 shadow-sm min-w-[220px] ${getMatchStatusColor(match.status)}`}
                          >
                            <div className="match-player flex items-center justify-between p-2 border-b border-gray-100">
                              <div className="flex items-center space-x-2">
                                <div className={`w-3 h-3 rounded-full ${
                                  player1.beltColor === "red" ? "bg-red-500" : 
                                  player1.beltColor === "blue" ? "bg-blue-500" : "bg-gray-300"
                                }`}></div>
                                <span
                                  data-testid={`text-player1-${match.id}`}
                                  className={`font-medium ${
                                    match.winnerId === match.player1Id ? "text-green-600" : 
                                    !match.player1Id ? "text-gray-400" : "text-gray-900"
                                  }`}
                                >
                                  {player1.name}
                                </span>
                              </div>
                              <span
                                data-testid={`text-score1-${match.id}`}
                                className={`text-lg font-bold ${
                                  match.status === "completed" 
                                    ? match.winnerId === match.player1Id ? "text-green-600" : "text-gray-400"
                                    : match.status === "in_progress" ? "text-tournament-600" : "text-gray-300"
                                }`}
                              >
                                {match.status === "pending" ? "-" : match.player1Score}
                              </span>
                            </div>
                            <div className="match-player flex items-center justify-between p-2">
                              <div className="flex items-center space-x-2">
                                <div className={`w-3 h-3 rounded-full ${
                                  player2.beltColor === "red" ? "bg-red-500" : 
                                  player2.beltColor === "blue" ? "bg-blue-500" : "bg-gray-300"
                                }`}></div>
                                <span
                                  data-testid={`text-player2-${match.id}`}
                                  className={`font-medium ${
                                    match.winnerId === match.player2Id ? "text-green-600" : 
                                    !match.player2Id ? "text-gray-400" : "text-gray-900"
                                  }`}
                                >
                                  {player2.name}
                                </span>
                              </div>
                              <span
                                data-testid={`text-score2-${match.id}`}
                                className={`text-lg font-bold ${
                                  match.status === "completed" 
                                    ? match.winnerId === match.player2Id ? "text-green-600" : "text-gray-400"
                                    : match.status === "in_progress" ? "text-tournament-600" : "text-gray-300"
                                }`}
                              >
                                {match.status === "pending" ? "-" : match.player2Score}
                              </span>
                            </div>
                            <div className={`match-status text-xs px-2 py-1 rounded mt-2 text-center ${statusInfo.color}`}>
                              <i className={`${statusInfo.icon} mr-1`}></i>
                              {statusInfo.text}
                            </div>
                            {canStart && (
                              <Button
                                data-testid={`button-start-match-${match.id}`}
                                size="sm"
                                className="w-full mt-2 bg-tournament-500 hover:bg-tournament-600"
                                onClick={() => handleOpenTimer(match)}
                              >
                                Start Match
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Match Info */}
          {(currentMatch || nextMatch) && (
            <div className="mt-8 bg-orange-50 border border-orange-200 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-orange-800 mb-1">
                    {currentMatch ? "Current Match" : "Next Match"}
                  </h3>
                  <p className="text-orange-700">
                    <span data-testid="text-active-player1">
                      {getPlayerName(currentMatch?.player1Id || nextMatch?.player1Id || null)}
                    </span>{" "}
                    vs{" "}
                    <span data-testid="text-active-player2">
                      {getPlayerName(currentMatch?.player2Id || nextMatch?.player2Id || null)}
                    </span>
                  </p>
                </div>
                <Button
                  data-testid="button-open-timer"
                  onClick={() => handleOpenTimer(currentMatch || nextMatch!)}
                  className="bg-tournament-500 hover:bg-tournament-600"
                >
                  <i className="fas fa-stopwatch mr-2"></i>Open Timer
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
