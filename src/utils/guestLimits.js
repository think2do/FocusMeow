const GUEST_LIMITS = {
  focus: 2,
  chat: 5,
  ai: 3,
};

let counters = { focus: 0, chat: 0, ai: 0 };

export function getGuestLimit(type) {
  return GUEST_LIMITS[type] || 0;
}

export function getGuestRemaining(type) {
  return Math.max(0, (GUEST_LIMITS[type] || 0) - (counters[type] || 0));
}

export function useGuestAction(type) {
  if ((counters[type] || 0) >= (GUEST_LIMITS[type] || 0)) {
    return false;
  }
  counters[type] = (counters[type] || 0) + 1;
  return true;
}

export function resetGuestCounters() {
  counters = { focus: 0, chat: 0, ai: 0 };
}
