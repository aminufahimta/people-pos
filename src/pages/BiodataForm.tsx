import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, CheckCircle2 } from "lucide-react";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB for most files
const MAX_ID_SIZE = 100 * 1024 * 1024; // 100MB for ID card

const biodataSchema = z.object({
  company_hired_to: z.string().min(1, "Company name is required"),
  candidate_name: z.string().min(1, "Candidate name is required"),
  phone_number: z.string().min(10, "Valid phone number is required"),
  date_of_birth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["female", "male"]),
  residential_address: z.string().min(1, "Residential address is required"),
  nationality: z.string().optional(),
  state: z.string().min(1, "State is required"),
  marital_status: z.enum(["single", "married", "divorced"]),
  last_employer_name_address: z.string().min(1, "Last employer details are required"),
  last_employer_contact: z.string().min(1, "Last employer contact is required"),
  pension_pin: z.string().optional(),
  pension_provider_name: z.string().optional(),
  certification: z.string().optional(),
  next_of_kin_contact: z.string().min(1, "Next of kin contact is required"),
  next_of_kin_address: z.string().min(1, "Next of kin address is required"),
  first_previous_employer: z.string().min(1, "First previous employer details are required"),
  second_previous_employer: z.string().min(1, "Second previous employer details are required"),
});

type BiodataFormData = z.infer<typeof biodataSchema>;

export default function BiodataForm() {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [files, setFiles] = useState<Record<string, File>>({});

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<BiodataFormData>({
    resolver: zodResolver(biodataSchema),
  });

  const gender = watch("gender");
  const maritalStatus = watch("marital_status");

  const handleFileChange = (fieldName: string, file: File | null) => {
    if (file) {
      const maxSize = fieldName === "id_card_path" ? MAX_ID_SIZE : MAX_FILE_SIZE;
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: `Maximum file size is ${maxSize / (1024 * 1024)}MB`,
          variant: "destructive",
        });
        return;
      }
      setFiles((prev) => ({ ...prev, [fieldName]: file }));
    }
  };

  const uploadFile = async (file: File, fieldName: string): Promise<string | null> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${fieldName}/${fileName}`;

    const { error } = await supabase.storage
      .from("biodata-documents")
      .upload(filePath, file);

    if (error) {
      console.error("Upload error:", error);
      return null;
    }

    return filePath;
  };

  const onSubmit = async (data: BiodataFormData) => {
    setSubmitting(true);
    try {
      // Upload all files
      const uploadedPaths: Record<string, string | null> = {};
      
      for (const [fieldName, file] of Object.entries(files)) {
        const path = await uploadFile(file, fieldName);
        uploadedPaths[fieldName] = path;
      }

      // Insert biodata submission
      const { error: insertError } = await supabase
        .from("biodata_submissions")
        .insert([
          {
            company_hired_to: data.company_hired_to,
            candidate_name: data.candidate_name,
            phone_number: data.phone_number,
            date_of_birth: data.date_of_birth,
            gender: data.gender,
            residential_address: data.residential_address,
            nationality: data.nationality,
            state: data.state,
            marital_status: data.marital_status,
            last_employer_name_address: data.last_employer_name_address,
            last_employer_contact: data.last_employer_contact,
            pension_pin: data.pension_pin,
            pension_provider_name: data.pension_provider_name,
            certification: data.certification,
            next_of_kin_contact: data.next_of_kin_contact,
            next_of_kin_address: data.next_of_kin_address,
            first_previous_employer: data.first_previous_employer,
            second_previous_employer: data.second_previous_employer,
            utility_bill_path: uploadedPaths.utility_bill_path || null,
            education_certificate_path: uploadedPaths.education_certificate_path || null,
            birth_certificate_path: uploadedPaths.birth_certificate_path || null,
            passport_photo_path: uploadedPaths.passport_photo_path || null,
            id_card_path: uploadedPaths.id_card_path || null,
            cv_path: uploadedPaths.cv_path || null,
            first_guarantor_form_path: uploadedPaths.first_guarantor_form_path || null,
            first_guarantor_id_path: uploadedPaths.first_guarantor_id_path || null,
            second_guarantor_form_path: uploadedPaths.second_guarantor_form_path || null,
            second_guarantor_id_path: uploadedPaths.second_guarantor_id_path || null,
          },
        ]);

      if (insertError) throw insertError;

      setSubmitted(true);
      toast({
        title: "Success!",
        description: "Your biodata has been submitted successfully.",
      });
    } catch (error: any) {
      console.error("Submission error:", error);
      toast({
        title: "Submission failed",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle2 className="h-16 w-16 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold">Submission Complete!</h2>
            <p className="text-muted-foreground">
              Thank you for submitting your biodata. Our HR team will review your information and get back to you soon.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader className="bg-primary text-primary-foreground">
            <CardTitle className="text-2xl">Employee Biodata Form</CardTitle>
            <CardDescription className="text-primary-foreground/80">
              Fill all details and upload ALL Documents
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-6">
              You would need to have all your documents handy to begin, including your filled guarantors form.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="company_hired_to" className="required">
                    Company Name hired to *
                  </Label>
                  <Input
                    id="company_hired_to"
                    {...register("company_hired_to")}
                    className={errors.company_hired_to ? "border-destructive" : ""}
                  />
                  {errors.company_hired_to && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                      <span className="text-destructive">●</span> {errors.company_hired_to.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="candidate_name">Name of Candidate *</Label>
                  <Input id="candidate_name" {...register("candidate_name")} />
                  {errors.candidate_name && (
                    <p className="text-sm text-destructive mt-1">{errors.candidate_name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone_number">Phone Number *</Label>
                  <Input id="phone_number" {...register("phone_number")} />
                  {errors.phone_number && (
                    <p className="text-sm text-destructive mt-1">{errors.phone_number.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="date_of_birth">Date of Birth *</Label>
                  <Input id="date_of_birth" type="date" {...register("date_of_birth")} />
                  {errors.date_of_birth && (
                    <p className="text-sm text-destructive mt-1">{errors.date_of_birth.message}</p>
                  )}
                </div>

                <div>
                  <Label>Gender *</Label>
                  <RadioGroup value={gender} onValueChange={(value) => setValue("gender", value as "female" | "male")}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="female" id="female" />
                      <Label htmlFor="female">Female</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="male" id="male" />
                      <Label htmlFor="male">Male</Label>
                    </div>
                  </RadioGroup>
                  {errors.gender && (
                    <p className="text-sm text-destructive mt-1">{errors.gender.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="residential_address">Residential Address *</Label>
                  <Input id="residential_address" {...register("residential_address")} />
                  {errors.residential_address && (
                    <p className="text-sm text-destructive mt-1">{errors.residential_address.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="nationality">Nationality</Label>
                  <Input id="nationality" {...register("nationality")} />
                </div>

                <div>
                  <Label htmlFor="state">State *</Label>
                  <Input id="state" {...register("state")} />
                  {errors.state && (
                    <p className="text-sm text-destructive mt-1">{errors.state.message}</p>
                  )}
                </div>

                <div>
                  <Label>Marital Status *</Label>
                  <RadioGroup value={maritalStatus} onValueChange={(value) => setValue("marital_status", value as "single" | "married" | "divorced")}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="single" id="single" />
                      <Label htmlFor="single">Single</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="married" id="married" />
                      <Label htmlFor="married">Married</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="divorced" id="divorced" />
                      <Label htmlFor="divorced">Divorced/separated</Label>
                    </div>
                  </RadioGroup>
                  {errors.marital_status && (
                    <p className="text-sm text-destructive mt-1">{errors.marital_status.message}</p>
                  )}
                </div>
              </div>

              {/* Employment History */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-lg">Employment History</h3>
                
                <div>
                  <Label htmlFor="last_employer_name_address">Last Employer's Name and address *</Label>
                  <Input id="last_employer_name_address" {...register("last_employer_name_address")} />
                  {errors.last_employer_name_address && (
                    <p className="text-sm text-destructive mt-1">{errors.last_employer_name_address.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="last_employer_contact">Last Employers Email and phone number *</Label>
                  <Input id="last_employer_contact" {...register("last_employer_contact")} />
                  {errors.last_employer_contact && (
                    <p className="text-sm text-destructive mt-1">{errors.last_employer_contact.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="first_previous_employer">
                    Enter your first previous Employers details (Company name, address, company/managers phone number, email address) *
                  </Label>
                  <Input id="first_previous_employer" {...register("first_previous_employer")} />
                  {errors.first_previous_employer && (
                    <p className="text-sm text-destructive mt-1">{errors.first_previous_employer.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="second_previous_employer">
                    Enter your second previous Employers details (Company name, address, company/managers phone number, email address) *
                  </Label>
                  <Input id="second_previous_employer" {...register("second_previous_employer")} />
                  {errors.second_previous_employer && (
                    <p className="text-sm text-destructive mt-1">{errors.second_previous_employer.message}</p>
                  )}
                </div>
              </div>

              {/* Pension Details */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-lg">Pension Details</h3>
                
                <div>
                  <Label htmlFor="pension_pin">What is your Pension PIN?</Label>
                  <Input id="pension_pin" {...register("pension_pin")} />
                </div>

                <div>
                  <Label htmlFor="pension_provider_name">What is your pension provider's name?</Label>
                  <Input id="pension_provider_name" {...register("pension_provider_name")} />
                </div>
              </div>

              {/* Education */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-lg">Education</h3>
                
                <div>
                  <Label htmlFor="certification">Certification (Bsc, OND, Msc, WAEC)</Label>
                  <Input id="certification" {...register("certification")} />
                </div>
              </div>

              {/* Next of Kin */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-lg">Next of Kin</h3>
                
                <div>
                  <Label htmlFor="next_of_kin_contact">Next of Kin (Name, Email and Phone number) *</Label>
                  <Input id="next_of_kin_contact" {...register("next_of_kin_contact")} />
                  {errors.next_of_kin_contact && (
                    <p className="text-sm text-destructive mt-1">{errors.next_of_kin_contact.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="next_of_kin_address">Next of Kin (Full Address) *</Label>
                  <Input id="next_of_kin_address" {...register("next_of_kin_address")} />
                  {errors.next_of_kin_address && (
                    <p className="text-sm text-destructive mt-1">{errors.next_of_kin_address.message}</p>
                  )}
                </div>
              </div>

              {/* Document Uploads */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-lg">Document Uploads</h3>

                {[
                  { name: "utility_bill_path", label: "Upload your Utility bill (i.e NEPA or LAWMA, etc) *", maxSize: "10 MB" },
                  { name: "education_certificate_path", label: "Upload your Highest Educational Certificate *", maxSize: "100 MB" },
                  { name: "birth_certificate_path", label: "Upload your Birth Certificate", maxSize: "100 MB" },
                  { name: "passport_photo_path", label: "Upload your passport photograph *", maxSize: "10 MB" },
                  { name: "id_card_path", label: "Upload your valid ID card/NIN *", maxSize: "100 MB" },
                  { name: "cv_path", label: "Upload your CV *", maxSize: "10 MB" },
                  { name: "first_guarantor_form_path", label: "Upload 1st Guarantors Form *", maxSize: "10 MB" },
                  { name: "first_guarantor_id_path", label: "Upload 1st Guarantors ID *", maxSize: "10 MB" },
                  { name: "second_guarantor_form_path", label: "Upload 2nd Guarantors Form *", maxSize: "10 MB" },
                  { name: "second_guarantor_id_path", label: "Upload 2nd Guarantors ID *", maxSize: "10 MB" },
                ].map((field) => (
                  <div key={field.name}>
                    <Label htmlFor={field.name}>{field.label}</Label>
                    <div className="mt-2">
                      <Input
                        id={field.name}
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange(field.name, e.target.files?.[0] || null)}
                        className="cursor-pointer"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Upload 1 supported file: PDF, document, or image. Max {field.maxSize}.
                      </p>
                      {files[field.name] && (
                        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                          <Upload className="h-3 w-3" /> {files[field.name].name}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button type="submit" disabled={submitting} size="lg">
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Biodata
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}