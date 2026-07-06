import React, { useState, useEffect } from "react";
import { Mail, CheckCircle2, AlertCircle, Loader2, Send, Edit3, Save } from "lucide-react";
import { supabase } from "../server/supabase/supabase";
import emailjs from "@emailjs/browser";

// Initial template definition
const INITIAL_TEMPLATES = [
  {
    id: "onboarding",
    name: "Employee Onboarding Template",
    subject: "Welcome to Bonthus - Onboarding & Next Steps",
    description: "Welcome new staff members with initial details, task tracking, and onboarding checklists.",
    body: `<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; padding: 40px; background-color: #f9fafb; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 24px; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <div style="text-align: center; margin-bottom: 30px;">
      <span style="font-size: 24px; font-weight: 900; letter-spacing: -0.05em; text-transform: uppercase;">Bonthus Onboarding</span>
    </div>
    
    <h1 style="font-size: 22px; font-weight: 900; color: #000; letter-spacing: -0.03em; margin-bottom: 10px;">Welcome to the Team, {{NAME}}!</h1>
    <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
      We are thrilled to welcome you as our new <strong>{{DESIGNATION}}</strong>. Your onboarding profile is prepared, and we are ready to help you hit the ground running.
    </p>
    
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 24px; border-radius: 16px; margin: 24px 0;">
      <h3 style="margin: 0 0 16px 0; font-size: 12px; font-weight: 800; color: #000; text-transform: uppercase; letter-spacing: 0.05em;">Your Onboarding Overview</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Employee ID:</td>
          <td style="padding: 6px 0; color: #0f172a; font-weight: 700; text-align: right;">{{EMPLOYEE_ID}}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Designation:</td>
          <td style="padding: 6px 0; color: #0f172a; font-weight: 700; text-align: right;">{{DESIGNATION}}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Role Domain:</td>
          <td style="padding: 6px 0; color: #0f172a; font-weight: 700; text-align: right; text-transform: uppercase;">{{ROLE}}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 32px 0;">
      <a href="{{PORTAL_URL}}" style="display: inline-block; background: #000; color: #fff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Get Started Now</a>
    </div>

    <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
      This is an official transmission from Bonthus Human Resources Department.
    </p>
  </div>
</body>
</html>`
  },
  {
    id: "portal_access",
    name: "Portal Access & Credentials Template",
    subject: "Your Bonthus Admin Portal Access Credentials",
    description: "Provide login URLs, user accounts, temporary passwords, and secure password-reset advice.",
    body: `<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; padding: 40px; background-color: #f9fafb; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 24px; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <h1 style="font-size: 22px; font-weight: 900; color: #000; letter-spacing: -0.03em; margin-bottom: 10px;">Portal Setup for {{NAME}}</h1>
    <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
      Your access account for the Bonthus administrative dashboard has been provisioned. Please find your access link and temporary password credentials below:
    </p>
    
    <div style="background: #f1f5f9; padding: 24px; border-radius: 16px; margin: 24px 0; font-family: sans-serif;">
      <p style="margin: 0 0 6px 0; font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Portal Link</p>
      <p style="margin: 0 0 16px 0; font-weight: 700; font-size: 13px;"><a href="{{PORTAL_URL}}" style="color: #000; text-decoration: underline;">{{PORTAL_URL}}</a></p>
      
      <p style="margin: 0 0 6px 0; font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Login Email / User</p>
      <p style="margin: 0 0 16px 0; font-weight: 700; font-size: 13px; color: #0f172a;">{{EMAIL}}</p>
      
      <p style="margin: 0 0 6px 0; font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Temporary Setup Password</p>
      <p style="margin: 0; font-family: monospace; font-weight: 800; font-size: 14px; background: #cbd5e1; padding: 6px 12px; border-radius: 6px; display: inline-block; color: #0f172a; letter-spacing: 0.05em;">Bonthus@1234</p>
    </div>

    <div style="text-align: center; margin: 32px 0;">
      <a href="{{PORTAL_URL}}" style="display: inline-block; background: #000; color: #fff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Access Dashboard Login</a>
    </div>

    <p style="font-size: 11px; color: #ef4444; font-weight: 700; line-height: 1.5; border-left: 3px solid #ef4444; padding-left: 12px; margin-top: 30px;">
      SECURITY ADVISORY: You will be prompted to replace this temporary password with a secure personal key upon first access.
    </p>
  </div>
</body>
</html>`
  },
  {
    id: "custom",
    name: "Custom Broadcast Notification",
    subject: "Official Announcement from Bonthus HQ",
    description: "Send standard notifications, broadcasts, and custom templates directly to users.",
    body: `<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; padding: 40px; background-color: #f9fafb; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 24px; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <h1 style="font-size: 22px; font-weight: 900; color: #000; letter-spacing: -0.03em; margin-bottom: 10px;">Important Alert, {{NAME}}</h1>
    <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
      Please read the following notification carefully regarding system operations and updates.
    </p>
    
    <div style="background: #f8fafc; border: 1px dashed #cbd5e1; padding: 24px; border-radius: 16px; margin: 30px 0; color: #1e293b; font-size: 14px; line-height: 1.6;">
      {{CUSTOM_MESSAGE}}
    </div>

    <p style="font-size: 11px; color: #94a3b8; text-align: center;">Sent by Bonthus Administration Hub.</p>
  </div>
</body>
</html>`
  }
];

export default function EmailEngine({ userProfile }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Custom templates loaded in state to allow editing
  const [templates, setTemplates] = useState(INITIAL_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState(INITIAL_TEMPLATES[0]);
  const [subject, setSubject] = useState(INITIAL_TEMPLATES[0].subject);
  const [bodyText, setBodyText] = useState(INITIAL_TEMPLATES[0].body);
  const [customMsg, setCustomMsg] = useState("Please verify your recent profile details on your next dashboard visit.");
  
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [status, setStatus] = useState("IDLE"); // "IDLE" | "SENDING" | "SUCCESS" | "ERROR"
  const [statusMsg, setStatusMsg] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Initialize EmailJS with Public Key
  useEffect(() => {
    emailjs.init("s2h3QwKBPEGXRBbby");
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
    const tmpl = templates.find(t => t.id === templateId);
    if (tmpl) {
      setSelectedTemplate(tmpl);
      setSubject(tmpl.subject);
      setBodyText(tmpl.body);
      setIsEditingTemplate(false);
    }
  };

  const saveCurrentTemplate = () => {
    const updated = templates.map(t => {
      if (t.id === selectedTemplate.id) {
        return { ...t, subject, body: bodyText };
      }
      return t;
    });
    setTemplates(updated);
    setIsEditingTemplate(false);
    setStatus("SUCCESS");
    setStatusMsg("Template changes saved successfully!");
    setTimeout(() => {
      setStatus("IDLE");
      setStatusMsg("");
    }, 2000);
  };

  const processTemplateVariables = (html) => {
    if (!selectedUser) return html;
    let result = html
      .replace(/{{NAME}}/g, selectedUser.name)
      .replace(/{{EMAIL}}/g, selectedUser.email)
      .replace(/{{PORTAL_URL}}/g, window.location.origin)
      .replace(/{{DESIGNATION}}/g, selectedUser.designation || "Executive Team Member")
      .replace(/{{ROLE}}/g, selectedUser.role || "sales")
      .replace(/{{EMPLOYEE_ID}}/g, selectedUser.id.substring(0, 8).toUpperCase());

    if (selectedTemplate.id === "custom") {
      result = result.replace(/{{CUSTOM_MESSAGE}}/g, customMsg);
    }
    return result;
  };

  const handleSendEmail = async () => {
    if (!selectedUser) {
      setStatus("ERROR");
      setStatusMsg("Please select a target recipient user.");
      return;
    }

    setStatus("SENDING");
    setStatusMsg("");

    try {
      const finalHtml = processTemplateVariables(bodyText);

      // EmailJS handles sending through the connected Gmail account
      // We pass Service ID: service_kbz9fog, Template ID: template_3c9lvcn
      const response = await emailjs.send(
        "service_kbz9fog",
        "template_3c9lvcn",
        {
          to_email: selectedUser.email,
          email: selectedUser.email,
          user_email: selectedUser.email,
          to_name: selectedUser.name,
          subject: subject,
          message_html: finalHtml
        }
      );

      if (response.status !== 200) {
        throw new Error(`EmailJS responded with error status: ${response.status}`);
      }

      setStatus("SUCCESS");
      setStatusMsg(`Email dispatched successfully to ${selectedUser.name}!`);
    } catch (err) {
      console.error("Email send error:", err);
      setStatus("ERROR");
      setStatusMsg(err.message || "Failed to dispatch email via EmailJS engine.");
    }
  };

  return (
    <div className="space-y-8 animate-fast-slide">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-100">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Email Engine</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Design, customize, and dispatch mailings to staff via EmailJS</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* CONFIG PANEL */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border-2 border-black rounded-[32px] p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-5">
            <h3 className="text-base font-black text-black uppercase tracking-wider flex items-center gap-2">
              <Mail size={18} /> Engine Controls
            </h3>

            {/* Recipient User */}
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

            {/* Select Template */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Select Template</label>
              <select
                value={selectedTemplate.id}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-150 rounded-2xl text-[12px] font-bold text-black outline-none focus:border-black"
              >
                {templates.map(tmpl => (
                  <option key={tmpl.id} value={tmpl.id}>
                    {tmpl.name}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-gray-400 font-medium mt-1 leading-relaxed">
                {selectedTemplate.description}
              </p>
            </div>

            {/* Subject Input */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Email Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-150 rounded-2xl text-[12px] font-bold text-black outline-none focus:border-black"
              />
            </div>

            {/* Custom Content input (only for custom template) */}
            {selectedTemplate.id === "custom" && (
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Custom Broadcast Body</label>
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

            {/* Send / Controls */}
            <div className="flex gap-3">
              <button
                onClick={handleSendEmail}
                disabled={status === "SENDING" || !selectedUser}
                className="w-full py-4 bg-black text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-lg hover:bg-neutral-800 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send size={14} /> Send Email
              </button>
            </div>
          </div>
        </div>

        {/* PREVIEW CONTAINER */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center px-4">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
              {isEditingTemplate ? "Edit Template HTML Mode" : "Live Dynamic Template Preview"}
            </span>
            <div className="flex gap-2">
              {isEditingTemplate ? (
                <button
                  onClick={saveCurrentTemplate}
                  className="text-[9px] font-black text-white bg-green-500 px-3 py-1.5 rounded-full uppercase tracking-wider flex items-center gap-1 hover:bg-green-600 transition-colors"
                >
                  <Save size={12} /> Save Changes
                </button>
              ) : (
                <button
                  onClick={() => setIsEditingTemplate(true)}
                  className="text-[9px] font-black text-white bg-black px-3 py-1.5 rounded-full uppercase tracking-wider flex items-center gap-1 hover:bg-neutral-800 transition-colors"
                >
                  <Edit3 size={12} /> Edit Template
                </button>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-150 rounded-[32px] overflow-hidden shadow-sm flex flex-col min-h-[550px]">
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

            {/* Template Body */}
            <div className="flex-1 p-6 bg-gray-50 overflow-y-auto max-h-[550px]">
              {isEditingTemplate ? (
                <textarea
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  className="w-full h-[400px] p-4 font-mono text-[11px] border-2 border-gray-200 rounded-2xl outline-none focus:border-black resize-none"
                />
              ) : (
                <div 
                  className="bg-white rounded-2xl border border-gray-150 shadow-inner p-4 min-h-[400px] overflow-auto scale-95 origin-top"
                  dangerouslySetInnerHTML={{ __html: processTemplateVariables(bodyText) }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
