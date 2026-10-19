const DEMO_USERS = {
  client: { password: 'client123', role: 'client' },
  admin: { password: 'admin123', role: 'admin' },
};

const SESSION_KEY = 'lost-found-demo-session';

export function authenticate(username, password) {
  const user = DEMO_USERS[username.trim().toLowerCase()];
  if (!user || user.password !== password) return null;
  return { username: username.trim().toLowerCase(), role: user.role };
}

export function getDemoSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

export function setDemoSession(session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearDemoSession() {
  sessionStorage.removeItem(SESSION_KEY);
}
