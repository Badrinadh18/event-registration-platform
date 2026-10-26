import { useState, useEffect, useContext } from 'react';
import api from '../api/axiosConfig';
import { AuthContext } from '../context/AuthContext';
import CreateEventModal from '../components/CreateEventModal';

export default function EventsDirectory() {
    const { user } = useContext(AuthContext);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null); 
    const [error, setError] = useState('');

    const fetchEvents = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get('/events');
            setEvents(response.data);
        } catch (err) {
            setError('Failed to load events. Ensure backend is running.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const handleStatusChange = async (eventId, newStatus) => {
        try {
            // Map the frontend status word to your specific backend URL paths
            let endpointAction = '';
            if (newStatus === 'PUBLISHED') {
                endpointAction = 'publish';
            } else if (newStatus === 'DRAFT') {
                endpointAction = 'unpublish';
            } else if (newStatus === 'CANCELLED') {
                endpointAction = 'cancel';
            }

            // Call the correct API endpoint (e.g., /api/events/123/publish)
            await api.patch(`/events/${eventId}/${endpointAction}`);
            
            fetchEvents(); // Refresh the event list automatically
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update event status');
        }
    };

    // NEW: Function to handle Admin Event Deletion
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
        <div className="flex gap-8 relative">
            <CreateEventModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onEventCreated={fetchEvents} />
            

            <div className="flex-1">
                <h1 className="text-2xl font-bold mb-6">Upcoming Events</h1>
                {error && <div className="bg-red-900/50 text-red-200 p-4 rounded mb-6">{error}</div>}

                {loading ? (
                    <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div></div>
                ) : events.length === 0 ? (
                    <p className="text-slate-400 text-center py-12">No events found.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {events.map((event) => {
                            // NEW LOGIC: Determine permissions for this specific event card
                            // Assuming backend returns event.organiser.email or event.organiserEmail
                            const ownerEmail = event.organiser?.email || event.organiserEmail; 
                            const isOwner = user?.email === ownerEmail;
                            const isAdmin = user?.role === 'ADMIN';
                            const canModify = isAdmin || (user?.role === 'ORGANISER' && isOwner);

                            return (
                                <div key={event.eventId} className="bg-brand-card rounded-xl border border-slate-700/50 overflow-hidden hover:border-brand-primary transition flex flex-col">
                                    <div className="h-32 bg-slate-800 relative">
                                        <div className={`absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur rounded text-xs font-bold uppercase tracking-wider ${event.status === 'PUBLISHED' ? 'text-green-400' : 'text-yellow-400'}`}>
                                            {event.status}
                                        </div>
                                    </div>
                                    <div className="p-5 flex-1 flex flex-col">
                                        <h3 className="text-lg font-bold mb-1 truncate">{event.title}</h3>
                                        <p className="text-sm text-slate-400 mb-4 truncate">{event.venue}</p>
                                        
                                        <div className="flex items-center justify-between text-sm mb-4">
                                            <span className="text-slate-300">Seats: {event.currentConfirmedCount} / {event.maxCapacity}</span>
                                        </div>

                                        <div className="flex gap-2 mt-auto">
                                            <button 
                                                onClick={() => setSelectedEvent(event)}
                                                disabled={event.status !== 'PUBLISHED'}
                                                className="flex-1 bg-brand-primary/20 hover:bg-brand-primary disabled:opacity-50 disabled:hover:bg-brand-primary/20 hover:text-white text-brand-primary py-2 rounded font-medium transition text-sm"
                                            >
                                                Register
                                            </button>
                                        </div>
                                        
                                        {/* UPDATED: Dynamic Modification Controls */}
                                        {canModify && (
                                            <div className="flex gap-2 mt-2 pt-2 border-t border-slate-700">
                                                {event.status === 'DRAFT' && (
                                                    <button onClick={() => handleStatusChange(event.eventId, 'PUBLISHED')} className="flex-1 text-xs bg-green-900/40 text-green-400 py-1 rounded hover:bg-green-900/80">Publish</button>
                                                )}
                                                {event.status === 'PUBLISHED' && (
                                                    <button onClick={() => handleStatusChange(event.eventId, 'DRAFT')} className="flex-1 text-xs bg-yellow-900/40 text-yellow-400 py-1 rounded hover:bg-yellow-900/80">Unpublish</button>
                                                )}
                                                <button onClick={() => handleStatusChange(event.eventId, 'CANCELLED')} className="flex-1 text-xs bg-orange-900/40 text-orange-400 py-1 rounded hover:bg-orange-900/80">Cancel</button>
                                                
                                                {/* ONLY ADMIN CAN DELETE */}
                                                {isAdmin && (
                                                    <button onClick={() => handleDeleteEvent(event.eventId)} className="flex-1 text-xs bg-red-900/40 text-red-400 py-1 rounded hover:bg-red-900/80">Delete</button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {(user?.role === 'ORGANISER' || user?.role === 'ADMIN')&& (
                <div className="w-64 shrink-0">
                    <div className="bg-brand-card p-6 rounded-xl border border-slate-700/50 sticky top-0">
                        <h3 className="font-bold text-lg mb-4 border-b border-slate-700 pb-2">Creator Tools</h3>
                        <button onClick={() => setIsCreateModalOpen(true)} className="w-full bg-brand-primary hover:bg-indigo-500 text-white py-2 rounded font-medium transition flex items-center justify-center gap-2">
                            + Create Event
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}