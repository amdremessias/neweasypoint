import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  Clock,
  BarChart3,
  BriefcaseBusiness,
  UserCog,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/employees", icon: Users, label: "Funcionários" },
  { href: "/attendance", icon: Clock, label: "Registros" },
  { href: "/reports", icon: BarChart3, label: "Relatórios" },
  { href: "/users", icon: UserCog, label: "Usuários" },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path: string) => {
    if (path === "/dashboard" && location === "/") return true;
    return location.startsWith(path);
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 shrink-0 items-center px-6 font-bold text-xl tracking-tight gap-2 text-sidebar-primary">
        <BriefcaseBusiness className="w-6 h-6 text-sidebar-primary" />
        <span>PontoFácil</span>
      </div>

      <div className="flex flex-col gap-1 px-4 py-4 flex-1">
        <div className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2 px-2">
          Menu Principal
        </div>

        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href} className="w-full">
              <Button
                variant={active ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-10 px-3",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </div>

      <div className="p-4 mt-auto space-y-3">
        <div className="rounded-lg bg-sidebar-accent/30 px-3 py-2.5 flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-sidebar-foreground truncate">
              {user?.name}
            </p>
            <p className="text-[10px] text-sidebar-foreground/50 truncate">
              {user?.role === "admin" ? "Administrador" : "Funcionário"}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="w-full justify-start gap-2 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 h-9 px-3"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </Button>
      </div>
    </aside>
  );
}
