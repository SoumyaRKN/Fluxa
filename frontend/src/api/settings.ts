import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { AppSettings, SettingsPatch } from '@/types';

export function useSettings() {
    return useQuery<AppSettings>({
        queryKey: ['settings'],
        queryFn: async () => {
            const res = await apiClient.get<AppSettings>('/api/settings');
            return res.data;
        },
        staleTime: 30_000,
        gcTime: 60_000,
        refetchOnWindowFocus: false,
    });
}

export function useUpdateSettings() {
    const qc = useQueryClient();
    return useMutation<AppSettings, Error, SettingsPatch>({
        mutationFn: async (patch) => {
            const res = await apiClient.patch<AppSettings>('/api/settings', patch);
            return res.data;
        },
        onSuccess: (data) => {
            qc.setQueryData(['settings'], data);
        },
    });
}
