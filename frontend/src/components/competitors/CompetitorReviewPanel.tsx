import { useEffect, useState } from 'react';
import { CheckCircle2, FileSearch, Loader2, RefreshCw, Save, Search, XCircle } from 'lucide-react';
import { Button, GlassCard } from '@/components/ui';
import { competitors } from '@/lib/api';
import type { CandidateOrigin, CandidateStatus, CandidateSummary, ExtractionCandidate } from '@/types/competitorReview';

const statusLabel: Record<CandidateStatus, string> = { pending: '待审核', approved: '已批准', rejected: '已拒绝' };
const originLabel: Record<CandidateOrigin, string> = { manual: '人工', ai: 'AI' };
const categoryOptions = ['power', 'chassis', 'adas', 'cockpit', 'battery', 'ee_architecture', 'body', 'other'];
const maturityOptions = ['concept', 'announced', 'mass_production'];

type LookupItem = { id: string; brand_name?: string; model_name?: string; name?: string; category?: string };

interface Props {
  vehicles: LookupItem[];
  technologies: LookupItem[];
  onDataChanged: () => Promise<void>;
}

const emptySummary: CandidateSummary = { pending: 0, approved: 0, rejected: 0, total: 0 };

function candidateTitle(candidate: ExtractionCandidate) {
  const vehicle = candidate.matched_vehicle
    ? `${candidate.matched_vehicle.brand_name} ${candidate.matched_vehicle.model_name}`
    : [candidate.proposed_brand_name, candidate.proposed_model_name].filter(Boolean).join(' ') || '未填写车型';
  const technology = candidate.matched_technology?.name || candidate.proposed_technology_name || '未填写技术点';
  return { vehicle, technology };
}

function TextInput({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="flex flex-col gap-1 text-[10px] text-white/40 font-bold">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400/50" /></label>;
}

function TextArea({ label, value, onChange, rows = 4 }: { label: string; value: string; onChange: (value: string) => void; rows?: number }) {
  return <label className="flex flex-col gap-1 text-[10px] text-white/40 font-bold">{label}<textarea value={value} rows={rows} onChange={(event) => onChange(event.target.value)} className="bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400/50" /></label>;
}

export function CompetitorReviewPanel({ vehicles, technologies, onDataChanged }: Props) {
  const [summary, setSummary] = useState<CandidateSummary>(emptySummary);
  const [items, setItems] = useState<ExtractionCandidate[]>([]);
  const [detail, setDetail] = useState<ExtractionCandidate | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState<{ status: string; origin: string; keyword: string }>({ status: 'pending', origin: '', keyword: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const loadReviews = async (keepDetailId?: string) => {
    setIsLoading(true); setError('');
    try {
      const [nextSummary, list] = await Promise.all([
        competitors.reviewSummary(),
        competitors.reviewCandidates({ ...filters, page: 1, page_size: 50 }),
      ]);
      setSummary(nextSummary || emptySummary);
      setItems(list?.items || []);
      if (keepDetailId) {
        const nextDetail = await competitors.reviewCandidateDetail(keepDetailId);
        openDetail(nextDetail);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '审核数据加载失败');
    } finally {
      setIsLoading(false);
    }
  };

  const openDetail = (candidate: ExtractionCandidate) => {
    setDetail(candidate);
    setForm({
      source_document_id: candidate.source_document_id,
      origin: candidate.origin || 'manual',
      proposed_brand_name: candidate.proposed_brand_name || '',
      proposed_model_name: candidate.proposed_model_name || '',
      matched_vehicle_id: candidate.matched_vehicle_id || '',
      proposed_technology_name: candidate.proposed_technology_name || '',
      technology_category: candidate.technology_category || 'other',
      technology_description: candidate.technology_description || '',
      maturity_level: candidate.maturity_level || 'concept',
      matched_technology_id: candidate.matched_technology_id || '',
      evidence_text: candidate.evidence_text || '',
      page_or_time: candidate.page_or_time || '',
      confidence: String(candidate.confidence ?? 0.8),
      review_note: candidate.review_note || '',
    });
  };

  const loadDetail = async (id: string) => {
    try {
      openDetail(await competitors.reviewCandidateDetail(id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '候选详情加载失败');
    }
  };

  useEffect(() => { loadReviews(); }, []);

  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const buildPayload = () => ({
    source_document_id: form.source_document_id,
    origin: form.origin || 'manual',
    proposed_brand_name: form.proposed_brand_name || null,
    proposed_model_name: form.proposed_model_name || null,
    matched_vehicle_id: form.matched_vehicle_id || null,
    proposed_technology_name: form.proposed_technology_name || null,
    technology_category: form.technology_category || 'other',
    technology_description: form.technology_description || null,
    maturity_level: form.maturity_level || 'concept',
    matched_technology_id: form.matched_technology_id || null,
    evidence_text: form.evidence_text,
    page_or_time: form.page_or_time || null,
    confidence: Number(form.confidence),
    raw_payload: {},
    review_note: form.review_note || null,
  });

  const save = async () => {
    if (!detail) return;
    if (detail.status !== 'pending') return setError('已审核候选不能编辑');
    const confidence = Number(form.confidence);
    if (!form.evidence_text?.trim()) return setError('证据文本不能为空');
    if (Number.isNaN(confidence) || confidence < 0 || confidence > 1) return setError('置信度必须在 0 到 1 之间');
    setIsSaving(true); setError('');
    try {
      const updated = await competitors.updateReviewCandidate(detail.id, buildPayload());
      openDetail(updated);
      await loadReviews(updated.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '保存候选失败');
    } finally {
      setIsSaving(false);
    }
  };

  const approve = async () => {
    if (!detail) return;
    setIsSaving(true); setError('');
    try {
      const updated = await competitors.approveReviewCandidate(detail.id, {
        create_missing_vehicle: true,
        create_missing_technology: true,
        review_note: form.review_note || '',
      });
      openDetail(updated);
      await onDataChanged();
      await loadReviews(updated.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '批准入库失败');
    } finally {
      setIsSaving(false);
    }
  };

  const reject = async () => {
    if (!detail) return;
    setIsSaving(true); setError('');
    try {
      const updated = await competitors.rejectReviewCandidate(detail.id, { review_note: form.review_note || '' });
      openDetail(updated);
      await loadReviews(updated.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '拒绝候选失败');
    } finally {
      setIsSaving(false);
    }
  };

  return <div className="space-y-4">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {(['pending', 'approved', 'rejected'] as CandidateStatus[]).map((status) => <GlassCard key={status} className="px-4 py-3 border-white/10"><div className="text-[10px] text-white/35 font-bold">{statusLabel[status]}</div><div className="mt-1 text-2xl font-black font-mono text-white/90">{summary[status]}</div></GlassCard>)}
      <GlassCard className="px-4 py-3 border-white/10"><div className="text-[10px] text-white/35 font-bold">总数</div><div className="mt-1 text-2xl font-black font-mono text-white/90">{summary.total}</div></GlassCard>
    </div>

    <GlassCard className="px-4 py-3 border-white/10 flex flex-col md:flex-row gap-2 md:items-center">
      <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })} className="bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white"><option value="">全部状态</option><option value="pending">待审核</option><option value="approved">已批准</option><option value="rejected">已拒绝</option></select>
      <select value={filters.origin} onChange={(event) => setFilters({ ...filters, origin: event.target.value })} className="bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white"><option value="">全部来源</option><option value="manual">人工</option><option value="ai">AI</option></select>
      <label className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded px-3 py-2"><Search size={13} className="text-white/30" /><input value={filters.keyword} onChange={(event) => setFilters({ ...filters, keyword: event.target.value })} onKeyDown={(event) => { if (event.key === 'Enter') loadReviews(); }} placeholder="搜索车型 / 技术点 / 证据" className="bg-transparent outline-none text-xs text-white placeholder-white/25 flex-1" /></label>
      <Button size="sm" variant="ghost" onClick={() => loadReviews()} disabled={isLoading}>{isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}刷新/筛选</Button>
    </GlassCard>

    {error && <GlassCard className="px-4 py-3 border border-rose-500/30 text-rose-300 text-xs">{error}</GlassCard>}

    <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-4 min-h-[620px]">
      <GlassCard className="border-white/10 overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2"><FileSearch size={15} className="text-cyan-300" /><div className="text-[11px] font-black tracking-widest text-white/80">候选列表 · {items.length}</div></div>
        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-white/5">
          {isLoading ? <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-cyan-300" /></div> : items.length === 0 ? <div className="p-8 text-center text-[11px] text-white/30">暂无候选</div> : items.map((candidate) => {
            const title = candidateTitle(candidate);
            return <button key={candidate.id} onClick={() => loadDetail(candidate.id)} className={`w-full text-left px-4 py-3 hover:bg-white/[0.04] ${detail?.id === candidate.id ? 'bg-cyan-500/[0.08]' : ''}`}>
              <div className="flex gap-2 items-start"><div className="min-w-0 flex-1"><div className="text-xs font-bold text-white/85 truncate">{title.vehicle}</div><div className="mt-1 text-[10px] text-violet-200/80 truncate">{title.technology}</div></div><span className="px-2 py-0.5 rounded bg-white/5 text-[9px] text-white/50">{statusLabel[candidate.status]}</span></div>
              <div className="mt-2 text-[11px] text-white/55 line-clamp-2">{candidate.evidence_text}</div>
              <div className="mt-2 flex justify-between text-[9px] text-white/25"><span>{candidate.source_document?.title || '未知来源文档'}</span><span>{(Number(candidate.confidence || 0) * 100).toFixed(0)}%</span></div>
            </button>;
          })}
        </div>
      </GlassCard>

      <GlassCard className="border-white/10 overflow-hidden">
        {!detail ? <div className="h-full flex items-center justify-center text-xs text-white/30">选择候选查看详情</div> : <div className="h-full flex flex-col">
          <div className="px-4 py-3 border-b border-white/10 bg-white/[0.03] flex items-center gap-3"><div className="text-sm font-bold text-white/85">候选详情</div><span className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-white/50">{statusLabel[detail.status]}</span><span className="px-2 py-0.5 rounded bg-cyan-500/10 text-[10px] text-cyan-200">{originLabel[detail.origin]}</span></div>
          <div className="p-4 overflow-y-auto custom-scrollbar space-y-4">
            <div className="border border-white/10 rounded p-3">
              <div className="text-[10px] font-bold text-white/45 mb-2">来源正文</div>
              <div className="text-xs font-bold text-white/75 mb-2">{detail.source_document?.title}</div>
              <pre className="max-h-[180px] overflow-y-auto custom-scrollbar whitespace-pre-wrap bg-black/20 border border-white/10 rounded p-3 text-[11px] leading-relaxed text-white/65">{detail.source_document?.raw_text || '无正文'}</pre>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-[10px] text-white/40 font-bold">匹配已有车型<select disabled={detail.status !== 'pending'} value={form.matched_vehicle_id || ''} onChange={(event) => set('matched_vehicle_id', event.target.value)} className="bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white"><option value="">不匹配，按候选车型处理</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.brand_name} {vehicle.model_name}</option>)}</select></label>
              <label className="flex flex-col gap-1 text-[10px] text-white/40 font-bold">匹配已有技术点<select disabled={detail.status !== 'pending'} value={form.matched_technology_id || ''} onChange={(event) => set('matched_technology_id', event.target.value)} className="bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white"><option value="">不匹配，按候选技术点处理</option>{technologies.map((technology) => <option key={technology.id} value={technology.id}>{technology.name}</option>)}</select></label>
              <TextInput label="候选品牌" value={form.proposed_brand_name || ''} onChange={(value) => set('proposed_brand_name', value)} />
              <TextInput label="候选车型" value={form.proposed_model_name || ''} onChange={(value) => set('proposed_model_name', value)} />
              <TextInput label="候选技术点" value={form.proposed_technology_name || ''} onChange={(value) => set('proposed_technology_name', value)} />
              <label className="flex flex-col gap-1 text-[10px] text-white/40 font-bold">技术类别<select disabled={detail.status !== 'pending'} value={form.technology_category || 'other'} onChange={(event) => set('technology_category', event.target.value)} className="bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white">{categoryOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label className="flex flex-col gap-1 text-[10px] text-white/40 font-bold">成熟度<select disabled={detail.status !== 'pending'} value={form.maturity_level || 'concept'} onChange={(event) => set('maturity_level', event.target.value)} className="bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white">{maturityOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <TextInput label="置信度（0-1）" type="number" value={form.confidence || '0.8'} onChange={(value) => set('confidence', value)} />
              <TextInput label="页码或时间" value={form.page_or_time || ''} onChange={(value) => set('page_or_time', value)} />
            </div>
            <TextArea label="技术说明" value={form.technology_description || ''} onChange={(value) => set('technology_description', value)} />
            <TextArea label="证据文本 *" rows={5} value={form.evidence_text || ''} onChange={(value) => set('evidence_text', value)} />
            <TextArea label="审核备注" rows={3} value={form.review_note || ''} onChange={(value) => set('review_note', value)} />
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={save} disabled={detail.status !== 'pending' || isSaving}><Save size={14} />保存修改</Button>
              <Button size="sm" onClick={approve} disabled={detail.status !== 'pending' || isSaving}><CheckCircle2 size={14} />批准入库</Button>
              <Button variant="ghost" className="text-rose-200 hover:text-rose-100 hover:bg-rose-500/10" size="sm" onClick={reject} disabled={detail.status !== 'pending' || isSaving}><XCircle size={14} />拒绝</Button>
            </div>
          </div>
        </div>}
      </GlassCard>
    </div>
  </div>;
}
