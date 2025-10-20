import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Download, CheckCircle, XCircle, Eye } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Document {
  id: string;
  user_id: string;
  document_type: string;
  file_path: string;
  file_name: string;
  uploaded_at: string;
  verified: boolean;
  profile: {
    full_name: string;
    email: string;
    is_approved: boolean;
  };
}

const DocumentVerification = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    
    // Fetch documents
    const { data: docsData, error: docsError } = await supabase
      .from("employee_documents")
      .select("*")
      .order("uploaded_at", { ascending: false });

    if (docsError) {
      toast.error("Failed to load documents");
      console.error(docsError);
      setLoading(false);
      return;
    }

    // Fetch profiles
    const userIds = [...new Set(docsData.map(doc => doc.user_id))];
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, email, is_approved")
      .in("id", userIds);

    if (profilesError) {
      toast.error("Failed to load user profiles");
      console.error(profilesError);
      setLoading(false);
      return;
    }

    // Join documents with profiles
    const profilesMap = new Map(profilesData.map(p => [p.id, p]));
    const documentsWithProfiles = docsData.map(doc => ({
      ...doc,
      profile: profilesMap.get(doc.user_id) || { full_name: "Unknown", email: "Unknown", is_approved: false }
    }));

    setDocuments(documentsWithProfiles as any);
    setLoading(false);
  };

  const approveUser = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({
        is_approved: true,
        approved_by: (await supabase.auth.getUser()).data.user?.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      toast.error("Failed to approve user");
    } else {
      toast.success("User approved successfully");
      fetchDocuments();
    }
  };

  const verifyDocument = async (docId: string) => {
    const { error } = await supabase
      .from("employee_documents")
      .update({
        verified: true,
        verified_by: (await supabase.auth.getUser()).data.user?.id,
        verified_at: new Date().toISOString(),
      })
      .eq("id", docId);

    if (error) {
      toast.error("Failed to verify document");
    } else {
      toast.success("Document verified");
      fetchDocuments();
    }
  };

  const downloadDocument = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage
      .from("employee-documents")
      .download(filePath);

    if (error) {
      toast.error("Failed to download document");
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const viewDocument = async (filePath: string) => {
    const { data, error } = await supabase.storage
      .from("employee-documents")
      .createSignedUrl(filePath, 60);

    if (error) {
      toast.error("Failed to view document");
      return;
    }

    setViewUrl(data.signedUrl);
    setSelectedDoc(filePath);
  };

  const groupedByUser = documents.reduce((acc, doc) => {
    if (!acc[doc.user_id]) {
      acc[doc.user_id] = {
        profile: doc.profile,
        documents: [],
      };
    }
    acc[doc.user_id].documents.push(doc);
    return acc;
  }, {} as Record<string, { profile: any; documents: Document[] }>);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Document Verification
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading documents...</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedByUser).map(([userId, { profile, documents: userDocs }]) => (
                <Card key={userId} className="border-2">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{profile.full_name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{profile.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {profile.is_approved ? (
                          <Badge className="bg-success">Approved</Badge>
                        ) : (
                          <Button
                            onClick={() => approveUser(userId)}
                            size="sm"
                            className="bg-success hover:bg-success/90"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve User
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Document Type</TableHead>
                          <TableHead>File Name</TableHead>
                          <TableHead>Uploaded</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userDocs.map((doc) => (
                          <TableRow key={doc.id}>
                            <TableCell className="font-medium capitalize">
                              {doc.document_type.replace("_", " ")}
                            </TableCell>
                            <TableCell>{doc.file_name}</TableCell>
                            <TableCell>
                              {new Date(doc.uploaded_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {doc.verified ? (
                                <Badge variant="outline" className="bg-success/10 text-success border-success">
                                  Verified
                                </Badge>
                              ) : (
                                <Badge variant="outline">Pending</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => viewDocument(doc.file_path)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => downloadDocument(doc.file_path, doc.file_name)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                {!doc.verified && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => verifyDocument(doc.id)}
                                    className="text-success border-success hover:bg-success/10"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Document Preview</DialogTitle>
          </DialogHeader>
          {viewUrl && (
            <iframe
              src={viewUrl}
              className="w-full h-[70vh] border rounded"
              title="Document Preview"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DocumentVerification;
