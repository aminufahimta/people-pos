import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "./DashboardLayout";
import { ProjectManagerTabs } from "@/components/project-manager/ProjectManagerTabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, DollarSign, Calendar, TrendingDown, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import AttendanceHistory from "@/components/employee/AttendanceHistory";
import { GrowthTaskWidget } from "./GrowthTaskWidget";
import { MessagesTab } from "./MessagesTab";
import { useSearchParams } from "react-router-dom";

interface SalesDashboardProps {
  user: User;
}

export const SalesDashboard = ({ user }: SalesDashboardProps) => {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "overview";
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [salary, setSalary] = useState<any>(null);
  const [isClockingIn, setIsClockingIn] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data: attendanceData } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle();

    const { data: salaryData } = await supabase
      .from("salary_info")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    setTodayAttendance(attendanceData);
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
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to mark attendance");
    } finally {
      setIsClockingIn(false);
    }
  };

  // Messages tab
  if (tab === "messages") {
    return (
      <DashboardLayout userRole="sales" title="Messages" subtitle="Task messages and project updates">
        <MessagesTab userId={user.id} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="sales" title="Sales Dashboard" subtitle="Manage tasks and track customer projects">
      <div className="space-y-4 md:space-y-6 p-4 md:p-0">
        <GrowthTaskWidget userId={user.id} />
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

        <Card className="shadow-[var(--shadow-elegant)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg">Mark Attendance</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <Button
              onClick={handleMarkAttendance}
              disabled={isClockingIn || todayAttendance?.status === "present"}
              className="w-full"
              size="lg"
            >
              {todayAttendance?.status === "present" 
                ? "Attendance Marked" 
                : "Mark Attendance"}
            </Button>
          </CardContent>
        </Card>

        <AttendanceHistory userId={user.id} />
        
        <ProjectManagerTabs userId={user.id} />
      </div>
    </DashboardLayout>
  );
};
