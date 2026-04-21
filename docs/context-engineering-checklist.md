# FocusMeow Context Engineering Checklist

## Core Principles

1. Work on one clearly defined problem at a time.
2. Provide the minimum necessary context first, then add more only if needed.
3. Prefer concise conclusions over long process histories.
4. Lock the task boundary so unrelated modules are not re-scanned.
5. Compress long threads regularly to avoid repeated history overhead.

## Recommended Prompt Structure

Use this structure for most implementation tasks:

```text
继续 FocusMeow。

项目路径：
/Users/xixi/Desktop/FocusMeow

当前只处理这一个问题：
[一句话写清当前唯一目标]

问题现象：
[用户侧看到的现象]

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

## Context Layers

Split task information into these layers:

1. Must know
   Current bug, expected behavior, directly related files.
2. Optional support
   Previous attempts, suspicions, screenshots, or logs.
3. Out of scope
   Explicitly list modules that should not be re-checked.

The goal is not to provide all history, but to provide just enough relevant history.

## Best Information Order

When adding context, use this priority order:

1. Current issue
2. Expected behavior
3. Directly related file paths
4. Confirmed conclusions
5. Error messages
6. Screenshots or recordings
7. Long historical discussion

The lower the item, the less often it should be included by default.

## When to Start a New Thread

Start a new thread when two or more of these are true:

1. The current thread already spans many unrelated modules.
2. The assistant keeps re-explaining old background.
3. The current problem is narrow but each round still feels heavy.
4. The thread contains a lot of already-solved issues.
5. You keep having to say "do not check that module again."

## How to Handoff Efficiently

Do not paste the full conversation. Use a compressed handoff:

```text
项目：FocusMeow

当前任务：
[只写这轮要处理的一个问题]

相关文件：
- ...
- ...

当前结论：
- ...
- ...

不要重复检查：
- ...

目标：
- ...
```

Focus on current state, not full history.

## High-Token Requests to Avoid

These patterns usually waste tokens:

1. 继续上次所有任务
2. 你先全盘检查一下
3. 把这个项目再完整审查一遍
4. 顺便把相关问题也一起看看
5. 先分析所有可能原因再决定怎么改

Prefer narrower requests instead.

## Better Low-Token Alternatives

Use phrases like:

1. 只处理首页滑动切猫延迟，不看别的模块
2. 只检查 HomeScreen.js 和 PngCatAvatar.js
3. 直接改，不要先做全盘分析
4. 不要顺带优化其他 UI
5. 先实现最小修复，再简短说明

## Fixed Collaboration Commands

These work well for FocusMeow:

1. 不要全盘扫描，只查相关文件
2. 少解释，直接改，最后简短汇报
3. 不要重复复述背景
4. 只处理这个问题，不扩展
5. 如果缺信息，再向我索取最小必要上下文

## When More Context Is Worth It

Add more background only when:

1. The bug spans multiple modules.
2. The issue may involve both native and JS layers.
3. Several attempts have already failed.
4. The issue depends heavily on recent changes.
5. The task is architecture evaluation rather than direct implementation.

Even then, provide compact conclusions instead of raw history.

## Suggested FocusMeow Workflow

1. Define one core problem per round.
2. Attach only directly related files.
3. Explicitly list out-of-scope modules.
4. Ask for direct implementation first.
5. After completion, request a short handoff summary.
6. When the thread grows too long, continue from a new thread using the summary.

## Summary

The main optimization target is not the token cost of the task itself, but the extra token cost caused by carrying too much irrelevant or repeated context.

The most effective method is:

- progressive disclosure
- relevance first
- clear boundaries
- periodic compression
