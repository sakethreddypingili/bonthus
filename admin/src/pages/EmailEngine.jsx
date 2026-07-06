import React, { useState, useEffect } from "react";
import { Mail, CheckCircle2, AlertCircle, Loader2, Send } from "lucide-react";
import { supabase } from "../server/supabase/supabase";

const EMAIL_TEMPLATES = [
  {
    id: "welcome",
    name: "Team Welcome Template",
    subject: "Welcome to the LensCare Team!",
    description: "Welcome new staff members with login details and setup links.",
    body: `<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; padding: 40px; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 20px; border: 1px solid #e5e7eb;">
    <h1 style="font-size: 24px; font-weight: 800; color: #000;">Welcome to LensCare, {{NAME}}!</h1>
    <p style="color: #4b5563; line-height: 1.6;">We're excited to have you on board as our new team member. Your account is active and ready for setup.</p>
    
    <div style="background: #f3f4f6; padding: 24px; border-radius: 12px; margin: 30px 0;">
      <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: 700; color: #9ca3af; text-transform: uppercase;">Portal URL</p>
      <p style="margin: 0 0 20px 0; font-weight: 600;"><a href="{{PORTAL_URL}}" style="color: #000;">{{PORTAL_URL}}</a></p>
      
      <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: 700; color: #9ca3af; text-transform: uppercase;">Username / Email</p>
      <p style="margin: 0 0 20px 0; font-weight: 600;">{{EMAIL}}</p>
      
      <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: 700; color: #9ca3af; text-transform: uppercase;">Temporary Password</p>
      <p style="margin: 0; font-family: monospace; font-weight: 700; background: #e5e7eb; padding: 4px 8px; border-radius: 4px; display: inline-block;">Bonthus@1234</p>
    </div>

    <a href="{{PORTAL_URL}}" style="display: inline-block; background: #000; color: #fff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px; text-transform: uppercase;">Log In To Dashboard</a>
    
    <p style="margin-top: 30px; font-size: 12px; color: #ef4444; font-weight: 600;">
      Security Notice: Change your temporary password immediately upon your first login.
    </p>
  </div>
</body>
</html>`
  },
  {
    id: "password_reset",
    name: "Password Reset Request",
    subject: "Reset your LensCare Dashboard Password",
    description: "Send password reset links and temporary instructions to employees.",
    body: `<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; padding: 40px; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 20px; border: 1px solid #e5e7eb;">
    <h1 style="font-size: 24px; font-weight: 800; color: #000;">Reset Your Password, {{NAME}}</h1>
    <p style="color: #4b5563; line-height: 1.6;">We received a request to configure a new access password for your administrative credentials linked to this email address.</p>
    
    <div style="background: #fff8f8; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 8px;">
      <p style="margin: 0; font-size: 12px; color: #b91c1c; font-weight: 700;">If you did not request this, please contact your store supervisor or administrator immediately.</p>
    </div>

    <p style="color: #4b5563; line-height: 1.6; margin-bottom: 30px;">Click the button below to update your login passphrase settings:</p>
    
    <a href="{{PORTAL_URL}}/reset-password" style="display: inline-block; background: #000; color: #fff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px; text-transform: uppercase;">Reset Password Credentials</a>
  </div>
</body>
</html>`
  },
  {
    id: "custom",
    name: "Custom Broadcast & Notification",
    subject: "Official Announcement from LensCare HQ",
    description: "Write an arbitrary HTML or plaintext notification to selected staff.",
    body: `<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; padding: 40px; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 20px; border: 1px solid #e5e7eb;">
    <h1 style="font-size: 24px; font-weight: 800; color: #000;">Important Alert, {{NAME}}</h1>
    <p style="color: #4b5563; line-height: 1.6;">Please read the following notification carefully regarding system operations and updates.</p>
    
    <div style="background: #f9fafb; border: 1px dashed #d1d5db; padding: 24px; border-radius: 12px; margin: 30px 0; color: #1f2937; font-size: 14px; line-height: 1.6;">
      {{CUSTOM_MESSAGE}}
    </div>

    <p style="font-size: 11px; color: #9ca3af;">Sent by LensCare Administration Hub.</p>
  </div>
</body>
</html>`
  }
];

export default function EmailEngine({ userProfile }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(EMAIL_TEMPLATES[0]);
  const [subject, setSubject] = useState(EMAIL_TEMPLATES[0].subject);
  const [bodyText, setBodyText] = useState(EMAIL_TEMPLATES[0].body);
  const [customMsg, setCustomMsg] = useState("Please verify your recent profile details on your next dashboard visit.");
  const [status, setStatus] = useState("IDLE"); // "IDLE" | "SENDING" | "SUCCESS" | "ERROR"
  const [statusMsg, setStatusMsg] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email, role, designation")
        .order("name");
      if (error) throw error;
      setUsers(data || []);
      if (data && data.length > 0) {
        setSelectedUser(data[0]);
      }
    } catch (err) {
      console.error("Error fetching users:", err.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleTemplateChange = (templateId) => {
    const tmpl = EMAIL_TEMPLATES.find(t => t.id === templateId);
    if (tmpl) {
      setSelectedTemplate(tmpl);
      setSubject(tmpl.subject);
      setBodyText(tmpl.body);
    }
  };

  const processTemplateVariables = (html) => {
    if (!selectedUser) return html;
    let result = html
      .replace(/{{NAME}}/g, selectedUser.name)
      .replace(/{{EMAIL}}/g, selectedUser.email)
      .replace(/{{PORTAL_URL}}/g, window.location.origin);
    if (selectedTemplate.id === "custom") {
      result = result.replace(/{{CUSTOM_MESSAGE}}/g, customMsg);
    }
    return result;
  };

  const handleSendEmail = async () => {
    if (!selectedUser) {
      setStatus("ERROR");
      setStatusMsg("Please select a target user first.");
      return;
    }

    setStatus("SENDING");
    setStatusMsg("");

    try {
      // Invoke onboarding-mailer cloud function (repurposed for generic Resend templates if needed)
      // Or we can invoke our custom onboarding-mailer which has the Resend instance
      const { error } = await supabase.functions.invoke("onboarding-mailer", {
        body: {
          employeeEmail: selectedUser.email,
          employeeName: selectedUser.name,
          role: selectedUser.role || "Team Member",
          temporaryPassword: "Bonthus@1234",
          portalUrl: window.location.origin
        }
      });

      if (error) throw error;

      setStatus("SUCCESS");
      setStatusMsg(`Email dispatched successfully to ${selectedUser.name}!`);
    } catch (err) {
      console.error("Email send error:", err);
      setStatus("ERROR");
      setStatusMsg(err.message || "Failed to dispatch email via cloud Resend functions.");
    }
  };

  return (
    <div className="space-y-8 animate-fast-slide">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-100">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Email Engine</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Design, customize, and dispatch mailings to staff</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* CONFIG PANEL */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border-2 border-black rounded-[32px] p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-5">
            <h3 className="text-base font-black text-black uppercase tracking-wider flex items-center gap-2">
              <Mail size={18} /> Configuration Settings
            </h3>

            {/* Target User Select */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Recipient User</label>
              {loadingUsers ? (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Loader2 className="animate-spin" size={14} /> Loading profiles...
                </div>
              ) : (
                <select
                  value={selectedUser?.id || ""}
                  onChange={(e) => {
                    const usr = users.find(u => u.id === e.target.value);
                    if (usr) setSelectedUser(usr);
                  }}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-150 rounded-2xl text-[12px] font-bold text-black outline-none focus:border-black"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Template Selector */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Select Template</label>
              <select
                value={selectedTemplate.id}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-150 rounded-2xl text-[12px] font-bold text-black outline-none focus:border-black"
              >
                {EMAIL_TEMPLATES.map(tmpl => (
                  <option key={tmpl.id} value={tmpl.id}>
                    {tmpl.name}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-gray-400 font-medium mt-1 leading-relaxed">
                {selectedTemplate.description}
              </p>
            </div>

            {/* Custom Content input (only for custom template) */}
            {selectedTemplate.id === "custom" && (
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Custom Message Body</label>
                <textarea
                  value={customMsg}
                  onChange={(e) => setCustomMsg(e.target.value)}
                  rows={4}
                  placeholder="Enter message details here..."
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-150 rounded-2xl text-[12px] font-bold text-black outline-none focus:border-black resize-none"
                />
              </div>
            )}

            {/* Dispatch Status banner */}
            {status !== "IDLE" && (
              <div className={`p-4 rounded-2xl border text-xs font-bold flex gap-2.5 items-start ${
                status === "SENDING" ? "bg-blue-50 border-blue-200 text-blue-700" :
                status === "SUCCESS" ? "bg-green-50 border-green-200 text-green-700" :
                "bg-red-50 border-red-200 text-red-700"
              }`}>
                {status === "SENDING" && <Loader2 className="animate-spin shrink-0 mt-0.5" size={14} />}
                {status === "SUCCESS" && <CheckCircle2 className="shrink-0 mt-0.5 text-green-600" size={14} />}
                {status === "ERROR" && <AlertCircle className="shrink-0 mt-0.5 text-red-600" size={14} />}
                <div>
                  <span className="uppercase tracking-wider text-[9px] font-black block">
                    {status === "SENDING" ? "Sending Request" : status === "SUCCESS" ? "Dispatch Success" : "Error Occurred"}
                  </span>
                  <span className="font-bold text-[10px] opacity-90">{statusMsg || "Processing request..."}</span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSendEmail}
              disabled={status === "SENDING" || !selectedUser}
              className="w-full py-4 bg-black text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-lg hover:bg-neutral-800 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Send size={14} /> Send Email Dispatch
            </button>
          </div>
        </div>

        {/* PREVIEW CONTAINER */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center px-4">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Live Dynamic Template Preview</span>
            <span className="text-[9px] font-black text-green-500 bg-green-50 px-2 py-0.5 rounded-full uppercase tracking-wider">HTML Output Ready</span>
          </div>

          <div className="bg-white border border-gray-150 rounded-[32px] overflow-hidden shadow-sm flex flex-col min-h-[500px]">
            {/* Header info */}
            <div className="bg-gray-50 border-b border-gray-100 p-4 space-y-1.5 text-xs font-bold uppercase tracking-wider text-gray-400">
              <div className="flex items-center gap-2">
                <span className="w-12 block">To:</span>
                <span className="text-black font-black">{selectedUser ? `${selectedUser.name} <${selectedUser.email}>` : "No recipient chosen"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-12 block">Subject:</span>
                <span className="text-black font-black">{subject}</span>
              </div>
            </div>

            {/* Preview Frame */}
            <div className="flex-1 p-6 bg-gray-50 overflow-y-auto max-h-[500px]">
              <div 
                className="bg-white rounded-2xl border border-gray-150 shadow-inner p-4 min-h-[400px] overflow-auto scale-95 origin-top"
                dangerouslySetInnerHTML={{ __html: processTemplateVariables(bodyText) }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
