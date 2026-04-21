# FocusMeow Project Handoff Compact

## Copy-First Handoff

Use this block directly in a new Codex thread:

```text
继续 FocusMeow。

项目路径：
/Users/xixi/Desktop/FocusMeow

项目概况：
- React Native 0.84.1 iOS-first focus app with cat companionship gameplay
- Main tabs: 首页 / 聊天 / 猫咪 / AI / 设置
- Core loop: 选猫 -> 设定时长与任务 -> 专注 -> 猫咪成长/新猫掉落/失败惩罚

当前已完成的关键能力：
- 首页大猫 + 小猫快捷框 + 猫咪切换器
- 专注页任务选择 / 自定义时长 / 白噪音 / 专注结果页
- 专注失败机制：一次失败猫咪饿晕，两次失败离家出走
- 猫咪仓库 + 离家出走猫咪找回任务（完成 2 次至少 30 分钟专注）
- 聊天记录按 catId + 用户/设备作用域独立存储，旧缓存会判无效
- iOS Live Activity / 锁屏倒计时 / 灵动岛基础链路已接入
- 原生音频桥已接入，支持白噪音和交互/失败音效
- 开屏已去掉 “加载中...” 文案；规则按钮改为弹窗；DEBUG 下已关闭 Metro dev loading banner

当前重点未完全解决的问题：
- 首页左右滑动切换猫咪时，大猫 happy 图仍有体感延迟，已尝试：
  - 去掉 selected -> happy 的 160ms 延迟
  - 提前 currentIndex 更新
  - 但用户仍感到慢半拍，下一步优先怀疑图片解码/预加载/大图渲染切换链路

关键文件：
- /Users/xixi/Desktop/FocusMeow/App.tsx
- /Users/xixi/Desktop/FocusMeow/src/hooks/useGameState.js
- /Users/xixi/Desktop/FocusMeow/src/screens/HomeScreen.js
- /Users/xixi/Desktop/FocusMeow/src/screens/SelectScreen.js
- /Users/xixi/Desktop/FocusMeow/src/screens/ChatScreen.js
- /Users/xixi/Desktop/FocusMeow/src/screens/CollectionScreen.js
- /Users/xixi/Desktop/FocusMeow/src/components/PngCatAvatar.js
- /Users/xixi/Desktop/FocusMeow/src/utils/focusActivity.js
- /Users/xixi/Desktop/FocusMeow/ios/FocusMeow/AppDelegate.swift

核心状态集中位置：
- useGameState.js 管理 cats / focus / result / collection / stats / companionMemory / audioPrefs
- App.tsx 负责导航、欢迎登录页、开屏动画和 GameContext 注入

重要业务规则：
- 每个品种只保留 1 只，去重逻辑在 useGameState.js
- aliveCats / focusCats 不包含 runaway 猫
- 猫咪离家出走后不再出现在可专注选择列表里
- 聊天历史 schemaVersion = 4，按 catId + historyScope + personaId 隔离
- 系统电话/语音/视频中断不计入失败，计时暂停后恢复
- 用户主动切 app 会触发提醒，并按离开时长/次数计入失败

当前原生/iOS注意点：
- Live Activity 相关桥接在 AppDelegate.swift + ios/FocusMeowLiveActivity/
- DEBUG 启动时通过 RCTDevLoadingViewSetEnabled(false) 关闭顶部 Metro banner
- AmbientAudio 原生模块负责 rain/night/bird 白噪音及 catSwitch/petCat/teaseCat/hungry/dead 音效

存储注意点：
- 游戏主状态 key: focusmeow-v7
- 聊天历史 key 前缀: focusmeow-chat-history-v3
- 不要轻易重置整个 AsyncStorage，除非明确要清档

协作要求：
- 不要全盘扫描项目
- 只检查当前问题直接相关文件
- 不要重复复述长历史
- 优先直接修改，最后简短汇报
- 不要回退用户现有未提交改动
```

## One-Screen Summary

### Product

FocusMeow is a companion-style focus app. Users focus with cats, earn new cats, build cat relationships, chat with cats, and receive iOS lock screen / Dynamic Island focus countdown support.

### Stack

- React Native 0.84.1
- React 19
- React Navigation 7
- AsyncStorage
- Lottie
- react-native-share
- react-native-voice
- react-native-svg
- iOS native bridge for audio + Live Activity

### Main Flow

1. Login / guest entry
2. Home screen: see current cat, swipe cats, interact, start focus
3. Select screen: choose cat, duration, task, ambient sound
4. Focus running: timer + cat eating + app-switch interruption rules + Live Activity
5. Result screen: success / hungry / runaway
6. Collection: warehouse, normal dex, rare dex
7. Chat: cat-specific memory and persona

## File Map

### App shell

- `App.tsx`: navigation, welcome/login, splash, GameContext
- `src/contexts/AuthContext.js`: auth state
- `src/services/authApi.js`: backend calls

### Core state

- `src/hooks/useGameState.js`
  - source of truth for cats, focus session, stats, collection, memory, rescue, audio prefs
  - main functions:
    - `startFocus`
    - `handleInterrupt`
    - `handleFocusDistraction`
    - `handleComplete`
    - `pauseFocusForSystemInterruption`
    - `requestCatRescue`
    - `recordChatMemory`
    - `archiveChatSummary`
    - `getCompanionPrompts`

### Screens

- `src/screens/HomeScreen.js`
  - main dashboard
  - large hero cat
  - swipeable cat rail
  - interaction copy and reactions
  - current active unresolved UI lag issue is here

- `src/screens/SelectScreen.js`
  - focus setup and running session UI
  - task selector, custom duration, ambient music
  - app switching reminders and interruption handling
  - rules modal
  - result page

- `src/screens/ChatScreen.js`
  - cat-specific conversation storage
  - schema isolation by cat identity + user/device scope
  - archived summary fallback

- `src/screens/CollectionScreen.js`
  - cat warehouse
  - runaway cat rescue task acceptance
  - normal / rare dex

- `src/screens/AIScreen.js`
  - AI insights screen

- `src/screens/SettingsScreen.js`
  - profile/settings

### Visual + assets

- `src/components/PngCatAvatar.js`
  - PNG cat frame switching
  - idle / eating / happy / hungry / left / dead states

- `src/components/CatAvatar.js`
  - wrapper around PNG/SVG cat avatar logic

- `src/data/catImages.js`
  - maps breed and state images

- `src/data/catPersona.js`
  - cat persona prompt data

### Native iOS

- `ios/FocusMeow/AppDelegate.swift`
  - React startup
  - Metro banner disable in DEBUG
  - AmbientAudio module
  - FocusSessionActivity bridge

- `src/utils/focusActivity.js`
  - JS wrapper for Live Activity / reminder / interruption context

- `ios/FocusMeowLiveActivity/`
  - lock screen and Dynamic Island extension

## Important Rules Already Implemented

- Cat acquisition is deduped by breed/identity.
- One interruption: hungry result.
- Two interruptions: runaway result.
- Runaway cats become semi-transparent and can be rescued through warehouse flow.
- Rescue requires 2 completed sessions of at least 30 minutes.
- Calls/voice/video interruptions should pause focus instead of failing it.
- User app switching is treated differently from system interruptions.
- Chat history is isolated per cat and per account/device scope.

## Current Open Risks

1. Home hero cat switch still feels delayed despite recent logic tweaks.
2. Worktree is very dirty; avoid destructive git actions.
3. There are backup files and generated/media assets in repo root and `src/screens/*backup.js`; do not assume they are safe to delete without confirmation.
4. README is still generic React Native boilerplate, not project-specific.

## Suggested Next Debug Path For Current Swipe Lag Issue

If continuing the home cat swipe problem, inspect in this order:

1. `src/screens/HomeScreen.js`
   - `currentIndex`
   - `previewIndexRef`
   - `heroFrame`
   - `heroMode`
   - `onRailScroll`
   - `onMomentumEnd`
2. `src/components/PngCatAvatar.js`
   - whether state-driven image switch is immediate enough
   - whether image decode / mount timing is the real lag source
3. consider preloading next/prev hero images or using dual-layer crossfade rather than single image source swap

## Minimal Continue Prompt

```text
继续 FocusMeow。

当前只处理：
[单一问题]

重点文件：
- /Users/xixi/Desktop/FocusMeow/[file1]
- /Users/xixi/Desktop/FocusMeow/[file2]

沿用结论：
- 项目主状态在 src/hooks/useGameState.js
- 不要全盘扫描
- 不要回退现有未提交改动

要求：
- 只查相关文件
- 少解释，直接修改
- 最后简短汇报
```
