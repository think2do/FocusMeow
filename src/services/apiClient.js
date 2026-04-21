import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_KEY = '@focusmeow_api_base';
const API_BASES = [
  'https://focusmeow.com',
  'http://42.194.218.157:3000',
];

let cachedBase = null;

const dedupe = (items) => [...new Set(items.filter(Boolean))];

async function rememberBase(base) {
  cachedBase = base;
  try {
    await AsyncStorage.setItem(API_BASE_KEY, base);
  } catch {}
}

async function getRememberedBase() {
  if (cachedBase) return cachedBase;
  try {
    const saved = await AsyncStorage.getItem(API_BASE_KEY);
    if (saved) {
      cachedBase = saved;
      return saved;
    }
  } catch {}
  return null;
}

function shouldFallback(response, index, total) {
  if (index >= total - 1) return false;
  return response.status === 404 || response.status === 426 || response.status >= 500;
}

export async function apiFetch(path, options = {}) {
  const rememberedBase = await getRememberedBase();
  const candidates = dedupe([rememberedBase, ...API_BASES]);
  let lastError = null;
  let lastResponse = null;

  for (let index = 0; index < candidates.length; index += 1) {
    const base = candidates[index];
    try {
      const response = await fetch(`${base}${path}`, options);
      if (!shouldFallback(response, index, candidates.length)) {
        await rememberBase(base);
        return response;
      }
      lastResponse = response;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError || new Error('Network request failed');
}

export async function getResolvedApiBase() {
  return getRememberedBase() || API_BASES[0];
}
