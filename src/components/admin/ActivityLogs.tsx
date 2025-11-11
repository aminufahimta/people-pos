import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Activity, User, Calendar, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ActivityLog {
  id: string;
  user_id: string | null;
  action_type: string;
  table_name: string | null;
  record_id: string | null;
  description: string;
  metadata: any;
  created_at: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
}

export function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [userProfiles, setUserProfiles] = useState<Map<string, UserProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterTable, setFilterTable] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      // Fetch logs
      const { data: logsData, error: logsError } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (logsError) throw logsError;
      setLogs(logsData || []);

      // Fetch user profiles for logs that have user_id
      const userIds = [...new Set(logsData?.map(log => log.user_id).filter(Boolean) || [])];
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);

        if (!profilesError && profilesData) {
          const profilesMap = new Map(profilesData.map(p => [p.id, p]));
          setUserProfiles(profilesMap);
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load activity logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getActionBadgeColor = (action: string) => {
    const colorMap: Record<string, string> = {
      create: "bg-green-500 hover:bg-green-600",
      update: "bg-blue-500 hover:bg-blue-600",
      delete: "bg-red-500 hover:bg-red-600",
    };
    return colorMap[action] || "bg-gray-500 hover:bg-gray-600";
  };

  const getTableBadgeColor = (table: string | null) => {
    if (!table) return "bg-gray-500 hover:bg-gray-600";
    
    const colorMap: Record<string, string> = {
      profiles: "bg-purple-500 hover:bg-purple-600",
      tasks: "bg-orange-500 hover:bg-orange-600",
      attendance: "bg-cyan-500 hover:bg-cyan-600",
      suspensions: "bg-red-500 hover:bg-red-600",
      salary_info: "bg-green-500 hover:bg-green-600",
    };
    return colorMap[table] || "bg-gray-500 hover:bg-gray-600";
  };

  const filteredLogs = logs.filter((log) => {
    const userProfile = log.user_id ? userProfiles.get(log.user_id) : null;
    const matchesSearch = log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userProfile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userProfile?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = filterAction === "all" || log.action_type === filterAction;
    const matchesTable = filterTable === "all" || log.table_name === filterTable;
    
    return matchesSearch && matchesAction && matchesTable;
  });

  const uniqueActions = Array.from(new Set(logs.map(log => log.action_type)));
  const uniqueTables = Array.from(new Set(logs.map(log => log.table_name).filter(Boolean)));

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-5 w-5" />
        <h2 className="text-2xl font-bold">Activity Logs</h2>
      </div>
      <p className="text-muted-foreground">
        Complete audit trail of all system activities
      </p>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Action Type</label>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  {uniqueActions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action.charAt(0).toUpperCase() + action.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Table</label>
              <Select value={filterTable} onValueChange={setFilterTable}>
                <SelectTrigger>
                  <SelectValue placeholder="All tables" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tables</SelectItem>
                  {uniqueTables.map((table) => (
                    <SelectItem key={table} value={table || ""}>
                      {table}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Showing {filteredLogs.length} of {logs.length} logs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-3">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No activity logs found
                </div>
              ) : (
                filteredLogs.map((log) => {
                  const userProfile = log.user_id ? userProfiles.get(log.user_id) : null;
                  return (
                    <div
                      key={log.id}
                      className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={getActionBadgeColor(log.action_type)}>
                            {log.action_type}
                          </Badge>
                          {log.table_name && (
                            <Badge className={getTableBadgeColor(log.table_name)} variant="outline">
                              {log.table_name}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium">{log.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {userProfile && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span>{userProfile.full_name}</span>
                              <span className="text-muted-foreground/60">
                                ({userProfile.email})
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {format(new Date(log.created_at), "PPp")}
                            </span>
                          </div>
                        </div>
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              View metadata
                            </summary>
                            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
