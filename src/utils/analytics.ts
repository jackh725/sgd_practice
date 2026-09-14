import { track } from '@vercel/analytics';

/**
 * 安全自定义埋点上报函数
 */
export function logEvent(name: string, params?: Record<string, any>) {
  try {
    track(name);
    // 同时同步上报到 Google Analytics (GA4，无参数/事件限制)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof window !== 'undefined' && (window as any).gtag) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).gtag('event', name, params);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((import.meta as any).env?.DEV) {
      console.log(`[Analytics] 📊 Event: ${name}`, params || '');
    }
  } catch {
    // 静默降级，确保埋点错误绝不影响业务逻辑
  }
}

/**
 * 考生页面活跃时长阶梯追踪器
 * - 阶梯节点：
 *   - time_30s: 停留满 30 秒（初步产生阅读意愿，剔除秒关）
 *   - time_1m:  停留满 1 分钟（通常已听完一部分音频或阅读考点）
 *   - time_3m:  停留满 3 分钟（通常已完成 1 道题全流程或深入速记）
 *   - time_5m:  停留满 5 分钟（深度沉浸备考练习）
 *   - time_10m: 停留满 10 分钟（核心粘性高频考生）
 * - 智能防水分：当页面隐藏（用户切后台/挂机）时自动暂停计时，只统计真实活跃备考时间。
 * - 节约额度：单会话去重触发，每个用户最多贡献 5 个时间事件，完全适配每月 50,000 次免费额度。
 */
export function initTimeEngagementTracker(): () => void {
  if (typeof window === 'undefined') return () => {};

  let activeSeconds = 0;
  const milestonesTriggered = new Set<string>();

  const milestones: { seconds: number; event: string }[] = [
    { seconds: 30, event: 'time_30s' },
    { seconds: 60, event: 'time_1m' },
    { seconds: 180, event: 'time_3m' },
    { seconds: 300, event: 'time_5m' },
    { seconds: 600, event: 'time_10m' },
  ];

  const intervalId = setInterval(() => {
    // 只在页面前台处于可见状态时累计秒数
    if (document.visibilityState === 'visible') {
      activeSeconds += 1;

      for (const m of milestones) {
        if (activeSeconds >= m.seconds && !milestonesTriggered.has(m.event)) {
          milestonesTriggered.add(m.event);
          logEvent(m.event);
        }
      }
    }
  }, 1000);

  return () => {
    clearInterval(intervalId);
  };
}
