import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Globe,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { realmsAPI } from '../../services/api';
import RealmModal from './RealmModal';
import DeleteConfirmModal from '../common/DeleteConfirmModal';

function Realms() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRealm, setEditingRealm] = useState(null);
  const [deletingRealm, setDeletingRealm] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  
  const queryClient = useQueryClient();

  // Fetch realms
  const { data: realmsData, isLoading, error } = useQuery({
    queryKey: ['realms'],
    queryFn: realmsAPI.getAll,
  });

  // Create realm mutation
  const createRealmMutation = useMutation({
    mutationFn: realmsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['realms']);
      setShowCreateModal(false);
    },
  });

  // Update realm mutation
  const updateRealmMutation = useMutation({
    mutationFn: ({ id, data }) => realmsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['realms']);
      setEditingRealm(null);
    },
  });

  // Delete realm mutation
  const deleteRealmMutation = useMutation({
    mutationFn: realmsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['realms']);
      setDeletingRealm(null);
    },
  });

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: realmsAPI.toggleStatus,
    onSuccess: () => {
      queryClient.invalidateQueries(['realms']);
    },
  });

  const realms = realmsData?.data || [];
  
  // Filter and search realms
  const filteredRealms = realms.filter(realm => {
    const matchesSearch = realm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (realm.description && realm.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && realm.is_active) ||
                         (filterStatus === 'inactive' && !realm.is_active);
    
    return matchesSearch && matchesStatus;
  });

  const handleCreateRealm = (realmData) => {
    createRealmMutation.mutate(realmData);
  };

  const handleUpdateRealm = (realmData) => {
    updateRealmMutation.mutate({ id: editingRealm.id, data: realmData });
  };

  const handleDeleteRealm = () => {
    if (deletingRealm) {
      deleteRealmMutation.mutate(deletingRealm.id);
    }
  };

  const handleToggleStatus = (realmId) => {
    toggleStatusMutation.mutate(realmId);
  };

  const openEditModal = (realm) => {
    setEditingRealm(realm);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-red-800 mb-2">Error loading realms</h3>
        <p className="text-red-600">Failed to load realms. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Realms</h1>
          <p className="text-gray-600 mt-1">
            Manage your authentication realms and their configurations
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary btn-lg mt-4 sm:mt-0"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create Realm
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search realms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="sm:w-48">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Realms Grid */}
      {filteredRealms.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No realms found</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || filterStatus !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by creating your first realm.'
            }
          </p>
          {!searchTerm && filterStatus === 'all' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary btn-lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Your First Realm
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRealms.map((realm) => (
            <div key={realm.id} className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {realm.name}
                    </h3>
                    {realm.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {realm.description}
                      </p>
                    )}
                  </div>
                  <div className="ml-3 flex-shrink-0">
                    <div className="relative">
                      <button className="p-1 rounded-full hover:bg-gray-100">
                        <MoreVertical className="h-4 w-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">
                      {realm.client_count || 0}
                    </div>
                    <div className="text-xs text-gray-500">Clients</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">
                      {realm.user_count || 0}
                    </div>
                    <div className="text-xs text-gray-500">Users</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">
                      {realm.role_count || 0}
                    </div>
                    <div className="text-xs text-gray-500">Roles</div>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    {realm.is_active ? (
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600 mr-2" />
                    )}
                    <span className={`text-sm font-medium ${
                      realm.is_active ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {realm.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    Created {new Date(realm.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => openEditModal(realm)}
                    className="btn btn-secondary btn-sm flex-1"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleStatus(realm.id)}
                    disabled={toggleStatusMutation.isPending}
                    className={`btn btn-sm flex-1 ${
                      realm.is_active ? 'btn-warning' : 'btn-success'
                    }`}
                  >
                    {toggleStatusMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      realm.is_active ? 'Deactivate' : 'Activate'
                    )}
                  </button>
                  <button
                    onClick={() => setDeletingRealm(realm)}
                    className="btn btn-danger btn-sm"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingRealm) && (
        <RealmModal
          isOpen={showCreateModal || !!editingRealm}
          onClose={() => {
            setShowCreateModal(false);
            setEditingRealm(null);
          }}
          onSubmit={editingRealm ? handleUpdateRealm : handleCreateRealm}
          realm={editingRealm}
          isLoading={createRealmMutation.isPending || updateRealmMutation.isPending}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingRealm && (
        <DeleteConfirmModal
          isOpen={!!deletingRealm}
          onClose={() => setDeletingRealm(null)}
          onConfirm={handleDeleteRealm}
          title="Delete Realm"
          message={`Are you sure you want to delete the realm "${deletingRealm.name}"? This action cannot be undone.`}
          isLoading={deleteRealmMutation.isPending}
        />
      )}
    </div>
  );
}

export default Realms;
