import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react'; 
import { AuthProvider, AuthContext } from './context/AuthContext'; 

// Page Imports
import LandingPage from './pages/LandingPage';
import AdminLogin from './pages/AdminLogin'; 
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import DashboardLayout from './layouts/DashboardLayout';
import EventsDirectory from './pages/EventsDirectory';
import AdminPanel from './pages/AdminPanel'; 
import MyTickets from './pages/MyTickets';
import OrganiserPanel from './pages/OrganiserPanel';
import SystemOffline from './pages/SystemOffline';

// 1. Protects private dashboards from unauthenticated users
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading } = useContext(AuthContext);

    if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div></div>; 
    
    if (!user) {
        return <Navigate to="/" replace />;
    }

    // STRICT PARTITIONING: Bounce users to their correct home if they snoop
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        if (user.role === 'ADMIN') return <Navigate to="/admin/admin-panel" replace />;
        if (user.role === 'ORGANISER') return <Navigate to="/organiser-panel" replace />;
        return <Navigate to="/dashboard" replace />; // Attendee
    }

    return <DashboardLayout>{children}</DashboardLayout>;
};

// 2. Prevents already logged-in users from seeing Login/Register pages
const PublicOnlyRoute = ({ children }) => {
    const { user, loading } = useContext(AuthContext);
    
    if (loading) return null;
    
    if (user) {
        if (user.role === 'ADMIN') return <Navigate to="/admin/admin-panel" replace />;
        if (user.role === 'ORGANISER') return <Navigate to="/organiser-panel" replace />;
        return <Navigate to="/dashboard" replace />;
    }
    
    return children;
};

export default function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    {/* PUBLIC ROUTES */}
                    <Route path="/" element={<PublicOnlyRoute><LandingPage /></PublicOnlyRoute>} />
                    <Route path="/admin/login" element={<PublicOnlyRoute><AdminLogin /></PublicOnlyRoute>} />
                    <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />
                    <Route path="/reset-password" element={<PublicOnlyRoute><ResetPassword /></PublicOnlyRoute>} />
                    <Route path="/verify" element={<VerifyEmail />} />
                    <Route path="/offline" element={<SystemOffline />} />
                    
                    {/* ATTENDEE ROUTES */}
                    <Route path="/dashboard" element={
                        <ProtectedRoute allowedRoles={['ATTENDEE']}>
                            <EventsDirectory />
                        </ProtectedRoute>
                    } />
                    <Route path="/tickets" element={
                        <ProtectedRoute allowedRoles={['ATTENDEE']}>
                            <MyTickets />
                        </ProtectedRoute>
                    } />

                    {/* ORGANISER ROUTES (Admins can also see this) */}
                    <Route path="/organiser-panel" element={
                        <ProtectedRoute allowedRoles={['ORGANISER', 'ADMIN']}>
                            <OrganiserPanel />
                        </ProtectedRoute>
                    } />

                    {/* STRICTLY ADMIN ROUTE */}
                    <Route path="/admin/admin-panel" element={
                        <ProtectedRoute allowedRoles={['ADMIN']}>
                            <AdminPanel />
                        </ProtectedRoute>
                    } />
                    
                    {/* CATCH ALL - Bounces lost users back to the root */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}