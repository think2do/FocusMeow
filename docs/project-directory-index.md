# FocusMeow Project Directory Index

This file is the fastest way to understand where each part of FocusMeow lives.

Goal:

1. Help a new reader quickly understand the project structure.
2. Help future Codex work jump directly to the right files instead of re-scanning the whole repo.
3. Support context engineering by turning the codebase into a task-oriented navigation map.

## 1. Recommended Reading Order

If you are new to the project, read in this order:

1. `App.tsx`
   App entry, navigation, splash, login/welcome flow, and `GameContext` injection.
2. `src/hooks/useGameState.js`
   Single most important business-state file. Focus session logic, cats, collection, rescue, history, memory, audio preferences all converge here.
3. `src/screens/HomeScreen.js`
   Main user-facing home screen and current “large cat swipe / switch” logic.
4. `src/screens/SelectScreen.js`
   Focus setup, running-session screen, interruption rules, white noise, result page.
5. `src/screens/ChatScreen.js`
   Cat chat flow, storage isolation, memory summary, persona binding.
6. `src/screens/CollectionScreen.js`
   Cat warehouse, runaway cat rescue tasks, normal/rare dex.
7. `src/components/PngCatAvatar.js` and `src/data/catImages.js`
   Cat image state rendering and breed/state image mapping.
8. `src/utils/focusActivity.js` + `ios/FocusMeow/AppDelegate.swift` + `ios/FocusMeowLiveActivity/`
   iOS lock screen, Live Activity, Dynamic Island, interruption bridging.

## 2. Top-Level Directory Meaning

### Root app shell

- `App.tsx`
  Main React Native entry. Hosts navigation, splash screen, welcome/login flow, and injects `useGameState` through `GameContext`.

- `index.js`
  RN registration entry.

- `package.json`
  Project dependencies and scripts.

- `README.md`
  Still generic React Native boilerplate. Not a reliable project overview.

### Main source

- `src/`
  Main app logic: screens, hooks, utils, components, assets, services.

### Native iOS

- `ios/`
  Native iOS app, bridge modules, Xcode project, Live Activity extension.

### Native Android

- `android/`
  Android project scaffolding. Current work emphasis is much more iOS-heavy.

### Product and collaboration docs

- `docs/`
  Product docs, share intro assets, Codex collaboration templates, project handoff docs.

### Temporary / backup / low-priority folders

- `_backup_original/`
  Historical backup. Do not use as current source of truth.

- `src/screens/*.backup.js`
  Older screen snapshots. Useful only for reference, not active runtime source.

- `.superpowers/`, `.claude/`, `CLAUDE.md`
  Tooling or assistant-related meta files, not core runtime logic.

## 3. Source Code Map

## 3.1 `src/screens/`

These are the main user-facing app pages.

### `src/screens/HomeScreen.js`

Main homepage.

Responsibilities:

- Shows current large hero cat.
- Handles horizontal cat switching on home screen.
- Shows top preview cat chips.
- Displays current companion prompt / speech bubble.
- Lets user interact with cat: pet, tease, chat, start focus.
- Contains current active unresolved UX issue: large cat switching still feels slightly delayed when swiping.

Read this first when tasks mention:

- 首页
- 大猫切换
- 小猫快捷框
- 猫咪互动
- 首页动画 / 流畅性 / 跳闪 / 延迟

### `src/screens/SelectScreen.js`

Focus setup + focus running + focus result.

Responsibilities:

- Choose cat for focus.
- Choose focus duration and task.
- Manage white noise menu.
- Focus running screen.
- App switch interruption rules.
- Reminder popup logic and return-to-focus behavior.
- Rules modal.
- Success / hungry / runaway result screens.

Read this first when tasks mention:

- 专注页
- 计时器
- 自定义时间
- 任务选择
- 中断规则
- 切 app 提醒
- 专注结果页
- 白噪音

### `src/screens/ChatScreen.js`

Cat chat screen.

Responsibilities:

- Separate chat storage by `catId + user/device scope`.
- Reject invalid legacy caches via schema and persona checks.
- Build archived chat intros and summaries.
- Bind current cat persona and cat memory.
- Manage left/right drawers and voice input.

Read this first when tasks mention:

- 聊天记录串档
- 聊天缓存污染
- 猫咪记忆
- persona
- 语音输入

### `src/screens/CollectionScreen.js`

Cat collection screen.

Responsibilities:

- Warehouse tab showing owned cats.
- Runaway cat semi-transparent display.
- Rescue quest acceptance and progress copy.
- Normal dex and rare dex.
- Swipe between warehouse / normal / rare tabs.

Read this first when tasks mention:

- 图鉴
- 猫咪仓库
- 离家出走猫咪
- 找回任务

### `src/screens/AIScreen.js`

AI-related screen.

Current role:

- AI insights / analysis style screen.
- Not the center of current product iteration, but still active screen code.

### `src/screens/SettingsScreen.js`

Settings / profile area.

Current role:

- User settings and account/profile related UI.

### `src/screens/StatsScreen.js`

Legacy statistics screen.

Notes:

- Project currently uses bottom tabs for 首页 / 聊天 / 猫咪 / AI / 设置.
- Stats screen still exists in source but is less central than earlier iterations.

## 3.2 `src/hooks/`

### `src/hooks/useGameState.js`

Project business-logic core. This is the highest-value file in the repo.

Responsibilities:

- Owns all game state and persistence.
- Stores and restores AsyncStorage main state.
- Manages cats, focus progress, stats, collection, memory, rescue state, interruptions.
- Handles cat dedupe by breed/identity.
- Tracks chat memory, interaction memory, focus memory.
- Drives focus completion / failure / runaway / rescue.
- Generates companion prompts for home screen.

High-value exported abilities:

- `startFocus`
- `handleInterrupt`
- `handleFocusDistraction`
- `handleComplete`
- `pauseFocusForSystemInterruption`
- `requestCatRescue`
- `recordChatMemory`
- `recordCatInteraction`
- `archiveChatSummary`
- `getCompanionPrompts`

Read this first when tasks mention:

- 业务规则
- 猫咪获取 / 去重
- 专注完成 / 失败
- 中断计数
- 猫咪离家出走 / 找回
- 记忆系统
- 统计
- 存档恢复 / 清档

## 3.3 `src/components/`

### `src/components/PngCatAvatar.js`

Cat PNG state renderer.

Responsibilities:

- Switches cat frames by state.
- Handles idle / sit / happy / eating / hungry / left / dead rendering.
- Controls timing for idle wag / happy flash / eating loops.

Read this first when tasks mention:

- 猫咪切图慢
- happy 图
- 吃饭图
- left 图
- 猫咪 PNG 显示

### `src/components/CatAvatar.js`

Wrapper component for cat rendering.

Responsibilities:

- Chooses PNG/SVG path.
- Normalizes state names such as `complete -> happy`.

### `src/components/CircularTimer.js`

Focus countdown circular visualization.

Read this first when tasks mention:

- 圆环倒计时
- 专注页中间计时 UI

### `src/components/AuthModal.js`

Auth-related modal UI helper.

### `src/components/ThemeDeco.js`

Decorative theme helper component.

## 3.4 `src/data/`

### `src/data/catImages.js`

Breed/state image registry.

Responsibilities:

- Maps each breed to `sit1`, `sit2`, `happy`, `hungry`, `left`, `die`, `eat1...eat5`.

### `src/data/gameData.js`

Static game data.

Responsibilities:

- Starter cat
- breed list
- rare cat definitions

### `src/data/catPersona.js`

Cat persona data and identity definitions.

Read this first when tasks mention:

- 猫咪人设
- 聊天语气
- persona 切换
- 灵魂猫咪方向

## 3.5 `src/utils/`

### `src/utils/focusActivity.js`

JS wrapper around iOS native focus activity bridge.

Responsibilities:

- Start / update / stop Live Activity.
- Prepare/cancel/send focus reminders.
- Consume device lock and interruption context flags.

Read this first when tasks mention:

- 锁屏倒计时
- 灵动岛
- Live Activity
- 电话中断暂停

### `src/utils/audio.js`

Audio preference and ambient playback synchronization helper.

Read this first when tasks mention:

- 白噪音
- 音效开关
- 背景音播放

### `src/utils/feedback.js`

Feedback entry point used by JS screens.

Responsibilities:

- Tap/start/haptic/sfx style feedback triggers.

Read this first when tasks mention:

- 震动反馈
- 点击音效
- 切换猫咪音效

### `src/utils/share.js`

Share helper.

Read this first when tasks mention:

- 分享到微信失败
- 分享图片
- share payload

### `src/utils/identity.js`

Identity-scoping helpers.

Used in:

- chat storage scoping
- user/device actor identity

### `src/utils/guestLimits.js`

Guest-mode action limiting.

### `src/utils/helpers.js`

General helpers.

Contains utility logic used broadly by:

- XP calculations
- formatting
- random cat logic

### `src/utils/theme.js`

App theme constants.

Read this first when tasks mention:

- 配色
- 全局 UI 风格
- 颜色不统一

## 3.6 `src/services/`

### `src/services/authApi.js`

Main backend request layer.

Responsibilities:

- email verification
- login/register/reset password
- companion chat API requests

### `src/services/apiClient.js`

Shared API client helper.

## 3.7 `src/contexts/`

### `src/contexts/AuthContext.js`

Authentication state container.

Responsibilities:

- current user
- client/device identity
- auth actions and persistence

## 3.8 `src/i18n/`

### `src/i18n/translations.js`

Main translation dictionary.

Read this first when tasks mention:

- 文案
- 中英文不一致
- 新增文案 key

## 3.9 `src/assets/`

### Visual assets

- `src/assets/first_logo.png`
  Main FocusMeow logo currently reused across app, lock screen, and splash.

- `src/assets/logo.png`
  Secondary/older logo asset.

- `src/assets/chat_box.png`
  Chat bubble related decorative image.

- `src/assets/celebrate.json`
- `src/assets/ewwww_shit.json`
- `src/assets/welcome.json`
  Lottie animation files.

### Audio assets

- `src/assets/audio/`
  JS-side packaged audio:
  - `bird-sound.wav`
  - `cat-pet-meow.wav`
  - `cat-switch.wav`
  - `cat-tease-meow.mp3`
  - `cat-tease-meow.wav`
  - `focus-interrupt-hungry.wav`
  - `focus-runaway-angry.wav`
  - `light-rain-loop.wav`
  - `night-forest-with-insects.wav`

### Avatar assets

- `src/assets/avatars/`
  User/avatar image options used in chat/profile contexts.

### Cat art assets

- `src/assets/cats/`
  All breed PNG art, grouped by breed.
  Contains state images for each breed.

## 4. Native iOS Map

## 4.1 `ios/FocusMeow/`

### `ios/FocusMeow/AppDelegate.swift`

Most important native iOS file.

Responsibilities:

- App bootstrapping
- Disable DEBUG Metro loading banner
- Define `AmbientAudio` native module
- Define `FocusSessionActivity` native module
- Observe lock/interruption events

Read this first when tasks mention:

- iOS 原生报错
- lock screen
- Dynamic Island
- Metro 黑条
- 音频桥接
- 电话/语音中断

### `ios/FocusMeow/AmbientAudioBridge.m`

Bridge declaration support for native audio module exposure.

### `ios/FocusMeow/FocusSessionAttributes.swift`

ActivityKit attribute model shared with Live Activity.

### `ios/FocusMeow/Info.plist`

iOS app capabilities/configuration.

### `ios/FocusMeow/LaunchScreen.storyboard`

Native launch screen.

### `ios/FocusMeow/Audio/`

Native bundled audio resources for iOS playback.

### `ios/FocusMeow/Images.xcassets/`

Main asset catalog.

### `ios/FocusMeow/focus_lock_logo.png`

Logo used for lock screen / focus activity related native contexts.

## 4.2 `ios/FocusMeowLiveActivity/`

Live Activity extension target.

### `ios/FocusMeowLiveActivity/FocusMeowLiveActivity.swift`

Live Activity UI definition for lock screen and Dynamic Island.

Read this first when tasks mention:

- 锁屏卡片布局
- 灵动岛长度
- 灵动岛图标
- 锁屏倒计时样式

### `ios/FocusMeowLiveActivity/Info.plist`

Extension metadata.

### `ios/FocusMeowLiveActivity/focus_lock_logo.png`

Extension-side logo asset.

## 5. Documentation Map

## 5.1 Collaboration / Codex Docs

- `docs/context-engineering-checklist.md`
  How to save tokens and structure prompts/context efficiently.

- `docs/focusmeow-handoff-template.md`
  Reusable handoff templates for new Codex threads.

- `docs/focusmeow-project-handoff-compact.md`
  Compact project-level handoff summary for new threads.

- `docs/project-directory-index.md`
  This file. Project navigation map.

## 5.2 Product / share docs

- `docs/focusmeow-prd.html`
  Product requirement / presentation style document.

- `docs/focusmeow-share-intro.pdf`
- `docs/focusmeow-share-intro.txt`
  Share introduction material.

- `docs/index.html`
  Documentation entry page.

- `docs/assets/*.jpg`
  Screen preview images for docs.

## 6. Important Non-Source Files

- `CLAUDE.md`
  Assistant/tooling notes, not runtime business logic.

- `vercel.json`
  Deployment-related config.

- `原理与使用方法.md`
  Additional Chinese notes/reference document in project root.

## 7. Files To Treat Carefully

These exist, but should not be treated as primary implementation targets unless necessary:

- `src/screens/AIScreen.backup.js`
- `src/screens/ChatScreen.backup.js`
- `src/screens/CollectionScreen.backup.js`
- `src/screens/SelectScreen.backup.js`
- `_backup_original/`
- `App.tsx.bak2`

They are useful for historical comparison only.

## 8. Task-Oriented Quick Navigation

Use this section first before opening files.

### If the task is about home screen cat switching

Read:

1. `src/screens/HomeScreen.js`
2. `src/components/PngCatAvatar.js`
3. `src/data/catImages.js`

### If the task is about focus timer / interruption / result

Read:

1. `src/screens/SelectScreen.js`
2. `src/hooks/useGameState.js`
3. `src/utils/focusActivity.js`
4. `ios/FocusMeow/AppDelegate.swift` if iOS-specific

### If the task is about chat history or memory isolation

Read:

1. `src/screens/ChatScreen.js`
2. `src/utils/identity.js`
3. `src/data/catPersona.js`
4. `src/hooks/useGameState.js`

### If the task is about collection / runaway / rescue

Read:

1. `src/screens/CollectionScreen.js`
2. `src/hooks/useGameState.js`
3. `src/data/gameData.js`

### If the task is about cat art / states / transparent background

Read:

1. `src/components/PngCatAvatar.js`
2. `src/data/catImages.js`
3. `src/assets/cats/...`

### If the task is about lock screen / Dynamic Island / Live Activity

Read:

1. `src/utils/focusActivity.js`
2. `ios/FocusMeow/AppDelegate.swift`
3. `ios/FocusMeow/FocusSessionAttributes.swift`
4. `ios/FocusMeowLiveActivity/FocusMeowLiveActivity.swift`

### If the task is about audio / vibration / sound effects

Read:

1. `src/utils/feedback.js`
2. `src/utils/audio.js`
3. `ios/FocusMeow/AppDelegate.swift`
4. `src/assets/audio/`

### If the task is about login / account / forgot password

Read:

1. `App.tsx`
2. `src/contexts/AuthContext.js`
3. `src/services/authApi.js`

### If the task is about text copy / localization

Read:

1. `src/i18n/translations.js`
2. target screen file using that copy

### If the task is about sharing

Read:

1. `src/utils/share.js`
2. screen that triggers share
3. `src/services/authApi.js` only if backend share payload is involved

## 9. Context Engineering Usage Rule

For future work, do this before coding:

1. Find the task category in section 8.
2. Open only the mapped files first.
3. Read section 3 or 4 only if the task crosses modules.
4. Use `docs/focusmeow-project-handoff-compact.md` for new-thread continuation.
5. Avoid scanning backup files unless the active file history is truly needed.

This reduces repeated context loading and keeps work focused.
