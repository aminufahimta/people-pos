import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Eye, FileText } from "lucide-react";
import { format } from "date-fns";

export default function EmployeeAuditList() {
  const [audits, setAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAudit, setSelectedAudit] = useState<any>(null);

  useEffect(() => {
    fetchAudits();
  }, []);

  const fetchAudits = async () => {
    try {
      const { data, error } = await supabase
        .from('employee_audits')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAudits(data || []);
    } catch (error) {
      console.error("Error fetching audits:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      submitted: "default",
      reviewed: "outline",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  if (loading) {
    return <div className="text-center py-8">Loading audits...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Employee Audit Submissions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {audits.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No audit submissions yet
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Job Title</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Submitted Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audits.map((audit) => (
                <TableRow key={audit.id}>
                  <TableCell className="font-medium">{audit.name}</TableCell>
                  <TableCell>{audit.current_job_title}</TableCell>
                  <TableCell>{audit.department || "N/A"}</TableCell>
                  <TableCell>
                    {audit.submitted_at
                      ? format(new Date(audit.submitted_at), "MMM dd, yyyy")
                      : "Not submitted"}
                  </TableCell>
                  <TableCell>{getStatusBadge(audit.status)}</TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedAudit(audit)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh]">
                        <DialogHeader>
                          <DialogTitle>Employee Audit Details</DialogTitle>
                        </DialogHeader>
                        <ScrollArea className="h-[70vh] pr-4">
                          {selectedAudit && (
                            <div className="space-y-6">
                              {/* Personal Information */}
                              <div>
                                <h3 className="text-lg font-semibold mb-3">Personal Information</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="font-medium">Name:</span> {selectedAudit.name}
                                  </div>
                                  <div>
                                    <span className="font-medium">Job Title:</span>{" "}
                                    {selectedAudit.current_job_title}
                                  </div>
                                  <div>
                                    <span className="font-medium">Department:</span>{" "}
                                    {selectedAudit.department || "N/A"}
                                  </div>
                                  <div>
                                    <span className="font-medium">Grade:</span> {selectedAudit.grade || "N/A"}
                                  </div>
                                  <div>
                                    <span className="font-medium">Salary:</span> {selectedAudit.salary || "N/A"}
                                  </div>
                                  <div>
                                    <span className="font-medium">Phone:</span>{" "}
                                    {selectedAudit.home_telephone || "N/A"}
                                  </div>
                                  <div className="col-span-2">
                                    <span className="font-medium">Address:</span>{" "}
                                    {selectedAudit.home_address || "N/A"}
                                  </div>
                                  <div className="col-span-2">
                                    <span className="font-medium">Job Description:</span>
                                    <p className="mt-1 text-muted-foreground">
                                      {selectedAudit.job_description}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <Separator />

                              {/* Employment History */}
                              {selectedAudit.employment_history &&
                                selectedAudit.employment_history.length > 0 && (
                                  <>
                                    <div>
                                      <h3 className="text-lg font-semibold mb-3">Employment History</h3>
                                      <div className="space-y-3">
                                        {selectedAudit.employment_history.map((emp: any, idx: number) => (
                                          <Card key={idx} className="p-3">
                                            <div className="text-sm space-y-2">
                                              <div>
                                                <span className="font-medium">Period:</span> {emp.date_from} to{" "}
                                                {emp.date_to}
                                              </div>
                                              <div>
                                                <span className="font-medium">Employer:</span>{" "}
                                                {emp.employer_name}
                                              </div>
                                              <div>
                                                <span className="font-medium">Position:</span> {emp.post_held}
                                              </div>
                                            </div>
                                          </Card>
                                        ))}
                                      </div>
                                    </div>
                                    <Separator />
                                  </>
                                )}

                              {/* Education */}
                              {selectedAudit.education && selectedAudit.education.length > 0 && (
                                <>
                                  <div>
                                    <h3 className="text-lg font-semibold mb-3">Education</h3>
                                    <div className="space-y-3">
                                      {selectedAudit.education.map((edu: any, idx: number) => (
                                        <Card key={idx} className="p-3">
                                          <div className="text-sm space-y-2">
                                            <div>
                                              <span className="font-medium">Institution:</span> {edu.institution}
                                            </div>
                                            <div>
                                              <span className="font-medium">Qualifications:</span>{" "}
                                              {edu.qualifications}
                                            </div>
                                            <div>
                                              <span className="font-medium">Grade:</span> {edu.grade}
                                            </div>
                                          </div>
                                        </Card>
                                      ))}
                                    </div>
                                  </div>
                                  <Separator />
                                </>
                              )}

                              {/* Skills & Competency */}
                              {selectedAudit.skills_competency &&
                                selectedAudit.skills_competency.length > 0 && (
                                  <>
                                    <div>
                                      <h3 className="text-lg font-semibold mb-3">Skills & Competency</h3>
                                      <div className="grid grid-cols-2 gap-3">
                                        {selectedAudit.skills_competency.map((skill: any, idx: number) => (
                                          <div key={idx} className="flex justify-between items-center text-sm">
                                            <span>{skill.skill}</span>
                                            <Badge variant="outline">{skill.rating}</Badge>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                    <Separator />
                                  </>
                                )}

                              {/* Supervisory Management */}
                              <div>
                                <h3 className="text-lg font-semibold mb-3">Supervisory Management</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="font-medium">Experience:</span>{" "}
                                    {selectedAudit.management_experience || "N/A"}
                                  </div>
                                  <div>
                                    <span className="font-medium">People Supervised:</span>{" "}
                                    {selectedAudit.people_supervised || "N/A"}
                                  </div>
                                </div>
                              </div>

                              <Separator />

                              {/* Declaration */}
                              <div>
                                <h3 className="text-lg font-semibold mb-3">Declaration</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="font-medium">Signature:</span> {selectedAudit.signature}
                                  </div>
                                  <div>
                                    <span className="font-medium">Date:</span>{" "}
                                    {selectedAudit.declaration_date
                                      ? format(new Date(selectedAudit.declaration_date), "MMM dd, yyyy")
                                      : "N/A"}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}