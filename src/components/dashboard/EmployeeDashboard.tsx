import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "./DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Calendar, Clock, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import AttendanceHistory from "@/components/employee/AttendanceHistory";

interface EmployeeDashboardProps {
  user: User;
}

const EmployeeDashboard = ({ user }: EmployeeDashboardProps) => {
  const [profile, setProfile] = useState<any>(null);
  const [salary, setSalary] = useState<any>(null);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [isClockingIn, setIsClockingIn] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const { data: salaryData } = await supabase
      .from("salary_info")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const today = new Date().toISOString().split("T")[0];
    const { data: attendanceData } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle();

    setProfile(profileData);
    setSalary(salaryData);
    setTodayAttendance(attendanceData);
  };

  const handleClockIn = async () => {
    setIsClockingIn(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const now = new Date().toISOString();

      const { error } = await supabase.from("attendance").upsert({
        user_id: user.id,
        date: today,
        clock_in: now,
        status: "present",
      }, {
        onConflict: "user_id,date"
      });

      if (error) throw error;

      toast.success("Clocked in successfully!");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to clock in");
    } finally {
      setIsClockingIn(false);
    }
  };

  const handleClockOut = async () => {
    setIsClockingIn(true);
    try {
      const now = new Date().toISOString();

      const { error } = await supabase
        .from("attendance")
        .update({ clock_out: now })
        .eq("id", todayAttendance.id);

      if (error) throw error;

      toast.success("Clocked out successfully!");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to clock out");
    } finally {
      setIsClockingIn(false);
    }
  };

  return (
    <DashboardLayout title="Employee Dashboard" subtitle={profile?.full_name}>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-[var(--shadow-elegant)] hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Current Salary</CardTitle>
              <DollarSign className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                ₦{Number(salary?.current_salary || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Base: ₦{Number(salary?.base_salary || 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-elegant)] hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Daily Rate</CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                ₦{Number(salary?.daily_rate || 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-elegant)] hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's Status</CardTitle>
              <Clock className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize text-foreground">
                {todayAttendance?.status || "Absent"}
              </div>
              {todayAttendance?.clock_in && (
                <p className="text-xs text-muted-foreground mt-1">
                  In: {new Date(todayAttendance.clock_in).toLocaleTimeString()}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-elegant)] hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Deductions</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                ₦{Number(salary?.total_deductions || 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-[var(--shadow-elegant)]">
          <CardHeader>
            <CardTitle>Attendance Clock</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Button
              onClick={handleClockIn}
              disabled={isClockingIn || todayAttendance?.clock_in}
              className="flex-1"
            >
              {todayAttendance?.clock_in ? "Already Clocked In" : "Clock In"}
            </Button>
            <Button
              onClick={handleClockOut}
              disabled={isClockingIn || !todayAttendance?.clock_in || todayAttendance?.clock_out}
              variant="outline"
              className="flex-1"
            >
              {todayAttendance?.clock_out ? "Already Clocked Out" : "Clock Out"}
            </Button>
          </CardContent>
        </Card>

        <AttendanceHistory userId={user.id} />
      </div>
    </DashboardLayout>
  );
};

export default EmployeeDashboard;
