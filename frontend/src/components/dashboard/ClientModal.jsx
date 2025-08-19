import { useState, useEffect } from 'react';
import { X, Loader2, Plus, Trash2, Globe, Shield, Settings, Mail } from 'lucide-react';

function ClientModal({ isOpen, onClose, onSubmit, client, realms, isLoading }) {
  const [formData, setFormData] = useState({
    realm_id: '',
    name: '',
    description: '',
    endpoints: {},
    redirect_urls: [''],
    sso_enabled: false,
    twofa_enabled: false,
    smtp_config: {
      host: '',
      port: '',
      username: '',
      password: '',
      from_email: '',
      secure: true
    }
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (client) {
      // Editing existing client
      setFormData({
        realm_id: client.realm_id,
        name: client.name,
        description: client.description || '',
        endpoints: client.endpoints || {},
        redirect_urls: client.redirect_urls && client.redirect_urls.length > 0 
          ? client.redirect_urls 
          : [''],
        sso_enabled: client.sso_enabled || false,
        twofa_enabled: client.twofa_enabled || false,
        smtp_config: {
          host: client.smtp_config?.host || '',
          port: client.smtp_config?.port || '',
          username: client.smtp_config?.username || '',
          password: client.smtp_config?.password || '',
          from_email: client.smtp_config?.from_email || '',
          secure: client.smtp_config?.secure !== false
        }
      });
    } else {
      // Creating new client
      setFormData({
        realm_id: '',
        name: '',
        description: '',
        endpoints: {},
        redirect_urls: [''],
        sso_enabled: false,
        twofa_enabled: false,
        smtp_config: {
          host: '',
          port: '',
          username: '',
          password: '',
          from_email: '',
          secure: true
        }
      });
    }
    setErrors({});
  }, [client]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleNestedChange = (parentField, childField, value) => {
    setFormData(prev => ({
      ...prev,
      [parentField]: {
        ...prev[parentField],
        [childField]: value
      }
    }));
    
    // Clear error for this field
    const errorKey = `${parentField}.${childField}`;
    if (errors[errorKey]) {
      setErrors(prev => ({
        ...prev,
        [errorKey]: null
      }));
    }
  };

  const handleRedirectUrlChange = (index, value) => {
    const newRedirectUrls = [...formData.redirect_urls];
    newRedirectUrls[index] = value;
    setFormData(prev => ({
      ...prev,
      redirect_urls: newRedirectUrls
    }));
  };

  const addRedirectUrl = () => {
    setFormData(prev => ({
      ...prev,
      redirect_urls: [...prev.redirect_urls, '']
    }));
  };

  const removeRedirectUrl = (index) => {
    if (formData.redirect_urls.length > 1) {
      const newRedirectUrls = formData.redirect_urls.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        redirect_urls: newRedirectUrls
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.realm_id) {
      newErrors.realm_id = 'Realm is required';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Client name is required';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Client name must be less than 100 characters';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    // Validate redirect URLs
    formData.redirect_urls.forEach((url, index) => {
      if (url.trim() && !isValidUrl(url)) {
        newErrors[`redirect_urls.${index}`] = 'Invalid URL format';
      }
    });

    // Validate SMTP config if 2FA is enabled
    if (formData.twofa_enabled) {
      if (!formData.smtp_config.host) {
        newErrors['smtp_config.host'] = 'SMTP host is required when 2FA is enabled';
      }
      if (!formData.smtp_config.port) {
        newErrors['smtp_config.port'] = 'SMTP port is required when 2FA is enabled';
      }
      if (!formData.smtp_config.username) {
        newErrors['smtp_config.username'] = 'SMTP username is required when 2FA is enabled';
      }
      if (!formData.smtp_config.password) {
        newErrors['smtp_config.password'] = 'SMTP password is required when 2FA is enabled';
      }
      if (!formData.smtp_config.from_email) {
        newErrors['smtp_config.from_email'] = 'From email is required when 2FA is enabled';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Filter out empty redirect URLs
      const cleanRedirectUrls = formData.redirect_urls.filter(url => url.trim());
      
      const submitData = {
        ...formData,
        redirect_urls: cleanRedirectUrls,
        realm_id: parseInt(formData.realm_id)
      };

      onSubmit(submitData);
    }
  };

  const getFieldError = (field) => {
    return errors[field] || null;
  };

  const getNestedFieldError = (parentField, childField) => {
    return errors[`${parentField}.${childField}`] || null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {client ? 'Edit Client' : 'Create New Client'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Realm <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.realm_id}
                onChange={(e) => handleInputChange('realm_id', e.target.value)}
                className={`input ${getFieldError('realm_id') ? 'border-red-300' : ''}`}
                disabled={!!client} // Can't change realm for existing client
              >
                <option value="">Select a realm</option>
                {realms.map((realm) => (
                  <option key={realm.id} value={realm.id}>
                    {realm.name}
                  </option>
                ))}
              </select>
              {getFieldError('realm_id') && (
                <p className="mt-1 text-sm text-red-600">{getFieldError('realm_id')}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`input ${getFieldError('name') ? 'border-red-300' : ''}`}
                placeholder="Enter client name"
              />
              {getFieldError('name') && (
                <p className="mt-1 text-sm text-red-600">{getFieldError('name')}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className={`input ${getFieldError('description') ? 'border-red-300' : ''}`}
              placeholder="Enter client description"
              rows={3}
            />
            {getFieldError('description') && (
              <p className="mt-1 text-sm text-red-600">{getFieldError('description')}</p>
            )}
          </div>

          {/* Redirect URLs */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Redirect URLs
            </label>
            <div className="space-y-2">
              {formData.redirect_urls.map((url, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => handleRedirectUrlChange(index, e.target.value)}
                    className={`input flex-1 ${getFieldError(`redirect_urls.${index}`) ? 'border-red-300' : ''}`}
                    placeholder="https://example.com/callback"
                  />
                  {formData.redirect_urls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRedirectUrl(index)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addRedirectUrl}
                className="btn btn-secondary btn-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Redirect URL
              </button>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Features</h3>
            
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.sso_enabled}
                  onChange={(e) => handleInputChange('sso_enabled', e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">SSO Enabled</span>
                </div>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.twofa_enabled}
                  onChange={(e) => handleInputChange('twofa_enabled', e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <div className="flex items-center space-x-2">
                  <Settings className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">2FA Enabled</span>
                </div>
              </label>
            </div>
          </div>

          {/* SMTP Configuration (shown when 2FA is enabled) */}
          {formData.twofa_enabled && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center space-x-2 mb-4">
                <Mail className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-medium text-gray-900">SMTP Configuration</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SMTP Host <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.smtp_config.host}
                    onChange={(e) => handleNestedChange('smtp_config', 'host', e.target.value)}
                    className={`input ${getNestedFieldError('smtp_config', 'host') ? 'border-red-300' : ''}`}
                    placeholder="smtp.gmail.com"
                  />
                  {getNestedFieldError('smtp_config', 'host') && (
                    <p className="mt-1 text-sm text-red-600">{getNestedFieldError('smtp_config', 'host')}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SMTP Port <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.smtp_config.port}
                    onChange={(e) => handleNestedChange('smtp_config', 'port', e.target.value)}
                    className={`input ${getNestedFieldError('smtp_config', 'port') ? 'border-red-300' : ''}`}
                    placeholder="587"
                  />
                  {getNestedFieldError('smtp_config', 'port') && (
                    <p className="mt-1 text-sm text-red-600">{getNestedFieldError('smtp_config', 'port')}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.smtp_config.username}
                    onChange={(e) => handleNestedChange('smtp_config', 'username', e.target.value)}
                    className={`input ${getNestedFieldError('smtp_config', 'username') ? 'border-red-300' : ''}`}
                    placeholder="your-email@gmail.com"
                  />
                  {getNestedFieldError('smtp_config', 'username') && (
                    <p className="mt-1 text-sm text-red-600">{getNestedFieldError('smtp_config', 'username')}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.smtp_config.password}
                    onChange={(e) => handleNestedChange('smtp_config', 'password', e.target.value)}
                    className={`input ${getNestedFieldError('smtp_config', 'password') ? 'border-red-300' : ''}`}
                    placeholder="App password or email password"
                  />
                  {getNestedFieldError('smtp_config', 'password') && (
                    <p className="mt-1 text-sm text-red-600">{getNestedFieldError('smtp_config', 'password')}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.smtp_config.from_email}
                    onChange={(e) => handleNestedChange('smtp_config', 'from_email', e.target.value)}
                    className={`input ${getNestedFieldError('smtp_config', 'from_email') ? 'border-red-300' : ''}`}
                    placeholder="noreply@yourdomain.com"
                  />
                  {getNestedFieldError('smtp_config', 'from_email') && (
                    <p className="mt-1 text-sm text-red-600">{getNestedFieldError('smtp_config', 'from_email')}</p>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={formData.smtp_config.secure}
                      onChange={(e) => handleNestedChange('smtp_config', 'secure', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Use SSL/TLS</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
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
                  {client ? 'Updating...' : 'Creating...'}
                </div>
              ) : (
                client ? 'Update Client' : 'Create Client'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ClientModal;
