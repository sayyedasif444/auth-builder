import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Building2,
  CheckCircle,
  XCircle,
  Loader2,
  Globe,
  Eye,
  EyeOff,
  RefreshCw,
  Copy,
  Mail,
  Shield,
  Settings
} from 'lucide-react';
import { clientsAPI, realmsAPI } from '../../services/api';
import ClientModal from './ClientModal';
import DeleteConfirmModal from '../common/DeleteConfirmModal';

function Clients() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [deletingClient, setDeletingClient] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedRealm, setSelectedRealm] = useState('all');
  const [showSecrets, setShowSecrets] = useState({});

  const queryClient = useQueryClient();

  // Fetch realms for selection
  const { data: realmsData } = useQuery({
    queryKey: ['realms'],
    queryFn: realmsAPI.getAll,
  });

  // Fetch clients
  const { data: clientsData, isLoading, error } = useQuery({
    queryKey: ['clients', selectedRealm],
    queryFn: () => clientsAPI.getAll(selectedRealm === 'all' ? null : selectedRealm),
  });

  // Mutations
  const createClientMutation = useMutation({
    mutationFn: clientsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
      setShowCreateModal(false);
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: ({ id, data }) => clientsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
      setEditingClient(null);
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: clientsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
      setDeletingClient(null);
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: clientsAPI.toggleStatus,
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
    },
  });

  const regenerateSecretMutation = useMutation({
    mutationFn: clientsAPI.regenerateSecret,
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
    },
  });

  const clients = clientsData?.data || [];
  const realms = realmsData?.data || [];

  // Filter and search clients
  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (client.description && client.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && client.is_active) ||
                         (filterStatus === 'inactive' && !client.is_active);
    
    return matchesSearch && matchesStatus;
  });

  const handleCreateClient = (clientData) => {
    createClientMutation.mutate(clientData);
  };

  const handleUpdateClient = (clientData) => {
    updateClientMutation.mutate({ id: editingClient.id, data: clientData });
  };

  const handleDeleteClient = () => {
    if (deletingClient) {
      deleteClientMutation.mutate(deletingClient.id);
    }
  };

  const handleToggleStatus = (clientId) => {
    toggleStatusMutation.mutate(clientId);
  };

  const handleRegenerateSecret = (clientId) => {
    regenerateSecretMutation.mutate(clientId);
  };

  const openEditModal = (client) => {
    setEditingClient(client);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const toggleSecretVisibility = (clientId) => {
    setShowSecrets(prev => ({
      ...prev,
      [clientId]: !prev[clientId]
    }));
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
        <h3 className="text-lg font-medium text-red-800 mb-2">Error loading clients</h3>
        <p className="text-red-600">Failed to load clients. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600 mt-1">
            Manage OAuth clients and their authentication configurations
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary btn-lg mt-4 sm:mt-0"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create Client
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
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
          </div>

          {/* Realm Filter */}
          <div className="sm:w-48">
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

      {/* Clients Grid */}
      {filteredClients.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || filterStatus !== 'all' || selectedRealm !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by creating your first client.'
            }
          </p>
          {!searchTerm && filterStatus === 'all' && selectedRealm === 'all' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary btn-lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Your First Client
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <div key={client.id} className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Building2 className="h-5 w-5 text-primary-600" />
                      <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        client.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {client.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      Realm: <span className="font-medium">{client.realm_name}</span>
                    </p>
                    {client.description && (
                      <p className="text-sm text-gray-600">{client.description}</p>
                    )}
                  </div>
                  
                  {/* Actions Menu */}
                  <div className="relative">
                    <button className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Client ID and Secret */}
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Client ID</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={client.client_id}
                        readOnly
                        className="input text-xs bg-gray-50"
                      />
                      <button
                        onClick={() => copyToClipboard(client.client_id)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
                        title="Copy Client ID"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Client Secret</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type={showSecrets[client.id] ? "text" : "password"}
                        value={client.client_secret}
                        readOnly
                        className="input text-xs bg-gray-50"
                      />
                      <button
                        onClick={() => toggleSecretVisibility(client.id)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
                        title={showSecrets[client.id] ? "Hide Secret" : "Show Secret"}
                      >
                        {showSecrets[client.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => handleRegenerateSecret(client.id)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
                        title="Regenerate Secret"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center space-x-2">
                    <Shield className={`h-4 w-4 ${client.sso_enabled ? 'text-green-600' : 'text-gray-400'}`} />
                    <span className="text-sm text-gray-600">
                      SSO: {client.sso_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Settings className={`h-4 w-4 ${client.twofa_enabled ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className="text-sm text-gray-600">
                      2FA: {client.twofa_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  {client.twofa_enabled && client.smtp_config && (
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-gray-600">
                        SMTP: {client.smtp_config.host}:{client.smtp_config.port}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => openEditModal(client)}
                    className="btn btn-secondary btn-sm flex-1"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleStatus(client.id)}
                    className={`btn btn-sm flex-1 ${
                      client.is_active ? 'btn-danger' : 'btn-success'
                    }`}
                  >
                    {client.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => setDeletingClient(client)}
                    className="btn btn-danger btn-sm"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <ClientModal
        isOpen={showCreateModal || !!editingClient}
        onClose={() => {
          setShowCreateModal(false);
          setEditingClient(null);
        }}
        onSubmit={editingClient ? handleUpdateClient : handleCreateClient}
        client={editingClient}
        realms={realms}
        isLoading={createClientMutation.isPending || updateClientMutation.isPending}
      />

      <DeleteConfirmModal
        isOpen={!!deletingClient}
        onClose={() => setDeletingClient(null)}
        onConfirm={handleDeleteClient}
        title="Delete Client"
        message={`Are you sure you want to delete "${deletingClient?.name}"? This action cannot be undone.`}
        isLoading={deleteClientMutation.isPending}
      />
    </div>
  );
}

export default Clients;
