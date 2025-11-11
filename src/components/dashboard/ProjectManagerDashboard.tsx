import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "./DashboardLayout";
import { ProjectManagerTabs } from "@/components/project-manager/ProjectManagerTabs";
import AttendanceHistory from "@/components/employee/AttendanceHistory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, ClipboardList, CheckCircle2, AlertCircle, Building2 } from "lucide-react";
import { toast } from "sonner";

interface ProjectManagerDashboardProps {
  user: User;
}

interface Statistics {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  activeCustomers: number;
}

export const ProjectManagerDashboard = ({ user }: ProjectManagerDashboardProps) => {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "overview";
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [statistics, setStatistics] = useState<Statistics>({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    activeCustomers: 0,
  });

  useEffect(() => {
    if (tab === "overview") {
      fetchAttendance();
      fetchStatistics();
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

  const fetchStatistics = async () => {
    try {
      // Fetch total tasks (excluding deleted)
      const { count: totalTasksCount } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("is_deleted", false);

      // Fetch completed tasks
      const { count: completedTasksCount } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed")
        .eq("is_deleted", false);

      // Fetch pending tasks
      const { count: pendingTasksCount } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
        .eq("is_deleted", false);

      // Fetch active customers/projects
      const { count: activeCustomersCount } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .eq("project_status", "active");

      setStatistics({
        totalTasks: totalTasksCount || 0,
        completedTasks: completedTasksCount || 0,
        pendingTasks: pendingTasksCount || 0,
        activeCustomers: activeCustomersCount || 0,
      });
    } catch (error) {
      console.error("Error fetching statistics:", error);
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

  // Tasks tab - only show task management
  if (tab === "tasks") {
    return (
      <DashboardLayout 
        title="Task Management" 
        subtitle="Manage customer tasks and assignments"
        userRole="project_manager"
      >
        <ProjectManagerTabs userId={user.id} />
      </DashboardLayout>
    );
  }

  // Dashboard/Overview tab - show attendance + overview
  return (
    <DashboardLayout 
      title="Project Manager Dashboard" 
      subtitle="Overview and attendance tracking"
      userRole="project_manager"
    >
      <div className="space-y-6">
        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-[var(--shadow-elegant)] hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
              <ClipboardList className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {statistics.totalTasks}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                All active tasks
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-elegant)] hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed Tasks</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {statistics.completedTasks}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Successfully finished
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-elegant)] hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Tasks</CardTitle>
              <AlertCircle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {statistics.pendingTasks}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Awaiting action
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-elegant)] hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Customers</CardTitle>
              <Building2 className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {statistics.activeCustomers}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Current projects
              </p>
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
      </div>
    </DashboardLayout>
  );
};
