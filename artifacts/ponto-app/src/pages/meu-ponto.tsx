import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { useListAttendance, useClockIn, useClockOut } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { LogIn, LogOut, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MeuPontoPage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const employeeId = user?.employeeId ?? 0;

  const todayStr = new Date().toISOString().split("T")[0];

  const { data: todayRecords = [], refetch } = useListAttendance(
    { employeeId },
    { query: { enabled: !!employeeId } }
  );

  const todayRecord = todayRecords.find(
    (r: any) => r.date === todayStr && r.employeeId === employeeId
  );

  const isClockedIn = todayRecord?.status === "open";
  const isClockedOut = todayRecord?.status === "closed";

  const clockInMutation = useClockIn();
  const clockOutMutation = useClockOut();

  const handleClockIn = async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      await clockInMutation.mutateAsync({ data: { employeeId } });
      toast({ title: "Entrada registrada!", description: "Bom trabalho!" });
      refetch();
    } catch {
      toast({ title: "Erro", description: "Já existe registro de entrada para hoje.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      await clockOutMutation.mutateAsync({ data: { employeeId } });
      toast({ title: "Saída registrada!", description: "Até amanhã!" });
      refetch();
    } catch {
      toast({ title: "Erro", description: "Nenhum registro de entrada em aberto.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const recentRecords = todayRecords.slice(0, 10);

  const formatTime = (iso: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return `${String(d.getUTCHours() - 3 < 0 ? d.getUTCHours() + 21 : d.getUTCHours() - 3).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.employee?.department ?? "Funcionário"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:block">
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </span>
          <Button variant="outline" size="sm" onClick={logout}>
            Sair
          </Button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-10 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Meu Ponto</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>

        <div className="bg-card rounded-2xl border p-6 text-center space-y-4">
          {!todayRecord && (
            <div className="space-y-2">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                <Clock className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">Nenhum registro hoje.</p>
              <Button
                onClick={handleClockIn}
                disabled={loading}
                className="gap-2 mt-2"
                size="lg"
              >
                <LogIn className="w-5 h-5" />
                Registrar Entrada
              </Button>
            </div>
          )}

          {isClockedIn && (
            <div className="space-y-3">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <Clock className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Em andamento
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Entrada registrada às <strong>{formatTime(todayRecord.clockIn)}</strong>
                {(todayRecord.lateMinutes ?? 0) > 0 && (
                  <span className="text-amber-600 ml-1">
                    (+{todayRecord.lateMinutes} min de atraso)
                  </span>
                )}
              </p>
              <Button
                onClick={handleClockOut}
                disabled={loading}
                variant="outline"
                className="gap-2"
                size="lg"
              >
                <LogOut className="w-5 h-5" />
                Registrar Saída
              </Button>
            </div>
          )}

          {isClockedOut && (
            <div className="space-y-2">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
              <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">
                Concluído
              </span>
              <p className="text-sm text-muted-foreground">
                Entrada: <strong>{formatTime(todayRecord.clockIn)}</strong>
                {" · "}
                Saída: <strong>{formatTime(todayRecord.clockOut)}</strong>
              </p>
              {todayRecord.totalMinutes != null && (
                <p className="text-sm font-medium text-foreground">
                  Total: {Math.floor(todayRecord.totalMinutes / 60)}h{todayRecord.totalMinutes % 60 > 0 ? `${todayRecord.totalMinutes % 60}min` : ""}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Recent records */}
        <div className="bg-card rounded-2xl border overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold text-sm text-foreground">Registros Recentes</h2>
          </div>
          {recentRecords.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              Nenhum registro encontrado.
            </div>
          ) : (
            <ul className="divide-y">
              {recentRecords.map((rec: any) => (
                <li key={rec.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{rec.date}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(rec.clockIn)} → {formatTime(rec.clockOut)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(rec.lateMinutes ?? 0) > 0 && (
                      <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        +{rec.lateMinutes} min
                      </span>
                    )}
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        rec.status === "open"
                          ? "bg-green-100 text-green-700"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {rec.status === "open" ? "Em andamento" : "Concluído"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
