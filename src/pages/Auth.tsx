import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import logo from "@/assets/logo.png";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [signupData, setSignupData] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    position: "",
    dateOfBirth: "",
  });
  const [documents, setDocuments] = useState({
    governmentId: null as File | null,
  });
  const [settings, setSettings] = useState({
    companyName: "HR Management System",
    loginTitle: "HR Management System",
    loginSubtitle: "Sign in to access your dashboard",
  });

  useEffect(() => {
    fetchSettings();
    
    // Show message if redirected from signup
    const message = searchParams.get("message");
    if (message === "pending_approval") {
      toast.info("Your account is pending approval. You'll be notified once approved.");
    }
  }, [searchParams]);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("system_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["company_name", "login_page_title", "login_page_subtitle"]);

    if (data) {
      const newSettings: any = {};
      data.forEach((setting) => {
        if (setting.setting_key === "company_name" && setting.setting_value) {
          newSettings.companyName = setting.setting_value;
        } else if (setting.setting_key === "login_page_title" && setting.setting_value) {
          newSettings.loginTitle = setting.setting_value;
        } else if (setting.setting_key === "login_page_subtitle" && setting.setting_value) {
          newSettings.loginSubtitle = setting.setting_value;
        }
      });
      setSettings((prev) => ({ ...prev, ...newSettings }));
    }
  };

  const handleFixEmail = async () => {
    setIsLoading(true);
    try {
      // First login with the old email to get access
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: "aminufahimta@gmail.com",
        password: "Mskid1m$",
      });

      if (loginError) {
        toast.error("Please login with aminufahimta@gmail.com first");
        return;
      }

      // Call the edge function to update auth email
      const { data, error } = await supabase.functions.invoke('update-auth-email', {
        body: {
          userId: '307168b0-3267-47ba-9f02-a1846a8c3760',
          newEmail: 'aminu@skypro.ng',
        },
      });

      if (error) throw error;

      toast.success("Email updated! Please login with aminu@skypro.ng");
      await supabase.auth.signOut();
      setFormData({ email: "aminu@skypro.ng", password: "" });
    } catch (error: any) {
      toast.error(error.message || "Failed to update email");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (documentType: keyof typeof documents, file: File | null) => {
    if (file && file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }
    setDocuments({ ...documents, [documentType]: file });
  };

  const uploadDocument = async (userId: string, file: File, documentType: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${documentType}-${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('employee-documents')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    // Save document metadata
    const { error: dbError } = await supabase
      .from('employee_documents')
      .insert({
        user_id: userId,
        document_type: documentType,
        file_path: fileName,
        file_name: file.name,
      });

    if (dbError) throw dbError;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate required documents
      if (!documents.governmentId) {
        toast.error("Please upload Government Issued ID Card");
        setIsLoading(false);
        return;
      }

      // Create user account
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: signupData.fullName,
          },
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("User creation failed");

      // Update profile with additional information
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          phone: signupData.phone,
          position: signupData.position,
          date_of_birth: signupData.dateOfBirth,
        })
        .eq('id', authData.user.id);

      if (profileError) throw profileError;

      // Upload documents
      await uploadDocument(authData.user.id, documents.governmentId, 'government_id');

      toast.success("Account created successfully! Please wait for admin approval.");
      // Sign out the user so they see the approval message
      await supabase.auth.signOut();
      // Switch to login tab
      navigate("/auth?message=pending_approval");
    } catch (error: any) {
      toast.error(error.message || "Signup failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-2xl shadow-[var(--shadow-elegant)]">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <img src={logo} alt="Logo" className="h-16 w-auto" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            {settings.loginTitle}
          </CardTitle>
          <CardDescription>{settings.loginSubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-fullname">Full Name *</Label>
                    <Input
                      id="signup-fullname"
                      type="text"
                      placeholder="John Doe"
                      value={signupData.fullName}
                      onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email *</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signupData.email}
                      onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Phone Number</Label>
                    <Input
                      id="signup-phone"
                      type="tel"
                      placeholder="+234 XXX XXX XXXX"
                      value={signupData.phone}
                      onChange={(e) => setSignupData({ ...signupData, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-position">Position *</Label>
                    <select
                      id="signup-position"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={signupData.position}
                      onChange={(e) => setSignupData({ ...signupData, position: e.target.value })}
                      required
                    >
                      <option value="">Select Position</option>
                      <option value="Software Engineer">Software Engineer</option>
                      <option value="Technical Support">Technical Support</option>
                      <option value="Field Technician">Field Technician</option>
                      <option value="Customer Service">Customer Service</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-dob">Date of Birth *</Label>
                    <Input
                      id="signup-dob"
                      type="date"
                      value={signupData.dateOfBirth}
                      onChange={(e) => setSignupData({ ...signupData, dateOfBirth: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="signup-password">Password *</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupData.password}
                      onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-semibold text-sm">Required Documents</h3>
                  <div className="space-y-2">
                    <Label htmlFor="government-id">Government Issued ID Card * (Max 5MB)</Label>
                    <Input
                      id="government-id"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileChange('governmentId', e.target.files?.[0] || null)}
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creating Account..." : "Sign Up"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  * Required fields. Your documents will be reviewed by HR.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
