export function toSafeId(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function buildActorId(user, clientId, scope = 'focusmeow') {
  if (user?.email) {
    return `${scope}_user_${toSafeId(user.email)}`;
  }
  if (user?.username) {
    return `${scope}_user_${toSafeId(user.username)}`;
  }
  return `${scope}_guest_${toSafeId(clientId || 'anonymous')}`;
}
