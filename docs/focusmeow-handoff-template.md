# FocusMeow Project Handoff Template v1

Use this template when starting a new Codex thread for FocusMeow.

## Full Version

```text
继续 FocusMeow。

项目路径：
/Users/xixi/Desktop/FocusMeow

当前只处理这一个问题：
[一句话写清当前唯一目标]

问题现象：
[用户侧看到的现象]
[如果有延迟 / 卡顿 / 报错 / UI异常，就直接写体感现象]

预期结果：
[你希望最终变成什么样]

相关文件：
- [绝对路径文件1]
- [绝对路径文件2]
- [绝对路径文件3]

已知情况：
- [已经确认的结论1]
- [上一轮已经改过什么]
- [已经排除什么原因]
- [当前怀疑点是什么，可选]

不要重复检查：
- [不需要再看的模块1]
- [不需要再看的模块2]
- [已经完成的功能3]

限制要求：
- 不要全盘扫描项目
- 只检查和当前问题直接相关的文件
- 不要重复复述历史背景
- 少解释，优先直接修改
- 完成后简短汇报改动和验证结果

如果还缺关键信息：
先只向我要最小必要补充，不要扩展排查范围。
```

## Bug-Fix Version

```text
继续 FocusMeow。

只修这个 bug：
[bug描述]

现象：
[现象]

预期：
[预期]

重点看：
- [文件1]
- [文件2]

已知：
- [已尝试过什么]
- [不要再查什么]

要求：
- 不要全盘扫描
- 直接排查并修改
- 最后简短告诉我原因和结果
```

## UI Optimization Version

```text
继续 FocusMeow。

只优化这个界面问题：
[UI问题]

当前表现：
[现在不好看的地方]

目标效果：
[希望达到的样子]

相关文件：
- [文件1]
- [文件2]

要求：
- 不要顺带改别的模块
- 保持现有风格
- 直接修改
- 最后简短汇报
```

## iOS Native Issue Version

```text
继续 FocusMeow。

只处理这个 iOS 原生问题：
[问题]

现象：
[现象]

预期：
[预期]

重点文件：
- [iOS文件1]
- [iOS文件2]
- [JS联动文件，可选]

不要检查：
- [无关模块]

要求：
- 只查相关原生链路
- 不要全盘扫描
- 修改后说明是否已验证
```

## Minimal Continuation Version

```text
继续 FocusMeow 上一轮任务，但只延续这个点：
[当前唯一问题]

沿用结论：
- [结论1]
- [结论2]

只看：
- [文件1]
- [文件2]

不要再重新总结整个项目，也不要扩展到其他功能。
直接继续改。
```

## Example: Home Cat Swipe Delay

```text
继续 FocusMeow。

项目路径：
/Users/xixi/Desktop/FocusMeow

当前只处理这一个问题：
首页左右滑动切换猫咪时，大猫咪 happy 图切换仍然有延迟。

问题现象：
用户左右滑动切换猫咪时，大猫咪不会立刻变成 happy 图，体感仍然慢半拍，不流畅。

预期结果：
滑动跨到下一只猫时，大猫咪立刻切换为对应猫咪的 happy 图，没有明显等待感。

相关文件：
- /Users/xixi/Desktop/FocusMeow/src/screens/HomeScreen.js
- /Users/xixi/Desktop/FocusMeow/src/components/PngCatAvatar.js

已知情况：
- 上一轮已经去掉了切换后 160ms 再切 happy 的逻辑
- 也尝试过把 currentIndex 的更新提前
- 但用户体感仍有延迟
- 怀疑是图片解码或大图渲染切换时机问题

不要重复检查：
- 锁屏
- 灵动岛
- 聊天
- 分享

限制要求：
- 不要全盘扫描项目
- 只检查和当前问题直接相关的文件
- 少解释，直接修改
- 最后简短汇报改动和验证结果
```

## Example: Lock Screen Live Activity Icon

```text
继续 FocusMeow。

当前只处理这一个问题：
锁屏 Live Activity 左侧 logo 显示异常。

问题现象：
锁屏倒计时和灵动岛已经有了，但左侧 logo 显示不对或不显示。

预期结果：
锁屏与灵动岛都稳定显示透明背景 logo，大小合适，不被裁切。

相关文件：
- /Users/xixi/Desktop/FocusMeow/ios/FocusMeow/AppDelegate.swift
- /Users/xixi/Desktop/FocusMeow/ios/FocusMeowLiveActivityExtension/[相关文件]
- /Users/xixi/Desktop/FocusMeow/src/screens/SelectScreen.js

已知情况：
- Live Activity 基础功能已实现
- 之前已经接入过 logo 资源
- 当前重点不是倒计时逻辑，而是图标显示

不要重复检查：
- 首页猫咪切换
- 聊天存储
- 分享功能

要求：
- 不要全盘扫描
- 只查图标显示链路
- 改完后简短说明原因
```

## Example: Product Discussion Only

```text
继续 FocusMeow。

这次不写代码，只评估这个产品方向：
[问题]

已知背景：
- [背景1]
- [背景2]

希望你输出：
- 用户体验角度建议
- 实现路径
- 优先级建议

要求：
- 高层次回答
- 不要全盘扫描代码
- 不要展开到无关模块
```

## Recommended End-of-Round Request

At the end of a round, request:

```text
请把这轮结果整理成可供下个窗口继续的精简交接稿
```

This helps keep future threads compact and lower-cost.
