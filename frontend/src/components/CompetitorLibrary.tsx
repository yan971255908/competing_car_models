import React, { useEffect, useState } from 'react';
import { Database, FileText, Layers, Loader2, RefreshCw, ShieldCheck, Wrench } from 'lucide-react';
import { Button, GlassCard } from '@/components/ui';
import { competitors } from '@/lib/api';

const formatPrice = (value?: number | null) => {
  if (value === null || value === undefined) return 'NA';
  return `${value.toFixed(2)} 万`;
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

function EmptyState({ onSeed, isSeeding }: { onSeed: () => void; isSeeding: boolean }) {
  return (
    <GlassCard className="p-10 border-dashed border-white/10 flex flex-col items-center justify-center text-center min-h-[220px]">
      <Database size={32} className="text-white/20 mb-3" />
      <div className="text-sm font-bold text-white/70">竞品库暂无示例数据</div>
      <div className="text-[11px] text-white/35 mt-2 max-w-[420px] leading-relaxed">
        点击写入示例数据后，将通过后端 POST /api/v1/competitors/seed 创建车型、技术点和证据链样例。
      </div>
      <Button onClick={onSeed} disabled={isSeeding} size="sm" className="mt-5">
        {isSeeding ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
        写入示例数据
      </Button>
    </GlassCard>
  );
}

export const CompetitorLibrary: React.FC = () => {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [technologies, setTechnologies] = useState<any[]>([]);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
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

  useEffect(() => {
    loadData();
  }, []);

  const hasData = vehicles.length > 0 || technologies.length > 0 || evidence.length > 0;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-3">
          <div className="w-1 h-4 bg-cyan-400 rounded-full" />
          <h3 className="text-xs font-black text-white/50 uppercase tracking-[0.2em]">竞品库基础视角</h3>
          <span className="text-[10px] text-white/25">Vehicles / Technologies / Evidence</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={loadData} disabled={isLoading}>
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            刷新
          </Button>
          <Button size="sm" onClick={seedData} disabled={isSeeding}>
            {isSeeding ? <Loader2 size={13} className="animate-spin" /> : <Database size={13} />}
            Seed
          </Button>
        </div>
      </div>

      {error && (
        <GlassCard className="mb-4 px-4 py-3 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </GlassCard>
      )}

      {isLoading ? (
        <div className="h-56 flex items-center justify-center">
          <Loader2 size={28} className="text-violet-500 animate-spin" />
        </div>
      ) : !hasData ? (
        <EmptyState onSeed={seedData} isSeeding={isSeeding} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-[360px]">
          <GlassCard className="h-full flex flex-col overflow-hidden border-white/10">
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
              <Layers size={15} className="text-cyan-300" />
              <div className="text-[11px] font-black tracking-widest text-white/80 uppercase">车型库</div>
              <div className="ml-auto text-[10px] text-white/30">{vehicles.length} models</div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-white/5">
              {vehicles.map((vehicle) => (
                <div key={vehicle.id} className="px-4 py-3 hover:bg-white/[0.03] transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-white/90">{vehicle.brand_name} {vehicle.model_name}</div>
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
                  <div className="mt-2 text-[10px] text-white/35 font-mono truncate">
                    {vehicle.specs ? JSON.stringify(vehicle.specs) : '无配置摘要'}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="h-full flex flex-col overflow-hidden border-white/10">
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
              <Wrench size={15} className="text-violet-300" />
              <div className="text-[11px] font-black tracking-widest text-white/80 uppercase">技术点库</div>
              <div className="ml-auto text-[10px] text-white/30">{technologies.length} points</div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-white/5">
              {technologies.map((tech) => (
                <div key={tech.id} className="px-4 py-3 hover:bg-white/[0.03] transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-bold text-white/90 truncate">{tech.name}</div>
                    <span className="ml-auto px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-200 text-[10px] shrink-0">
                      {maturityLabel[tech.maturity_level] || tech.maturity_level}
                    </span>
                  </div>
                  <div className="mt-1 text-[10px] text-cyan-200/70">{categoryLabel[tech.category] || tech.category}</div>
                  <div className="mt-2 text-[11px] text-white/45 leading-relaxed line-clamp-3">{tech.description || '暂无说明'}</div>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="h-full flex flex-col overflow-hidden border-white/10">
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
              <FileText size={15} className="text-amber-300" />
              <div className="text-[11px] font-black tracking-widest text-white/80 uppercase">证据链</div>
              <div className="ml-auto text-[10px] text-white/30">{evidence.length} items</div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-white/5">
              {evidence.map((item) => (
                <div key={item.id} className="px-4 py-3 hover:bg-white/[0.03] transition-colors">
                  <div className="text-[11px] text-white/75 leading-relaxed">{item.evidence_text}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-white/5 text-white/45 text-[10px]">
                      {item.source_document?.source_type || 'unknown'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-200 text-[10px]">
                      {item.vehicle ? `${item.vehicle.brand_name} ${item.vehicle.model_name}` : '未关联车型'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-200 text-[10px]">
                      {item.technology?.name || '未关联技术'}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between text-[9px] text-white/25 font-mono">
                    <span>{item.page_or_time || 'NA'}</span>
                    <span>confidence {(Number(item.confidence || 0) * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
