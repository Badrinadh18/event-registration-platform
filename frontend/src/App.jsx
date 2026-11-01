import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import VerifyEmail from './pages/VerifyEmail';
import DashboardLayout from './layouts/DashboardLayout';
import EventsDirectory from './pages/EventsDirectory';
import AdminPanel from './pages/AdminPanel'; 
import MyTickets from './pages/MyTickets';
import OrganiserPanel from './pages/OrganiserPanel';

const ProtectedRoute = ({ children }) => {
    return <DashboardLayout>{children}</DashboardLayout>;
};

export default function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/verify" element={<VerifyEmail />} />
                    
                    <Route path="/dashboard" element={
                        <ProtectedRoute>
                            <EventsDirectory />
                        </ProtectedRoute>
                    } />

                    <Route path="/admin-panel" element={
                        <ProtectedRoute>
                            <AdminPanel />
                        </ProtectedRoute>
                    } />

                    <Route path="/tickets" element={
                        <ProtectedRoute>
                            <MyTickets />
                        </ProtectedRoute>
                    } />

                    <Route path="/organiser-panel" element={
                        <ProtectedRoute>
                            <OrganiserPanel />
                        </ProtectedRoute>
                    } />
                    
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}