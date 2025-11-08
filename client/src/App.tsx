import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import TournamentHeader from "@/components/tournament-header";
import MobileNav from "@/components/mobile-nav";
import TournamentSetup from "@/pages/tournament-setup";
import TournamentBracket from "@/pages/tournament-bracket";
import MatchTimer from "@/pages/match-timer";
import MatchKata from "@/pages/match-kata";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={TournamentSetup} />
      <Route path="/bracket" component={TournamentBracket} />
      <Route path="/timer" component={MatchTimer} />
      <Route path="/kata" component={MatchKata} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-gray-50">
          <TournamentHeader />
          <main className="pt-4">
            <Router />
          </main>
          <MobileNav />
          <Toaster />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
