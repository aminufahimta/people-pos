import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileText, Download, Eye, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BiodataSubmission {
  id: string;
  created_at: string;
  company_hired_to: string;
  candidate_name: string;
  phone_number: string;
  date_of_birth: string;
  gender: string;
  residential_address: string;
  nationality: string;
  state: string;
  marital_status: string;
  status: string;
  [key: string]: any;
}

export default function BiodataSubmissions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSubmission, setSelectedSubmission] = useState<BiodataSubmission | null>(null);
  const [notes, setNotes] = useState("");

  const { data: submissions, isLoading } = useQuery({
    queryKey: ["biodata-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("biodata_submissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as BiodataSubmission[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("biodata_submissions")
        .update({
          status,
          notes: notes || null,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["biodata-submissions"] });
      toast({
        title: "Status updated",
        description: "Submission status has been updated successfully",
      });
      setSelectedSubmission(null);
      setNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const downloadDocument = async (path: string, filename: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("biodata-documents")
        .download(path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const documentFields = [
    { key: "utility_bill_path", label: "Utility Bill" },
    { key: "education_certificate_path", label: "Education Certificate" },
    { key: "birth_certificate_path", label: "Birth Certificate" },
    { key: "passport_photo_path", label: "Passport Photo" },
    { key: "id_card_path", label: "ID Card" },
    { key: "cv_path", label: "CV" },
    { key: "first_guarantor_form_path", label: "1st Guarantor Form" },
    { key: "first_guarantor_id_path", label: "1st Guarantor ID" },
    { key: "second_guarantor_form_path", label: "2nd Guarantor Form" },
    { key: "second_guarantor_id_path", label: "2nd Guarantor ID" },
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Biodata Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Candidate Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions?.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell>
                      {new Date(submission.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{submission.candidate_name}</TableCell>
                    <TableCell>{submission.company_hired_to}</TableCell>
                    <TableCell>{submission.phone_number}</TableCell>
                    <TableCell>{getStatusBadge(submission.status)}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedSubmission(submission)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!submissions?.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No submissions yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Biodata Submission Details</DialogTitle>
            <DialogDescription>
              Review and manage employee biodata submission
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-6">
                {/* Personal Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Candidate Name</Label>
                    <p className="font-medium">{selectedSubmission.candidate_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Company</Label>
                    <p className="font-medium">{selectedSubmission.company_hired_to}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <p className="font-medium">{selectedSubmission.phone_number}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Date of Birth</Label>
                    <p className="font-medium">
                      {new Date(selectedSubmission.date_of_birth).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Gender</Label>
                    <p className="font-medium capitalize">{selectedSubmission.gender}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Marital Status</Label>
                    <p className="font-medium capitalize">{selectedSubmission.marital_status}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Residential Address</Label>
                    <p className="font-medium">{selectedSubmission.residential_address}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">State</Label>
                    <p className="font-medium">{selectedSubmission.state}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Nationality</Label>
                    <p className="font-medium">{selectedSubmission.nationality || "N/A"}</p>
                  </div>
                </div>

                {/* Documents */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-4">Documents</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {documentFields.map((field) => (
                      selectedSubmission[field.key] && (
                        <Button
                          key={field.key}
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            downloadDocument(
                              selectedSubmission[field.key],
                              `${field.label}.pdf`
                            )
                          }
                          className="justify-start"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          {field.label}
                        </Button>
                      )
                    ))}
                  </div>
                </div>

                {/* Review Notes */}
                <div className="border-t pt-4">
                  <Label htmlFor="notes">Review Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about this submission..."
                    className="mt-2"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 justify-end border-t pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      updateStatusMutation.mutate({
                        id: selectedSubmission.id,
                        status: "rejected",
                        notes,
                      });
                    }}
                    disabled={updateStatusMutation.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    onClick={() => {
                      updateStatusMutation.mutate({
                        id: selectedSubmission.id,
                        status: "approved",
                        notes,
                      });
                    }}
                    disabled={updateStatusMutation.isPending}
                  >
                    {updateStatusMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Approve
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}