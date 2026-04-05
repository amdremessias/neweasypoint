import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListEmployees, useClockIn, useClockOut, getGetDashboardSummaryQueryKey, getListAttendanceQueryKey, getGetRecentActivityQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function RegistrarPontoModal() {
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: employees = [] } = useListEmployees({ status: "active" });
  const clockInMutation = useClockIn();
  const clockOutMutation = useClockOut();

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    await queryClient.invalidateQueries({ queryKey: getListAttendanceQueryKey() });
    await queryClient.invalidateQueries({ queryKey: getGetRecentActivityQueryKey() });
  };

  const handleClockIn = async () => {
    if (!employeeId) return;
    await clockInMutation.mutateAsync({ data: { employeeId: Number(employeeId) } });
    await invalidate();
    toast({ title: "Entrada registrada com sucesso" });
    setOpen(false);
    setEmployeeId("");
  };

  const handleClockOut = async () => {
    if (!employeeId) return;
    await clockOutMutation.mutateAsync({ data: { employeeId: Number(employeeId) } });
    await invalidate();
    toast({ title: "Saída registrada com sucesso" });
    setOpen(false);
    setEmployeeId("");
  };

  const isLoading = clockInMutation.isPending || clockOutMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Clock className="w-4 h-4" />
          Registrar Ponto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Ponto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Funcionário</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o funcionário" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={String(emp.id)}>
                    {emp.name} — {emp.department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              className="flex-1"
              onClick={handleClockIn}
              disabled={!employeeId || isLoading}
            >
              Entrada
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleClockOut}
              disabled={!employeeId || isLoading}
            >
              Saída
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
