import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { LogOut, Home, Ticket, LayoutDashboard, Settings } from 'lucide-react';

export default function DashboardLayout({ children }) {
    const { user, logout } = useContext(AuthContext);

    return (
        <div className="min-h-screen flex bg-brand-dark text-slate-100">
            {/* Sidebar */}
            <aside className="w-64 bg-brand-card border-r border-slate-700/50 flex flex-col">
                <div className="p-6 flex items-center gap-3">
                    <div className="w-8 h-8 bg-brand-primary rounded shadow-lg shadow-brand-primary/50"></div>
                    <span className="text-xl font-bold tracking-wider">EVENTIFY</span>
                </div>
                
                <nav className="flex-1 px-4 space-y-2 mt-4">
                    <a href="/dashboard" className="flex items-center gap-3 px-4 py-3 bg-brand-primary/10 text-brand-primary rounded-lg font-medium">
                        <Home size={20} /> Events
                    </a>
                    <a href="/tickets" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition">
                        <Ticket size={20} /> My Tickets
                    </a>
                    
                    {/* Role-Specific Navigation */}
                    {user?.role === 'ORGANISER' && (
                        <a href="/organiser-panel" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition mt-4 border-t border-slate-700 pt-4">
                            <LayoutDashboard size={20} /> Organizer Tools
                        </a>
                    )}
                    {user?.role === 'ADMIN' && (
                        <a href="/admin-panel" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition mt-4 border-t border-slate-700 pt-4">
                            <Settings size={20} /> Admin Dashboard
                        </a>
                    )}
                </nav>

                <div className="p-4 border-t border-slate-700/50">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-brand-accent">
                            {user?.email?.charAt(0).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium truncate">{user?.email}</p>
                            <p className="text-xs text-slate-400">{user?.role}</p>
                        </div>
                    </div>
                    <button onClick={logout} className="flex items-center justify-center gap-2 w-full py-2 text-sm text-red-400 hover:bg-red-400/10 rounded transition">
                        <LogOut size={16} /> Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Top Header */}
                <header className="h-20 border-b border-slate-700/50 flex items-center px-8 bg-brand-dark/80 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex-1 flex items-center gap-4">
                        <div className="relative w-full max-w-md">
                            <input 
                                type="text" 
                                placeholder="Search events..." 
                                className="w-full bg-slate-800 border border-slate-700 rounded-full py-2 pl-4 pr-10 text-sm focus:outline-none focus:border-brand-primary"
                            />
                            <svg className="w-5 h-5 absolute right-3 top-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm font-medium text-slate-300">
                        <span>About</span>
                        <span>Support</span>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}