import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, Globe, Building2, Users as UsersIcon, Shield, Settings, LogOut, Menu, X
} from 'lucide-react';
import { useState } from 'react';
import Overview from './dashboard/Overview';
import Realms from './dashboard/Realms';
import Clients from './dashboard/Clients';
import Users from './dashboard/Users';
import Roles from './dashboard/Roles';
import SystemConfig from './dashboard/SystemConfig';

// NavItem component for navigation items
function NavItem({ icon, label, path, isActive, onClick }) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
    // Navigate using window.location.href
    window.location.href = path;
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
        isActive
          ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-700'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      {icon}
      <span className="ml-3">{label}</span>
    </button>
  );
}

function Dashboard({ currentRoute = 'overview' }) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  // Function to get current page title
  const getCurrentPageTitle = () => {
    switch (currentRoute) {
      case 'overview':
      case undefined:
        return 'Overview';
      case 'realms':
        return 'Realms';
      case 'clients':
        return 'Clients';
      case 'users':
        return 'Users';
      case 'roles':
        return 'Roles';
      case 'system':
        return 'System Configuration';
      default:
        return 'Dashboard';
    }
  };

  // Function to check if a route is active
  const isRouteActive = (route) => {
    if (route === 'overview' || route === undefined) {
      return currentRoute === 'overview' || currentRoute === undefined;
    }
    return currentRoute === route;
  };

  // Function to render the current page content
  const renderPageContent = () => {
    switch (currentRoute) {
      case 'realms':
        return <Realms />;
      case 'clients':
        return <Clients />;
      case 'users':
        return <Users />;
      case 'roles':
        return <Roles />;
      case 'system':
        return <SystemConfig />;
      default:
        return <Overview />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-gradient-to-r from-primary-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Auth Builder</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="space-y-2">
          <NavItem 
            icon={<LayoutDashboard className="h-5 w-5" />} 
            label="Overview" 
            path="/dashboard" 
            isActive={isRouteActive('overview')}
            onClick={() => setSidebarOpen(false)}
          />
          <NavItem 
            icon={<Globe className="h-5 w-5" />} 
            label="Realms" 
            path="/dashboard/realms" 
            isActive={isRouteActive('realms')}
            onClick={() => setSidebarOpen(false)}
          />
          <NavItem 
            icon={<Building2 className="h-5 w-5" />} 
            label="Clients" 
            path="/dashboard/clients" 
            isActive={isRouteActive('clients')}
            onClick={() => setSidebarOpen(false)}
          />
          <NavItem 
            icon={<UsersIcon className="h-5 w-5" />} 
            label="Users" 
            path="/dashboard/users" 
            isActive={isRouteActive('users')}
            onClick={() => setSidebarOpen(false)}
          />
          <NavItem 
            icon={<Shield className="h-5 w-5" />} 
            label="Roles" 
            path="/dashboard/roles" 
            isActive={isRouteActive('roles')}
            onClick={() => setSidebarOpen(false)}
          />
          <NavItem 
            icon={<Settings className="h-5 w-5" />} 
            label="System Config" 
            path="/dashboard/system" 
            isActive={isRouteActive('system')}
            onClick={() => setSidebarOpen(false)}
          />
        </nav>

        {/* User info and logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-10 w-10 bg-gradient-to-r from-primary-600 to-indigo-600 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-white">
                {user?.email?.charAt(0).toUpperCase() || 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.email || 'Admin User'}
              </p>
              <p className="text-xs text-gray-500">
                {user?.is_super_user ? 'Super User' : 'User'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <div className="sticky top-0 z-30 bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <Menu className="h-6 w-6" />
            </button>
            
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-gray-900">
                {getCurrentPageTitle()}
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-3">
                <div className="h-8 w-8 bg-gradient-to-r from-primary-600 to-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user?.email?.charAt(0).toUpperCase() || 'A'}
                  </span>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{user?.email || 'Admin User'}</p>
                  <p className="text-gray-500">{user?.is_super_user ? 'Super User' : 'User'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {renderPageContent()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
