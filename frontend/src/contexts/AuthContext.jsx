import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');

      if (!accessToken || !refreshToken) {
        setIsLoading(false);
        return;
      }

      // Try to verify the token
      const response = await authAPI.verifyToken();
      if (response.success) {
        setUser(response.user);
        setIsAuthenticated(true);
      } else {
        // Token is invalid, try to refresh
        const refreshResponse = await authAPI.refreshToken();
        if (refreshResponse.success) {
          setUser(refreshResponse.user);
          setIsAuthenticated(true);
        } else {
          // Both tokens are invalid, clear storage
          logout();
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      
      // Check if login was successful by looking for access_token
      if (response.access_token && response.user) {
        localStorage.setItem('accessToken', response.access_token);
        localStorage.setItem('refreshToken', response.refresh_token);
        localStorage.setItem('tokenExpiry', response.expires_at);
        
        setUser(response.user);
        setIsAuthenticated(true);
        return { success: true };
      } else {
        // Handle error response from backend
        return { success: false, error: response.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error occurred' };
    }
  };

  const logout = async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken) {
        await authAPI.logout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('tokenExpiry');
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await authAPI.changePassword(currentPassword, newPassword);
      if (response.success) {
        // Logout after password change as per API behavior
        await logout();
        return { success: true };
      } else {
        return { success: false, error: response.error || 'Password change failed' };
      }
    } catch (error) {
      console.error('Password change error:', error);
      return { success: false, error: 'Network error occurred' };
    }
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    changePassword,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
