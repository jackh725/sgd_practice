# PTE SGD Master (Summarize Group Discussion)

PTE Academic 新题型 **Summarize Group Discussion (SGD)** 全真备考与实战练习系统。

## ✨ 核心特性

- **34 道全真机经题库**：精选完整 34 道讨论音频，纯正全真原声。
- **全真模考模式**：对标考试标准流程，双题连续随机闭卷连考、10 秒倒计时准备、考场标准 950Hz Beep 鸣音。
- **双引擎打分机制**：
  - 内容分：基于 34 题考点库硬核比对 Speaker 1 / Speaker 2 / Speaker 3 双论点覆盖度；
  - 流利度：智能卡顿检测（长停顿惩罚与断点诊断）与 WPM 真实语速模型；
  - 逐词发音置信度分布与复盘诊断建议。
- **考场速记白板 (Scratchpad)**：横向拟分 S1/S2/S3 考场速记与高分范例一键对比。
- **5步阶梯答题模版**：固定转述框架与白板笔记实时联动。
- **讨论原文与双语精听**：段落逐句高亮与高分满分范文参考。
- **零成本纯前端运行**：本地 IndexedDB 离线回听与历史练习记录管理，永久免登录。

## 🛠️ 技术栈

- **React 19** + **TypeScript**
- **Vite** + **TailwindCSS**
- **Lucide Icons**
- **Web Audio API** (考场标准 950Hz 提示音) + **Web Speech Recognition**

## 🚀 本地开发与构建

```bash
# 安装依赖
npm install

# 启动本地开发服务
npm run dev

# 生产环境打包构建
npm run build
```
