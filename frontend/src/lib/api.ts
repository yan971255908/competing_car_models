const API_BASE = '/api/v1';

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    throw new Error(`API request failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// 先提供基础 auth，避免前端 store 报错。
// 当前项目主要是公开大屏，先不走登录体系。
export const auth = {
  async login(email: string, password: string) {
    return {
      access_token: 'local-dev-token',
      token_type: 'bearer',
    };
  },

  async register(email: string, password: string) {
    return {
      id: 'local-user',
      email,
    };
  },

  async me() {
    return {
      id: 'local-user',
      email: 'local@autoprism.dev',
      name: 'Local User',
    };
  },
};

// 数据源接口：先返回空数据，保证页面可启动。
export const sources = {
  async list() {
    return [];
  },

  async subscriptions() {
    return [];
  },

  async subscribe(sourceId: string) {
    return {
      id: sourceId,
      data_source_id: sourceId,
    };
  },

  async unsubscribe(sourceId: string) {
    return {
      status: 'ok',
      data_source_id: sourceId,
    };
  },
};

// 面板配置：先在前端内置，保证 Dashboard 能渲染。
export const panels = {
  async list() {
    return this.public();
  },

  async public() {
    return [
      // 宏观决策
      { id: 'p1', title: '全球汽车政策雷达', role: '宏观决策', size: '1x1', presentation_type: 'ticker', data_source_id: '36Kr_Insight' },
      { id: 'p2', title: '车型调价预警', role: '宏观决策', size: '1x1', presentation_type: 'ticker', data_source_id: 'AutoHome_CN' },
      { id: 'p3', title: '地缘政治与出海合规', role: '宏观决策', size: '1x1', presentation_type: 'ticker', data_source_id: 'Reuters_Macro' },
      { id: 'p13', title: '全球销量市占率大盘', role: '宏观决策', size: '1x1', presentation_type: 'chart', data_source_id: '36Kr_AUTO' },
      { id: 'p14', title: '重大断链风险预警', role: '宏观决策', size: '1x1', presentation_type: 'ticker', data_source_id: 'Bloomberg_Terminal' },
      { id: 'p21', title: '碳配额与排放法规监测', role: '宏观决策', size: '1x1', presentation_type: 'chart', data_source_id: 'Reuters_Macro' },
      { id: 'p22', title: '全球能源补能网络版图', role: '宏观决策', size: '1x1', presentation_type: 'chart', data_source_id: 'TechCrunch_Global' },
      { id: 'p23', title: '主要市场消费信心指数', role: '宏观决策', size: '1x1', presentation_type: 'chart', data_source_id: 'EastMoney_Macro' },
      { id: 'p24', title: '自动驾驶法律框架准入', role: '宏观决策', size: '1x1', presentation_type: 'ticker', data_source_id: 'Reuters_Macro' },

      // 战略与产品
      { id: 'p4', title: '重点车型 OTA 演变追踪', role: '战略与产品', size: '1x1', presentation_type: 'timeline', data_source_id: 'AutoHome_CN' },
      { id: 'p5', title: '技术路径演进图谱', role: '战略与产品', size: '1x1', presentation_type: 'timeline', data_source_id: 'TechCrunch_Global' },
      { id: 'p6', title: '全球智驾对标', role: '战略与产品', size: '1x1', presentation_type: 'radar', data_source_id: '36Kr_AUTO' },
      { id: 'p15', title: '重点车型参数对标矩阵', role: '战略与产品', size: '1x1', presentation_type: 'matrix', data_source_id: 'AutoHome_CN' },
      { id: 'p16', title: '新车型上市倒计时', role: '战略与产品', size: '1x1', presentation_type: 'ticker', data_source_id: '36Kr_AUTO' },
      { id: 'p25', title: '智能座舱交互体验评价', role: '战略与产品', size: '1x1', presentation_type: 'chart', data_source_id: 'AutoHome_CN' },
      { id: 'p26', title: '动力电池能量密度排行', role: '战略与产品', size: '1x1', presentation_type: 'chart', data_source_id: 'TechCrunch_Global' },
      { id: 'p27', title: '整车轻量化材料比例', role: '战略与产品', size: '1x1', presentation_type: 'chart', data_source_id: '36Kr_AUTO' },
      { id: 'p28', title: '竞品专利布局强度监控', role: '战略与产品', size: '1x1', presentation_type: 'chart', data_source_id: '36Kr_AUTO' },

      // 供应链与采购
      { id: 'p7', title: '大宗原材料价格脉搏', role: '供应链与采购', size: '1x1', presentation_type: 'chart', data_source_id: 'Bloomberg_Terminal' },
      { id: 'p8', title: '核心 Tier-1 经营性风险', role: '供应链与采购', size: '1x1', presentation_type: 'ticker', data_source_id: 'Bloomberg_Terminal' },
      { id: 'p9', title: '全球港口物流异常', role: '供应链与采购', size: '1x1', presentation_type: 'heatmap', data_source_id: 'Reuters_Macro' },
      { id: 'p17', title: '半导体供应短缺指数', role: '供应链与采购', size: '1x1', presentation_type: 'chart', data_source_id: 'TechCrunch_Global' },
      { id: 'p18', title: '物流通道成本趋势', role: '供应链与采购', size: '1x1', presentation_type: 'chart', data_source_id: 'Reuters_Macro' },
      { id: 'p29', title: '动力电池回收链条监测', role: '供应链与采购', size: '1x1', presentation_type: 'ticker', data_source_id: '36Kr_AUTO' },
      { id: 'p30', title: '稀有金属库销比动态', role: '供应链与采购', size: '1x1', presentation_type: 'chart', data_source_id: 'Bloomberg_Terminal' },
      { id: 'p31', title: '全球滚装船运力排期', role: '供应链与采购', size: '1x1', presentation_type: 'ticker', data_source_id: 'Reuters_Macro' },
      { id: 'p32', title: '车规级芯片产能利用率', role: '供应链与采购', size: '1x1', presentation_type: 'chart', data_source_id: 'TechCrunch_Global' },
    ];
  },

  async create(data: any) {
    return data;
  },

  async update(id: string, data: any) {
    return {
      id,
      ...data,
    };
  },

  async delete(id: string) {
    return {
      status: 'ok',
      id,
    };
  },
};

// Feed 数据：先返回空数组，后续可接真实 RSS / 爬虫结果。
export const feed = {
  async public() {
    return [];
  },

  async refresh(sourceId: string) {
    return request(`/admin/trigger/fetch`, {
      method: 'POST',
    });
  },

  async source(sourceId: string) {
    return {
      data_source_id: sourceId,
      fetched_at: new Date().toISOString(),
      items: [],
    };
  },
};

export const tags = {
  async withCounts(limit = 50) {
    return [];
  },

  async categories() {
    return [];
  },
};

export const ai = {
  async denoise(role: string) {
    return request('/ai/denoise', {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  },

  async insights(role = '全量情报') {
    return request(`/ai/insights?role=${encodeURIComponent(role)}`);
  },
};