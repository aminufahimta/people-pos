import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const AttendanceOverview = () => {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [selectedRange, setSelectedRange] = useState("today");
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, total: 0 });
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();

  useEffect(() => {
    fetchAttendance();
  }, [selectedRange, customStartDate, customEndDate]);

  const getDateRange = () => {
    const today = new Date();
    let startDate = new Date();

    if (selectedRange === "custom") {
      return {
        start: customStartDate ? customStartDate.toISOString().split("T")[0] : today.toISOString().split("T")[0],
        end: customEndDate ? customEndDate.toISOString().split("T")[0] : today.toISOString().split("T")[0]
      };
    }

    switch (selectedRange) {
      case "week":
        startDate.setDate(today.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(today.getMonth() - 1);
        break;
      default:
        startDate = today;
    }

    return {
      start: startDate.toISOString().split("T")[0],
      end: today.toISOString().split("T")[0]
    };
  };

  const fetchAttendance = async () => {
    const { start, end } = getDateRange();
    
    let query = supabase
      .from("attendance")
      .select(`
        *,
        profiles (full_name, department)
      `)
      .order("date", { ascending: false })
      .order("clock_in", { ascending: false });

    if (selectedRange === "today") {
      query = query.eq("date", end);
    } else {
      query = query.gte("date", start).lte("date", end);
    }

    const { data } = await query;
    const records = data || [];
    setAttendance(records);

    // Calculate stats
    const present = records.filter(r => r.status === "present").length;
    const absent = records.filter(r => r.status === "absent").length;
    const late = records.filter(r => r.status === "late").length;
    setStats({ present, absent, late, total: records.length });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present":
        return <Badge className="bg-success text-success-foreground">Present</Badge>;
      case "absent":
        return <Badge variant="destructive">Absent</Badge>;
      case "late":
        return <Badge className="bg-warning text-warning-foreground">Late</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleClearDailyDeduction = async (attendanceId: string, userId: string, deductionAmount: number) => {
    try {
      // Clear the deduction on this specific attendance record
      const { error: attendanceError } = await supabase
        .from("attendance")
        .update({ deduction_amount: 0 })
        .eq("id", attendanceId);

      if (attendanceError) throw attendanceError;

      // Fetch the user's salary info
      const { data: salaryData, error: salaryFetchError } = await supabase
        .from("salary_info")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (salaryFetchError) throw salaryFetchError;

      // Recalculate total deductions and current salary
      const newTotalDeductions = Math.max(0, salaryData.total_deductions - deductionAmount);
      const newCurrentSalary = salaryData.base_salary - newTotalDeductions;

      // Update salary info
      const { error: salaryUpdateError } = await supabase
        .from("salary_info")
        .update({
          total_deductions: newTotalDeductions,
          current_salary: newCurrentSalary,
        })
        .eq("user_id", userId);

      if (salaryUpdateError) throw salaryUpdateError;

      toast.success("Daily deduction cleared successfully");
      fetchAttendance();
    } catch (error: any) {
      toast.error(error.message || "Failed to clear deduction");
    }
  };


  return (
    <Card className="shadow-[var(--shadow-elegant)]">
      <CardHeader className="flex flex-col gap-4">
        <div className="flex flex-row items-center justify-between">
          <CardTitle>Attendance Overview</CardTitle>
          <Select value={selectedRange} onValueChange={setSelectedRange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Past Week</SelectItem>
              <SelectItem value="month">Past Month</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {selectedRange === "custom" && (
          <div className="flex gap-4 items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !customStartDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customStartDate ? format(customStartDate, "PPP") : <span>Start date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customStartDate}
                  onSelect={setCustomStartDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !customEndDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customEndDate ? format(customEndDate, "PPP") : <span>End date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customEndDate}
                  onSelect={setCustomEndDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {selectedRange !== "today" && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Total Records</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-success">{stats.present}</div>
                <p className="text-xs text-muted-foreground">Present</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-warning">{stats.late}</div>
                <p className="text-xs text-muted-foreground">Late</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-destructive">{stats.absent}</div>
                <p className="text-xs text-muted-foreground">Absent</p>
              </CardContent>
            </Card>
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              {selectedRange !== "today" && <TableHead>Date</TableHead>}
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Clock In</TableHead>
              <TableHead>Clock Out</TableHead>
              <TableHead>Deduction</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attendance.length === 0 ? (
              <TableRow>
                <TableCell colSpan={selectedRange !== "today" ? 8 : 7} className="text-center text-muted-foreground">
                  No attendance records for this period
                </TableCell>
              </TableRow>
            ) : (
              attendance.map((record) => (
                <TableRow key={record.id}>
                  {selectedRange !== "today" && (
                    <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                  )}
                  <TableCell className="font-medium">
                    {record.profiles?.full_name || "Unknown"}
                  </TableCell>
                  <TableCell>{record.profiles?.department || "-"}</TableCell>
                  <TableCell>{getStatusBadge(record.status)}</TableCell>
                  <TableCell>
                    {record.clock_in
                      ? new Date(record.clock_in).toLocaleTimeString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {record.clock_out
                      ? new Date(record.clock_out).toLocaleTimeString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {record.deduction_amount > 0
                      ? `₦${Number(record.deduction_amount).toLocaleString()}`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {record.deduction_amount > 0 && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Clear Daily Deduction?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove the ₦{Number(record.deduction_amount).toLocaleString()} deduction from {record.profiles?.full_name || "this employee"}'s salary for {new Date(record.date).toLocaleDateString()}. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleClearDailyDeduction(record.id, record.user_id, record.deduction_amount)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Clear Deduction
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default AttendanceOverview;
