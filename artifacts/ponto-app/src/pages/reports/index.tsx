import { useState } from "react";
import { useGetDepartmentSummary, useGetEmployeeHoursReport, useListEmployees, getGetEmployeeHoursReportQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const months = [
  { value: "1", label: "Janeiro" }, { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" }, { value: "4", label: "Abril" },
  { value: "5", label: "Maio" }, { value: "6", label: "Junho" },
  { value: "7", label: "Julho" }, { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" }, { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" }, { value: "12", label: "Dezembro" },
];

export default function ReportsPage() {
  const now = new Date();
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year] = useState(now.getFullYear());

  const { data: departments = [] } = useGetDepartmentSummary();
  const { data: employees = [] } = useListEmployees({ status: "active" });

  const empId = selectedEmployee ? Number(selectedEmployee) : (employees[0]?.id ?? null);

  const { data: report } = useGetEmployeeHoursReport(
    empId!,
    { month: Number(month), year },
    { query: { enabled: !!empId, queryKey: getGetEmployeeHoursReportQueryKey(empId!, { month: Number(month), year }) } }
  );

  const chartData = departments.map(d => ({
    name: d.department,
    Presentes: d.presentToday,
    Ausentes: d.absentToday,
    taxa: d.attendanceRate,
  }));

  const hoursChartData = report?.dailyBreakdown
    .filter(d => d.status === "present" && d.hoursWorked != null)
    .map(d => ({
      date: format(parseISO(d.date), "dd/MM"),
      horas: d.hoursWorked,
      atraso: (d.lateMinutes ?? 0) > 0 ? d.lateMinutes : null,
    })) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão consolidada de presença e horas</p>
      </div>

      {/* Department Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Presença por Departamento — Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            {departments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Sem dados</div>
            ) : (
              <div className="space-y-4">
                {departments.map(dept => (
                  <div key={dept.department}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium">{dept.department}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{dept.presentToday}/{dept.totalEmployees}</span>
                        <Badge variant={dept.attendanceRate >= 80 ? "default" : "secondary"} className="text-xs">
                          {dept.attendanceRate}%
                        </Badge>
                      </div>
                    </div>
                    <Progress value={dept.attendanceRate} className="h-2" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Departamento</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Sem dados</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="Presentes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Ausentes" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Employee Hours Report */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base">Relatório de Horas por Funcionário</CardTitle>
            <div className="flex gap-2">
              <Select value={selectedEmployee || (employees[0] ? String(employees[0].id) : "")} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Selecionar funcionário" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {report ? (
            <div className="space-y-6">
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Dias Trabalhados", value: `${report.presentDays}/${report.totalDays}` },
                  { label: "Horas Realizadas", value: `${report.totalHours}h` },
                  { label: "Horas Esperadas", value: `${report.expectedHours}h` },
                  { label: "Dias com Atraso", value: report.lateDays },
                ].map(stat => (
                  <div key={stat.label} className="bg-muted/40 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                    <p className="text-xl font-bold mt-1">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Chart */}
              {hoursChartData.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-3">Horas por dia</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={hoursChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
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
                </div>
              )}

              {/* Daily Breakdown */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-3">Detalhamento diário</p>
                <div className="border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-5 gap-0 text-xs font-medium text-muted-foreground bg-muted/40 px-4 py-2">
                    <span>Data</span>
                    <span>Entrada</span>
                    <span>Saída</span>
                    <span>Horas</span>
                    <span>Status</span>
                  </div>
                  <div className="divide-y max-h-64 overflow-y-auto">
                    {report.dailyBreakdown.map(day => (
                      <div key={day.date} className="grid grid-cols-5 gap-0 px-4 py-2 text-sm hover:bg-muted/20">
                        <span className="text-muted-foreground">{day.date}</span>
                        <span>{day.clockIn ?? "—"}</span>
                        <span>{day.clockOut ?? "—"}</span>
                        <span>{day.hoursWorked != null ? `${day.hoursWorked}h` : "—"}</span>
                        <span>
                          {day.status === "present" ? (
                            <Badge variant="default" className="text-xs">Presente</Badge>
                          ) : day.status === "absent" ? (
                            <Badge variant="secondary" className="text-xs text-destructive">Ausente</Badge>
                          ) : day.status === "weekend" ? (
                            <Badge variant="outline" className="text-xs">Fim de semana</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Feriado</Badge>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {employees.length === 0 ? "Nenhum funcionário cadastrado" : "Carregando relatório..."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
