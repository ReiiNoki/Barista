# Barista - Intelligent Coffee Tracker & Inventory Manager

## 1. 项目概述 (Project Overview)
**Barista** 是一款专为咖啡爱好者设计的高级 Web 应用程序。它不仅是一个记录咖啡摄入量的工具，更是一个结合了库存管理、感官评价和 AI 辅助冲煮的综合平台。

该项目采用了 **Mobile-First** 设计理念，同时适配桌面端（三栏布局），旨在通过结构化的数据记录（为 Kaggle 数据分析竞赛做准备）和个性化的健康管理，提升用户的咖啡体验。

## 2. 技术栈 (Tech Stack)
*   **前端框架**: React 18 (Hooks, Functional Components)
*   **语言**: TypeScript (Strict typing)
*   **样式库**: Tailwind CSS (Dark mode support, Responsive design)
*   **AI 集成**: Google GenAI SDK (Gemini 2.5 Flash)
*   **图标**: 自定义 SVG 组件系统 (Lucide-style)
*   **数据持久化**: Browser LocalStorage

## 3. 核心功能模块 (Core Features)

### A. 仪表盘 & 健康管理 (Dashboard & Health)
*   **代谢追踪**: 基于半衰期模型（默认 5小时，可配置）计算当前体内咖啡因残留。
*   **可视化图表**: SVG 绘制的未来 12 小时代谢趋势曲线。
*   **健康预警**: 当当前残留超过睡眠阈值或今日摄入超过上限时发出警告。
*   **多维度统计**: 今日总摄入量、当前残留量。

### B. 记录系统 (Logging System)
*   **双模式记录**:
    *   **自制 (Homemade)**: 关联豆仓库存，自动扣减豆重，基于冲煮方式（手冲、意式等）估算咖啡因。
    *   **外购 (Store)**: 预设主流品牌（Starbucks, Luckin, Blue Bottle 等）及自定义品牌支持。
*   **智能回滚**: 删除自制咖啡记录时，系统会自动将消耗的豆重加回库存，确保库存数据准确无误。
*   **AI 智能向导**: 在记录自制咖啡时，Gemini AI 根据豆子特性（烘焙度、处理法）生成最佳冲煮方案（水温、研磨、粉液比）。

### C. 豆仓管理 (Inventory Management)
*   **进销存**: 记录咖啡豆的品牌、名称、烘焙度、处理法及重量。
*   **状态追踪**: 标记豆子为“喝着呢 (Active)”或“已喝完 (Finished)”。
*   **分组展示**: 自动按品牌对库存进行聚合展示。

### D. 多层级评价系统 (Review System)
支持三种不同深度的评价模式，满足不同用户需求：
1.  **Casual (休闲)**: 1-5 星评分，适合快速记录。
2.  **Barista (咖啡师)**: 5 维感官滑块 (酸/甜/苦/醇/余韵) + 风味标签。
3.  **Expert (SCA 专家)**: 模拟 SCA 杯测表，10 项打分机制，自动计算总分。
*   *特色*: 全局支持“是否回购 (Rebuy)”标记。

### E. 设置与国际化 (Settings & i18n)
*   **多语言**: 完整支持 英文 (EN)、中文 (ZH)、日文 (JA)。
*   **外观**: 支持 浅色/深色/跟随系统 主题切换。
*   **数据导出**: 一键导出 JSON 数据（清洗后的结构化数据），可直接用于 Python/Pandas 分析。

## 4. 数据结构 (Data Schema)

主要的数据接口定义，用于理解数据流。

```typescript
// 1. 咖啡豆
interface Bean {
  id: string;
  brand: string;
  name: string;
  roast: 'light' | 'medium' | 'dark';
  process: 'washed' | 'natural' | 'honey' | 'anaerobic' | 'other';
  weight: number; // 剩余克重
  isActive: boolean;
  review?: BeanReview; // 关联评价
}

// 2. 消费记录
interface CoffeeLog {
  id: string;
  timestamp: number;
  type: 'homemade' | 'store';
  // 外购字段
  storeBrand?: string;
  productName?: string;
  // 自制字段
  beanId?: string;
  method?: 'pour_over' | 'espresso' | ...;
  beanWeight?: number; // 单次消耗克重
  // 通用
  caffeineMg: number;
  review?: BeanReview; // 关联评价
}

// 3. 评价对象 (多态结构)
interface BeanReview {
  mode: 'casual' | 'barista' | 'expert';
  rebuy: boolean;
  note: string;
  // Casual 数据
  rating?: number;
  // Barista 数据
  baristaScore?: { acidity: number; sweetness: number; ... };
  flavors?: string[];
  // Expert 数据
  expertScore?: { aroma: number; flavor: number; ... total: number };
}
```

## 5. UI/UX 设计规范
*   **配色体系**:
    *   主色: Deep Coffee Brown (`#5C4033`)
    *   背景: Warm Off-white (`#FDFBF7`) vs Dark Charcoal (`#1c1917`)
*   **响应式策略**:
    *   **Mobile (<1024px)**: 底部 Tab 导航，单栏布局。采用 Modal 弹窗优化表单输入体验。
    *   **Desktop (>=1024px)**: 左侧固定侧边栏 + 中间管理栏 + 右侧数据仪表盘（三栏布局）。

## 6. 后续开发路线图 (Roadmap)

### Phase 1: 数据增强
- [ ] **数据导入**: 允许用户上传 JSON 文件恢复备份。
- [ ] **搜索增强**: 支持按评分、烘焙度或风味标签过滤记录。

### Phase 2: 可视化升级
- [ ] **雷达图 (Radar Chart)**: 在“咖啡师模式”评价中，绘制五维风味雷达图。
- [ ] **统计报表**: 增加月度/年度饮用统计，品牌偏好饼图。

### Phase 3: AI 深度集成
- [ ] **AI 评测师**: 输入“这杯咖啡太酸了”，AI 基于豆子数据分析原因并给出调整建议。
- [ ] **视觉识别**: 拍照识别咖啡豆包装，自动填写入库表单。

### Phase 4: 社交与云同步 (需后端)
- [ ] **账号系统**: 数据云端同步。
- [ ] **配方分享**: 生成精美的配方分享卡片图片。

## 7. 更新日志 (Changelog)

### v1.1.0 (Current)
*   **Feature**: 完善了记录删除功能。删除“自制咖啡”记录时，会自动将该杯咖啡消耗的豆重加回库存，修复了库存数据偏差问题。
*   **UX**: 手机端“入库新豆”表单改为 Modal 弹窗显示，解决了长表单在小屏下无法滚动的问题。
*   **UX**: 优化了手机端的视图逻辑，概览页优先显示代谢图表，历史页显示记录列表。
*   **Fix**: 修复了记录列表删除按钮点击无反应的问题，并增加了删除确认对话框。

---
*Documentation generated for Barista App development.*