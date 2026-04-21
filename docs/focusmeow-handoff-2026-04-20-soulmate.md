# FocusMeow Handoff 2026-04-20

## 本轮目标

本轮主要围绕两个方向推进：

1. 首页 / 排行榜 / 猫咪互动的 UI 与交互优化
2. 灵魂猫咪机制的第一版落地

这个文档给新窗口继续接手用，只保留当前有效上下文，不重复旧背景。

## 当前已完成

### 1. 排行榜右滑收回

- 已多次优化排行榜收回手势。
- 当前实现不是单纯依赖 `PanResponder` 包裹整页，而是：
  - 保留排行榜左侧边缘滑动热区
  - 再加整页 `onTouchMove` 兜底监听
  - 用户只要向右轻滑一小段，就会直接关闭排行榜
- 目的：避免 `Modal + ScrollView` 抢手势导致滑很多次都不收回。

相关文件：
- `/Users/xixi/Desktop/FocusMeow/src/screens/HomeScreen.js`

### 2. 猫咪 hearts 动画

- 双击 / 长按猫咪时会播放 `hearts_feedback.json`
- 动画位置已经上移，避免压在猫咪下半部分

相关文件：
- `/Users/xixi/Desktop/FocusMeow/src/screens/HomeScreen.js`
- `/Users/xixi/Desktop/FocusMeow/src/assets/hearts_feedback.json`

### 3. 橘猫双击专属 happy2 图

- 橘猫双击时，不再走默认 `happy`
- 会切到新的 `orange_happy2.png`

相关文件：
- `/Users/xixi/Desktop/FocusMeow/src/data/catImages.js`
- `/Users/xixi/Desktop/FocusMeow/src/assets/cats/orange/orange_happy2.png`

### 4. 灵魂猫咪机制第一版

已经接入的能力：

- 游戏状态新增 `soulmateCatId`
- 游戏状态新增 `soulmateSetDate`
- 灵魂猫咪选择结果会持久化保存
- 一天只能设定一次灵魂猫咪
- 当天已经设定过后，再切换别的猫会被拦截

相关文件：
- `/Users/xixi/Desktop/FocusMeow/src/hooks/useGameState.js`

### 5. 猫咪仓库里的灵魂猫咪设定入口

- 仓库中每只在家的猫都可显示 `设为灵魂猫咪`
- 已选中的猫会显示灵魂状态
- 点击设定后不会直接生效，而是：
  - 先弹出确认弹窗
  - 显示奖章图标 `reward.png`
  - 告知“一天只能更改一次”
  - 提供 5 秒倒计时
  - 倒计时结束后才能确认

相关文件：
- `/Users/xixi/Desktop/FocusMeow/src/screens/CollectionScreen.js`
- `/Users/xixi/Desktop/FocusMeow/src/assets/reward.png`

### 6. 首页灵魂猫咪标识

- 首页当前猫咪如果是灵魂猫咪，会在猫咪图左上角显示奖章 + 灵魂标识
- 首页聊天气泡现在只有灵魂猫咪才显示
- 普通猫咪首页不再显示聊天气泡

相关文件：
- `/Users/xixi/Desktop/FocusMeow/src/screens/HomeScreen.js`

### 7. 聊天记录规则已改成“灵魂长期 / 普通日清”

- 只有灵魂猫咪完整保存聊天
- 普通猫咪聊天只按当天保存
- 第二天读取普通猫聊天时会自动判旧并清掉
- 右侧历史抽屉现在也只强调灵魂猫咪的长期聊天
- 普通猫聊天不会继续写入长期 companion memory

相关文件：
- `/Users/xixi/Desktop/FocusMeow/src/screens/ChatScreen.js`

## 当前资源新增

新增资源：

- `/Users/xixi/Desktop/FocusMeow/src/assets/reward.png`
- `/Users/xixi/Desktop/FocusMeow/src/assets/cats/orange/orange_happy2.png`

已有本轮相关资源：

- `/Users/xixi/Desktop/FocusMeow/src/assets/hearts_feedback.json`

## 当前关键状态字段

在 `useGameState.js` 里，和灵魂猫咪相关的核心字段是：

- `soulmateCatId`
- `soulmateSetDate`

用途：

- `soulmateCatId`：当前绑定的灵魂猫咪
- `soulmateSetDate`：最近一次设定灵魂猫咪的本地日期，用于一天一次限制

## 本轮验证情况

已经做过的验证：

- `npx react-native bundle --platform ios --dev false --entry-file index.js ...` 通过
- `npx eslint` 通过，无 error

当前仅剩 warnings：

- 一些已有的 `react-native/no-inline-styles`
- 一些已有的 `no-shadow`

这些目前不阻塞运行。

## 下一窗口最适合继续做的事

建议下一窗口优先按这个顺序继续：

1. 真机验证排行榜右滑收回是否终于足够灵敏
2. 真机验证“首页只有灵魂猫咪显示聊天气泡”是否符合预期
3. 真机验证“普通猫聊天隔天清空”是否符合预期
4. 把灵魂猫咪能力继续扩展到首页主动建议

## 下一步推荐开发方向

如果继续做“方案 C：灵魂猫咪 = 长期 AI 代理”，建议下一步做下面几项：

### A. 首页主动建议

目标：

- 灵魂猫咪读取最近专注记录
- 在首页输出一句主动建议
- 自动预填一个常用专注任务和时长

建议改动文件：

- `/Users/xixi/Desktop/FocusMeow/src/hooks/useGameState.js`
- `/Users/xixi/Desktop/FocusMeow/src/screens/HomeScreen.js`

### B. 聊天页顶部身份强化

可以继续强化：

- 灵魂猫咪：`长期记忆已开启`
- 普通猫咪：`今日聊天，明天重置`

这部分已经接了一版，可以继续做得更明显更精致。

### C. 记录栏 / 周报接入灵魂猫咪口吻

把记录页里的智能周报变成：

- 不再只是数据总结
- 而是“灵魂猫咪对你这一周的观察”

建议改动文件：

- `/Users/xixi/Desktop/FocusMeow/src/screens/AIScreen.js`
- `/Users/xixi/Desktop/FocusMeow/src/hooks/useGameState.js`

### D. 未来 AI / Dify / 后端方向

当前还没有正式把灵魂猫咪逻辑接到 Dify 长期记忆或后端存储。

推荐分阶段：

1. 本地 MVP
   - 继续用本地状态和本地规则驱动灵魂猫咪体验
2. 再接 Dify
   - 聊天
   - 主动建议
   - 周报总结
3. 最后再做服务端长期画像
   - 用户习惯
   - 情绪轨迹
   - 灵魂猫咪摘要记忆

## 如果新窗口要直接给 Codex 的一句话

可以直接在新窗口贴这句：

“继续 FocusMeow，先读 `/Users/xixi/Desktop/FocusMeow/docs/focusmeow-handoff-2026-04-20-soulmate.md`，不要全盘扫描项目，只看当前任务直接相关文件。”

