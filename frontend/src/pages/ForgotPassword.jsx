import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { ArrowLeft, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState({ type: '', text: '' });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus({ type: '', text: '' });

        try {
            const response = await api.post(`/auth/forgot-password?email=${email}`);
            
            // FIXED: Now we give absolute confirmation since the backend verified the account
            setStatus({ type: 'success', text: 'A password reset link has been successfully sent to your email!' });
            setEmail('');
        } catch (error) {
            // This will perfectly catch the backend's "No account found" error message
            setStatus({ type: 'error', text: error.response?.data?.message || 'Failed to process request. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-brand-dark text-slate-100 p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
                <div className="absolute top-[10%] left-[20%] w-[40%] h-[40%] bg-brand-primary/20 blur-[100px] rounded-full"></div>
            </div>

            <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl p-8 rounded-3xl border border-slate-700/50 shadow-2xl z-10">
                
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-slate-800 rounded-2xl border border-slate-600 flex items-center justify-center mb-6 shadow-inner">
                        <KeyRound size={32} className="text-brand-primary" />
                    </div>
                    <h2 className="text-2xl font-extrabold tracking-tight text-white mb-2">Reset Password</h2>
                    <p className="text-slate-400 text-sm text-center">
                        Enter your email address and we'll send you a link to reset your password.
                    </p>
                </div>

                {status.text && (
                    <div className={`p-4 rounded-xl mb-6 text-sm flex items-start gap-3 border ${
                        status.type === 'error' ? 'bg-red-900/30 text-red-300 border-red-900/50' : 'bg-green-900/30 text-green-300 border-green-900/50'
                    }`}>
                        {status.type === 'error' ? <AlertCircle size={18} className="shrink-0 mt-0.5" /> : <CheckCircle2 size={18} className="shrink-0 mt-0.5" />}
                        <span>{status.text}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                        <input type="email" required
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-3.5 text-white focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition"
                            value={email} onChange={e => setEmail(e.target.value)}
                            placeholder="you@example.com"
                        />
                    </div>

                    <button type="submit" disabled={loading || status.type === 'success'}
                        className="w-full bg-brand-primary hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-400 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-brand-primary/25">
                        {loading ? 'Verifying...' : 'Verify & Send Link'}
                    </button>
                </form>
                
                <button onClick={() => navigate('/')} className="mt-8 flex items-center justify-center gap-2 w-full text-sm text-slate-400 hover:text-white transition font-medium">
                    <ArrowLeft size={16} /> Back to Login
                </button>
            </div>
        </div>
    );
}