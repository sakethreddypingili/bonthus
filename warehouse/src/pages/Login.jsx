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
                const { data: userData, error: userErr } = await supabase
                    .from('users')
                    .select('email')
                    .eq('phone', loginEmail)
                    .maybeSingle();

                if (userErr) throw userErr;
                if (!userData) throw new Error("This phone number is not registered.");
                loginEmail = userData.email;
            }

            // 2. Auth Attempt
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
        <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden animate-fast-slide">
                {/* Header */}
                <div className="px-10 py-12 flex flex-col items-center justify-center relative overflow-hidden text-center border-b border-gray-50">
                    <div className="mb-6 px-6 py-2 bg-black text-white rounded-full shadow-xl select-none">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] block leading-none">Warehouse Portal</span>
                    </div>

                    <div className="relative mb-6">
                        <img src={logoImg} alt="LensCare Logo" className="h-20 relative z-10" />
                    </div>
                    <h2 className="text-black text-3xl font-black tracking-tighter uppercase relative z-10">Access Hub</h2>
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-2 relative z-10">Authentication Required</p>
                </div>

                {/* Form */}
                <div className="p-10">
                    {error && (
                        <div className="mb-8 p-5 bg-black text-white text-[10px] uppercase tracking-widest font-black rounded-[20px] shadow-2xl text-center flex items-center justify-center gap-3 animate-fast-zoom">
                            <AlertCircle size={16} strokeWidth={3} className="shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleLogin} autoComplete="off" className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Operator Identity</label>
                            <div className="relative group">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-6 text-gray-300 group-focus-within:text-black transition-colors">
                                    <User size={18} strokeWidth={3} />
                                </span>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    name="user_id_field"
                                    autoComplete="off"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    onFocus={() => setShowSuggestions(true)}
                                    placeholder="EMAIL, PHONE, OR ID..."
                                    className="w-full pl-14 pr-6 py-5 bg-gray-50 border border-gray-100 rounded-3xl text-[12px] font-black tracking-widest focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white transition-all placeholder:text-gray-200"
                                    required
                                />

                                {showSuggestions && suggestions.length > 0 && (
                                    <div
                                        ref={dropdownRef}
                                        className="absolute top-full left-0 right-0 mt-3 bg-white border border-gray-100 rounded-[32px] shadow-2xl z-30 overflow-hidden divide-y divide-gray-50 animate-fast-zoom"
                                    >
                                        <div className="px-6 py-3 bg-gray-50 text-[9px] font-black uppercase tracking-widest text-gray-400 select-none border-b border-gray-100">
                                            Vault Cache
                                        </div>
                                        <div className="max-h-56 overflow-y-auto no-scrollbar">
                                            {suggestions.map((item, index) => (
                                                <button
                                                    key={index}
                                                    type="button"
                                                    onClick={() => selectSuggestion(item)}
                                                    className="w-full px-6 py-4 flex items-center gap-4 hover:bg-black hover:text-white transition-all text-left group"
                                                >
                                                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center group-hover:bg-white/10 shrink-0">
                                                        <User size={16} className="text-black group-hover:text-white" strokeWidth={3} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[11px] font-black uppercase tracking-tight truncate">{item.identifier}</p>
                                                        <p className="text-[9px] font-bold text-gray-400 group-hover:text-gray-300 leading-none mt-1 uppercase tracking-widest">
                                                            {item.password ? "Credentials Linked" : "No saved vector"}
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
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Security Vector</label>
                            <div className="relative group">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-6 text-gray-300 group-focus-within:text-black transition-colors">
                                    <Lock size={18} strokeWidth={3} />
                                </span>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="pass_key_field"
                                    autoComplete="off"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    style={{ WebkitTextSecurity: showPassword ? 'none' : 'disc' }}
                                    className="w-full pl-14 pr-14 py-5 bg-gray-50 border border-gray-100 rounded-3xl text-[12px] font-black tracking-widest focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white transition-all placeholder:text-gray-200"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 flex items-center pr-6 text-gray-300 hover:text-black transition-colors focus:outline-none"
                                >
                                    {showPassword ? <EyeOff size={18} strokeWidth={3} /> : <Eye size={18} strokeWidth={3} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-black text-white py-5 rounded-[24px] text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20 flex justify-center items-center h-[72px] mt-4"
                        >
                            {loading ? (
                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : "Commit Authorization"}
                        </button>
                    </form>

                    <div className="mt-10 text-center">
                        <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] leading-relaxed">
                            Security Identity verified. Encrypted connection active.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
