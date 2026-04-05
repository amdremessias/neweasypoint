import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Link } from "wouter";
import { useGetEmployee, useGetEmployeeHoursReport, useListAttendance, getGetEmployeeQueryKey, getGetEmployeeHoursReportQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Pencil, User, Clock, TrendingUp, Calendar } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function EmployeeDetailPage() {
  const [, params] = useRoute("/employees/:id");
  const [, navigate] = useLocation();
  const id = Number(params?.id);

  const now = new Date();
  const [month] = useState(now.getMonth() + 1);
  const [year] = useState(now.getFullYear());

  const { data: employee, isLoading: empLoading } = useGetEmployee(id, {
    query: { enabled: !!id, queryKey: getGetEmployeeQueryKey(id) },
  });

  const { data: report } = useGetEmployeeHoursReport(id, { month, year }, {
    query: { enabled: !!id, queryKey: getGetEmployeeHoursReportQueryKey(id, { month, year }) },
  });

  const { data: attendance = [] } = useListAttendance({ employeeId: id });

  if (empLoading) {
    return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;
  }

  if (!employee) {
    return <div className="text-center py-12 text-muted-foreground">Funcionário não encontrado</div>;
  }

  const chartData = report?.dailyBreakdown
    .filter(d => d.status === "present" && d.hoursWorked != null)
    .slice(-15)
    .map(d => ({
      date: format(parseISO(d.date), "dd/MM"),
      horas: d.hoursWorked,
    })) ?? [];

  const formatDT = (ts: string | Date | null | undefined) => {
    if (!ts) return "—";
    try { return format(typeof ts === "string" ? parseISO(ts) : ts, "HH:mm"); } catch { return "—"; }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/employees")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{employee.name}</h1>
          <p className="text-muted-foreground text-sm">{employee.position} · {employee.department}</p>
        </div>
        <Link href={`/employees/${id}/edit`}>
          <Button variant="outline" size="sm" className="gap-2">
            <Pencil className="w-4 h-4" /> Editar
          </Button>
        </Link>
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 flex-1">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Email</p>
                <p className="text-sm font-medium">{employee.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                <Badge variant={employee.status === "active" ? "default" : "secondary"}>
                  {employee.status === "active" ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Horário</p>
                <p className="text-sm font-medium">{employee.expectedCheckin} – {employee.expectedCheckout}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Month Summary */}
      {report && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "Dias Trabalhados", value: `${report.presentDays}/${report.totalDays}`, icon: Calendar },
            { label: "Horas Trabalhadas", value: `${report.totalHours}h`, icon: Clock },
            { label: "Horas Esperadas", value: `${report.expectedHours}h`, icon: TrendingUp },
            { label: "Atrasos", value: report.lateDays, icon: Clock },
          ].map(stat => (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <stat.icon className="w-4 h-4 text-muted-foreground mt-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Horas Trabalhadas — {format(new Date(year, month - 1), "MMMM yyyy", { locale: ptBR })}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 12]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [`${value}h`, "Horas"]}
                />
                <Line type="monotone" dataKey="horas" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent Attendance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registros Recentes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {attendance.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">Sem registros</div>
          ) : (
            <div className="divide-y">
              {attendance.slice(0, 15).map(rec => (
                <div key={rec.id} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{rec.date}</p>
                    <p className="text-xs text-muted-foreground">
                      Entrada: {formatDT(rec.clockIn)} · Saída: {formatDT(rec.clockOut)}
                    </p>
                  </div>
                  <div className="text-right">
                    {rec.totalMinutes != null && (
                      <p className="text-sm font-medium">{(rec.totalMinutes / 60).toFixed(1)}h</p>
                    )}
                    {(rec.lateMinutes ?? 0) > 0 && (
                      <Badge variant="secondary" className="text-xs text-amber-600">
                        +{rec.lateMinutes} min atraso
                      </Badge>
                    )}
                    <Badge
                      variant={rec.status === "open" ? "outline" : "secondary"}
                      className="ml-1 text-xs"
                    >
                      {rec.status === "open" ? "Em andamento" : "Concluído"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
