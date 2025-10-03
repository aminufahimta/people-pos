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
import { Pencil, Trash2, UserPlus } from "lucide-react";

interface EmployeeManagementProps {
  onUpdate?: () => void;
}

const EmployeeManagement = ({ onUpdate }: EmployeeManagementProps) => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [isCreatingEmployee, setIsCreatingEmployee] = useState(false);
  const [salaryForm, setSalaryForm] = useState({
    base_salary: 0,
    daily_rate: 0,
  });
  const [newEmployeeForm, setNewEmployeeForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "employee" as "employee" | "hr_manager" | "super_admin",
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

  const handleCreateEmployee = async () => {
    if (!newEmployeeForm.email || !newEmployeeForm.password || !newEmployeeForm.full_name) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsCreatingEmployee(true);
    try {
      // Create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newEmployeeForm.email,
        password: newEmployeeForm.password,
        options: {
          data: {
            full_name: newEmployeeForm.full_name,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      // Update role if not employee
      if (newEmployeeForm.role !== "employee") {
        const { error: roleError } = await supabase
          .from("user_roles")
          .update({ role: newEmployeeForm.role })
          .eq("user_id", authData.user.id);

        if (roleError) throw roleError;
      }

      // Create salary info if provided
      if (newEmployeeForm.base_salary > 0 && newEmployeeForm.daily_rate > 0) {
        const { error: salaryError } = await supabase.from("salary_info").insert({
          user_id: authData.user.id,
          base_salary: newEmployeeForm.base_salary,
          daily_rate: newEmployeeForm.daily_rate,
          current_salary: newEmployeeForm.base_salary,
        });

        if (salaryError) throw salaryError;
      }

      toast.success("Employee created successfully");
      setNewEmployeeForm({
        email: "",
        password: "",
        full_name: "",
        role: "employee",
        base_salary: 0,
        daily_rate: 0,
      });
      fetchEmployees();
      onUpdate?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to create employee");
    } finally {
      setIsCreatingEmployee(false);
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
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Employee Management</CardTitle>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Employee</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new_full_name">Full Name *</Label>
                <Input
                  id="new_full_name"
                  value={newEmployeeForm.full_name}
                  onChange={(e) =>
                    setNewEmployeeForm({ ...newEmployeeForm, full_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_email">Email *</Label>
                <Input
                  id="new_email"
                  type="email"
                  value={newEmployeeForm.email}
                  onChange={(e) =>
                    setNewEmployeeForm({ ...newEmployeeForm, email: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_password">Password *</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={newEmployeeForm.password}
                  onChange={(e) =>
                    setNewEmployeeForm({ ...newEmployeeForm, password: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_role">Role</Label>
                <Select
                  value={newEmployeeForm.role}
                  onValueChange={(value: any) =>
                    setNewEmployeeForm({ ...newEmployeeForm, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="hr_manager">HR Manager</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_base_salary">Base Salary (₦)</Label>
                <Input
                  id="new_base_salary"
                  type="number"
                  value={newEmployeeForm.base_salary}
                  onChange={(e) =>
                    setNewEmployeeForm({
                      ...newEmployeeForm,
                      base_salary: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_daily_rate">Daily Rate (₦)</Label>
                <Input
                  id="new_daily_rate"
                  type="number"
                  value={newEmployeeForm.daily_rate}
                  onChange={(e) =>
                    setNewEmployeeForm({
                      ...newEmployeeForm,
                      daily_rate: Number(e.target.value),
                    })
                  }
                />
              </div>
              <Button
                onClick={handleCreateEmployee}
                disabled={isCreatingEmployee}
                className="w-full"
              >
                {isCreatingEmployee ? "Creating..." : "Create Employee"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
