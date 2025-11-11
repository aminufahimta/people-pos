import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "./DashboardLayout";
import { ProjectManagerTabs } from "@/components/project-manager/ProjectManagerTabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Calendar } from "lucide-react";
import { toast } from "sonner";

interface ProjectManagerDashboardProps {
  user: User;
}

export const ProjectManagerDashboard = ({ user }: ProjectManagerDashboardProps) => {
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [isClockingIn, setIsClockingIn] = useState(false);

  useEffect(() => {
    fetchAttendance();
  }, [user.id]);

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

  return (
    <DashboardLayout 
      title="Project Manager Dashboard" 
      subtitle="Manage customer projects and tasks"
      userRole="project_manager"
    >
      <div className="space-y-6">
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

        <ProjectManagerTabs userId={user.id} />
      </div>
    </DashboardLayout>
  );
};
