import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface AttendanceMarkingProps {
  userId: string;
}

const AttendanceMarking = ({ userId }: AttendanceMarkingProps) => {
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [isClockingIn, setIsClockingIn] = useState(false);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    const today = new Date().toISOString().split("T")[0];
    
    // Fetch today's attendance
    const { data: todayData } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", userId)
      .eq("date", today)
      .maybeSingle();

    // Fetch attendance history
    const { data: historyData } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(30);

    setTodayAttendance(todayData);
    setAttendance(historyData || []);
  };

  const handleMarkAttendance = async () => {
    setIsClockingIn(true);
    try {
      const today = new Date().toISOString().split("T")[0];

      const { error } = await supabase.from("attendance").upsert({
        user_id: userId,
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

  return (
    <div className="space-y-6">
      {/* Today's Status Card */}
      <div className="grid gap-4 md:grid-cols-2">
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
      </div>

      {/* Mark Attendance Button */}
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
              ? "Attendance Marked Today" 
              : "Mark Attendance"}
          </Button>
        </CardContent>
      </Card>

      {/* Attendance History */}
      <Card className="shadow-[var(--shadow-elegant)]">
        <CardHeader>
          <CardTitle>Attendance History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time Marked</TableHead>
                <TableHead>Deduction</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendance.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                  <TableCell>{getStatusBadge(record.status)}</TableCell>
                  <TableCell>
                    {record.created_at
                      ? new Date(record.created_at).toLocaleTimeString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {record.deduction_amount > 0
                      ? `₦${Number(record.deduction_amount).toLocaleString()}`
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceMarking;
