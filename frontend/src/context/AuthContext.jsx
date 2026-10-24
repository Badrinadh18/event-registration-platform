import { createContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);

    // Helper function to extract and format the role from Spring Boot's JWT
    const extractUserFromToken = (token) => {
        const decoded = jwtDecode(token);
        console.log("Decoded JWT Payload:", decoded); // Lets you see the exact token structure in your browser console

        // Spring Security often uses 'authorities' or 'roles' as arrays
        let rawRole = decoded.role;
        if (!rawRole && decoded.authorities && decoded.authorities.length > 0) {
            rawRole = decoded.authorities[0].authority || decoded.authorities[0];
        }
        
        // Clean up the string (e.g., convert "ROLE_ORGANISER" to "ORGANISER")
        const formattedRole = rawRole ? rawRole.replace('ROLE_', '') : 'ATTENDEE';

        return { email: decoded.sub, role: formattedRole };
    };

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            try {
                setUser(extractUserFromToken(token));
            } catch (e) {
                localStorage.removeItem('accessToken');
            }
        }
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
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};