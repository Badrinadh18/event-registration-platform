import { useState, useEffect, useContext } from 'react';
import api from '../api/axiosConfig';
import { AuthContext } from '../context/AuthContext';
import CreateEventModal from '../components/CreateEventModal';
import { Users, DollarSign, ArrowLeft, QrCode, Ticket, CheckCircle, Clock, ShieldAlert, Star, EyeOff } from 'lucide-react';

export default function OrganiserPanel() {
    const { user } = useContext(AuthContext);
    
    // Core State
    const [events, setEvents] = useState([]);
    const [loadingEvents, setLoadingEvents] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Detail View State
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [roster, setRoster] = useState([]);
    const [loadingRoster, setLoadingRoster] = useState(false);
    
    // Scanner State
    const [token, setToken] = useState('');
    const [scanStatus, setScanStatus] = useState({ type: '', text: '' });
    const [loadingCheckIn, setLoadingCheckIn] = useState(false);

    const fetchEvents = async () => {
        setLoadingEvents(true);
        try {
            const response = await api.get('/events');
            const filteredEvents = response.data.filter(e => {
                if (user?.role === 'ADMIN') return true;
                const ownerEmail = e.organiser?.email || e.organiserEmail;
                return ownerEmail === user?.email;
            });
            setEvents(filteredEvents);
            
            if (selectedEvent) {
                const updatedEvent = filteredEvents.find(e => e.eventId === selectedEvent.eventId);
                if (updatedEvent) setSelectedEvent(updatedEvent);
            }
        } catch (err) {
            console.error('Failed to load events.');
        } finally {
            setLoadingEvents(false);
        }
    };

    const fetchRoster = async (eventId) => {
        setLoadingRoster(true);
        try {
            const response = await api.get(`/events/${eventId}/roster`);
            setRoster(response.data);
        } catch (error) {
            console.error('Failed to fetch roster.');
        } finally {
            setLoadingRoster(false);
        }
    };

    useEffect(() => {
        if (user) fetchEvents();
    }, [user]);

    useEffect(() => {
        if (selectedEvent) {
            fetchRoster(selectedEvent.eventId);
            setScanStatus({ type: '', text: '' }); 
        }
    }, [selectedEvent?.eventId]);

    const handleCheckIn = async (e) => {
        e.preventDefault();
        if (!token.trim()) return;
        setLoadingCheckIn(true);
        setScanStatus({ type: '', text: '' });

        try {
            const response = await api.post(`/tickets/check-in?token=${token.trim()}`);
            setScanStatus({ type: 'success', text: response.data || 'Ticket verified! Attendee checked in.' });
            setToken(''); 
        } catch (error) {
            setScanStatus({ type: 'error', text: error.response?.data?.message || 'Failed to verify ticket.' });
        } finally {
            setLoadingCheckIn(false);
        }
    };

    // --- Core Actions ---
    const handleStatusChange = async (eventId, newStatus) => {
        if (newStatus === 'CANCELLED' && !window.confirm("Are you sure you want to cancel this event? This will trigger refund emails.")) return;
        
        try {
            let endpointAction = newStatus === 'PUBLISHED' ? 'publish' : 
                                 newStatus === 'DRAFT' ? 'unpublish' : 'cancel';
            await api.patch(`/events/${eventId}/${endpointAction}`);
            fetchEvents(); 
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update event status');
        }
    };

    // --- Admin Special Actions ---
    const handleDeleteEvent = async (eventId) => {
        if (!window.confirm("ADMIN ACTION: Are you sure you want to permanently delete this event? This action cannot be undone.")) return;
        try {
            await api.delete(`/events/${eventId}`);
            setSelectedEvent(null); // Go back to grid
            fetchEvents();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete event');
        }
    };

    const handleFeatureToggle = async (eventId, currentStatus) => {
        try {
            await api.patch(`/admin/events/${eventId}/feature?status=${!currentStatus}`);
            fetchEvents();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update feature status');
        }
    };

    const handleSuppressToggle = async (eventId, currentStatus) => {
        try {
            await api.patch(`/admin/events/${eventId}/suppress?status=${!currentStatus}`);
            fetchEvents();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update suppress status');
        }
    };

    const handleAdminCancelRegistration = async (registrationId) => {
        if (!window.confirm("ADMIN ACTION: Are you sure you want to forcefully cancel this user's registration?")) return;
        try {
            await api.delete(`/events/registrations/${registrationId}`);
            fetchRoster(selectedEvent.eventId); // Refresh roster to show CANCELLED
            fetchEvents(); // Refresh event counts
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to cancel registration');
        }
    };

    // --- VIEW 1: EVENT CARDS GRID ---
    if (!selectedEvent) {
        return (
            <div className="max-w-7xl mx-auto space-y-8 pb-12">
                <CreateEventModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onEventCreated={fetchEvents} />
                
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">{user?.role === 'ADMIN' ? 'All Platform Events' : 'My Events'}</h1>
                    <button onClick={() => setIsCreateModalOpen(true)} className="bg-brand-primary hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-lg transition shadow-lg">
                        + Create Event
                    </button>
                </div>

                {loadingEvents ? (
                    <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div></div>
                ) : events.length === 0 ? (
                    <div className="text-center text-slate-400 py-12 bg-brand-card rounded-xl border border-slate-700/50">
                        No events found.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {events.map(event => (
                            <div key={event.eventId} onClick={() => setSelectedEvent(event)} 
                                className="bg-brand-card rounded-xl border border-slate-700/50 p-6 hover:border-brand-primary cursor-pointer transition shadow-lg group relative">
                                
                                {/* Admin Feature/Suppress Badges */}
                                <div className="absolute -top-3 -right-3 flex gap-2">
                                    {event.featured && <div className="bg-yellow-500 text-black text-[10px] font-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-1"><Star size={12}/> Featured</div>}
                                    {event.suppressed && <div className="bg-indigo-900 text-indigo-200 border border-indigo-500 text-[10px] font-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-1"><EyeOff size={12}/> Suppressed</div>}
                                </div>

                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-xl font-bold truncate pr-4 group-hover:text-brand-primary transition">{event.title}</h3>
                                    <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider ${
                                        event.status === 'PUBLISHED' ? 'bg-green-900/50 text-green-400' : 
                                        event.status === 'CANCELLED' ? 'bg-red-900/50 text-red-400' : 'bg-yellow-900/50 text-yellow-400'
                                    }`}>
                                        {event.status}
                                    </span>
                                </div>
                                
                                <p className="text-sm text-slate-400 mb-6 flex items-center gap-2">
                                    <Clock size={16} /> {new Date(event.eventDate).toLocaleString()}
                                </p>

                                <div className="grid grid-cols-2 gap-4 border-t border-slate-700/50 pt-4">
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Tickets Sold</p>
                                        <p className="font-bold">{event.currentConfirmedCount} <span className="text-slate-500 text-xs font-normal">/ {event.maxCapacity}</span></p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Revenue</p>
                                        <p className="font-bold text-green-400">${((event.price || 0) * (event.currentConfirmedCount || 0)).toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // --- VIEW 2: EVENT DETAILS DASHBOARD ---
    const revenue = ((selectedEvent.price || 0) * (selectedEvent.currentConfirmedCount || 0)).toFixed(2);
    const organiserEmail = selectedEvent.organiser?.email || selectedEvent.organiserEmail;
    const organiserName = selectedEvent.organiser?.name || "Organiser";

    // RULE: Cannot unpublish if people are registered
    const hasActiveRegistrations = selectedEvent.currentConfirmedCount > 0 || selectedEvent.currentWaitlistCount > 0;

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12">
            
            {/* Header, Back Button, & Action Buttons */}
            <div className="flex items-center justify-between">
                <button onClick={() => setSelectedEvent(null)} className="flex items-center gap-2 text-slate-400 hover:text-white transition">
                    <ArrowLeft size={20} /> Back to Events
                </button>
                <div className="flex gap-2">
                    
                    {user?.role === 'ADMIN' ? (
                        /* ADMIN ACTION BAR (Replaces standard Publish/Unpublish) */
                        <>
                            <button onClick={() => handleFeatureToggle(selectedEvent.eventId, selectedEvent.featured)} 
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ${selectedEvent.featured ? 'bg-yellow-900/40 hover:bg-yellow-600 text-yellow-100' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}>
                                <Star size={16} /> {selectedEvent.featured ? 'Unfeature' : 'Feature'}
                            </button>
                            
                            <button onClick={() => handleSuppressToggle(selectedEvent.eventId, selectedEvent.suppressed)} 
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ${selectedEvent.suppressed ? 'bg-indigo-900/40 hover:bg-indigo-600 text-indigo-100' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}>
                                <EyeOff size={16} /> {selectedEvent.suppressed ? 'Unsuppress' : 'Suppress'}
                            </button>
                            
                            <button onClick={() => handleDeleteEvent(selectedEvent.eventId)} className="bg-red-900/80 hover:bg-red-600 text-red-100 px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ml-4 border-l border-slate-700 pl-6">
                                <ShieldAlert size={16} /> Delete Event
                            </button>
                        </>
                    ) : (
                        /* STANDARD ORGANISER ACTION BAR - LOCKED IF SUPPRESSED */
                        !selectedEvent.suppressed && (
                            <>
                                {selectedEvent.status === 'DRAFT' && <button onClick={() => handleStatusChange(selectedEvent.eventId, 'PUBLISHED')} className="bg-green-900/40 hover:bg-green-600 text-green-100 px-4 py-2 rounded-lg text-sm font-bold transition">Publish</button>}
                                
                                {selectedEvent.status === 'PUBLISHED' && (
                                    <button 
                                        onClick={() => handleStatusChange(selectedEvent.eventId, 'DRAFT')} 
                                        disabled={hasActiveRegistrations}
                                        title={hasActiveRegistrations ? "Cannot unpublish an event that has active registrations." : ""}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition ${hasActiveRegistrations ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700' : 'bg-yellow-900/40 hover:bg-yellow-600 text-yellow-100'}`}
                                    >
                                        Unpublish
                                    </button>
                                )}
                                
                                {selectedEvent.status !== 'CANCELLED' && <button onClick={() => handleStatusChange(selectedEvent.eventId, 'CANCELLED')} className="bg-orange-900/40 hover:bg-orange-600 text-orange-100 px-4 py-2 rounded-lg text-sm font-bold transition">Cancel Event</button>}
                            </>
                        )
                    )}
                </div>
            </div>

            <div className="flex items-center gap-4">
                <h1 className="text-3xl font-bold">{selectedEvent.title}</h1>
                {selectedEvent.featured && <span className="bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-full shadow-lg">FEATURED</span>}
                {selectedEvent.suppressed && <span className="bg-indigo-900 text-indigo-200 border border-indigo-500 text-xs font-bold px-3 py-1 rounded-full shadow-lg">SUPPRESSED</span>}
            </div>

            {/* Suppressed Warning Banner */}
            {selectedEvent.suppressed && (
            <div className="bg-red-900/30 border border-red-900/50 p-4 rounded-lg flex items-start gap-3">
                <ShieldAlert className="text-red-400 shrink-0 mt-0.5" size={20} />
                <div>
                    <p className="text-red-400 font-bold text-sm">Event Suppressed by Administration</p>
                    <p className="text-red-300 text-xs mt-1">This event has been hidden from the public directory. Registration, modifications, and ticket scanning are strictly disabled. Contact support for details.</p>
                </div>
            </div>)}

            {/* Admin Only - Organiser Details Card */}
            {user?.role === 'ADMIN' && (
                <div className="bg-slate-800/80 border border-slate-600 p-4 rounded-xl flex items-center gap-4 w-fit pr-8">
                    <div className="w-12 h-12 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary font-bold text-lg border border-brand-primary/50">
                        {organiserName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Event Owner</p>
                        <p className="text-white font-bold leading-tight">{organiserName}</p>
                        <p className="text-sm text-slate-300 leading-tight">{organiserEmail}</p>
                    </div>
                </div>
            )}

            {/* Top Row: Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-brand-card p-5 rounded-xl border border-slate-700/50 flex items-center gap-4">
                    <div className="bg-blue-900/30 p-3 rounded-lg text-blue-400"><Ticket size={24} /></div>
                    <div><p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Capacity</p><p className="text-xl font-bold">{selectedEvent.currentConfirmedCount} <span className="text-sm text-slate-500">/ {selectedEvent.maxCapacity}</span></p></div>
                </div>
                <div className="bg-brand-card p-5 rounded-xl border border-slate-700/50 flex items-center gap-4">
                    <div className="bg-orange-900/30 p-3 rounded-lg text-orange-400"><Users size={24} /></div>
                    <div><p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Waitlist</p><p className="text-xl font-bold">{selectedEvent.currentWaitlistCount}</p></div>
                </div>
                <div className="bg-brand-card p-5 rounded-xl border border-slate-700/50 flex items-center gap-4">
                    <div className="bg-green-900/30 p-3 rounded-lg text-green-400"><DollarSign size={24} /></div>
                    <div><p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Revenue</p><p className="text-xl font-bold text-green-400">${revenue}</p></div>
                </div>
                <div className="bg-brand-card p-5 rounded-xl border border-slate-700/50 flex items-center gap-4">
                    <div className="bg-purple-900/30 p-3 rounded-lg text-purple-400"><CheckCircle size={24} /></div>
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Status</p>
                        <p className="text-lg font-bold">{selectedEvent.status}</p>
                    </div>
                </div>
            </div>

            {/* Middle Row: Scanner (LOCKED IF SUPPRESSED) */}
            <div className="bg-brand-card p-8 rounded-xl border border-brand-primary/50 shadow-[0_0_15px_rgba(99,102,241,0.15)] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-brand-primary"></div>
                <div className="flex items-center gap-3 mb-2">
                    <QrCode className="text-brand-primary" size={24} />
                    <h2 className="text-xl font-bold">Check-In Scanner</h2>
                </div>
                <p className="text-slate-400 mb-6 text-sm">Scan QR codes for <strong className="text-white">{selectedEvent.title}</strong>. Tickets for other events will be rejected.</p>

                {scanStatus.text && (
                    <div className={`p-4 rounded-lg mb-6 text-sm font-medium ${scanStatus.type === 'error' ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'}`}>
                        {scanStatus.text}
                    </div>
                )}

                <form onSubmit={handleCheckIn} className="flex gap-4 max-w-2xl">
                    <input 
                        type="text" required value={token} onChange={e => setToken(e.target.value)} placeholder="Enter Ticket UUID..."
                        disabled={selectedEvent.suppressed}
                        className="flex-1 bg-slate-900 border border-slate-600 rounded-lg p-3 text-white font-mono focus:border-brand-primary focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed" 
                    />
                    <button type="submit" disabled={loadingCheckIn || !token.trim() || selectedEvent.suppressed} className="bg-brand-primary hover:bg-indigo-500 disabled:bg-slate-700 px-8 font-bold rounded-lg transition shadow-lg disabled:cursor-not-allowed">
                        {loadingCheckIn ? '...' : 'Verify Entry'}
                    </button>
                </form>
            </div>

            {/* Bottom Row: Attendee Roster Table */}
            <div className="bg-brand-card rounded-xl border border-slate-700/50 overflow-hidden">
                <div className="p-6 border-b border-slate-700 pb-4">
                    <h2 className="text-xl font-bold">Attendee Roster</h2>
                </div>
                
                {loadingRoster ? (
                    <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div></div>
                ) : roster.length === 0 ? (
                    <p className="p-8 text-center text-slate-400">No one has registered for this event yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-800/50 text-slate-400 text-sm border-b border-slate-700">
                                    <th className="p-4 font-medium">Attendee Name</th>
                                    <th className="p-4 font-medium">Email</th>
                                    <th className="p-4 font-medium">Registration Status</th>
                                    {/* Admin Action Column Header */}
                                    {user?.role === 'ADMIN' && <th className="p-4 font-medium text-right">Admin Override</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {roster.map((person, index) => (
                                    <tr key={index} className="border-b border-slate-700/50 hover:bg-slate-800/20 transition text-sm">
                                        <td className="p-4 font-medium">{person.name}</td>
                                        <td className="p-4 text-slate-300">{person.email}</td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                person.status === 'CONFIRMED' ? 'bg-green-900/30 text-green-400 border border-green-900/50' : 
                                                person.status === 'CANCELLED' ? 'bg-red-900/30 text-red-400 border border-red-900/50' : 
                                                'bg-orange-900/30 text-orange-400 border border-orange-900/50'
                                            }`}>
                                                {person.status}
                                            </span>
                                        </td>
                                        {/* Admin Action Column */}
                                        {user?.role === 'ADMIN' && (
                                            <td className="p-4 text-right">
                                                {(person.status === 'CONFIRMED' || person.status === 'WAITLISTED') && (
                                                    <button 
                                                        onClick={() => handleAdminCancelRegistration(person.registrationId)}
                                                        className="text-xs bg-red-900/20 hover:bg-red-900/60 text-red-400 px-3 py-1.5 rounded transition font-medium"
                                                    >
                                                        Cancel Reg
                                                    </button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}