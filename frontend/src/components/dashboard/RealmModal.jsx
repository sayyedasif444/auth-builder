import { useState, useEffect } from 'react';
import { X, Globe, Loader2 } from 'lucide-react';

function RealmModal({ isOpen, onClose, onSubmit, realm, isLoading }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (realm) {
      setFormData({
        name: realm.name || '',
        description: realm.description || '',
        is_active: realm.is_active !== undefined ? realm.is_active : true,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        is_active: true,
      });
    }
    setErrors({});
  }, [realm]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Realm name is required';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Realm name must be less than 100 characters';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.name)) {
      newErrors.name = 'Realm name can only contain letters, numbers, underscores, and hyphens';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
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

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-primary-100 rounded-lg flex items-center justify-center">
                <Globe className="h-5 w-5 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {realm ? 'Edit Realm' : 'Create New Realm'}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Realm Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Realm Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`input ${errors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                placeholder="Enter realm name"
                disabled={isLoading}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Only letters, numbers, underscores, and hyphens are allowed
              </p>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className={`input resize-none ${errors.description ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                placeholder="Enter realm description (optional)"
                disabled={isLoading}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {formData.description.length}/500 characters
              </p>
            </div>

            {/* Active Status */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                disabled={isLoading}
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                Active Realm
              </label>
            </div>
            <p className="text-xs text-gray-500">
              Active realms are available for authentication and user management
            </p>

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
                    {realm ? 'Updating...' : 'Creating...'}
                  </div>
                ) : (
                  realm ? 'Update Realm' : 'Create Realm'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default RealmModal;
