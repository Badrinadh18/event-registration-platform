import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axiosConfig';

export default function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const [status, setStatus] = useState('idle'); 

    const handleVerify = async () => {
        setStatus('loading');
        try {
            await api.get(`/auth/verify?token=${token}`);
            setStatus('success');
        } catch (error) {
            setStatus('error');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-brand-dark text-slate-100 p-4">
            <div className="w-full max-w-md bg-brand-card p-8 rounded-2xl border border-slate-700/50 shadow-2xl text-center">
                <div className={`w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center border-4 
                    ${status === 'success' ? 'bg-green-500/20 border-green-500 text-green-400' : 
                      status === 'error' ? 'bg-red-500/20 border-red-500 text-red-400' : 
                      'bg-brand-primary/20 border-brand-primary text-brand-primary'}`}>
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {status === 'success' ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /> :
                         status === 'error' ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /> :
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />}
                    </svg>
                </div>
                
                <h2 className="text-2xl font-bold mb-2">Account Verification</h2>
                <p className="text-slate-400 mb-8">
                    {status === 'idle' && "You're almost there! Click below to verify your email."}
                    {status === 'loading' && "Verifying your token securely..."}
                    {status === 'success' && "Your email has been verified successfully. You can now access your dashboard."}
                    {status === 'error' && "The verification link is invalid or has expired."}
                </p>
                
                {status === 'idle' && (
                    <button onClick={handleVerify} className="w-full bg-brand-primary hover:bg-indigo-500 text-white font-bold py-3 rounded transition">
                        Verify My Account
                    </button>
                )}
                
                {(status === 'success' || status === 'error') && (
                    <button onClick={() => navigate('/')} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded transition">
                        Go to Login
                    </button>
                )}
            </div>
        </div>
    );
}