import apiClient from './api';

export interface Complaint {
  id: string;
  userId: string;
  userEmail: string;
  title: string;
  content: string;
  attachmentUrl?: string;
  createdAt: string;
  status: 'Pending' | 'Resolved';
  adminResponse?: string;
  resolvedAt?: string;
}

export const complaintService = {
  async getAllComplaints(): Promise<Complaint[]> {
    const response = await apiClient.get<Complaint[]>('/admin/complaints');
    return response.data;
  },

  async respondToComplaint(id: string, responseText: string): Promise<Complaint> {
    const response = await apiClient.post<Complaint>(`/admin/complaints/${id}/respond`, {
      response: responseText
    });
    return response.data;
  }
};
