const SESSION_KEY = '3bl-session-id';

export function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}
