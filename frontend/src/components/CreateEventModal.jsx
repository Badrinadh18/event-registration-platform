import { useState } from 'react';
import api from '../api/axiosConfig';

export default function CreateEventModal({ isOpen, onClose, onEventCreated }) {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        venue: '',
        eventDate: '',
        maxCapacity: 100,
        waitlistCapacity: 20,
        price: 0
    });
    const [status, setStatus] = useState({ type: '', text: '' });
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus({ type: '', text: '' });

        const payload = {
            title: formData.title,
            description: formData.description,
            venue: formData.venue,
            // Ensure seconds are attached so Spring Boot's LocalDateTime doesn't crash
            eventDate: formData.eventDate.length === 16 ? `${formData.eventDate}:00` : formData.eventDate,
            maxCapacity: parseInt(formData.maxCapacity, 10),
            waitlistCapacity: parseInt(formData.waitlistCapacity, 10),
            price: parseFloat(formData.price)
        };
        
        try {
            await api.post('/events', formData);
            setStatus({ type: 'success', text: 'Event created successfully as DRAFT.' });
            setTimeout(() => {
                onEventCreated(); // Refresh the event list
                onClose();
            }, 1500);
        } catch (error) {
            setStatus({ type: 'error', text: error.response?.data?.message || 'Failed to create event.' });
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-brand-card w-full max-w-lg rounded-2xl border border-slate-700/50 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                
                <h2 className="text-2xl font-bold mb-6">Create New Event</h2>
                
                {status.text && (
                    <div className={`p-3 rounded mb-4 text-sm ${status.type === 'error' ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'}`}>
                        {status.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Event Title</label>
                        <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                            className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white" />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Description</label>
                        <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                            className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white h-24" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Venue</label>
                            <input type="text" required value={formData.venue} onChange={e => setFormData({...formData, venue: e.target.value})}
                                className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Date & Time</label>
                            <input type="datetime-local" required value={formData.eventDate} onChange={e => setFormData({...formData, eventDate: e.target.value})}
                                className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white" />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Capacity</label>
                            <input type="number" required min="1" value={formData.maxCapacity} onChange={e => setFormData({...formData, maxCapacity: e.target.value})}
                                className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Waitlist Limit</label>
                            <input type="number" required min="0" value={formData.waitlistCapacity} onChange={e => setFormData({...formData, waitlistCapacity: e.target.value})}
                                className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Price ($)</label>
                            <input type="number" required min="0" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})}
                                className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white" />
                        </div>
                    </div>
                    
                    <button type="submit" disabled={loading} className="w-full bg-brand-primary hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-bold py-3 rounded transition mt-6">
                        {loading ? 'Creating...' : 'Create Draft Event'}
                    </button>
                </form>
            </div>
        </div>
    );
}