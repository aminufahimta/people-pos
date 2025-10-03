import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "./DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, TrendingDown } from "lucide-react";
import EmployeeList from "@/components/hr/EmployeeList";
import AttendanceOverview from "@/components/admin/AttendanceOverview";

interface HRManagerDashboardProps {
  user: User;
}

const HRManagerDashboard = ({ user }: HRManagerDashboardProps) => {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*");
    
    const today = new Date().toISOString().split("T")[0];
    const { data: present } = await supabase
      .from("attendance")
      .select("*")
      .eq("date", today)
      .eq("status", "present");

    const { data: absent } = await supabase
      .from("attendance")
      .select("*")
      .eq("date", today)
      .eq("status", "absent");

    setStats({
      totalEmployees: profiles?.length || 0,
      presentToday: present?.length || 0,
      absentToday: absent?.length || 0,
    });
  };

  return (
    <DashboardLayout title="HR Manager Dashboard" subtitle="Employee management & attendance">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="shadow-[var(--shadow-elegant)] hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.totalEmployees}</div>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-elegant)] hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Present Today</CardTitle>
              <Calendar className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.presentToday}</div>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-elegant)] hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Absent Today</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.absentToday}</div>
            </CardContent>
          </Card>
        </div>

        <EmployeeList />
        <AttendanceOverview />
      </div>
    </DashboardLayout>
  );
};

export default HRManagerDashboard;
