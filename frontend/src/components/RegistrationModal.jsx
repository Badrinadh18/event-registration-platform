import { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { Users, User, X, Plus, CreditCard, CheckCircle2 } from 'lucide-react';

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

    const validEmails = memberEmails.filter(email => email.trim() !== '');
    const totalTickets = registrationType === 'TEAM' ? validEmails.length + 1 : 1;
    const totalPrice = (event.price || 0) * totalTickets;

    const handleRegister = async () => {
        setStatus({ type: '', text: '' });

        // Frontend validation matching your Spring Boot DTO constraints
        if (registrationType === 'TEAM' && validEmails.length < 1) {
            setStatus({ type: 'error', text: 'Team registration requires at least 1 additional member email.' });
            return;
        }

        setLoading(true);
        try {
            if (registrationType === 'SINGLE') {
                await api.post(`/events/${event.eventId}/register`);
            } else {
                const payload = {
                    memberCount: totalTickets, // Includes the lead user
                    memberEmails: validEmails
                };
                await api.post(`/events/${event.eventId}/team-register`, payload);
            }
            
            setStatus({ type: 'success', text: 'Registration confirmed! Redirecting to your tickets...' });
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-brand-dark w-full max-w-lg rounded-3xl border border-slate-700/50 shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col relative max-h-[90vh] overflow-hidden">
                
                {/* Header Graphic */}
                <div className="bg-gradient-to-r from-brand-primary to-purple-600 p-6 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-1 transition">
                        <X size={20} />
                    </button>
                    <div className="flex items-center gap-3 text-white mb-2">
                        {registrationType === 'TEAM' ? <Users size={28} /> : <User size={28} />}
                        <h2 className="text-2xl font-bold tracking-tight">Checkout</h2>
                    </div>
                    <p className="text-white/80 font-medium truncate">{event.title}</p>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {status.text && (
                        <div className={`p-4 rounded-xl mb-6 text-sm flex items-center gap-3 ${status.type === 'error' ? 'bg-red-900/30 text-red-300 border border-red-900/50' : 'bg-green-900/30 text-green-300 border border-green-900/50'}`}>
                            {status.type === 'success' && <CheckCircle2 size={18} className="text-green-400" />}
                            {status.text}
                        </div>
                    )}

                    {registrationType === 'TEAM' && (
                        <div className="space-y-4 mb-6">
                            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Invite Team Members</h3>
                            <p className="text-xs text-slate-500 mb-4">You are automatically included as the Team Lead. Add your team members below.</p>
                            
                            {memberEmails.map((email, index) => (
                                <div key={index} className="flex gap-2 group">
                                    <input type="email" required value={email} onChange={e => handleMemberChange(index, e.target.value)}
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-3 text-white focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition outline-none" 
                                        placeholder={`member${index + 1}@example.com`} 
                                    />
                                    {index > 0 && (
                                        <button onClick={() => handleRemoveMember(index)} className="bg-slate-800 text-slate-400 px-4 rounded-xl hover:bg-red-900/50 hover:text-red-400 transition">
                                            <X size={18} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button onClick={handleAddMember} className="flex items-center gap-2 text-sm text-brand-primary hover:text-indigo-400 font-bold transition p-2 hover:bg-brand-primary/10 rounded-lg">
                                <Plus size={16} /> Add Another Member
                            </button>
                        </div>
                    )}

                    {/* Order Summary */}
                    <div className="bg-slate-900/80 rounded-2xl p-5 border border-slate-700/50 mt-4">
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 border-b border-slate-700 pb-2">Order Summary</h3>
                        <div className="flex justify-between items-center mb-3 text-slate-300">
                            <span>Ticket Price</span>
                            <span>${event.price ? event.price.toFixed(2) : '0.00'}</span>
                        </div>
                        <div className="flex justify-between items-center mb-4 text-slate-300">
                            <span>Quantity</span>
                            <span>x {totalTickets}</span>
                        </div>
                        <div className="flex justify-between items-center text-lg font-bold text-white border-t border-slate-700 pt-3">
                            <span>Total Due</span>
                            <span className="text-brand-primary">${totalPrice.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-slate-900/50 border-t border-slate-800">
                    <button onClick={handleRegister} disabled={loading || status.type === 'success'} 
                        className="w-full bg-gradient-to-r from-brand-primary to-indigo-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-brand-primary/25 flex items-center justify-center gap-2">
                        {loading ? 'Processing...' : status.type === 'success' ? 'Confirmed' : (
                            <>
                                <CreditCard size={20} />
                                Confirm Registration
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}