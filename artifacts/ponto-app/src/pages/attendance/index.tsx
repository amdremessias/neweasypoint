import { useState } from "react";
import { useListAttendance, useListEmployees, useDeleteAttendance, getListAttendanceQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trash2, Clock, Filter } from "lucide-react";

export default function AttendancePage() {
  const [employeeId, setEmployeeId] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const params = {
    ...(employeeId && employeeId !== "all" ? { employeeId: Number(employeeId) } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
    ...(status && status !== "all" ? { status: status as "open" | "closed" } : {}),
  };

  const { data: records = [], isLoading } = useListAttendance(params);
  const { data: employees = [] } = useListEmployees({ status: "active" });
  const deleteMutation = useDeleteAttendance();

  const handleDelete = async (id: number) => {
    await deleteMutation.mutateAsync({ id });
    await queryClient.invalidateQueries({ queryKey: getListAttendanceQueryKey() });
    toast({ title: "Registro removido" });
  };

  const formatDT = (ts: string | Date | null | undefined) => {
    if (!ts) return "—";
    try { return format(typeof ts === "string" ? parseISO(ts) : ts, "dd/MM HH:mm", { locale: ptBR }); } catch { return "—"; }
  };

  const formatTime = (ts: string | Date | null | undefined) => {
    if (!ts) return "—";
    try { return format(typeof ts === "string" ? parseISO(ts) : ts, "HH:mm"); } catch { return "—"; }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Registros de Ponto</h1>
        <p className="text-muted-foreground text-sm mt-1">{records.length} registro(s)</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 p-4 bg-muted/40 rounded-lg border">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground shrink-0">
          <Filter className="w-4 h-4" /> Filtros
        </div>
        <Select value={employeeId} onValueChange={setEmployeeId}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Funcionário" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Funcionários</SelectItem>
            {employees.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36" />
          <span className="text-muted-foreground text-sm">até</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="open">Em andamento</SelectItem>
            <SelectItem value="closed">Concluídos</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setEmployeeId("all"); setDateFrom(""); setDateTo(""); setStatus("all"); }}
        >
          Limpar
        </Button>
      </div>

      {/* Records */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : records.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhum registro encontrado</div>
      ) : (
        <div className="grid gap-2">
          {records.map(rec => (
            <Card key={rec.id} className="hover:border-primary/20 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="shrink-0">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{rec.employeeName}</span>
                      <Badge variant="outline" className="text-xs">{rec.employeeDepartment}</Badge>
                      <Badge variant={rec.status === "open" ? "default" : "secondary"} className="text-xs">
                        {rec.status === "open" ? "Em andamento" : "Concluído"}
                      </Badge>
                      {(rec.lateMinutes ?? 0) > 0 && (
                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-200">
                          +{rec.lateMinutes} min atraso
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Data: {rec.date} · Entrada: {formatTime(rec.clockIn)} · Saída: {formatTime(rec.clockOut)}
                      {rec.totalMinutes != null && ` · Total: ${(rec.totalMinutes / 60).toFixed(1)}h`}
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover registro</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja remover este registro de ponto?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(rec.id)}>Remover</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
