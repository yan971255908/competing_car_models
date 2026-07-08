import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  Database,
  FileText,
  Filter,
  Layers,
  Loader2,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  X,
  Wrench,
} from 'lucide-react';
import { Button, GlassCard } from '@/components/ui';
import { competitors } from '@/lib/api';

const formatPrice = (value?: number | null) => {
  if (value === null || value === undefined) return 'NA';
  return `${value.toFixed(2)} 万`;
};

const sourceTypeLabel: Record<string, string> = {
  excel: 'Excel 配置表',
  press_release: '发布会稿件',
  official_site: '官网新闻',
  webpage: '网页文本',
  transcript: '视频转写',
  manual: '手工录入',
};

const categoryLabel: Record<string, string> = {
  power: '动力',
  chassis: '底盘',
  adas: '智驾',
  cockpit: '座舱',
  battery: '电池',
  ee_architecture: '电子电气',
  body: '车身',
  other: '其他',
};

const maturityLabel: Record<string, string> = {
  concept: '概念',
  announced: '已发布',
  mass_production: '量产',
};

const getVehicleName = (vehicle?: any) => vehicle ? `${vehicle.brand_name} ${vehicle.model_name}` : '未关联车型';
const getTechnologyName = (technology?: any) => technology?.name || '未关联技术';

function EmptyState({ onSeed, isSeeding }: { onSeed: () => void; isSeeding: boolean }) {
  return (
    <GlassCard className="p-10 border-dashed border-white/10 flex flex-col items-center justify-center text-center min-h-[220px]">
      <Database size={32} className="text-white/20 mb-3" />
      <div className="text-sm font-bold text-white/70">竞品库暂无示例数据</div>
      <div className="text-[11px] text-white/35 mt-2 max-w-[420px] leading-relaxed">
        点击初始化示例数据后，将通过后端 POST /api/v1/competitors/seed 创建车型、技术点和证据链样例。
      </div>
      <Button onClick={onSeed} disabled={isSeeding} size="sm" className="mt-5">
        {isSeeding ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
        初始化示例数据
      </Button>
    </GlassCard>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <GlassCard className="px-4 py-3 border-white/10 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-cyan-200">
        {icon}
      </div>
      <div>
        <div className="text-[10px] text-white/35 font-bold tracking-widest uppercase">{label}</div>
        <div className="text-xl font-black text-white/90 font-mono">{value}</div>
      </div>
    </GlassCard>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[88px_1fr] gap-3 py-2 border-b border-white/5 last:border-b-0">
      <div className="text-[10px] text-white/30 font-bold">{label}</div>
      <div className="text-[11px] text-white/75 leading-relaxed break-words">{value || 'NA'}</div>
    </div>
  );
}

function VehicleDetailDrawer({ vehicle, onClose }: { vehicle: any | null; onClose: () => void }) {
  if (!vehicle) return null;
  return (
    <div className="fixed inset-y-0 right-0 z-[90] w-full max-w-[430px] bg-[#101026]/95 border-l border-white/10 shadow-2xl backdrop-blur-xl flex flex-col">
      <div className="px-5 py-4 border-b border-white/10 flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center text-cyan-200">
          <Layers size={18} />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] text-white/30 font-black tracking-widest uppercase">车型详情</div>
          <div className="text-lg font-black text-white truncate">{getVehicleName(vehicle)}</div>
        </div>
        <button onClick={onClose} className="ml-auto p-2 rounded-lg hover:bg-white/10 text-white/45 hover:text-white">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
        <GlassCard className="p-4 border-white/10">
          <DetailRow label="品牌" value={vehicle.brand_name} />
          <DetailRow label="车型" value={vehicle.model_name} />
          <DetailRow label="能源类型" value={vehicle.energy_type} />
          <DetailRow label="市场级别" value={vehicle.market_segment} />
          <DetailRow label="上市年份" value={vehicle.launch_year} />
          <DetailRow label="指导价" value={formatPrice(vehicle.base_price)} />
          <DetailRow label="规格参数" value={<pre className="whitespace-pre-wrap font-mono text-[10px] text-cyan-100/70">{JSON.stringify(vehicle.specs || {}, null, 2)}</pre>} />
        </GlassCard>

        <GlassCard className="p-4 border-white/10">
          <div className="text-[11px] font-black text-white/70 tracking-widest mb-3">关联技术点</div>
          {(vehicle.technologies || []).length === 0 ? (
            <div className="text-[11px] text-white/30">暂无关联技术点</div>
          ) : vehicle.technologies.map((tech: any) => (
            <div key={tech.id} className="mb-3 last:mb-0">
              <div className="text-sm font-bold text-white/85">{tech.name}</div>
              <div className="mt-1 flex gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-200 text-[10px]">{categoryLabel[tech.category] || tech.category}</span>
                <span className="px-1.5 py-0.5 rounded bg-white/5 text-white/45 text-[10px]">{maturityLabel[tech.maturity_level] || tech.maturity_level}</span>
              </div>
            </div>
          ))}
        </GlassCard>

        <GlassCard className="p-4 border-white/10">
          <div className="text-[11px] font-black text-white/70 tracking-widest mb-3">关联证据</div>
          {(vehicle.evidence || []).length === 0 ? (
            <div className="text-[11px] text-white/30">暂无关联证据</div>
          ) : vehicle.evidence.map((item: any) => (
            <div key={item.id} className="py-3 border-b border-white/5 last:border-b-0">
              <div className="text-[11px] text-white/75 leading-relaxed">{item.evidence_text}</div>
              <div className="mt-2 text-[9px] text-white/30 font-mono">{item.page_or_time || 'NA'} · 置信度 {(Number(item.confidence || 0) * 100).toFixed(0)}%</div>
            </div>
          ))}
        </GlassCard>
      </div>
    </div>
  );
}

export const CompetitorLibrary: React.FC = () => {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [technologies, setTechnologies] = useState<any[]>([]);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [selectedTechnologyId, setSelectedTechnologyId] = useState<string>('');
  const [selectedSourceType, setSelectedSourceType] = useState<string>('');
  const [detailVehicle, setDetailVehicle] = useState<any | null>(null);
  const [compareLeftId, setCompareLeftId] = useState<string>('');
  const [compareRightId, setCompareRightId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [vehicleRows, techRows, evidenceRows] = await Promise.all([
        competitors.vehicles(),
        competitors.technologies(),
        competitors.evidence(),
      ]);
      setVehicles(vehicleRows || []);
      setTechnologies(techRows || []);
      setEvidence(evidenceRows || []);
    } catch (err: any) {
      setError(err?.message || '竞品库数据加载失败');
    } finally {
      setIsLoading(false);
    }
  };

  const seedData = async () => {
    setIsSeeding(true);
    setError(null);
    try {
      await competitors.seed();
      await loadData();
    } catch (err: any) {
      setError(err?.message || '示例数据写入失败');
    } finally {
      setIsSeeding(false);
    }
  };

  const openVehicleDetail = async (vehicle: any) => {
    setSelectedVehicleId(vehicle.id);
    setSelectedTechnologyId('');
    setIsDetailLoading(true);
    try {
      const detail = await competitors.vehicleDetail(vehicle.id);
      setDetailVehicle(detail);
    } catch (err: any) {
      setError(err?.message || '车型详情加载失败');
    } finally {
      setIsDetailLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const sourceTypes = useMemo(() => {
    const values = new Set<string>();
    evidence.forEach((item) => {
      if (item.source_document?.source_type) values.add(item.source_document.source_type);
    });
    return Array.from(values);
  }, [evidence]);

  const filteredEvidence = useMemo(() => evidence.filter((item) => {
    if (selectedVehicleId && item.vehicle_id !== selectedVehicleId) return false;
    if (selectedTechnologyId && item.technology_id !== selectedTechnologyId) return false;
    if (selectedSourceType && item.source_document?.source_type !== selectedSourceType) return false;
    return true;
  }), [evidence, selectedVehicleId, selectedSourceType, selectedTechnologyId]);

  const selectedTechnologyVehicles = useMemo(() => {
    if (!selectedTechnologyId) return [];
    const map = new Map<string, any>();
    evidence.forEach((item) => {
      if (item.technology_id === selectedTechnologyId && item.vehicle) map.set(item.vehicle.id, item.vehicle);
    });
    return Array.from(map.values());
  }, [evidence, selectedTechnologyId]);

  const evidenceByVehicle = useMemo(() => {
    const map = new Map<string, any[]>();
    evidence.forEach((item) => {
      if (!item.vehicle_id) return;
      map.set(item.vehicle_id, [...(map.get(item.vehicle_id) || []), item]);
    });
    return map;
  }, [evidence]);

  const technologiesByVehicle = useMemo(() => {
    const map = new Map<string, Set<string>>();
    evidence.forEach((item) => {
      if (!item.vehicle_id || !item.technology_id) return;
      if (!map.has(item.vehicle_id)) map.set(item.vehicle_id, new Set());
      map.get(item.vehicle_id)?.add(item.technology_id);
    });
    return map;
  }, [evidence]);

  const leftVehicle = vehicles.find((item) => item.id === compareLeftId) || null;
  const rightVehicle = vehicles.find((item) => item.id === compareRightId) || null;
  const hasData = vehicles.length > 0 || technologies.length > 0 || evidence.length > 0;

  const clearFilters = () => {
    setSelectedVehicleId('');
    setSelectedTechnologyId('');
    setSelectedSourceType('');
  };

  const comparisonRows = [
    ['品牌', leftVehicle?.brand_name, rightVehicle?.brand_name],
    ['车型', leftVehicle?.model_name, rightVehicle?.model_name],
    ['能源类型', leftVehicle?.energy_type, rightVehicle?.energy_type],
    ['市场级别', leftVehicle?.market_segment, rightVehicle?.market_segment],
    ['指导价', leftVehicle ? formatPrice(leftVehicle.base_price) : '', rightVehicle ? formatPrice(rightVehicle.base_price) : ''],
    ['specs', leftVehicle ? JSON.stringify(leftVehicle.specs || {}) : '', rightVehicle ? JSON.stringify(rightVehicle.specs || {}) : ''],
    ['关联技术点数量', leftVehicle ? technologiesByVehicle.get(leftVehicle.id)?.size || 0 : '', rightVehicle ? technologiesByVehicle.get(rightVehicle.id)?.size || 0 : ''],
    ['证据数量', leftVehicle ? evidenceByVehicle.get(leftVehicle.id)?.length || 0 : '', rightVehicle ? evidenceByVehicle.get(rightVehicle.id)?.length || 0 : ''],
  ];

  return (
    <div className="w-full relative">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-3">
          <div className="w-1 h-4 bg-cyan-400 rounded-full" />
          <h3 className="text-xs font-black text-white/50 tracking-[0.2em]">竞品库工作台</h3>
          <span className="text-[10px] text-white/25">车型 / 技术点 / 证据 / 对比</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={loadData} disabled={isLoading}>
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            刷新
          </Button>
          <Button size="sm" onClick={seedData} disabled={isSeeding}>
            {isSeeding ? <Loader2 size={13} className="animate-spin" /> : <Database size={13} />}
            初始化示例数据
          </Button>
        </div>
      </div>

      {error && <GlassCard className="mb-4 px-4 py-3 border border-rose-500/30 text-rose-300 text-xs">{error}</GlassCard>}

      {isLoading ? (
        <div className="h-56 flex items-center justify-center"><Loader2 size={28} className="text-violet-500 animate-spin" /></div>
      ) : !hasData ? (
        <EmptyState onSeed={seedData} isSeeding={isSeeding} />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard label="车型数量" value={vehicles.length} icon={<Layers size={17} />} />
            <StatCard label="技术点数量" value={technologies.length} icon={<Wrench size={17} />} />
            <StatCard label="证据数量" value={evidence.length} icon={<FileText size={17} />} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr_1.2fr] gap-6 auto-rows-[390px]">
            <GlassCard className="h-full flex flex-col overflow-hidden border-white/10">
              <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                <Layers size={15} className="text-cyan-300" />
                <div className="text-[11px] font-black tracking-widest text-white/80">车型库</div>
                <div className="ml-auto text-[10px] text-white/30">{vehicles.length} 款车型</div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-white/5">
                {vehicles.map((vehicle) => (
                  <button key={vehicle.id} onClick={() => openVehicleDetail(vehicle)} className={`w-full text-left px-4 py-3 hover:bg-white/[0.04] transition-colors ${selectedVehicleId === vehicle.id ? 'bg-cyan-500/[0.08]' : ''}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-white/90">{getVehicleName(vehicle)}</div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-200 text-[10px]">{vehicle.energy_type || 'NA'}</span>
                          <span className="px-1.5 py-0.5 rounded bg-white/5 text-white/45 text-[10px]">{vehicle.market_segment || '未分级'}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[10px] text-white/30">指导价</div>
                        <div className="text-xs font-mono text-emerald-300">{formatPrice(vehicle.base_price)}</div>
                      </div>
                    </div>
                    <div className="mt-2 text-[10px] text-white/35 font-mono truncate">{vehicle.specs ? JSON.stringify(vehicle.specs) : '无配置摘要'}</div>
                  </button>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="h-full flex flex-col overflow-hidden border-white/10">
              <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                <Wrench size={15} className="text-violet-300" />
                <div className="text-[11px] font-black tracking-widest text-white/80">技术点库</div>
                <div className="ml-auto text-[10px] text-white/30">{technologies.length} 个技术点</div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-white/5">
                {technologies.map((tech) => (
                  <button key={tech.id} onClick={() => { setSelectedTechnologyId(tech.id); setSelectedVehicleId(''); }} className={`w-full text-left px-4 py-3 hover:bg-white/[0.04] transition-colors ${selectedTechnologyId === tech.id ? 'bg-violet-500/[0.08]' : ''}`}>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-bold text-white/90 truncate">{tech.name}</div>
                      <span className="ml-auto px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-200 text-[10px] shrink-0">{maturityLabel[tech.maturity_level] || tech.maturity_level}</span>
                    </div>
                    <div className="mt-1 text-[10px] text-cyan-200/70">{categoryLabel[tech.category] || tech.category}</div>
                    <div className="mt-2 text-[11px] text-white/45 leading-relaxed line-clamp-2">{tech.description || '暂无说明'}</div>
                  </button>
                ))}
              </div>
              <div className="px-4 py-3 border-t border-white/10 bg-black/10">
                <div className="text-[10px] text-white/35 font-bold mb-2">技术点反查车型</div>
                {selectedTechnologyId ? selectedTechnologyVehicles.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTechnologyVehicles.map((vehicle) => <span key={vehicle.id} className="px-2 py-1 rounded bg-white/5 text-cyan-100 text-[10px]">{getVehicleName(vehicle)}</span>)}
                  </div>
                ) : <div className="text-[10px] text-white/25">暂无关联车型</div> : <div className="text-[10px] text-white/25">点击技术点后显示关联车型</div>}
              </div>
            </GlassCard>

            <GlassCard className="h-full flex flex-col overflow-hidden border-white/10">
              <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                <FileText size={15} className="text-amber-300" />
                <div className="text-[11px] font-black tracking-widest text-white/80">证据链</div>
                <div className="ml-auto text-[10px] text-white/30">{filteredEvidence.length} / {evidence.length} 条</div>
              </div>
              <div className="px-4 py-3 border-b border-white/10 bg-black/10">
                <div className="flex items-center gap-2 mb-2 text-[10px] text-white/35 font-bold"><Filter size={12} />筛选条件</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <select value={selectedVehicleId} onChange={(e) => setSelectedVehicleId(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-[11px] text-white">
                    <option value="">全部车型</option>
                    {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{getVehicleName(vehicle)}</option>)}
                  </select>
                  <select value={selectedTechnologyId} onChange={(e) => setSelectedTechnologyId(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-[11px] text-white">
                    <option value="">全部技术点</option>
                    {technologies.map((tech) => <option key={tech.id} value={tech.id}>{tech.name}</option>)}
                  </select>
                  <select value={selectedSourceType} onChange={(e) => setSelectedSourceType(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-[11px] text-white">
                    <option value="">全部来源</option>
                    {sourceTypes.map((type) => <option key={type} value={type}>{sourceTypeLabel[type] || type}</option>)}
                  </select>
                </div>
                {(selectedVehicleId || selectedTechnologyId || selectedSourceType) && (
                  <button onClick={clearFilters} className="mt-2 text-[10px] text-cyan-200 hover:text-cyan-100 flex items-center gap-1"><SlidersHorizontal size={11} />清空筛选</button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-white/5">
                {filteredEvidence.length === 0 ? <div className="p-8 text-center text-white/20 text-[11px]">当前筛选无证据</div> : filteredEvidence.map((item) => (
                  <div key={item.id} className="px-4 py-3 hover:bg-white/[0.03] transition-colors">
                    <div className="text-[11px] text-white/75 leading-relaxed">{item.evidence_text}</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-white/5 text-white/45 text-[10px]">{sourceTypeLabel[item.source_document?.source_type] || item.source_document?.source_type || '未知来源'}</span>
                      <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-200 text-[10px]">{getVehicleName(item.vehicle)}</span>
                      <span className="px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-200 text-[10px]">{getTechnologyName(item.technology)}</span>
                    </div>
                    <div className="mt-2 flex justify-between text-[9px] text-white/25 font-mono"><span>{item.page_or_time || 'NA'}</span><span>置信度 {(Number(item.confidence || 0) * 100).toFixed(0)}%</span></div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          <GlassCard className="border-white/10 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
              <ArrowRightLeft size={15} className="text-emerald-300" />
              <div className="text-[11px] font-black tracking-widest text-white/80">车型对比</div>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 border-b border-white/10">
              <select value={compareLeftId} onChange={(e) => setCompareLeftId(e.target.value)} className="bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white">
                <option value="">选择车型 A</option>
                {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{getVehicleName(vehicle)}</option>)}
              </select>
              <select value={compareRightId} onChange={(e) => setCompareRightId(e.target.value)} className="bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white">
                <option value="">选择车型 B</option>
                {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{getVehicleName(vehicle)}</option>)}
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-white/5 text-white/45">
                  <tr><th className="px-4 py-2 w-[160px]">字段</th><th className="px-4 py-2">车型 A</th><th className="px-4 py-2">车型 B</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {comparisonRows.map(([label, left, right]) => (
                    <tr key={String(label)} className="align-top">
                      <td className="px-4 py-2 text-white/40 font-bold">{label}</td>
                      <td className="px-4 py-2 text-white/75 font-mono break-all">{left || '请选择'}</td>
                      <td className="px-4 py-2 text-white/75 font-mono break-all">{right || '请选择'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {isDetailLoading && <div className="fixed right-6 top-24 z-[95] text-xs text-cyan-200 bg-black/60 px-3 py-2 rounded border border-white/10">车型详情加载中...</div>}
      <VehicleDetailDrawer vehicle={detailVehicle} onClose={() => setDetailVehicle(null)} />
    </div>
  );
};
