import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Mail, Send, Loader2, History, Eye } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

const Emails = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Check authentication and get user role
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return null;
      }
      return session;
    },
  });

  const { data: userRole } = useQuery({
    queryKey: ["user-role", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session?.user?.id)
        .single();

      if (error) throw error;
      return data.role;
    },
  });

  // Fetch customers/projects
  const { data: customers, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch email history
  const { data: emailHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["email-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_history")
        .select("*, projects(customer_name)")
        .order("sent_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async (emailData: { 
      to: string; 
      subject: string; 
      html: string;
      message: string;
      projectId: string;
      customerName: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: { to: emailData.to, subject: emailData.subject, html: emailData.html },
      });

      if (error) throw error;

      // Log email to history
      const { error: historyError } = await supabase
        .from("email_history")
        .insert({
          sent_by: session?.user?.id,
          sent_to: emailData.to,
          subject: emailData.subject,
          message: emailData.message,
          project_id: emailData.projectId,
          customer_name: emailData.customerName,
        });

      if (historyError) {
        console.error("Failed to log email history:", historyError);
      }

      return data;
    },
    onSuccess: () => {
      toast({
        title: "Email sent successfully",
        description: "Your email has been sent to the customer.",
      });
      // Reset form
      setSelectedCustomerId("");
      setSubject("");
      setMessage("");
      // Refetch email history
      queryClient.invalidateQueries({ queryKey: ["email-history"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send email",
        description: error.message || "There was an error sending the email. Please check your SMTP settings.",
        variant: "destructive",
      });
    },
  });

  const handleSendEmail = () => {
    if (!selectedCustomerId || !subject || !message) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields before sending.",
        variant: "destructive",
      });
      return;
    }

    const selectedCustomer = customers?.find((c) => c.id === selectedCustomerId);
    if (!selectedCustomer?.customer_email) {
      toast({
        title: "No email found",
        description: "This customer doesn't have an email address.",
        variant: "destructive",
      });
      return;
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Project Update</h2>
        <p style="color: #666; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">This email was sent from your HR System regarding customer: ${selectedCustomer.customer_name}</p>
      </div>
    `;

    sendEmailMutation.mutate({
      to: selectedCustomer.customer_email,
      subject: subject,
      html: html,
      message: message,
      projectId: selectedCustomerId,
      customerName: selectedCustomer.customer_name,
    });
  };

  return (
    <DashboardLayout
      title="Send Email to Customer"
      subtitle="Communicate with your customers about project updates"
      userRole={userRole}
    >
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Compose Email</CardTitle>
            <CardDescription>
              Select a customer and compose your message. Make sure SMTP settings are configured in System Settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customer">Select Customer</Label>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger id="customer">
                  <SelectValue placeholder="Choose a customer..." />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingCustomers ? (
                    <SelectItem value="loading" disabled>Loading customers...</SelectItem>
                  ) : customers && customers.length > 0 ? (
                    customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.customer_name} ({customer.customer_email || "No email"})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No customers found</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Enter email subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Enter your message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={10}
                className="resize-none"
              />
            </div>

            <Button
              onClick={handleSendEmail}
              disabled={sendEmailMutation.isPending}
              className="w-full"
              size="lg"
            >
              {sendEmailMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Email
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Email History Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Email History
            </CardTitle>
            <CardDescription>
              View all emails sent to customers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingHistory ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : emailHistory && emailHistory.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead className="w-[80px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emailHistory.map((email) => (
                      <TableRow key={email.id}>
                        <TableCell className="font-medium">
                          {format(new Date(email.sent_at), "MMM d, yyyy h:mm a")}
                        </TableCell>
                        <TableCell>{email.customer_name || "N/A"}</TableCell>
                        <TableCell>{email.subject}</TableCell>
                        <TableCell className="text-muted-foreground">{email.sent_to}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedEmail(email);
                              setIsViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No emails sent yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Email View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Email Details</DialogTitle>
              <DialogDescription>
                Sent on {selectedEmail && format(new Date(selectedEmail.sent_at), "MMMM d, yyyy 'at' h:mm a")}
              </DialogDescription>
            </DialogHeader>
            {selectedEmail && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold text-muted-foreground">Customer</Label>
                  <p className="mt-1">{selectedEmail.customer_name || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-muted-foreground">Recipient</Label>
                  <p className="mt-1">{selectedEmail.sent_to}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-muted-foreground">Subject</Label>
                  <p className="mt-1">{selectedEmail.subject}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-muted-foreground">Message</Label>
                  <div className="mt-1 p-4 bg-muted/50 rounded-md whitespace-pre-wrap">
                    {selectedEmail.message}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Emails;
