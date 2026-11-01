import { useState, useEffect, useContext } from 'react';
import api from '../api/axiosConfig';
import { AuthContext } from '../context/AuthContext';
import CreateEventModal from '../components/CreateEventModal';

export default function OrganiserPanel() {
    const { user } = useContext(AuthContext);
    const [token, setToken] = useState('');
    const [status, setStatus] = useState({ type: '', text: '' });
    const [loadingCheckIn, setLoadingCheckIn] = useState(false);
    
    // Management State
    const [events, setEvents] = useState([]);
    const [loadingEvents, setLoadingEvents] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const fetchEvents = async () => {
        setLoadingEvents(true);
        try {
            const response = await api.get('/events');
            
            // Filter events: Admins see all, Organisers see only their own
            const filteredEvents = response.data.filter(e => {
                if (user?.role === 'ADMIN') return true;
                const ownerEmail = e.organiser?.email || e.organiserEmail;
                return ownerEmail === user?.email;
            });
            
            setEvents(filteredEvents);
        } catch (err) {
            console.error('Failed to load events.');
        } finally {
            setLoadingEvents(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, [user]);

    const handleCheckIn = async (e) => {
        e.preventDefault();
        if (!token.trim()) return;
        setLoadingCheckIn(true);
        setStatus({ type: '', text: '' });

        try {
            const response = await api.post(`/tickets/check-in?token=${token.trim()}`);
            setStatus({ type: 'success', text: response.data || 'Ticket verified! Attendee checked in.' });
            setToken(''); 
        } catch (error) {
            setStatus({ type: 'error', text: error.response?.data?.message || 'Failed to verify ticket.' });
        } finally {
            setLoadingCheckIn(false);
        }
    };

    const handleStatusChange = async (eventId, newStatus) => {
        try {
            let endpointAction = '';
            if (newStatus === 'PUBLISHED') endpointAction = 'publish';
            else if (newStatus === 'DRAFT') endpointAction = 'unpublish';
            else if (newStatus === 'CANCELLED') endpointAction = 'cancel';

            await api.patch(`/events/${eventId}/${endpointAction}`);
            fetchEvents(); 
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update event status');
        }
    };

    const handleDeleteEvent = async (eventId) => {
        if (!window.confirm("Are you sure you want to permanently delete this event?")) return;
        try {
            await api.delete(`/events/${eventId}`);
            fetchEvents();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete event');
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-12">
            <CreateEventModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onEventCreated={fetchEvents} />
            
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Organizer Command Center</h1>
                <button onClick={() => setIsCreateModalOpen(true)} className="bg-brand-primary hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-lg transition flex items-center gap-2 shadow-lg">
                    + Create Event
                </button>
            </div>

            {/* Top Row: Check-In Scanner */}
            <div className="bg-brand-card p-8 rounded-2xl border border-slate-700/50 shadow-xl relative overflow-hidden max-w-2xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-brand-primary"></div>
                <h2 className="text-xl font-bold mb-2">Event Check-In Scanner</h2>
                <p className="text-slate-400 mb-6 text-sm">Scan QR code or manually enter the ticket UUID token.</p>

                {status.text && (
                    <div className={`p-4 rounded-lg mb-6 text-sm font-medium ${status.type === 'error' ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'}`}>
                        {status.text}
                    </div>
                )}

                <form onSubmit={handleCheckIn} className="flex gap-4">
                    <input 
                        type="text" required value={token} onChange={e => setToken(e.target.value)} placeholder="Ticket UUID Token..."
                        className="flex-1 bg-slate-800 border border-slate-600 rounded-lg p-3 text-white font-mono focus:border-brand-primary focus:outline-none" 
                    />
                    <button type="submit" disabled={loadingCheckIn || !token.trim()} className="bg-brand-primary hover:bg-indigo-500 disabled:bg-slate-700 px-6 font-bold rounded-lg transition">
                        {loadingCheckIn ? '...' : 'Verify'}
                    </button>
                </form>
            </div>

            {/* Bottom Row: Analytics & Management Table */}
            <div className="bg-brand-card p-6 rounded-2xl border border-slate-700/50 shadow-xl overflow-hidden">
                <h2 className="text-xl font-bold mb-6">Event Analytics & Management</h2>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-800/50 text-slate-400 text-sm border-b border-slate-700">
                                <th className="p-4 font-medium rounded-tl-lg">Event Title</th>
                                <th className="p-4 font-medium">Status</th>
                                <th className="p-4 font-medium text-center">Booked</th>
                                <th className="p-4 font-medium text-center">Waitlist</th>
                                <th className="p-4 font-medium text-right">Est. Revenue</th>
                                <th className="p-4 font-medium text-right rounded-tr-lg">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingEvents ? (
                                <tr><td colSpan="6" className="p-8 text-center text-slate-400">Loading analytics...</td></tr>
                            ) : events.length === 0 ? (
                                <tr><td colSpan="6" className="p-8 text-center text-slate-400">You have not created any events yet.</td></tr>
                            ) : (
                                events.map((event) => {
                                    const revenue = (event.price || 0) * (event.currentConfirmedCount || 0);
                                    
                                    return (
                                        <tr key={event.eventId} className="border-b border-slate-700/50 hover:bg-slate-800/30 transition">
                                            <td className="p-4 font-medium">
                                                <div className="truncate max-w-[200px]">{event.title}</div>
                                                <div className="text-xs text-slate-400 font-normal">{new Date(event.eventDate).toLocaleDateString()}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider ${
                                                    event.status === 'PUBLISHED' ? 'bg-green-900/50 text-green-400' : 
                                                    event.status === 'CANCELLED' ? 'bg-red-900/50 text-red-400' : 'bg-yellow-900/50 text-yellow-400'
                                                }`}>
                                                    {event.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className="font-bold">{event.currentConfirmedCount}</span> <span className="text-slate-500 text-xs">/ {event.maxCapacity}</span>
                                            </td>
                                            <td className="p-4 text-center text-slate-300">
                                                {event.currentWaitlistCount}
                                            </td>
                                            <td className="p-4 text-right font-bold text-brand-primary">
                                                ${revenue.toFixed(2)}
                                            </td>
                                            <td className="p-4 text-right space-x-2">
                                                {/* Dynamic Management Buttons */}
                                                {event.status === 'DRAFT' && <button onClick={() => handleStatusChange(event.eventId, 'PUBLISHED')} className="text-xs bg-green-900/20 hover:bg-green-900/60 text-green-400 px-3 py-1.5 rounded transition">Publish</button>}
                                                {event.status === 'PUBLISHED' && <button onClick={() => handleStatusChange(event.eventId, 'DRAFT')} className="text-xs bg-yellow-900/20 hover:bg-yellow-900/60 text-yellow-400 px-3 py-1.5 rounded transition">Unpublish</button>}
                                                {event.status !== 'CANCELLED' && <button onClick={() => handleStatusChange(event.eventId, 'CANCELLED')} className="text-xs bg-orange-900/20 hover:bg-orange-900/60 text-orange-400 px-3 py-1.5 rounded transition">Cancel</button>}
                                                
                                                {/* Admin Only Delete */}
                                                {user?.role === 'ADMIN' && <button onClick={() => handleDeleteEvent(event.eventId)} className="text-xs bg-red-900/20 hover:bg-red-900/60 text-red-400 px-3 py-1.5 rounded transition">Delete</button>}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}