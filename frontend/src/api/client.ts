import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL ?? '';

export const apiClient = axios.create({
    baseURL: BASE,
    timeout: 30000,
});

apiClient.interceptors.response.use(
    (res) => res,
    (err) => {
        const message =
            err.response?.data?.error ?? err.message ?? 'An unknown error occurred';
        return Promise.reject(new Error(message));
    },
);
