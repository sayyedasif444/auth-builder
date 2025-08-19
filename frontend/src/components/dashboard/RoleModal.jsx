import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';

function RoleModal({ isOpen, onClose, onSubmit, role, isLoading, isEdit = false, realms = [] }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    realm_id: '',
    access: []
  });

  const [errors, setErrors] = useState({});

  // Debug logging
  console.log('RoleModal - realms prop:', realms);

  // Fallback render if realms is not available
  if (!realms || !Array.isArray(realms)) {
    console.warn('RoleModal - realms is not an array:', realms);
    return (
      <div className={`fixed inset-0 z-50 overflow-y-auto ${isOpen ? 'block' : 'hidden'}`}>
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 transition-opacity" aria-hidden="true">
            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
          </div>
          <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="text-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Loading Realms...</h3>
                <p className="text-sm text-gray-500">Please wait while we load the available realms.</p>
                <div className="mt-4 text-xs text-gray-400">
                  <p>Debug info:</p>
                  <p>realms: {JSON.stringify(realms)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (role && isEdit) {
      setFormData({
        name: role.name || '',
        description: role.description || '',
        realm_id: role.realm_id || '',
        access: role.access ? [...role.access] : []
      });
    } else {
      setFormData({
        name: '',
        description: '',
        realm_id: '',
        access: []
      });
    }
    setErrors({});
  }, [role, isEdit]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const addAccessModule = () => {
    setFormData(prev => ({
      ...prev,
      access: [...prev.access, {
        module: '',
        rights: 'READ',
        uri: []
      }]
    }));
  };

  const removeAccessModule = (moduleIndex) => {
    setFormData(prev => ({
      ...prev,
      access: prev.access.filter((_, index) => index !== moduleIndex)
    }));
  };

  const updateAccessModule = (moduleIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      access: prev.access.map((module, index) => 
        index === moduleIndex ? { ...module, [field]: value } : module
      )
    }));
  };

  const addUri = (moduleIndex) => {
    setFormData(prev => ({
      ...prev,
      access: prev.access.map((module, index) => 
        index === moduleIndex 
          ? { ...module, uri: [...module.uri, { url: '', methods: ['GET'] }] }
          : module
      )
    }));
  };

  const removeUri = (moduleIndex, uriIndex) => {
    setFormData(prev => ({
      ...prev,
      access: prev.access.map((module, index) => 
        index === moduleIndex 
          ? { ...module, uri: module.uri.filter((_, uIndex) => uIndex !== uriIndex) }
          : module
      )
    }));
  };

  const updateUri = (moduleIndex, uriIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      access: prev.access.map((module, index) => 
        index === moduleIndex 
          ? { 
              ...module, 
              uri: module.uri.map((uri, uIndex) => 
                uIndex === uriIndex ? { ...uri, [field]: value } : uri
              )
            }
          : module
      )
    }));
  };

  const toggleMethod = (moduleIndex, uriIndex, method) => {
    setFormData(prev => ({
      ...prev,
      access: prev.access.map((module, index) => 
        index === moduleIndex 
          ? { 
              ...module, 
              uri: module.uri.map((uri, uIndex) => 
                uIndex === uriIndex 
                  ? { 
                      ...uri, 
                      methods: uri.methods.includes(method)
                        ? uri.methods.filter(m => m !== method)
                        : [...uri.methods, method]
                    }
                  : uri
              )
            }
          : module
      )
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Role name is required';
    }

    if (!formData.realm_id) {
      newErrors.realm_id = 'Realm selection is required';
    }

    if (formData.access.length === 0) {
      newErrors.access = 'At least one access module is required';
    } else {
      formData.access.forEach((module, moduleIndex) => {
        if (!module.module.trim()) {
          newErrors[`access_${moduleIndex}_module`] = 'Module name is required';
        }
        if (module.uri.length === 0) {
          newErrors[`access_${moduleIndex}_uri`] = 'At least one URI is required';
        } else {
          module.uri.forEach((uri, uriIndex) => {
            if (!uri.url.trim()) {
              newErrors[`access_${moduleIndex}_uri_${uriIndex}_url`] = 'URL is required';
            }
            if (uri.methods.length === 0) {
              newErrors[`access_${moduleIndex}_uri_${uriIndex}_methods`] = 'At least one method is required';
            }
          });
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEdit ? 'Edit Role' : 'Create New Role'}
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
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className={`input w-full ${errors.name ? 'border-red-500' : ''}`}
                placeholder="e.g., SUPER-USER, COMPANY-ADMIN, USER"
              />
              {errors.name && (
                <p className="text-sm text-red-600 mt-1">{errors.name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Realm *
              </label>
              <select
                name="realm_id"
                value={formData.realm_id}
                onChange={handleInputChange}
                required
                className={`input w-full ${errors.realm_id ? 'border-red-500' : ''}`}
                disabled={isEdit} // Can't change realm after creation
              >
                <option value="">Select a realm</option>
                {realms.map((realm) => (
                  <option key={realm.id} value={realm.id}>
                    {realm.name}
                  </option>
                ))}
              </select>
              {errors.realm_id && (
                <p className="text-sm text-red-600 mt-1">{errors.realm_id}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="input w-full"
              placeholder="Brief description of the role"
            />
          </div>

          {/* Access Permissions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Access Permissions *
              </label>
              <button
                type="button"
                onClick={addAccessModule}
                className="btn btn-secondary btn-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Module
              </button>
            </div>
            
            {errors.access && (
              <p className="text-sm text-red-600">{errors.access}</p>
            )}

            {formData.access.map((module, moduleIndex) => (
              <div key={moduleIndex} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-700">Module {moduleIndex + 1}</h4>
                  <button
                    type="button"
                    onClick={() => removeAccessModule(moduleIndex)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Module Name *
                    </label>
                    <input
                      type="text"
                      value={module.module}
                      onChange={(e) => updateAccessModule(moduleIndex, 'module', e.target.value)}
                      className={`input w-full text-sm ${errors[`access_${moduleIndex}_module`] ? 'border-red-500' : ''}`}
                      placeholder="e.g., client, users, projects"
                    />
                    {errors[`access_${moduleIndex}_module`] && (
                      <p className="text-xs text-red-600 mt-1">{errors[`access_${moduleIndex}_module`]}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Rights *
                    </label>
                    <select
                      value={module.rights}
                      onChange={(e) => updateAccessModule(moduleIndex, 'rights', e.target.value)}
                      className="input w-full text-sm"
                    >
                      <option value="READ">READ</option>
                      <option value="WRITE">WRITE</option>
                      <option value="ALL">ALL</option>
                    </select>
                  </div>
                </div>

                {/* URIs */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-gray-600">
                      API Endpoints
                    </label>
                    <button
                      type="button"
                      onClick={() => addUri(moduleIndex)}
                      className="btn btn-secondary btn-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add URI
                    </button>
                  </div>

                  {errors[`access_${moduleIndex}_uri`] && (
                    <p className="text-xs text-red-600">{errors[`access_${moduleIndex}_uri`]}</p>
                  )}

                  {module.uri.map((uri, uriIndex) => (
                    <div key={uriIndex} className="border border-gray-200 rounded p-3 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-600">URI {uriIndex + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeUri(moduleIndex, uriIndex)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            URL Pattern *
                          </label>
                          <input
                            type="text"
                            value={uri.url}
                            onChange={(e) => updateUri(moduleIndex, uriIndex, 'url', e.target.value)}
                            className={`input w-full text-sm ${errors[`access_${moduleIndex}_uri_${uriIndex}_url`] ? 'border-red-500' : ''}`}
                            placeholder="e.g., /api/client/*, /api/users/get_name"
                          />
                          {errors[`access_${moduleIndex}_uri_${uriIndex}_url`] && (
                            <p className="text-xs text-red-600 mt-1">{errors[`access_${moduleIndex}_uri_${uriIndex}_url`]}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            HTTP Methods *
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((method) => (
                              <label key={method} className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={uri.methods.includes(method)}
                                  onChange={() => toggleMethod(moduleIndex, uriIndex, method)}
                                  className="mr-1 h-3 w-3 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                />
                                <span className="text-xs text-gray-600">{method}</span>
                              </label>
                            ))}
                          </div>
                          {errors[`access_${moduleIndex}_uri_${uriIndex}_methods`] && (
                            <p className="text-xs text-red-600 mt-1">{errors[`access_${moduleIndex}_uri_${uriIndex}_methods`]}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {formData.access.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No access modules defined. Click "Add Module" to get started.</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEdit ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEdit ? 'Update Role' : 'Create Role'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RoleModal;
