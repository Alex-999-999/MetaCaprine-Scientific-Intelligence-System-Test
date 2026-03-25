const TOKEN_KEY = 'mvp_web_token';
const USER_KEY = 'mvp_web_user';
let memoryToken = null;
let memoryUser = null;

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage errors (private mode, embedded browsers, blocked storage).
  }
}

export function getAuthToken() {
  const token = safeGet(TOKEN_KEY);
  if (token) {
    memoryToken = token;
    return token;
  }
  return memoryToken;
}

export function setAuthToken(token) {
  memoryToken = token || null;
  if (token) {
    safeSet(TOKEN_KEY, token);
  } else {
    safeRemove(TOKEN_KEY);
  }
}

export function removeAuthToken() {
  memoryToken = null;
  memoryUser = null;
  safeRemove(TOKEN_KEY);
  safeRemove(USER_KEY);
}

export function getUser() {
  const userStr = safeGet(USER_KEY);
  if (!userStr) return memoryUser;
  try {
    const parsed = JSON.parse(userStr);
    memoryUser = parsed;
    return parsed;
  } catch {
    safeRemove(USER_KEY);
    return null;
  }
}

export function setUser(user) {
  memoryUser = user || null;
  if (user) {
    safeSet(USER_KEY, JSON.stringify(user));
  } else {
    safeRemove(USER_KEY);
  }
}
