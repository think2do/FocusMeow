# Email Verification & Password Reset Design

**Date:** 2026-04-04
**Project:** FocusMeow (React Native)
**Status:** Approved

---

## Overview

Add email verification to the registration flow, and add a "Forgot Password" flow, both using 6-digit OTP codes sent via Tencent Cloud SES (腾讯云邮件推送).

---

## Scope

Two user-facing flows:

1. **Registration verification** — after submitting registration form, user must verify their email with an OTP before entering the app.
2. **Forgot password** — from the login screen, user can request a reset code, verify it, and set a new password.

---

## Architecture

### Backend (Node.js at 42.194.218.157:3000)

Three new endpoints, plus one modification to `/register`.

#### New: `POST /send-code`

Sends a 6-digit OTP to the given email address.

**Request:**
```json
{ "email": "user@example.com", "type": "register" | "reset" }
```

**Behavior:**
- Generate a random 6-digit code.
- Store `{ code, expiresAt: now + 5min }` in a server-side map keyed by email.
- Send the code via Tencent Cloud SES.
- Return `{ success: true }`.
- Rate-limit: reject if a valid (unexpired) code already exists for this email (prevents spam).

**Response:**
```json
{ "success": true }
```

#### New: `POST /verify-code`

Verifies the OTP. On success, returns a one-time `verifiedToken`.

**Request:**
```json
{ "email": "user@example.com", "code": "123456", "type": "register" | "reset" }
```

**Behavior:**
- Look up stored code for this email.
- If expired or wrong: return 400 with error message.
- If correct: generate a UUID `verifiedToken`, store `{ email, type, expiresAt: now + 5min }`, destroy the OTP record.
- Return `{ verifiedToken }`.

**Response:**
```json
{ "verifiedToken": "a3f9bc12-e8d1-4c7a-b902-..." }
```

#### New: `POST /reset-password`

Resets the user's password using a valid `verifiedToken`.

**Request:**
```json
{ "verifiedToken": "a3f9bc12-...", "newPassword": "newpass123" }
```

**Behavior:**
- Look up `verifiedToken`: must exist, not expired, and have `type: "reset"`.
- Hash new password and update user record.
- Destroy the `verifiedToken`.
- Return `{ success: true }`.

#### Modified: `POST /register`

Add `verifiedToken` as a required field.

**Request (updated):**
```json
{
  "email": "user@example.com",
  "password": "pass123",
  "nickname": "喵主人",
  "verifiedToken": "a3f9bc12-..."
}
```

**Behavior:** Validate that `verifiedToken` exists, is not expired, and has `type: "register"` and matching `email`. Proceed with registration. Destroy the token.

---

### Frontend (React Native)

#### `src/services/authApi.js` — 3 new functions

```js
sendVerificationCode(email, type)   // POST /send-code
verifyCode(email, code, type)       // POST /verify-code → returns verifiedToken
resetPassword(verifiedToken, newPassword)  // POST /reset-password
```

#### `App.tsx` — WelcomeScreen changes

**Registration flow (new steps after form):**

```
Step 1: 填写昵称 + 邮箱 + 密码 [发送验证码]
Step 2: 显示 "验证码已发送到 xxx@..." + 6位数字输入框 + 倒计时60s重发 [验证]
Step 3: 验证成功 → 自动调用 /register (带 verifiedToken) → 进入App
```

**Login page addition:**

Add "忘记密码？" link below the login button.

**Forgot password flow (new sub-screen):**

```
Step 1: 输入注册邮箱 [发送验证码]
Step 2: 输入6位验证码 + 倒计时60s重发 [验证]
Step 3: 输入新密码 + 确认密码 [重置密码]
Step 4: 成功提示 → 返回登录页
```

#### `src/components/AuthModal.js` — same registration changes

The AuthModal (used in Settings screen) mirrors the WelcomeScreen registration flow. Add the same OTP step after the registration form.

---

## OTP Input Component

A shared inline component (not a new file — defined within WelcomeScreen and AuthModal where used):

- 6 individual digit input boxes (standard OTP UX).
- Auto-advance focus on each digit entry.
- Countdown timer (60s), then "重新发送" button becomes active.
- Error state (red border + shake) on wrong code.

---

## Storage

All OTP and verifiedToken state lives **server-side only** (in-memory Map on the Node.js server). The frontend only holds transient UI state (current step, entered code, countdown timer).

The `verifiedToken` is passed in the registration or reset-password request and immediately discarded from the frontend after use.

---

## Error Handling

| Scenario | User-facing message |
|---|---|
| Email not found (reset) | "该邮箱未注册" |
| Wrong OTP code | "验证码错误，请重试" |
| Expired OTP | "验证码已过期，请重新发送" |
| verifiedToken expired | "验证已过期，请重新验证" |
| Email send failure | "发送失败，请稍后重试" |
| Rate limit (resend too soon) | "请等待验证码发送后再重试" |

---

## Out of Scope

- Phone number verification
- Two-factor authentication on login
- Email change verification
- Push notification alternatives

---

## Implementation Notes

- Backend OTP storage uses a simple in-memory `Map`. A Redis store would be more robust for production, but is not required for this project's scale.
- Tencent Cloud SES requires a verified sender domain and API key configured on the server.
- The 60-second resend cooldown is enforced on the frontend only (UX). The backend rate-limits by rejecting requests when an unexpired code already exists.
