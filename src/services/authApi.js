const BASE_URL = 'http://42.194.218.157:3000';

export async function register(email, password, nickname, verifiedToken) {
  const res = await fetch(`${BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: email, password, nickname, verifiedToken }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || '注册失败');
  return data;
}

export async function login(email, password) {
  const res = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || '登录失败');
  return data;
}

export async function logout(token) {
  try {
    await fetch(`${BASE_URL}/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
  } catch {}
}

export async function sendVerificationCode(email, type) {
  const res = await fetch(`${BASE_URL}/send-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, type }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || '发送失败');
  return data;
}

export async function verifyCode(email, code, type) {
  const res = await fetch(`${BASE_URL}/verify-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, type }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || '验证码错误');
  return data; // { verifiedToken }
}

export async function resetPassword(verifiedToken, newPassword) {
  const res = await fetch(`${BASE_URL}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ verifiedToken, newPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || '重置失败');
  return data;
}
