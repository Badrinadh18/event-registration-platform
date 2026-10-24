import { useState } from 'react';
import api from '../api/axiosConfig';

export default function AdminPanel() {
    const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'ADMIN' });
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleAdminCreate = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });
        try {
            await api.post('/auth/register', formData);
            setMessage({ type: 'success', text: `Successfully created new ${formData.role} account.` });
            setFormData({ name: '', email: '', password: '', role: 'ADMIN' });
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to create user.' });
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Admin Control Panel</h1>
            
            <div className="bg-brand-card p-6 rounded-xl border border-slate-700/50">
                <h2 className="text-xl font-bold mb-4">Create System User</h2>
                <p className="text-sm text-slate-400 mb-6">As an Admin, you can provision new accounts with elevated privileges without email verification requirements.</p>
                
                {message.text && (
                    <div className={`p-4 rounded mb-6 text-sm ${message.type === 'error' ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleAdminCreate} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Full Name</label>
                            <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Email</label>
                            <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white" />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Password</label>
                            <input type="password" required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                                className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Role Assignment</label>
                            <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}
                                className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white font-bold text-brand-primary">
                                <option value="ADMIN">Administrator</option>
                                <option value="ORGANISER">Organiser</option>
                                <option value="ATTENDEE">Attendee</option>
                            </select>
                        </div>
                    </div>
                    
                    <button type="submit" className="bg-brand-primary hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded transition mt-4">
                        Provision Account
                    </button>
                </form>
            </div>
        </div>
    );
}