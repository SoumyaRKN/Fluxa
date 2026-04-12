import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from './client';
import type { DeviceInfo, SelfInfo, Session } from '@/types';

export function useDevices() {
    return useQuery<DeviceInfo[]>({
        queryKey: ['devices'],
        queryFn: async () => {
            const { data } = await apiClient.get('/api/devices');
            return data;
        },
        refetchInterval: 10_000, // poll every 10 s in case mDNS events are missed
    });
}

export function useSelfInfo() {
    return useQuery<SelfInfo>({
        queryKey: ['self-info'],
        queryFn: async () => {
            const { data } = await apiClient.get('/api/device/info');
            return data;
        },
        staleTime: Infinity,
    });
}

export function useRequestConnection() {
    return useMutation({
        mutationFn: (params: {
            target_ip: string;
            target_port: number;
            device_id: string;
            device_name: string;
        }) => apiClient.post('/api/connect/request', params),
    });
}

export function useAcceptConnection() {
    return useMutation({
        mutationFn: (session_id: string) =>
            apiClient.post('/api/connect/accept', { session_id }),
    });
}

export function useRejectConnection() {
    return useMutation({
        mutationFn: (session_id: string) =>
            apiClient.post('/api/connect/reject', { session_id }),
    });
}

export function useSessions() {
    return useQuery<Session[]>({
        queryKey: ['sessions'],
        queryFn: async () => {
            const { data } = await apiClient.get('/api/sessions');
            return data;
        },
    });
}
