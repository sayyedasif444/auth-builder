import { useState, useEffect } from 'react';
import { X, Loader2, Crown, User, Globe, Building2, Shield } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { rolesAPI } from '../../services/api';

function UserModal({ isOpen, onClose, onSubmit, onSuccess, user, realms, clients, isLoading, isEdit = false }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    is_super_user: false,
    realm_id: '',
    client_id: '',
    is_active: true
  });

  const [selectedRoles, setSelectedRoles] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showGeneratedPassword, setShowGeneratedPassword] = useState(false);

  // Fetch available roles for the selected realm
  const { data: availableRoles = [] } = useQuery({
    queryKey: ['roles', formData.realm_id],
    queryFn: () => formData.realm_id ? rolesAPI.getAll({ realm_id: formData.realm_id }) : [],
    enabled: !!formData.realm_id && !formData.is_super_user
  });

  // Fetch current user roles when editing
  const { data: currentUserRoles = [] } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: () => user?.id ? rolesAPI.getUserRoles(user.id) : [],
    enabled: !!user?.id && isEdit
  });

  useEffect(() => {
    if (user && isEdit) {
      setFormData({
        email: user.email || '',
        password: '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        is_super_user: user.is_super_user || false,
        realm_id: user.realm_id || '',
        client_id: user.client_id || '',
        is_active: user.is_active !== undefined ? user.is_active : true
      });
      // Set selected roles from current user roles - only if currentUserRoles is available
      if (currentUserRoles && currentUserRoles.length > 0) {
        setSelectedRoles(currentUserRoles.map(role => role.id));
      }
    } else {
      setFormData({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        is_super_user: false,
        realm_id: '',
        client_id: '',
        is_active: true
      });
      setSelectedRoles([]);
    }
    setGeneratedPassword('');
    setShowGeneratedPassword(false);
  }, [user, isEdit]); // Removed currentUserRoles from dependencies

  // Separate useEffect to handle role assignment when currentUserRoles changes
  useEffect(() => {
    if (isEdit && user && currentUserRoles && currentUserRoles.length > 0) {
      setSelectedRoles(currentUserRoles.map(role => role.id));
    }
  }, [currentUserRoles, isEdit, user]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    let finalValue = value;
    
    // Handle radio buttons for boolean values
    if (name === 'is_super_user') {
      finalValue = value === 'true';
    }
    
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: type === 'checkbox' ? checked : finalValue
      };
      return newData;
    });

    // Reset client_id when realm_id changes
    if (name === 'realm_id') {
      setFormData(prev => ({
        ...prev,
        client_id: ''
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // For non-super users, don't send password if it's empty (will be auto-generated)
    const submitData = { ...formData };
    if (!formData.is_super_user && !formData.password) {
      delete submitData.password;
    }
    
    // Add selected roles to the submission data
    if (!formData.is_super_user && selectedRoles.length > 0) {
      submitData.roles = selectedRoles;
    }
    
    onSubmit(submitData);
  };

  const handleSuccess = (response) => {
    if (response.generatedPassword) {
      setGeneratedPassword(response.generatedPassword);
      setShowGeneratedPassword(true);
    }
  };

  // Filter clients based on selected realm
  const filteredClients = formData.realm_id 
    ? clients.filter(client => client.realm_id === parseInt(formData.realm_id))
    : [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEdit ? 'Edit User' : 'Create New User'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* User Type Selection */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              User Type
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="is_super_user"
                  value="false"
                  checked={formData.is_super_user === false}
                  onChange={handleInputChange}
                  className="mr-2 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                />
                <User className="h-4 w-4 mr-2 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Realm User</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="is_super_user"
                  value="true"
                  checked={formData.is_super_user === true}
                  onChange={handleInputChange}
                  className="mr-2 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                />
                <Crown className="h-4 w-4 mr-2 text-yellow-600" />
                <span className="text-sm font-medium text-gray-700">Super User</span>
              </label>
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name *
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleInputChange}
                required
                className="input w-full"
                placeholder="Enter first name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name *
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleInputChange}
                required
                className="input w-full"
                placeholder="Enter last name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="input w-full"
              placeholder="Enter email address"
            />
          </div>

          {/* Password Field - Only for Super Users or when editing */}
          {(formData.is_super_user || isEdit) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password {!isEdit && '(Leave empty for auto-generation)'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="input w-full pr-10"
                  placeholder={isEdit ? 'Enter new password' : 'Leave empty for auto-generation'}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {!isEdit && !formData.is_super_user && (
                <p className="text-sm text-gray-500 mt-1">
                  Password will be automatically generated and sent to the user's email
                </p>
              )}
            </div>
          )}

          {/* Realm and Client Selection - Only for Realm Users */}
          {!formData.is_super_user && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Realm
                </label>
                <select
                  name="realm_id"
                  value={formData.realm_id}
                  onChange={handleInputChange}
                  className="input w-full"
                >
                  <option value="">Select a realm (optional)</option>
                  {realms.map((realm) => (
                    <option key={realm.id} value={realm.id}>
                      {realm.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client
                </label>
                <select
                  name="client_id"
                  value={formData.client_id}
                  onChange={handleInputChange}
                  className="input w-full"
                  disabled={!formData.realm_id}
                >
                  <option value="">Select a client (optional)</option>
                  {filteredClients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
                {!formData.realm_id && (
                  <p className="text-sm text-gray-500 mt-1">
                    Select a realm first to choose a client
                  </p>
                )}
              </div>
            </>
          )}

          {/* Role Selection - Only show for non-super users with a realm */}
          {!formData.is_super_user && formData.realm_id && availableRoles.length > 0 && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                <Shield className="h-4 w-4 inline mr-2" />
                Assign Roles
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {availableRoles.map((role) => (
                  <label key={role.id} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(role.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRoles(prev => [...prev, role.id]);
                        } else {
                          setSelectedRoles(prev => prev.filter(id => id !== role.id));
                        }
                      }}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">{role.name}</span>
                    {role.description && (
                      <span className="text-xs text-gray-500">({role.description})</span>
                    )}
                  </label>
                ))}
              </div>
              {availableRoles.length === 0 && (
                <p className="text-sm text-gray-500">
                  No roles available for the selected realm
                </p>
              )}
            </div>
          )}

          {/* Active Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleInputChange}
              className="mr-2"
            />
            <label className="text-sm font-medium text-gray-700">
              User is active
            </label>
          </div>

          {/* Generated Password Display */}
          {showGeneratedPassword && generatedPassword && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-green-800 mb-2">
                User Created Successfully!
              </h3>
              <p className="text-sm text-green-700 mb-3">
                The user has been created and a welcome email has been sent. Here's the generated password:
              </p>
              <div className="bg-white border border-green-300 rounded p-3">
                <code className="text-lg font-mono text-green-800">
                  {generatedPassword}
                </code>
              </div>
              <p className="text-sm text-green-600 mt-2">
                Please save this password securely. It has also been sent to the user's email.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary btn-md"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary btn-md"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {isEdit ? 'Updating...' : 'Creating...'}
                </div>
              ) : (
                isEdit ? 'Update User' : 'Create User'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UserModal;
