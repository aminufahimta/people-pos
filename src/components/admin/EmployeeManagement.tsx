import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

interface EmployeeManagementProps {
  onUpdate?: () => void;
}

const EmployeeManagement = ({ onUpdate }: EmployeeManagementProps) => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [salaryForm, setSalaryForm] = useState({
    base_salary: 0,
    daily_rate: 0,
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select(`
        *,
        user_roles (role),
        salary_info (id, base_salary, daily_rate, current_salary, total_deductions)
      `)
      .order("full_name");

    setEmployees(profiles || []);
  };

  const handleUpdateSalary = async () => {
    if (!editingEmployee) return;

    try {
      const salaryData = editingEmployee.salary_info?.[0];
      const newCurrentSalary = salaryForm.base_salary - (salaryData?.total_deductions || 0);

      if (salaryData?.id) {
        const { error } = await supabase
          .from("salary_info")
          .update({
            base_salary: salaryForm.base_salary,
            daily_rate: salaryForm.daily_rate,
            current_salary: newCurrentSalary,
          })
          .eq("id", salaryData.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("salary_info").insert({
          user_id: editingEmployee.id,
          base_salary: salaryForm.base_salary,
          daily_rate: salaryForm.daily_rate,
          current_salary: newCurrentSalary,
        });

        if (error) throw error;
      }

      toast.success("Salary updated successfully");
      setEditingEmployee(null);
      fetchEmployees();
      onUpdate?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to update salary");
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!confirm("Are you sure you want to delete this employee?")) return;

    try {
      const { error } = await supabase.auth.admin.deleteUser(employeeId);

      if (error) throw error;

      toast.success("Employee deleted successfully");
      fetchEmployees();
      onUpdate?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete employee");
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "super_admin":
        return <Badge className="bg-primary">Super Admin</Badge>;
      case "hr_manager":
        return <Badge className="bg-accent">HR Manager</Badge>;
      case "employee":
        return <Badge variant="secondary">Employee</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <Card className="shadow-[var(--shadow-elegant)]">
      <CardHeader>
        <CardTitle>Employee Management</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Base Salary</TableHead>
              <TableHead>Daily Rate</TableHead>
              <TableHead>Current Salary</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell className="font-medium">{employee.full_name}</TableCell>
                <TableCell>{employee.email}</TableCell>
                <TableCell>
                  {employee.user_roles?.[0]
                    ? getRoleBadge(employee.user_roles[0].role)
                    : "-"}
                </TableCell>
                <TableCell>
                  ₦{Number(employee.salary_info?.[0]?.base_salary || 0).toLocaleString()}
                </TableCell>
                <TableCell>
                  ₦{Number(employee.salary_info?.[0]?.daily_rate || 0).toLocaleString()}
                </TableCell>
                <TableCell>
                  ₦{Number(employee.salary_info?.[0]?.current_salary || 0).toLocaleString()}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingEmployee(employee);
                            setSalaryForm({
                              base_salary: employee.salary_info?.[0]?.base_salary || 0,
                              daily_rate: employee.salary_info?.[0]?.daily_rate || 0,
                            });
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Update Salary - {employee.full_name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="base_salary">Base Salary (₦)</Label>
                            <Input
                              id="base_salary"
                              type="number"
                              value={salaryForm.base_salary}
                              onChange={(e) =>
                                setSalaryForm({
                                  ...salaryForm,
                                  base_salary: Number(e.target.value),
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="daily_rate">Daily Rate (₦)</Label>
                            <Input
                              id="daily_rate"
                              type="number"
                              value={salaryForm.daily_rate}
                              onChange={(e) =>
                                setSalaryForm({
                                  ...salaryForm,
                                  daily_rate: Number(e.target.value),
                                })
                              }
                            />
                          </div>
                          <Button onClick={handleUpdateSalary} className="w-full">
                            Update Salary
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteEmployee(employee.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default EmployeeManagement;
