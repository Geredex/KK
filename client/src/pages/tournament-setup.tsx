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
  const [tournamentType, setTournamentType] = useState<"kumite" | "kata">("kumite");
  const [tournamentSize, setTournamentSize] = useState<number>(8);
  const [customPlayerCount, setCustomPlayerCount] = useState<string>("");
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
    mutationFn: async (data: { name: string; type: "kumite" | "kata"; size: number; totalRounds?: number }) => {
      const response = await apiRequest("POST", "/api/tournaments", data);
      return response.json();
    },
    onSuccess: (tournament: Tournament) => {
      setCurrentTournamentId(tournament.id);
      localStorage.setItem("currentTournamentId", tournament.id);
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      toast({
        title: "Tournament Created",
        description: `${tournament.name} (${tournament.type}) has been created successfully.`,
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
    const data: { name: string; type: "kumite" | "kata"; size: number; totalRounds?: number } = { 
      name: tournamentName,
      type: tournamentType,
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
            <p className="text-gray-600">
              Set up your Shito Ryu Karate {tournamentType === "kumite" ? "kumite" : "kata"} tournament
            </p>
          </div>

          {/* Tournament Type Selection */}
          <div className="mb-8">
            <label className="block text-lg font-semibold text-gray-700 mb-4">Tournament Type</label>
            <div className="grid grid-cols-2 gap-4">
              <Button
                data-testid="button-type-kumite"
                variant={tournamentType === "kumite" ? "default" : "outline"}
                className={`h-auto p-6 flex flex-col items-center ${
                  tournamentType === "kumite"
                    ? "bg-red-50 border-2 border-red-400 text-red-700 hover:bg-red-100"
                    : "border-gray-200 hover:border-red-300"
                }`}
                onClick={() => setTournamentType("kumite")}
                disabled={!!currentTournamentId}
              >
                <i className="fas fa-fist-raised text-3xl mb-2"></i>
                <div className="text-xl font-bold mb-1">Kumite</div>
                <div className="text-sm text-center">
                  Sparring competition with scoring points
                </div>
              </Button>
              <Button
                data-testid="button-type-kata"
                variant={tournamentType === "kata" ? "default" : "outline"}
                className={`h-auto p-6 flex flex-col items-center ${
                  tournamentType === "kata"
                    ? "bg-blue-50 border-2 border-blue-400 text-blue-700 hover:bg-blue-100"
                    : "border-gray-200 hover:border-blue-300"
                }`}
                onClick={() => setTournamentType("kata")}
                disabled={!!currentTournamentId}
              >
                <i className="fas fa-user-ninja text-3xl mb-2"></i>
                <div className="text-xl font-bold mb-1">Kata</div>
                <div className="text-sm text-center">
                  Form performance judged by 5 judges
                </div>
              </Button>
            </div>
          </div>

          {/* Tournament Size Selection */}
          <div className="mb-8">
            <label className="block text-lg font-semibold text-gray-700 mb-4">Number of Players</label>
            
            {/* Preset Player Counts */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[4, 8, 16, 32].map((size) => (
                <Button
                  key={size}
                  data-testid={`tournament-size-${size}`}
                  variant={tournamentSize === size ? "default" : "outline"}
                  className={`h-auto p-4 flex flex-col items-center ${
                    tournamentSize === size
                      ? "bg-tournament-50 border-tournament-200 text-tournament-600 hover:bg-tournament-100"
                      : "border-gray-200 hover:border-tournament-500"
                  }`}
                  onClick={() => {
                    setTournamentSize(size);
                    setCustomPlayerCount("");
                    setCustomRounds(null);
                  }}
                  disabled={!!currentTournamentId}
                >
                  <div className="text-xl font-bold mb-1">{size}</div>
                  <div className="text-xs">Players</div>
                  <div className="text-xs mt-1 opacity-75">
                    {Math.ceil(Math.log2(size))} Rounds
                  </div>
                </Button>
              ))}
            </div>

            {/* Custom Player Count */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Player Count (2-128)
              </label>
              <div className="flex gap-3">
                <Input
                  data-testid="input-custom-player-count"
                  type="number"
                  min="2"
                  max="128"
                  placeholder="Enter number of players..."
                  value={customPlayerCount}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCustomPlayerCount(value);
                    const count = parseInt(value);
                    if (!isNaN(count) && count >= 2 && count <= 128) {
                      setTournamentSize(count);
                      setCustomRounds(null);
                    }
                  }}
                  disabled={!!currentTournamentId}
                  className="max-w-xs"
                />
                {customPlayerCount && (
                  <Button
                    data-testid="button-clear-custom"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCustomPlayerCount("");
                      setTournamentSize(8);
                    }}
                    disabled={!!currentTournamentId}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Clear
                  </Button>
                )}
              </div>
              {customPlayerCount && (
                <p className="text-sm text-gray-600 mt-2">
                  {parseInt(customPlayerCount) >= 2 && parseInt(customPlayerCount) <= 128 
                    ? `${Math.ceil(Math.log2(parseInt(customPlayerCount)))} rounds needed for ${customPlayerCount} players`
                    : "Enter a number between 2 and 128"}
                </p>
              )}
            </div>
          </div>

          {/* Custom Rounds Selection */}
          <div className="mb-8">
            <label className="block text-lg font-semibold text-gray-700 mb-4">Number of Rounds</label>
            <p className="text-sm text-gray-600 mb-4">
              Choose how many rounds you want in your tournament (default is {Math.ceil(Math.log2(tournamentSize))} rounds for {tournamentSize} players)
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
