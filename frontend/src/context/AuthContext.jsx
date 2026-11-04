import { createContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); // NEW: Added loading state

    // Helper function to extract the explicitly scoped role from our backend JWT
    const extractUserFromToken = (token) => {
        try {
            const decoded = jwtDecode(token);
            // Our backend embeds exactly one scoped role like: "ROLE_ORGANISER"
            const rawRole = decoded.role || 'ROLE_ATTENDEE'; 
            const formattedRole = rawRole.replace('ROLE_', '');

            return { email: decoded.sub, role: formattedRole };
        } catch (error) {
            console.error("Failed to decode token", error);
            return null;
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            const extractedUser = extractUserFromToken(token);
            if (extractedUser) {
                setUser(extractedUser);
            } else {
                localStorage.removeItem('accessToken');
            }
        }
        setLoading(false); // NEW: Tell the app we finished checking for the token
    }, []);

    const login = (token, refreshToken) => {
        localStorage.setItem('accessToken', token);
        localStorage.setItem('refreshToken', refreshToken);
        setUser(extractUserFromToken(token));
    };

    const logout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setUser(null);
        window.location.href = '/';
    };

    return (
        // NEW: Expose loading to the rest of the app
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};