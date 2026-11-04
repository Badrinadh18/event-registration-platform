import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { AuthContext } from '../context/AuthContext';
import { ShieldAlert, Eye, EyeOff } from 'lucide-react';

export default function AdminLogin() {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [message, setMessage] = useState({ type: '', text: '' });
    const [showPassword, setShowPassword] = useState(false);
    
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        try {
            const response = await api.post('/auth/login', {
                email: formData.email,
                password: formData.password,
                requestedRole: 'ADMIN' 
            });
            
            login(response.data.accessToken, response.data.refreshToken);
            navigate('/admin/admin-panel'); 
            
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Unauthorized access.' });
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-brand-dark text-slate-100 p-4">
            <div className="w-full max-w-md bg-brand-card p-8 rounded-3xl border border-purple-900/50 shadow-[0_0_40px_rgba(88,28,135,0.3)] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 to-brand-primary"></div>
                
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-purple-900/30 rounded-2xl border border-purple-500/30 flex items-center justify-center mb-4 text-purple-400">
                        <ShieldAlert size={32} />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">Admin Portal</h2>
                    <p className="text-slate-400 text-sm mt-1">Authorized personnel only</p>
                </div>

                {message.text && (
                    <div className="p-4 rounded-xl mb-6 text-sm bg-red-900/30 text-red-300 border border-red-900/50 text-center">
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-slate-400 mb-1 font-medium">Administrator Email</label>
                        <input type="email" required
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                            value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm text-slate-400 mb-1 font-medium">Password</label>
                        <div className="relative">
                            <input type={showPassword ? "text" : "password"} required
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-3 pr-12 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                                value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
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
                    
                    <button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3.5 rounded-xl transition duration-200 mt-6 shadow-lg shadow-purple-900/50">
                        Authenticate
                    </button>
                </form>
                
                {/* NEW: Admin Footer Actions */}
                <div className="mt-8 pt-6 border-t border-purple-900/30 flex flex-col gap-4">
                    <button onClick={() => navigate('/forgot-password')} className="text-sm text-purple-400 hover:text-purple-300 transition font-medium text-center">
                        Forgot Password?
                    </button>
                    
                    <button onClick={() => navigate('/')} className="text-sm text-slate-500 hover:text-slate-300 transition text-center">
                        Return to Public Portal
                    </button>
                </div>

            </div>
        </div>
    );
}