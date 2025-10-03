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
  userRole?: string;
}

const EmployeeManagement = ({ onUpdate, userRole }: EmployeeManagementProps) => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [isCreatingEmployee, setIsCreatingEmployee] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    email: "",
    department: "",
    position: "",
    phone: "",
    base_salary: 0,
    daily_rate: 0,
  });
  const [newEmployeeForm, setNewEmployeeForm] = useState({
    email: "",
    password: "",
    full_name: "",
    department: "",
    position: "",
    phone: "",
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

  const handleUpdateEmployee = async () => {
    if (!editingEmployee) return;

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: editForm.full_name,
          email: editForm.email,
          department: editForm.department || null,
          position: editForm.position || null,
          phone: editForm.phone || null,
        })
        .eq("id", editingEmployee.id);

      if (profileError) throw profileError;

      // Update salary info
      const salaryData = editingEmployee.salary_info?.[0];
      const newCurrentSalary = editForm.base_salary - (salaryData?.total_deductions || 0);

      if (salaryData?.id) {
        const { error } = await supabase
          .from("salary_info")
          .update({
            base_salary: editForm.base_salary,
            daily_rate: editForm.daily_rate,
            current_salary: newCurrentSalary,
          })
          .eq("id", salaryData.id);

        if (error) throw error;
      } else if (editForm.base_salary > 0 || editForm.daily_rate > 0) {
        const { error } = await supabase.from("salary_info").insert({
          user_id: editingEmployee.id,
          base_salary: editForm.base_salary,
          daily_rate: editForm.daily_rate,
          current_salary: newCurrentSalary,
        });

        if (error) throw error;
      }

      toast.success("Employee updated successfully");
      setEditingEmployee(null);
      fetchEmployees();
      onUpdate?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to update employee");
    }
  };

  const handleCreateEmployee = async () => {
    if (!newEmployeeForm.email || !newEmployeeForm.password || !newEmployeeForm.full_name) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsCreatingEmployee(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: newEmployeeForm.email,
          password: newEmployeeForm.password,
          full_name: newEmployeeForm.full_name,
          role: newEmployeeForm.role,
          department: newEmployeeForm.department || null,
          position: newEmployeeForm.position || null,
          phone: newEmployeeForm.phone || null,
          base_salary: newEmployeeForm.base_salary || 0,
          daily_rate: newEmployeeForm.daily_rate || 0,
        },
      });

      if (error) throw new Error(error.message || "Failed to create employee");

      toast.success("Employee created successfully");
      setNewEmployeeForm({
        email: "",
        password: "",
        full_name: "",
        department: "",
        position: "",
        phone: "",
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId: employeeId },
      });

      if (error) throw new Error(error.message || "Failed to delete employee");

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
                <Label htmlFor="new_department">Department</Label>
                <Input
                  id="new_department"
                  value={newEmployeeForm.department}
                  onChange={(e) =>
                    setNewEmployeeForm({ ...newEmployeeForm, department: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_position">Position</Label>
                <Input
                  id="new_position"
                  value={newEmployeeForm.position}
                  onChange={(e) =>
                    setNewEmployeeForm({ ...newEmployeeForm, position: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_phone">Phone</Label>
                <Input
                  id="new_phone"
                  type="tel"
                  value={newEmployeeForm.phone}
                  onChange={(e) =>
                    setNewEmployeeForm({ ...newEmployeeForm, phone: e.target.value })
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
                    {userRole === "super_admin" && (
                      <>
                        <SelectItem value="hr_manager">HR Manager</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      </>
                    )}
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
              <TableHead>Department</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Base Salary</TableHead>
              <TableHead>Daily Rate</TableHead>
              <TableHead>Current Salary</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => {
              const employeeRole = employee.user_roles?.[0]?.role;
              const canEdit = userRole === "super_admin" || employeeRole !== "super_admin";
              
              return (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.full_name}</TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>{employee.department || "-"}</TableCell>
                  <TableCell>{employee.position || "-"}</TableCell>
                  <TableCell>
                    {employeeRole ? getRoleBadge(employeeRole) : "-"}
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
                    {canEdit ? (
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingEmployee(employee);
                                setEditForm({
                                  full_name: employee.full_name,
                                  email: employee.email,
                                  department: employee.department || "",
                                  position: employee.position || "",
                                  phone: employee.phone || "",
                                  base_salary: employee.salary_info?.[0]?.base_salary || 0,
                                  daily_rate: employee.salary_info?.[0]?.daily_rate || 0,
                                });
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Edit Employee - {employee.full_name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="edit_full_name">Full Name</Label>
                                <Input
                                  id="edit_full_name"
                                  value={editForm.full_name}
                                  onChange={(e) =>
                                    setEditForm({ ...editForm, full_name: e.target.value })
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="edit_email">Email</Label>
                                <Input
                                  id="edit_email"
                                  type="email"
                                  value={editForm.email}
                                  onChange={(e) =>
                                    setEditForm({ ...editForm, email: e.target.value })
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="edit_department">Department</Label>
                                <Input
                                  id="edit_department"
                                  value={editForm.department}
                                  onChange={(e) =>
                                    setEditForm({ ...editForm, department: e.target.value })
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="edit_position">Position</Label>
                                <Input
                                  id="edit_position"
                                  value={editForm.position}
                                  onChange={(e) =>
                                    setEditForm({ ...editForm, position: e.target.value })
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="edit_phone">Phone</Label>
                                <Input
                                  id="edit_phone"
                                  type="tel"
                                  value={editForm.phone}
                                  onChange={(e) =>
                                    setEditForm({ ...editForm, phone: e.target.value })
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="edit_base_salary">Base Salary (₦)</Label>
                                <Input
                                  id="edit_base_salary"
                                  type="number"
                                  value={editForm.base_salary}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      base_salary: Number(e.target.value),
                                    })
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="edit_daily_rate">Daily Rate (₦)</Label>
                                <Input
                                  id="edit_daily_rate"
                                  type="number"
                                  value={editForm.daily_rate}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      daily_rate: Number(e.target.value),
                                    })
                                  }
                                />
                              </div>
                              <Button onClick={handleUpdateEmployee} className="w-full">
                                Update Employee
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
                    ) : (
                      <span className="text-xs text-muted-foreground">No actions available</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default EmployeeManagement;
