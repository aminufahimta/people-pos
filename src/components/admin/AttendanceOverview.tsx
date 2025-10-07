import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const AttendanceOverview = () => {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [selectedRange, setSelectedRange] = useState("today");
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, total: 0 });

  useEffect(() => {
    fetchAttendance();
  }, [selectedRange]);

  const getDateRange = () => {
    const today = new Date();
    let startDate = new Date();

    switch (selectedRange) {
      case "week":
        startDate.setDate(today.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(today.getMonth() - 1);
        break;
      default:
        startDate = today;
    }

    return {
      start: startDate.toISOString().split("T")[0],
      end: today.toISOString().split("T")[0]
    };
  };

  const fetchAttendance = async () => {
    const { start, end } = getDateRange();
    
    let query = supabase
      .from("attendance")
      .select(`
        *,
        profiles (full_name, department)
      `)
      .order("date", { ascending: false })
      .order("clock_in", { ascending: false });

    if (selectedRange === "today") {
      query = query.eq("date", end);
    } else {
      query = query.gte("date", start).lte("date", end);
    }

    const { data } = await query;
    const records = data || [];
    setAttendance(records);

    // Calculate stats
    const present = records.filter(r => r.status === "present").length;
    const absent = records.filter(r => r.status === "absent").length;
    const late = records.filter(r => r.status === "late").length;
    setStats({ present, absent, late, total: records.length });
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
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Attendance Overview</CardTitle>
        <Select value={selectedRange} onValueChange={setSelectedRange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">Past Week</SelectItem>
            <SelectItem value="month">Past Month</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {selectedRange !== "today" && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Total Records</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-success">{stats.present}</div>
                <p className="text-xs text-muted-foreground">Present</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-warning">{stats.late}</div>
                <p className="text-xs text-muted-foreground">Late</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-destructive">{stats.absent}</div>
                <p className="text-xs text-muted-foreground">Absent</p>
              </CardContent>
            </Card>
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              {selectedRange !== "today" && <TableHead>Date</TableHead>}
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Clock In</TableHead>
              <TableHead>Clock Out</TableHead>
              <TableHead>Deduction</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attendance.length === 0 ? (
              <TableRow>
                <TableCell colSpan={selectedRange !== "today" ? 7 : 6} className="text-center text-muted-foreground">
                  No attendance records for this period
                </TableCell>
              </TableRow>
            ) : (
              attendance.map((record) => (
                <TableRow key={record.id}>
                  {selectedRange !== "today" && (
                    <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                  )}
                  <TableCell className="font-medium">
                    {record.profiles?.full_name || "Unknown"}
                  </TableCell>
                  <TableCell>{record.profiles?.department || "-"}</TableCell>
                  <TableCell>{getStatusBadge(record.status)}</TableCell>
                  <TableCell>
                    {record.clock_in
                      ? new Date(record.clock_in).toLocaleTimeString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {record.clock_out
                      ? new Date(record.clock_out).toLocaleTimeString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {record.deduction_amount > 0
                      ? `₦${Number(record.deduction_amount).toLocaleString()}`
                      : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default AttendanceOverview;
