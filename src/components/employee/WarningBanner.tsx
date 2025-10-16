import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface Warning {
  id: string;
  reason: string;
  suspension_end: string;
  created_at: string;
}

interface WarningBannerProps {
  userId: string;
}

const WarningBanner = ({ userId }: WarningBannerProps) => {
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [dismissedWarnings, setDismissedWarnings] = useState<string[]>([]);

  useEffect(() => {
    fetchActiveWarnings();
  }, [userId]);

  const fetchActiveWarnings = async () => {
    const { data, error } = await supabase
      .from("suspensions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .is("strike_number", null)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setWarnings(data);
    }
  };

  const handleDismiss = (warningId: string) => {
    setDismissedWarnings([...dismissedWarnings, warningId]);
  };

  const activeWarnings = warnings.filter(w => !dismissedWarnings.includes(w.id));

  if (activeWarnings.length === 0) return null;

  return (
    <div className="space-y-4 mb-6">
      {activeWarnings.map((warning) => (
        <Alert key={warning.id} variant="destructive" className="relative">
          <AlertTriangle className="h-5 w-5" />
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2 h-6 w-6 p-0"
            onClick={() => handleDismiss(warning.id)}
          >
            <X className="h-4 w-4" />
          </Button>
          <AlertTitle className="text-lg font-semibold">Official Warning</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-2">{warning.reason}</p>
            <p className="text-sm text-muted-foreground">
              Issued on: {format(new Date(warning.created_at), "MMMM dd, yyyy 'at' h:mm a")}
            </p>
            <p className="text-sm text-muted-foreground">
              Warning period ends: {format(new Date(warning.suspension_end), "MMMM dd, yyyy")}
            </p>
            <div className="mt-3 p-3 bg-background/50 rounded-md">
              <p className="text-sm font-medium">
                ⚠️ This is a formal warning. Further violations may result in:
              </p>
              <ul className="text-sm mt-2 space-y-1 ml-4 list-disc">
                <li>Strike 1: 1 week suspension + 30% salary deduction</li>
                <li>Strike 2: 1 month suspension with no pay</li>
                <li>Strike 3: Employment termination</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
};

export default WarningBanner;
