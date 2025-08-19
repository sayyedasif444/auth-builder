import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, Search, Filter, MoreVertical, Edit, Trash2, Building2,
  CheckCircle, XCircle, Loader2, Globe, Eye, EyeOff, Crown, User, Users as UsersIcon, Shield
} from 'lucide-react';
import { usersAPI, realmsAPI, clientsAPI } from '../../services/api';
import UserModal from './UserModal';
import DeleteConfirmModal from '../common/DeleteConfirmModal';

function Users() {
  console.log('Users component rendering...');
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [selectedRealm, setSelectedRealm] = useState('all');
  const [selectedClient, setSelectedClient] = useState('all');

  const queryClient = useQueryClient();

  console.log('Users component state initialized');

  // Fetch users with filters
  const { data: usersResponse, isLoading, error } = useQuery({
    queryKey: ['users', { searchTerm, filterStatus, filterType, selectedRealm, selectedClient }],
    queryFn: () => {
      console.log('Fetching users...');
      return usersAPI.getAll({
        search: searchTerm || undefined,
        is_active: filterStatus === 'all' ? undefined : filterStatus === 'active',
        is_super_user: filterType === 'all' ? undefined : filterType === 'super',
        realm_id: selectedRealm === 'all' ? undefined : parseInt(selectedRealm),
        client_id: selectedClient === 'all' ? undefined : parseInt(selectedClient)
      });
    }
  });

  // Extract users array from response
  const users = Array.isArray(usersResponse) ? usersResponse : (usersResponse?.data || usersResponse?.users || []);

  console.log('Users query result:', { usersResponse, users, isLoading, error });

  // Fetch realms for filter
  const { data: realmsResponse } = useQuery({
    queryKey: ['realms'],
    queryFn: () => {
      console.log('Fetching realms...');
      return realmsAPI.getAll();
    }
  });

  // Extract realms array from response
  const realms = Array.isArray(realmsResponse) ? realmsResponse : (realmsResponse?.data || realmsResponse?.realms || []);

  console.log('Realms query result:', { realmsResponse, realms });

  // Fetch clients for filter
  const { data: clientsResponse } = useQuery({
    queryKey: ['clients'],
    queryFn: () => {
      console.log('Fetching clients...');
      return clientsAPI.getAll();
    }
  });

  // Extract clients array from response
  const clients = Array.isArray(clientsResponse) ? clientsResponse : (clientsResponse?.data || clientsResponse?.clients || []);

  console.log('Clients query result:', { clientsResponse, clients });

  // Fetch user stats
  const { data: stats } = useQuery({
    queryKey: ['userStats', { selectedRealm, selectedClient }],
    queryFn: () => usersAPI.getStats({
      realm_id: selectedRealm === 'all' ? undefined : parseInt(selectedRealm),
      client_id: selectedClient === 'all' ? undefined : parseInt(selectedClient)
    })
  });

  console.log('Stats query result:', { stats });

  // Simple fallback render to ensure component always shows something
  if (!users || !realms || !clients) {
    console.log('Data not ready yet, showing fallback');
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users</h1>
            <p className="text-gray-600">Manage system users and their permissions</p>
          </div>
        </div>
        <div className="text-center py-12">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">Loading users...</p>
        </div>
      </div>
    );
  }

  // Ensure we have arrays
  if (!Array.isArray(users) || !Array.isArray(realms) || !Array.isArray(clients)) {
    console.log('Data is not in expected array format:', { users, realms, clients });
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users</h1>
            <p className="text-gray-600">Manage system users and their permissions</p>
          </div>
        </div>
        <div className="text-center py-12">
          <XCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Data Format Error</h3>
          <p className="mt-1 text-sm text-gray-500">Unable to load data in the expected format. Please refresh the page.</p>
        </div>
      </div>
    );
  }

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: usersAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
      setShowCreateModal(false);
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => usersAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
      setShowEditModal(false);
      setSelectedUser(null);
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: usersAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
      setShowDeleteModal(false);
      setSelectedUser(null);
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: usersAPI.toggleStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
    }
  });

  // Handlers
  const handleCreateUser = (userData) => {
    createUserMutation.mutate(userData);
  };

  const handleCreateUserSuccess = (response) => {
    if (response.generatedPassword) {
      // Show the generated password in the modal
      setSelectedUser({ ...response, generatedPassword: response.generatedPassword });
      setShowCreateModal(false);
      setShowEditModal(true); // Reuse edit modal to show password
    }
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleUpdateUser = (userData) => {
    updateUserMutation.mutate({ id: selectedUser.id, data: userData });
  };

  const handleDeleteUser = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (selectedUser) {
      deleteUserMutation.mutate(selectedUser.id);
    }
  };

  const handleToggleStatus = (userId) => {
    toggleStatusMutation.mutate(userId);
  };

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && user.is_active) ||
      (filterStatus === 'inactive' && !user.is_active);
    
    const matchesType = filterType === 'all' || 
      (filterType === 'super' && user.is_super_user) ||
      (filterType === 'realm' && !user.is_super_user);
    
    const matchesRealm = selectedRealm === 'all' || user.realm_id === parseInt(selectedRealm);
    const matchesClient = selectedClient === 'all' || user.client_id === parseInt(selectedClient);
    
    return matchesSearch && matchesStatus && matchesType && matchesRealm && matchesClient;
  });

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users</h1>
            <p className="text-gray-600">Manage system users and their permissions</p>
          </div>
          <button className="btn btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </button>
        </div>
        <div className="text-center py-12">
          <XCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error Loading Users</h3>
          <p className="mt-1 text-sm text-gray-500">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600">Manage system users and their permissions</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <UsersIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_users}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <Crown className="h-8 w-8 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Super Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.super_users}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <User className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Realm Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.realm_users}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">{stats.active_users}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Inactive</p>
                <p className="text-2xl font-bold text-gray-900">{stats.inactive_users}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="input"
            >
              <option value="all">All Types</option>
              <option value="super">Super Users</option>
              <option value="realm">Realm Users</option>
            </select>
          </div>

          {/* Realm Filter */}
          <div>
            <select
              value={selectedRealm}
              onChange={(e) => setSelectedRealm(e.target.value)}
              className="input"
            >
              <option value="all">All Realms</option>
              {realms.map((realm) => (
                <option key={realm.id} value={realm.id}>
                  {realm.name}
                </option>
              ))}
            </select>
          </div>

          {/* Client Filter */}
          <div>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="input"
            >
              <option value="all">All Clients</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Users List */}
      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">Loading users...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12">
          <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || filterStatus !== 'all' || filterType !== 'all' || selectedRealm !== 'all' || selectedClient !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by creating your first user.'
            }
          </p>
          {!searchTerm && filterStatus === 'all' && filterType === 'all' && selectedRealm === 'all' && selectedClient === 'all' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary btn-lg mt-4"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Your First User
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user) => (
            <div key={user.id} className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      {user.is_super_user ? (
                        <Crown className="h-5 w-5 text-yellow-600 mr-2" />
                      ) : (
                        <User className="h-5 w-5 text-blue-600 mr-2" />
                      )}
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {user.first_name} {user.last_name}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 truncate">{user.email}</p>
                  </div>
                  <div className="ml-3 flex-shrink-0">
                    <div className="relative">
                      <button className="p-1 rounded-full hover:bg-gray-100">
                        <MoreVertical className="h-4 w-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* User Type & Associations */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.is_super_user 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {user.is_super_user ? 'Super User' : 'Realm User'}
                    </span>
                  </div>
                  
                  {user.realm_name && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Globe className="h-4 w-4 mr-2" />
                      Realm: {user.realm_name}
                    </div>
                  )}
                  
                  {user.client_name && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Building2 className="h-4 w-4 mr-2" />
                      Client: {user.client_name}
                    </div>
                  )}
                </div>

                {/* Roles Display */}
                {!user.is_super_user && (
                  <div className="mb-4">
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <Shield className="h-4 w-4 mr-2" />
                      Roles:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {user.roles && user.roles.length > 0 ? (
                        user.roles.map((role) => (
                          <span
                            key={role.id}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                          >
                            {role.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-500 italic">No roles assigned</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Status */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    {user.is_active ? (
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600 mr-2" />
                    )}
                    <span className={`text-sm font-medium ${
                      user.is_active ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    Created {new Date(user.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditUser(user)}
                    className="btn btn-secondary btn-sm flex-1"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleStatus(user.id)}
                    disabled={toggleStatusMutation.isPending}
                    className={`btn btn-sm flex-1 ${
                      user.is_active ? 'btn-warning' : 'btn-success'
                    }`}
                  >
                    {toggleStatusMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      user.is_active ? 'Deactivate' : 'Activate'
                    )}
                  </button>
                  {user.email !== 'admin@admin.com' && (
                    <button
                      onClick={() => handleDeleteUser(user)}
                      className="btn btn-danger btn-sm flex-1"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <UserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateUser}
        onSuccess={handleCreateUserSuccess}
        realms={realms}
        clients={clients}
        isLoading={createUserMutation.isPending}
      />

      <UserModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedUser(null);
        }}
        onSubmit={handleUpdateUser}
        user={selectedUser}
        realms={realms}
        clients={clients}
        isLoading={updateUserMutation.isPending}
        isEdit={true}
      />

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedUser(null);
        }}
        onConfirm={confirmDelete}
        title="Delete User"
        message={`Are you sure you want to delete ${selectedUser?.first_name} ${selectedUser?.last_name}? This action cannot be undone.`}
        isLoading={deleteUserMutation.isPending}
      />
    </div>
  );
}

export default Users;
