import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

interface User {
    id: string;
    role: string;
    // add other fields as needed
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, role: string) => void;
    logout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            // Verify token / get user details
            axios.get('http://localhost:5000/api/auth/me', {
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(res => {
                    setUser({ ...res.data, role: res.data.role }); // Ensure role is set
                })
                .catch(() => {
                    logout();
                })
                .finally(() => setLoading(false));

            // Or just decode if you trust local storage temporarily
            // const decoded = JSON.parse(atob(token.split('.')[1]));
            // setUser({ id: decoded.user.id, role: decoded.user.role });
            // setLoading(false);
        } else {
            setLoading(false);
        }
    }, [token]);

    const login = (newToken: string, _role: string) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
        // decode or set user immediately if you have the data
        // For now, simpler:
        window.location.href = '/'; // Reload to trigger effect or better: use navigate
        // Better:
        // setUser({ ...user!, role }); 
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
