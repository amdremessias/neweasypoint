import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { RegistrarPontoModal } from "../RegistrarPontoModal";
import { useLocation } from "wouter";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();

  const breadcrumbs: Record<string, string> = {
    "/": "Visão Geral",
    "/dashboard": "Visão Geral",
    "/employees": "Funcionários",
    "/attendance": "Registros",
    "/reports": "Relatórios",
    "/users": "Usuários",
  };

  const getBreadcrumb = () => {
    const base = "/" + location.split("/")[1];
    return breadcrumbs[base] ?? breadcrumbs[location] ?? location.split("/")[1];
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <Sidebar />
      <div className="pl-64 flex flex-col min-h-screen">
        <header className="h-16 flex items-center justify-between px-8 border-b bg-card">
          <div className="text-sm font-medium text-muted-foreground">
            {getBreadcrumb()}
          </div>
          <div className="flex items-center gap-4">
            <RegistrarPontoModal />
          </div>
        </header>
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
