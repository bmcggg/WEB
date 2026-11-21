import { fetchAPI } from './api';

const listFrom = (payload) => (Array.isArray(payload?.data) ? payload.data : []);

export async function getConversations() {
  return listFrom(await fetchAPI('/conversations'));
}

export async function searchUsers(query) {
  const params = new URLSearchParams({ q: query || '' });
  return listFrom(await fetchAPI(`/conversations/users?${params}`));
}

export async function createConversation(payload) {
  const response = await fetchAPI('/conversations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response?.data ?? null;
}

export async function getMessages(conversationId) {
  return listFrom(await fetchAPI(`/conversations/${conversationId}/messages`));
}

export async function sendMessage(conversationId, content, parentMessageId = null) {
  const response = await fetchAPI(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content, parent_message_id: parentMessageId }),
  });
  return response?.data ?? null;
}

export async function markConversationRead(conversationId) {
  return fetchAPI(`/conversations/${conversationId}/read`, { method: 'POST' });
}
