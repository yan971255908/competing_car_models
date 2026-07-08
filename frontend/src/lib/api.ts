// @ts-nocheck
// AutoPrism - Centralized API Client
// 合并版：保留原项目 Mock 面板 + 补充真实后端请求能力

export const API_BASE_URL = '/api/v1';

// ============================================
// 基础请求封装
// ============================================

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const data = await res.json();
      message = data?.detail || data?.message || message;
    } catch {
      // ignore json parse error
    }
    throw new Error(`API request failed: ${message}`);
  }

  if (res.status === 204) {
    return null as T;
  }

  return res.json();
}

// ============================================
// Ultra Deep Mock Data
// 原项目面板配置：用于前端首屏展示
// ============================================

const MOCK_PANELS = [
  // 1. 宏观决策视角
  { id: 'p1', title: '全球汽车政策雷达', type: 'list', presentation_type: 'ticker', is_visible: true, role: '宏观决策', size: '1x1', data_source_id: '36Kr_AUTO' },
  { id: 'p2', title: '车型调价预警', type: 'list', presentation_type: 'ticker', is_visible: true, role: '宏观决策', size: '1x1', data_source_id: 'Jiemian_News' },
  { id: 'p3', title: '地缘政治与出海合规', type: 'list', presentation_type: 'ticker', is_visible: true, role: '宏观决策', size: '1x1', data_source_id: 'Reuters_Finance' },
  { id: 'p13', title: '全球销量市占率大盘', type: 'list', presentation_type: 'pie', is_visible: true, role: '宏观决策', size: '1x1', data_source_id: '36Kr_Insight' },
  { id: 'p14', title: '重大断链风险预警', type: 'list', presentation_type: 'ticker', is_visible: true, role: '宏观决策', size: '1x1', data_source_id: 'AutoNews_US' },
  { id: 'p21', title: '碳配额与排放法规监测', type: 'list', presentation_type: 'ticker', is_visible: true, role: '宏观决策', size: '1x1', data_source_id: 'Handelsblatt_DE' },
  { id: 'p22', title: '全球能源补能网络版图', type: 'list', presentation_type: 'heatmap', is_visible: true, role: '宏观决策', size: '1x1', data_source_id: 'Bloomberg_Terminal' },
  { id: 'p23', title: '中国市场消费信心指数', type: 'list', presentation_type: 'time-series', is_visible: true, role: '宏观决策', size: '1x1', data_source_id: 'EastMoney_Macro' },
  { id: 'p24', title: '自动驾驶法律框架准入', type: 'list', presentation_type: 'ticker', is_visible: true, role: '宏观决策', size: '1x1', data_source_id: 'TechCrunch_Main' },

  // 2. 战略与产品视角
  { id: 'p4', title: '重点车型OTA 演变追踪', type: 'list', presentation_type: 'ticker', is_visible: true, role: '战略与产品', size: '1x1', data_source_id: 'Teslarati_Pulse' },
  { id: 'p5', title: '技术路径演进图谱', type: 'list', presentation_type: 'time-series', is_visible: true, role: '战略与产品', size: '1x1', data_source_id: 'TheVerge_Tech' },
  { id: 'p6', title: '全球智驾对标', type: 'list', presentation_type: 'radar', is_visible: true, role: '战略与产品', size: '1x1', data_source_id: 'Wired_Transport' },
  { id: 'p15', title: '重点车型参数对标矩阵', type: 'list', presentation_type: 'radar', is_visible: true, role: '战略与产品', size: '1x1', data_source_id: '36Kr_AUTO' },
  { id: 'p16', title: '新车型上市倒计时', type: 'list', presentation_type: 'ticker', is_visible: true, role: '战略与产品', size: '1x1', data_source_id: 'AutoHome_CN' },
  { id: 'p25', title: '智能座舱交互体验评价', type: 'list', presentation_type: 'radar', is_visible: true, role: '战略与产品', size: '1x1', data_source_id: 'InsideEVs_Insight' },
  { id: 'p26', title: '动力电池能量密度排行', type: 'list', presentation_type: 'time-series', is_visible: true, role: '战略与产品', size: '1x1', data_source_id: 'Electrek_EV' },
  { id: 'p27', title: '整车轻量化材料比例', type: 'list', presentation_type: 'radar', is_visible: true, role: '战略与产品', size: '1x1', data_source_id: 'Handelsblatt_DE' },
  { id: 'p28', title: '竞品专利布局强度监控', type: 'list', presentation_type: 'time-series', is_visible: true, role: '战略与产品', size: '1x1', data_source_id: 'Nikkei_Asia' },

  // 3. 供应链与采购视角
  { id: 'p7', title: '大宗原材料价格脉搏', type: 'list', presentation_type: 'time-series', is_visible: true, role: '供应链与采购', size: '1x1', data_source_id: 'SMM_METAL_INDEX' },
  { id: 'p8', title: '核心 Tier-1 经营性风险', type: 'list', presentation_type: 'ticker', is_visible: true, role: '供应链与采购', size: '1x1', data_source_id: 'Yonhap_KR' },
  { id: 'p9', title: '全球港口物流异常', type: 'list', presentation_type: 'heatmap', is_visible: true, role: '供应链与采购', size: '1x1', data_source_id: 'MARINE_TRAFFIC_OSINT' },
  { id: 'p17', title: '半导体供应短缺指数', type: 'list', presentation_type: 'time-series', is_visible: true, role: '供应链与采购', size: '1x1', data_source_id: 'Jiemian_News' },
  { id: 'p18', title: '物流通道成本趋势', type: 'list', presentation_type: 'time-series', is_visible: true, role: '供应链与采购', size: '1x1', data_source_id: 'Reuters_Finance' },
  { id: 'p29', title: '动力电池回收链条监测', type: 'list', presentation_type: 'heatmap', is_visible: true, role: '供应链与采购', size: '1x1', data_source_id: '36Kr_AUTO' },
  { id: 'p30', title: '稀有金属库销比动态', type: 'list', presentation_type: 'time-series', is_visible: true, role: '供应链与采购', size: '1x1', data_source_id: 'SMM_METAL_INDEX' },
  { id: 'p31', title: '全球滚装船运力排期', type: 'list', presentation_type: 'time-series', is_visible: true, role: '供应链与采购', size: '1x1', data_source_id: 'MARINE_TRAFFIC_OSINT' },
  { id: 'p32', title: '车规级芯片产能利用率', type: 'list', presentation_type: 'heatmap', is_visible: true, role: '供应链与采购', size: '1x1', data_source_id: 'Yonhap_KR' },
];

// ============================================
// Panels
// 当前仍使用 Mock 面板，保证前端可稳定展示
// ============================================

export const panels = {
  list: async (...args: any[]) => MOCK_PANELS,

  public: async (...args: any[]) => MOCK_PANELS,

  create: async (data: any, ...args: any[]) => ({
    ...data,
    id: data?.id || Math.random().toString(36).slice(2),
  }),

  update: async (id: string, data: any, ...args: any[]) => ({
    id,
    ...data,
  }),

  delete: async (id: string, ...args: any[]) => ({
    status: 'ok',
    id,
  }),
};

// ============================================
// Feed
// 当前 feed 数据仍以空数组兜底；refresh 可触发后端抓取
// ============================================

export const feed = {
  list: async (...args: any[]) => [],

  public: async (...args: any[]) => [],

  source: async (sourceId: string, ...args: any[]) => ({
    items: [],
    data_source_id: sourceId || 's1',
    fetched_at: new Date().toISOString(),
  }),

  refresh: async (sourceId?: string, ...args: any[]) => {
    if (sourceId) {
      return request(`/admin/trigger/panel/${encodeURIComponent(sourceId)}`, {
        method: 'POST',
      }).catch(() => ({}));
    }

    return request('/admin/trigger/fetch', {
      method: 'POST',
    }).catch(() => ({}));
  },
};

// ============================================
// AI
// 保留原项目 Mock 方法，同时补充真实后端 Denoise / Insights
// ============================================

export const ai = {
  interpret: async (...args: any[]) => ({}),

  summarize: async (...args: any[]) => ({}),

  extractEntities: async (...args: any[]) => ({}),

  interpretOta: async (...args: any[]) => ({
    vehicle_model: 'Tesla Model 3/Y',
    update_type: '智驾与视觉泊车',
    description: '本次更新引入了全新的端到端视觉泊车方案，显著提升了在弱光和非标准车位的识别能力。',
  }),

  denoise: async (role: string = '全量情报') => {
    return request('/ai/denoise', {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  },

  insights: async (role: string = '全量情报') => {
    return request(`/ai/insights?role=${encodeURIComponent(role)}`);
  },
};

// ============================================
// Auth
// 当前项目暂不强依赖登录，返回本地用户兜底
// ============================================

export const auth = {
  login: async (email?: string, password?: string, ...args: any[]) => ({
    access_token: 'local-dev-token',
    token_type: 'bearer',
    email,
  }),

  register: async (email?: string, password?: string, ...args: any[]) => ({
    id: 'local-user',
    email,
  }),

  me: async (...args: any[]) => ({
    id: 'local-user',
    email: 'local@autoprism.dev',
    name: 'Local User',
  }),
};

// ============================================
// Sources
// ============================================

export const sources = {
  list: async (...args: any[]) => [],

  subscriptions: async (...args: any[]) => [],

  subscribe: async (sourceId?: string, ...args: any[]) => ({
    id: sourceId || 'local-subscription',
    data_source_id: sourceId,
  }),

  unsubscribe: async (sourceId?: string, ...args: any[]) => ({
    status: 'ok',
    data_source_id: sourceId,
  }),
};

// ============================================
// Layouts
// 保留原项目接口，避免前端其他位置引用时报错
// ============================================

export const layouts = {
  list: async (...args: any[]) => [],

  save: async (...args: any[]) => ({
    status: 'ok',
  }),

  apply: async (...args: any[]) => ({
    status: 'ok',
  }),

  delete: async (...args: any[]) => ({
    status: 'ok',
  }),
};

// ============================================
// Tags
// ============================================

export const tags = {
  list: async (...args: any[]) => [],

  withCounts: async (...args: any[]) => [],

  categories: async (...args: any[]) => [],

  create: async (...args: any[]) => ({}),

  update: async (...args: any[]) => ({}),

  delete: async (...args: any[]) => ({}),
};


// ============================================
// Competitors
// 竞品库接口：新增模块，不影响原有 AutoPrism 面板接口
// ============================================

export const competitors = {
  vehicles: async (...args: any[]) => request('/competitors/vehicles'),

  vehicleDetail: async (id: string, ...args: any[]) => request(`/competitors/vehicles/${encodeURIComponent(id)}`),

  technologies: async (...args: any[]) => request('/competitors/technologies'),

  evidence: async (...args: any[]) => request('/competitors/evidence'),

  seed: async (...args: any[]) => request('/competitors/seed', {
    method: 'POST',
  }),
};
// ============================================
// System
// 原项目 Mock + 当前后端调度接口适配
// ============================================

export const system = {
  getSchedulerConfig: async (...args: any[]) => {
    return request('/admin/scheduler/config').catch(() => ({
      crawler: {
        mode: 'manual',
        value: '08:00',
      },
      ai: {
        mode: 'manual',
        value: '30',
        batch_size: 50,
      },
    }));
  },

  updateSchedulerConfig: async (payload: any, ...args: any[]) => {
    return request('/admin/scheduler/config', {
      method: 'POST',
      body: JSON.stringify(payload),
    }).catch(() => ({}));
  },

  forceFetch: async (...args: any[]) => {
    return request('/admin/trigger/fetch', {
      method: 'POST',
    }).catch(() => ({}));
  },

  forceProcess: async (...args: any[]) => {
    return request('/admin/trigger/ai', {
      method: 'POST',
    }).catch(() => ({}));
  },

  resetDatabase: async (target: 'l1' | 'info' | 'l2' = 'l1', ...args: any[]) => {
    const endpointMap = {
      l1: '/admin/trigger/reset/l1',
      info: '/admin/trigger/reset/info',
      l2: '/admin/trigger/reset/l2',
    };

    return request(endpointMap[target] || endpointMap.l1, {
      method: 'POST',
    }).catch(() => ({}));
  },
};
