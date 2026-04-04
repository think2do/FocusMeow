# Email Verification & Password Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 6-digit OTP email verification to registration and a forgot-password reset flow using Tencent Cloud SES.

**Architecture:** The backend stores OTPs and verifiedTokens in in-memory Maps with 5-minute TTLs. The frontend guides the user through a multi-step form (fill info → verify OTP → complete action). Both WelcomeScreen (main auth) and AuthModal (settings screen) get the same OTP step added to registration.

**Tech Stack:** Node.js/Express (backend), tencentcloud-sdk-nodejs (email), React Native (frontend), existing authApi.js / AuthContext.js / WelcomeScreen / AuthModal.

---

## File Map

**Backend (SSH into 42.194.218.157, find server root first with `ps aux | grep node`)**
- Create: `utils/otpStore.js` — OTP and verifiedToken in-memory storage
- Create: `utils/emailService.js` — Tencent Cloud SES wrapper
- Modify: main routes file (wherever `/register` and `/login` are defined) — add 3 new routes + update `/register`

**Frontend**
- Modify: `src/services/authApi.js` — add `sendVerificationCode`, `verifyCode`, `resetPassword`; update `register` signature
- Modify: `src/contexts/AuthContext.js` — update `register` to accept `verifiedToken`
- Modify: `App.tsx` — WelcomeScreen: add OTP step to registration + forgot-password sub-flow
- Modify: `src/components/AuthModal.js` — add OTP step to registration

---

## Task 1: Backend — OTP Store utility

**Files:**
- Create: `utils/otpStore.js`

- [ ] **Step 1: Create `utils/otpStore.js`**

```js
// utils/otpStore.js
const crypto = require('crypto');

// key: email → { code, type, expiresAt }
const otpMap = new Map();
// key: token → { email, type, expiresAt }
const tokenMap = new Map();

const TTL = 5 * 60 * 1000; // 5 minutes

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Store new OTP. Returns false if a valid OTP already exists (rate-limit).
function storeOTP(email, type) {
  const existing = otpMap.get(email);
  if (existing && Date.now() < existing.expiresAt) return false;
  const code = generateCode();
  otpMap.set(email, { code, type, expiresAt: Date.now() + TTL });
  return code;
}

// Verify OTP. Returns verifiedToken on success, null on failure.
function verifyOTP(email, code, type) {
  const record = otpMap.get(email);
  if (!record) return null;
  if (record.type !== type) return null;
  if (Date.now() > record.expiresAt) { otpMap.delete(email); return null; }
  if (record.code !== code) return null;
  otpMap.delete(email);
  const token = crypto.randomUUID();
  tokenMap.set(token, { email, type, expiresAt: Date.now() + TTL });
  return token;
}

// Consume a verifiedToken. Returns email on success, null on failure/expired/wrong type.
function consumeToken(token, type) {
  const record = tokenMap.get(token);
  if (!record) return null;
  if (record.type !== type) return null;
  if (Date.now() > record.expiresAt) { tokenMap.delete(token); return null; }
  tokenMap.delete(token);
  return record.email;
}

module.exports = { storeOTP, verifyOTP, consumeToken };
```

- [ ] **Step 2: Verify file saved, no syntax errors**

```bash
node -e "const s = require('./utils/otpStore'); const c = s.storeOTP('test@test.com','register'); console.log('code:', c); const t = s.verifyOTP('test@test.com', c, 'register'); console.log('token:', t); console.log('email:', s.consumeToken(t, 'register'));"
```

Expected output:
```
code: 6-digit number
token: uuid string
email: test@test.com
```

---

## Task 2: Backend — Email Service (Tencent Cloud SES)

**Files:**
- Create: `utils/emailService.js`

- [ ] **Step 1: Install Tencent Cloud SDK**

```bash
npm install tencentcloud-sdk-nodejs
```

- [ ] **Step 2: Create `utils/emailService.js`**

Replace `YOUR_SECRET_ID`, `YOUR_SECRET_KEY`, and `noreply@yourdomain.com` with real values from the Tencent Cloud console (SES → Sender Addresses). The `region` must match where SES is enabled (usually `ap-guangzhou` or `ap-hongkong`).

```js
// utils/emailService.js
const tencentcloud = require('tencentcloud-sdk-nodejs');
const SesClient = tencentcloud.ses.v20201002.Client;

const client = new SesClient({
  credential: {
    SecretId: process.env.TENCENT_SECRET_ID || 'YOUR_SECRET_ID',
    SecretKey: process.env.TENCENT_SECRET_KEY || 'YOUR_SECRET_KEY',
  },
  region: 'ap-guangzhou',
});

const FROM_ADDRESS = process.env.SES_FROM || 'FocusMeow <noreply@yourdomain.com>';

async function sendVerificationCode(email, code, type) {
  const isReset = type === 'reset';
  const subject = isReset ? '专注喵 - 密码重置验证码' : '专注喵 - 邮箱验证码';
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
      <h2 style="color:#D06B6B">${isReset ? '重置密码' : '验证你的邮箱'}</h2>
      <p>你的验证码是：</p>
      <div style="font-size:36px;font-weight:bold;color:#D06B6B;letter-spacing:8px;margin:16px 0">${code}</div>
      <p style="color:#888">验证码 5 分钟内有效，请勿告知他人。</p>
      <p style="color:#aaa;font-size:12px">如非本人操作，请忽略此邮件。</p>
    </div>`;
  await client.SendEmail({
    FromEmailAddress: FROM_ADDRESS,
    Destination: [email],
    Subject: subject,
    Simple: { Html: html, Text: `你的专注喵验证码：${code}（5分钟内有效）` },
  });
}

module.exports = { sendVerificationCode };
```

- [ ] **Step 3: Smoke-test email sending (replace with a real recipient)**

```bash
TENCENT_SECRET_ID=xxx TENCENT_SECRET_KEY=xxx SES_FROM="FocusMeow <noreply@yourdomain.com>" \
  node -e "require('./utils/emailService').sendVerificationCode('yourtest@email.com','123456','register').then(()=>console.log('sent')).catch(console.error)"
```

Expected: `sent` printed, email received. Fix credentials/region if error occurs.

---

## Task 3: Backend — `/send-code` and `/verify-code` endpoints

**Files:**
- Modify: main routes file (wherever `/login` is defined — find it with `grep -r "router.post.*login\|app.post.*login" . --include="*.js" -l`)

- [ ] **Step 1: Locate the routes file**

```bash
grep -r "login" . --include="*.js" -l | grep -v node_modules
```

Open that file. Add the following two routes alongside the existing `/login` and `/register` routes.

- [ ] **Step 2: Add `POST /send-code` route**

```js
const { storeOTP } = require('./utils/otpStore');
const { sendVerificationCode } = require('./utils/emailService');

// POST /send-code
// Body: { email, type: "register" | "reset" }
router.post('/send-code', async (req, res) => {
  const { email, type } = req.body;
  if (!email || !['register', 'reset'].includes(type)) {
    return res.status(400).json({ error: '参数错误' });
  }
  if (type === 'reset') {
    // Check user exists before sending reset code
    const user = await findUserByEmail(email); // replace with your actual DB lookup
    if (!user) return res.status(404).json({ error: '该邮箱未注册' });
  }
  const code = storeOTP(email, type);
  if (!code) return res.status(429).json({ error: '请等待上一条验证码过期后再重试' });
  try {
    await sendVerificationCode(email, code, type);
    res.json({ success: true });
  } catch (e) {
    console.error('Email send failed:', e);
    res.status(500).json({ error: '邮件发送失败，请稍后重试' });
  }
});
```

> **Note:** Replace `findUserByEmail(email)` with however your codebase looks up a user by email. For example: `await User.findOne({ email })` (Mongoose) or `db.get('SELECT id FROM users WHERE email = ?', [email])` (SQLite).

- [ ] **Step 3: Add `POST /verify-code` route**

```js
const { verifyOTP } = require('./utils/otpStore');

// POST /verify-code
// Body: { email, code, type: "register" | "reset" }
router.post('/verify-code', (req, res) => {
  const { email, code, type } = req.body;
  if (!email || !code || !['register', 'reset'].includes(type)) {
    return res.status(400).json({ error: '参数错误' });
  }
  const token = verifyOTP(email, code, type);
  if (!token) return res.status(400).json({ error: '验证码错误或已过期' });
  res.json({ verifiedToken: token });
});
```

- [ ] **Step 4: Test both endpoints with curl**

```bash
# Send code
curl -X POST http://localhost:3000/send-code \
  -H "Content-Type: application/json" \
  -d '{"email":"yourtest@email.com","type":"register"}'
# Expected: {"success":true}

# Verify with wrong code
curl -X POST http://localhost:3000/verify-code \
  -H "Content-Type: application/json" \
  -d '{"email":"yourtest@email.com","code":"000000","type":"register"}'
# Expected: 400 {"error":"验证码错误或已过期"}

# Verify with correct code (use code from the email you received)
curl -X POST http://localhost:3000/verify-code \
  -H "Content-Type: application/json" \
  -d '{"email":"yourtest@email.com","code":"ACTUAL_CODE","type":"register"}'
# Expected: {"verifiedToken":"some-uuid"}
```

- [ ] **Step 5: Commit backend changes so far**

```bash
git add utils/otpStore.js utils/emailService.js
git commit -m "feat: add OTP store, email service, send-code and verify-code endpoints"
```

---

## Task 4: Backend — `/reset-password` + update `/register`

**Files:**
- Modify: same routes file as Task 3

- [ ] **Step 1: Add `POST /reset-password` route**

```js
const { consumeToken } = require('./utils/otpStore');

// POST /reset-password
// Body: { verifiedToken, newPassword }
router.post('/reset-password', async (req, res) => {
  const { verifiedToken, newPassword } = req.body;
  if (!verifiedToken || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: '参数错误' });
  }
  const email = consumeToken(verifiedToken, 'reset');
  if (!email) return res.status(400).json({ error: '验证已过期，请重新验证' });
  try {
    // Replace the next line with your actual password update logic
    // e.g., const hashed = await bcrypt.hash(newPassword, 10); await User.updateOne({ email }, { password: hashed });
    await updateUserPassword(email, newPassword);
    res.json({ success: true });
  } catch (e) {
    console.error('Reset password failed:', e);
    res.status(500).json({ error: '重置失败，请稍后重试' });
  }
});
```

> **Note:** Replace `updateUserPassword(email, newPassword)` with your actual DB update. Hash the password if your codebase does so (check how `/register` currently stores passwords).

- [ ] **Step 2: Update `/register` to require `verifiedToken`**

Find the existing `/register` handler. Add token validation at the top of the handler:

```js
// At the TOP of your existing /register handler, before creating the user:
const { consumeToken } = require('./utils/otpStore');

const { verifiedToken, email, password, nickname } = req.body; // adjust field names to match your existing code

const tokenEmail = consumeToken(verifiedToken, 'register');
if (!tokenEmail || tokenEmail !== email) {
  return res.status(400).json({ error: '邮箱未验证，请重新验证' });
}
// ... rest of existing register logic unchanged
```

- [ ] **Step 3: Test reset-password flow with curl**

```bash
# 1. Send reset code
curl -X POST http://localhost:3000/send-code \
  -H "Content-Type: application/json" \
  -d '{"email":"existing@user.com","type":"reset"}'

# 2. Verify code (use actual code from email)
curl -X POST http://localhost:3000/verify-code \
  -H "Content-Type: application/json" \
  -d '{"email":"existing@user.com","code":"ACTUAL_CODE","type":"reset"}'
# Save the verifiedToken from the response

# 3. Reset password
curl -X POST http://localhost:3000/reset-password \
  -H "Content-Type: application/json" \
  -d '{"verifiedToken":"TOKEN_FROM_STEP_2","newPassword":"newpass123"}'
# Expected: {"success":true}

# 4. Verify login with new password works
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"username":"existing@user.com","password":"newpass123"}'
# Expected: token in response
```

- [ ] **Step 4: Commit**

```bash
git commit -am "feat: add reset-password endpoint, require verifiedToken on register"
```

---

## Task 5: Frontend — `authApi.js` new functions + update register

**Files:**
- Modify: `src/services/authApi.js`

- [ ] **Step 1: Add 3 new functions and update `register` in `src/services/authApi.js`**

```js
const BASE_URL = 'http://42.194.218.157:3000';

// existing login/logout unchanged

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
```

- [ ] **Step 2: Update `AuthContext.js` — `register` accepts `verifiedToken`**

In `src/contexts/AuthContext.js`, change the `register` callback signature and the `apiRegister` call:

```js
// Change this line:
import { login as apiLogin, register as apiRegister, logout as apiLogout } from '../services/authApi';

// Change the register callback:
const register = useCallback(async (email, password, nickname, verifiedToken) => {
  const data = await apiRegister(email, password, nickname, verifiedToken);
  if (data.code && data.code !== 200) {
    throw new Error(data.message || 'Register failed');
  }
  if (data.token || data.access_token) {
    const t = data.token || data.access_token;
    const u = data.user || { email, nickname };
    setToken(t); setUser(u); await persist(t, u); return u;
  }
  return data;
}, [persist]);
```

- [ ] **Step 3: Commit**

```bash
cd /Users/xixi/Desktop/FocusMeow
git add src/services/authApi.js src/contexts/AuthContext.js
git commit -m "feat: add sendVerificationCode, verifyCode, resetPassword to authApi; update register signature"
```

---

## Task 6: Frontend — WelcomeScreen registration OTP step

**Files:**
- Modify: `App.tsx` (WelcomeScreen function, lines 36–130)

- [ ] **Step 1: Add new imports at top of `App.tsx`**

Add to the existing import line:
```js
import { sendVerificationCode, verifyCode } from './src/services/authApi';
```

- [ ] **Step 2: Replace the entire `WelcomeScreen` function with the version below**

This adds `step` state (`'landing'` | `'login'` | `'register'` | `'verify-register'`), a 60s countdown, and OTP input for registration. Forgot password is added in Task 7.

```js
function WelcomeScreen({ onLogin, lang }) {
  const zh = lang === 'zh';
  const { login, register } = useAuth();
  const [step, setStep] = useState('landing');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [otp, setOtp] = useState('');
  const [verifiedToken, setVerifiedToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('@focusmeow_remember');
        if (saved) { const { email: e, password: p } = JSON.parse(saved); setEmail(e || ''); setPassword(p || ''); }
      } catch {}
    })();
  }, []);

  const startCountdown = () => {
    setCountdown(60);
    countdownRef.current = setInterval(() => {
      setCountdown(c => { if (c <= 1) { clearInterval(countdownRef.current); return 0; } return c - 1; });
    }, 1000);
  };

  useEffect(() => () => clearInterval(countdownRef.current), []);

  const doSendRegisterCode = async () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email.trim())) {
      Alert.alert(zh ? '提示' : 'Tip', zh ? '请输入有效邮箱' : 'Enter a valid email'); return;
    }
    if (!password || password.length < 6) {
      Alert.alert(zh ? '提示' : 'Tip', zh ? '密码至少 6 位' : 'Password min 6 chars'); return;
    }
    if (!nickname.trim()) {
      Alert.alert(zh ? '提示' : 'Tip', zh ? '请输入昵称' : 'Enter a nickname'); return;
    }
    setLoading(true);
    try {
      await sendVerificationCode(email.trim(), 'register');
      setStep('verify-register');
      startCountdown();
    } catch (e) {
      Alert.alert(zh ? '发送失败' : 'Send Failed', e.message);
    } finally { setLoading(false); }
  };

  const doVerifyRegister = async () => {
    if (otp.length !== 6) { Alert.alert(zh ? '提示' : 'Tip', zh ? '请输入 6 位验证码' : 'Enter 6-digit code'); return; }
    setLoading(true);
    try {
      const { verifiedToken: vt } = await verifyCode(email.trim(), otp, 'register');
      setVerifiedToken(vt);
      await register(email.trim(), password, nickname.trim(), vt);
      Alert.alert(zh ? '注册成功' : 'Success', zh ? '欢迎加入专注喵！' : 'Welcome to FocusMeow!');
      onLogin();
    } catch (e) {
      Alert.alert(zh ? '失败' : 'Failed', e.message);
    } finally { setLoading(false); }
  };

  const doLogin = async () => {
    if (!email.trim() || !password || password.length < 6) {
      Alert.alert(zh ? '提示' : 'Tip', zh ? '请填写完整信息' : 'Fill in all fields'); return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      await AsyncStorage.setItem('@focusmeow_remember', JSON.stringify({ email: email.trim(), password }));
      onLogin();
    } catch (e) {
      Alert.alert(zh ? '登录失败' : 'Login Failed', e.message);
    } finally { setLoading(false); }
  };

  // Landing screen
  if (step === 'landing') return (
    <View style={{ flex: 1, backgroundColor: '#FBF5F0', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <Image source={require('./src/assets/first_logo.png')} style={{ width: 100, height: 100, borderRadius: 50, marginBottom: 20, borderWidth: 3, borderColor: '#e8940a' }} />
      <Text style={{ fontSize: 28, fontWeight: '900', color: '#D06B6B', marginBottom: 6 }}>{zh ? '专注喵' : 'FocusMeow'}</Text>
      <Text style={{ fontSize: 13, color: '#A09080', marginBottom: 40 }}>{zh ? '专注每一刻，陪伴每一天' : 'Focus every moment'}</Text>
      <TouchableOpacity style={{ backgroundColor: '#D06B6B', borderRadius: 14, height: 50, width: '100%', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }} onPress={() => setStep('login')}>
        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>{zh ? '登录' : 'Login'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={{ backgroundColor: '#fff', borderRadius: 14, height: 50, width: '100%', justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 1.5, borderColor: '#D06B6B' }} onPress={() => setStep('register')}>
        <Text style={{ color: '#D06B6B', fontSize: 17, fontWeight: '600' }}>{zh ? '注册' : 'Register'}</Text>
      </TouchableOpacity>
    </View>
  );

  // Login screen
  if (step === 'login') return (
    <View style={{ flex: 1, backgroundColor: '#FBF5F0', justifyContent: 'center', padding: 32 }}>
      <TouchableOpacity onPress={() => setStep('landing')} style={{ marginBottom: 24 }}>
        <Text style={{ color: '#8C8480', fontSize: 14 }}>{'< '}{zh ? '返回' : 'Back'}</Text>
      </TouchableOpacity>
      <Text style={{ fontSize: 26, fontWeight: '700', color: '#332E2C', marginBottom: 6 }}>{zh ? '登录' : 'Login'}</Text>
      <Text style={{ fontSize: 13, color: '#A09080', marginBottom: 28 }}>{zh ? '欢迎回来～' : 'Welcome back~'}</Text>
      <TextInput style={{ backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(180,150,130,0.18)', paddingHorizontal: 14, height: 50, fontSize: 15, color: '#332E2C', marginBottom: 12 }} placeholder={zh ? '邮箱' : 'Email'} placeholderTextColor="#B0A090" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={{ backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(180,150,130,0.18)', paddingHorizontal: 14, height: 50, fontSize: 15, color: '#332E2C', marginBottom: 12 }} placeholder={zh ? '密码（至少 6 位）' : 'Password (min 6)'} placeholderTextColor="#B0A090" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
      <TouchableOpacity onPress={() => setStep('forgot')} style={{ alignSelf: 'flex-end', marginBottom: 20 }}>
        <Text style={{ color: '#D06B6B', fontSize: 13 }}>{zh ? '忘记密码？' : 'Forgot password?'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={{ backgroundColor: '#D06B6B', borderRadius: 14, height: 50, justifyContent: 'center', alignItems: 'center', opacity: loading ? 0.6 : 1 }} onPress={doLogin} disabled={loading}>
        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>{loading ? '...' : (zh ? '登录' : 'Login')}</Text>
      </TouchableOpacity>
    </View>
  );

  // Register screen — step 1: fill info
  if (step === 'register') return (
    <View style={{ flex: 1, backgroundColor: '#FBF5F0', justifyContent: 'center', padding: 32 }}>
      <TouchableOpacity onPress={() => setStep('landing')} style={{ marginBottom: 24 }}>
        <Text style={{ color: '#8C8480', fontSize: 14 }}>{'< '}{zh ? '返回' : 'Back'}</Text>
      </TouchableOpacity>
      <Text style={{ fontSize: 26, fontWeight: '700', color: '#332E2C', marginBottom: 6 }}>{zh ? '注册' : 'Register'}</Text>
      <Text style={{ fontSize: 13, color: '#A09080', marginBottom: 28 }}>{zh ? '创建你的专注喵账号' : 'Create your FocusMeow account'}</Text>
      <TextInput style={{ backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(180,150,130,0.18)', paddingHorizontal: 14, height: 50, fontSize: 15, color: '#332E2C', marginBottom: 12 }} placeholder={zh ? '昵称' : 'Nickname'} placeholderTextColor="#B0A090" value={nickname} onChangeText={setNickname} autoCapitalize="none" />
      <TextInput style={{ backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(180,150,130,0.18)', paddingHorizontal: 14, height: 50, fontSize: 15, color: '#332E2C', marginBottom: 12 }} placeholder={zh ? '邮箱' : 'Email'} placeholderTextColor="#B0A090" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={{ backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(180,150,130,0.18)', paddingHorizontal: 14, height: 50, fontSize: 15, color: '#332E2C', marginBottom: 24 }} placeholder={zh ? '密码（至少 6 位）' : 'Password (min 6)'} placeholderTextColor="#B0A090" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
      <TouchableOpacity style={{ backgroundColor: '#D06B6B', borderRadius: 14, height: 50, justifyContent: 'center', alignItems: 'center', opacity: loading ? 0.6 : 1 }} onPress={doSendRegisterCode} disabled={loading}>
        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>{loading ? '...' : (zh ? '发送验证码' : 'Send Code')}</Text>
      </TouchableOpacity>
    </View>
  );

  // Register screen — step 2: OTP input
  if (step === 'verify-register') return (
    <View style={{ flex: 1, backgroundColor: '#FBF5F0', justifyContent: 'center', padding: 32 }}>
      <TouchableOpacity onPress={() => { setStep('register'); setOtp(''); clearInterval(countdownRef.current); setCountdown(0); }} style={{ marginBottom: 24 }}>
        <Text style={{ color: '#8C8480', fontSize: 14 }}>{'< '}{zh ? '返回' : 'Back'}</Text>
      </TouchableOpacity>
      <Text style={{ fontSize: 26, fontWeight: '700', color: '#332E2C', marginBottom: 6 }}>{zh ? '验证邮箱' : 'Verify Email'}</Text>
      <Text style={{ fontSize: 13, color: '#A09080', marginBottom: 32 }}>{zh ? `验证码已发送至 ${email}` : `Code sent to ${email}`}</Text>
      <TextInput style={{ backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(180,150,130,0.18)', paddingHorizontal: 14, height: 60, fontSize: 28, fontWeight: '700', color: '#D06B6B', marginBottom: 16, textAlign: 'center', letterSpacing: 12 }} placeholder="------" placeholderTextColor="#D0C0B0" value={otp} onChangeText={v => setOtp(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} />
      <TouchableOpacity style={{ backgroundColor: '#D06B6B', borderRadius: 14, height: 50, justifyContent: 'center', alignItems: 'center', opacity: (loading || otp.length !== 6) ? 0.5 : 1, marginBottom: 16 }} onPress={doVerifyRegister} disabled={loading || otp.length !== 6}>
        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>{loading ? '...' : (zh ? '验证并完成注册' : 'Verify & Register')}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => { if (countdown > 0) return; setOtp(''); doSendRegisterCode(); }} style={{ alignItems: 'center' }} disabled={countdown > 0}>
        <Text style={{ color: countdown > 0 ? '#B0A090' : '#D06B6B', fontSize: 14 }}>{countdown > 0 ? `${countdown}s ${zh ? '后重新发送' : 'to resend'}` : (zh ? '重新发送' : 'Resend')}</Text>
      </TouchableOpacity>
    </View>
  );

  return null;
}
```

- [ ] **Step 3: Test registration flow on device/simulator**

1. Launch app → tap "注册"
2. Fill nickname, email, password → tap "发送验证码"
3. Check email for 6-digit code
4. Enter code → tap "验证并完成注册"
5. Should enter the app as logged-in user

- [ ] **Step 4: Commit**

```bash
cd /Users/xixi/Desktop/FocusMeow
git add App.tsx src/services/authApi.js
git commit -m "feat: add OTP step to WelcomeScreen registration flow"
```

---

## Task 7: Frontend — Forgot Password flow in WelcomeScreen

**Files:**
- Modify: `App.tsx` — add forgot-password steps to WelcomeScreen

- [ ] **Step 1: Add new imports at top of `App.tsx`**

```js
import { sendVerificationCode, verifyCode, resetPassword as apiResetPassword } from './src/services/authApi';
```

(If already added in Task 6, skip this step.)

- [ ] **Step 2: Add forgot-password state and handlers inside WelcomeScreen**

Add these state variables alongside the existing ones at the top of `WelcomeScreen`:

```js
const [resetEmail, setResetEmail] = useState('');
const [resetOtp, setResetOtp] = useState('');
const [resetToken, setResetToken] = useState('');
const [newPassword, setNewPassword] = useState('');
const [confirmNewPwd, setConfirmNewPwd] = useState('');
```

Add these handlers inside `WelcomeScreen`:

```js
const doSendResetCode = async () => {
  if (!resetEmail.trim() || !/\S+@\S+\.\S+/.test(resetEmail.trim())) {
    Alert.alert(zh ? '提示' : 'Tip', zh ? '请输入有效邮箱' : 'Enter a valid email'); return;
  }
  setLoading(true);
  try {
    await sendVerificationCode(resetEmail.trim(), 'reset');
    setStep('verify-reset');
    startCountdown();
  } catch (e) {
    Alert.alert(zh ? '发送失败' : 'Send Failed', e.message);
  } finally { setLoading(false); }
};

const doVerifyReset = async () => {
  if (resetOtp.length !== 6) { Alert.alert(zh ? '提示' : 'Tip', zh ? '请输入 6 位验证码' : 'Enter 6-digit code'); return; }
  setLoading(true);
  try {
    const { verifiedToken: vt } = await verifyCode(resetEmail.trim(), resetOtp, 'reset');
    setResetToken(vt);
    setStep('new-password');
  } catch (e) {
    Alert.alert(zh ? '失败' : 'Failed', e.message);
  } finally { setLoading(false); }
};

const doResetPassword = async () => {
  if (!newPassword || newPassword.length < 6) {
    Alert.alert(zh ? '提示' : 'Tip', zh ? '密码至少 6 位' : 'Password min 6 chars'); return;
  }
  if (newPassword !== confirmNewPwd) {
    Alert.alert(zh ? '提示' : 'Tip', zh ? '两次密码不一致' : 'Passwords do not match'); return;
  }
  setLoading(true);
  try {
    await apiResetPassword(resetToken, newPassword);
    Alert.alert(zh ? '重置成功' : 'Success', zh ? '密码已重置，请重新登录' : 'Password reset. Please log in.', [{ text: zh ? '好的' : 'OK', onPress: () => { setStep('login'); setResetEmail(''); setResetOtp(''); setResetToken(''); setNewPassword(''); setConfirmNewPwd(''); }}]);
  } catch (e) {
    Alert.alert(zh ? '失败' : 'Failed', e.message);
  } finally { setLoading(false); }
};
```

- [ ] **Step 3: Add the 3 forgot-password render branches inside WelcomeScreen (after `verify-register` branch, before `return null`)**

```js
// Forgot password — step 1: enter email
if (step === 'forgot') return (
  <View style={{ flex: 1, backgroundColor: '#FBF5F0', justifyContent: 'center', padding: 32 }}>
    <TouchableOpacity onPress={() => setStep('login')} style={{ marginBottom: 24 }}>
      <Text style={{ color: '#8C8480', fontSize: 14 }}>{'< '}{zh ? '返回' : 'Back'}</Text>
    </TouchableOpacity>
    <Text style={{ fontSize: 26, fontWeight: '700', color: '#332E2C', marginBottom: 6 }}>{zh ? '找回密码' : 'Reset Password'}</Text>
    <Text style={{ fontSize: 13, color: '#A09080', marginBottom: 28 }}>{zh ? '输入注册邮箱，我们将发送验证码' : 'Enter your email to receive a reset code'}</Text>
    <TextInput style={{ backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(180,150,130,0.18)', paddingHorizontal: 14, height: 50, fontSize: 15, color: '#332E2C', marginBottom: 24 }} placeholder={zh ? '注册邮箱' : 'Registered email'} placeholderTextColor="#B0A090" value={resetEmail} onChangeText={setResetEmail} keyboardType="email-address" autoCapitalize="none" />
    <TouchableOpacity style={{ backgroundColor: '#D06B6B', borderRadius: 14, height: 50, justifyContent: 'center', alignItems: 'center', opacity: loading ? 0.6 : 1 }} onPress={doSendResetCode} disabled={loading}>
      <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>{loading ? '...' : (zh ? '发送验证码' : 'Send Code')}</Text>
    </TouchableOpacity>
  </View>
);

// Forgot password — step 2: enter OTP
if (step === 'verify-reset') return (
  <View style={{ flex: 1, backgroundColor: '#FBF5F0', justifyContent: 'center', padding: 32 }}>
    <TouchableOpacity onPress={() => { setStep('forgot'); setResetOtp(''); clearInterval(countdownRef.current); setCountdown(0); }} style={{ marginBottom: 24 }}>
      <Text style={{ color: '#8C8480', fontSize: 14 }}>{'< '}{zh ? '返回' : 'Back'}</Text>
    </TouchableOpacity>
    <Text style={{ fontSize: 26, fontWeight: '700', color: '#332E2C', marginBottom: 6 }}>{zh ? '输入验证码' : 'Enter Code'}</Text>
    <Text style={{ fontSize: 13, color: '#A09080', marginBottom: 32 }}>{zh ? `验证码已发送至 ${resetEmail}` : `Code sent to ${resetEmail}`}</Text>
    <TextInput style={{ backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(180,150,130,0.18)', paddingHorizontal: 14, height: 60, fontSize: 28, fontWeight: '700', color: '#D06B6B', marginBottom: 16, textAlign: 'center', letterSpacing: 12 }} placeholder="------" placeholderTextColor="#D0C0B0" value={resetOtp} onChangeText={v => setResetOtp(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} />
    <TouchableOpacity style={{ backgroundColor: '#D06B6B', borderRadius: 14, height: 50, justifyContent: 'center', alignItems: 'center', opacity: (loading || resetOtp.length !== 6) ? 0.5 : 1, marginBottom: 16 }} onPress={doVerifyReset} disabled={loading || resetOtp.length !== 6}>
      <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>{loading ? '...' : (zh ? '验证' : 'Verify')}</Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={() => { if (countdown > 0) return; setResetOtp(''); doSendResetCode(); }} style={{ alignItems: 'center' }} disabled={countdown > 0}>
      <Text style={{ color: countdown > 0 ? '#B0A090' : '#D06B6B', fontSize: 14 }}>{countdown > 0 ? `${countdown}s ${zh ? '后重新发送' : 'to resend'}` : (zh ? '重新发送' : 'Resend')}</Text>
    </TouchableOpacity>
  </View>
);

// Forgot password — step 3: new password
if (step === 'new-password') return (
  <View style={{ flex: 1, backgroundColor: '#FBF5F0', justifyContent: 'center', padding: 32 }}>
    <Text style={{ fontSize: 26, fontWeight: '700', color: '#332E2C', marginBottom: 6 }}>{zh ? '设置新密码' : 'New Password'}</Text>
    <Text style={{ fontSize: 13, color: '#A09080', marginBottom: 28 }}>{zh ? '请设置你的新密码' : 'Set your new password'}</Text>
    <TextInput style={{ backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(180,150,130,0.18)', paddingHorizontal: 14, height: 50, fontSize: 15, color: '#332E2C', marginBottom: 12 }} placeholder={zh ? '新密码（至少 6 位）' : 'New password (min 6)'} placeholderTextColor="#B0A090" value={newPassword} onChangeText={setNewPassword} secureTextEntry autoCapitalize="none" />
    <TextInput style={{ backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(180,150,130,0.18)', paddingHorizontal: 14, height: 50, fontSize: 15, color: '#332E2C', marginBottom: 24 }} placeholder={zh ? '确认新密码' : 'Confirm new password'} placeholderTextColor="#B0A090" value={confirmNewPwd} onChangeText={setConfirmNewPwd} secureTextEntry autoCapitalize="none" />
    <TouchableOpacity style={{ backgroundColor: '#D06B6B', borderRadius: 14, height: 50, justifyContent: 'center', alignItems: 'center', opacity: loading ? 0.6 : 1 }} onPress={doResetPassword} disabled={loading}>
      <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>{loading ? '...' : (zh ? '重置密码' : 'Reset Password')}</Text>
    </TouchableOpacity>
  </View>
);
```

- [ ] **Step 4: Test forgot password flow on device/simulator**

1. Launch app → tap "登录" → tap "忘记密码？"
2. Enter registered email → tap "发送验证码"
3. Check email for code → enter code → tap "验证"
4. Enter new password twice → tap "重置密码"
5. Success alert → redirected to login → login with new password succeeds

- [ ] **Step 5: Commit**

```bash
cd /Users/xixi/Desktop/FocusMeow
git add App.tsx
git commit -m "feat: add forgot-password flow (send code → verify → new password)"
```

---

## Task 8: Frontend — AuthModal registration OTP step

**Files:**
- Modify: `src/components/AuthModal.js`

- [ ] **Step 1: Update imports in `AuthModal.js`**

Add to existing imports:
```js
import { sendVerificationCode, verifyCode } from '../services/authApi';
```

- [ ] **Step 2: Replace the entire `AuthModal` function with the updated version below**

This mirrors the WelcomeScreen registration flow, adding OTP as `mode === 'verify-register'`.

```js
export default function AuthModal({ visible, onClose, onSuccess, onBack }) {
  const { login, register } = useAuth();
  const { lang } = useGame();
  const zh = lang === 'zh';
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef(null);

  useEffect(() => () => clearInterval(countdownRef.current), []);

  const startCountdown = () => {
    setCountdown(60);
    countdownRef.current = setInterval(() => {
      setCountdown(c => { if (c <= 1) { clearInterval(countdownRef.current); return 0; } return c - 1; });
    }, 1000);
  };

  const resetForm = () => { setEmail(''); setPassword(''); setNickname(''); setConfirmPwd(''); setOtp(''); setShowPwd(false); clearInterval(countdownRef.current); setCountdown(0); };
  const handleClose = () => { resetForm(); setMode('login'); onClose(); };

  const doSendRegisterCode = async () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email.trim())) { Alert.alert(zh ? '提示' : 'Tip', zh ? '请输入有效邮箱' : 'Invalid email'); return; }
    if (!password || password.length < 6) { Alert.alert(zh ? '提示' : 'Tip', zh ? '密码至少 6 位' : 'Password min 6 chars'); return; }
    if (!nickname.trim()) { Alert.alert(zh ? '提示' : 'Tip', zh ? '请输入昵称' : 'Enter nickname'); return; }
    if (password !== confirmPwd) { Alert.alert(zh ? '提示' : 'Tip', zh ? '两次密码不一致' : 'Passwords do not match'); return; }
    setLoading(true);
    try {
      await sendVerificationCode(email.trim(), 'register');
      setMode('verify-register');
      startCountdown();
    } catch (e) { Alert.alert(zh ? '发送失败' : 'Failed', e.message); }
    finally { setLoading(false); }
  };

  const doVerifyAndRegister = async () => {
    if (otp.length !== 6) { Alert.alert(zh ? '提示' : 'Tip', zh ? '请输入 6 位验证码' : 'Enter 6-digit code'); return; }
    setLoading(true);
    try {
      const { verifiedToken } = await verifyCode(email.trim(), otp, 'register');
      await register(email.trim(), password, nickname.trim(), verifiedToken);
      playFeedback?.('success');
      Alert.alert(zh ? '注册成功' : 'Success', zh ? '欢迎加入专注喵！' : 'Welcome!', [{ text: zh ? '好的' : 'OK', onPress: () => { handleClose(); onSuccess?.(); }}]);
    } catch (e) { Alert.alert(zh ? '失败' : 'Failed', e.message); }
    finally { setLoading(false); }
  };

  const doLogin = async () => {
    setLoading(true);
    try {
      await login(email.trim(), password);
      playFeedback?.('success');
      handleClose();
      onSuccess?.();
    } catch (e) { Alert.alert(zh ? '登录失败' : 'Login Failed', e.message || (zh ? '请稍后重试' : 'Please try again')); }
    finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={st.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={st.card}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <TouchableOpacity onPress={mode === 'verify-register' ? () => { setMode('register'); setOtp(''); clearInterval(countdownRef.current); setCountdown(0); } : (onBack || handleClose)} style={{ padding: 4 }}>
              <Text style={{ fontSize: 18, color: '#8C8480' }}>{'←'}</Text>
            </TouchableOpacity>
            <Text style={[st.title, { flex: 1, marginHorizontal: 8 }]}>
              {mode === 'login' ? (zh ? '登录' : 'Login') : mode === 'register' ? (zh ? '注册' : 'Register') : (zh ? '验证邮箱' : 'Verify Email')}
            </Text>
            <TouchableOpacity onPress={handleClose} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(180,150,130,0.15)', borderWidth: 1.5, borderColor: '#8C8480', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 14, color: '#8C8480' }}>X</Text>
            </TouchableOpacity>
          </View>

          {/* Login */}
          {mode === 'login' && <>
            <Text style={st.subtitle}>{zh ? '欢迎回来～ 🐾' : 'Welcome back~'}</Text>
            <View style={st.inputWrap}><TextInput style={st.input} placeholder={zh ? '邮箱' : 'Email'} placeholderTextColor="#ccc" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} /></View>
            <View style={st.inputWrap}>
              <TextInput style={[st.input, { flex: 1 }]} placeholder={zh ? '密码（至少 6 位）' : 'Password (min 6)'} placeholderTextColor="#ccc" value={password} onChangeText={setPassword} secureTextEntry={!showPwd} autoCapitalize="none" />
              <TouchableOpacity onPress={() => setShowPwd(!showPwd)} style={{ paddingLeft: 8 }}><Text style={{ fontSize: 14 }}>{showPwd ? '🙈' : '👁️'}</Text></TouchableOpacity>
            </View>
            <TouchableOpacity style={[st.submitBtn, loading && { opacity: 0.6 }]} onPress={doLogin} disabled={loading} activeOpacity={0.8}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={st.submitText}>{zh ? '登录' : 'Login'}</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { resetForm(); setMode('register'); }} style={{ marginTop: 16, alignItems: 'center' }}>
              <Text style={{ color: '#D06B6B', fontSize: 14 }}>{zh ? '没有账号？去注册' : 'No account? Register'}</Text>
            </TouchableOpacity>
          </>}

          {/* Register — step 1 */}
          {mode === 'register' && <>
            <Text style={st.subtitle}>{zh ? '创建你的专注喵账号 🐱' : 'Create your FocusMeow account'}</Text>
            <View style={st.inputWrap}><TextInput style={st.input} placeholder={zh ? '昵称' : 'Nickname'} placeholderTextColor="#ccc" value={nickname} onChangeText={setNickname} maxLength={20} autoCapitalize="none" /></View>
            <View style={st.inputWrap}><TextInput style={st.input} placeholder={zh ? '邮箱' : 'Email'} placeholderTextColor="#ccc" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} /></View>
            <View style={st.inputWrap}>
              <TextInput style={[st.input, { flex: 1 }]} placeholder={zh ? '密码（至少 6 位）' : 'Password (min 6)'} placeholderTextColor="#ccc" value={password} onChangeText={setPassword} secureTextEntry={!showPwd} autoCapitalize="none" />
              <TouchableOpacity onPress={() => setShowPwd(!showPwd)} style={{ paddingLeft: 8 }}><Text style={{ fontSize: 14 }}>{showPwd ? '🙈' : '👁️'}</Text></TouchableOpacity>
            </View>
            <View style={st.inputWrap}><TextInput style={st.input} placeholder={zh ? '确认密码' : 'Confirm Password'} placeholderTextColor="#ccc" value={confirmPwd} onChangeText={setConfirmPwd} secureTextEntry={!showPwd} autoCapitalize="none" /></View>
            <TouchableOpacity style={[st.submitBtn, loading && { opacity: 0.6 }]} onPress={doSendRegisterCode} disabled={loading} activeOpacity={0.8}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={st.submitText}>{zh ? '发送验证码' : 'Send Code'}</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { resetForm(); setMode('login'); }} style={{ marginTop: 16, alignItems: 'center' }}>
              <Text style={{ color: '#D06B6B', fontSize: 14 }}>{zh ? '已有账号？去登录' : 'Have account? Login'}</Text>
            </TouchableOpacity>
          </>}

          {/* Register — step 2: OTP */}
          {mode === 'verify-register' && <>
            <Text style={st.subtitle}>{zh ? `验证码已发送至 ${email}` : `Code sent to ${email}`}</Text>
            <TextInput style={[st.inputWrap, { height: 60, justifyContent: 'center', fontSize: 28, fontWeight: '700', color: '#D06B6B', textAlign: 'center', letterSpacing: 12, paddingHorizontal: 14 }]} placeholder="------" placeholderTextColor="#D0C0B0" value={otp} onChangeText={v => setOtp(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} />
            <TouchableOpacity style={[st.submitBtn, (loading || otp.length !== 6) && { opacity: 0.5 }, { marginTop: 16 }]} onPress={doVerifyAndRegister} disabled={loading || otp.length !== 6}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={st.submitText}>{zh ? '验证并完成注册' : 'Verify & Register'}</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { if (countdown > 0) return; setOtp(''); doSendRegisterCode(); }} style={{ marginTop: 16, alignItems: 'center' }} disabled={countdown > 0}>
              <Text style={{ color: countdown > 0 ? '#B0A090' : '#D06B6B', fontSize: 14 }}>{countdown > 0 ? `${countdown}s ${zh ? '后重新发送' : 'to resend'}` : (zh ? '重新发送' : 'Resend')}</Text>
            </TouchableOpacity>
          </>}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
```

Note: `useRef` must be added to the AuthModal imports:
```js
import React, { useState, useRef, useEffect } from 'react';
```

- [ ] **Step 3: Test AuthModal registration via Settings screen**

1. Go to Settings → tap profile card → tap "登录 / 注册" → tap "没有账号？去注册"
2. Fill in details → tap "发送验证码"
3. Receive email, enter code → tap "验证并完成注册"
4. Should close modal and show logged-in state in Settings

- [ ] **Step 4: Commit**

```bash
cd /Users/xixi/Desktop/FocusMeow
git add src/components/AuthModal.js
git commit -m "feat: add OTP step to AuthModal registration flow"
```

---

## Spec Coverage Check

| Spec requirement | Covered by |
|---|---|
| `POST /send-code` endpoint | Task 3 |
| `POST /verify-code` endpoint | Task 3 |
| `POST /reset-password` endpoint | Task 4 |
| `/register` requires verifiedToken | Task 4 |
| `authApi.js` — 3 new functions + updated register | Task 5 |
| `AuthContext` updated register signature | Task 5 |
| WelcomeScreen registration OTP step | Task 6 |
| WelcomeScreen forgot-password flow (3 steps) | Task 7 |
| AuthModal registration OTP step | Task 8 |
| 60s resend cooldown (frontend UX) | Tasks 6, 7, 8 |
| Backend rate-limit (reject if valid OTP exists) | Task 3 (`storeOTP` returns false) |
| All error messages from spec | All tasks |
| Tencent Cloud SES integration | Task 2 |
