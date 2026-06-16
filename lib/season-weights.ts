export interface SeasonWeights {
  spring: number;
  summer: number;
  autumn: number;
  winter: number;
}

/** 每月对应的四季权重，交界月份做线性插值 */
const MONTH_WEIGHTS: SeasonWeights[] = [
  { spring: 0.05, summer: 0,    autumn: 0,    winter: 0.95 }, // 1月
  { spring: 0.2,  summer: 0,    autumn: 0,    winter: 0.8  }, // 2月
  { spring: 0.7,  summer: 0.3,  autumn: 0,    winter: 0    }, // 3月
  { spring: 0.35, summer: 0.65, autumn: 0,    winter: 0    }, // 4月
  { spring: 0.1,  summer: 0.9,  autumn: 0,    winter: 0    }, // 5月
  { spring: 0,    summer: 1.0,  autumn: 0,    winter: 0    }, // 6月
  { spring: 0,    summer: 0.75, autumn: 0.25, winter: 0    }, // 7月
  { spring: 0,    summer: 0.25, autumn: 0.75, winter: 0    }, // 8月
  { spring: 0,    summer: 0,    autumn: 0.85, winter: 0.15 }, // 9月
  { spring: 0,    summer: 0,    autumn: 0.5,  winter: 0.5  }, // 10月
  { spring: 0,    summer: 0,    autumn: 0.15, winter: 0.85 }, // 11月
  { spring: 0.05, summer: 0,    autumn: 0,    winter: 0.95 }, // 12月
];

/** 根据季节设置和自定义月份计算四季权重 */
export function getSeasonWeights(
  season: string,
  customMonth: number,
): SeasonWeights {
  switch (season) {
    case 'spring':
      return { spring: 1, summer: 0, autumn: 0, winter: 0 };
    case 'summer':
      return { spring: 0, summer: 1, autumn: 0, winter: 0 };
    case 'autumn':
      return { spring: 0, summer: 0, autumn: 1, winter: 0 };
    case 'winter':
      return { spring: 0, summer: 0, autumn: 0, winter: 1 };
    case 'custom-season':
      return MONTH_WEIGHTS[Math.max(0, Math.min(11, customMonth - 1))];
    case 'system-season':
      return MONTH_WEIGHTS[new Date().getMonth()];
    default:
      return { spring: 1, summer: 0, autumn: 0, winter: 0 };
  }
}
