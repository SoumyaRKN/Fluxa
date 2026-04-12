import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { FileEntry } from '@/types';

const QUERY_KEY = (path: string) => ['files', path];

export function useFileList(path: string) {
    return useQuery<FileEntry[]>({
        queryKey: QUERY_KEY(path),
        queryFn: async () => {
            const { data } = await apiClient.get('/api/files', { params: { path } });
            return data;
        },
        staleTime: 5_000,
    });
}

export function useDeleteMutation(path: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (targetPath: string) =>
            apiClient.delete('/api/files', { params: { path: targetPath } }),
        onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY(path) }),
    });
}

export function useRenameMutation(currentPath: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ from, to }: { from: string; to: string }) =>
            apiClient.post('/api/rename', { from, to }),
        onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY(currentPath) }),
    });
}

export function useMkdirMutation(currentPath: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (newPath: string) => apiClient.post('/api/mkdir', { path: newPath }),
        onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY(currentPath) }),
    });
}

export function useUploadMutation(currentPath: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({
            file,
            destPath,
            onProgress,
        }: {
            file: File;
            destPath: string;
            onProgress?: (percent: number) => void;
        }) => {
            const form = new FormData();
            form.append('file', file, file.name);
            form.append('path', destPath);

            const { data } = await apiClient.post('/api/upload', form, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (e) => {
                    if (e.total && onProgress) {
                        onProgress(Math.round((e.loaded / e.total) * 100));
                    }
                },
            });
            return data;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY(currentPath) }),
    });
}

export function downloadFile(filePath: string) {
    const url = `/api/download?path=${encodeURIComponent(filePath)}`;
    const a = document.createElement('a');
    a.href = url;
    a.click();
}

export function useDeleteBatchMutation(currentPath: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (paths: string[]) =>
            apiClient.post('/api/files/delete-batch', { paths }),
        onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY(currentPath) }),
    });
}

export function useCopyMutation(currentPath: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ from, to }: { from: string; to: string }) =>
            apiClient.post('/api/copy', { from, to }),
        onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY(currentPath) }),
    });
}
