import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import { format, differenceInDays, differenceInHours, differenceInMinutes } from "date-fns";

interface SuspendedViewProps {
  suspensionEndDate: string;
  strikeCount: number;
}

const SuspendedView = ({ suspensionEndDate, strikeCount }: SuspendedViewProps) => {
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const end = new Date(suspensionEndDate);
      
      const days = differenceInDays(end, now);
      const hours = differenceInHours(end, now) % 24;
      const minutes = differenceInMinutes(end, now) % 60;

      if (days > 0) {
        setCountdown(`${days} day${days > 1 ? 's' : ''}, ${hours} hour${hours > 1 ? 's' : ''}`);
      } else if (hours > 0) {
        setCountdown(`${hours} hour${hours > 1 ? 's' : ''}, ${minutes} minute${minutes > 1 ? 's' : ''}`);
      } else if (minutes > 0) {
        setCountdown(`${minutes} minute${minutes > 1 ? 's' : ''}`);
      } else {
        setCountdown("Suspension ending soon...");
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [suspensionEndDate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full shadow-[var(--shadow-elegant)]">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl">Account Suspended</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">
              Your account has been temporarily suspended due to policy violations.
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <Badge variant="destructive" className="text-lg py-2 px-4">
                Strike {strikeCount} of 3
              </Badge>
            </div>
          </div>

          <div className="bg-muted p-6 rounded-lg space-y-4">
            <div className="text-center">
              <h3 className="font-semibold text-lg mb-2">Suspension Ends In:</h3>
              <p className="text-3xl font-bold text-primary">{countdown}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {format(new Date(suspensionEndDate), "MMMM dd, yyyy 'at' h:mm a")}
              </p>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Strike System
            </h4>
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2">
                <Badge variant={strikeCount >= 1 ? "destructive" : "secondary"}>Strike 1</Badge>
                <span className="text-muted-foreground">1 week suspension + 30% salary deduction</span>
              </p>
              <p className="flex items-center gap-2">
                <Badge variant={strikeCount >= 2 ? "destructive" : "secondary"}>Strike 2</Badge>
                <span className="text-muted-foreground">1 month suspension + no pay</span>
              </p>
              <p className="flex items-center gap-2">
                <Badge variant={strikeCount >= 3 ? "destructive" : "secondary"}>Strike 3</Badge>
                <span className="text-muted-foreground">Employment termination</span>
              </p>
            </div>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>If you believe this suspension was made in error, please contact your HR department.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuspendedView;
