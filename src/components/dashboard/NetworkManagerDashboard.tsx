import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "./DashboardLayout";
import { ProjectManagerTabs } from "@/components/project-manager/ProjectManagerTabs";
import { CustomersManagement } from "@/components/project-manager/CustomersManagement";
import AttendanceHistory from "@/components/employee/AttendanceHistory";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, ClipboardList, MessageSquare, DollarSign, Users, TrendingDown } from "lucide-react";
import { toast } from "sonner";

interface NetworkManagerDashboardProps {
  user: User;
}

interface SalarySummary {
  totalBaseSalary: number;
  totalCurrentSalary: number;
  totalDeductions: number;
  employeeCount: number;
}

const NetworkManagerDashboard = ({ user }: NetworkManagerDashboardProps) => {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "overview";
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [salarySummary, setSalarySummary] = useState<SalarySummary>({
    totalBaseSalary: 0,
    totalCurrentSalary: 0,
    totalDeductions: 0,
    employeeCount: 0,
  });

  useEffect(() => {
    if (tab === "overview") {
      fetchAttendance();
      fetchSalarySummary();
    }
  }, [user.id, tab]);

  const fetchAttendance = async () => {
    const today = new Date().toISOString().split("T")[0];
    
    const { data: todayData } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle();

    setTodayAttendance(todayData);
  };

  const fetchSalarySummary = async () => {
    try {
      const { data, error } = await supabase
        .from("salary_info")
        .select("base_salary, current_salary, total_deductions");

      if (error) throw error;

      if (data && data.length > 0) {
        const summary = data.reduce(
          (acc, curr) => ({
            totalBaseSalary: acc.totalBaseSalary + Number(curr.base_salary),
            totalCurrentSalary: acc.totalCurrentSalary + Number(curr.current_salary),
            totalDeductions: acc.totalDeductions + Number(curr.total_deductions),
            employeeCount: acc.employeeCount + 1,
          }),
          { totalBaseSalary: 0, totalCurrentSalary: 0, totalDeductions: 0, employeeCount: 0 }
        );
        setSalarySummary(summary);
      }
    } catch (error: any) {
      console.error("Error fetching salary summary:", error);
    }
  };

  const handleMarkAttendance = async () => {
    setIsClockingIn(true);
    try {
      const today = new Date().toISOString().split("T")[0];

      const { error } = await supabase.from("attendance").upsert({
        user_id: user.id,
        date: today,
        status: "present",
      }, {
        onConflict: "user_id,date"
      });

      if (error) throw error;
      toast.success("Attendance marked successfully!");
      fetchAttendance();
    } catch (error: any) {
      toast.error(error.message || "Failed to mark attendance");
    } finally {
      setIsClockingIn(false);
    }
  };

  // Customers tab
  if (tab === "customers") {
    return (
      <DashboardLayout 
        title="Customers" 
        subtitle="Manage customer projects and information"
        userRole="network_manager"
      >
        <CustomersManagement userId={user.id} />
      </DashboardLayout>
    );
  }

  // Tasks tab - only show task management
  if (tab === "tasks") {
    return (
      <DashboardLayout 
        title="Task Management" 
        subtitle="Monitor and support ongoing tasks"
        userRole="network_manager"
      >
        <ProjectManagerTabs userId={user.id} />
      </DashboardLayout>
    );
  }

  // Dashboard/Overview tab - show attendance + overview
  return (
    <DashboardLayout 
      title="Network Manager Dashboard" 
      subtitle="Monitor and support ongoing tasks"
      userRole="network_manager"
    >
      <div className="space-y-6">
        {/* Salary Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-[var(--shadow-elegant)] hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Base Salary</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                ₦{salarySummary.totalBaseSalary.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {salarySummary.employeeCount} employees
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-elegant)] hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Current Payroll</CardTitle>
              <DollarSign className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                ₦{salarySummary.totalCurrentSalary.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                After deductions
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-elegant)] hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Deductions</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                ₦{salarySummary.totalDeductions.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Across all employees
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-elegant)] hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Employees</CardTitle>
              <Users className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {salarySummary.employeeCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                With salary info
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Task Overview</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>
                View and monitor all tasks, update statuses, and provide technical support
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Communication</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>
                Comment on tasks and collaborate with technicians and project managers
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Section */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="shadow-[var(--shadow-elegant)] hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's Status</CardTitle>
              <Clock className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize text-foreground">
                {todayAttendance?.status || "Not Marked"}
              </div>
              {todayAttendance?.created_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  Marked at {new Date(todayAttendance.created_at).toLocaleTimeString()}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-elegant)] hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Date</CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {new Date().toLocaleDateString()}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-elegant)]">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Mark Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleMarkAttendance}
                disabled={isClockingIn || todayAttendance?.status === "present"}
                className="w-full"
              >
                {todayAttendance?.status === "present" 
                  ? "Marked" 
                  : "Mark Today"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <AttendanceHistory userId={user.id} />

        <ProjectManagerTabs userId={user.id} />
      </div>
    </DashboardLayout>
  );
};

export default NetworkManagerDashboard;
