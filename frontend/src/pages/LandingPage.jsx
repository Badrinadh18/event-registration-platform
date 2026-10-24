import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { AuthContext } from '../context/AuthContext';

export default function LandingPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'ATTENDEE' });
    const [message, setMessage] = useState({ type: '', text: '' });
    const [needsVerification, setNeedsVerification] = useState(false);
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
                    password: formData.password
                });
                login(response.data.accessToken, response.data.refreshToken);
                navigate('/dashboard'); 
            } else {
                await api.post('/auth/register', {
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                    role: formData.role
                });
                setMessage({ type: 'success', text: 'Registration successful! Please check your email to verify your account.' });
                setIsLogin(true); 
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'An unexpected error occurred.';
            if (errorMsg.toLowerCase().includes('verify') || errorMsg.toLowerCase().includes('verified')) {
                setMessage({ type: 'error', text: 'Account not verified. Please verify your email before logging in.' });
                setNeedsVerification(true); // Triggers the resend button UI
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

    return (
        <div className="min-h-screen flex bg-brand-dark text-slate-100">
            {/* Left Side: Hero (Keep your existing hero UI here) */}
            <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 xl:px-24">
                 <div className="flex items-center gap-2 mb-12">
                    <div className="w-8 h-8 bg-brand-primary rounded shadow-lg shadow-brand-primary/50"></div>
                    <span className="text-2xl font-bold tracking-wider">EVENTIFY</span>
                </div>
                <h1 className="text-5xl xl:text-6xl font-extrabold leading-tight mb-6">
                    Transform Your <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-accent">
                        Event Experience
                    </span>
                </h1>
            </div>

            {/* Right Side: Auth Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-brand-card/30">
                <div className="w-full max-w-md bg-brand-card p-8 rounded-2xl border border-slate-700/50 shadow-2xl">
                    <h2 className="text-3xl font-bold mb-6 text-center">
                        {isLogin ? 'Welcome Back' : 'Register'}
                    </h2>

                    {message.text && (
                        <div className={`p-4 rounded mb-6 text-sm flex flex-col gap-2 ${message.type === 'error' ? 'bg-red-900/50 text-red-200 border border-red-800' : 'bg-green-900/50 text-green-200 border border-green-800'}`}>
                            <span>{message.text}</span>
                            {needsVerification && (
                                <button onClick={handleResendToken} className="bg-red-800 hover:bg-red-700 text-white py-1 px-3 rounded w-fit text-xs font-bold transition">
                                    Resend Verification Link
                                </button>
                            )}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Full Name</label>
                                <input type="text" required
                                    className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white focus:outline-none focus:border-brand-primary"
                                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Email</label>
                            <input type="email" required
                                className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white focus:outline-none focus:border-brand-primary"
                                value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Password</label>
                            <input type="password" required
                                className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white focus:outline-none focus:border-brand-primary"
                                value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>
                        
                        {!isLogin && (
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Role</label>
                                <select 
                                    className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white focus:outline-none focus:border-brand-primary"
                                    value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="ATTENDEE">Attendee</option>
                                    <option value="ORGANISER">Organiser</option>
                                    {/* Admin is intentionally excluded here */}
                                </select>
                            </div>
                        )}

                        <button type="submit" className="w-full bg-brand-primary hover:bg-indigo-500 text-white font-bold py-3 rounded transition duration-200 mt-4">
                            {isLogin ? 'Sign In' : 'Register'}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-slate-400 text-sm">
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <button onClick={() => { setIsLogin(!isLogin); setMessage({type:'', text:''}); setNeedsVerification(false); }} className="text-brand-accent hover:text-purple-400 font-semibold transition">
                            {isLogin ? 'Sign Up' : 'Sign In'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}