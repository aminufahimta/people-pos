import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Calendar, RefreshCw } from "lucide-react";

const AttendanceProcessing = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProcessAttendance = async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-daily-attendance');
      
      if (error) throw error;

      if (data?.success) {
        toast.success(`Attendance processed successfully! ${data.absent} employees marked absent with deductions.`);
      } else {
        toast.error("Failed to process attendance");
      }
    } catch (error) {
      console.error('Error processing attendance:', error);
      toast.error("Failed to process attendance");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="shadow-[var(--shadow-elegant)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Daily Attendance Processing
        </CardTitle>
        <CardDescription>
          Automatically runs daily at 11:59 PM. Use the button below to process manually if needed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h4 className="font-semibold text-sm">How it works:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Checks all employees for attendance records</li>
              <li>Marks absent employees who didn't clock in</li>
              <li>Applies salary deductions based on settings</li>
              <li>Creates attendance history records</li>
            </ul>
          </div>
          
          <Button 
            onClick={handleProcessAttendance} 
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Process Today's Attendance
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AttendanceProcessing;
