import { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import RegistrationModal from '../components/RegistrationModal';

export default function EventsDirectory() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState(null); 
    const [registrationType, setRegistrationType] = useState('SINGLE');
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

    return (
        <div className="max-w-7xl mx-auto relative">
            <RegistrationModal 
                isOpen={!!selectedEvent} 
                onClose={() => setSelectedEvent(null)} 
                event={selectedEvent} 
                registrationType={registrationType}
                onRegisterSuccess={fetchEvents} 
            />

            <h1 className="text-3xl font-bold mb-8">Events Directory</h1>
            
            {error && <div className="bg-red-900/50 text-red-200 p-4 rounded mb-6">{error}</div>}

            {loading ? (
                <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div></div>
            ) : events.length === 0 ? (
                <p className="text-slate-400 text-center py-12">No events found. Check back later!</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {events.map((event) => (
                        <div key={event.eventId} className="bg-brand-card rounded-xl border border-slate-700/50 overflow-hidden hover:border-brand-primary transition flex flex-col">
                            <div className="h-32 bg-slate-800 relative">
                                <div className={`absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur rounded text-xs font-bold uppercase tracking-wider ${event.status === 'PUBLISHED' ? 'text-green-400' : 'text-yellow-400'}`}>
                                    {event.status}
                                </div>
                                <div className="absolute bottom-3 left-3 text-xs bg-brand-dark px-2 py-1 rounded font-medium">
                                    {new Date(event.eventDate).toLocaleDateString()}
                                </div>
                            </div>
                            <div className="p-5 flex-1 flex flex-col">
                                <h3 className="text-lg font-bold mb-1 truncate">{event.title}</h3>
                                <p className="text-sm text-slate-400 mb-4 truncate">{event.venue}</p>
                                
                                <div className="flex items-center justify-between text-sm mb-4">
                                    <span className="text-slate-300">Seats: {event.currentConfirmedCount} / {event.maxCapacity}</span>
                                    {event.currentConfirmedCount >= event.maxCapacity && (
                                        <span className="text-yellow-500 font-medium text-xs">Waitlist Active</span>
                                    )}
                                </div>

                                <div className="flex gap-2 mt-auto">
                                    <button 
                                        onClick={() => { setSelectedEvent(event); setRegistrationType('SINGLE'); }}
                                        disabled={event.status !== 'PUBLISHED'}
                                        className="flex-1 bg-brand-primary/20 hover:bg-brand-primary disabled:opacity-50 disabled:hover:bg-brand-primary/20 hover:text-white text-brand-primary py-2 rounded font-medium transition text-sm"
                                    >
                                        Register
                                    </button>
                                    <button 
                                        onClick={() => { setSelectedEvent(event); setRegistrationType('TEAM'); }}
                                        disabled={event.status !== 'PUBLISHED'}
                                        className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 py-2 rounded font-medium transition text-sm"
                                    >
                                        Team
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}