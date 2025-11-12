import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "./DashboardLayout";
import { ProjectManagerTabs } from "@/components/project-manager/ProjectManagerTabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { toast } from "sonner";
import AttendanceHistory from "@/components/employee/AttendanceHistory";

interface SalesDashboardProps {
  user: User;
}

export const SalesDashboard = ({ user }: SalesDashboardProps) => {
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
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

    setTodayAttendance(attendanceData);
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

  return (
    <DashboardLayout userRole="sales" title="Sales Dashboard" subtitle="Manage tasks and track customer projects">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="shadow-[var(--shadow-elegant)] hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's Status</CardTitle>
              <Clock className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize text-foreground">
                {todayAttendance?.status || "Not Marked"}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-[var(--shadow-elegant)]">
          <CardHeader>
            <CardTitle>Mark Attendance</CardTitle>
          </CardHeader>
          <CardContent>
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
