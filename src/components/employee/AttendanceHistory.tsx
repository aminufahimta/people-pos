import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface AttendanceHistoryProps {
  userId: string;
}

const AttendanceHistory = ({ userId }: AttendanceHistoryProps) => {
  const [attendance, setAttendance] = useState<any[]>([]);

  useEffect(() => {
    fetchAttendance();
  }, [userId]);

  const fetchAttendance = async () => {
    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(30);

    setAttendance(data || []);
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
    <Card className="shadow-[var(--shadow-elegant)]">
      <CardHeader>
        <CardTitle className="text-base md:text-lg">Attendance History</CardTitle>
      </CardHeader>
      <CardContent className="px-2 md:px-6">
        <div className="overflow-x-auto -mx-2 md:mx-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs md:text-sm">Date</TableHead>
                <TableHead className="text-xs md:text-sm">Status</TableHead>
                <TableHead className="text-xs md:text-sm whitespace-nowrap">Time Marked</TableHead>
                <TableHead className="text-xs md:text-sm">Deduction</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No attendance records found
                  </TableCell>
                </TableRow>
              ) : (
                attendance.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="text-xs md:text-sm whitespace-nowrap">
                      {new Date(record.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs md:text-sm">{getStatusBadge(record.status)}</TableCell>
                    <TableCell className="text-xs md:text-sm whitespace-nowrap">
                      {record.created_at
                        ? new Date(record.created_at).toLocaleTimeString()
                        : "-"}
                    </TableCell>
                    <TableCell className="text-xs md:text-sm whitespace-nowrap">
                      {record.deduction_amount > 0
                        ? `₦${Number(record.deduction_amount).toLocaleString()}`
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default AttendanceHistory;
