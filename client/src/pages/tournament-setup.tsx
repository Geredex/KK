import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Tournament, Player } from "@shared/schema";

export default function TournamentSetup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [tournamentName, setTournamentName] = useState("");
  const [tournamentSize, setTournamentSize] = useState<16 | 32>(16);
  const [customRounds, setCustomRounds] = useState<number | null>(null);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [currentTournamentId, setCurrentTournamentId] = useState<string | null>(
    localStorage.getItem("currentTournamentId")
  );

  // Get current tournament and players
  const { data: players = [] } = useQuery<Player[]>({
    queryKey: ["/api/tournaments", currentTournamentId, "players"],
    enabled: !!currentTournamentId,
  });

  const createTournamentMutation = useMutation({
    mutationFn: async (data: { name: string; size: number; totalRounds?: number }) => {
      const response = await apiRequest("POST", "/api/tournaments", data);
      return response.json();
    },
    onSuccess: (tournament: Tournament) => {
      setCurrentTournamentId(tournament.id);
      localStorage.setItem("currentTournamentId", tournament.id);
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      toast({
        title: "Tournament Created",
        description: `${tournament.name} has been created successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create tournament",
        variant: "destructive",
      });
    },
  });

  const addPlayerMutation = useMutation({
    mutationFn: async (data: { name: string; tournamentId: string }) => {
      const response = await apiRequest("POST", `/api/tournaments/${data.tournamentId}/players`, {
        name: data.name,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", currentTournamentId, "players"] });
      setNewPlayerName("");
      toast({
        title: "Player Added",
        description: "Player has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add player",
        variant: "destructive",
      });
    },
  });

  const updatePlayerMutation = useMutation({
    mutationFn: async (data: { id: string; name: string }) => {
      const response = await apiRequest("PATCH", `/api/players/${data.id}`, {
        name: data.name,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", currentTournamentId, "players"] });
      toast({
        title: "Player Updated",
        description: "Player name has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update player",
        variant: "destructive",
      });
    },
  });

  const generateBracketMutation = useMutation({
    mutationFn: async (tournamentId: string) => {
      const response = await apiRequest("POST", `/api/tournaments/${tournamentId}/generate-bracket`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Tournament Started",
        description: "Bracket has been generated successfully.",
      });
      setLocation("/bracket");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate bracket",
        variant: "destructive",
      });
    },
  });

  const handleCreateTournament = () => {
    if (!tournamentName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a tournament name",
        variant: "destructive",
      });
      return;
    }
    const data: { name: string; size: number; totalRounds?: number } = { 
      name: tournamentName, 
      size: tournamentSize 
    };
    if (customRounds !== null) {
      data.totalRounds = customRounds;
    }
    createTournamentMutation.mutate(data);
  };

  const handleAddPlayer = () => {
    if (!newPlayerName.trim() || !currentTournamentId) return;
    if (players.length >= tournamentSize) {
      toast({
        title: "Error",
        description: `Tournament is full (${tournamentSize} players)`,
        variant: "destructive",
      });
      return;
    }
    addPlayerMutation.mutate({ name: newPlayerName, tournamentId: currentTournamentId });
  };

  const handleEditPlayer = (player: Player) => {
    const newName = prompt("Enter new name:", player.name);
    if (newName && newName.trim() && newName !== player.name) {
      updatePlayerMutation.mutate({ id: player.id, name: newName.trim() });
    }
  };

  const handleStartTournament = () => {
    if (!currentTournamentId) {
      toast({
        title: "Error",
        description: "Please create a tournament first",
        variant: "destructive",
      });
      return;
    }
    if (players.length !== tournamentSize) {
      toast({
        title: "Error",
        description: `Need exactly ${tournamentSize} players to start tournament`,
        variant: "destructive",
      });
      return;
    }
    generateBracketMutation.mutate(currentTournamentId);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 pb-20 sm:pb-6">
      <Card className="shadow-lg">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Create New Tournament</h2>
            <p className="text-gray-600">Set up your Shito Ryu Karate kumite tournament</p>
          </div>

          {/* Tournament Size Selection */}
          <div className="mb-8">
            <label className="block text-lg font-semibold text-gray-700 mb-4">Tournament Size</label>
            <div className="grid grid-cols-2 gap-4">
              <Button
                data-testid="tournament-size-16"
                variant={tournamentSize === 16 ? "default" : "outline"}
                className={`h-auto p-6 flex flex-col items-center ${
                  tournamentSize === 16
                    ? "bg-tournament-50 border-tournament-200 text-tournament-600 hover:bg-tournament-100"
                    : "border-gray-200 hover:border-tournament-500"
                }`}
                onClick={() => {
                  setTournamentSize(16);
                  setCustomRounds(null);
                }}
                disabled={!!currentTournamentId}
              >
                <div className="text-2xl font-bold mb-2">16</div>
                <div className="text-sm">Players</div>
                <div className="text-xs mt-2 opacity-75">Default: 4 Rounds</div>
              </Button>
              <Button
                data-testid="tournament-size-32"
                variant={tournamentSize === 32 ? "default" : "outline"}
                className={`h-auto p-6 flex flex-col items-center ${
                  tournamentSize === 32
                    ? "bg-tournament-50 border-tournament-200 text-tournament-600 hover:bg-tournament-100"
                    : "border-gray-200 hover:border-tournament-500"
                }`}
                onClick={() => {
                  setTournamentSize(32);
                  setCustomRounds(null);
                }}
                disabled={!!currentTournamentId}
              >
                <div className="text-2xl font-bold mb-2">32</div>
                <div className="text-sm">Players</div>
                <div className="text-xs mt-2 opacity-75">Default: 5 Rounds</div>
              </Button>
            </div>
          </div>

          {/* Custom Rounds Selection */}
          <div className="mb-8">
            <label className="block text-lg font-semibold text-gray-700 mb-4">Number of Rounds</label>
            <p className="text-sm text-gray-600 mb-4">
              Choose how many rounds you want in your tournament (default is {tournamentSize === 16 ? '4' : '5'} rounds)
            </p>
            <div className="grid grid-cols-5 gap-3">
              {Array.from({ length: 20 }, (_, i) => i + 1).map((rounds) => (
                <Button
                  key={rounds}
                  data-testid={`rounds-${rounds}`}
                  variant={customRounds === rounds ? "default" : "outline"}
                  className={`h-12 ${
                    customRounds === rounds
                      ? "bg-tournament-500 text-white hover:bg-tournament-600"
                      : "border-gray-200 hover:border-tournament-500"
                  }`}
                  onClick={() => setCustomRounds(rounds)}
                  disabled={!!currentTournamentId}
                >
                  {rounds}
                </Button>
              ))}
            </div>
            {customRounds && (
              <div className="mt-3 flex items-center justify-between">
                <p className="text-sm text-tournament-600">
                  Selected: {customRounds} rounds
                </p>
                <Button
                  data-testid="button-reset-rounds"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCustomRounds(null)}
                  disabled={!!currentTournamentId}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Use Default
                </Button>
              </div>
            )}
          </div>

          {/* Tournament Name */}
          <div className="mb-8">
            <label className="block text-lg font-semibold text-gray-700 mb-3">Tournament Name</label>
            <div className="flex gap-3">
              <Input
                data-testid="input-tournament-name"
                type="text"
                placeholder="Enter tournament name..."
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
                disabled={!!currentTournamentId}
                className="text-lg"
              />
              {!currentTournamentId && (
                <Button
                  data-testid="button-create-tournament"
                  onClick={handleCreateTournament}
                  disabled={createTournamentMutation.isPending}
                  className="bg-tournament-500 hover:bg-tournament-600"
                >
                  Create
                </Button>
              )}
            </div>
          </div>

          {/* Player Management */}
          {currentTournamentId && (
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <label className="block text-lg font-semibold text-gray-700">Players</label>
                <span className="text-sm text-gray-500" data-testid="text-player-count">
                  {players.length}/{tournamentSize} players
                </span>
              </div>
              
              {/* Add Player Input */}
              <div className="flex gap-3 mb-4">
                <Input
                  data-testid="input-new-player"
                  type="text"
                  placeholder="Enter player name..."
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAddPlayer()}
                  disabled={players.length >= tournamentSize}
                />
                <Button
                  data-testid="button-add-player"
                  onClick={handleAddPlayer}
                  disabled={!newPlayerName.trim() || players.length >= tournamentSize || addPlayerMutation.isPending}
                  className="bg-tournament-500 hover:bg-tournament-600"
                >
                  <i className="fas fa-plus"></i>
                </Button>
              </div>

              {/* Players Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {players.map((player, index) => (
                  <div
                    key={player.id}
                    data-testid={`card-player-${player.id}`}
                    className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`${
                        player.beltColor === "red" 
                          ? "bg-red-100 text-red-600 border-red-200" 
                          : "bg-blue-100 text-blue-600 border-blue-200"
                      } border-2 rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium`}>
                        {index + 1}
                      </div>
                      <span data-testid={`text-player-name-${player.id}`} className="font-medium text-gray-900">
                        {player.name}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        player.beltColor === "red" 
                          ? "bg-red-100 text-red-600" 
                          : "bg-blue-100 text-blue-600"
                      }`}>
                        {player.beltColor.toUpperCase()}
                      </span>
                    </div>
                    <Button
                      data-testid={`button-edit-player-${player.id}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditPlayer(player)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <i className="fas fa-edit"></i>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tournament Actions */}
          {currentTournamentId && (
            <div className="space-y-4">
              {/* Start Tournament Button */}
              <div className="flex justify-center">
                <Button
                  data-testid="button-start-tournament"
                  onClick={handleStartTournament}
                  disabled={players.length !== tournamentSize || generateBracketMutation.isPending}
                  className="bg-tournament-500 hover:bg-tournament-600 text-white px-8 py-4 text-xl font-semibold shadow-lg"
                  size="lg"
                >
                  <i className="fas fa-play mr-3"></i>
                  Start Tournament
                </Button>
              </div>

              {/* Reset Tournament Button */}
              <div className="flex justify-center">
                <Button
                  data-testid="button-reset-tournament"
                  onClick={() => {
                    localStorage.removeItem("currentTournamentId");
                    localStorage.removeItem("currentMatchId");
                    window.location.reload();
                  }}
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50 px-4 py-2"
                  size="sm"
                >
                  <i className="fas fa-refresh mr-2"></i>Start New Tournament
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
