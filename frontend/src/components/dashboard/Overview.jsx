import { 
  Users, 
  Globe, 
  Building2, 
  Shield,
  Activity,
  TrendingUp,
  Clock
} from 'lucide-react';

function Overview() {
  // Mock data - in a real app, this would come from API
  const stats = [
    {
      name: 'Total Realms',
      value: '3',
      change: '+12%',
      changeType: 'positive',
      icon: Globe,
      description: 'Active realms in the system'
    },
    {
      name: 'Total Clients',
      value: '24',
      change: '+8%',
      changeType: 'positive',
      icon: Building2,
      description: 'Registered client applications'
    },
    {
      name: 'Total Users',
      value: '156',
      change: '+23%',
      changeType: 'positive',
      icon: Users,
      description: 'Active user accounts'
    },
    {
      name: 'System Health',
      value: '98%',
      change: '+2%',
      changeType: 'positive',
      icon: Shield,
      description: 'Overall system performance'
    }
  ];

  const recentActivity = [
    {
      id: 1,
      type: 'realm_created',
      message: 'New realm "production" was created',
      time: '2 minutes ago',
      user: 'admin@admin.com'
    },
    {
      id: 2,
      type: 'user_login',
      message: 'User login from 192.168.1.100',
      time: '5 minutes ago',
      user: 'user@example.com'
    },
    {
      id: 3,
      type: 'realm_updated',
      message: 'Realm "development" settings updated',
      time: '1 hour ago',
      user: 'admin@admin.com'
    },
    {
      id: 4,
      type: 'client_registered',
      message: 'New client "web-app" registered',
      time: '2 hours ago',
      user: 'admin@admin.com'
    },
    {
      id: 5,
      type: 'system_backup',
      message: 'System backup completed successfully',
      time: '4 hours ago',
      user: 'system'
    }
  ];

  const getActivityIcon = (type) => {
    switch (type) {
      case 'realm_created':
      case 'realm_updated':
        return <Globe className="h-4 w-4 text-blue-600" />;
      case 'user_login':
        return <Users className="h-4 w-4 text-green-600" />;
      case 'client_registered':
        return <Building2 className="h-4 w-4 text-purple-600" />;
      case 'system_backup':
        return <Shield className="h-4 w-4 text-orange-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-600 to-indigo-600 rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Welcome back, Admin!</h1>
        <p className="text-primary-100 text-lg">
          Here's what's happening with your Auth Builder system today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{stat.description}</p>
                </div>
                <div className="h-12 w-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Icon className="h-6 w-6 text-primary-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <TrendingUp className={`h-4 w-4 ${
                  stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                }`} />
                <span className={`text-sm font-medium ml-1 ${
                  stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.change}
                </span>
                <span className="text-sm text-gray-500 ml-1">from last month</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          <p className="text-sm text-gray-500">Latest system events and user actions</p>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex-shrink-0 mt-1">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-500">{activity.user}</span>
                    <span className="text-gray-300">•</span>
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="h-3 w-3 mr-1" />
                      {activity.time}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Globe className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Create Realm</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Set up a new realm to organize your applications and users.
          </p>
          <button className="btn btn-primary btn-sm w-full">
            Create New Realm
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Register Client</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Add a new client application to your authentication system.
          </p>
          <button className="btn btn-success btn-sm w-full">
            Register Client
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Add User</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Create new user accounts with appropriate roles and permissions.
          </p>
          <button className="btn btn-secondary btn-sm w-full">
            Add New User
          </button>
        </div>
      </div>
    </div>
  );
}

export default Overview;
