import { useState } from 'react';
import { supabase } from '../server/supabase/supabase';
const logoImg = '/assets/images/logo.webp';;

export default function Login() {
    const [identifier, setIdentifier] = useState(''); // Email or Phone
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            let loginEmail = identifier.trim();

            // 1. Phone number detection (Exactly 10 digits)
            if (/^\d{10}$/.test(loginEmail)) {
                const { data: resolvedEmail, error: rpcErr } = await supabase
                    .rpc('get_email_by_phone', { p_phone: loginEmail });
                
                if (rpcErr) throw rpcErr;
                if (!resolvedEmail) throw new Error("This phone number is not registered.");
                loginEmail = resolvedEmail;
            }
            // 2. Employee ID detection (6 digits)
            else if (/^\d{6}$/.test(loginEmail)) {
                const { data: resolvedEmail, error: rpcErr } = await supabase
                    .rpc('get_email_by_employee_id', { p_employee_id: loginEmail });
                
                if (rpcErr) throw rpcErr;
                if (!resolvedEmail) throw new Error("This employee ID is not registered.");
                loginEmail = resolvedEmail;
            }

            // 3. Auth Attempt
            const { error: authError } = await supabase.auth.signInWithPassword({
                email: loginEmail,
                password,
            });

            if (authError) throw authError;

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                {/* Header */}
                <div className="bg-[#000000] px-8 py-10 flex flex-col items-center justify-center relative overflow-hidden text-center">
                    <div className="relative mb-6">
                        <div className="absolute top-0 right-0 translate-x-1/4 -translate-y-1/2 px-2.5 py-0.5 bg-gray-500/30 border border-white/20 rounded-full backdrop-blur-sm z-20">
                            <span className="text-[9px] font-black text-white uppercase tracking-widest block leading-none">Admin</span>
                        </div>
                        <img src={logoImg} alt="LensCare Logo" className="h-20 relative z-10" />
                    </div>
                    <h2 className="text-white text-xl font-bold relative z-10">Admin Portal Access</h2>
                    <p className="text-white/70 text-sm mt-1 relative z-10">Sign in to manage your store</p>
                </div>

                {/* Form */}
                <div className="p-8">
                    {error && (
                        <div className="mb-6 p-4 bg-black text-white text-[10px] uppercase tracking-widest font-black rounded-2xl shadow-xl text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-[#000000] uppercase tracking-wider mb-2">Email, Phone, or Employee ID</label>
                            <input
                                type="text"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                placeholder="Email, 10-digit Phone, or 6-digit Employee ID"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#333333]/30 focus:border-[#333333] transition-all"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-[#000000] uppercase tracking-wider mb-2">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#333333]/30 focus:border-[#333333] transition-all"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#000000] text-white font-bold py-3 rounded-lg mt-2 hover:bg-[#000000]/90 transition-colors disabled:opacity-70 flex justify-center items-center h-[48px]"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                "Sign In"
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-xs text-gray-400">Secure access restricted to authorized personnel only.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
