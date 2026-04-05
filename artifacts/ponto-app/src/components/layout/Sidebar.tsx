import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  Clock, 
  BarChart3, 
  BriefcaseBusiness 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/employees", icon: Users, label: "Funcionários" },
  { href: "/attendance", icon: Clock, label: "Registros" },
  { href: "/reports", icon: BarChart3, label: "Relatórios" },
];

export function Sidebar() {
  const [location] = useLocation();

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
      
      <div className="p-4 mt-auto">
        <div className="rounded-lg bg-sidebar-accent/50 p-4 text-sm text-sidebar-foreground/80">
          <p className="font-medium text-sidebar-foreground">Plano Pro</p>
          <p className="mt-1 text-xs opacity-70">Uso ilimitado de funcionários</p>
        </div>
      </div>
    </aside>
  );
}
