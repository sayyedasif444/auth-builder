import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          if (response.data.success) {
            localStorage.setItem('accessToken', response.data.access_token);
            localStorage.setItem('tokenExpiry', response.data.expires_at);
            
            // Retry the original request
            originalRequest.headers.Authorization = `Bearer ${response.data.access_token}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // Clear tokens and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('tokenExpiry');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      // Return a consistent error format
      return { error: 'Network error occurred' };
    }
  },

  logout: async () => {
    try {
      const response = await api.post('/auth/logout');
      return response.data;
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false };
    }
  },

  refreshToken: async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      const response = await api.post('/auth/refresh', { refresh_token: refreshToken });
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },

  verifyToken: async () => {
    try {
      const response = await api.get('/auth/test');
      return { success: true, user: response.data.user };
    } catch (error) {
      return { success: false };
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    try {
      const response = await api.put('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },
};

// Realms API
export const realmsAPI = {
  getAll: async () => {
    try {
      const response = await api.get('/realms');
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },
  getById: async (id) => {
    try {
      const response = await api.get(`/realms/${id}`);
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },
  create: async (realmData) => {
    try {
      const response = await api.post('/realms', realmData);
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },
  update: async (id, realmData) => {
    try {
      const response = await api.put(`/realms/${id}`, realmData);
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },
  delete: async (id) => {
    try {
      const response = await api.delete(`/realms/${id}`);
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },
  toggleStatus: async (id) => {
    try {
      const response = await api.patch(`/realms/${id}/toggle-status`);
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },
};

export const clientsAPI = {
  getAll: async (realmId = null) => {
    try {
      const params = realmId ? { realm_id: realmId } : {};
      const response = await api.get('/clients', { params });
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },
  getById: async (id) => {
    try {
      const response = await api.get(`/clients/${id}`);
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },
  create: async (clientData) => {
    try {
      const response = await api.post('/clients', clientData);
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },
  update: async (id, clientData) => {
    try {
      const response = await api.put(`/clients/${id}`, clientData);
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },
  delete: async (id) => {
    try {
      const response = await api.delete(`/clients/${id}`);
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },
  toggleStatus: async (id) => {
    try {
      const response = await api.patch(`/clients/${id}/toggle-status`);
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },
  regenerateSecret: async (id) => {
    try {
      const response = await api.post(`/clients/${id}/regenerate-secret`);
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },
  getStats: async (realmId = null) => {
    try {
      const params = realmId ? { realm_id: realmId } : {};
      const response = await api.get('/clients/stats/overview', { params });
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },
};

// Users API
export const usersAPI = {
  getAll: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.realm_id) params.append('realm_id', filters.realm_id);
      if (filters.client_id) params.append('client_id', filters.client_id);
      if (filters.is_super_user !== undefined) params.append('is_super_user', filters.is_super_user);
      if (filters.is_active !== undefined) params.append('is_active', filters.is_active);
      if (filters.search) params.append('search', filters.search);
      
      const response = await api.get(`/users?${params.toString()}`);
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`/users/${id}`);
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },

  create: async (userData) => {
    try {
      const response = await api.post('/users', userData);
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },

  update: async (id, userData) => {
    try {
      const response = await api.put(`/users/${id}`, userData);
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`/users/${id}`);
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },

  toggleStatus: async (id) => {
    try {
      const response = await api.patch(`/users/${id}/toggle-status`);
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },

  getStats: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.realm_id) params.append('realm_id', filters.realm_id);
      if (filters.client_id) params.append('client_id', filters.client_id);
      
      const response = await api.get(`/users/stats/overview?${params.toString()}`);
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },
};

// Roles API
export const rolesAPI = {
  getAll: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.name) params.append('name', filters.name);
      if (filters.realm_id) params.append('realm_id', filters.realm_id);
      if (filters.is_active !== undefined) params.append('is_active', filters.is_active);
      
      const response = await api.get(`/roles?${params.toString()}`);
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`/roles/${id}`);
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },

  create: async (roleData) => {
    try {
      const response = await api.post('/roles', roleData);
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },

  update: async (id, roleData) => {
    try {
      const response = await api.put(`/roles/${id}`, roleData);
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`/roles/${id}`);
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },

  toggleStatus: async (id) => {
    try {
      const response = await api.patch(`/roles/${id}/toggle-status`);
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },

  getStats: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.name) params.append('name', filters.name);
      if (filters.realm_id) params.append('realm_id', filters.realm_id);
      
      const response = await api.get(`/roles/stats/overview?${params.toString()}`);
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },

  // User-Role management
  assignUser: async (roleId, userId) => {
    try {
      const response = await api.post(`/roles/${roleId}/assign-user`, { user_id: userId });
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },

  removeUser: async (roleId, userId) => {
    try {
      const response = await api.delete(`/roles/${roleId}/remove-user/${userId}`);
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },

  getRoleUsers: async (roleId) => {
    try {
      const response = await api.get(`/roles/${roleId}/users`);
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },
};

export default api;
