import { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import RegistrationModal from '../components/RegistrationModal';
import { Star, MapPin, Calendar, Users, Ticket } from 'lucide-react';

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
            
            let publicEvents = response.data.filter(e => !e.suppressed);
            publicEvents.sort((a, b) => {
                if (a.featured && !b.featured) return -1;
                if (!a.featured && b.featured) return 1;
                return new Date(a.eventDate) - new Date(b.eventDate);
            });

            setEvents(publicEvents);
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
        <div className="max-w-7xl mx-auto relative pb-12">
            <RegistrationModal 
                isOpen={!!selectedEvent} 
                onClose={() => setSelectedEvent(null)} 
                event={selectedEvent} 
                registrationType={registrationType}
                onRegisterSuccess={fetchEvents} 
            />

            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-extrabold tracking-tight">Explore Events</h1>
            </div>
            
            {error && <div className="bg-red-900/50 text-red-200 p-4 rounded-xl border border-red-800 mb-6">{error}</div>}

            {loading ? (
                <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div></div>
            ) : events.length === 0 ? (
                <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-12 text-center">
                    <p className="text-slate-400 text-lg">No events found. Check back later!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {events.map((event) => (
                        <div key={event.eventId} 
                            className={`group rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 flex flex-col ${
                                event.featured 
                                ? 'bg-slate-800/90 border border-yellow-500/40 shadow-[0_8px_30px_rgba(234,179,8,0.15)] hover:border-yellow-400/80' 
                                : 'bg-brand-card border border-slate-700/50 hover:border-brand-primary/50 shadow-lg'
                            }`}>
                            
                            {/* Card Image Area */}
                            <div className="h-40 bg-gradient-to-br from-slate-800 to-slate-900 relative p-4 flex flex-col justify-between">
                                {event.featured && (
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-0"></div>
                                )}
                                
                                <div className="flex justify-between items-start z-10">
                                    <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest backdrop-blur-md ${event.status === 'PUBLISHED' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'}`}>
                                        {event.status}
                                    </div>
                                    
                                    {event.featured && (
                                        <div className="bg-gradient-to-r from-yellow-500 to-amber-500 text-black px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg">
                                            <Star size={12} className="fill-black" /> Featured
                                        </div>
                                    )}
                                </div>

                                <div className="z-10 flex items-center gap-2 text-white/90 text-sm font-medium bg-black/40 w-fit px-3 py-1.5 rounded-lg backdrop-blur-md border border-white/10">
                                    <Calendar size={14} className="text-brand-primary" />
                                    {new Date(event.eventDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </div>
                            </div>
                            
                            {/* Card Body */}
                            <div className="p-6 flex-1 flex flex-col">
                                <h3 className="text-xl font-bold mb-2 leading-tight group-hover:text-brand-primary transition-colors">{event.title}</h3>
                                <p className="text-sm text-slate-400 mb-6 flex items-start gap-2 h-10 line-clamp-2">
                                    <MapPin size={16} className="shrink-0 mt-0.5" />
                                    {event.venue}
                                </p>
                                
                                <div className="bg-slate-900/50 rounded-xl p-3 mb-6 flex items-center justify-between border border-slate-700/50">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Availability</span>
                                        <span className="text-sm font-medium text-slate-300">{event.currentConfirmedCount} / {event.maxCapacity}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Price</span>
                                        <span className="text-sm font-bold text-white">${event.price ? event.price.toFixed(2) : 'Free'}</span>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3 mt-auto">
                                    <button 
                                        onClick={() => { setSelectedEvent(event); setRegistrationType('SINGLE'); }}
                                        disabled={event.status !== 'PUBLISHED'}
                                        className={`flex-1 py-2.5 rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                                            event.featured 
                                            ? 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]' 
                                            : 'bg-brand-primary hover:bg-indigo-500 text-white'
                                        }`}
                                    >
                                        <Ticket size={16} /> Single
                                    </button>
                                    <button 
                                        onClick={() => { setSelectedEvent(event); setRegistrationType('TEAM'); }}
                                        disabled={event.status !== 'PUBLISHED'}
                                        className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 py-2.5 rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2 text-white disabled:cursor-not-allowed"
                                    >
                                        <Users size={16} /> Team
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