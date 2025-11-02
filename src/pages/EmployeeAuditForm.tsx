import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Send } from "lucide-react";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  // Section 1
  name: z.string().min(1, "Name is required"),
  current_job_title: z.string().min(1, "Job title is required"),
  job_description_attached: z.boolean().default(false),
  department: z.string().optional(),
  manages_staff: z.boolean(),
  number_of_employees: z.number().min(0).optional(),
  grade: z.string().optional(),
  salary: z.number().min(0).optional(),
  other_financial_benefit: z.string().optional(),
  home_address: z.string().optional(),
  home_telephone: z.string().optional(),
  job_description: z.string().min(10, "Job description must be at least 10 characters"),
  // Section 7
  management_experience: z.string().optional(),
  people_supervised: z.string().optional(),
  // Section 9
  signature: z.string().min(1, "Signature is required"),
  declaration_date: z.string().min(1, "Date is required"),
});

type FormValues = z.infer<typeof formSchema>;

export default function EmployeeAuditForm() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Please log in to access this form");
        navigate("/auth");
        return;
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error("Auth check error:", error);
      toast.error("Authentication error. Please log in again.");
      navigate("/auth");
    }
  };

  // Dynamic sections state
  const [employmentHistory, setEmploymentHistory] = useState<any[]>([]);
  const [unpaidRoles, setUnpaidRoles] = useState<any[]>([]);
  const [education, setEducation] = useState<any[]>([]);
  const [training, setTraining] = useState<any[]>([]);
  const [professionalMembership, setProfessionalMembership] = useState<any[]>([]);
  const [skillsCompetency, setSkillsCompetency] = useState<any[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      manages_staff: false,
      job_description_attached: false,
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("You must be logged in to submit this form");
        navigate("/auth");
        return;
      }

      const formData = {
        user_id: user.id,
        name: data.name,
        current_job_title: data.current_job_title,
        job_description_attached: data.job_description_attached || false,
        department: data.department || null,
        manages_staff: data.manages_staff || false,
        number_of_employees: data.number_of_employees || null,
        grade: data.grade || null,
        salary: data.salary || null,
        other_financial_benefit: data.other_financial_benefit || null,
        home_address: data.home_address || null,
        home_telephone: data.home_telephone || null,
        job_description: data.job_description,
        declaration_date: new Date(data.declaration_date).toISOString(),
        management_experience: data.management_experience || null,
        people_supervised: data.people_supervised || null,
        signature: data.signature,
        employment_history: employmentHistory,
        unpaid_roles: unpaidRoles,
        education: education,
        training: training,
        professional_membership: professionalMembership,
        skills_competency: skillsCompetency,
        submitted_at: new Date().toISOString(),
        status: 'submitted',
      };

      console.log("Form Data (JSON):", JSON.stringify(formData, null, 2));

      const { error } = await supabase
        .from('employee_audits')
        .insert([formData] as any);

      if (error) throw error;

      toast.success("Employee Audit Form submitted successfully!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error submitting form:", error);
      toast.error("Failed to submit form: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper functions for dynamic arrays
  const addEmploymentHistory = () => {
    setEmploymentHistory([...employmentHistory, {
      date_from: "",
      date_to: "",
      employer_name: "",
      employer_address: "",
      nature_of_business: "",
      post_held: "",
      reason_for_leaving: "",
      salary_on_leaving: "",
    }]);
  };

  const removeEmploymentHistory = (index: number) => {
    setEmploymentHistory(employmentHistory.filter((_, i) => i !== index));
  };

  const updateEmploymentHistory = (index: number, field: string, value: any) => {
    const updated = [...employmentHistory];
    updated[index][field] = value;
    setEmploymentHistory(updated);
  };

  const addUnpaidRole = () => {
    setUnpaidRoles([...unpaidRoles, {
      date_from: "",
      date_to: "",
      institution: "",
      nature_of_service: "",
      role_duties: "",
    }]);
  };

  const removeUnpaidRole = (index: number) => {
    setUnpaidRoles(unpaidRoles.filter((_, i) => i !== index));
  };

  const updateUnpaidRole = (index: number, field: string, value: any) => {
    const updated = [...unpaidRoles];
    updated[index][field] = value;
    setUnpaidRoles(updated);
  };

  const addEducation = () => {
    setEducation([...education, {
      date_from: "",
      date_to: "",
      institution: "",
      qualifications: "",
      grade: "",
    }]);
  };

  const removeEducation = (index: number) => {
    setEducation(education.filter((_, i) => i !== index));
  };

  const updateEducation = (index: number, field: string, value: any) => {
    const updated = [...education];
    updated[index][field] = value;
    setEducation(updated);
  };

  const addTraining = () => {
    setTraining([...training, {
      institution: "",
      course_title: "",
      dates: "",
    }]);
  };

  const removeTraining = (index: number) => {
    setTraining(training.filter((_, i) => i !== index));
  };

  const updateTraining = (index: number, field: string, value: any) => {
    const updated = [...training];
    updated[index][field] = value;
    setTraining(updated);
  };

  const addProfessionalMembership = () => {
    setProfessionalMembership([...professionalMembership, {
      institution: "",
      membership_status: "",
      admission_date: "",
    }]);
  };

  const removeProfessionalMembership = (index: number) => {
    setProfessionalMembership(professionalMembership.filter((_, i) => i !== index));
  };

  const updateProfessionalMembership = (index: number, field: string, value: any) => {
    const updated = [...professionalMembership];
    updated[index][field] = value;
    setProfessionalMembership(updated);
  };

  const addSkill = () => {
    setSkillsCompetency([...skillsCompetency, {
      skill: "",
      rating: "",
    }]);
  };

  const removeSkill = (index: number) => {
    setSkillsCompetency(skillsCompetency.filter((_, i) => i !== index));
  };

  const updateSkill = (index: number, field: string, value: any) => {
    const updated = [...skillsCompetency];
    updated[index][field] = value;
    setSkillsCompetency(updated);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-8 px-4">
      <div className="container max-w-5xl mx-auto">
        <Card className="shadow-xl border-2">
          <CardHeader className="space-y-1 bg-gradient-to-r from-primary/10 to-primary/5 border-b">
            <CardTitle className="text-3xl font-bold">Employee Audit Form</CardTitle>
            <CardDescription>Please complete all sections thoroughly and accurately</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                
                {/* Section 1: Personal Information */}
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-xl">Section 1 — Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Full name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="current_job_title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Job Title *</FormLabel>
                            <FormControl>
                              <Input placeholder="Job title" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="job_description_attached"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Copy of current job description attached?
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="department"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Department</FormLabel>
                            <FormControl>
                              <Input placeholder="Department" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="grade"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Grade</FormLabel>
                            <FormControl>
                              <Input placeholder="Grade" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="manages_staff"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Do you manage other staff? *</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={(value) => field.onChange(value === "true")}
                              value={field.value ? "true" : "false"}
                              className="flex space-x-4"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="true" id="manages-yes" />
                                <Label htmlFor="manages-yes">Yes</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="false" id="manages-no" />
                                <Label htmlFor="manages-no">No</Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch("manages_staff") && (
                      <FormField
                        control={form.control}
                        name="number_of_employees"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>If Yes, how many employees?</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Number of employees"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="salary"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Salary</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Salary"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="other_financial_benefit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Other Financial Benefit</FormLabel>
                            <FormControl>
                              <Input placeholder="Other benefits" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="home_address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Home Address</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Home address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="home_telephone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Home Telephone / Mobile</FormLabel>
                          <FormControl>
                            <Input placeholder="Phone number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="job_description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job Description *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Detailed job description"
                              className="min-h-[150px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Section 2: Employment History */}
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-xl">Section 2 — Employment History</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {employmentHistory.map((entry, index) => (
                      <Card key={index} className="p-4 relative border-muted">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => removeEmploymentHistory(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <div className="space-y-3 pr-12">
                          <div className="grid md:grid-cols-2 gap-3">
                            <div>
                              <Label>Date From</Label>
                              <Input
                                type="date"
                                value={entry.date_from}
                                onChange={(e) => updateEmploymentHistory(index, "date_from", e.target.value)}
                              />
                            </div>
                            <div>
                              <Label>Date To</Label>
                              <Input
                                type="date"
                                value={entry.date_to}
                                onChange={(e) => updateEmploymentHistory(index, "date_to", e.target.value)}
                              />
                            </div>
                          </div>
                          <div>
                            <Label>Employer Name</Label>
                            <Input
                              value={entry.employer_name}
                              onChange={(e) => updateEmploymentHistory(index, "employer_name", e.target.value)}
                              placeholder="Employer name"
                            />
                          </div>
                          <div>
                            <Label>Employer Address</Label>
                            <Input
                              value={entry.employer_address}
                              onChange={(e) => updateEmploymentHistory(index, "employer_address", e.target.value)}
                              placeholder="Address"
                            />
                          </div>
                          <div>
                            <Label>Nature of Business</Label>
                            <Input
                              value={entry.nature_of_business}
                              onChange={(e) => updateEmploymentHistory(index, "nature_of_business", e.target.value)}
                              placeholder="Business type"
                            />
                          </div>
                          <div>
                            <Label>Post Held & Duties</Label>
                            <Textarea
                              value={entry.post_held}
                              onChange={(e) => updateEmploymentHistory(index, "post_held", e.target.value)}
                              placeholder="Position and duties"
                            />
                          </div>
                          <div className="grid md:grid-cols-2 gap-3">
                            <div>
                              <Label>Reason for Leaving</Label>
                              <Input
                                value={entry.reason_for_leaving}
                                onChange={(e) => updateEmploymentHistory(index, "reason_for_leaving", e.target.value)}
                                placeholder="Reason"
                              />
                            </div>
                            <div>
                              <Label>Salary on Leaving</Label>
                              <Input
                                value={entry.salary_on_leaving}
                                onChange={(e) => updateEmploymentHistory(index, "salary_on_leaving", e.target.value)}
                                placeholder="Salary"
                              />
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                    <Button type="button" onClick={addEmploymentHistory} variant="outline" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Employment History
                    </Button>
                  </CardContent>
                </Card>

                {/* Section 3: Unpaid/Honorary Roles */}
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-xl">Section 3 — Unpaid/Honorary Roles</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {unpaidRoles.map((entry, index) => (
                      <Card key={index} className="p-4 relative border-muted">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => removeUnpaidRole(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <div className="space-y-3 pr-12">
                          <div className="grid md:grid-cols-2 gap-3">
                            <div>
                              <Label>Date From</Label>
                              <Input
                                type="date"
                                value={entry.date_from}
                                onChange={(e) => updateUnpaidRole(index, "date_from", e.target.value)}
                              />
                            </div>
                            <div>
                              <Label>Date To</Label>
                              <Input
                                type="date"
                                value={entry.date_to}
                                onChange={(e) => updateUnpaidRole(index, "date_to", e.target.value)}
                              />
                            </div>
                          </div>
                          <div>
                            <Label>Institution / Organization Name</Label>
                            <Input
                              value={entry.institution}
                              onChange={(e) => updateUnpaidRole(index, "institution", e.target.value)}
                              placeholder="Organization"
                            />
                          </div>
                          <div>
                            <Label>Nature of Business/Service</Label>
                            <Input
                              value={entry.nature_of_service}
                              onChange={(e) => updateUnpaidRole(index, "nature_of_service", e.target.value)}
                              placeholder="Service type"
                            />
                          </div>
                          <div>
                            <Label>Role & Duties</Label>
                            <Textarea
                              value={entry.role_duties}
                              onChange={(e) => updateUnpaidRole(index, "role_duties", e.target.value)}
                              placeholder="Role description"
                            />
                          </div>
                        </div>
                      </Card>
                    ))}
                    <Button type="button" onClick={addUnpaidRole} variant="outline" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Unpaid Role
                    </Button>
                  </CardContent>
                </Card>

                {/* Section 4: Education */}
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-xl">Section 4 — Education</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {education.map((entry, index) => (
                      <Card key={index} className="p-4 relative border-muted">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => removeEducation(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <div className="space-y-3 pr-12">
                          <div className="grid md:grid-cols-2 gap-3">
                            <div>
                              <Label>Date From</Label>
                              <Input
                                type="date"
                                value={entry.date_from}
                                onChange={(e) => updateEducation(index, "date_from", e.target.value)}
                              />
                            </div>
                            <div>
                              <Label>Date To</Label>
                              <Input
                                type="date"
                                value={entry.date_to}
                                onChange={(e) => updateEducation(index, "date_to", e.target.value)}
                              />
                            </div>
                          </div>
                          <div>
                            <Label>Schools/Colleges Attended</Label>
                            <Input
                              value={entry.institution}
                              onChange={(e) => updateEducation(index, "institution", e.target.value)}
                              placeholder="Institution name"
                            />
                          </div>
                          <div>
                            <Label>Qualifications Gained or Pending</Label>
                            <Input
                              value={entry.qualifications}
                              onChange={(e) => updateEducation(index, "qualifications", e.target.value)}
                              placeholder="Qualifications"
                            />
                          </div>
                          <div>
                            <Label>Grade</Label>
                            <Input
                              value={entry.grade}
                              onChange={(e) => updateEducation(index, "grade", e.target.value)}
                              placeholder="Grade"
                            />
                          </div>
                        </div>
                      </Card>
                    ))}
                    <Button type="button" onClick={addEducation} variant="outline" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Education
                    </Button>
                  </CardContent>
                </Card>

                {/* Section 5: Training */}
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-xl">Section 5 — Training</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {training.map((entry, index) => (
                      <Card key={index} className="p-4 relative border-muted">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => removeTraining(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <div className="space-y-3 pr-12">
                          <div>
                            <Label>Name & Institution</Label>
                            <Input
                              value={entry.institution}
                              onChange={(e) => updateTraining(index, "institution", e.target.value)}
                              placeholder="Institution"
                            />
                          </div>
                          <div>
                            <Label>Course Title/Nature</Label>
                            <Input
                              value={entry.course_title}
                              onChange={(e) => updateTraining(index, "course_title", e.target.value)}
                              placeholder="Course name"
                            />
                          </div>
                          <div>
                            <Label>Dates</Label>
                            <Input
                              value={entry.dates}
                              onChange={(e) => updateTraining(index, "dates", e.target.value)}
                              placeholder="Training dates"
                            />
                          </div>
                        </div>
                      </Card>
                    ))}
                    <Button type="button" onClick={addTraining} variant="outline" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Training
                    </Button>
                  </CardContent>
                </Card>

                {/* Section 6: Professional Membership */}
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-xl">Section 6 — Professional Membership</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {professionalMembership.map((entry, index) => (
                      <Card key={index} className="p-4 relative border-muted">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => removeProfessionalMembership(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <div className="space-y-3 pr-12">
                          <div>
                            <Label>Institution Name</Label>
                            <Input
                              value={entry.institution}
                              onChange={(e) => updateProfessionalMembership(index, "institution", e.target.value)}
                              placeholder="Institution"
                            />
                          </div>
                          <div>
                            <Label>Membership Status / Grade</Label>
                            <Input
                              value={entry.membership_status}
                              onChange={(e) => updateProfessionalMembership(index, "membership_status", e.target.value)}
                              placeholder="Status"
                            />
                          </div>
                          <div>
                            <Label>Admission Date</Label>
                            <Input
                              type="date"
                              value={entry.admission_date}
                              onChange={(e) => updateProfessionalMembership(index, "admission_date", e.target.value)}
                            />
                          </div>
                        </div>
                      </Card>
                    ))}
                    <Button type="button" onClick={addProfessionalMembership} variant="outline" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Professional Membership
                    </Button>
                  </CardContent>
                </Card>

                {/* Section 7: Supervisory Management */}
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-xl">Section 7 — Supervisory Management</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="management_experience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Experience Managing People</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select experience level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="6-12 months">6–12 months</SelectItem>
                              <SelectItem value="1-5 years">1–5 years</SelectItem>
                              <SelectItem value="5+ years">5+ years</SelectItem>
                              <SelectItem value="None">None</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="people_supervised"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of People Supervised</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select range" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1-5">1–5</SelectItem>
                              <SelectItem value="5-15">5–15</SelectItem>
                              <SelectItem value="15-30">15–30</SelectItem>
                              <SelectItem value="30+">30+</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Section 8: Skills & Competency */}
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-xl">Section 8 — Skills & Competency</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {skillsCompetency.map((entry, index) => (
                      <Card key={index} className="p-4 relative border-muted">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => removeSkill(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <div className="space-y-3 pr-12">
                          <div>
                            <Label>Skill</Label>
                            <Input
                              value={entry.skill}
                              onChange={(e) => updateSkill(index, "skill", e.target.value)}
                              placeholder="Skill name"
                            />
                          </div>
                          <div>
                            <Label>Rating</Label>
                            <Select
                              value={entry.rating}
                              onValueChange={(value) => updateSkill(index, "rating", value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select rating" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Very good">Very good</SelectItem>
                                <SelectItem value="Good">Good</SelectItem>
                                <SelectItem value="Adequate">Adequate</SelectItem>
                                <SelectItem value="Little/No experience">Little/No experience</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </Card>
                    ))}
                    <Button type="button" onClick={addSkill} variant="outline" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Skill
                    </Button>
                  </CardContent>
                </Card>

                {/* Section 9: Declaration */}
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-xl">Section 9 — Declaration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="signature"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Signature *</FormLabel>
                          <FormControl>
                            <Input placeholder="Type your full name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="declaration_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <div className="flex justify-end space-x-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/dashboard")}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    <Send className="h-4 w-4 mr-2" />
                    {isSubmitting ? "Submitting..." : "Submit Audit Form"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}