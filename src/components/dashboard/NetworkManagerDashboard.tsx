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
import { Clock, Calendar, ClipboardList, MessageSquare, DollarSign, Users } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface NetworkManagerDashboardProps {
  user: User;
}

interface SalaryInfo {
  id: string;
  user_id: string;
  base_salary: number;
  current_salary: number;
  total_deductions: number;
  currency: string;
  profiles: {
    full_name: string;
    email: string;
    department: string | null;
    position: string | null;
  };
}

const NetworkManagerDashboard = ({ user }: NetworkManagerDashboardProps) => {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "overview";
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [salaryData, setSalaryData] = useState<SalaryInfo[]>([]);

  useEffect(() => {
    if (tab === "overview") {
      fetchAttendance();
      fetchSalaryInfo();
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

  const fetchSalaryInfo = async () => {
    try {
      const { data, error } = await supabase
        .from("salary_info")
        .select(`
          *,
          profiles:user_id (
            full_name,
            email,
            department,
            position
          )
        `)
        .order("base_salary", { ascending: false });

      if (error) throw error;
      setSalaryData(data as unknown as SalaryInfo[] || []);
    } catch (error: any) {
      console.error("Error fetching salary info:", error);
      toast.error("Failed to load salary information");
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

        {/* Salary Information Section */}
        <Card className="shadow-[var(--shadow-elegant)]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Employee Salary Information
                </CardTitle>
                <CardDescription className="mt-1">
                  Overview of employee compensation and deductions
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{salaryData.length} Employees</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {salaryData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No salary information available</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-right">Base Salary</TableHead>
                      <TableHead className="text-right">Deductions</TableHead>
                      <TableHead className="text-right">Current Salary</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salaryData.map((salary) => (
                      <TableRow key={salary.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div>{salary.profiles.full_name}</div>
                            <div className="text-xs text-muted-foreground">{salary.profiles.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>{salary.profiles.position || "—"}</TableCell>
                        <TableCell>{salary.profiles.department || "—"}</TableCell>
                        <TableCell className="text-right font-medium">
                          {salary.currency} {salary.base_salary.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-destructive">
                          {salary.currency} {salary.total_deductions.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          {salary.currency} {salary.current_salary.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <ProjectManagerTabs userId={user.id} />
      </div>
    </DashboardLayout>
  );
};

export default NetworkManagerDashboard;
