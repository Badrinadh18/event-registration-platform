import { useState, useEffect, useContext } from 'react';
import api from '../api/axiosConfig';
import { AuthContext } from '../context/AuthContext';

export default function EventsDirectory() {
    const { user } = useContext(AuthContext);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    // Dummy data for testing the UI before we hook up the actual Spring Boot endpoint
    useEffect(() => {
        setTimeout(() => {
            setEvents([
                { id: 1, title: 'Tech Conference 2026', venue: 'Convention Center', date: '2026-11-15T09:00:00', status: 'PUBLISHED', maxCapacity: 500, currentConfirmedCount: 150 },
                { id: 2, title: 'Startup Pitch Night', venue: 'Innovation Hub', date: '2026-12-01T18:00:00', status: 'PUBLISHED', maxCapacity: 100, currentConfirmedCount: 100 },
                { id: 3, title: 'Draft Workshop', venue: 'Room 101', date: '2026-10-30T10:00:00', status: 'DRAFT', maxCapacity: 30, currentConfirmedCount: 0 },
            ]);
            setLoading(false);
        }, 500);
    }, []);

    return (
        <div className="flex gap-8">
            {/* Left: Events Grid */}
            <div className="flex-1">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Upcoming Events</h1>
                </div>

                {loading ? (
                    <p className="text-slate-400">Loading events...</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {events.map((event) => (
                            <div key={event.id} className="bg-brand-card rounded-xl border border-slate-700/50 overflow-hidden hover:border-brand-primary transition">
                                <div className="h-32 bg-slate-800 relative">
                                    <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur rounded text-xs font-bold uppercase tracking-wider text-brand-primary">
                                        {event.status}
                                    </div>
                                    <div className="absolute bottom-3 left-3 text-xs bg-brand-dark px-2 py-1 rounded">
                                        {new Date(event.date).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="p-5">
                                    <h3 className="text-lg font-bold mb-1 truncate">{event.title}</h3>
                                    <p className="text-sm text-slate-400 mb-4">{event.venue}</p>
                                    
                                    <div className="flex items-center justify-between text-sm mb-4">
                                        <span className="text-slate-300">Seats: {event.currentConfirmedCount} / {event.maxCapacity}</span>
                                        {event.currentConfirmedCount >= event.maxCapacity && (
                                            <span className="text-yellow-500 font-medium">Waitlist Active</span>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2">
                                        <button className="flex-1 bg-brand-primary/20 hover:bg-brand-primary hover:text-white text-brand-primary py-2 rounded font-medium transition text-sm">
                                            Single Register
                                        </button>
                                        <button className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded font-medium transition text-sm">
                                            Team
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Right: Organiser Quick Actions Sidebar */}
            {user?.role === 'ORGANISER' && (
                <div className="w-64 shrink-0">
                    <div className="bg-brand-card p-6 rounded-xl border border-slate-700/50 sticky top-0">
                        <h3 className="font-bold text-lg mb-4 border-b border-slate-700 pb-2">Creator Tools</h3>
                        <div className="space-y-3">
                            <button className="w-full bg-brand-primary hover:bg-indigo-500 text-white py-2 rounded font-medium transition flex items-center justify-center gap-2">
                                + Create Event
                            </button>
                            <button className="w-full border border-slate-600 hover:bg-slate-700 py-2 rounded text-slate-300 transition text-sm">
                                Publish Event
                            </button>
                            <button className="w-full border border-red-900/50 text-red-400 hover:bg-red-900/20 py-2 rounded transition text-sm">
                                Cancel Event
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}