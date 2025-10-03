import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { FileText, Download, Loader2, Calendar } from "lucide-react";
import { format } from "date-fns";

interface Employee {
  id: string;
  full_name: string;
  email: string;
  department: string;
}

interface AttendanceRecord {
  date: string;
  status: string;
  clock_in: string | null;
  clock_out: string | null;
  deduction_amount: number;
}

interface SalaryRecord {
  base_salary: number;
  current_salary: number;
  total_deductions: number;
  daily_rate: number;
}

const ReportsGeneration = () => {
  const [reportType, setReportType] = useState<"attendance" | "salary">("attendance");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, department")
        .order("full_name");

      if (error) throw error;
      setEmployees(data || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load employees");
    } finally {
      setLoadingEmployees(false);
    }
  };

  const generateAttendanceReport = async () => {
    if (!selectedEmployee || !startDate || !endDate) {
      toast.error("Please select an employee and date range");
      return;
    }

    setLoading(true);
    try {
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance")
        .select("date, status, clock_in, clock_out, deduction_amount")
        .eq("user_id", selectedEmployee)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false });

      if (attendanceError) throw attendanceError;

      const { data: employeeData, error: employeeError } = await supabase
        .from("profiles")
        .select("full_name, email, department, position")
        .eq("id", selectedEmployee)
        .single();

      if (employeeError) throw employeeError;

      const presentDays = attendanceData?.filter((a) => a.status === "present").length || 0;
      const absentDays = attendanceData?.filter((a) => a.status === "absent").length || 0;
      const totalDeductions = attendanceData?.reduce((sum, a) => sum + (Number(a.deduction_amount) || 0), 0) || 0;

      setReportData({
        type: "attendance",
        employee: employeeData,
        records: attendanceData,
        summary: {
          presentDays,
          absentDays,
          totalDeductions,
          totalDays: attendanceData?.length || 0,
        },
      });

      toast.success("Attendance report generated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const generateSalaryReport = async () => {
    if (!selectedEmployee) {
      toast.error("Please select an employee");
      return;
    }

    setLoading(true);
    try {
      const { data: salaryData, error: salaryError } = await supabase
        .from("salary_info")
        .select("*")
        .eq("user_id", selectedEmployee)
        .single();

      if (salaryError) throw salaryError;

      const { data: employeeData, error: employeeError } = await supabase
        .from("profiles")
        .select("full_name, email, department, position")
        .eq("id", selectedEmployee)
        .single();

      if (employeeError) throw employeeError;

      setReportData({
        type: "salary",
        employee: employeeData,
        salary: salaryData,
      });

      toast.success("Salary report generated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = () => {
    if (reportType === "attendance") {
      generateAttendanceReport();
    } else {
      generateSalaryReport();
    }
  };

  const exportToCSV = () => {
    if (!reportData) return;

    let csvContent = "";

    if (reportData.type === "attendance") {
      csvContent = "Date,Status,Clock In,Clock Out,Deduction\n";
      reportData.records.forEach((record: AttendanceRecord) => {
        csvContent += `${record.date},${record.status},${record.clock_in || "N/A"},${record.clock_out || "N/A"},${record.deduction_amount}\n`;
      });
    } else {
      csvContent = "Field,Value\n";
      csvContent += `Base Salary,${reportData.salary.base_salary}\n`;
      csvContent += `Daily Rate,${reportData.salary.daily_rate}\n`;
      csvContent += `Current Salary,${reportData.salary.current_salary}\n`;
      csvContent += `Total Deductions,${reportData.salary.total_deductions}\n`;
    }

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportType}_report_${reportData.employee.full_name}_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card className="shadow-[var(--shadow-elegant)]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle>Generate Reports</CardTitle>
          </div>
          {reportData && (
            <Button onClick={exportToCSV} variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="reportType">Report Type</Label>
            <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
              <SelectTrigger id="reportType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="attendance">Attendance Report</SelectItem>
                <SelectItem value="salary">Salary Report</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="employee">Employee</Label>
            <Select
              value={selectedEmployee}
              onValueChange={setSelectedEmployee}
              onOpenChange={(open) => open && employees.length === 0 && fetchEmployees()}
            >
              <SelectTrigger id="employee">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {loadingEmployees ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.department || "No Dept"})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {reportType === "attendance" && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        )}

        <Button onClick={handleGenerateReport} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate Report"
          )}
        </Button>

        {reportData && (
          <div className="mt-6 space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4">
              <h3 className="font-semibold mb-2">Employee Information</h3>
              <div className="grid gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Name:</span>{" "}
                  <span className="font-medium">{reportData.employee.full_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span>{" "}
                  <span className="font-medium">{reportData.employee.email}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Department:</span>{" "}
                  <span className="font-medium">{reportData.employee.department || "N/A"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Position:</span>{" "}
                  <span className="font-medium">{reportData.employee.position || "N/A"}</span>
                </div>
              </div>
            </div>

            {reportData.type === "attendance" && (
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-success">
                        {reportData.summary.presentDays}
                      </div>
                      <p className="text-xs text-muted-foreground">Present Days</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-destructive">
                        {reportData.summary.absentDays}
                      </div>
                      <p className="text-xs text-muted-foreground">Absent Days</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">
                        {reportData.summary.totalDays}
                      </div>
                      <p className="text-xs text-muted-foreground">Total Days</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-destructive">
                        ₦{reportData.summary.totalDeductions.toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground">Total Deductions</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Clock In</TableHead>
                        <TableHead>Clock Out</TableHead>
                        <TableHead>Deduction</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.records.map((record: AttendanceRecord, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{format(new Date(record.date), "MMM dd, yyyy")}</TableCell>
                          <TableCell>
                            <span
                              className={
                                record.status === "present"
                                  ? "text-success font-medium"
                                  : "text-destructive font-medium"
                              }
                            >
                              {record.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            {record.clock_in
                              ? format(new Date(record.clock_in), "hh:mm a")
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            {record.clock_out
                              ? format(new Date(record.clock_out), "hh:mm a")
                              : "N/A"}
                          </TableCell>
                          <TableCell className="text-destructive">
                            ₦{Number(record.deduction_amount).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}

            {reportData.type === "salary" && (
              <div className="rounded-md border">
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Base Salary</TableCell>
                      <TableCell>₦{reportData.salary.base_salary.toLocaleString()}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Daily Rate</TableCell>
                      <TableCell>₦{reportData.salary.daily_rate.toLocaleString()}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Current Salary</TableCell>
                      <TableCell>₦{reportData.salary.current_salary.toLocaleString()}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Total Deductions</TableCell>
                      <TableCell className="text-destructive">
                        ₦{reportData.salary.total_deductions.toLocaleString()}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Net Salary</TableCell>
                      <TableCell className="text-success font-bold">
                        ₦
                        {(
                          reportData.salary.current_salary - reportData.salary.total_deductions
                        ).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReportsGeneration;
