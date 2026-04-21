# FocusMeow 新窗口交接

适用时间：2026-04-20  
项目路径：`/Users/xixi/Desktop/FocusMeow`

## 新窗口开始时先做什么

先按这个顺序建立上下文，不要全盘扫描：

1. `/Users/xixi/Desktop/FocusMeow/docs/project-directory-index.md`
2. `/Users/xixi/Desktop/FocusMeow/docs/focusmeow-project-handoff-compact.md`
3. `/Users/xixi/Desktop/FocusMeow/docs/context-engineering-checklist.md`
4. `/Users/xixi/Desktop/FocusMeow/docs/focusmeow-handoff-2026-04-20-soulmate.md`
5. 再只看当前任务直接相关文件

建议直接对新窗口说：

“继续 FocusMeow，先读 `/Users/xixi/Desktop/FocusMeow/docs/focusmeow-next-window-handoff.md` 和 soulmate 交接文档，不要全盘扫描项目，只看当前任务直接相关文件。”

## 当前这轮已经落地的功能

### 1. 灵魂猫咪机制第一版

- 已在 `useGameState.js` 增加：
  - `soulmateCatId`
  - `soulmateSetDate`
  - `setSoulmateCatId`
- 灵魂猫咪会持久化保存
- 一天只能设定一次灵魂猫咪
- 当天已更改过后，再切别的猫会被拦截

相关文件：

- `/Users/xixi/Desktop/FocusMeow/src/hooks/useGameState.js`

### 2. 猫咪仓库可设为灵魂猫咪

- 仓库页新增“设为灵魂猫咪”
- 设定前会弹确认弹窗
- 弹窗内有 5 秒倒计时，倒计时结束后才能确认
- 使用了新的奖章 PNG 作为视觉标识

相关文件：

- `/Users/xixi/Desktop/FocusMeow/src/screens/CollectionScreen.js`
- `/Users/xixi/Desktop/FocusMeow/src/assets/reward.png`

### 3. 首页只让灵魂猫咪显示聊天气泡

- 首页 hero 区域只有灵魂猫咪显示聊天气泡
- 普通猫咪不会再在首页显示该气泡
- 首页灵魂猫咪有专属奖章标识

相关文件：

- `/Users/xixi/Desktop/FocusMeow/src/screens/HomeScreen.js`

### 4. 聊天记录改为“灵魂长期保存 / 普通猫次日清空”

- 灵魂猫咪：完整保存聊天
- 非灵魂猫咪：只保留当天聊天，第二天自动判旧并清掉
- 历史抽屉文案也已改成和该规则一致

相关文件：

- `/Users/xixi/Desktop/FocusMeow/src/screens/ChatScreen.js`

### 5. 猫咪互动反馈继续增强

- 双击 / 长按猫咪会播放 `hearts_feedback.json`
- 橘猫双击时，会切到专属 `orange_happy2.png`

相关文件：

- `/Users/xixi/Desktop/FocusMeow/src/screens/HomeScreen.js`
- `/Users/xixi/Desktop/FocusMeow/src/data/catImages.js`
- `/Users/xixi/Desktop/FocusMeow/src/assets/hearts_feedback.json`
- `/Users/xixi/Desktop/FocusMeow/src/assets/cats/orange/orange_happy2.png`

### 6. 排行榜右滑返回做过一轮手势优化

- 为了避免 `Modal + ScrollView` 抢手势，首页排行榜做了两层兜底：
  - 左侧边缘滑动热区
  - 整页 `onTouchMove` 轻滑关闭
- 逻辑已经改过，但这部分最需要真机继续验证手感

相关文件：

- `/Users/xixi/Desktop/FocusMeow/src/screens/HomeScreen.js`

## 当前最值得优先验证的点

优先级从高到低：

1. 排行榜右滑返回是否已经足够灵敏顺滑
2. 只有灵魂猫咪在首页显示聊天气泡是否符合预期
3. 普通猫咪聊天隔天自动清空是否符合预期
4. 灵魂猫咪设定弹窗的 5 秒倒计时体验是否自然

## 本轮新增资源

- `/Users/xixi/Desktop/FocusMeow/src/assets/reward.png`
- `/Users/xixi/Desktop/FocusMeow/src/assets/cats/orange/orange_happy2.png`

## 已做验证

已通过：

- `npx react-native bundle --platform ios --dev false --entry-file index.js --bundle-output /tmp/focusmeow-soulmate-reward-check.jsbundle --assets-dest /tmp/focusmeow-soulmate-reward-assets`
- `npx eslint src/hooks/useGameState.js src/screens/HomeScreen.js src/screens/CollectionScreen.js src/data/catImages.js`

说明：

- 当前没有 lint error
- 仍有少量历史 warning，例如 `react-native/no-inline-styles`、`no-shadow`
- 这些 warning 目前不阻塞运行

## 现在如果继续做，最推荐的下一步

### 方案 A：继续把灵魂猫咪做成 AI Native 入口

建议下一步继续做这 3 块：

1. 首页主动建议  
   灵魂猫咪基于最近专注数据，主动给一句建议，并预填更常用的任务/时长。

2. 记录页周报人格化  
   把智能周报改成“灵魂猫咪观察报告”，不只是数据总结。

3. 灵魂猫咪专属长期记忆强化  
   在聊天页进一步区分“灵魂长期记忆”和“普通日清会话”。

### 方案 B：先补交互稳定性

如果想先收口体验，再继续 AI：

1. 真机细调排行榜右滑返回阈值
2. 全链路走一遍“设灵魂猫咪 -> 首页显示 -> 聊天保存 -> 次日普通猫清空”
3. 看是否还存在首页 / Modal / 手势的边缘卡顿

## 这次停下时的关键提醒

- 不要全盘扫描项目
- 不要回退已有脏 worktree
- 只看当前任务直接相关文件
- 手动改文件继续用 `apply_patch`
- 如果新任务还是围绕灵魂猫咪 / 排行榜 / 首页猫咪交互，优先看：
  - `/Users/xixi/Desktop/FocusMeow/src/screens/HomeScreen.js`
  - `/Users/xixi/Desktop/FocusMeow/src/screens/CollectionScreen.js`
  - `/Users/xixi/Desktop/FocusMeow/src/screens/ChatScreen.js`
  - `/Users/xixi/Desktop/FocusMeow/src/hooks/useGameState.js`
