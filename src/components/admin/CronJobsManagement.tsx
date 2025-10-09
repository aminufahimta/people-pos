import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Calendar, RefreshCw, Clock, Play, Link as LinkIcon, Save, Server, CheckCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

const CronJobsManagement = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [cronJobUrl, setCronJobUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastRunTime, setLastRunTime] = useState<string | null>(null);

  // Get dynamic endpoint URL from environment
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  const endpointUrl = `${supabaseUrl}/functions/v1/process-daily-attendance`;

  useEffect(() => {
    fetchCronJobUrl();
    fetchLastRunTime();
    
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchLastRunTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchLastRunTime = async () => {
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "cron_last_run")
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setLastRunTime(data.setting_value);
      }
    } catch (error) {
      console.error("Error fetching last run time:", error);
    }
  };

  const fetchCronJobUrl = async () => {
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "cron_job_url")
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setCronJobUrl(data.setting_value);
      }
    } catch (error) {
      console.error("Error fetching cron job URL:", error);
    }
  };

  const handleSaveCronJobUrl = async () => {
    if (!cronJobUrl.trim()) {
      toast.error("Please enter a valid URL");
      return;
    }

    try {
      // Basic URL validation
      new URL(cronJobUrl);
    } catch {
      toast.error("Please enter a valid URL format");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("system_settings")
        .upsert({
          setting_key: "cron_job_url",
          setting_value: cronJobUrl,
          description: "URL for manual cron job configuration"
        }, {
          onConflict: 'setting_key'
        });

      if (error) throw error;
      toast.success("Cron job URL saved successfully");
    } catch (error: any) {
      console.error("Error saving cron job URL:", error);
      toast.error("Failed to save cron job URL");
    } finally {
      setIsSaving(false);
    }
  };

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
        // Refresh last run time after manual trigger
        await fetchLastRunTime();
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

  const handleRecalculateDeductions = async () => {
    if (!confirm('This will recalculate ALL historical deductions based on the current settings. This action cannot be undone. Continue?')) {
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('recalculate-deductions');
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success(data.message || 'Successfully recalculated all deductions');
      } else {
        toast.error('Failed to recalculate deductions');
      }
    } catch (error: any) {
      console.error('Error recalculating deductions:', error);
      toast.error(error.message || 'Failed to recalculate deductions');
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
        <div className="space-y-6">
          {/* Cron Job Monitor */}
          {lastRunTime && (
            <div className="bg-success/10 border border-success/20 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-success">
                  Cron Job last ran on: {format(new Date(lastRunTime), "yyyy-MM-dd hh:mm:ss a")}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  External cron job is working properly
                </p>
              </div>
            </div>
          )}

          {/* Cron Job URL Configuration */}
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                Cron Job URL Configuration
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Add a URL to manually configure external cron job services (e.g., cron-job.org, EasyCron)
              </p>
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="cronJobUrl">Cron Job Service URL</Label>
                <Input
                  id="cronJobUrl"
                  value={cronJobUrl}
                  onChange={(e) => setCronJobUrl(e.target.value)}
                  placeholder="https://example.com/cron-job"
                  type="url"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the endpoint URL from your external cron service
                </p>
              </div>
              <Button
                onClick={handleSaveCronJobUrl}
                disabled={isSaving}
                size="sm"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-3 w-3" />
                    Save URL
                  </>
                )}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Existing Cron Jobs */}
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

              <div className="pt-2 border-t border-border space-y-2">
                <Button
                  onClick={() => handleManualTrigger(job.functionName, job.name)}
                  disabled={isProcessing}
                  size="sm"
                  variant="outline"
                  className="w-full"
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
                
                <Button
                  onClick={handleRecalculateDeductions}
                  disabled={isProcessing}
                  size="sm"
                  variant="destructive"
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                      Recalculating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-3 w-3" />
                      Recalculate All Historical Deductions
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

          <Separator />

          {/* External Hosting Endpoint Information */}
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Server className="h-4 w-4" />
                External Hosting Setup
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Use these endpoints if you host the software on external infrastructure
              </p>
            </div>
            
            <div className="border-l-4 border-primary/30 bg-muted/30 p-4 rounded-r space-y-3">
              <div className="space-y-2">
                <p className="text-xs font-medium text-primary">Endpoint URL</p>
                <code className="block bg-background p-2 rounded text-xs break-all">
                  {endpointUrl}
                </code>
              </div>
              
              <div className="space-y-2">
                <p className="text-xs font-medium text-primary">Authorization Header</p>
                <code className="block bg-background p-2 rounded text-xs break-all">
                  Bearer {supabaseAnonKey}
                </code>
              </div>

              <div className="bg-muted/50 p-3 rounded space-y-2">
                <p className="text-xs font-medium">Example cron configuration:</p>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground"># Run daily at 11:59 PM</p>
                  <code className="block bg-background p-2 rounded text-xs break-all">
                    59 23 * * * curl -X POST "{endpointUrl}" -H "Authorization: Bearer {supabaseAnonKey}"
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CronJobsManagement;
