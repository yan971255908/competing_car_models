import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, Database, Edit3, FileText, Filter, Layers, Loader2, Plus, RefreshCw, Save, Search, ShieldCheck, SlidersHorizontal, X, Wrench } from 'lucide-react';
import { BookOpen, Download, FileSpreadsheet, Upload } from 'lucide-react';
import { Button, GlassCard } from '@/components/ui';
import { competitors } from '@/lib/api';
import { CompetitorReviewPanel } from '@/components/competitors/CompetitorReviewPanel';

const sourceTypeOptions = ['excel', 'press_release', 'official_site', 'webpage', 'transcript', 'manual'];
const categoryOptions = ['power', 'chassis', 'adas', 'cockpit', 'battery', 'ee_architecture', 'body', 'other'];
const maturityOptions = ['concept', 'announced', 'mass_production'];
const sourceTypeLabel: Record<string, string> = { excel: 'Excel 配置表', press_release: '发布会稿件', official_site: '官网新闻', webpage: '网页文本', transcript: '视频转写', manual: '手工录入' };
const categoryLabel: Record<string, string> = { power: '动力', chassis: '底盘', adas: '智驾', cockpit: '座舱', battery: '电池', ee_architecture: '电子电气', body: '车身', other: '其他' };
const maturityLabel: Record<string, string> = { concept: '概念', announced: '已发布', mass_production: '量产' };
const formatPrice = (value?: number | null) => value === null || value === undefined ? 'NA' : `${Number(value).toFixed(2)} 万`;
const getVehicleName = (vehicle?: any) => vehicle ? `${vehicle.brand_name} ${vehicle.model_name}` : '未关联车型';
const getTechnologyName = (technology?: any) => technology?.name || '未关联技术';

function TextInput({ label, value, onChange, type = 'text', placeholder = '' }: any) {
  return <label className="flex flex-col gap-1 text-[10px] text-white/40 font-bold">{label}<input type={type} value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-cyan-400/50" /></label>;
}
function SelectInput({ label, value, onChange, options, labels = {} }: any) {
  return <label className="flex flex-col gap-1 text-[10px] text-white/40 font-bold">{label}<select value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400/50">{options.map((item: string) => <option key={item} value={item}>{labels[item] || item}</option>)}</select></label>;
}
function TextArea({ label, value, onChange, rows = 4, mono = false, placeholder = '' }: any) {
  return <label className="flex flex-col gap-1 text-[10px] text-white/40 font-bold">{label}<textarea value={value ?? ''} placeholder={placeholder} rows={rows} onChange={(e) => onChange(e.target.value)} className={`bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-cyan-400/50 ${mono ? 'font-mono' : ''}`} /></label>;
}
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="grid grid-cols-[88px_1fr] gap-3 py-2 border-b border-white/5 last:border-b-0"><div className="text-[10px] text-white/30 font-bold">{label}</div><div className="text-[11px] text-white/75 leading-relaxed break-words">{value || 'NA'}</div></div>;
}
function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return <GlassCard className="px-4 py-3 border-white/10 flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-cyan-200">{icon}</div><div><div className="text-[10px] text-white/35 font-bold tracking-widest">{label}</div><div className="text-xl font-black text-white/90 font-mono">{value}</div></div></GlassCard>;
}
function EmptyState({ onSeed, isSeeding }: { onSeed: () => void; isSeeding: boolean }) {
  return <GlassCard className="p-10 border-dashed border-white/10 flex flex-col items-center justify-center text-center min-h-[220px]"><Database size={32} className="text-white/20 mb-3" /><div className="text-sm font-bold text-white/70">竞品库暂无示例数据</div><div className="text-[11px] text-white/35 mt-2 max-w-[420px] leading-relaxed">点击初始化示例数据后，将通过后端创建车型、技术点和证据链样例。</div><Button onClick={onSeed} disabled={isSeeding} size="sm" className="mt-5">{isSeeding ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}初始化示例数据</Button></GlassCard>;
}

function VehicleDetailDrawer({ vehicle, onClose, onEdit }: { vehicle: any | null; onClose: () => void; onEdit: (vehicle: any) => void }) {
  if (!vehicle) return null;
  return <div className="fixed inset-y-0 right-0 z-[90] w-full max-w-[430px] bg-[#101026]/95 border-l border-white/10 shadow-2xl backdrop-blur-xl flex flex-col"><div className="px-5 py-4 border-b border-white/10 flex items-start gap-3"><div className="w-9 h-9 rounded-lg bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center text-cyan-200"><Layers size={18} /></div><div className="min-w-0"><div className="text-[10px] text-white/30 font-black tracking-widest">车型详情</div><div className="text-lg font-black text-white truncate">{getVehicleName(vehicle)}</div></div><button onClick={() => onEdit(vehicle)} className="ml-auto p-2 rounded-lg hover:bg-white/10 text-white/45 hover:text-white"><Edit3 size={16} /></button><button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-white/45 hover:text-white"><X size={18} /></button></div><div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5"><GlassCard className="p-4 border-white/10"><DetailRow label="品牌" value={vehicle.brand_name} /><DetailRow label="车型" value={vehicle.model_name} /><DetailRow label="能源类型" value={vehicle.energy_type} /><DetailRow label="市场级别" value={vehicle.market_segment} /><DetailRow label="上市年份" value={vehicle.launch_year} /><DetailRow label="指导价" value={formatPrice(vehicle.base_price)} /><DetailRow label="规格参数" value={<pre className="whitespace-pre-wrap font-mono text-[10px] text-cyan-100/70">{JSON.stringify(vehicle.specs || {}, null, 2)}</pre>} /></GlassCard><GlassCard className="p-4 border-white/10"><div className="text-[11px] font-black text-white/70 tracking-widest mb-3">关联技术点</div>{(vehicle.technologies || []).length === 0 ? <div className="text-[11px] text-white/30">暂无关联技术点</div> : vehicle.technologies.map((tech: any) => <div key={tech.id} className="mb-3 last:mb-0"><div className="text-sm font-bold text-white/85">{tech.name}</div><div className="mt-1 flex gap-1.5"><span className="px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-200 text-[10px]">{categoryLabel[tech.category] || tech.category}</span><span className="px-1.5 py-0.5 rounded bg-white/5 text-white/45 text-[10px]">{maturityLabel[tech.maturity_level] || tech.maturity_level}</span></div></div>)}</GlassCard><GlassCard className="p-4 border-white/10"><div className="text-[11px] font-black text-white/70 tracking-widest mb-3">关联证据</div>{(vehicle.evidence || []).length === 0 ? <div className="text-[11px] text-white/30">暂无关联证据</div> : vehicle.evidence.map((item: any) => <div key={item.id} className="py-3 border-b border-white/5 last:border-b-0"><div className="text-[11px] text-white/75 leading-relaxed">{item.evidence_text}</div><div className="mt-2 text-[9px] text-white/30 font-mono">{item.page_or_time || 'NA'} · 置信度 {(Number(item.confidence || 0) * 100).toFixed(0)}%</div></div>)}</GlassCard></div></div>;
}
function EvidenceDetailDrawer({ evidence, onClose, onViewSource }: { evidence: any | null; onClose: () => void; onViewSource: (sourceId: string) => void }) {
  if (!evidence) return null;
  return <div className="fixed inset-y-0 right-0 z-[91] w-full max-w-[410px] bg-[#101026]/95 border-l border-white/10 shadow-2xl backdrop-blur-xl flex flex-col"><div className="px-5 py-4 border-b border-white/10 flex items-center gap-3"><FileText size={18} className="text-amber-300" /><div><div className="text-[10px] text-white/30 font-black tracking-widest">证据详情</div><div className="text-sm font-bold text-white">{sourceTypeLabel[evidence.source_document?.source_type] || '未知来源'}</div></div><button onClick={onClose} className="ml-auto p-2 rounded-lg hover:bg-white/10 text-white/45 hover:text-white"><X size={18} /></button></div><div className="p-5 overflow-y-auto custom-scrollbar space-y-4"><GlassCard className="p-4 border-white/10"><DetailRow label="证据文本" value={evidence.evidence_text} /><DetailRow label="关联车型" value={getVehicleName(evidence.vehicle)} /><DetailRow label="关联技术" value={getTechnologyName(evidence.technology)} /><DetailRow label="来源类型" value={sourceTypeLabel[evidence.source_document?.source_type] || evidence.source_document?.source_type} /><DetailRow label="来源文档" value={evidence.source_document?.title} /><DetailRow label="页码/时间" value={evidence.page_or_time} /><DetailRow label="置信度" value={`${(Number(evidence.confidence || 0) * 100).toFixed(0)}%`} /></GlassCard>{evidence.source_document?.id && <Button size="sm" className="w-full" onClick={() => onViewSource(evidence.source_document.id)}><BookOpen size={14} />查看来源文档</Button>}</div></div>;
}

function MaintenanceModal({ type, initial, vehicles, technologies, onClose, onSave }: any) {
  const [form, setForm] = useState<any>(() => {
    if (type === 'vehicle') return { brand_name: initial?.brand_name || '', model_name: initial?.model_name || '', energy_type: initial?.energy_type || '', market_segment: initial?.market_segment || '', launch_year: initial?.launch_year || '', base_price: initial?.base_price || '', specs: JSON.stringify(initial?.specs || {}, null, 2) };
    if (type === 'technology') return { name: initial?.name || '', category: initial?.category || 'other', description: initial?.description || '', maturity_level: initial?.maturity_level || 'concept', tags: JSON.stringify(initial?.tags || [], null, 2) };
    return { vehicle_id: '', technology_id: '', source_type: 'manual', evidence_text: '', page_or_time: '', confidence: '0.8' };
  });
  const [error, setError] = useState('');
  const set = (key: string, value: any) => setForm((prev: any) => ({ ...prev, [key]: value }));
  const title = type === 'vehicle' ? (initial ? '编辑车型' : '新增车型') : type === 'technology' ? (initial ? '编辑技术点' : '新增技术点') : '新增证据';
  const parseJson = (text: string, fallback: any, label: string) => { try { return { value: text.trim() ? JSON.parse(text) : fallback, error: '' }; } catch { return { value: fallback, error: `${label} 不是合法 JSON` }; } };
  const submit = async () => {
    setError('');
    if (type === 'vehicle') { if (!form.model_name.trim()) return setError('车型名不能为空'); const parsed = parseJson(form.specs, {}, 'specs'); if (parsed.error) return setError(parsed.error); await onSave({ brand_name: form.brand_name, model_name: form.model_name, energy_type: form.energy_type || null, market_segment: form.market_segment || null, launch_year: form.launch_year ? Number(form.launch_year) : null, base_price: form.base_price ? Number(form.base_price) : null, specs: parsed.value }); return; }
    if (type === 'technology') { if (!form.name.trim()) return setError('技术点名称不能为空'); const parsed = parseJson(form.tags, [], 'tags'); if (parsed.error) return setError(parsed.error); if (!Array.isArray(parsed.value)) return setError('tags 必须是 JSON 数组'); await onSave({ name: form.name, category: form.category, description: form.description || null, maturity_level: form.maturity_level, tags: parsed.value }); return; }
    if (!form.evidence_text.trim()) return setError('证据文本不能为空'); const confidence = Number(form.confidence); if (Number.isNaN(confidence) || confidence < 0 || confidence > 1) return setError('confidence 请填写 0 到 1 之间的小数'); await onSave({ vehicle_id: form.vehicle_id || null, technology_id: form.technology_id || null, source_type: form.source_type, evidence_text: form.evidence_text, page_or_time: form.page_or_time || null, confidence });
  };
  return <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"><GlassCard className="w-full max-w-[620px] border-white/10 shadow-2xl overflow-hidden"><div className="px-5 py-4 border-b border-white/10 flex items-center gap-3"><Plus size={17} className="text-cyan-300" /><div className="text-sm font-black text-white">{title}</div><button onClick={onClose} className="ml-auto p-2 rounded hover:bg-white/10 text-white/45"><X size={18} /></button></div><div className="p-5 space-y-4">{type === 'vehicle' && <><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><TextInput label="品牌" value={form.brand_name} onChange={(v: string) => set('brand_name', v)} /><TextInput label="车型名 *" value={form.model_name} onChange={(v: string) => set('model_name', v)} /><TextInput label="能源类型" value={form.energy_type} onChange={(v: string) => set('energy_type', v)} /><TextInput label="市场级别" value={form.market_segment} onChange={(v: string) => set('market_segment', v)} /><TextInput label="上市年份" type="number" value={form.launch_year} onChange={(v: string) => set('launch_year', v)} /><TextInput label="指导价（万元）" type="number" value={form.base_price} onChange={(v: string) => set('base_price', v)} /></div><TextArea label="specs JSON" mono value={form.specs} onChange={(v: string) => set('specs', v)} /></>}{type === 'technology' && <><TextInput label="技术点名称 *" value={form.name} onChange={(v: string) => set('name', v)} /><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><SelectInput label="类别" value={form.category} onChange={(v: string) => set('category', v)} options={categoryOptions} labels={categoryLabel} /><SelectInput label="成熟度" value={form.maturity_level} onChange={(v: string) => set('maturity_level', v)} options={maturityOptions} labels={maturityLabel} /></div><TextArea label="描述" value={form.description} onChange={(v: string) => set('description', v)} /><TextArea label="tags JSON" mono value={form.tags} onChange={(v: string) => set('tags', v)} /></>}{type === 'evidence' && <><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><label className="flex flex-col gap-1 text-[10px] text-white/40 font-bold">关联车型<select value={form.vehicle_id} onChange={(e) => set('vehicle_id', e.target.value)} className="bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white"><option value="">不绑定车型</option>{vehicles.map((v: any) => <option key={v.id} value={v.id}>{getVehicleName(v)}</option>)}</select></label><label className="flex flex-col gap-1 text-[10px] text-white/40 font-bold">关联技术点<select value={form.technology_id} onChange={(e) => set('technology_id', e.target.value)} className="bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white"><option value="">不绑定技术点</option>{technologies.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label><SelectInput label="来源类型" value={form.source_type} onChange={(v: string) => set('source_type', v)} options={sourceTypeOptions} labels={sourceTypeLabel} /><TextInput label="confidence（0-1）" type="number" value={form.confidence} onChange={(v: string) => set('confidence', v)} /></div><TextInput label="页码/时间" value={form.page_or_time} onChange={(v: string) => set('page_or_time', v)} /><TextArea label="证据文本 *" value={form.evidence_text} onChange={(v: string) => set('evidence_text', v)} /></>}{error && <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded px-3 py-2">{error}</div>}<div className="flex justify-end gap-2"><Button variant="ghost" size="sm" onClick={onClose}>取消</Button><Button size="sm" onClick={submit}><Save size={14} />保存</Button></div></div></GlassCard></div>;
}

function ExcelImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any | null>(null);
  const [finalMapping, setFinalMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');

  const parseFile = async () => {
    if (!file) return setError('请先选择 .xlsx 文件');
    setIsParsing(true); setError(''); setResult(null);
    try {
      const data = await competitors.previewExcel(file);
      setPreview(data);
      setFinalMapping(data.auto_mapping || {});
    } catch (err: any) { setError(err?.message || 'Excel 解析失败'); }
    finally { setIsParsing(false); }
  };
  const updateMapping = (header: string, field: string) => {
    setFinalMapping((current) => {
      const next = { ...current };
      Object.keys(next).forEach((key) => { if (field && next[key] === field) next[key] = ''; });
      next[header] = field;
      return next;
    });
    setResult(null);
  };
  const mappedFields = new Set(Object.values(finalMapping).filter(Boolean));
  const vehicleAuxiliary = ['brand_name', 'variant_name', 'energy_type', 'market_segment', 'launch_year', 'base_price'];
  const technologyAuxiliary = ['technology_category', 'technology_description', 'maturity_level'];
  const missingRequiredFields = [
    ...(vehicleAuxiliary.some((field) => mappedFields.has(field)) && !mappedFields.has('model_name') ? ['model_name'] : []),
    ...(technologyAuxiliary.some((field) => mappedFields.has(field)) && !mappedFields.has('technology_name') ? ['technology_name'] : []),
  ];
  const missingLabels: Record<string, string> = { model_name: '车型', technology_name: '技术点名称' };
  const hasBlockingMissingField = missingRequiredFields.includes('model_name');
  const unmappedHeaders = (preview?.raw_headers || []).filter((header: string) => header && !finalMapping[header]);
  const headerFor = (field: string) => Object.keys(finalMapping).find((header) => finalMapping[header] === field);
  const mappedValue = (row: any, field: string) => { const header = headerFor(field); return header ? row[header] : null; };
  const qualityReport = useMemo(() => {
    const rows = preview?.raw_rows || [];
    const validRows: any[] = [];
    const validationErrors: any[] = [];
    const parseNumber = (value: any) => { const match = String(value ?? '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/); return match ? Number(match[0]) : null; };
    rows.forEach((row: any, index: number) => {
      const errors: string[] = [];
      const vehicleValues = vehicleAuxiliary.concat('model_name').map((field) => mappedValue(row, field));
      if (vehicleValues.some((value) => String(value ?? '').trim()) && !String(mappedValue(row, 'model_name') ?? '').trim()) errors.push('车型相关字段存在数据，但车型不能为空');
      const price = mappedValue(row, 'base_price'); if (String(price ?? '').trim() && parseNumber(price) === null) errors.push('指导价必须能转换为数字');
      const year = mappedValue(row, 'launch_year'); const parsedYear = parseNumber(year); if (String(year ?? '').trim() && (parsedYear === null || !Number.isInteger(parsedYear))) errors.push('上市年份必须能转换为整数');
      const confidence = mappedValue(row, 'confidence'); const parsedConfidence = parseNumber(confidence); if (String(confidence ?? '').trim() && (parsedConfidence === null || parsedConfidence < 0 || parsedConfidence > 1)) errors.push('置信度必须是 0 到 1 之间的数字');
      const hasEntity = ['model_name', 'technology_name', 'evidence_text'].some((field) => String(mappedValue(row, field) ?? '').trim());
      if (!hasEntity) errors.push('该行没有可导入的车型、技术点或证据');
      if (errors.length) validationErrors.push({ row_number: row.__row_number__ || index + 2, errors, raw_data: row }); else validRows.push(row);
    });
    const vehicles = new Set(validRows.map((row: any) => { const model = mappedValue(row, 'model_name'); return model ? `${mappedValue(row, 'brand_name') || '未填写品牌'}::${model}` : ''; }).filter(Boolean));
    const variants = new Set(validRows.map((row: any) => { const model = mappedValue(row, 'model_name'); const variant = mappedValue(row, 'variant_name'); return model && variant ? `${mappedValue(row, 'brand_name') || '未填写品牌'}::${model}::${variant}` : ''; }).filter(Boolean));
    const technologies = new Set(validRows.map((row: any) => { const name = mappedValue(row, 'technology_name'); return name ? `${name}::${mappedValue(row, 'technology_category') || 'other'}` : ''; }).filter(Boolean));
    const evidenceItems = new Set(validRows.map((row: any) => mappedValue(row, 'evidence_text')).filter(Boolean));
    return { validRows, validationErrors, summary: { vehicle_count: vehicles.size, variant_count: variants.size, technology_count: technologies.size, evidence_count: evidenceItems.size } };
  }, [preview, finalMapping]);
  const confirmImport = async () => {
    if (!preview || hasBlockingMissingField) return;
    if (!Object.values(finalMapping).some(Boolean)) return setError('请至少映射一个标准字段');
    setIsImporting(true); setError('');
    try {
      const response = await competitors.confirmExcel({
        file_name: preview.file_name,
        sheet_name: preview.sheet_name,
        raw_headers: preview.raw_headers,
        raw_rows: preview.raw_rows,
        final_mapping: finalMapping,
      });
      setResult(response);
      await onImported();
    } catch (err: any) { setError(err?.message || 'Excel 导入失败'); }
    finally { setIsImporting(false); }
  };
  const skippedDuplicateCount = result ? Object.values(result.skipped_duplicates || {}).reduce((sum: number, value: any) => sum + Number(value || 0), 0) : 0;


  return <div className="fixed inset-0 z-[105] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
    <GlassCard className="w-full max-w-[1080px] max-h-[90vh] border-white/10 shadow-2xl overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3"><FileSpreadsheet size={18} className="text-emerald-300" /><div><div className="text-sm font-black text-white">Excel 配置表导入</div><div className="text-[10px] text-white/35 mt-0.5">自动识别 · 人工确认 · 确认后写入</div></div><button onClick={onClose} className="ml-auto p-2 rounded hover:bg-white/10 text-white/45"><X size={18} /></button></div>
      <div className="p-5 overflow-y-auto custom-scrollbar space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center"><label className="flex-1 border border-dashed border-white/15 bg-white/[0.03] rounded px-4 py-3 cursor-pointer hover:border-emerald-400/40"><input type="file" accept=".xlsx" className="hidden" onChange={(event) => { setFile(event.target.files?.[0] || null); setPreview(null); setResult(null); setError(''); }} /><span className="text-xs text-white/65">{file?.name || '选择 .xlsx 文件'}</span></label><Button size="sm" onClick={parseFile} disabled={!file || isParsing}>{isParsing ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}解析预览</Button></div>
        {error && <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded px-3 py-2">{error}</div>}
        {preview && <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3"><StatCard label="有效行" value={qualityReport.validRows.length} icon={<FileSpreadsheet size={16} />} /><StatCard label="错误行" value={qualityReport.validationErrors.length} icon={<FileText size={16} />} /><StatCard label="车型" value={qualityReport.summary.vehicle_count} icon={<Layers size={16} />} /><StatCard label="版本" value={qualityReport.summary.variant_count} icon={<Layers size={16} />} /><StatCard label="技术点" value={qualityReport.summary.technology_count} icon={<Wrench size={16} />} /><StatCard label="证据" value={qualityReport.summary.evidence_count} icon={<FileText size={16} />} /></div>
          <div className="border border-white/10 rounded overflow-hidden"><div className="px-4 py-3 bg-white/[0.03] flex items-center"><div><div className="text-[11px] font-bold text-white/65">字段映射确认 · {preview.sheet_name}</div><div className="text-[9px] text-white/30 mt-1">左侧为 Excel 原始列，右侧选择系统标准字段</div></div><button onClick={() => setFinalMapping(preview.auto_mapping || {})} className="ml-auto text-[10px] text-cyan-200 hover:text-cyan-100">恢复自动识别</button></div><div className="divide-y divide-white/5">{preview.raw_headers.filter(Boolean).map((header: string) => <div key={header} className="grid grid-cols-[minmax(0,1fr)_24px_minmax(0,1fr)] items-center gap-3 px-4 py-2.5"><div className="text-xs text-white/75 truncate" title={header}>{header}</div><div className="text-white/20 text-center">→</div><select aria-label={`${header} 字段映射`} value={finalMapping[header] || ''} onChange={(event) => updateMapping(header, event.target.value)} className="bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white"><option value="">忽略</option>{preview.supported_fields.map((field: any) => <option key={field.key} value={field.key}>{field.group} · {field.label}</option>)}</select></div>)}</div></div>
          {unmappedHeaders.length > 0 && <div className="text-xs text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded px-3 py-2">当前忽略字段：{unmappedHeaders.join('、')}</div>}
          {missingRequiredFields.length > 0 && <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded px-3 py-2">缺失关键字段：{missingRequiredFields.map((field) => missingLabels[field]).join('、')}。{missingRequiredFields.includes('model_name') ? '缺少车型字段，无法导入车型数据。' : ''}</div>}
          {qualityReport.validationErrors.length > 0 && <div className="space-y-2"><div className="text-xs text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded px-3 py-2">存在错误行，系统将跳过错误行，仅导入有效数据。</div><div className="border border-rose-500/20 rounded overflow-hidden"><div className="px-3 py-2 bg-rose-500/10 text-[10px] font-bold text-rose-200">错误行详情</div><div className="max-h-[180px] overflow-y-auto custom-scrollbar divide-y divide-white/5">{qualityReport.validationErrors.slice(0, 20).map((item: any) => <div key={item.row_number} className="px-3 py-2 grid grid-cols-[56px_1fr] gap-3 text-[10px]"><span className="text-white/35 font-mono">第 {item.row_number} 行</span><div><div className="text-rose-200/80">{item.errors.join('；')}</div><div className="mt-1 text-white/25 font-mono break-all">{JSON.stringify(item.raw_data)}</div></div></div>)}</div></div></div>}
          <div className="border border-white/10 rounded overflow-x-auto"><table className="w-full min-w-[760px] text-left text-[10px]"><thead className="bg-white/5 text-white/45"><tr><th className="px-3 py-2">行</th>{preview.raw_headers.filter(Boolean).map((header: string) => <th key={header} className="px-3 py-2 max-w-[180px] truncate">{header}</th>)}</tr></thead><tbody className="divide-y divide-white/5">{preview.preview_rows.map((row: any) => <tr key={row.__row_number__}><td className="px-3 py-2 text-white/30 font-mono">{row.__row_number__}</td>{preview.raw_headers.filter(Boolean).map((header: string) => <td key={header} className="px-3 py-2 text-white/65 max-w-[220px] truncate">{row[header] ?? '-'}</td>)}</tr>)}</tbody></table>{preview.raw_rows.length > 20 && <div className="px-3 py-2 text-[10px] text-white/30">仅展示前 20 行，共 {preview.raw_rows.length} 行</div>}</div>
          <div className="flex justify-end"><Button size="sm" onClick={confirmImport} disabled={isImporting || preview.raw_rows.length === 0 || hasBlockingMissingField}>{isImporting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}使用当前映射确认导入</Button></div>
        </>}
        {result && <div className="border border-emerald-500/20 bg-emerald-500/10 rounded px-4 py-3 text-xs text-emerald-200">导入完成：新增车型 {result.created_vehicles ?? result.created?.vehicles ?? 0}、版本 {result.created_variants ?? result.created?.variants ?? 0}、技术点 {result.created_technologies ?? result.created?.technologies ?? 0}、证据 {result.created_evidence ?? result.created?.evidence ?? 0}；重复跳过 {skippedDuplicateCount}，错误行跳过 {result.skipped_invalid_rows ?? 0}。</div>}
      </div>
    </GlassCard>
  </div>;
}

function TextSourceModal({ vehicles, technologies, initialSourceId, onClose, onEvidenceCreated }: any) {
  const textSourceTypes = ['press_release', 'official_site', 'webpage', 'transcript', 'manual'];
  const [sources, setSources] = useState<any[]>([]);
  const [detail, setDetail] = useState<any | null>(null);
  const [sourceForm, setSourceForm] = useState({ title: '', source_type: 'press_release', source_url: '', raw_text: '' });
  const [evidenceForm, setEvidenceForm] = useState({ vehicle_id: '', technology_id: '', proposed_brand_name: '', proposed_model_name: '', proposed_technology_name: '', technology_category: 'other', evidence_text: '', page_or_time: '', confidence: '0.8' });
  const [textFile, setTextFile] = useState<File | null>(null);
  const [sourceSearch, setSourceSearch] = useState('');
  const [sourceTypeFilter, setSourceTypeFilter] = useState('');
  const [hasEvidenceFilter, setHasEvidenceFilter] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const loadSources = async (preferredId?: string) => {
    const rows = await competitors.sources({
      title: sourceSearch,
      source_type: sourceTypeFilter,
      has_evidence: hasEvidenceFilter,
    });
    setSources(rows || []);
    const targetId = preferredId && rows?.some((row: any) => row.id === preferredId) ? preferredId : rows?.[0]?.id;
    if (targetId) setDetail(await competitors.sourceDetail(targetId)); else setDetail(null);
  };
  useEffect(() => { loadSources(initialSourceId).catch((err: any) => setError(err?.message || '来源文档加载失败')).finally(() => setIsLoading(false)); }, []);
  const openSource = async (id: string) => {
    setError('');
    setIsEditing(false);
    try { setDetail(await competitors.sourceDetail(id)); }
    catch (err: any) { setError(err?.message || '来源文档详情加载失败'); }
  };
  const applySourceFilters = async () => {
    setIsLoading(true); setError('');
    try { await loadSources(); }
    catch (err: any) { setError(err?.message || '来源文档筛选失败'); }
    finally { setIsLoading(false); }
  };
  const beginEdit = () => {
    if (!detail) return;
    setEditForm({
      title: detail.title || '',
      source_type: detail.source_type || 'manual',
      source_url: detail.source_url || '',
      raw_text: detail.raw_text || '',
      file_name: detail.file_name || '',
    });
    setIsEditing(true);
  };
  const saveEdit = async () => {
    if (!detail || !editForm?.title?.trim()) return setError('标题不能为空');
    if (!editForm?.raw_text?.trim()) return setError('正文不能为空');
    setIsSaving(true); setError('');
    try {
      const updated = await competitors.updateSource(detail.id, {
        ...editForm,
        source_url: editForm.source_url || null,
        file_name: editForm.file_name || null,
      });
      setDetail(updated);
      setIsEditing(false);
      await loadSources(updated.id);
    } catch (err: any) { setError(err?.message || '来源文档更新失败'); }
    finally { setIsSaving(false); }
  };
  const deleteSource = async () => {
    if (!detail || !window.confirm(`确认删除来源文档“${detail.title}”吗？`)) return;
    setIsSaving(true); setError('');
    try {
      await competitors.deleteSource(detail.id);
      setDetail(null);
      setIsEditing(false);
      await loadSources();
    } catch (err: any) { setError(err?.message || '来源文档删除失败'); }
    finally { setIsSaving(false); }
  };
  const saveTextSource = async () => {
    if (!sourceForm.title.trim()) return setError('标题不能为空');
    if (!sourceForm.raw_text.trim()) return setError('正文不能为空');
    setIsSaving(true); setError('');
    try {
      const created = await competitors.createTextSource({ ...sourceForm, source_url: sourceForm.source_url || null });
      setSourceForm({ title: '', source_type: 'press_release', source_url: '', raw_text: '' });
      await loadSources(created.id);
    } catch (err: any) { setError(err?.message || '来源文档保存失败'); }
    finally { setIsSaving(false); }
  };
  const uploadText = async () => {
    if (!textFile) return setError('请先选择 .txt 文件');
    setIsSaving(true); setError('');
    try {
      const created = await competitors.uploadTextSource(textFile, {
        title: sourceForm.title,
        source_type: sourceForm.source_type,
        source_url: sourceForm.source_url,
      });
      setTextFile(null);
      setSourceForm({ title: '', source_type: 'press_release', source_url: '', raw_text: '' });
      await loadSources(created.id);
    } catch (err: any) { setError(err?.message || 'TXT 上传失败'); }
    finally { setIsSaving(false); }
  };
  const createEvidence = async () => {
    if (!detail) return;
    if (!evidenceForm.evidence_text.trim()) return setError('证据文本不能为空');
    const confidence = Number(evidenceForm.confidence);
    if (Number.isNaN(confidence) || confidence < 0 || confidence > 1) return setError('置信度必须在 0 到 1 之间');
    setIsSaving(true); setError('');
    try {
      await competitors.createEvidenceFromSource({
        source_document_id: detail.id,
        vehicle_id: evidenceForm.vehicle_id || null,
        technology_id: evidenceForm.technology_id || null,
        evidence_text: evidenceForm.evidence_text,
        page_or_time: evidenceForm.page_or_time || null,
        confidence,
      });
      setEvidenceForm({ vehicle_id: '', technology_id: '', proposed_brand_name: '', proposed_model_name: '', proposed_technology_name: '', technology_category: 'other', evidence_text: '', page_or_time: '', confidence: '0.8' });
      await loadSources(detail.id);
      await onEvidenceCreated();
    } catch (err: any) { setError(err?.message || '证据创建失败'); }
    finally { setIsSaving(false); }
  };
  const saveCandidate = async () => {
    if (!detail) return;
    if (!evidenceForm.evidence_text.trim()) return setError('证据文本不能为空');
    const confidence = Number(evidenceForm.confidence);
    if (Number.isNaN(confidence) || confidence < 0 || confidence > 1) return setError('置信度必须在 0 到 1 之间');
    if (!evidenceForm.vehicle_id && !evidenceForm.proposed_model_name.trim()) return setError('请选择车型或填写候选车型');
    if (!evidenceForm.technology_id && !evidenceForm.proposed_technology_name.trim()) return setError('请选择技术点或填写候选技术点');
    setIsSaving(true); setError('');
    try {
      await competitors.createReviewCandidate({
        source_document_id: detail.id,
        matched_vehicle_id: evidenceForm.vehicle_id || null,
        proposed_brand_name: evidenceForm.proposed_brand_name || null,
        proposed_model_name: evidenceForm.proposed_model_name || null,
        matched_technology_id: evidenceForm.technology_id || null,
        proposed_technology_name: evidenceForm.proposed_technology_name || null,
        technology_category: evidenceForm.technology_category || 'other',
        evidence_text: evidenceForm.evidence_text,
        page_or_time: evidenceForm.page_or_time || null,
        confidence,
        origin: 'manual',
        raw_payload: { entry: 'text_source_detail' },
      });
      setEvidenceForm({ vehicle_id: '', technology_id: '', proposed_brand_name: '', proposed_model_name: '', proposed_technology_name: '', technology_category: 'other', evidence_text: '', page_or_time: '', confidence: '0.8' });
      await loadSources(detail.id);
    } catch (err: any) { setError(err?.message || '候选保存失败'); }
    finally { setIsSaving(false); }
  };

  return <div className="fixed inset-0 z-[105] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
    <GlassCard className="w-full max-w-[1180px] max-h-[92vh] border-white/10 shadow-2xl overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3"><BookOpen size={18} className="text-cyan-300" /><div><div className="text-sm font-black text-white">文本资料导入</div><div className="text-[10px] text-white/35 mt-0.5">来源文档 · 正文查看 · 手工证据绑定</div></div><button onClick={onClose} className="ml-auto p-2 rounded hover:bg-white/10 text-white/45"><X size={18} /></button></div>
      <div className="p-5 overflow-y-auto custom-scrollbar space-y-4">
        {error && <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded px-3 py-2">{error}</div>}
        <div className="border border-white/10 rounded overflow-hidden">
          <div className="px-4 py-3 bg-white/[0.03] text-[11px] font-bold text-white/70">新增来源文档</div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><TextInput label="标题 *" value={sourceForm.title} onChange={(value: string) => setSourceForm({ ...sourceForm, title: value })} /><SelectInput label="来源类型" value={sourceForm.source_type} onChange={(value: string) => setSourceForm({ ...sourceForm, source_type: value })} options={textSourceTypes} labels={sourceTypeLabel} /><TextInput label="来源 URL" value={sourceForm.source_url} onChange={(value: string) => setSourceForm({ ...sourceForm, source_url: value })} placeholder="可选" /></div>
            <TextArea label="正文内容 *" rows={6} value={sourceForm.raw_text} onChange={(value: string) => setSourceForm({ ...sourceForm, raw_text: value })} placeholder="粘贴发布会稿件、官网新闻、网页文本或转写内容" />
            <div className="flex flex-col md:flex-row gap-2 md:items-center"><label className="flex-1 border border-dashed border-white/15 bg-white/[0.03] rounded px-3 py-2 cursor-pointer"><input type="file" accept=".txt,text/plain" className="hidden" onChange={(event) => setTextFile(event.target.files?.[0] || null)} /><span className="text-[11px] text-white/55">{textFile?.name || '选择 .txt 文件'}</span></label><Button variant="ghost" size="sm" onClick={uploadText} disabled={!textFile || isSaving}><Upload size={14} />上传 TXT</Button><Button size="sm" onClick={saveTextSource} disabled={isSaving}>{isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}保存来源文档</Button></div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 min-h-[480px]">
          <div className="border border-white/10 rounded overflow-hidden flex flex-col">
            <div className="px-4 py-3 bg-white/[0.03] text-[11px] font-bold text-white/70">来源文档列表 · {sources.length}</div>
            <div className="p-3 border-b border-white/10 space-y-2">
              <label className="flex items-center gap-2 bg-white/5 border border-white/10 rounded px-2 py-1.5"><Search size={12} className="text-white/30" /><input value={sourceSearch} onChange={(event) => setSourceSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') applySourceFilters(); }} placeholder="搜索来源文档标题" className="bg-transparent outline-none text-xs text-white placeholder-white/25 flex-1" /></label>
              <div className="grid grid-cols-2 gap-2"><select aria-label="来源类型筛选" value={sourceTypeFilter} onChange={(event) => setSourceTypeFilter(event.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-[10px] text-white"><option value="">全部来源类型</option>{sourceTypeOptions.map((type) => <option key={type} value={type}>{sourceTypeLabel[type] || type}</option>)}</select><select aria-label="证据状态筛选" value={hasEvidenceFilter} onChange={(event) => setHasEvidenceFilter(event.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-[10px] text-white"><option value="">全部证据状态</option><option value="true">已有证据</option><option value="false">暂无证据</option></select></div>
              <Button variant="ghost" size="sm" className="w-full" onClick={applySourceFilters}><Filter size={13} />应用筛选</Button>
            </div>
            <div className="flex-1 max-h-[620px] overflow-y-auto custom-scrollbar divide-y divide-white/5">{isLoading ? <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-cyan-300" /></div> : sources.length === 0 ? <div className="p-8 text-center text-[11px] text-white/30">暂无来源文档</div> : sources.map((source) => <button key={source.id} onClick={() => openSource(source.id)} className={`w-full text-left px-4 py-3 hover:bg-white/[0.04] ${detail?.id === source.id ? 'bg-cyan-500/[0.08]' : ''}`}><div className="text-xs font-bold text-white/80 line-clamp-2">{source.title}</div><div className="mt-2 flex flex-wrap gap-1"><span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-200 text-[9px]">{sourceTypeLabel[source.source_type] || source.source_type}</span>{source.file_name && <span className="px-1.5 py-0.5 rounded bg-white/5 text-white/40 text-[9px]">{source.file_name}</span>}</div>{source.source_url && <div className="mt-2 text-[9px] text-cyan-200/45 truncate">{source.source_url}</div>}<div className="mt-2 flex justify-between text-[9px] text-white/30"><span>{source.raw_text_length} 字</span><span>{source.evidence_count} 条证据</span></div><div className="mt-1 text-[9px] text-white/20">{source.created_at ? new Date(source.created_at).toLocaleString() : ''}</div></button>)}</div>
          </div>
          <div className="border border-white/10 rounded overflow-hidden">{!detail ? <div className="h-full flex items-center justify-center text-xs text-white/30">选择来源文档查看详情</div> : <div className="h-full flex flex-col"><div className="px-4 py-3 bg-white/[0.03] border-b border-white/10 flex items-start gap-3"><div className="min-w-0"><div className="text-sm font-bold text-white/85 truncate">{detail.title}</div><div className="mt-1 text-[10px] text-white/35 truncate">{sourceTypeLabel[detail.source_type] || detail.source_type}{detail.source_url ? ` · ${detail.source_url}` : ''}</div></div><div className="ml-auto flex items-center gap-1"><button title="编辑来源文档" onClick={beginEdit} className="p-2 rounded hover:bg-white/10 text-white/40 hover:text-cyan-200"><Edit3 size={14} /></button><button title="删除来源文档" onClick={deleteSource} className="p-2 rounded hover:bg-rose-500/10 text-white/40 hover:text-rose-300"><X size={14} /></button></div></div><div className="p-4 space-y-4 overflow-y-auto custom-scrollbar">
            {isEditing && editForm ? <div className="border border-cyan-500/20 bg-cyan-500/[0.04] rounded p-3 space-y-3"><div className="text-[10px] font-bold text-cyan-200">编辑来源文档</div><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><TextInput label="标题 *" value={editForm.title} onChange={(value: string) => setEditForm({ ...editForm, title: value })} /><SelectInput label="来源类型" value={editForm.source_type} onChange={(value: string) => setEditForm({ ...editForm, source_type: value })} options={textSourceTypes} labels={sourceTypeLabel} /><TextInput label="来源 URL" value={editForm.source_url} onChange={(value: string) => setEditForm({ ...editForm, source_url: value })} /><TextInput label="文件名" value={editForm.file_name} onChange={(value: string) => setEditForm({ ...editForm, file_name: value })} /></div><TextArea label="正文内容 *" rows={6} value={editForm.raw_text} onChange={(value: string) => setEditForm({ ...editForm, raw_text: value })} /><div className="flex justify-end gap-2"><Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>取消</Button><Button size="sm" onClick={saveEdit} disabled={isSaving}><Save size={14} />保存修改</Button></div></div> : <div><div className="text-[10px] font-bold text-white/45 mb-2">原始正文</div><pre className="max-h-[260px] overflow-y-auto custom-scrollbar whitespace-pre-wrap select-text bg-black/20 border border-white/10 rounded p-3 text-[11px] leading-relaxed text-white/70">{detail.raw_text}</pre></div>}
            <div className="border-t border-white/10 pt-4 space-y-3"><div className="text-[10px] font-bold text-white/45">从本文档创建证据</div><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><label className="flex flex-col gap-1 text-[10px] text-white/40 font-bold">匹配已有车型<select value={evidenceForm.vehicle_id} onChange={(event) => setEvidenceForm({ ...evidenceForm, vehicle_id: event.target.value })} className="bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white"><option value="">不匹配，填写候选车型</option>{vehicles.map((vehicle: any) => <option key={vehicle.id} value={vehicle.id}>{getVehicleName(vehicle)}</option>)}</select></label><label className="flex flex-col gap-1 text-[10px] text-white/40 font-bold">匹配已有技术点<select value={evidenceForm.technology_id} onChange={(event) => setEvidenceForm({ ...evidenceForm, technology_id: event.target.value })} className="bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white"><option value="">不匹配，填写候选技术点</option>{technologies.map((technology: any) => <option key={technology.id} value={technology.id}>{technology.name}</option>)}</select></label><TextInput label="候选品牌" value={evidenceForm.proposed_brand_name} onChange={(value: string) => setEvidenceForm({ ...evidenceForm, proposed_brand_name: value })} /><TextInput label="候选车型" value={evidenceForm.proposed_model_name} onChange={(value: string) => setEvidenceForm({ ...evidenceForm, proposed_model_name: value })} /><TextInput label="候选技术点" value={evidenceForm.proposed_technology_name} onChange={(value: string) => setEvidenceForm({ ...evidenceForm, proposed_technology_name: value })} /><SelectInput label="技术类别" value={evidenceForm.technology_category} onChange={(value: string) => setEvidenceForm({ ...evidenceForm, technology_category: value })} options={categoryOptions} labels={categoryLabel} /></div><TextArea label="证据文本 *" rows={4} value={evidenceForm.evidence_text} onChange={(value: string) => setEvidenceForm({ ...evidenceForm, evidence_text: value })} placeholder="从上方正文复制需要引用的段落" /><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><TextInput label="页码或时间" value={evidenceForm.page_or_time} onChange={(value: string) => setEvidenceForm({ ...evidenceForm, page_or_time: value })} /><TextInput label="置信度（0-1）" type="number" value={evidenceForm.confidence} onChange={(value: string) => setEvidenceForm({ ...evidenceForm, confidence: value })} /></div><div className="flex justify-end gap-2"><Button variant="ghost" size="sm" onClick={saveCandidate} disabled={isSaving}><Save size={14} />保存为候选</Button><Button size="sm" onClick={createEvidence} disabled={isSaving}><Save size={14} />生成证据</Button></div></div>
            <div className="border-t border-white/10 pt-4"><div className="text-[10px] font-bold text-white/45 mb-2">已创建证据 · {detail.evidence_items?.length || 0}</div><div className="space-y-2">{(detail.evidence_items || []).map((item: any) => <div key={item.id} className="border border-white/10 rounded p-3"><div className="text-[11px] text-white/70 leading-relaxed">{item.evidence_text}</div><div className="mt-2 text-[9px] text-white/30">{getVehicleName(item.vehicle)} · {getTechnologyName(item.technology)}</div><div className="mt-1 flex justify-between gap-2 text-[9px] text-white/25"><span>{item.page_or_time || '未填写位置'} · {(Number(item.confidence || 0) * 100).toFixed(0)}%</span><span>{item.created_at ? new Date(item.created_at).toLocaleString() : ''}</span></div></div>)}</div></div>
          </div></div>}</div>
        </div>
      </div>
    </GlassCard>
  </div>;
}

export const CompetitorLibrary: React.FC = () => {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [technologies, setTechnologies] = useState<any[]>([]);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [workspace, setWorkspace] = useState<'data' | 'review'>('data');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedTechnologyId, setSelectedTechnologyId] = useState('');
  const [selectedSourceType, setSelectedSourceType] = useState('');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [technologySearch, setTechnologySearch] = useState('');
  const [evidenceSearch, setEvidenceSearch] = useState('');
  const [detailVehicle, setDetailVehicle] = useState<any | null>(null);
  const [detailEvidence, setDetailEvidence] = useState<any | null>(null);
  const [modal, setModal] = useState<any | null>(null);
  const [excelImportOpen, setExcelImportOpen] = useState(false);
  const [textSourceOpen, setTextSourceOpen] = useState(false);
  const [textSourceTarget, setTextSourceTarget] = useState<string | null>(null);
  const [compareLeftId, setCompareLeftId] = useState('');
  const [compareRightId, setCompareRightId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadData = async () => { setIsLoading(true); setError(null); try { const [vehicleRows, techRows, evidenceRows] = await Promise.all([competitors.vehicles(), competitors.technologies(), competitors.evidence()]); setVehicles(vehicleRows || []); setTechnologies(techRows || []); setEvidence(evidenceRows || []); } catch (err: any) { setError(err?.message || '竞品库数据加载失败'); } finally { setIsLoading(false); } };
  useEffect(() => { loadData(); }, []);
  const seedData = async () => { setIsSeeding(true); try { await competitors.seed(); await loadData(); } catch (err: any) { setError(err?.message || '示例数据写入失败'); } finally { setIsSeeding(false); } };
  const downloadTemplate = async () => { try { await competitors.downloadExcelTemplate(); } catch (err: any) { setError(err?.message || '模板下载失败'); } };
  const openVehicleDetail = async (vehicle: any) => { setSelectedVehicleId(vehicle.id); setSelectedTechnologyId(''); setIsDetailLoading(true); try { setDetailVehicle(await competitors.vehicleDetail(vehicle.id)); } catch (err: any) { setError(err?.message || '车型详情加载失败'); } finally { setIsDetailLoading(false); } };
  const openEvidenceDetail = async (item: any) => { try { setDetailEvidence(await competitors.evidenceDetail(item.id)); } catch (err: any) { setError(err?.message || '证据详情加载失败'); } };
  const saveModal = async (payload: any) => { if (modal.type === 'vehicle') modal.initial ? await competitors.updateVehicle(modal.initial.id, payload) : await competitors.createVehicle(payload); if (modal.type === 'technology') modal.initial ? await competitors.updateTechnology(modal.initial.id, payload) : await competitors.createTechnology(payload); if (modal.type === 'evidence') await competitors.createEvidence(payload); setModal(null); await loadData(); };

  const sourceTypes = useMemo(() => Array.from(new Set(evidence.map((i) => i.source_document?.source_type).filter(Boolean))), [evidence]);
  const filteredVehicles = useMemo(() => vehicles.filter((v) => `${v.brand_name} ${v.model_name}`.toLowerCase().includes(vehicleSearch.toLowerCase())), [vehicles, vehicleSearch]);
  const filteredTechnologies = useMemo(() => technologies.filter((t) => `${t.name} ${categoryLabel[t.category] || t.category}`.toLowerCase().includes(technologySearch.toLowerCase())), [technologies, technologySearch]);
  const filteredEvidence = useMemo(() => evidence.filter((item) => { if (selectedVehicleId && item.vehicle_id !== selectedVehicleId) return false; if (selectedTechnologyId && item.technology_id !== selectedTechnologyId) return false; if (selectedSourceType && item.source_document?.source_type !== selectedSourceType) return false; if (evidenceSearch && !String(item.evidence_text || '').toLowerCase().includes(evidenceSearch.toLowerCase())) return false; return true; }), [evidence, selectedVehicleId, selectedSourceType, selectedTechnologyId, evidenceSearch]);
  const selectedTechnologyVehicles = useMemo(() => { if (!selectedTechnologyId) return []; const map = new Map<string, any>(); evidence.forEach((item) => { if (item.technology_id === selectedTechnologyId && item.vehicle) map.set(item.vehicle.id, item.vehicle); }); return Array.from(map.values()); }, [evidence, selectedTechnologyId]);
  const evidenceByVehicle = useMemo(() => { const map = new Map<string, any[]>(); evidence.forEach((item) => { if (item.vehicle_id) map.set(item.vehicle_id, [...(map.get(item.vehicle_id) || []), item]); }); return map; }, [evidence]);
  const technologiesByVehicle = useMemo(() => { const map = new Map<string, Set<string>>(); evidence.forEach((item) => { if (!item.vehicle_id || !item.technology_id) return; if (!map.has(item.vehicle_id)) map.set(item.vehicle_id, new Set()); map.get(item.vehicle_id)?.add(item.technology_id); }); return map; }, [evidence]);
  const leftVehicle = vehicles.find((item) => item.id === compareLeftId) || null;
  const rightVehicle = vehicles.find((item) => item.id === compareRightId) || null;
  const hasData = vehicles.length > 0 || technologies.length > 0 || evidence.length > 0;
  const clearFilters = () => { setSelectedVehicleId(''); setSelectedTechnologyId(''); setSelectedSourceType(''); setEvidenceSearch(''); };
  const comparisonRows = [['品牌', leftVehicle?.brand_name, rightVehicle?.brand_name], ['车型', leftVehicle?.model_name, rightVehicle?.model_name], ['能源类型', leftVehicle?.energy_type, rightVehicle?.energy_type], ['市场级别', leftVehicle?.market_segment, rightVehicle?.market_segment], ['指导价', leftVehicle ? formatPrice(leftVehicle.base_price) : '', rightVehicle ? formatPrice(rightVehicle.base_price) : ''], ['specs', leftVehicle ? JSON.stringify(leftVehicle.specs || {}) : '', rightVehicle ? JSON.stringify(rightVehicle.specs || {}) : ''], ['关联技术点数量', leftVehicle ? technologiesByVehicle.get(leftVehicle.id)?.size || 0 : '', rightVehicle ? technologiesByVehicle.get(rightVehicle.id)?.size || 0 : ''], ['证据数量', leftVehicle ? evidenceByVehicle.get(leftVehicle.id)?.length || 0 : '', rightVehicle ? evidenceByVehicle.get(rightVehicle.id)?.length || 0 : '']];

  return <div className="w-full relative">
    <div className="flex items-center justify-between mb-4 px-1"><div className="flex items-center gap-3"><div className="w-1 h-4 bg-cyan-400 rounded-full" /><h3 className="text-xs font-black text-white/50 tracking-[0.2em]">竞品库工作台</h3><span className="text-[10px] text-white/25">人工维护 / 审核 / 对比</span><div className="ml-2 flex rounded-lg bg-white/5 border border-white/10 p-1"><button onClick={() => setWorkspace('data')} className={`px-3 py-1 rounded text-[10px] font-bold ${workspace === 'data' ? 'bg-cyan-500/20 text-cyan-100' : 'text-white/35 hover:text-white/70'}`}>数据工作台</button><button onClick={() => setWorkspace('review')} className={`px-3 py-1 rounded text-[10px] font-bold ${workspace === 'review' ? 'bg-cyan-500/20 text-cyan-100' : 'text-white/35 hover:text-white/70'}`}>审核中心</button></div></div><div className="flex items-center gap-2"><Button variant="ghost" size="sm" onClick={loadData} disabled={isLoading}><RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />刷新</Button><Button size="sm" onClick={seedData} disabled={isSeeding}>{isSeeding ? <Loader2 size={13} className="animate-spin" /> : <Database size={13} />}初始化示例数据</Button></div></div>
    {workspace === 'review' ? <CompetitorReviewPanel vehicles={vehicles} technologies={technologies} onDataChanged={loadData} /> : <>
    <GlassCard className="mb-4 px-4 py-3 border-white/10 flex flex-col md:flex-row md:items-center gap-3"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"><FileSpreadsheet size={17} className="text-emerald-300" /></div><div><div className="text-xs font-bold text-white/75">Excel 配置表导入</div><div className="text-[10px] text-white/30 mt-0.5">上传后先预览字段与数据，确认后再写入竞品库</div></div></div><div className="md:ml-auto flex items-center gap-2"><Button variant="ghost" size="sm" onClick={downloadTemplate}><Download size={14} />下载标准模板</Button><Button size="sm" onClick={() => setExcelImportOpen(true)}><FileSpreadsheet size={14} />Excel 导入</Button></div></GlassCard>
    <GlassCard className="mb-4 px-4 py-3 border-white/10 flex flex-col md:flex-row md:items-center gap-3"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center"><BookOpen size={17} className="text-cyan-300" /></div><div><div className="text-xs font-bold text-white/75">文本资料导入</div><div className="text-[10px] text-white/30 mt-0.5">粘贴文本或上传 TXT，查看原文并手工绑定证据</div></div></div><Button size="sm" className="md:ml-auto" onClick={() => { setTextSourceTarget(null); setTextSourceOpen(true); }}><BookOpen size={14} />文本资料</Button></GlassCard>
    {error && <GlassCard className="mb-4 px-4 py-3 border border-rose-500/30 text-rose-300 text-xs">{error}</GlassCard>}
    {isLoading ? <div className="h-56 flex items-center justify-center"><Loader2 size={28} className="text-violet-500 animate-spin" /></div> : !hasData ? <EmptyState onSeed={seedData} isSeeding={isSeeding} /> : <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><StatCard label="车型数量" value={vehicles.length} icon={<Layers size={17} />} /><StatCard label="技术点数量" value={technologies.length} icon={<Wrench size={17} />} /><StatCard label="证据数量" value={evidence.length} icon={<FileText size={17} />} /></div>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr_1.2fr] gap-6 auto-rows-[430px]">
        <GlassCard className="h-full flex flex-col overflow-hidden border-white/10"><div className="px-4 py-3 border-b border-white/10 flex items-center gap-2"><Layers size={15} className="text-cyan-300" /><div className="text-[11px] font-black tracking-widest text-white/80">车型库</div><button onClick={() => setModal({ type: 'vehicle' })} className="ml-auto text-[10px] text-cyan-200 hover:text-cyan-100 flex items-center gap-1"><Plus size={12} />新增车型</button></div><div className="p-3 border-b border-white/10"><label className="flex items-center gap-2 bg-white/5 border border-white/10 rounded px-2 py-1.5"><Search size={12} className="text-white/30" /><input value={vehicleSearch} onChange={(e) => setVehicleSearch(e.target.value)} placeholder="搜索品牌/车型" className="bg-transparent outline-none text-xs text-white placeholder-white/25 flex-1" /></label></div><div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-white/5">{filteredVehicles.map((vehicle) => <div key={vehicle.id} className={`px-4 py-3 hover:bg-white/[0.04] transition-colors ${selectedVehicleId === vehicle.id ? 'bg-cyan-500/[0.08]' : ''}`}><button onClick={() => openVehicleDetail(vehicle)} className="w-full text-left"><div className="flex items-start justify-between gap-3"><div><div className="text-sm font-bold text-white/90">{getVehicleName(vehicle)}</div><div className="mt-1 flex flex-wrap gap-1.5"><span className="px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-200 text-[10px]">{vehicle.energy_type || 'NA'}</span><span className="px-1.5 py-0.5 rounded bg-white/5 text-white/45 text-[10px]">{vehicle.market_segment || '未分级'}</span></div></div><div className="text-right shrink-0"><div className="text-[10px] text-white/30">指导价</div><div className="text-xs font-mono text-emerald-300">{formatPrice(vehicle.base_price)}</div></div></div></button><button onClick={() => setModal({ type: 'vehicle', initial: vehicle })} className="mt-2 text-[10px] text-white/35 hover:text-cyan-200 flex items-center gap-1"><Edit3 size={11} />编辑</button></div>)}</div></GlassCard>
        <GlassCard className="h-full flex flex-col overflow-hidden border-white/10"><div className="px-4 py-3 border-b border-white/10 flex items-center gap-2"><Wrench size={15} className="text-violet-300" /><div className="text-[11px] font-black tracking-widest text-white/80">技术点库</div><button onClick={() => setModal({ type: 'technology' })} className="ml-auto text-[10px] text-violet-200 hover:text-violet-100 flex items-center gap-1"><Plus size={12} />新增技术点</button></div><div className="p-3 border-b border-white/10"><label className="flex items-center gap-2 bg-white/5 border border-white/10 rounded px-2 py-1.5"><Search size={12} className="text-white/30" /><input value={technologySearch} onChange={(e) => setTechnologySearch(e.target.value)} placeholder="搜索名称/类别" className="bg-transparent outline-none text-xs text-white placeholder-white/25 flex-1" /></label></div><div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-white/5">{filteredTechnologies.map((tech) => <div key={tech.id} className={`px-4 py-3 hover:bg-white/[0.04] transition-colors ${selectedTechnologyId === tech.id ? 'bg-violet-500/[0.08]' : ''}`}><button onClick={() => { setSelectedTechnologyId(tech.id); setSelectedVehicleId(''); }} className="w-full text-left"><div className="flex items-center gap-2"><div className="text-sm font-bold text-white/90 truncate">{tech.name}</div><span className="ml-auto px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-200 text-[10px] shrink-0">{maturityLabel[tech.maturity_level] || tech.maturity_level}</span></div><div className="mt-1 text-[10px] text-cyan-200/70">{categoryLabel[tech.category] || tech.category}</div><div className="mt-2 text-[11px] text-white/45 leading-relaxed line-clamp-2">{tech.description || '暂无说明'}</div></button><button onClick={() => setModal({ type: 'technology', initial: tech })} className="mt-2 text-[10px] text-white/35 hover:text-violet-200 flex items-center gap-1"><Edit3 size={11} />编辑</button></div>)}</div><div className="px-4 py-3 border-t border-white/10 bg-black/10"><div className="text-[10px] text-white/35 font-bold mb-2">技术点反查车型</div>{selectedTechnologyId ? selectedTechnologyVehicles.length > 0 ? <div className="flex flex-wrap gap-1.5">{selectedTechnologyVehicles.map((vehicle) => <span key={vehicle.id} className="px-2 py-1 rounded bg-white/5 text-cyan-100 text-[10px]">{getVehicleName(vehicle)}</span>)}</div> : <div className="text-[10px] text-white/25">暂无关联车型</div> : <div className="text-[10px] text-white/25">点击技术点后显示关联车型</div>}</div></GlassCard>
        <GlassCard className="h-full flex flex-col overflow-hidden border-white/10"><div className="px-4 py-3 border-b border-white/10 flex items-center gap-2"><FileText size={15} className="text-amber-300" /><div className="text-[11px] font-black tracking-widest text-white/80">证据链</div><div className="ml-auto text-[10px] text-white/30">{filteredEvidence.length} / {evidence.length} 条</div><button onClick={() => setModal({ type: 'evidence' })} className="text-[10px] text-amber-200 hover:text-amber-100 flex items-center gap-1"><Plus size={12} />新增证据</button></div><div className="px-4 py-3 border-b border-white/10 bg-black/10"><div className="flex items-center gap-2 mb-2 text-[10px] text-white/35 font-bold"><Filter size={12} />筛选与搜索</div><label className="mb-2 flex items-center gap-2 bg-white/5 border border-white/10 rounded px-2 py-1.5"><Search size={12} className="text-white/30" /><input value={evidenceSearch} onChange={(e) => setEvidenceSearch(e.target.value)} placeholder="搜索证据文本" className="bg-transparent outline-none text-xs text-white placeholder-white/25 flex-1" /></label><div className="grid grid-cols-1 md:grid-cols-3 gap-2"><select value={selectedVehicleId} onChange={(e) => setSelectedVehicleId(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-[11px] text-white"><option value="">全部车型</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{getVehicleName(vehicle)}</option>)}</select><select value={selectedTechnologyId} onChange={(e) => setSelectedTechnologyId(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-[11px] text-white"><option value="">全部技术点</option>{technologies.map((tech) => <option key={tech.id} value={tech.id}>{tech.name}</option>)}</select><select value={selectedSourceType} onChange={(e) => setSelectedSourceType(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-[11px] text-white"><option value="">全部来源</option>{sourceTypes.map((type) => <option key={type} value={type}>{sourceTypeLabel[type] || type}</option>)}</select></div>{(selectedVehicleId || selectedTechnologyId || selectedSourceType || evidenceSearch) && <button onClick={clearFilters} className="mt-2 text-[10px] text-cyan-200 hover:text-cyan-100 flex items-center gap-1"><SlidersHorizontal size={11} />清空筛选</button>}</div><div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-white/5">{filteredEvidence.length === 0 ? <div className="p-8 text-center text-white/20 text-[11px]">当前筛选无证据</div> : filteredEvidence.map((item) => <button key={item.id} onClick={() => openEvidenceDetail(item)} className="w-full text-left px-4 py-3 hover:bg-white/[0.03] transition-colors"><div className="text-[11px] text-white/75 leading-relaxed">{item.evidence_text}</div><div className="mt-2 flex flex-wrap gap-1.5"><span className="px-1.5 py-0.5 rounded bg-white/5 text-white/45 text-[10px]">{sourceTypeLabel[item.source_document?.source_type] || item.source_document?.source_type || '未知来源'}</span><span className="px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-200 text-[10px]">{getVehicleName(item.vehicle)}</span><span className="px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-200 text-[10px]">{getTechnologyName(item.technology)}</span></div><div className="mt-2 flex justify-between text-[9px] text-white/25 font-mono"><span>{item.page_or_time || 'NA'}</span><span>置信度 {(Number(item.confidence || 0) * 100).toFixed(0)}%</span></div></button>)}</div></GlassCard>
      </div>
      <GlassCard className="border-white/10 overflow-hidden"><div className="px-4 py-3 border-b border-white/10 flex items-center gap-2"><ArrowRightLeft size={15} className="text-emerald-300" /><div className="text-[11px] font-black tracking-widest text-white/80">车型对比</div></div><div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 border-b border-white/10"><select value={compareLeftId} onChange={(e) => setCompareLeftId(e.target.value)} className="bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white"><option value="">选择车型 A</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{getVehicleName(vehicle)}</option>)}</select><select value={compareRightId} onChange={(e) => setCompareRightId(e.target.value)} className="bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white"><option value="">选择车型 B</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{getVehicleName(vehicle)}</option>)}</select></div><div className="overflow-x-auto"><table className="w-full text-left text-[11px]"><thead className="bg-white/5 text-white/45"><tr><th className="px-4 py-2 w-[160px]">字段</th><th className="px-4 py-2">车型 A</th><th className="px-4 py-2">车型 B</th></tr></thead><tbody className="divide-y divide-white/5">{comparisonRows.map(([label, left, right]) => <tr key={String(label)} className="align-top"><td className="px-4 py-2 text-white/40 font-bold">{label}</td><td className="px-4 py-2 text-white/75 font-mono break-all">{left || '请选择'}</td><td className="px-4 py-2 text-white/75 font-mono break-all">{right || '请选择'}</td></tr>)}</tbody></table></div></GlassCard>
    </div>}
    {isDetailLoading && <div className="fixed right-6 top-24 z-[95] text-xs text-cyan-200 bg-black/60 px-3 py-2 rounded border border-white/10">车型详情加载中...</div>}
    <VehicleDetailDrawer vehicle={detailVehicle} onClose={() => setDetailVehicle(null)} onEdit={(vehicle) => setModal({ type: 'vehicle', initial: vehicle })} />
    <EvidenceDetailDrawer evidence={detailEvidence} onClose={() => setDetailEvidence(null)} onViewSource={(sourceId) => { setDetailEvidence(null); setTextSourceTarget(sourceId); setTextSourceOpen(true); }} />
    {modal && <MaintenanceModal type={modal.type} initial={modal.initial} vehicles={vehicles} technologies={technologies} onClose={() => setModal(null)} onSave={saveModal} />}
    {excelImportOpen && <ExcelImportModal onClose={() => setExcelImportOpen(false)} onImported={loadData} />}
    {textSourceOpen && <TextSourceModal vehicles={vehicles} technologies={technologies} initialSourceId={textSourceTarget} onClose={() => setTextSourceOpen(false)} onEvidenceCreated={loadData} />}
    </>}
  </div>;
};
