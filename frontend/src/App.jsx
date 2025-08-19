import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './App.css';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} 
      />
      <Route 
        path="/dashboard" 
        element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/dashboard/realms" 
        element={isAuthenticated ? <Dashboard currentRoute="realms" /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/dashboard/clients" 
        element={isAuthenticated ? <Dashboard currentRoute="clients" /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/dashboard/users" 
        element={isAuthenticated ? <Dashboard currentRoute="users" /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/dashboard/roles" 
        element={isAuthenticated ? <Dashboard currentRoute="roles" /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/dashboard/system" 
        element={isAuthenticated ? <Dashboard currentRoute="system" /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/" 
        element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} 
      />
    </Routes>
  );
}

export default App;
