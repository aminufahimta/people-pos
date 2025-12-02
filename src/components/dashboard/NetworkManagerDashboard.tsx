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
import { Clock, Calendar, ClipboardList, MessageSquare, DollarSign, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { GrowthTaskWidget } from "./GrowthTaskWidget";
import { MessagesTab } from "./MessagesTab";

interface NetworkManagerDashboardProps {
  user: User;
}

const NetworkManagerDashboard = ({ user }: NetworkManagerDashboardProps) => {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "overview";
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [salary, setSalary] = useState<any>(null);

  useEffect(() => {
    if (tab === "overview") {
      fetchAttendance();
      fetchSalary();
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

  const fetchSalary = async () => {
    const { data: salaryData } = await supabase
      .from("salary_info")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    setSalary(salaryData);
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

  // Messages tab
  if (tab === "messages") {
    return (
      <DashboardLayout 
        title="Messages" 
        subtitle="Task messages and project updates"
        userRole="network_manager"
      >
        <MessagesTab userId={user.id} />
      </DashboardLayout>
    );
  }

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
      <div className="space-y-4 md:space-y-6 p-4 md:p-0">
        <GrowthTaskWidget userId={user.id} />
        {/* Salary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card className="shadow-[var(--shadow-elegant)] hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Current Salary</CardTitle>
              <DollarSign className="h-4 w-4 text-accent flex-shrink-0" />
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-xl md:text-2xl font-bold text-foreground">
                ₦{Number(salary?.current_salary || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Base: ₦{Number(salary?.base_salary || 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-elegant)] hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Daily Rate</CardTitle>
              <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-xl md:text-2xl font-bold text-foreground">
                ₦{Number(salary?.daily_rate || 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-elegant)] hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Today's Status</CardTitle>
              <Clock className="h-4 w-4 text-success flex-shrink-0" />
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-xl md:text-2xl font-bold capitalize text-foreground">
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
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Total Deductions</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive flex-shrink-0" />
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-xl md:text-2xl font-bold text-foreground">
                ₦{Number(salary?.total_deductions || 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm md:text-base font-medium">Task Overview</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent className="pt-2">
              <CardDescription className="text-xs md:text-sm">
                View and monitor all tasks, update statuses, and provide technical support
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm md:text-base font-medium">Communication</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent className="pt-2">
              <CardDescription className="text-xs md:text-sm">
                Comment on tasks and collaborate with technicians and project managers
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Mark Attendance Section */}
        <Card className="shadow-[var(--shadow-elegant)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg">Mark Attendance</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div className="flex-1 w-full">
                <p className="text-xs md:text-sm text-muted-foreground">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <Button
                onClick={handleMarkAttendance}
                disabled={isClockingIn || todayAttendance?.status === "present"}
                className="w-full sm:w-auto sm:min-w-[120px]"
              >
                {todayAttendance?.status === "present" 
                  ? "Marked" 
                  : "Mark Today"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <AttendanceHistory userId={user.id} />

        <ProjectManagerTabs userId={user.id} />
      </div>
    </DashboardLayout>
  );
};

export default NetworkManagerDashboard;
