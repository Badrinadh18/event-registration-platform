import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import api from '../api/axiosConfig';

export default function MyTickets() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchTickets = async () => {
        setLoading(true);
        try {
            // Adjust this endpoint to match where your backend serves the logged-in user's tickets
            const response = await api.get('/tickets'); 
            setTickets(response.data);
        } catch (err) {
            setError('Failed to load your tickets.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, []);

    const handleCancelRegistration = async (registrationId, isTeam) => {
        if (!window.confirm("Are you sure you want to cancel this registration?")) return;
        try {
            if (isTeam) {
                await api.delete(`/events/team-registrations/${registrationId}`);
            } else {
                await api.delete(`/events/registrations/${registrationId}`);
            }
            fetchTickets();
        } catch (err) {
            alert('Failed to cancel registration.');
        }
    };

    if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">My Tickets</h1>
            
            {error && <div className="bg-red-900/50 text-red-200 p-4 rounded mb-6">{error}</div>}
            {tickets.length === 0 && !error && <p className="text-slate-400">You do not have any tickets yet.</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tickets.map((ticket) => (
                    <div key={ticket.ticketToken} className="bg-brand-card rounded-2xl border border-slate-700/50 overflow-hidden flex flex-col items-center p-6 relative shadow-xl">
                        <div className={`absolute top-4 right-4 text-xs font-bold px-2 py-1 rounded ${ticket.status === 'USED' || ticket.status === 'CANCELLED' ? 'bg-red-900/50 text-red-400' : 'bg-green-900/50 text-green-400'}`}>
                            {ticket.status}
                        </div>
                        
                        <h3 className="text-xl font-bold mb-1 w-full text-center truncate">{ticket.eventName}</h3>
                        <p className="text-sm text-slate-400 mb-6">{ticket.isTeamRegistration ? 'Team Entry' : 'Standard Entry'}</p>
                        
                        <div className="bg-white p-4 rounded-xl mb-6 shadow-inner">
                            <QRCode 
                                value={ticket.ticketToken} 
                                size={180} 
                                className={`h-auto max-w-full ${ticket.status !== 'CONFIRMED' ? 'opacity-30' : ''}`}
                            />
                        </div>

                        <div className="w-full text-center text-xs text-slate-500 font-mono mb-4 bg-slate-800 py-2 rounded">
                            {ticket.ticketToken}
                        </div>

                        {ticket.status === 'CONFIRMED' && ticket.registrationId && (
                            <button 
                                onClick={() => handleCancelRegistration(ticket.registrationId, ticket.isTeamRegistration)}
                                className="w-full mt-auto bg-red-900/20 hover:bg-red-900/50 text-red-400 py-2 rounded transition text-sm font-medium"
                            >
                                Cancel Registration
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}