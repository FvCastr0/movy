export const CONCIERGE_API_BASE_URL =
  process.env.NEXT_PUBLIC_CONCIERGE_API_URL ||
  'http://localhost:3002/api/v1';

const PORTAL_TOKEN_KEY = 'concierge_portal_token';
const PORTAL_USER_KEY = 'concierge_portal_user';

export interface DeliveryPortalUser {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'ATTENDANT';
  tenantId: string;
  tenantName: string;
  aiGlobalEnabled: boolean;
}

export interface PortalConversationMessage {
  id: string;
  conversationId: string;
  senderType: 'CUSTOMER' | 'AI_AGENT' | 'HUMAN_ATTENDANT';
  content: string;
  createdAt: string;
}

export interface HandoffQueueItem {
  id: string;
  tenantId: string;
  customerPhone: string;
  customerName: string;
  status: 'AI_ACTIVE' | 'HUMAN_HANDOFF' | 'RESOLVED';
  handoffReason: string | null;
  handoffSummary: string | null;
  handoffTriggeredAt: string | null;
  menuLinkSent: boolean;
  lastMessageAt: string;
  whatsappDeepLink: string;
  recentMessages: PortalConversationMessage[];
}

export interface PortalKnowledgeBase {
  id: string;
  tenantId: string;
  digitalMenuUrl: string;
  openingHoursText: string;
  estimatedDeliveryMinutes: number;
  estimatedPickupMinutes: number;
  deliveryFeeRules: string;
  paymentMethods: string;
  agentName: string;
  toneOfVoice: string;
  llmProvider: 'OPENAI' | 'GEMINI';
  llmModel: 'gpt-4o-mini' | 'gemini-2.5-flash' | 'gemini-2.0-flash';
  customInstructions: string | null;
  handoffTriggers: string;
}

export function getPortalToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(PORTAL_TOKEN_KEY);
}

export function setPortalSession(token: string, user: DeliveryPortalUser) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(PORTAL_TOKEN_KEY, token);
  window.sessionStorage.setItem(PORTAL_USER_KEY, JSON.stringify(user));
}

export function clearPortalSession() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(PORTAL_TOKEN_KEY);
  window.sessionStorage.removeItem(PORTAL_USER_KEY);
}

export function getStoredPortalUser(): DeliveryPortalUser | null {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(PORTAL_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DeliveryPortalUser;
  } catch {
    return null;
  }
}

async function portalFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getPortalToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${CONCIERGE_API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') || '60';
      const body = await response.json().catch(() => null);
      throw new Error(
        body?.message ||
          `Muitas tentativas. Aguarde ${retryAfter} segundos antes de tentar novamente.`,
      );
    }

    if (response.status === 401) {
      clearPortalSession();
      const body = await response.json().catch(() => null);
      throw new Error(body?.message || 'Sessão expirada ou credenciais inválidas.');
    }

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const errMsg = Array.isArray(body?.message)
        ? body.message.join(', ')
        : body?.message || `Erro HTTP ${response.status}`;
      throw new Error(errMsg);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export const conciergePortalApi = {
  async login(email: string, password: string) {
    const res = await portalFetch<{
      accessToken: string;
      user: DeliveryPortalUser;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setPortalSession(res.accessToken, res.user);
    return res;
  },

  async getMe() {
    return portalFetch<DeliveryPortalUser>('/auth/me');
  },

  async getHandoffQueue() {
    return portalFetch<HandoffQueueItem[]>('/conversations/handoff-queue');
  },

  async getConversationDetail(conversationId: string) {
    return portalFetch<{
      id: string;
      customerPhone: string;
      customerName: string | null;
      status: string;
      handoffReason: string | null;
      handoffSummary: string | null;
      whatsappDeepLink: string;
      messages: PortalConversationMessage[];
    }>(`/conversations/${encodeURIComponent(conversationId)}/messages`);
  },

  async resolveAndReturnToAi(conversationId: string) {
    return portalFetch(`/conversations/${encodeURIComponent(conversationId)}/resolve`, {
      method: 'PATCH',
    });
  },

  async getKnowledgeBase() {
    return portalFetch<{
      tenantId: string;
      tenantName: string;
      aiGlobalEnabled: boolean;
      knowledgeBase: PortalKnowledgeBase;
    }>('/knowledge-base');
  },

  async updateQuickOps(input: {
    aiGlobalEnabled?: boolean;
    estimatedDeliveryMinutes?: number;
    estimatedPickupMinutes?: number;
    customInstructions?: string;
  }) {
    return portalFetch<{
      tenantId: string;
      aiGlobalEnabled: boolean;
      knowledgeBase: PortalKnowledgeBase;
    }>('/knowledge-base/quick-ops', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  async updateFullKnowledgeBase(
    input: Omit<PortalKnowledgeBase, 'id' | 'tenantId'>,
  ) {
    return portalFetch<{
      tenantId: string;
      knowledgeBase: PortalKnowledgeBase;
    }>('/knowledge-base', {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },
};
