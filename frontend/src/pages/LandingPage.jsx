import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { AuthContext } from '../context/AuthContext';
import { CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react'; // FIXED: Added Eye icons

export default function LandingPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'ATTENDEE' });
    const [message, setMessage] = useState({ type: '', text: '' });
    const [needsVerification, setNeedsVerification] = useState(false);
    
    const [showPassword, setShowPassword] = useState(false); // NEW: State for password visibility
    
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });
        setNeedsVerification(false);

        try {
            if (isLogin) {
                const response = await api.post('/auth/login', {
                    email: formData.email,
                    password: formData.password,
                    requestedRole: formData.role
                });
                
                login(response.data.accessToken, response.data.refreshToken);
                
                if (formData.role === 'ORGANISER') {
                    navigate('/organiser-panel');
                } else {
                    navigate('/dashboard'); 
                }
                
            } else {
                const response = await api.post('/auth/register', {
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                    role: formData.role
                });
                
                setMessage({ type: 'success', text: response.data || 'Registration successful! Please check your email.' });
                setIsLogin(true); 
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.response?.data || 'An unexpected error occurred.';
            if (errorMsg.toLowerCase().includes('verify') || errorMsg.toLowerCase().includes('verified')) {
                setMessage({ type: 'error', text: 'Account not verified. Please verify your email before logging in.' });
                setNeedsVerification(true); 
            } else {
                setMessage({ type: 'error', text: errorMsg });
            }
        }
    };

    const handleResendToken = async () => {
        try {
            await api.post(`/auth/resend-verification?email=${formData.email}`);
            setMessage({ type: 'success', text: 'A new verification link has been sent to your email.' });
            setNeedsVerification(false);
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to resend link. Please try again later.' });
        }
    };

    const displayRole = formData.role.charAt(0).toUpperCase() + formData.role.slice(1).toLowerCase();

    return (
        <div className="min-h-screen flex bg-brand-dark text-slate-100 font-sans relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-brand-primary/20 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[10%] right-[5%] w-[40%] h-[40%] bg-purple-600/10 blur-[100px] rounded-full"></div>
            </div>

            <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 xl:px-24 z-10">
                 <div className="flex items-center gap-3 mb-12">
                    <div className="w-10 h-10 bg-brand-primary rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.5)] flex items-center justify-center">
                        <div className="w-4 h-4 bg-white rounded-sm"></div>
                    </div>
                    <span className="text-3xl font-extrabold tracking-widest text-white">EVENTIFY</span>
                </div>
                <h1 className="text-5xl xl:text-7xl font-extrabold leading-tight mb-6 tracking-tight text-white">
                    Transform Your <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-indigo-400 to-purple-500">
                        Event Experience
                    </span>
                </h1>
                <p className="text-lg text-slate-400 max-w-md leading-relaxed">
                    The next-generation platform for discovering premium events and managing seamless registrations.
                </p>
            </div>

            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 z-10">
                <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl p-8 rounded-3xl border border-slate-700/50 shadow-2xl relative">
                    
                    <h2 className="text-3xl font-extrabold mb-2 text-center text-white tracking-tight">
                        {isLogin ? `Welcome Back` : 'Create Account'}
                    </h2>
                    <p className="text-center text-slate-400 mb-8 text-sm">
                        {isLogin ? `Sign in to your ${displayRole} dashboard` : `Register as a new ${displayRole}`}
                    </p>

                    <div className="relative flex w-full bg-slate-800/80 rounded-xl p-1.5 mb-8 border border-slate-700/50 shadow-inner">
                        <div 
                            className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-brand-primary rounded-lg transition-transform duration-300 ease-[cubic-bezier(0.4,0.0,0.2,1)] shadow-md ${
                                formData.role === 'ORGANISER' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'
                            }`}
                        ></div>
                        <button 
                            type="button"
                            onClick={() => { setFormData({ ...formData, role: 'ATTENDEE' }); setMessage({type:'', text:''}); }}
                            className={`flex-1 py-2.5 z-10 text-center text-sm font-bold transition-colors rounded-lg ${
                                formData.role === 'ATTENDEE' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            Attendee
                        </button>
                        <button 
                            type="button"
                            onClick={() => { setFormData({ ...formData, role: 'ORGANISER' }); setMessage({type:'', text:''}); }}
                            className={`flex-1 py-2.5 z-10 text-center text-sm font-bold transition-colors rounded-lg ${
                                formData.role === 'ORGANISER' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            Organizer
                        </button>
                    </div>

                    {message.text && (
                        <div className={`p-4 rounded-xl mb-6 text-sm flex flex-col gap-3 border ${
                            message.type === 'error' ? 'bg-red-900/30 text-red-300 border-red-900/50' : 'bg-green-900/30 text-green-300 border-green-900/50'
                        }`}>
                            <div className="flex items-start gap-2">
                                {message.type === 'error' ? <AlertCircle size={18} className="shrink-0 mt-0.5" /> : <CheckCircle2 size={18} className="shrink-0 mt-0.5" />}
                                <span>{message.text}</span>
                            </div>
                            {needsVerification && (
                                <button onClick={handleResendToken} className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white py-2 px-4 rounded-lg w-full text-xs font-bold transition shadow-sm">
                                    Resend Verification Email
                                </button>
                            )}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {!isLogin && (
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                                <input type="text" required
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-3.5 text-white focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition"
                                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="John Doe"
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                            <input type="email" required
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-3.5 text-white focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition"
                                value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                placeholder="you@example.com"
                            />
                        </div>
                        
                        {/* NEW: Password Field with Eye Toggle */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Password</label>
                            <div className="relative">
                                <input type={showPassword ? "text" : "password"} required
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-3.5 pr-12 text-white focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition"
                                    value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="••••••••"
                                />
                                <button 
                                    type="button" 
                                    onClick={() => setShowPassword(!showPassword)} 
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition focus:outline-none"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="w-full bg-gradient-to-r from-brand-primary to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-brand-primary/25 mt-2">
                            {isLogin ? `Sign In as ${displayRole}` : `Create ${displayRole} Account`}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-700/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                        {isLogin ? (
                            <button onClick={() => navigate('/forgot-password')} className="text-sm text-slate-400 hover:text-white transition font-medium">
                                Forgot Password?
                            </button>
                        ) : <div className="hidden sm:block"></div>}

                        <div className="text-sm">
                            <span className="text-slate-400">{isLogin ? "Don't have an account? " : "Already have an account? "}</span>
                            <button 
                                onClick={() => { 
                                    setIsLogin(!isLogin); 
                                    setMessage({type:'', text:''}); 
                                    setNeedsVerification(false); 
                                    setShowPassword(false); // Reset toggle on switch
                                }} 
                                className="text-brand-primary hover:text-indigo-400 font-bold transition ml-1"
                            >
                                {isLogin ? 'Sign Up' : 'Sign In'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}