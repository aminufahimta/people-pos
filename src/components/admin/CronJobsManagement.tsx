import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Calendar, RefreshCw, Clock, Play } from "lucide-react";

const CronJobsManagement = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const cronJobs = [
    {
      id: "process-daily-attendance",
      name: "Daily Attendance Processing",
      description: "Automatically marks absent employees and applies salary deductions",
      schedule: "59 23 * * *",
      scheduleText: "Every day at 11:59 PM",
      status: "active",
      functionName: "process-daily-attendance"
    }
  ];

  const handleManualTrigger = async (functionName: string, jobName: string) => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke(functionName);
      
      if (error) throw error;

      if (data?.success) {
        toast.success(`${jobName} completed! ${data.absent} employees marked absent with deductions.`);
      } else {
        toast.error(`Failed to run ${jobName}`);
      }
    } catch (error) {
      console.error(`Error running ${jobName}:`, error);
      toast.error(`Failed to run ${jobName}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="shadow-[var(--shadow-elegant)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Scheduled Jobs (Cron)
        </CardTitle>
        <CardDescription>
          Manage automated tasks that run on a schedule
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {cronJobs.map((job) => (
            <div
              key={job.id}
              className="border border-border rounded-lg p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{job.name}</h4>
                    <Badge 
                      variant={job.status === "active" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {job.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {job.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{job.scheduleText}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <code className="bg-muted px-2 py-1 rounded text-xs">
                    {job.schedule}
                  </code>
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <Button
                  onClick={() => handleManualTrigger(job.functionName, job.name)}
                  disabled={isProcessing}
                  size="sm"
                  variant="outline"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-3 w-3" />
                      Run Now
                    </>
                  )}
                </Button>
              </div>

              <div className="bg-muted/50 p-3 rounded text-xs space-y-1">
                <p className="font-medium">How it works:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                  <li>Checks all employees for attendance records</li>
                  <li>Marks absent employees who didn't clock in</li>
                  <li>Applies salary deductions based on system settings</li>
                  <li>Creates attendance history records automatically</li>
                </ul>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CronJobsManagement;
