import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add a request interceptor to add the auth token to every request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear local storage and redirect to login if unauthorized
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Employee APIs
export const employeeAPI = {
  getAll: (page = 1, limit = 10, search = '') => apiClient.get('/employees', { params: { page, limit, search } }),
  getById: (id) => apiClient.get(`/employees/${id}`),
  create: (data) => apiClient.post('/employees', data),
  update: (id, data) => apiClient.put(`/employees/${id}`, data),
  delete: (id) => apiClient.delete(`/employees/${id}`)
};

// Attendance APIs
export const attendanceAPI = {
  getAll: () => apiClient.get('/attendance'),
  create: (data) => apiClient.post('/attendance', data),
  update: (id, data) => apiClient.put(`/attendance/${id}`, data)
};

// Leaves APIs
export const leaveAPI = {
  getAll: () => apiClient.get('/leaves'),
  getById: (id) => apiClient.get(`/leaves/${id}`),
  create: (data) => apiClient.post('/leaves', data),
  update: (id, data) => apiClient.put(`/leaves/${id}`, data),
  delete: (id) => apiClient.delete(`/leaves/${id}`)
};

// Cost Allocation APIs
export const costAllocationAPI = {
  getReport: (filters) => apiClient.post('/reports/cost-allocation', filters),
  exportReport: (filters) => apiClient.get('/reports/cost-allocation/export', { params: filters }),
  getDesignationSummary: (filters) => apiClient.post('/reports/designation-summary', filters),
  getDesignationSummaryWithFilters: (filters) => apiClient.post('/reports/designation-summary-filters', filters),
  getAnnualLeaveExitPermit: (filters) => apiClient.post('/reports/annual-leave-exit-permit', filters),
  getAttendanceRegister: (filters) => apiClient.post('/reports/attendance-register', filters),
  getEmployeeSiteLocation: (filters) => apiClient.post('/reports/employee-site-location', filters)
};

// Auth & User APIs
export const authAPI = {
  login: (data) => apiClient.post('/auth/login', data),
  getUsers: () => apiClient.get('/auth/users'),
  me: () => apiClient.get('/auth/me'),
  getMasterData: () => apiClient.get('/auth/master-data'),
  updateProfile: (data) => apiClient.post('/auth/update-profile', data),
  updatePassword: (data) => apiClient.post('/auth/update-password', data),
  createUser: (data) => apiClient.post('/auth/create-user', data),
  updateUser: (username, data) => apiClient.put(`/auth/users/${username}`, data),
  deleteUser: (username) => apiClient.delete(`/auth/users/${username}`)
};

// Dashboard APIs
export const dashboardAPI = {
  getStats: () => apiClient.get('/dashboard/stats')
};

export default apiClient;

