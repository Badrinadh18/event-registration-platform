import { useState } from 'react';
import api from '../api/axiosConfig';

export default function OrganiserPanel() {
    const [token, setToken] = useState('');
    const [status, setStatus] = useState({ type: '', text: '' });
    const [loading, setLoading] = useState(false);

    const handleCheckIn = async (e) => {
        e.preventDefault();
        if (!token.trim()) return;
        
        setLoading(true);
        setStatus({ type: '', text: '' });

        try {
            // Calls the check-in endpoint we defined in your TicketController
            const response = await api.post(`/tickets/check-in?token=${token.trim()}`);
            
            setStatus({ type: 'success', text: response.data || 'Ticket verified! Attendee checked in.' });
            setToken(''); // Clear the input for the next person in line
        } catch (error) {
            setStatus({ type: 'error', text: error.response?.data?.message || 'Failed to verify ticket. It may be invalid or cancelled.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Organiser Command Center</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Check-In Station */}
                <div className="bg-brand-card p-8 rounded-2xl border border-slate-700/50 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-brand-primary"></div>
                    <h2 className="text-2xl font-bold mb-2">Attendee Check-In</h2>
                    <p className="text-slate-400 mb-6">Scan a QR code or manually enter the ticket token.</p>

                    {status.text && (
                        <div className={`p-4 rounded-lg mb-6 text-sm font-medium flex items-start gap-3 ${status.type === 'error' ? 'bg-red-900/50 text-red-200 border border-red-800' : 'bg-green-900/50 text-green-200 border border-green-800'}`}>
                            <span>{status.type === 'success' ? '✅' : '❌'}</span>
                            <span>{status.text}</span>
                        </div>
                    )}

                    <form onSubmit={handleCheckIn} className="space-y-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Ticket Token (UUID)</label>
                            <input 
                                type="text" 
                                required 
                                autoFocus
                                value={token} 
                                onChange={e => setToken(e.target.value)}
                                placeholder="Paste or scan token here..."
                                className="w-full bg-slate-800 border border-slate-600 rounded-lg p-4 text-white font-mono text-sm focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition" 
                            />
                        </div>
                        
                        <button 
                            type="submit" 
                            disabled={loading || !token.trim()} 
                            className="w-full bg-brand-primary hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-4 rounded-lg transition"
                        >
                            {loading ? 'Verifying...' : 'Verify Ticket'}
                        </button>
                    </form>
                </div>

                {/* Event Stats (Placeholder for future metrics) */}
                <div className="bg-brand-card p-8 rounded-2xl border border-slate-700/50 shadow-xl opacity-70">
                    <h2 className="text-xl font-bold mb-4">Event Metrics</h2>
                    <p className="text-slate-400 text-sm mb-6">Real-time check-in metrics will appear here.</p>
                    
                    <div className="space-y-4">
                        <div className="bg-slate-800 p-4 rounded-lg flex justify-between items-center">
                            <span className="text-slate-400">Total Checked In</span>
                            <span className="text-2xl font-bold text-white">--</span>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-lg flex justify-between items-center">
                            <span className="text-slate-400">Waitlist Size</span>
                            <span className="text-2xl font-bold text-white">--</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}