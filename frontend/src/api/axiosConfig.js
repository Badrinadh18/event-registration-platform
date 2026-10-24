import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:9090/api',
});

// Attach Token to Requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    
    // Do not attach the token if the user is trying to login or register
    const isAuthRoute = config.url.includes('/auth/login') || config.url.includes('/auth/register');
    
    if (token && !isAuthRoute) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 Unauthorized & Refresh Token
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        // If 401 and we haven't already tried to retry
        if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/login') {
            originalRequest._retry = true;
            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (!refreshToken) throw new Error("No refresh token");

                // Call your backend refresh endpoint (Adjust URL if your controller differs)
                const res = await axios.post('http://localhost:9090/api/auth/refresh', null, {
                    params: { token: refreshToken }
                });

                localStorage.setItem('accessToken', res.data.accessToken);
                localStorage.setItem('refreshToken', res.data.refreshToken);
                
                originalRequest.headers.Authorization = `Bearer ${res.data.accessToken}`;
                return api(originalRequest); // Retry the original request
            } catch (refreshError) {
                // If refresh fails, force logout
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.location.href = '/'; 
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default api;