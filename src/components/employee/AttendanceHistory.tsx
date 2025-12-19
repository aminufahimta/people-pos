import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface AttendanceHistoryProps {
  userId: string;
}

const ITEMS_PER_PAGE = 10;

const AttendanceHistory = ({ userId }: AttendanceHistoryProps) => {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchAttendance();
  }, [userId, currentPage]);

  const fetchAttendance = async () => {
    // Get total count first
    const { count } = await supabase
      .from("attendance")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    setTotalCount(count || 0);

    // Fetch paginated data
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .range(from, to);

    setAttendance(data || []);
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

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
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Page {currentPage} of {totalPages} ({totalCount} records)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Previous</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <span className="hidden sm:inline mr-1">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AttendanceHistory;
