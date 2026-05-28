import { useState, useEffect, useRef } from 'react';
import { supabase } from '../server/supabase/supabase';
import { Eye, EyeOff, Lock, User, AlertCircle } from 'lucide-react';
const logoImg = '/assets/images/logo.webp';

export default function Login() {
    const [identifier, setIdentifier] = useState(''); // Email or Phone
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Custom Autofill State
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);

    // Load saved logins from browser storage
    useEffect(() => {
        const loadLogins = () => {
            const saved = localStorage.getItem('bonthus_saved_logins');
            if (saved) {
                setSuggestions(JSON.parse(saved));
            } else {
                setSuggestions([]);
            }
        };
        loadLogins();
    }, []);

    // Close suggestions on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                dropdownRef.current && 
                !dropdownRef.current.contains(event.target) &&
                inputRef.current &&
                !inputRef.current.contains(event.target)
            ) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectSuggestion = (item) => {
        setIdentifier(item.identifier);
        if (item.password) {
            setPassword(item.password);
        }
        setShowSuggestions(false);
    };

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

            // Save credentials on success for custom autofill
            const saved = localStorage.getItem('bonthus_saved_logins');
            const currentSaved = saved ? JSON.parse(saved) : [];
            const exists = currentSaved.some(item => item.identifier === identifier);
            let updated;
            if (!exists) {
                updated = [...currentSaved, { identifier, password }].slice(-5);
            } else {
                updated = currentSaved.map(item => 
                    item.identifier === identifier ? { identifier, password } : item
                );
            }
            localStorage.setItem('bonthus_saved_logins', JSON.stringify(updated));

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#E2E8F0] bg-[radial-gradient(#64748b_1.5px,transparent_1.5px)] [background-size:24px_24px] flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl sm:rounded-[24px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-2 border-black overflow-hidden transition-all duration-300 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] sm:hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5">
                {/* Header */}
                <div className="bg-gradient-to-b from-gray-50 to-white px-6 py-8 sm:px-8 sm:py-10 flex flex-col items-center justify-center relative overflow-hidden text-center border-b-2 border-black">
                    {/* Decorative subtle dot grid inside header for premium depth */}
                    <div className="absolute inset-0 bg-[radial-gradient(#000000_1px,transparent_1px)] [background-size:16px_16px] opacity-[0.08] pointer-events-none" />

                    {/* Glassy Neo-Brutalist badge */}
                    <div className="mb-5 px-5 py-2 bg-white/80 border-2 border-black text-black rounded-full backdrop-blur-md shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] select-none">
                        <span className="text-[10px] font-black uppercase tracking-[0.25em] block leading-none">Admin</span>
                    </div>

                    <div className="relative mb-5">
                        <img src={logoImg} alt="LensCare Logo" className="h-16 sm:h-20 relative z-10" />
                    </div>
                    <h2 className="text-black text-xl sm:text-2xl font-black tracking-tight relative z-10">Admin Portal Access</h2>
                    <p className="text-black/60 text-xs sm:text-sm font-semibold mt-1.5 relative z-10">Sign in to manage your portal</p>
                </div>

                {/* Form */}
                <div className="p-6 sm:p-8">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border-2 border-black text-red-700 text-xs font-bold rounded-xl flex items-start gap-2.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-slideDown">
                            <AlertCircle size={18} className="shrink-0 text-red-600 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleLogin} autoComplete="off" className="space-y-6">
                        <div>
                            <label className="block text-xs font-black text-black uppercase tracking-wider mb-2">Email, Phone, or Employee ID</label>
                            <div className="relative group">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-black group-focus-within:scale-110 transition-transform duration-150">
                                    <User size={18} strokeWidth={2.5} />
                                </span>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    id="user_id_field"
                                    name="user_id_field"
                                    autoComplete="off"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    onFocus={() => setShowSuggestions(true)}
                                    placeholder="Email, 10-digit Phone, or 6-digit Employee ID"
                                    style={{ WebkitBoxShadow: '0 0 0 1000px white inset' }}
                                    className="w-full pl-11 pr-4 py-3.5 bg-white border-2 border-black rounded-xl text-sm font-semibold focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 placeholder:text-gray-400"
                                    required
                                />

                                {/* Custom Autofill Dropdown */}
                                {showSuggestions && suggestions.length > 0 && (
                                    <div 
                                        ref={dropdownRef}
                                        className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-black rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] z-30 overflow-hidden divide-y-2 divide-black animate-slideDown"
                                    >
                                        <div className="px-4 py-2 bg-gray-50 text-[10px] font-black uppercase tracking-wider text-black/50 select-none">
                                            Saved Accounts
                                        </div>
                                        <div className="max-h-48 overflow-y-auto">
                                            {suggestions.map((item, index) => (
                                                <button
                                                    key={index}
                                                    type="button"
                                                    onClick={() => selectSuggestion(item)}
                                                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-black hover:text-white transition-colors duration-150 text-left group"
                                                >
                                                    <User size={16} className="text-black group-hover:text-white shrink-0" />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-black leading-tight truncate max-w-[280px]">{item.identifier}</p>
                                                        <p className="text-[10px] font-bold text-black/40 group-hover:text-white/60 leading-none mt-1">
                                                            {item.password ? "••••••••" : "no saved password"}
                                                        </p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-black uppercase tracking-wider mb-2">Password</label>
                            <div className="relative group">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-black group-focus-within:scale-110 transition-transform duration-150">
                                    <Lock size={18} strokeWidth={2.5} />
                                </span>
                                <input
                                    type="text"
                                    id="pass_key_field"
                                    name="pass_key_field"
                                    autoComplete="off"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    style={{ 
                                        WebkitTextSecurity: showPassword ? 'none' : 'disc',
                                        WebkitBoxShadow: '0 0 0 1000px white inset'
                                    }}
                                    className="w-full pl-11 pr-12 py-3.5 bg-white border-2 border-black rounded-xl text-sm font-semibold focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 placeholder:text-gray-400"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-black hover:scale-110 transition-transform duration-150 focus:outline-none"
                                >
                                    {showPassword ? (
                                        <EyeOff size={18} strokeWidth={2.5} />
                                    ) : (
                                        <Eye size={18} strokeWidth={2.5} />
                                    )}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-black text-white font-black py-4 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-neutral-900 transition-all duration-150 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-70 flex justify-center items-center h-[52px]"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                "Sign In"
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-[11px] font-bold text-black/40 uppercase tracking-wider">Secure access restricted to authorized personnel only.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
