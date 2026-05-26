import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { useListAttendance } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { LogIn, LogOut, Clock, User, Coffee, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";

type PontoStep = "not_started" | "morning" | "lunch" | "afternoon" | "closed";

function getPontoStep(record: any): PontoStep {
  if (!record) return "not_started";
  if (record.status === "closed") return "closed";
  if (!record.lunchOut) return "morning";
  if (!record.lunchIn) return "lunch";
  return "afternoon";
}

export default function MeuPontoPage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const employeeId = user?.employeeId ?? 0;

  const todayStr = new Date().toISOString().split("T")[0];

  const { data: todayRecords = [], refetch } = useListAttendance(
    { employeeId },
    { query: { enabled: !!employeeId, queryKey: ["attendance", employeeId] } }
  );

  const todayRecord = todayRecords.find(
    (r: any) => r.date === todayStr && r.employeeId === employeeId
  );

  const step = getPontoStep(todayRecord);

  const formatTime = (iso: string | null | undefined) => {
    if (!iso) return "—";
    const d = new Date(iso);
    const brtHours = ((d.getUTCHours() - 3) + 24) % 24;
    return `${String(brtHours).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  };

  const apiAction = async (url: string, successMsg: string, successDesc: string, errorMsg: string, body?: Record<string, unknown>) => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body ?? { employeeId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? errorMsg);
      }
      toast({ title: successMsg, description: successDesc });
      refetch();
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : errorMsg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
      });
      await apiAction(
        "/api/attendance/clockin",
        "Entrada registrada!",
        "Bom trabalho!",
        "Não foi possível registrar entrada.",
        { employeeId, latitude: pos.coords.latitude, longitude: pos.coords.longitude }
      );
    } catch {
      await apiAction(
        "/api/attendance/clockin",
        "Entrada registrada!",
        "Bom trabalho!",
        "Não foi possível registrar entrada: habilite a localização ou entre em contato com o administrador."
      );
    }
  };
  const handleLunchOut = () => apiAction("/api/attendance/lunch-out", "Saída para almoço registrada!", "Bom almoço!", "Não foi possível registrar saída para almoço.");
  const handleLunchIn = () => apiAction("/api/attendance/lunch-in", "Retorno do almoço registrado!", "Boa tarde!", "Não foi possível registrar retorno do almoço.");
  const handleClockOut = () => apiAction("/api/attendance/clockout", "Saída registrada!", "Até amanhã!", "Não foi possível registrar saída.");

  const recentRecords = todayRecords.slice(0, 10);

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

        {/* Progress bar - 4 etapas */}
        <div className="flex items-center gap-1">
          {[
            { key: "morning", label: "Manhã" },
            { key: "lunch", label: "Almoço" },
            { key: "afternoon", label: "Tarde" },
            { key: "closed", label: "Encerrado" },
          ].map((s, i) => {
            const stepOrder = { not_started: -1, morning: 0, lunch: 1, afternoon: 2, closed: 3 };
            const currentIdx = stepOrder[step];
            const done = i < currentIdx;
            const active = i === currentIdx;
            return (
              <div key={s.key} className="flex-1 flex flex-col items-center gap-1">
                <div className={`h-1.5 w-full rounded-full ${done || active ? "bg-primary" : "bg-muted"}`} />
                <span className={`text-[10px] ${active ? "text-primary font-semibold" : done ? "text-muted-foreground" : "text-muted-foreground/50"}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="bg-card rounded-2xl border p-6 text-center space-y-4">
          {step === "not_started" && (
            <div className="space-y-3">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                <Clock className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">Nenhum registro hoje.</p>
              <Button onClick={handleClockIn} disabled={loading} className="gap-2 mt-2" size="lg">
                <LogIn className="w-5 h-5" />
                Entrada Manhã
              </Button>
            </div>
          )}

          {step === "morning" && (
            <div className="space-y-3">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <Clock className="w-8 h-8 text-green-600" />
              </div>
              <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Período da Manhã
              </span>
              <p className="text-sm text-muted-foreground">
                Entrada: <strong>{formatTime(todayRecord?.clockIn)}</strong>
                {(todayRecord?.lateMinutes ?? 0) > 0 && (
                  <span className="text-amber-600 ml-1">(+{todayRecord!.lateMinutes} min de atraso)</span>
                )}
              </p>
              <Button onClick={handleLunchOut} disabled={loading} variant="outline" className="gap-2" size="lg">
                <UtensilsCrossed className="w-5 h-5" />
                Saída para Almoço
              </Button>
            </div>
          )}

          {step === "lunch" && (
            <div className="space-y-3">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                <Coffee className="w-8 h-8 text-amber-600" />
              </div>
              <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 text-xs font-medium px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Intervalo de Almoço
              </span>
              <p className="text-sm text-muted-foreground">
                Saída: <strong>{formatTime(todayRecord?.lunchOut)}</strong>
              </p>
              <Button onClick={handleLunchIn} disabled={loading} className="gap-2" size="lg">
                <LogIn className="w-5 h-5" />
                Retorno do Almoço
              </Button>
            </div>
          )}

          {step === "afternoon" && (
            <div className="space-y-3">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
              <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Período da Tarde
              </span>
              <div className="text-sm text-muted-foreground space-y-0.5">
                <p>Entrada manhã: <strong>{formatTime(todayRecord?.clockIn)}</strong></p>
                <p>Almoço: <strong>{formatTime(todayRecord?.lunchOut)}</strong> → <strong>{formatTime(todayRecord?.lunchIn)}</strong>
                  {todayRecord?.lunchMinutes != null && <span className="text-muted-foreground ml-1">({todayRecord.lunchMinutes} min)</span>}
                </p>
              </div>
              <Button onClick={handleClockOut} disabled={loading} variant="outline" className="gap-2" size="lg">
                <LogOut className="w-5 h-5" />
                Saída Tarde
              </Button>
            </div>
          )}

          {step === "closed" && (
            <div className="space-y-3">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                <Clock className="w-8 h-8 text-muted-foreground" />
              </div>
              <span className="inline-flex items-center gap-1.5 bg-muted text-muted-foreground text-xs font-medium px-2.5 py-1 rounded-full">
                Jornada Concluída
              </span>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  <span className="text-foreground font-medium">Manhã:</span>{" "}
                  {formatTime(todayRecord?.clockIn)} → {formatTime(todayRecord?.lunchOut)}
                </p>
                {todayRecord?.lunchOut && (
                  <p>
                    <span className="text-foreground font-medium">Almoço:</span>{" "}
                    {formatTime(todayRecord?.lunchOut)} → {formatTime(todayRecord?.lunchIn)}
                    {todayRecord?.lunchMinutes != null && <span className="ml-1">({todayRecord.lunchMinutes} min)</span>}
                  </p>
                )}
                <p>
                  <span className="text-foreground font-medium">Tarde:</span>{" "}
                  {formatTime(todayRecord?.lunchIn || todayRecord?.clockIn)} → {formatTime(todayRecord?.clockOut)}
                </p>
              </div>
              {todayRecord?.totalMinutes != null && (
                <p className="text-base font-semibold text-foreground">
                  Total trabalhado: {Math.floor(todayRecord.totalMinutes / 60)}h{todayRecord.totalMinutes % 60 > 0 ? `${todayRecord.totalMinutes % 60}min` : ""}
                </p>
              )}
              {(todayRecord?.overtimeMinutes ?? 0) > 0 && (
                <p className="text-xs text-primary">+{todayRecord!.overtimeMinutes} min de hora extra</p>
              )}
            </div>
          )}
        </div>

        {/* Registros recentes */}
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
                <li key={rec.id} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{rec.date}</p>
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
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                    <span>Entrada: {formatTime(rec.clockIn)}</span>
                    {rec.lunchOut && <span>Almoço: {formatTime(rec.lunchOut)} → {formatTime(rec.lunchIn)}</span>}
                    {rec.clockOut && <span>Saída: {formatTime(rec.clockOut)}</span>}
                    {rec.totalMinutes != null && (
                      <span className="font-medium text-foreground">
                        {Math.floor(rec.totalMinutes / 60)}h{rec.totalMinutes % 60 > 0 ? `${rec.totalMinutes % 60}min` : ""}
                      </span>
                    )}
                    {(rec.lateMinutes ?? 0) > 0 && (
                      <span className="text-amber-600">+{rec.lateMinutes} min atraso</span>
                    )}
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
