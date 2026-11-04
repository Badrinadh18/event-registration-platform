import { ServerCrash, RefreshCw, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SystemOffline() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center bg-brand-dark text-slate-100 p-4 relative overflow-hidden">
            {/* Ambient Danger Glow */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
                <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[60%] h-[60%] bg-red-900/10 blur-[120px] rounded-full"></div>
            </div>

            <div className="w-full max-w-lg bg-slate-900/80 backdrop-blur-xl p-10 rounded-3xl border border-slate-700/50 shadow-2xl z-10 text-center">
                
                <div className="w-24 h-24 bg-red-900/20 rounded-3xl border border-red-500/30 flex items-center justify-center mx-auto mb-8 shadow-[0_0_30px_rgba(239,68,68,0.15)] relative">
                    <div className="absolute inset-0 bg-red-500/10 animate-pulse rounded-3xl"></div>
                    <ServerCrash size={48} className="text-red-400" />
                </div>
                
                <h1 className="text-3xl font-extrabold tracking-tight text-white mb-4">System Offline</h1>
                
                <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                    We are currently experiencing a temporary connection issue with our core servers. Our engineering team has been notified.
                </p>

                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-8 flex flex-col gap-2 text-sm text-slate-300">
                    <p className="font-bold text-white uppercase tracking-wider text-xs">Diagnostic Status</p>
                    <div className="flex justify-between items-center border-b border-slate-700/50 pb-2">
                        <span>Frontend Interface</span>
                        <span className="text-green-400 font-bold">Operational</span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                        <span>Backend Services</span>
                        <span className="text-red-400 font-bold animate-pulse">Unreachable</span>
                    </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                    <button 
                        onClick={() => window.location.reload()} 
                        className="flex-1 bg-brand-primary hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                        <RefreshCw size={18} /> Try Again
                    </button>
                    <button 
                        onClick={() => navigate('/')} 
                        className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        <ArrowLeft size={18} /> Return Home
                    </button>
                </div>
            </div>
        </div>
    );
}