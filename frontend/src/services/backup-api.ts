import { apiClient } from './apiClient';

export interface Backup {
  filename: string;
  size: number;
  createdAt: string;
}

export const BackupApi = {
  createBackup: async () => {
    const response = await apiClient.post('/backup');
    return response.data;
  },

  listBackups: async (): Promise<Backup[]> => {
    const response = await apiClient.get('/backup');
    return response.data.data;
  },

  downloadBackup: (filename: string) => {
    // For downloads, we can just use the URL directly with auth cookie
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000/api';
    window.open(`${API_BASE_URL}/backup/${filename}/download`, '_blank');
  },

  restoreBackup: async (filename: string) => {
    const response = await apiClient.post(`/backup/${filename}/restore`);
    return response.data;
  },

  deleteBackup: async (filename: string) => {
    const response = await apiClient.delete(`/backup/${filename}`);
    return response.data;
  }
};
