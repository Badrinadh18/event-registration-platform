import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import api from '../api/axiosConfig';
import { Calendar, MapPin, Users, User, Ticket, Trash2, CheckCircle2, ZoomIn, X } from 'lucide-react';

export default function MyTickets() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // NEW: State to manage the zoomed-in QR Modal
    const [selectedTicket, setSelectedTicket] = useState(null);

    const fetchTickets = async () => {
        setLoading(true);
        try {
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
        const warningMsg = isTeam 
            ? "WARNING: This is a Team Registration. Cancelling this will invalidate tickets for your ENTIRE TEAM. Are you absolutely sure?" 
            : "Are you sure you want to cancel your registration? Your ticket will be invalidated.";
            
        if (!window.confirm(warningMsg)) return;
        
        try {
            if (isTeam) {
                await api.delete(`/events/team-registrations/${registrationId}`);
            } else {
                await api.delete(`/events/registrations/${registrationId}`);
            }
            fetchTickets();
            setSelectedTicket(null); // Close modal if open
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to cancel registration.');
        }
    };

    if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="max-w-6xl mx-auto pb-12 relative">
            <h1 className="text-3xl font-extrabold tracking-tight mb-8">My Wallet</h1>
            
            {error && <div className="bg-red-900/50 text-red-200 p-4 rounded-xl border border-red-800 mb-6">{error}</div>}
            
            {tickets.length === 0 && !error && (
                <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-12 text-center">
                    <Ticket className="mx-auto text-slate-500 mb-4" size={48} />
                    <p className="text-slate-400 text-lg">Your wallet is empty. Register for an event to see your tickets here.</p>
                </div>
            )}

            {/* FULL SCREEN QR SCANNER MODAL */}
            {selectedTicket && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-brand-dark w-full max-w-sm rounded-3xl border border-slate-700/50 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col relative overflow-hidden">
                        
                        <button onClick={() => setSelectedTicket(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full p-2 transition z-10 shadow-lg">
                            <X size={20} />
                        </button>
                        
                        {/* Bright White Background for QR Readability */}
                        <div className="p-10 flex flex-col items-center bg-white">
                            <h3 className="text-slate-800 font-extrabold text-xl mb-6 text-center leading-tight">
                                {selectedTicket.eventName}
                            </h3>
                            <QRCode 
                                value={selectedTicket.ticketToken} 
                                size={220} 
                                className={`${selectedTicket.status !== 'CONFIRMED' ? 'opacity-30' : ''}`}
                            />
                            {selectedTicket.status !== 'CONFIRMED' && (
                                <p className="text-red-600 font-bold mt-4 tracking-widest uppercase">
                                    {selectedTicket.status}
                                </p>
                            )}
                        </div>
                        
                        {/* Ticket Details Panel */}
                        <div className="p-6 bg-brand-card flex flex-col items-center">
                            <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-2">Ticket UUID</p>
                            <p className="text-brand-primary font-mono text-xs bg-slate-900/80 p-3 rounded-xl w-full break-all text-center border border-brand-primary/30 mb-6 shadow-inner">
                                {selectedTicket.ticketToken}
                            </p>
                            
                            <div className="w-full space-y-3 text-sm">
                                <div className="flex justify-between border-b border-slate-700/50 pb-2">
                                    <span className="text-slate-500">Holder Name</span>
                                    <span className="font-bold text-white">{selectedTicket.attendeeName}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-700/50 pb-2">
                                    <span className="text-slate-500">Admission Type</span>
                                    <span className="text-slate-200">{selectedTicket.isTeamRegistration ? 'Team Entry' : 'Standard Entry'}</span>
                                </div>
                                <div className="flex justify-between pb-2">
                                    <span className="text-slate-500">Date</span>
                                    <span className="text-slate-200">{new Date(selectedTicket.eventDate).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {tickets.map((ticket) => (
                    <div key={ticket.ticketToken} className="flex flex-col sm:flex-row bg-brand-card rounded-2xl shadow-xl relative overflow-hidden group border border-slate-700/30">
                        
                        {/* LEFT SIDE: Event Info (The Stub) */}
                        <div className="flex-1 p-6 relative border-b sm:border-b-0 sm:border-r border-dashed border-slate-600">
                            {/* Decorative Cutouts for ticket effect */}
                            <div className="hidden sm:block absolute -top-4 -right-4 w-8 h-8 bg-brand-dark rounded-full shadow-inner"></div>
                            <div className="hidden sm:block absolute -bottom-4 -right-4 w-8 h-8 bg-brand-dark rounded-full shadow-inner"></div>
                            
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4 ${
                                ticket.status === 'USED' ? 'bg-slate-800 text-slate-400' :
                                ticket.status === 'CANCELLED' ? 'bg-red-900/50 text-red-400' : 
                                'bg-green-500/20 text-green-400 border border-green-500/30'
                            }`}>
                                {ticket.status === 'CONFIRMED' && <CheckCircle2 size={12} />}
                                {ticket.status}
                            </div>
                            
                            <h3 className="text-xl font-bold mb-2 leading-tight pr-4">{ticket.eventName}</h3>
                            
                            <div className="space-y-3 mt-4">
                                <div className="flex items-start gap-3 text-sm text-slate-300">
                                    <Calendar size={16} className="text-brand-primary shrink-0 mt-0.5" />
                                    <span>{new Date(ticket.eventDate).toLocaleString(undefined, { weekday: 'short', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className="flex items-start gap-3 text-sm text-slate-300">
                                    <MapPin size={16} className="text-brand-primary shrink-0 mt-0.5" />
                                    <span className="truncate pr-4">{ticket.venue}</span>
                                </div>
                                <div className="flex items-start gap-3 text-sm text-slate-300">
                                    {ticket.isTeamRegistration ? <Users size={16} className="text-purple-400 shrink-0 mt-0.5" /> : <User size={16} className="text-blue-400 shrink-0 mt-0.5" />}
                                    <span className="font-medium">{ticket.isTeamRegistration ? 'Team Admission' : 'Standard Admission'}</span>
                                </div>
                            </div>
                            
                            <div className="mt-6 pt-4 border-t border-slate-700/50 flex justify-between items-end">
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-0.5">Ticket Holder</p>
                                    <p className="font-medium text-white text-sm">{ticket.attendeeName}</p>
                                </div>
                            </div>
                        </div>
                        
                        {/* RIGHT SIDE: Compact QR Code & Actions */}
                        <div className="w-full sm:w-48 bg-slate-900/50 p-6 flex flex-col items-center justify-center relative">
                            
                            {/* Clickable Compact QR Thumbnail */}
                            <button 
                                onClick={() => setSelectedTicket(ticket)}
                                className="bg-white p-2 rounded-xl mb-3 shadow-md relative overflow-hidden group/qr transition-transform hover:scale-105 hover:shadow-brand-primary/20 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-slate-900"
                            >
                                <QRCode 
                                    value={ticket.ticketToken} 
                                    size={80} 
                                    className={`h-auto max-w-full ${ticket.status !== 'CONFIRMED' ? 'opacity-20' : ''}`}
                                />
                                {/* Hover Overlay Icon */}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/qr:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                                    <ZoomIn className="text-white drop-shadow-lg" size={28} />
                                </div>
                            </button>
                            
                            <div className="text-[10px] text-slate-500 font-mono tracking-widest text-center px-2 w-full truncate">
                                {ticket.ticketToken.split('-')[0]}...
                            </div>
                            
                            <p className="text-[10px] text-brand-primary mt-2 mb-4 font-bold uppercase tracking-wider text-center">Tap to Scan</p>

                            {/* Cancel Button */}
                            {ticket.status === 'CONFIRMED' && ticket.registrationId && (
                                <button 
                                    onClick={() => handleCancelRegistration(ticket.registrationId, ticket.isTeamRegistration)}
                                    className="mt-auto w-full flex items-center justify-center gap-1.5 border border-red-900/50 hover:bg-red-900/40 text-red-400 py-1.5 rounded-lg transition-colors text-xs font-bold"
                                >
                                    <Trash2 size={14} />
                                    Cancel Reg
                                </button>
                            )}
                        </div>
                        
                    </div>
                ))}
            </div>
        </div>
    );
}