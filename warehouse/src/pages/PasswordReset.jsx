import { useState } from"react";
import { supabase } from"../server/supabase/supabase";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ShieldCheck } from"lucide-react";

export default function PasswordReset({ userProfile, onPasswordReset }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      // 1. Update password in Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({
        password: password
      });
      if (authError) throw authError;

      // 2. Clear the flag in the appropriate table
      if (userProfile.role === 'employee') {
        // For employees, update employees table using supabaseAdmin to bypass RLS
        const { supabaseAdmin } = await import("../server/supabase/supabaseAdmin");
        const { error: empError } = await supabaseAdmin
          .from("employees")
          .update({ must_reset_password: false })
          .eq("user_id", userProfile.id);
        if (empError) throw empError;
      } else {
        // For admins/managers, update auth_users table
        const { error: profileError } = await supabase
          .from("auth_users")
          .update({ must_reset_password: false })
          .eq("id", userProfile.id);
        if (profileError) throw profileError;
      }

      onPasswordReset();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[32px] shadow-2xl border border-gray-100 overflow-hidden animate-fast-slide">
        <div className="p-10">
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-20 h-20 bg-black text-white rounded-[24px] flex items-center justify-center mb-6 shadow-xl">
              <ShieldCheck size={40} strokeWidth={3} />
            </div>
            <h1 className="text-3xl font-black text-black tracking-tighter uppercase">Initialize Security</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2 px-4 leading-relaxed">
              Administrative protocol requires credential refresh.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">New Vector</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-black">
                  <Lock size={18} strokeWidth={3} />
                </div>
                <input
                  type={showPassword ?"text" :"password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-14 pr-12 text-[12px] font-black tracking-widest focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white"
                  placeholder="CREATE VECTOR..."
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-black"
                >
                  {showPassword ? <EyeOff size={18} strokeWidth={3} /> : <Eye size={18} strokeWidth={3} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Verify Vector</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-black">
                  <CheckCircle2 size={18} strokeWidth={3} />
                </div>
                <input
                  type={showPassword ?"text" :"password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-14 pr-12 text-[12px] font-black tracking-widest focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white"
                  placeholder="CONFIRM VECTOR..."
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest text-center shadow-lg">
                <AlertCircle size={14} className="inline-block mr-2 -mt-0.5" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-black text-white rounded-[24px] text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl hover:scale-[1.02] active:scale-[0.98]  disabled:opacity-20 mt-4"
            >
              {loading ?"Syncing..." :"Commit Credentials"}
            </button>
          </form>

          <p className="mt-10 text-center text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">
            Identity verified. End-to-end encrypted.
          </p>
        </div>
      </div>
    </div>
  );
}
