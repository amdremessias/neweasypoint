import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import MeuPontoPage from "@/pages/meu-ponto";

import DashboardPage from "@/pages/dashboard";
import EmployeesPage from "@/pages/employees/index";
import EmployeeFormPage from "@/pages/employees/form";
import EmployeeDetailPage from "@/pages/employees/detail";
import AttendancePage from "@/pages/attendance/index";
import ReportsPage from "@/pages/reports/index";
import UsersPage from "@/pages/users/index";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  // Employee role: simplified view
  if (user.role === "employee") {
    return <MeuPontoPage />;
  }

  // Admin role: full app
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/employees" component={EmployeesPage} />
        <Route path="/employees/new" component={EmployeeFormPage} />
        <Route path="/employees/:id/edit" component={EmployeeFormPage} />
        <Route path="/employees/:id" component={EmployeeDetailPage} />
        <Route path="/attendance" component={AttendancePage} />
        <Route path="/reports" component={ReportsPage} />
        <Route path="/users" component={UsersPage} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppRoutes />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
