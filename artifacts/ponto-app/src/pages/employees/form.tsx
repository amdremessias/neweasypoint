import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useGetEmployee, useCreateEmployee, useUpdateEmployee, getListEmployeesQueryKey, getGetEmployeeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Eye, EyeOff, ShieldCheck } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  department: z.string().min(1, "Departamento é obrigatório"),
  position: z.string().min(1, "Cargo é obrigatório"),
  expectedCheckin: z.string().min(1, "Horário de entrada é obrigatório"),
  expectedLunchOut: z.string().min(1, "Horário de saída para almoço é obrigatório"),
  expectedLunchIn: z.string().min(1, "Horário de retorno do almoço é obrigatório"),
  expectedCheckout: z.string().min(1, "Horário de saída é obrigatório"),
  status: z.enum(["active", "inactive"]),
  salary: z.string().optional(),
  workloadMinutes: z.number().optional(),
});

type FormData = z.infer<typeof schema>;

const departments = ["Tecnologia", "RH", "Vendas", "Financeiro", "Marketing", "Operações", "Administrativo", "Jurídico"];

export default function EmployeeFormPage() {
  const [matchEdit, paramsEdit] = useRoute("/employees/:id/edit");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const id = matchEdit && paramsEdit?.id ? Number(paramsEdit.id) : null;
  const isEdit = id !== null;

  const [createAccess, setCreateAccess] = useState(false);
  const [accessPassword, setAccessPassword] = useState("");
  const [accessRole, setAccessRole] = useState<"admin" | "manager" | "employee">("employee");
  const [showPassword, setShowPassword] = useState(false);
  const [accessError, setAccessError] = useState("");

  const { data: employee } = useGetEmployee(id!, { query: { enabled: !!id, queryKey: getGetEmployeeQueryKey(id!) } });
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      department: "",
      position: "",
      expectedCheckin: "09:00",
      expectedLunchOut: "12:00",
      expectedLunchIn: "13:00",
      expectedCheckout: "18:00",
      status: "active",
      salary: "",
      workloadMinutes: 480,
    },
  });

  useEffect(() => {
    if (employee) {
      reset({
        name: employee.name,
        email: employee.email,
        department: employee.department,
        position: employee.position,
        expectedCheckin: employee.expectedCheckin,
        expectedLunchOut: (employee as any).expectedLunchOut ?? "12:00",
        expectedLunchIn: (employee as any).expectedLunchIn ?? "13:00",
        expectedCheckout: employee.expectedCheckout,
        status: employee.status as "active" | "inactive",
        salary: String((employee as any).salary ?? ""),
        workloadMinutes: (employee as any).workloadMinutes ?? 480,
      });
    }
  }, [employee, reset]);

  const onSubmit = async (data: FormData) => {
    setAccessError("");

    if (!isEdit && createAccess && accessPassword.length < 6) {
      setAccessError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (isEdit && id) {
      await updateMutation.mutateAsync({ id, data });
      await queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getGetEmployeeQueryKey(id) });
      toast({ title: "Funcionário atualizado com sucesso" });
    } else {
      const employee = await createMutation.mutateAsync({ data });
      await queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });

      if (createAccess && employee?.id) {
        try {
          const res = await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              name: data.name,
              email: data.email,
              password: accessPassword,
              role: accessRole,
              employeeId: employee.id,
            }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error ?? "Erro ao criar acesso.");
          }
          toast({ title: "Funcionário cadastrado com acesso ao sistema!" });
        } catch (err) {
          toast({
            title: "Funcionário criado, mas erro ao criar acesso",
            description: err instanceof Error ? err.message : "Erro desconhecido.",
            variant: "destructive",
          });
          navigate("/employees");
          return;
        }
      } else {
        toast({ title: "Funcionário cadastrado com sucesso" });
      }
    }
    navigate("/employees");
  };

  const watchStatus = watch("status");
  const watchDept = watch("department");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/employees")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {isEdit ? "Editar Funcionário" : "Novo Funcionário"}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informações Pessoais</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome Completo *</Label>
                <Input {...register("name")} placeholder="Nome do funcionário" />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input {...register("email")} type="email" placeholder="email@empresa.com" />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Departamento *</Label>
                <Select value={watchDept} onValueChange={v => setValue("department", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.department && <p className="text-xs text-destructive">{errors.department.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Cargo *</Label>
                <Input {...register("position")} placeholder="Ex: Analista de TI" />
                {errors.position && <p className="text-xs text-destructive">{errors.position.message}</p>}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Jornada de Trabalho</Label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Entrada Manhã *</Label>
                  <Input {...register("expectedCheckin")} type="time" />
                  {errors.expectedCheckin && <p className="text-xs text-destructive">{errors.expectedCheckin.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Saída Almoço *</Label>
                  <Input {...register("expectedLunchOut")} type="time" />
                  {errors.expectedLunchOut && <p className="text-xs text-destructive">{errors.expectedLunchOut.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Retorno Almoço *</Label>
                  <Input {...register("expectedLunchIn")} type="time" />
                  {errors.expectedLunchIn && <p className="text-xs text-destructive">{errors.expectedLunchIn.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Saída Tarde *</Label>
                  <Input {...register("expectedCheckout")} type="time" />
                  {errors.expectedCheckout && <p className="text-xs text-destructive">{errors.expectedCheckout.message}</p>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Salário</Label>
                <Input {...register("salary")} type="number" step="0.01" placeholder="Ex: 3500.00" />
              </div>
              <div className="space-y-2">
                <Label>Jornada (minutos)</Label>
                <Input {...register("workloadMinutes", { valueAsNumber: true })} type="number" placeholder="Ex: 480" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={watchStatus} onValueChange={v => setValue("status", v as "active" | "inactive")}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!isEdit && (
              <div className="border rounded-xl p-4 space-y-4 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Criar acesso ao sistema</span>
                  </div>
                  <Switch
                    checked={createAccess}
                    onCheckedChange={setCreateAccess}
                  />
                </div>

                {createAccess && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-1">
                    <div className="space-y-2">
                      <Label>Senha *</Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={accessPassword}
                          onChange={e => setAccessPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {accessError && <p className="text-xs text-destructive">{accessError}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Permissão</Label>
                      <Select value={accessRole} onValueChange={v => setAccessRole(v as "admin" | "manager" | "employee")}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee">Funcionário</SelectItem>
                          <SelectItem value="manager">Gestor</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isSubmitting} className="min-w-32">
                {isSubmitting ? "Salvando..." : isEdit ? "Salvar Alterações" : "Cadastrar"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/employees")}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
