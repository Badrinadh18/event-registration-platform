import { useState, useEffect } from 'react';
import api from '../api/axiosConfig';

export default function RegistrationModal({ isOpen, onClose, event, registrationType, onRegisterSuccess }) {
    const [status, setStatus] = useState({ type: '', text: '' });
    const [loading, setLoading] = useState(false);
    
    // Team Registration State
    const [memberEmails, setMemberEmails] = useState(['']);

    useEffect(() => {
        if (isOpen) {
            setStatus({ type: '', text: '' });
            setMemberEmails(['']);
        }
    }, [isOpen]);

    if (!isOpen || !event) return null;

    const handleAddMember = () => setMemberEmails([...memberEmails, '']);
    const handleMemberChange = (index, value) => {
        const newEmails = [...memberEmails];
        newEmails[index] = value;
        setMemberEmails(newEmails);
    };
    const handleRemoveMember = (index) => {
        setMemberEmails(memberEmails.filter((_, i) => i !== index));
    };

    const handleRegister = async () => {
        setLoading(true);
        setStatus({ type: '', text: '' });
        
        try {
            if (registrationType === 'SINGLE') {
                await api.post(`/events/${event.eventId}/register`);
            } else {
                // Formatting perfectly for Spring Boot's TeamRegisterRequest
                const validEmails = memberEmails.filter(email => email.trim() !== '');
                const payload = {
                    memberCount: validEmails.length + 1, // Includes the lead user
                    memberEmails: validEmails
                };
                await api.post(`/events/${event.eventId}/team-register`, payload);
            }
            
            setStatus({ type: 'success', text: 'Registration confirmed! Check your tickets dashboard.' });
            setTimeout(() => {
                onRegisterSuccess();
                onClose();
            }, 2000);
        } catch (error) {
            setStatus({ type: 'error', text: error.response?.data?.message || 'Failed to register for event.' });
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-brand-card w-full max-w-md rounded-2xl border border-slate-700/50 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                
                <h2 className="text-2xl font-bold mb-2">{registrationType === 'TEAM' ? 'Team Registration' : 'Event Registration'}</h2>
                <p className="text-slate-400 mb-6">Registering for <span className="text-white font-bold">{event.title}</span></p>
                
                {status.text && (
                    <div className={`p-3 rounded mb-6 text-sm ${status.type === 'error' ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'}`}>
                        {status.text}
                    </div>
                )}

                {registrationType === 'TEAM' && (
                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Team Member Emails</label>
                            {memberEmails.map((email, index) => (
                                <div key={index} className="flex gap-2 mb-2">
                                    <input type="email" required value={email} onChange={e => handleMemberChange(index, e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white" placeholder="member@example.com" />
                                    {index > 0 && (
                                        <button onClick={() => handleRemoveMember(index)} className="bg-red-900/50 text-red-400 px-3 rounded hover:bg-red-900/80">X</button>
                                    )}
                                </div>
                            ))}
                            <button onClick={handleAddMember} className="text-sm text-brand-primary hover:text-indigo-400 font-medium">+ Add Another Member</button>
                        </div>
                    </div>
                )}

                <div className="bg-slate-800 rounded p-4 mb-6">
                    <div className="flex justify-between mb-2"><span className="text-slate-400">Date:</span><span>{new Date(event.eventDate).toLocaleDateString()}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Price:</span><span className="font-bold text-brand-primary">${event.price || '0.00'}</span></div>
                </div>

                <button onClick={handleRegister} disabled={loading || status.type === 'success'} className="w-full bg-brand-primary hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-bold py-3 rounded transition">
                    {loading ? 'Processing...' : status.type === 'success' ? 'Success!' : 'Confirm Registration'}
                </button>
            </div>
        </div>
    );
}