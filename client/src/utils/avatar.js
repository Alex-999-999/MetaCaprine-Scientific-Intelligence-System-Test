const AVATAR_KEY = 'mvp_web_avatar';

export function getAvatar() {
  return localStorage.getItem(AVATAR_KEY);
}

export function saveAvatar(avatarData) {
  if (avatarData) {
    localStorage.setItem(AVATAR_KEY, avatarData);
  } else {
    localStorage.removeItem(AVATAR_KEY);
  }
}

export function removeAvatar() {
  localStorage.removeItem(AVATAR_KEY);
}
