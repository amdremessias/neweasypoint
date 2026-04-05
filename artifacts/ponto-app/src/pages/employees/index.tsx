import { useState } from "react";
import { Link } from "wouter";
import { useListEmployees, useDeleteEmployee, getListEmployeesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Pencil, Trash2, User } from "lucide-react";

export default function EmployeesPage() {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");
  const [status, setStatus] = useState("active");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const params = {
    ...(search ? { search } : {}),
    ...(department && department !== "all" ? { department } : {}),
    ...(status && status !== "all" ? { status: status as "active" | "inactive" } : {}),
  };

  const { data: employees = [], isLoading } = useListEmployees(params);
  const deleteMutation = useDeleteEmployee();

  const departments = [...new Set(employees.map(e => e.department))].filter(Boolean);

  const handleDelete = async (id: number, name: string) => {
    await deleteMutation.mutateAsync({ id });
    await queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
    toast({ title: `${name} removido com sucesso` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Funcionários</h1>
          <p className="text-muted-foreground text-sm mt-1">{employees.length} funcionário(s) encontrado(s)</p>
        </div>
        <Link href="/employees/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Funcionário
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={department} onValueChange={setDepartment}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Departamentos</SelectItem>
            {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Employee List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : employees.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhum funcionário encontrado</div>
      ) : (
        <div className="grid gap-3">
          {employees.map(emp => (
            <Card key={emp.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/employees/${emp.id}`}>
                        <span className="font-semibold hover:underline cursor-pointer">{emp.name}</span>
                      </Link>
                      <Badge variant={emp.status === "active" ? "default" : "secondary"} className="text-xs">
                        {emp.status === "active" ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{emp.position} · {emp.department}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{emp.email}</p>
                  </div>
                  <div className="text-sm text-muted-foreground text-right shrink-0">
                    <p>Entrada: {emp.expectedCheckin}</p>
                    <p>Saída: {emp.expectedCheckout}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Link href={`/employees/${emp.id}/edit`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </Link>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover funcionário</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja remover {emp.name}? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(emp.id, emp.name)}>
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
