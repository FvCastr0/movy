import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para injetar token Bearer se existir no client-side
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('movy_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ==============================================================================
// HELPERS DE NOTIFICAÇÃO & ALERTAS
// ==============================================================================

export const getNotifications = async (unreadOnly = false, limit = 30) => {
  const res = await api.get('/notifications', {
    params: { unreadOnly: unreadOnly ? 'true' : undefined, limit },
  });
  return res.data;
};

export const markNotificationAsRead = async (id: string) => {
  const res = await api.patch(`/notifications/${id}/read`);
  return res.data;
};

export const markAllNotificationsAsRead = async () => {
  const res = await api.patch('/notifications/read-all');
  return res.data;
};

// ==============================================================================
// HELPERS DE RÉGUA DE REUNIÕES & SHOW-RATE
// ==============================================================================

export const sendMeetingConfirmation = async (
  leadId: string,
  data: {
    milestone: '24H' | '12H' | '1H';
    customMessage?: string;
    sendViaBot?: boolean;
    markAsConfirmed?: boolean;
  }
) => {
  const res = await api.post(`/leads/${leadId}/meeting-confirmation`, data);
  return res.data;
};


