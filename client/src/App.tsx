import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import SessionInit from "@/pages/session-init";
import ImageFlow from "@/pages/image-flow";
import FormFlow from "@/pages/form-flow";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/session/:productNumber" component={Home} />
      <Route path="/session/:productNumber/init" component={SessionInit} />
      <Route path="/session/:productNumber/images" component={ImageFlow} />
      <Route path="/session/:productNumber/form" component={FormFlow} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
