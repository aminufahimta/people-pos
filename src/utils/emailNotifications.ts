import { supabase } from "@/integrations/supabase/client";

export interface EmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async (params: EmailParams) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: params,
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error('Failed to send email:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
};

// Email template helpers
export const emailTemplates = {
  accountApproval: (fullName: string, email: string) => ({
    subject: 'Your Account Has Been Approved',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Account Approved! 🎉</h2>
        <p>Hello ${fullName},</p>
        <p>Great news! Your account has been approved and you can now access the HR Management System.</p>
        <p><strong>Login Email:</strong> ${email}</p>
        <p>You can now login to access your dashboard and start using all features.</p>
        <p style="margin-top: 30px;">
          <a href="${window.location.origin}/auth" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Login Now
          </a>
        </p>
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          If you have any questions, please contact your HR department.
        </p>
      </div>
    `,
    text: `Hello ${fullName},\n\nYour account has been approved! You can now login to the HR Management System using your email: ${email}\n\nVisit: ${window.location.origin}/auth`
  }),

  taskAssignment: (employeeName: string, taskTitle: string, taskDescription: string, dueDate: string | null) => ({
    subject: 'New Task Assigned to You',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Task Assignment 📋</h2>
        <p>Hello ${employeeName},</p>
        <p>You have been assigned a new task:</p>
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1f2937;">${taskTitle}</h3>
          <p style="color: #4b5563;">${taskDescription || 'No description provided'}</p>
          ${dueDate ? `<p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>` : ''}
        </div>
        <p>Please login to your dashboard to view the full task details and update its status.</p>
        <p style="margin-top: 30px;">
          <a href="${window.location.origin}/dashboard" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Task
          </a>
        </p>
      </div>
    `,
    text: `Hello ${employeeName},\n\nYou have been assigned a new task:\n\nTask: ${taskTitle}\nDescription: ${taskDescription || 'No description'}\n${dueDate ? `Due Date: ${new Date(dueDate).toLocaleDateString()}` : ''}\n\nLogin to view details: ${window.location.origin}/dashboard`
  }),

  suspension: (employeeName: string, reason: string, startDate: string, endDate: string) => ({
    subject: 'Account Suspension Notice',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Account Suspension Notice</h2>
        <p>Hello ${employeeName},</p>
        <p>This is to inform you that your account has been suspended.</p>
        <div style="background-color: #fef2f2; padding: 16px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 20px 0;">
          <p><strong>Reason:</strong> ${reason}</p>
          <p><strong>Start Date:</strong> ${new Date(startDate).toLocaleDateString()}</p>
          <p><strong>End Date:</strong> ${new Date(endDate).toLocaleDateString()}</p>
        </div>
        <p>If you have any questions or concerns, please contact your HR department.</p>
      </div>
    `,
    text: `Hello ${employeeName},\n\nYour account has been suspended.\n\nReason: ${reason}\nStart Date: ${new Date(startDate).toLocaleDateString()}\nEnd Date: ${new Date(endDate).toLocaleDateString()}\n\nPlease contact HR if you have questions.`
  }),

  documentVerification: (employeeName: string, documentType: string, verified: boolean) => ({
    subject: verified ? 'Document Verified' : 'Document Verification Issue',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${verified ? '#16a34a' : '#ea580c'};">${verified ? 'Document Verified ✓' : 'Document Verification Issue'}</h2>
        <p>Hello ${employeeName},</p>
        <p>Your <strong>${documentType}</strong> has been ${verified ? 'verified' : 'flagged for review'}.</p>
        ${verified 
          ? '<p>Thank you for submitting your documents. Your verification is complete.</p>' 
          : '<p>Please contact HR for more information about the verification issue.</p>'
        }
        <p style="margin-top: 30px;">
          <a href="${window.location.origin}/dashboard" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Dashboard
          </a>
        </p>
      </div>
    `,
    text: `Hello ${employeeName},\n\nYour ${documentType} has been ${verified ? 'verified' : 'flagged for review'}.\n\n${verified ? 'Thank you for submitting your documents.' : 'Please contact HR for more information.'}`
  }),

  newEmployeeSignup: (adminName: string, employeeName: string, employeeEmail: string) => ({
    subject: 'New Employee Signup Pending Approval',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Employee Signup 👤</h2>
        <p>Hello ${adminName},</p>
        <p>A new employee has signed up and is pending approval:</p>
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Name:</strong> ${employeeName}</p>
          <p><strong>Email:</strong> ${employeeEmail}</p>
        </div>
        <p>Please review and approve this account in the admin dashboard.</p>
        <p style="margin-top: 30px;">
          <a href="${window.location.origin}/dashboard" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Review Signup
          </a>
        </p>
      </div>
    `,
    text: `Hello ${adminName},\n\nA new employee has signed up:\n\nName: ${employeeName}\nEmail: ${employeeEmail}\n\nPlease review in the admin dashboard: ${window.location.origin}/dashboard`
  })
};
