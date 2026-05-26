import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Calculator, Wallet, TrendingUp, TrendingDown } from "lucide-react";

interface PayrollData {
  employeeId: number;
  employeeName: string;
  department: string;
  month: number;
  year: number;
  salary: number;
  totalHours: number;
  expectedHours: number;
  workDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  totalLateMinutes: number;
  overtimeMinutes: number;
  baseSalary: number;
  overtimePay: number;
  deductions: number;
  netSalary: number;
  hourlyRate: number;
  bancoDeHorasMinutes: number;
}

interface EmployeeOption {
  id: number;
  name: string;
  department: string;
}

export default function PayrollPage() {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [payroll, setPayroll] = useState<PayrollData | null>(null);
  const [loading, setLoading] = useState(false);

  const loadEmployees = async () => {
    try {
      const res = await fetch("/api/employees", { credentials: "include" });
      const data = await res.json();
      setEmployees(Array.isArray(data) ? data.map((e: { id: number; name: string; department: string }) => ({ id: e.id, name: e.name, department: e.department })) : []);
    } catch {
      toast({ title: "Erro ao carregar funcionarios.", variant: "destructive" });
    }
  };

  const calculate = async () => {
    if (!selectedEmployee) {
      toast({ title: "Selecione um funcionario." });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/payroll/${selectedEmployee}/${month}/${year}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao calcular folha.");
      const data = await res.json();
      setPayroll(data);
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Erro desconhecido.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generate = async () => {
    if (!selectedEmployee) return;
    try {
      const res = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ employeeId: Number(selectedEmployee), month, year }),
      });
      if (!res.ok) throw new Error("Erro ao gerar folha.");
      toast({ title: "Folha de pagamento gerada com sucesso!" });
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Erro desconhecido.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const months = [
    "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Folha de Pagamento</h1>
        <p className="text-muted-foreground text-sm mt-1">Calcular e visualizar folha de pagamento por funcionario</p>
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Funcionario</label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                onClick={() => employees.length === 0 && loadEmployees()}
                className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Selecione...</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name} ({e.department})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Mes</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {months.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Ano</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={calculate} disabled={loading} className="flex-1 gap-2">
                <Calculator className="w-4 h-4" />
                {loading ? "Calculando..." : "Calcular"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {payroll && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-5">
                <p className="text-xs font-medium text-muted-foreground uppercase">Salario Base</p>
                <p className="text-2xl font-bold mt-1">R$ {Number(payroll.baseSalary).toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs font-medium text-muted-foreground uppercase">Horas Extras</p>
                <p className="text-2xl font-bold mt-1 text-green-600">+R$ {Number(payroll.overtimePay).toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs font-medium text-muted-foreground uppercase">Descontos</p>
                <p className="text-2xl font-bold mt-1 text-red-500">-R$ {Number(payroll.deductions).toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs font-medium text-muted-foreground uppercase">Salario Liquido</p>
                <p className="text-2xl font-bold mt-1 text-primary">R$ {Number(payroll.netSalary).toFixed(2)}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detalhamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Funcionario</span>
                  <span className="font-medium">{payroll.employeeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Departamento</span>
                  <span className="font-medium">{payroll.department}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dias Trabalhados</span>
                  <span className="font-medium">{payroll.presentDays} / {payroll.workDays}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Horas Totais</span>
                  <span className="font-medium">{payroll.totalHours}h / {payroll.expectedHours}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor Hora</span>
                  <span className="font-medium">R$ {payroll.hourlyRate.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Banco de Horas</span>
                  <span className="font-medium">{Math.round(payroll.bancoDeHorasMinutes / 6) / 10}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dias de Atraso</span>
                  <span className="font-medium">{payroll.lateDays}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resumo Financeiro</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Salario Bruto</span>
                  <span className="font-medium">R$ {payroll.salary.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Adicional Hora Extra (50%)</span>
                  <span className="font-medium">+R$ {Number(payroll.overtimePay).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-red-500">
                  <span>Descontos (faltas)</span>
                  <span className="font-medium">-R$ {Number(payroll.deductions).toFixed(2)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span className="font-semibold">Salario Liquido</span>
                  <span className="font-bold text-primary">R$ {Number(payroll.netSalary).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Button onClick={generate} className="gap-2">
            <Wallet className="w-4 h-4" />
            Gerar Registro de Folha
          </Button>
        </>
      )}
    </div>
  );
}
