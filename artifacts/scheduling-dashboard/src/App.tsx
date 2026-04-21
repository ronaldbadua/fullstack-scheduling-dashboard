import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MonthProvider } from "./components/month-context";
import { Layout } from "./components/layout";
import NotFound from "@/pages/not-found";
import SchedulePage from "./pages/schedule";
import AssociatesPage from "./pages/associates";
import PoolingPage from "./pages/pooling";
import BackupPage from "./pages/backup";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={SchedulePage} />
        <Route path="/associates" component={AssociatesPage} />
        <Route path="/pooling" component={PoolingPage} />
        <Route path="/backup" component={BackupPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MonthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </MonthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
