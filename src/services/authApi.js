import { apiFetch } from './apiClient';

function logAuthApiWarning(scope, error, details = '') {
  console.warn(`[authApi] ${scope} failed${details ? ` (${details})` : ''}`, error?.message || error);
}

async function readJsonResponse(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

async function postJson(path, body, fallbackMessage) {
  const res = await apiFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await readJsonResponse(res);
  if (!res.ok) {
    const error = new Error(data.message || data.error || fallbackMessage);
    error.status = res.status;
    error.path = path;
    error.payload = data;
    throw error;
  }
  return data;
}

async function postJsonVariants(path, bodies, fallbackMessage) {
  const queue = bodies.filter(Boolean).map(body => JSON.stringify(body));
  const uniqueBodies = [...new Set(queue)].map(item => JSON.parse(item));
  let lastError = null;

  for (let index = 0; index < uniqueBodies.length; index += 1) {
    const body = uniqueBodies[index];
    try {
      const data = await postJson(path, body, fallbackMessage);
      return { data, body };
    } catch (error) {
      lastError = error;
      if (index === uniqueBodies.length - 1) break;
    }
  }

  throw lastError || new Error(fallbackMessage);
}

function pickFirstText(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function normalizeChatPayload(data) {
  const answer = pickFirstText(
    data?.answer,
    data?.data?.answer,
    data?.reply,
    data?.data?.reply,
    data?.output,
    data?.data?.output,
    data?.text,
    data?.data?.text,
  );
  const conversationId = pickFirstText(
    data?.conversation_id,
    data?.data?.conversation_id,
    data?.conversationId,
    data?.data?.conversationId,
  );

  return {
    ...data,
    answer,
    conversation_id: conversationId,
  };
}

export async function register(email, password, nickname, verifiedToken) {
  return postJson('/register', { username: email, password, nickname, verifiedToken }, '注册失败');
}

export async function login(email, password) {
  return postJson('/login', { username: email, password }, '登录失败');
}

export async function logout(token) {
  try {
    await apiFetch('/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
  } catch (error) {
    logAuthApiWarning('logout', error);
  }
}

export async function sendVerificationCode(email, type) {
  if (type === 'forgot' || type === 'reset') {
    const { data } = await postJsonVariants('/send-code', [
      { email, type: 'forgot' },
      { email, type: 'reset' },
    ], '发送失败');
    return data;
  }
  return postJson('/send-code', { email, type }, '发送失败');
}

export async function verifyCode(email, code, type) {
  if (type === 'forgot' || type === 'reset') {
    const { data, body } = await postJsonVariants('/verify-code', [
      { email, code, type: 'forgot' },
      { email, code, type: 'reset' },
    ], '验证码错误');
    return {
      ...data,
      usedType: body.type,
    };
  }
  return postJson('/verify-code', { email, code, type }, '验证码错误');
}

export async function resetPassword(arg1, maybeNewPassword) {
  const payload = typeof arg1 === 'object' && arg1 !== null
    ? arg1
    : { verifiedToken: arg1, newPassword: maybeNewPassword };

  const {
    verifiedToken,
    email,
    code,
    newPassword,
  } = payload;

  const bodies = [];
  if (verifiedToken && newPassword) {
    bodies.push({ verifiedToken, newPassword });
  }
  if (email && code && newPassword) {
    bodies.push({ email, code, newPassword });
  }

  if (bodies.length === 0) {
    throw new Error('缺少重置密码参数');
  }

  const { data } = await postJsonVariants('/reset-password', bodies, '重置失败');
  return data;
}

export async function saveChat(email, catId, msgs, convId, topic) {
  try {
    await postJson('/save-chat', { email, catId, msgs, convId, topic }, '保存失败');
  } catch (error) {
    logAuthApiWarning('saveChat', error, catId);
  }
}

export async function loadChat(email, catId) {
  try {
    const data = await postJson('/load-chat', { email, catId }, '加载失败');
    if (data.code === 200) return data.data;
  } catch (error) {
    logAuthApiWarning('loadChat', error, catId);
  }
  return null;
}

export async function saveUserInfo(email, info) {
  try {
    await postJson('/save-userinfo', { email, ...info }, '保存失败');
  } catch (error) {
    logAuthApiWarning('saveUserInfo', error, email);
  }
}

export async function loadUserInfo(email) {
  try {
    const data = await postJson('/load-userinfo', { email }, '加载失败');
    if (data.code === 200) return data.data;
  } catch (error) {
    logAuthApiWarning('loadUserInfo', error, email);
  }
  return null;
}

export async function sendCompanionChat(payload) {
  const data = await postJson('/chat', payload, '聊天失败');
  return normalizeChatPayload(data);
}
