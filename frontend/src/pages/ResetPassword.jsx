import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axiosConfig';
import { CheckCircle2, AlertCircle, ShieldCheck, Eye, EyeOff } from 'lucide-react'; // FIXED

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token'); 
    
    const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' });
    const [status, setStatus] = useState({ type: '', text: '' });
    const [loading, setLoading] = useState(false);
    
    // NEW: Toggles for both fields
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (passwords.newPassword !== passwords.confirmPassword) {
            setStatus({ type: 'error', text: 'Passwords do not match.' });
            return;
        }
        if (passwords.newPassword.length < 8) {
            setStatus({ type: 'error', text: 'Password must be at least 8 characters long.' });
            return;
        }

        setLoading(true);
        setStatus({ type: '', text: '' });

        try {
            await api.post('/auth/reset-password', {
                token: token,
                newPassword: passwords.newPassword
            });
            
            setStatus({ type: 'success', text: 'Password successfully reset! Redirecting to login...' });
            setTimeout(() => navigate('/'), 2500);
        } catch (error) {
            setStatus({ type: 'error', text: error.response?.data?.message || 'Invalid or expired token.' });
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-brand-dark text-slate-100 p-4">
                <div className="bg-red-900/30 border border-red-900/50 p-6 rounded-2xl text-center max-w-md">
                    <AlertCircle className="mx-auto text-red-400 mb-4" size={48} />
                    <h2 className="text-xl font-bold mb-2">Missing Reset Token</h2>
                    <p className="text-slate-400 text-sm mb-6">You must click the exact link provided in your password reset email.</p>
                    <button onClick={() => navigate('/')} className="text-brand-primary hover:text-white transition font-bold">Return to Login</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-brand-dark text-slate-100 p-4 relative overflow-hidden">
            <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl p-8 rounded-3xl border border-slate-700/50 shadow-2xl z-10">
                
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-slate-800 rounded-2xl border border-slate-600 flex items-center justify-center mb-6 shadow-inner">
                        <ShieldCheck size={32} className="text-green-400" />
                    </div>
                    <h2 className="text-2xl font-extrabold tracking-tight text-white mb-2">Create New Password</h2>
                    <p className="text-slate-400 text-sm text-center">Your new password must be at least 8 characters.</p>
                </div>

                {status.text && (
                    <div className={`p-4 rounded-xl mb-6 text-sm flex items-start gap-3 border ${status.type === 'error' ? 'bg-red-900/30 text-red-300 border-red-900/50' : 'bg-green-900/30 text-green-300 border-green-900/50'}`}>
                        {status.type === 'error' ? <AlertCircle size={18} className="shrink-0 mt-0.5" /> : <CheckCircle2 size={18} className="shrink-0 mt-0.5" />}
                        <span>{status.text}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* NEW: New Password Field with Eye Toggle */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">New Password</label>
                        <div className="relative">
                            <input type={showNewPassword ? "text" : "password"} required
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-3.5 pr-12 text-white focus:outline-none focus:border-brand-primary"
                                value={passwords.newPassword} onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })}
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowNewPassword(!showNewPassword)} 
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition focus:outline-none"
                            >
                                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    
                    {/* NEW: Confirm Password Field with Eye Toggle */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Confirm Password</label>
                        <div className="relative">
                            <input type={showConfirmPassword ? "text" : "password"} required
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-3.5 pr-12 text-white focus:outline-none focus:border-brand-primary"
                                value={passwords.confirmPassword} onChange={e => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition focus:outline-none"
                            >
                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" disabled={loading || status.type === 'success'}
                        className="w-full bg-brand-primary hover:bg-indigo-500 disabled:bg-slate-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg mt-2">
                        {loading ? 'Updating...' : 'Update Password'}
                    </button>
                </form>
            </div>
        </div>
    );
}