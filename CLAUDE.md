# 专注喵 (FocusMeow) - 项目文档

## 项目概述
React Native 专注计时 + 猫咪养成 App，支持 iOS/Android。用户通过专注获得猫咪，与猫咪聊天互动。

## 技术栈
- React Native 0.84 (TypeScript 入口 App.tsx，其余为 .js)
- 后端: Node.js Express + MariaDB，部署在腾讯云 42.194.218.157:3000
- 腾讯云邮件推送 SES (验证码功能，开发中)

## 后端 API (http://42.194.218.157:3000)
- POST /register - 注册 {username, password, nickname}
- POST /login - 登录 {username, password} -> {code, message, user:{email,nickname}}
- POST /forgot-password - 发验证码 {email} (开发中)
- POST /reset-password - 重置密码 {email, code, newPassword} (开发中)

## 后端数据库 (MariaDB focus_meow)
- users 表: id, username, password, nickname, created_at
- verify_codes 表: id, email, code, created_at, used

## 后端服务器
- 腾讯云 CVM: 42.194.218.157
- 代码: /root/server.js
- 启动: export TENCENT_SECRET_ID/KEY 后 node /root/server.js
- 腾讯云SES: 域名 focusmeow.com, 发信地址 noreply@focusmeow.com

## 认证系统
- 邮箱(username字段) + 密码注册登录
- AsyncStorage 持久化 (@focusmeow_auth_token, @focusmeow_auth_user)
- 记住密码: @focusmeow_remember
- 后端不返回token，前端生成 local_session_xxx

## 游客模式
- guestMode state 通过 GameContext 传递
- 限制: 专注2次/天, 聊天5条/天 (内存计数)
- 进入时 clearGuestData 清除游戏/聊天数据
- ChatScreen 游客模式不加载/保存历史
- SettingsScreen 显示黄色横幅

## 重要注意事项
- App.tsx import 顺序: react > react-native > AuthProvider/AsyncStorage (否则 StyleSheet 报错)
- 头像: 圆角矩形 borderRadius: size*0.22 + 暖橙色背景 #F5D6C3
- 中英文: const zh = lang === 'zh'
- 游戏数据key: focusmeow-v7
- 聊天数据key: focusmeow-chat-history[-cat-xxx]

## 待完成
1. 邮件验证码找回密码 - 腾讯云SES模板待审核，server.js需改用模板发送
2. 游客模式优化和完善
3. 用户数据云同步
