import { useGetDashboardSummary, useGetRecentActivity, useGetLateArrivals, useGetDepartmentSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Users, UserCheck, UserX, Clock, TrendingUp, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function DashboardPage() {
  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary();
  const { data: activity = [], isLoading: activityLoading } = useGetRecentActivity({ limit: 15 });
  const { data: lateArrivals = [] } = useGetLateArrivals();
  const { data: departments = [] } = useGetDepartmentSummary();

  const stats = [
    { label: "Total de Funcionários", value: summary?.totalEmployees ?? 0, icon: Users, color: "text-primary" },
    { label: "Presentes Hoje", value: summary?.presentToday ?? 0, icon: UserCheck, color: "text-green-600" },
    { label: "Ausentes Hoje", value: summary?.absentToday ?? 0, icon: UserX, color: "text-red-500" },
    { label: "Trabalhando Agora", value: summary?.stillWorkingNow ?? 0, icon: Clock, color: "text-blue-500" },
  ];

  const formatTime = (ts: string | Date) => {
    try {
      return format(typeof ts === "string" ? parseISO(ts) : ts, "HH:mm", { locale: ptBR });
    } catch {
      return "—";
    }
  };

  const formatDate = (ts: string | Date) => {
    try {
      return format(typeof ts === "string" ? parseISO(ts) : ts, "dd/MM HH:mm", { locale: ptBR });
    } catch {
      return "—";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                  <p className="text-3xl font-bold mt-1">{summaryLoading ? "—" : stat.value}</p>
                </div>
                <stat.icon className={`w-5 h-5 mt-0.5 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Atrasos Hoje</p>
                <p className="text-2xl font-bold">{summary?.lateToday ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Média Horas/Semana</p>
                <p className="text-2xl font-bold">{summary?.averageHoursThisWeek ?? 0}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <UserCheck className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Taxa de Presença (Mês)</p>
                <p className="text-2xl font-bold">{summary?.attendanceRateThisMonth ?? 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Department Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Presença por Departamento</CardTitle>
          </CardHeader>
          <CardContent>
            {departments.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Sem dados</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={departments} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="presentToday" name="Presentes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="absentToday" name="Ausentes" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {activityLoading ? (
              <div className="p-4 text-sm text-muted-foreground">Carregando...</div>
            ) : activity.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">Sem registros</div>
            ) : (
              <ul className="divide-y">
                {activity.slice(0, 8).map((item) => (
                  <li key={item.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.employeeName}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.department}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant={item.type === "clock_in" ? "default" : "secondary"} className="text-xs mb-1">
                        {item.type === "clock_in" ? "Entrada" : "Saída"}
                      </Badge>
                      <p className="text-xs text-muted-foreground">{formatDate(item.timestamp)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Late Arrivals */}
      {lateArrivals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Atrasos Hoje
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {lateArrivals.map((item) => (
                <div key={item.employeeId} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{item.employeeName}</p>
                    <p className="text-xs text-muted-foreground">{item.department}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-amber-600 font-medium">+{item.lateMinutes} min</p>
                    <p className="text-xs text-muted-foreground">
                      Esperado: {item.expectedCheckin} | Chegou: {formatTime(item.actualCheckin)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
