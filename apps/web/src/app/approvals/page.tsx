'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import AccessDenied from '@/components/common/AccessDenied';
import ProjectQuickPreviewModal from '@/components/approvals/ProjectQuickPreviewModal';
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  RotateCcw,
  X,
  Eye,
  FileText,
  AlertCircle,
  Sparkles,
  Search,
  Filter,
  Shield,
  Layers,
  Building,
  UserCheck,
  ChevronRight,
  History,
  GitBranch,
  ListChecks,
  Check,
  Send,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';

export default function ApprovalsPage() {
  const { user, token } = useAuth();
  const { collegeName } = useSettings();

  // Protect route (Only for roles with approval authority)
  const isApprover = user && ['HEAD_DEPT', 'DEPUTY_DIRECTOR', 'PLANNING_OFFICER', 'DIRECTOR', 'ADMIN'].includes(user.role);
  if (user && !isApprover) {
    return <AccessDenied allowedRoles={['หัวหน้าแผนก/งาน', 'รอง ผอ.', 'งานแผนงาน', 'ผอ.วิทยาลัย', 'ผู้ดูแลระบบ']} />;
  }

  // Active top tab
  const [currentTab, setCurrentTab] = useState<'inbox' | 'history' | 'routing'>('inbox');

  // Inbox state
  const [inbox, setInbox] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStep, setFilterStep] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // History state
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Routing flow state
  const [routingData, setRoutingData] = useState<{ divisions: any[]; approvers: any[] }>({ divisions: [], approvers: [] });
  const [loadingRouting, setLoadingRouting] = useState(false);

  // Pipeline stats
  const [pipelineStats, setPipelineStats] = useState<any>(null);

  // Multi-select for Batch Actions
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Single / Batch Action modal
  const [selectedApproval, setSelectedApproval] = useState<any>(null);
  const [batchActionType, setBatchActionType] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REVISE' | 'REJECT' | null>(null);
  const [comment, setComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Quick preview drawer modal
  const [previewProject, setPreviewProject] = useState<{ project: any; step: number; approvalId: number } | null>(null);

  useEffect(() => {
    fetchInbox();
    fetchStats();
  }, [token]);

  useEffect(() => {
    if (currentTab === 'history') {
      fetchHistory();
    } else if (currentTab === 'routing') {
      fetchRouting();
    }
  }, [currentTab, token]);

  const fetchInbox = async () => {
    setLoading(true);
    try {
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/v1/approvals/inbox', { headers });
      const data = await res.json();
      if (data.success) {
        setInbox(data.data);
      }
    } catch (e) {
      console.error('Failed to load approvals inbox', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/v1/approvals/history', { headers });
      const data = await res.json();
      if (data.success) {
        setHistoryList(data.data);
      }
    } catch (e) {
      console.error('Failed to load approvals history', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchStats = async () => {
    try {
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/v1/approvals/pipeline-stats', { headers });
      const data = await res.json();
      if (data.success) {
        setPipelineStats(data.data);
      }
    } catch (e) {
      console.error('Failed to load pipeline stats', e);
    }
  };

  const fetchRouting = async () => {
    setLoadingRouting(true);
    try {
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/v1/approvals/routing-flow', { headers });
      const data = await res.json();
      if (data.success) {
        setRoutingData(data.data);
      }
    } catch (e) {
      console.error('Failed to load routing flow', e);
    } finally {
      setLoadingRouting(false);
    }
  };

  const handleAction = async () => {
    if (!selectedApproval || !actionType) return;
    setIsProcessing(true);

    try {
      const res = await fetch(`/api/v1/approvals/${selectedApproval.id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: actionType,
          comment,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setMsg({ type: 'success', text: data.message });
      setSelectedApproval(null);
      setActionType(null);
      setComment('');
      setSelectedIds(prev => prev.filter(id => id !== Number(selectedApproval.id)));
      fetchInbox();
      fetchStats();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'เกิดข้อผิดพลาด' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBatchAction = async () => {
    if (selectedIds.length === 0 || !batchActionType) return;
    setIsProcessing(true);

    try {
      const res = await fetch('/api/v1/approvals/batch-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          approval_ids: selectedIds,
          action: batchActionType,
          comment,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setMsg({ type: 'success', text: data.message });
      setBatchActionType(null);
      setSelectedIds([]);
      setComment('');
      fetchInbox();
      fetchStats();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'เกิดข้อผิดพลาดในการประมวลผลกลุ่ม' });
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredInbox.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredInbox.map(item => Number(item.id)));
    }
  };

  const toggleSelectItem = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const getQuickComments = (step: number, action: 'APPROVE' | 'REVISE' | 'REJECT') => {
    if (action === 'APPROVE') {
      switch (step) {
        case 1:
          return ['เห็นชอบตามเสนอ สมควรดำเนินการ', 'สอดคล้องกับแผนปฏิบัติงานของแผนกวิชา/งาน', 'ตรวจสอบรายละเอียดครบถ้วน'];
        case 2:
          return ['เห็นชอบตามเสนอ เพื่อโปรดพิจารณาอนุมัติ', 'สอดคล้องกับยุทธศาสตร์ประจำฝ่าย', 'เห็นควรส่งต่องานวางแผนและงบประมาณ'];
        case 3:
          return ['ตรวจสอบงบประมาณถูกต้อง ตามแผนปฏิบัติราชการ ออกรหัสโครงการเรียบร้อย', 'อยู่ในกรอบงบประมาณที่จัดสรร', 'ตรวจสอบรายการค่าใช้จ่ายถูกต้องตามระเบียบ'];
        case 4:
          return ['อนุมัติให้ดำเนินโครงการตามที่เสนอ', 'อนุมัติ และมอบหมายผู้รับผิดชอบดำเนินการตามแผน', 'อนุมัติ'];
        default:
          return ['อนุมัติเห็นชอบ'];
      }
    } else if (action === 'REVISE') {
      return [
        'ขอให้ปรับปรุงรายละเอียดค่าใช้จ่ายในตารางงบประมาณเพิ่มเติม',
        'ขอให้ระบุเป้าหมายเชิงปริมาณและคุณภาพให้ชัดเจนยิ่งขึ้น',
        'ขอให้ปรับแก้กำหนดการและกิจกรรมตามกระบวนการ PDCA',
      ];
    } else {
      return [
        'ไม่อนุมัติ เนื่องจากงบประมาณไม่เพียงพอ',
        'ไม่อนุมัติ เนื่องจากกิจกรรมไม่สอดคล้องกับยุทธศาสตร์หลัก',
        'ไม่อนุมัติโครงการ',
      ];
    }
  };

  const getStepTitle = (step: number) => {
    switch (step) {
      case 1:
        return 'ขั้นที่ ๑: หัวหน้าแผนกวิชา/งานเห็นชอบ';
      case 2:
        return 'ขั้นที่ ๒: รองผู้อำนวยการประจำฝ่ายพิจารณา';
      case 3:
        return 'ขั้นที่ ๓: งานวางแผนและงบประมาณตรวจสอบ & ออกรหัสโครงการ';
      case 4:
        return 'ขั้นที่ ๔: ผู้อำนวยการสถานศึกษาอนุมัติ';
      default:
        return `ขั้นที่ ${step}`;
    }
  };

  const formatThaiDate = (dateStr: string | Date | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} น.`;
  };

  const filteredInbox = inbox.filter((item) => {
    if (filterStep !== 'ALL' && item.step_order !== filterStep) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const title = item.project?.title?.toLowerCase() || '';
      const leader = item.project?.leader?.full_name?.toLowerCase() || '';
      const dept = item.project?.department?.name?.toLowerCase() || '';
      const div = item.project?.department?.division?.name?.toLowerCase() || '';
      if (!title.includes(q) && !leader.includes(q) && !dept.includes(q) && !div.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-theme bg-theme-primary text-white flex items-center justify-center shadow-sm">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">ศูนย์พิจารณาและอนุมัติโครงการ</h1>
              <p className="text-xs sm:text-sm text-slate-500">
                ระบบสายการอนุมัติ ๔ ขั้นตอนตามระเบียบสารบรรณ {collegeName}
              </p>
            </div>
          </div>
        </div>

        {user && (
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-theme bg-theme-primary-light border border-theme-primary/20 text-xs font-semibold text-theme-primary flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-theme-primary" />
              <span>บทบาท: {user.position || user.role} ({user.full_name})</span>
            </div>
            <span className="px-2.5 py-1.5 rounded-theme bg-theme-primary text-white text-xs font-bold shadow-xs">
              รอพิจารณา {inbox.length} รายการ
            </span>
          </div>
        )}
      </div>

      {msg && (
        <div
          className={`p-3.5 rounded-theme border text-xs font-medium flex items-center justify-between animate-in fade-in ${
            msg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{msg.text}</span>
          </div>
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Mode Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-0.5">
        <button
          onClick={() => setCurrentTab('inbox')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs sm:text-sm font-bold transition rounded-t-theme ${
            currentTab === 'inbox'
              ? 'border-theme-primary text-theme-primary bg-theme-primary-light'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ListChecks className="w-4 h-4" />
          <span>รายการรอพิจารณา</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] ${currentTab === 'inbox' ? 'bg-theme-primary text-white' : 'bg-slate-200 text-slate-700'}`}>
            {inbox.length}
          </span>
        </button>

        <button
          onClick={() => setCurrentTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs sm:text-sm font-bold transition rounded-t-theme ${
            currentTab === 'history'
              ? 'border-theme-primary text-theme-primary bg-theme-primary-light'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          <span>ประวัติที่พิจารณาแล้ว</span>
          {historyList.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-200 text-slate-700">
              {historyList.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setCurrentTab('routing')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs sm:text-sm font-bold transition rounded-t-theme ${
            currentTab === 'routing'
              ? 'border-theme-primary text-theme-primary bg-theme-primary-light'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <GitBranch className="w-4 h-4" />
          <span>สายการอนุมัติ & สิทธิ์ประจำฝ่าย</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: INBOX */}
      {/* ======================================================== */}
      {currentTab === 'inbox' && (
        <div className="space-y-4">
          {/* 4-Step Overview Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { step: 1, label: '๑. หัวหน้าแผนก/งาน', desc: 'เห็นชอบขั้นต้น', count: pipelineStats?.step1Count },
              { step: 2, label: '๒. รอง ผอ. ประจำฝ่าย', desc: 'พิจารณากลั่นกรอง', count: pipelineStats?.step2Count },
              { step: 3, label: '๓. งานแผนงานฯ', desc: 'ตรวจงบ & ออกรหัส', count: pipelineStats?.step3Count },
              { step: 4, label: '๔. ผู้อำนวยการ', desc: 'อนุมัติโครงการ', count: pipelineStats?.step4Count },
            ].map((s) => {
              const count = inbox.filter((i) => i.step_order === s.step).length;
              const isActive = filterStep === s.step;
              return (
                <button
                  key={s.step}
                  onClick={() => setFilterStep(isActive ? 'ALL' : s.step)}
                  className={`p-3.5 rounded-theme border text-left transition shadow-2xs relative ${
                    isActive
                      ? 'bg-theme-primary text-white border-theme-primary shadow-sm'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-theme-primary'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
                      {s.label}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        count > 0
                          ? isActive
                            ? 'bg-amber-400 text-blue-950 font-black'
                            : 'bg-amber-100 text-amber-900'
                          : isActive
                          ? 'bg-blue-800 text-blue-200'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {count} รายการ
                    </span>
                  </div>
                  <p className={`text-[11px] ${isActive ? 'text-blue-100' : 'text-slate-600'}`}>{s.desc}</p>
                </button>
              );
            })}
          </div>

          {/* Search & Batch Toolbar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-[240px]">
              {filteredInbox.length > 0 && (
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 pr-2 border-r border-slate-200">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredInbox.length && filteredInbox.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded text-blue-900 focus:ring-blue-900"
                  />
                  <span>เลือกทั้งหมด ({filteredInbox.length})</span>
                </label>
              )}

              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่อโครงการ, ผู้เสนอ, แผนกวิชา, ฝ่าย..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {filterStep !== 'ALL' && (
                <button
                  onClick={() => setFilterStep('ALL')}
                  className="text-xs text-blue-900 font-semibold hover:underline flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> ล้างตัวกรอง
                </button>
              )}
              <span className="text-xs text-slate-500">
                แสดง {filteredInbox.length} จาก {inbox.length} รายการ
              </span>
            </div>
          </div>

          {/* Inbox List */}
          {loading ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
              <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full mb-2"></div>
              <p className="text-xs">กำลังโหลดคิวงานพิจารณา...</p>
            </div>
          ) : filteredInbox.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200 space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="font-bold text-slate-800 text-base">ไม่มีรายการที่รอการพิจารณาในขณะนี้</h3>
              <p className="text-xs text-slate-500">
                โครงการทั้งหมดได้รับการพิจารณาเรียบร้อยแล้ว หรือยังไม่มีโครงการใหม่ที่ส่งถึงขั้นตอนนี้
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredInbox.map((item) => {
                const prj = item.project;
                const isChecked = selectedIds.includes(Number(item.id));
                return (
                  <div
                    key={item.id}
                    className={`bg-white p-4 sm:p-5 rounded-xl border transition space-y-3 ${
                      isChecked
                        ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md bg-blue-50/20'
                        : 'border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        {/* Checkbox */}
                        <div className="pt-1">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectItem(Number(item.id))}
                            className="w-4 h-4 rounded text-blue-900 focus:ring-blue-900"
                          />
                        </div>

                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                              {getStepTitle(item.step_order)}
                            </span>
                            <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                              {prj?.department?.name} ({prj?.department?.division?.name})
                            </span>
                            {prj?.project_code && (
                              <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {prj.project_code}
                              </span>
                            )}
                          </div>

                          <h3 className="text-base font-bold text-slate-900 hover:text-blue-900">
                            <Link href={`/projects/${prj?.id}`}>{prj?.title}</Link>
                          </h3>

                          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-0.5">
                            <div>
                              <span className="text-slate-400">ผู้เสนอ:</span>{' '}
                              <span className="font-medium text-slate-800">{prj?.leader?.full_name} ({prj?.leader?.position || 'ครู'})</span>
                            </div>
                            <div>
                              <span className="text-slate-400">งบประมาณ:</span>{' '}
                              <span className="font-bold text-blue-900">
                                {Number(prj?.total_budget).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400">ปีงบประมาณ:</span>{' '}
                              <span className="font-medium">{prj?.fiscal_year}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 self-end md:self-center">
                        <button
                          onClick={() => setPreviewProject({ project: prj, step: item.step_order, approvalId: Number(item.id) })}
                          className="px-3 py-2 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5"
                          title="ดูสรุปโครงการแบบเร่งด่วน"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>ดูสรุป</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedApproval(item);
                            setActionType('APPROVE');
                            setComment(getQuickComments(item.step_order, 'APPROVE')[0]);
                          }}
                          className="px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>อนุมัติ / เห็นชอบ</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedApproval(item);
                            setActionType('REVISE');
                            setComment(getQuickComments(item.step_order, 'REVISE')[0]);
                          }}
                          className="px-3 py-2 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-500 text-white shadow-xs transition flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>ขอแก้ไข</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedApproval(item);
                            setActionType('REJECT');
                            setComment(getQuickComments(item.step_order, 'REJECT')[0]);
                          }}
                          className="px-3 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition flex items-center gap-1.5"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>ไม่อนุมัติ</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: APPROVAL HISTORY */}
      {/* ======================================================== */}
      {currentTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-blue-900" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm">ประวัติการพิจารณาและลงนาม</h3>
                <p className="text-[11px] text-slate-500">บันทึกผลการพิจารณา คำสั่งการ และข้อคิดเห็นย้อนหลัง</p>
              </div>
            </div>
            <button
              onClick={fetchHistory}
              className="text-xs font-semibold text-blue-900 hover:underline"
            >
              รีเฟรชข้อมูล
            </button>
          </div>

          {loadingHistory ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
              <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full mb-2"></div>
              <p className="text-xs">กำลังโหลดประวัติการพิจารณา...</p>
            </div>
          ) : historyList.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-500">
              <p className="text-sm">ยังไม่มีประวัติการพิจารณาที่บันทึกไว้</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-3 px-4 w-12 text-center">ลำดับ</th>
                      <th className="py-3 px-4">โครงการ</th>
                      <th className="py-3 px-4">ขั้นตอน / สังกัด</th>
                      <th className="py-3 px-4">ผลการพิจารณา</th>
                      <th className="py-3 px-4">วันที่ลงนาม</th>
                      <th className="py-3 px-4">ข้อคิดเห็น / คำสั่งการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historyList.map((h, idx) => {
                      const prj = h.project;
                      const isApproved = h.status === 'APPROVED';
                      const isRevision = h.status === 'REVISION_REQUESTED';
                      const isRejected = h.status === 'REJECTED';

                      return (
                        <tr key={h.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 text-center text-slate-400 font-bold">{idx + 1}</td>
                          <td className="py-3 px-4 font-medium text-slate-900 max-w-xs">
                            <Link href={`/projects/${prj?.id}`} className="hover:text-blue-900 font-bold block truncate">
                              {prj?.title}
                            </Link>
                            <span className="text-[11px] text-slate-500">
                              ผู้เสนอ: {prj?.leader?.full_name} • งบ {Number(prj?.total_budget || 0).toLocaleString('th-TH')} บ.
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            <span className="font-bold text-slate-800 block">{getStepTitle(h.step_order)}</span>
                            <span className="text-[11px] text-slate-400">{prj?.department?.name}</span>
                          </td>
                          <td className="py-3 px-4">
                            {isApproved && (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> อนุมัติเห็นชอบ
                              </span>
                            )}
                            {isRevision && (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                                <RotateCcw className="w-3 h-3" /> ส่งคำขอแก้ไข
                              </span>
                            )}
                            {isRejected && (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200 inline-flex items-center gap-1">
                                <X className="w-3 h-3" /> ไม่อนุมัติ
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                            {formatThaiDate(h.signed_at || h.updated_at)}
                          </td>
                          <td className="py-3 px-4 text-slate-700 italic max-w-sm">
                            "{h.comment || '-'}"
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: ROUTING & FLOW OVERVIEW */}
      {/* ======================================================== */}
      {currentTab === 'routing' && (
        <div className="space-y-6">
          {/* Visual Pipeline Diagram */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-blue-900" />
                ผังกระบวนการสายการอนุมัติ ๔ ขั้นตอน (Approval Workflow)
              </h3>
              <p className="text-xs text-slate-500">
                ระบบจัดการเส้นทางเอกสารและการแจ้งเตือนตามบทบาทหน้าที่ราชการ
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
              {[
                {
                  step: 1,
                  role: 'หัวหน้าแผนกวิชา / หัวหน้างาน',
                  desc: 'ตรวจสอบความถูกต้อง ความสอดคล้องกับแผนกวิชา และเห็นชอบเบื้องต้น',
                  color: 'from-blue-600 to-indigo-700',
                },
                {
                  step: 2,
                  role: 'รองผู้อำนวยการประจำฝ่าย',
                  desc: 'พิจารณากลั่นกรองตามยุทธศาสตร์ของแต่ละฝ่าย (วิชาการ, พัฒนากิจการฯ, บริหารฯ, แผนงานฯ)',
                  color: 'from-indigo-600 to-violet-700',
                },
                {
                  step: 3,
                  role: 'งานวางแผนและงบประมาณ',
                  desc: 'ตรวจสอบกรอบวงเงินงบประมาณ ความสอดคล้องกับแผนปฏิบัติราชการ และออกรหัสโครงการ',
                  color: 'from-amber-600 to-orange-700',
                },
                {
                  step: 4,
                  role: 'ผู้อำนวยการสถานศึกษา',
                  desc: 'ลงนามอนุมัติโครงการขั้นสุดท้ายเพื่อจัดสรรงบและเริ่มดำเนินกิจกรรม',
                  color: 'from-emerald-600 to-teal-700',
                },
              ].map((s, idx) => (
                <div key={s.step} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 relative">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${s.color} text-white flex items-center justify-center font-bold text-xs shadow-xs`}>
                    {s.step}
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs">{s.role}</h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Division & Deputy Routing Table */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-5 h-5 text-blue-900" />
              การจัดสายการอนุมัติตามฝ่ายสังกัด (Division Routing Matrix)
            </h3>

            {loadingRouting ? (
              <div className="p-8 text-center text-slate-400">
                <div className="animate-spin inline-block w-6 h-6 border-2 border-blue-900 border-t-transparent rounded-full mb-1"></div>
                <p className="text-xs">กำลังโหลดข้อมูลฝ่ายและสิทธิ์...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {routingData.divisions.map((div: any) => {
                  const deputy = routingData.approvers.find(
                    (a: any) => a.role === 'DEPUTY_DIRECTOR' && a.department_id === div.id
                  );
                  return (
                    <div key={div.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{div.name}</h4>
                          <p className="text-[11px] text-slate-500">รหัสฝ่าย: {div.code}</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 text-[11px] font-bold">
                          {div.departments?.length || 0} แผนก/งาน
                        </span>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-slate-500">แผนกวิชา / งานในสังกัด:</span>
                        <div className="flex flex-wrap gap-1">
                          {(div.departments || []).map((dept: any) => (
                            <span key={dept.id} className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[11px] text-slate-700 font-medium">
                              {dept.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* FLOATING BATCH ACTIONS BAR */}
      {/* ======================================================== */}
      {selectedIds.length > 0 && currentTab === 'inbox' && (
        <div className="fixed bottom-6 inset-x-0 z-40 flex justify-center px-4 animate-in slide-in-from-bottom-5">
          <div className="bg-slate-900 text-white px-6 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 max-w-2xl w-full justify-between">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-xs">
                {selectedIds.length}
              </span>
              <div>
                <p className="text-xs font-bold">เลือก {selectedIds.length} โครงการ</p>
                <p className="text-[11px] text-slate-400">อนุมัติพร้อมกันในคลิกเดียว</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedIds([])}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                ยกเลิก
              </button>

              <button
                onClick={() => {
                  setBatchActionType('REJECT');
                  setComment('ไม่อนุมัติโครงการ');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>ไม่อนุมัติ ({selectedIds.length})</span>
              </button>

              <button
                onClick={() => {
                  setBatchActionType('APPROVE');
                  setComment('อนุมัติเห็นชอบตามเสนอ');
                }}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>อนุมัติที่เลือก ({selectedIds.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* QUICK PREVIEW DRAWER MODAL */}
      {/* ======================================================== */}
      {previewProject && (
        <ProjectQuickPreviewModal
          project={previewProject.project}
          approvalStep={previewProject.step}
          onClose={() => setPreviewProject(null)}
          onActionClick={(act) => {
            const item = inbox.find(i => i.id === previewProject.approvalId);
            if (item) {
              setSelectedApproval(item);
              setActionType(act);
              setComment(getQuickComments(item.step_order, act)[0]);
            }
            setPreviewProject(null);
          }}
        />
      )}

      {/* ======================================================== */}
      {/* SINGLE ACTION MODAL */}
      {/* ======================================================== */}
      {actionType && selectedApproval && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    actionType === 'APPROVE'
                      ? 'bg-emerald-100 text-emerald-700'
                      : actionType === 'REVISE'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {actionType === 'APPROVE' && <CheckCircle2 className="w-5 h-5" />}
                  {actionType === 'REVISE' && <RotateCcw className="w-5 h-5" />}
                  {actionType === 'REJECT' && <X className="w-5 h-5" />}
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {actionType === 'APPROVE' && 'ยืนยันการอนุมัติ / เห็นชอบโครงการ'}
                  {actionType === 'REVISE' && 'ส่งคำขอแก้ไขโครงการกลับผู้เสนอ'}
                  {actionType === 'REJECT' && 'ปฏิเสธ / ไม่อนุมัติโครงการ'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setActionType(null);
                  setSelectedApproval(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <p className="text-xs font-bold text-slate-800 truncate">
                {selectedApproval.project?.title}
              </p>
              <p className="text-[11px] text-slate-500">
                {getStepTitle(selectedApproval.step_order)} • งบประมาณ {Number(selectedApproval.project?.total_budget).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ข้อคิดเห็น / คำสั่งการพิจารณา:
              </label>

              {/* Quick Preset Comment Chips */}
              <div className="space-y-1 mb-2">
                <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" /> ข้อความมาตรฐานด่วน (คลิกเลือก):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {getQuickComments(selectedApproval.step_order, actionType).map((text, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setComment(text)}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition text-left ${
                        comment === text
                          ? 'bg-blue-900 text-white border-blue-900'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {text}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="ระบุข้อคิดเห็นหรือคำสั่งการ..."
                rows={3}
                className="w-full text-xs p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setActionType(null);
                  setSelectedApproval(null);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100 transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleAction}
                disabled={isProcessing}
                className={`px-4 py-2 text-xs font-bold rounded-lg text-white shadow-xs transition disabled:opacity-50 flex items-center gap-1.5 ${
                  actionType === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : actionType === 'REVISE'
                    ? 'bg-amber-600 hover:bg-amber-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {isProcessing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <span>ยืนยันบันทึกผล</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* BATCH ACTION CONFIRMATION MODAL */}
      {/* ======================================================== */}
      {batchActionType && selectedIds.length > 0 && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  batchActionType === 'APPROVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {batchActionType === 'APPROVE' ? <CheckCircle2 className="w-5 h-5" /> : <X className="w-5 h-5" />}
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {batchActionType === 'APPROVE' ? 'ยืนยันอนุมัติโครงการพร้อมกัน' : 'ยืนยันปฏิเสธโครงการพร้อมกัน'} ({selectedIds.length} รายการ)
                </h3>
              </div>
              <button
                onClick={() => setBatchActionType(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
              <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                ท่านกำลังจะ{batchActionType === 'APPROVE' ? 'อนุมัติ' : 'ปฏิเสธ'}โครงการจำนวน {selectedIds.length} รายการพร้อมกัน
              </p>
              <p className="text-[11px] text-amber-800">
                ระบบจะส่งผลการพิจารณาและแจ้งเตือนไปยังผู้รับผิดชอบโครงการทุกรายโดยอัตโนมัติ
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ข้อคิดเห็นร่วมสำหรับการดำเนินการกลุ่ม:
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="ระบุข้อคิดเห็น..."
                rows={2}
                className="w-full text-xs p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBatchActionType(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100 transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleBatchAction}
                disabled={isProcessing}
                className={`px-5 py-2 text-xs font-bold rounded-lg text-white shadow-xs transition disabled:opacity-50 flex items-center gap-1.5 ${
                  batchActionType === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {isProcessing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>กำลังดำเนินการ...</span>
                  </>
                ) : (
                  <span>ยืนยันดำเนินการ ({selectedIds.length} รายการ)</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
