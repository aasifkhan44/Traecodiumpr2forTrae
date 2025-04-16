import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../utils/api';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateToken = async () => {
      try {
        console.log('AuthContext: Validating token...');
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('AuthContext: No token found');
          setLoading(false);
          return;
        }

        console.log('AuthContext: Token found, fetching user data');
        const response = await api.get('/auth/me');
        console.log('AuthContext: /auth/me response:', response.data);
        
        if (response.data.success && response.data.user) {
          console.log('AuthContext: Setting user data:', response.data.user);
          setUser({
            ...response.data.user,
            isAdmin: response.data.user.role === 'admin'
          });
          console.log('AuthContext: User data set successfully');
        } else {
          console.error('AuthContext: Invalid response format from /auth/me');
          localStorage.removeItem('token');
        }
      } catch (error) {
        console.error('AuthContext: Auth validation error:', error);
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, []);

  useEffect(() => {
    // Listen for WebSocket balanceUpdate globally (if socket is set on window)
    let ws;
    let cleanup = () => {};
    if (window.userSocket) {
      ws = window.userSocket;
      const handleMessage = (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }
        if (data.type === 'balanceUpdate') {
          setUser(prevUser => {
            if (prevUser && prevUser.balance !== data.balance) {
              return { ...prevUser, balance: data.balance };
            }
            return prevUser;
          });
        }
      };
      ws.addEventListener('message', handleMessage);
      cleanup = () => ws.removeEventListener('message', handleMessage);
    }
    return cleanup;
  }, []);

  // Function to update user balance
  const updateUserBalance = (newBalance) => {
    console.log('AuthContext: Updating user balance to', newBalance);
    if (user) {
      setUser({
        ...user,
        balance: newBalance
      });
    }
  };

  const value = {
    user,
    loading,
    setUser,
    updateUserBalance
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}