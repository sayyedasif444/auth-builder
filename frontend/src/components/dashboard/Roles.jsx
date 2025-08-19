import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, Search, Filter, MoreVertical, Edit, Trash2, Shield,
  CheckCircle, XCircle, Loader2, Eye, EyeOff, Globe
} from 'lucide-react';
import { rolesAPI, realmsAPI } from '../../services/api';
import RoleModal from './RoleModal';
import DeleteConfirmModal from '../common/DeleteConfirmModal';

function Roles() {
  console.log('Roles component is rendering');
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRealm, setFilterRealm] = useState('all');

  const queryClient = useQueryClient();

  // Fetch realms for filtering
  const { data: realmsResponse = [], error: realmsError, isLoading: realmsLoading } = useQuery({
    queryKey: ['realms'],
    queryFn: () => realmsAPI.getAll()
  });

  // Extract realms array from response
  const realms = Array.isArray(realmsResponse) ? realmsResponse : (realmsResponse?.data || realmsResponse?.realms || []);

  // Debug logging
  console.log('Roles component - realmsResponse:', realmsResponse);
  console.log('Roles component - extracted realms:', realms);
  console.log('Roles component - realmsError:', realmsError);
  console.log('Roles component - realmsLoading:', realmsLoading);

  // Fetch roles with filters
  const { data: rolesResponse = [], isLoading, error } = useQuery({
    queryKey: ['roles', { searchTerm, filterStatus, filterRealm }],
    queryFn: () => rolesAPI.getAll({
      name: searchTerm || undefined,
      realm_id: filterRealm === 'all' ? undefined : filterRealm,
      is_active: filterStatus === 'all' ? undefined : filterStatus === 'active'
    })
  });

  // Extract roles array from response
  const roles = Array.isArray(rolesResponse) ? rolesResponse : (rolesResponse?.data || rolesResponse?.roles || []);

  // Debug logging
  console.log('Roles component - rolesResponse:', rolesResponse);
  console.log('Roles component - extracted roles:', roles);
  console.log('Roles component - rolesError:', error);
  console.log('Roles component - rolesLoading:', isLoading);

  // Fetch role stats
  const { data: statsResponse } = useQuery({
    queryKey: ['roleStats', { searchTerm, filterRealm }],
    queryFn: () => rolesAPI.getStats({
      name: searchTerm || undefined,
      realm_id: filterRealm === 'all' ? undefined : filterRealm
    })
  });

  // Extract stats from response
  const stats = statsResponse?.data || statsResponse?.stats || statsResponse;

  // Fallback render if data is not available
  if (!realms || !Array.isArray(realms)) {
    console.warn('Roles component - realms is not an array:', realms);
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Roles</h1>
            <p className="text-gray-600">Manage realm-specific roles and their access permissions</p>
          </div>
        </div>
        <div className="text-center py-12">
          <Shield className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Loading Realms...</h3>
          <p className="mt-1 text-sm text-gray-500">Please wait while we load the available realms.</p>
          <div className="mt-4 text-sm text-gray-500">
            <p>Debug info:</p>
            <p>realmsResponse: {JSON.stringify(realmsResponse)}</p>
            <p>realmsError: {JSON.stringify(realmsError)}</p>
            <p>realmsLoading: {realmsLoading}</p>
          </div>
        </div>
      </div>
    );
  }

  // Mutations
  const createRoleMutation = useMutation({
    mutationFn: rolesAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['roleStats'] });
      setShowCreateModal(false);
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }) => rolesAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['roleStats'] });
      setShowEditModal(false);
      setSelectedRole(null);
    }
  });

  const deleteRoleMutation = useMutation({
    mutationFn: rolesAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['roleStats'] });
      setShowDeleteModal(false);
      setSelectedRole(null);
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: rolesAPI.toggleStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['roleStats'] });
    }
  });

  // Handlers
  const handleCreateRole = (roleData) => {
    createRoleMutation.mutate(roleData);
  };

  const handleEditRole = (role) => {
    setSelectedRole(role);
    setShowEditModal(true);
  };

  const handleUpdateRole = (roleData) => {
    updateRoleMutation.mutate({ id: selectedRole.id, data: roleData });
  };

  const handleDeleteRole = (role) => {
    setSelectedRole(role);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (selectedRole) {
      deleteRoleMutation.mutate(selectedRole.id);
    }
  };

  const handleToggleStatus = (roleId) => {
    toggleStatusMutation.mutate(roleId);
  };

  // Filter roles based on search and filters
  const filteredRoles = roles.filter(role => {
    const matchesSearch = !searchTerm || 
      role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && role.is_active) ||
      (filterStatus === 'inactive' && !role.is_active);
    
    const matchesRealm = filterRealm === 'all' || 
      role.realm_id === parseInt(filterRealm);
    
    return matchesSearch && matchesStatus && matchesRealm;
  });

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Roles</h1>
            <p className="text-gray-600">Manage realm-specific roles and their access permissions</p>
          </div>
          <button className="btn btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Add Role
          </button>
        </div>
        <div className="text-center py-12">
          <XCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error Loading Roles</h3>
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
          <h1 className="text-2xl font-bold text-gray-900">Roles</h1>
          <p className="text-gray-600">Manage realm-specific roles and their access permissions</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Role
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Roles</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_roles}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">{stats.active_roles}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Inactive</p>
                <p className="text-2xl font-bold text-gray-900">{stats.inactive_roles}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search roles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
          </div>

          {/* Realm Filter */}
          <div>
            <select
              value={filterRealm}
              onChange={(e) => setFilterRealm(e.target.value)}
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
        </div>
      </div>

      {/* Roles List */}
      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">Loading roles...</p>
        </div>
      ) : filteredRoles.length === 0 ? (
        <div className="text-center py-12">
          <Shield className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No roles found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || filterStatus !== 'all' || filterRealm !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by creating your first role.'
            }
          </p>
          {!searchTerm && filterStatus === 'all' && filterRealm === 'all' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary btn-lg mt-4"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Your First Role
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRoles.map((role) => (
            <div key={role.id} className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <Shield className="h-5 w-5 text-blue-600 mr-2" />
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {role.name}
                      </h3>
                    </div>
                    {role.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {role.description}
                      </p>
                    )}
                    {/* Realm Info */}
                    <div className="flex items-center mt-2 text-sm text-gray-500">
                      <Globe className="h-4 w-4 mr-1" />
                      <span>{role.realm_name || 'Unknown Realm'}</span>
                    </div>
                  </div>
                  <div className="ml-3 flex-shrink-0">
                    <div className="relative">
                      <button className="p-1 rounded-full hover:bg-gray-100">
                        <MoreVertical className="h-4 w-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Access Permissions */}
                <div className="space-y-2 mb-4">
                  <h4 className="text-sm font-medium text-gray-700">Access Permissions:</h4>
                  {role.access && role.access.map((module, index) => (
                    <div key={index} className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      <div className="font-medium">{module.module}</div>
                      <div className="text-xs text-gray-500">
                        Rights: <span className="font-medium">{module.rights}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        APIs: {module.uri.length} endpoint(s)
                      </div>
                    </div>
                  ))}
                </div>

                {/* Status */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    {role.is_active ? (
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600 mr-2" />
                    )}
                    <span className={`text-sm font-medium ${
                      role.is_active ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {role.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    Created {new Date(role.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditRole(role)}
                    className="btn btn-secondary btn-sm flex-1"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleStatus(role.id)}
                    disabled={toggleStatusMutation.isPending}
                    className={`btn btn-sm flex-1 ${
                      role.is_active ? 'btn-warning' : 'btn-success'
                    }`}
                  >
                    {toggleStatusMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      role.is_active ? 'Deactivate' : 'Activate'
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteRole(role)}
                    className="btn btn-danger btn-sm flex-1"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <RoleModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateRole}
        isLoading={createRoleMutation.isPending}
        realms={realms}
      />

      <RoleModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedRole(null);
        }}
        onSubmit={handleUpdateRole}
        role={selectedRole}
        isLoading={updateRoleMutation.isPending}
        isEdit={true}
        realms={realms}
      />

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedRole(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Role"
        message={`Are you sure you want to delete the role "${selectedRole?.name}"? This action cannot be undone.`}
        isLoading={deleteRoleMutation.isPending}
      />
    </div>
  );
}

export default Roles;
