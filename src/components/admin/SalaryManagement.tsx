import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DollarSign, Edit, Loader2, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Employee {
  id: string;
  full_name: string;
  email: string;
  department: string;
  position: string;
}

interface SalaryInfo {
  id: string;
  user_id: string;
  base_salary: number;
  daily_rate: number;
  current_salary: number;
  total_deductions: number;
  currency: string;
}

const SalaryManagement = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salaries, setSalaries] = useState<Record<string, SalaryInfo>>({});
  const [loading, setLoading] = useState(true);
  const [editingSalary, setEditingSalary] = useState<{ userId: string; baseSalary: number } | null>(null);
  const [workingDays, setWorkingDays] = useState(22);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch employees
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name");

      if (profilesError) throw profilesError;

      // Fetch salaries
      const { data: salariesData, error: salariesError } = await supabase
        .from("salary_info")
        .select("*");

      if (salariesError) throw salariesError;

      // Fetch working days setting
      const { data: settingsData } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "working_days_per_month")
        .single();

      if (settingsData) {
        setWorkingDays(Number(settingsData.setting_value));
      }

      setEmployees(profilesData || []);

      // Create a map of user_id to salary info
      const salaryMap: Record<string, SalaryInfo> = {};
      salariesData?.forEach((salary) => {
        salaryMap[salary.user_id] = salary;
      });
      setSalaries(salaryMap);
    } catch (error: any) {
      toast.error(error.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSalary = async () => {
    if (!editingSalary) return;

    const dailyRate = editingSalary.baseSalary / workingDays;

    try {
      const existingSalary = salaries[editingSalary.userId];

      if (existingSalary) {
        // Update existing salary
        const { error } = await supabase
          .from("salary_info")
          .update({
            base_salary: editingSalary.baseSalary,
            daily_rate: dailyRate,
            current_salary: editingSalary.baseSalary,
          })
          .eq("user_id", editingSalary.userId);

        if (error) throw error;
      } else {
        // Create new salary record
        const { error } = await supabase
          .from("salary_info")
          .insert({
            user_id: editingSalary.userId,
            base_salary: editingSalary.baseSalary,
            daily_rate: dailyRate,
            current_salary: editingSalary.baseSalary,
            total_deductions: 0,
          });

        if (error) throw error;
      }

      toast.success("Salary updated successfully");
      setEditingSalary(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to update salary");
    }
  };

  const handleClearDeductions = async (userId: string) => {
    try {
      const salary = salaries[userId];
      if (!salary) {
        toast.error("No salary information found");
        return;
      }

      // Update salary_info to clear deductions
      const { error: salaryError } = await supabase
        .from("salary_info")
        .update({
          total_deductions: 0,
          current_salary: salary.base_salary,
        })
        .eq("user_id", userId);

      if (salaryError) throw salaryError;

      // Clear deduction amounts from attendance records
      const { error: attendanceError } = await supabase
        .from("attendance")
        .update({ deduction_amount: 0 })
        .eq("user_id", userId);

      if (attendanceError) throw attendanceError;

      toast.success("Deductions cleared successfully");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to clear deductions");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-[var(--shadow-elegant)]">
      <CardHeader>
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <CardTitle>Salary Management</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Base Salary</TableHead>
                <TableHead>Daily Rate</TableHead>
                <TableHead>Current Salary</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => {
                const salary = salaries[employee.id];
                return (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{employee.full_name}</div>
                        <div className="text-sm text-muted-foreground">{employee.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>{employee.department || "-"}</TableCell>
                    <TableCell>{employee.position || "-"}</TableCell>
                    <TableCell>
                      ₦{salary ? salary.base_salary.toLocaleString() : "0"}
                    </TableCell>
                    <TableCell>
                      ₦{salary ? salary.daily_rate.toLocaleString() : "0"}
                    </TableCell>
                    <TableCell>
                      ₦{salary ? salary.current_salary.toLocaleString() : "0"}
                    </TableCell>
                    <TableCell className="text-destructive">
                      ₦{salary ? salary.total_deductions.toLocaleString() : "0"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setEditingSalary({
                                  userId: employee.id,
                                  baseSalary: salary?.base_salary || 0,
                                })
                              }
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Update Salary - {employee.full_name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label htmlFor="baseSalary">Base Salary (₦)</Label>
                                <Input
                                  id="baseSalary"
                                  type="number"
                                  value={editingSalary?.baseSalary || 0}
                                  onChange={(e) =>
                                    setEditingSalary(
                                      editingSalary
                                        ? { ...editingSalary, baseSalary: Number(e.target.value) }
                                        : null
                                    )
                                  }
                                />
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Daily Rate: ₦
                                {editingSalary
                                  ? (editingSalary.baseSalary / workingDays).toFixed(2)
                                  : "0"}
                              </div>
                              <Button onClick={handleUpdateSalary} className="w-full">
                                Update Salary
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>

                        {salary && salary.total_deductions > 0 && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Clear Salary Deductions?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will remove all deductions (₦{salary.total_deductions.toLocaleString()}) for {employee.full_name} and restore their salary to ₦{salary.base_salary.toLocaleString()}. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleClearDeductions(employee.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Clear Deductions
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default SalaryManagement;
