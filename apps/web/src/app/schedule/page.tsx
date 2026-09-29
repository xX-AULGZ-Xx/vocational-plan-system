'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import ModalPortal from '@/components/ui/ModalPortal';
import {
  Calendar as CalendarIcon,
  Flag,
  MapPin,
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  CalendarDays,
  Building2,
  FolderKanban,
  X,
  Layers,
  Sparkles,
  Hourglass,
  CheckCircle2,
  AlertCircle,
  Search,
  User,
  Banknote,
  TrendingUp,
  FileText,
  Filter,
  ArrowRight,
  CalendarRange,
} from 'lucide-react';

const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const WEEKDAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

// Helper to format Thai date nicely
const formatThaiDate = (dStr: string | Date | null | undefined) => {
  if (!dStr) return '-';
  const d = typeof dStr === 'string' ? new Date(dStr) : dStr;
  if (isNaN(d.getTime())) return '-';
  const months = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
};

// Helper to extract project duration and execution dates cleanly
function extractProjectDuration(p: any) {
  let minStartMs: number | null = null;
  let maxEndMs: number | null = null;
  let source = 'none';

  const updateRange = (sStr?: string | null, eStr?: string | null, src?: string) => {
    if (sStr) {
      const s = new Date(sStr);
      if (!isNaN(s.getTime())) {
        const ms = s.getTime();
        if (minStartMs === null || ms < minStartMs) {
          minStartMs = ms;
          if (src) source = src;
        }
      }
    }
    const endStr = eStr || sStr;
    if (endStr) {
      const e = new Date(endStr);
      if (!isNaN(e.getTime())) {
        const ms = e.getTime();
        if (maxEndMs === null || ms > maxEndMs) {
          maxEndMs = ms;
          if (src) source = src;
        }
      }
    }
  };

  // 1. Check timelines
  if (Array.isArray(p.timelines) && p.timelines.length > 0) {
    p.timelines.forEach((t: any) => {
      updateRange(t.start_date, t.end_date, 'timelines');
    });
  }

  // 2. Check dynamic_data
  let dyn: any = {};
  if (p.dynamic_data) {
    try {
      dyn = typeof p.dynamic_data === 'string' ? JSON.parse(p.dynamic_data) : p.dynamic_data;
    } catch {}
  }

  // 2.1 Check execution_dates
  if (Array.isArray(dyn?.execution_dates) && dyn.execution_dates.length > 0) {
    dyn.execution_dates.forEach((ed: any) => {
      const sStr = ed.start_date || ed.startDate;
      const eStr = ed.end_date || ed.endDate || sStr;
      updateRange(sStr, eStr, 'execution_dates');
    });
  }

  // 2.2 Check direct start_date / end_date / period in dynamic_data
  if (minStartMs === null || maxEndMs === null) {
    const sStr = dyn?.start_date || dyn?.startDate || dyn?.project_start_date || dyn?.period_start;
    const eStr = dyn?.end_date || dyn?.endDate || dyn?.project_end_date || dyn?.period_end || sStr;
    updateRange(sStr, eStr, 'dynamic_data');
  }

  const startDate = minStartMs !== null ? new Date(minStartMs) : null;
  const endDate = maxEndMs !== null ? new Date(maxEndMs) : null;

  // Calculate duration in days
  let durationDays = 0;
  if (minStartMs !== null && maxEndMs !== null) {
    const diffTime = maxEndMs - minStartMs;
    durationDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
  }

  return {
    startDate,
    endDate,
    startDateStr: startDate ? startDate.toISOString().split('T')[0] : null,
    endDateStr: endDate ? endDate.toISOString().split('T')[0] : null,
    durationDays,
    source,
    hasDates: Boolean(startDate && endDate),
    executionDates: Array.isArray(dyn?.execution_dates) ? dyn.execution_dates : [],
    location: dyn?.execution_status_location || dyn?.location || '',
  };
}

// Helper to determine approval step information
function getProjectApprovalStepInfo(status: string) {
  switch (status) {
    case 'draft':
      return {
        step: 0,
        totalSteps: 4,
        label: 'ฉบับร่าง (ยังไม่ส่ง)',
        fullLabel: 'ฉบับร่าง (ยังไม่ส่งเข้ากระบวนการอนุมัติ)',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
        dotClass: 'bg-slate-400',
        isPending: false,
      };
    case 'submitted':
      return {
        step: 1,
        totalSteps: 4,
        label: 'ขั้นที่ 1: รอหัวหน้าแผนก/งาน',
        fullLabel: 'ขั้นตอนที่ 1/4: รอหัวหน้าแผนก/งานพิจารณาเห็นชอบ',
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
        dotClass: 'bg-amber-500',
        isPending: true,
      };
    case 'dept_approved':
      return {
        step: 2,
        totalSteps: 4,
        label: 'ขั้นที่ 2: รอรอง ผอ. ฝ่าย',
        fullLabel: 'ขั้นตอนที่ 2/4: รอรองผู้อำนวยการฝ่ายพิจารณา',
        badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-300',
        dotClass: 'bg-indigo-500',
        isPending: true,
      };
    case 'deputy_approved':
      return {
        step: 3,
        totalSteps: 4,
        label: 'ขั้นที่ 3: รองานแผนงานตรวจสอบ',
        fullLabel: 'ขั้นตอนที่ 3/4: รอง ผอ. ผ่านแล้ว / รองานแผนงานตรวจสอบ',
        badgeClass: 'bg-blue-100 text-blue-900 border-blue-300',
        dotClass: 'bg-blue-500',
        isPending: true,
      };
    case 'planning_approved':
      return {
        step: 4,
        totalSteps: 4,
        label: 'ขั้นที่ 4: รอ ผอ. ลงนามอนุมัติ',
        fullLabel: 'ขั้นตอนที่ 4/4: งานแผนผ่านแล้ว / รอผู้อำนวยการลงนามอนุมัติ',
        badgeClass: 'bg-purple-100 text-purple-900 border-purple-300',
        dotClass: 'bg-purple-500',
        isPending: true,
      };
    case 'approved':
      return {
        step: 4,
        totalSteps: 4,
        label: 'อนุมัติเรียบร้อย',
        fullLabel: 'อนุมัติเรียบร้อย (พร้อมดำเนินงาน)',
        badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        dotClass: 'bg-emerald-500',
        isPending: false,
      };
    case 'in_progress':
      return {
        step: 4,
        totalSteps: 4,
        label: 'กำลังดำเนินการ',
        fullLabel: 'กำลังดำเนินการตามแผน',
        badgeClass: 'bg-cyan-100 text-cyan-900 border-cyan-300',
        dotClass: 'bg-cyan-500',
        isPending: false,
      };
    case 'completed':
      return {
        step: 4,
        totalSteps: 4,
        label: 'เสร็จสิ้นโครงการ',
        fullLabel: 'เสร็จสิ้นโครงการเรียบร้อย',
        badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        dotClass: 'bg-emerald-600',
        isPending: false,
      };
    case 'revision_requested':
      return {
        step: 0,
        totalSteps: 4,
        label: 'ส่งกลับแก้ไข',
        fullLabel: 'ส่งกลับเพื่อปรับปรุงแก้ไขรายละเอียด',
        badgeClass: 'bg-rose-100 text-rose-900 border-rose-300',
        dotClass: 'bg-rose-500',
        isPending: true,
      };
    case 'rejected':
      return {
        step: 0,
        totalSteps: 4,
        label: 'ไม่อนุมัติ/ยกเลิก',
        fullLabel: 'ไม่อนุมัติหรือยกเลิกโครงการ',
        badgeClass: 'bg-red-100 text-red-900 border-red-300',
        dotClass: 'bg-red-500',
        isPending: false,
      };
    default:
      return {
        step: 0,
        totalSteps: 4,
        label: status || 'ไม่ระบุ',
        fullLabel: status || 'ไม่ระบุสถานะ',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
        dotClass: 'bg-slate-400',
        isPending: false,
      };
  }
}

export default function SchedulePage() {
  const { token, user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Scope Tab: 'approved' | 'proposed' | 'all'
  const [scopeTab, setScopeTab] = useState<'approved' | 'proposed' | 'all'>('approved');

  // View Mode: 'calendar' (Month Grid) or 'list' (Timeline / Gantt Cards)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Calendar Date State (Current Month / Year)
  const [currentDate, setCurrentDate] = useState(() => new Date());

  // Filter States
  const [divisionFilter, setDivisionFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [stepFilter, setStepFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [milestoneOnly, setMilestoneOnly] = useState(false);

  // Selected Activity / Proposed Project for Detail Modal Popup
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);

  useEffect(() => {
    fetchProjects();
    fetchDivisions();
  }, [token]);

  const fetchDivisions = async () => {
    try {
      const res = await fetch('/api/v1/divisions');
      const data = await res.json();
      if (data.success) {
        setDivisions(data.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch divisions:', e);
    }
  };

  const fetchProjects = async () => {
    try {
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/v1/projects', { headers });
      const data = await res.json();
      if (data.success) {
        setProjects(data.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Categorize projects into Approved vs Proposed
  const { approvedProjects, proposedProjects } = useMemo(() => {
    const approved: any[] = [];
    const proposed: any[] = [];

    projects.forEach((p) => {
      const isApproved = ['approved', 'in_progress', 'completed'].includes(p.status);
      const durationInfo = extractProjectDuration(p);
      const stepInfo = getProjectApprovalStepInfo(p.status);

      const enhancedProject = {
        ...p,
        durationInfo,
        stepInfo,
        isApproved,
      };

      if (isApproved) {
        approved.push(enhancedProject);
      } else {
        proposed.push(enhancedProject);
      }
    });

    return { approvedProjects: approved, proposedProjects: proposed };
  }, [projects]);

  // Flatten all activities according to the active scope tab
  const allActivities = useMemo(() => {
    const sourceProjects =
      scopeTab === 'approved'
        ? approvedProjects
        : scopeTab === 'proposed'
        ? proposedProjects
        : [...approvedProjects, ...proposedProjects];

    return sourceProjects.flatMap((p) => {
      const items: any[] = [];
      const divCode = p.department?.division?.code;
      const divName = p.department?.division?.name;
      const deptName = p.department?.name;
      const leaderName = p.leader?.full_name;
      const budget = p.total_budget;
      const isApproved = p.isApproved;

      // 1. Standard project timelines
      (p.timelines || []).forEach((t: any) => {
        const isExec = t.activity_name?.includes('📍') || t.activity_name?.includes('ดำเนินโครงการ');
        items.push({
          ...t,
          project_id: p.id,
          project_title: p.title,
          project_code: p.project_code,
          project_status: p.status,
          is_approved: isApproved,
          step_info: p.stepInfo,
          division_id: p.department?.division_id || p.department?.division?.id,
          division_code: divCode,
          division_name: divName,
          department_id: p.department_id || p.department?.id,
          department_name: deptName,
          leader_name: leaderName,
          total_budget: budget,
          is_execution: isExec,
          is_milestone: Boolean(t.is_milestone) || isExec,
        });
      });

      // 2. Parse dynamic_data execution_dates if not already in timelines
      const dyn = p.durationInfo?.executionDates || [];
      dyn.forEach((ed: any, edIdx: number) => {
        const s = ed.start_date || ed.startDate;
        const e = ed.end_date || ed.endDate || s;
        if (s) {
          const isAlreadyAdded = (p.timelines || []).some(
            (t: any) =>
              (t.activity_name?.includes('ดำเนินโครงการ') || t.activity_name?.includes('📍')) &&
              (typeof t.start_date === 'string' ? t.start_date.startsWith(s) : new Date(t.start_date).toISOString().startsWith(s))
          );
          if (!isAlreadyAdded) {
            items.push({
              id: `exec-${p.id}-${edIdx}`,
              project_id: p.id,
              project_title: p.title,
              project_code: p.project_code,
              project_status: p.status,
              is_approved: isApproved,
              step_info: p.stepInfo,
              activity_name: `📍 การดำเนินโครงการ${dyn.length > 1 ? ` (ช่วงที่ ${edIdx + 1})` : ''}: ${ed.title || p.title}`,
              start_date: s,
              end_date: e,
              location: ed.location || p.durationInfo?.location || '',
              is_execution: true,
              is_milestone: true,
              division_id: p.department?.division_id || p.department?.division?.id,
              division_code: divCode,
              division_name: divName,
              department_id: p.department_id || p.department?.id,
              department_name: deptName,
              leader_name: leaderName,
              total_budget: budget,
            });
          }
        }
      });

      // 3. For proposed projects without timeline records, create a synthesized overall project timeline entry
      if (items.length === 0 && p.durationInfo?.hasDates) {
        items.push({
          id: `proj-duration-${p.id}`,
          project_id: p.id,
          project_title: p.title,
          project_code: p.project_code,
          project_status: p.status,
          is_approved: isApproved,
          step_info: p.stepInfo,
          activity_name: `⏳ ระยะเวลาดำเนินโครงการที่เสนอ: ${p.title}`,
          start_date: p.durationInfo.startDateStr,
          end_date: p.durationInfo.endDateStr,
          location: p.durationInfo.location || '',
          is_execution: true,
          is_milestone: true,
          division_id: p.department?.division_id || p.department?.division?.id,
          division_code: divCode,
          division_name: divName,
          department_id: p.department_id || p.department?.id,
          department_name: deptName,
          leader_name: leaderName,
          total_budget: budget,
        });
      }

      return items;
    }).sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  }, [approvedProjects, proposedProjects, scopeTab]);

  // Departments available for current selected division
  const availableDepartments = useMemo(() => {
    if (divisionFilter === 'ALL') {
      return (divisions || []).reduce((acc: any[], d: any) => [...acc, ...(d.departments || [])], []);
    }
    const matchedDiv = (divisions || []).find((d: any) => d.code === divisionFilter || String(d.id) === divisionFilter);
    return matchedDiv?.departments || [];
  }, [divisions, divisionFilter]);

  // Filtered Proposed Projects list
  const filteredProposedProjects = useMemo(() => {
    return proposedProjects.filter((p) => {
      // Division filter
      if (divisionFilter !== 'ALL') {
        const divCode = p.department?.division?.code;
        const divId = String(p.department?.division_id || p.department?.division?.id);
        if (divCode !== divisionFilter && divId !== divisionFilter) return false;
      }
      // Department filter
      if (departmentFilter !== 'ALL') {
        const deptId = String(p.department_id || p.department?.id);
        if (deptId !== String(departmentFilter)) return false;
      }
      // Step filter
      if (stepFilter !== 'ALL') {
        if (p.status !== stepFilter) return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (p.title || '').toLowerCase().includes(q);
        const matchCode = (p.project_code || '').toLowerCase().includes(q);
        const matchLeader = (p.leader?.full_name || '').toLowerCase().includes(q);
        const matchDept = (p.department?.name || '').toLowerCase().includes(q);
        if (!matchTitle && !matchCode && !matchLeader && !matchDept) return false;
      }
      return true;
    });
  }, [proposedProjects, divisionFilter, departmentFilter, stepFilter, searchQuery]);

  // Filtered activities based on all filters
  const filteredActivities = useMemo(() => {
    return allActivities.filter((act) => {
      if (milestoneOnly && !act.is_milestone) return false;
      if (divisionFilter !== 'ALL') {
        const matchDiv = act.division_code === divisionFilter || String(act.division_id) === divisionFilter;
        if (!matchDiv) return false;
      }
      if (departmentFilter !== 'ALL') {
        if (String(act.department_id) !== String(departmentFilter)) return false;
      }
      if (stepFilter !== 'ALL' && act.project_status !== stepFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (act.project_title || '').toLowerCase().includes(q);
        const matchAct = (act.activity_name || '').toLowerCase().includes(q);
        const matchCode = (act.project_code || '').toLowerCase().includes(q);
        const matchLeader = (act.leader_name || '').toLowerCase().includes(q);
        if (!matchTitle && !matchAct && !matchCode && !matchLeader) return false;
      }
      return true;
    });
  }, [allActivities, divisionFilter, departmentFilter, stepFilter, milestoneOnly, searchQuery]);

  // Summary statistics for proposed projects
  const proposedStats = useMemo(() => {
    const totalCount = proposedProjects.length;
    const totalBudget = proposedProjects.reduce((acc, p) => acc + (Number(p.total_budget) || 0), 0);
    const withDurationCount = proposedProjects.filter((p) => p.durationInfo?.hasDates).length;
    const inApprovalPipeline = proposedProjects.filter((p) =>
      ['submitted', 'dept_approved', 'deputy_approved', 'planning_approved'].includes(p.status)
    ).length;
    const inRevision = proposedProjects.filter((p) => p.status === 'revision_requested').length;
    const inDraft = proposedProjects.filter((p) => p.status === 'draft').length;

    return {
      totalCount,
      totalBudget,
      withDurationCount,
      inApprovalPipeline,
      inRevision,
      inDraft,
    };
  }, [proposedProjects]);

  // Calendar Calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const todayMonth = () => {
    setCurrentDate(new Date());
  };

  // Generate calendar grid days
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday
    const lastDate = new Date(year, month + 1, 0).getDate();
    const prevLastDate = new Date(year, month, 0).getDate();

    const days = [];

    // Previous month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevLastDate - i),
        isCurrentMonth: false,
        isToday: false,
      });
    }

    const todayStr = new Date().toDateString();

    // Current month days
    for (let i = 1; i <= lastDate; i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d,
        isCurrentMonth: true,
        isToday: d.toDateString() === todayStr,
      });
    }

    // Next month padding days to complete full grid (multiple of 7)
    const totalSlots = Math.ceil(days.length / 7) * 7;
    const remaining = totalSlots - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
        isToday: false,
      });
    }

    return days;
  }, [year, month]);

  // Check which activities fall into a specific day
  const getActivitiesForDay = (date: Date) => {
    const time = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    return filteredActivities.filter((act) => {
      if (!act.start_date) return false;
      const s = new Date(act.start_date);
      if (isNaN(s.getTime())) return false;
      const sTime = new Date(s.getFullYear(), s.getMonth(), s.getDate()).getTime();

      const e = act.end_date ? new Date(act.end_date) : s;
      const eTime = isNaN(e.getTime()) ? sTime : new Date(e.getFullYear(), e.getMonth(), e.getDate()).getTime();

      return time >= sTime && time <= eTime;
    });
  };

  // Division badges helper
  const getDivisionBadgeColor = (code?: string) => {
    switch (code) {
      case 'ACAD': return 'bg-blue-600 text-white';
      case 'RES': return 'bg-purple-600 text-white';
      case 'DEV': return 'bg-amber-600 text-white';
      case 'STRAT': return 'bg-emerald-600 text-white';
      default: return 'bg-slate-700 text-white';
    }
  };

  // Division activity pill styling in calendar view
  const getActivityPillStyle = (act: any) => {
    if (!act.is_approved) {
      return 'bg-amber-50 text-amber-950 border-amber-300 border-dashed hover:bg-amber-100/90 font-medium shadow-2xs';
    }
    if (act.is_milestone) {
      return 'bg-amber-100 text-amber-950 border-amber-300 hover:bg-amber-200 shadow-2xs font-bold';
    }
    switch (act.division_code) {
      case 'ACAD':
        return 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100';
      case 'RES':
        return 'bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100';
      case 'DEV':
        return 'bg-orange-50 text-orange-950 border-orange-200 hover:bg-orange-100';
      case 'STRAT':
        return 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100';
      default:
        return 'bg-slate-50 text-slate-900 border-slate-200 hover:bg-slate-100';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-theme-primary text-white rounded-theme shadow-xs">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">แผนปฏิบัติงานและระยะเวลาโครงการ</h1>
              <p className="text-xs text-slate-500">
                ติดตามไทม์ไลน์โครงการที่ได้รับอนุมัติ และดูระยะเวลาโครงการที่เสนอเข้ามาในระบบเพื่อวางแผนจัดสรร
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher & Action Count */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-theme border border-slate-200">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-theme text-xs font-bold transition ${
                viewMode === 'calendar'
                  ? 'bg-white text-theme-primary shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>มุมมองปฏิทิน</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-theme text-xs font-bold transition ${
                viewMode === 'list'
                  ? 'bg-white text-theme-primary shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListFilter className="w-4 h-4" />
              <span>{scopeTab === 'proposed' ? 'รายการโครงการที่เสนอ' : 'มุมมองรายการ'}</span>
            </button>
          </div>

          <div className="text-xs bg-white px-3.5 py-2 rounded-theme border border-slate-200 font-bold text-slate-700 shadow-xs">
            {scopeTab === 'proposed' ? (
              <span>โครงการเสนอ {filteredProposedProjects.length} รายการ</span>
            ) : (
              <span>กิจกรรม {filteredActivities.length} รายการ</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Scope Tabs: Approved vs Proposed vs All */}
      <div className="bg-slate-100 p-1.5 rounded-xl border border-slate-200 flex flex-wrap sm:flex-nowrap gap-1.5">
        <button
          onClick={() => setScopeTab('approved')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs sm:text-sm font-bold transition ${
            scopeTab === 'approved'
              ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <CheckCircle2 className={`w-4 h-4 ${scopeTab === 'approved' ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span>แผนปฏิบัติงานโครงการ (อนุมัติแล้ว)</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            scopeTab === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
          }`}>
            {approvedProjects.length}
          </span>
        </button>

        <button
          onClick={() => setScopeTab('proposed')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs sm:text-sm font-bold transition relative ${
            scopeTab === 'proposed'
              ? 'bg-white text-amber-700 shadow-sm border border-amber-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Hourglass className={`w-4 h-4 ${scopeTab === 'proposed' ? 'text-amber-600 animate-pulse' : 'text-slate-400'}`} />
          <span>ระยะเวลาโครงการที่เสนอเข้ามา (รออนุมัติ)</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            scopeTab === 'proposed' ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-300' : 'bg-slate-200 text-slate-600'
          }`}>
            {proposedProjects.length}
          </span>
        </button>

        <button
          onClick={() => setScopeTab('all')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs sm:text-sm font-bold transition ${
            scopeTab === 'all'
              ? 'bg-white text-theme-primary shadow-sm border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Layers className="w-4 h-4 text-slate-400" />
          <span>โครงการทั้งหมดในระบบ</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            scopeTab === 'all' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
          }`}>
            {projects.length}
          </span>
        </button>
      </div>

      {/* Proposed Projects Key Metrics Summary Card (Shown when Proposed tab is active) */}
      {scopeTab === 'proposed' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-gradient-to-br from-amber-50 to-orange-50/40 p-4 rounded-theme border border-amber-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900">โครงการเสนอรออนุมัติ</span>
              <Hourglass className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-950">{proposedStats.totalCount}</span>
              <span className="text-xs text-amber-800">โครงการ</span>
            </div>
            <p className="mt-1 text-[11px] text-amber-700">
              ระบุระยะเวลาแล้ว {proposedStats.withDurationCount} จาก {proposedStats.totalCount} โครงการ
            </p>
          </div>

          <div className="bg-white p-4 rounded-theme border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">งบประมาณที่เสนอขอรวม</span>
              <Banknote className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900">
                ฿{proposedStats.totalBudget.toLocaleString()}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              งบรวมของโครงการที่อยู่ในสายการพิจารณา
            </p>
          </div>

          <div className="bg-white p-4 rounded-theme border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">อยู่ในขั้นตอนพิจารณา</span>
              <TrendingUp className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-indigo-900">{proposedStats.inApprovalPipeline}</span>
              <span className="text-xs text-slate-500">โครงการ</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              ผ่านการเสนอขั้นที่ 1 - 4
            </p>
          </div>

          <div className="bg-white p-4 rounded-theme border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">ฉบับร่าง / ส่งกลับแก้ไข</span>
              <AlertCircle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-700">
                {proposedStats.inDraft + proposedStats.inRevision}
              </span>
              <span className="text-xs text-slate-500">โครงการ</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              ร่าง {proposedStats.inDraft} / แก้ไข {proposedStats.inRevision} โครงการ
            </p>
          </div>
        </div>
      )}

      {/* Filter Section */}
      <div className="bg-white p-4 sm:p-5 rounded-theme shadow-xs border border-slate-200 space-y-4">
        {/* Division Pill Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setDivisionFilter('ALL');
              setDepartmentFilter('ALL');
            }}
            className={`px-3.5 py-1.5 rounded-theme text-xs font-bold transition flex items-center gap-1.5 ${
              divisionFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span>ทุกฝ่าย</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              divisionFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
            }`}>
              {scopeTab === 'proposed' ? proposedProjects.length : allActivities.length}
            </span>
          </button>

          {(divisions.length > 0 ? divisions : [
            { id: 1, code: 'ACAD', name: 'ฝ่ายวิชาการ' },
            { id: 2, code: 'RES', name: 'ฝ่ายบริหารทรัพยากร' },
            { id: 3, code: 'DEV', name: 'ฝ่ายพัฒนากิจการนักเรียนฯ' },
            { id: 4, code: 'STRAT', name: 'ฝ่ายแผนงานและความร่วมมือ' },
          ]).map((d: any) => {
            const isSelected = divisionFilter === d.code || divisionFilter === String(d.id);
            const count =
              scopeTab === 'proposed'
                ? proposedProjects.filter(
                    (p) => p.department?.division?.code === d.code || String(p.department?.division_id) === String(d.id)
                  ).length
                : allActivities.filter(
                    (act) => act.division_code === d.code || String(act.division_id) === String(d.id)
                  ).length;

            let badgeColorClass = 'bg-blue-600 text-white';
            if (d.code === 'RES') badgeColorClass = 'bg-purple-600 text-white';
            else if (d.code === 'DEV') badgeColorClass = 'bg-amber-600 text-white';
            else if (d.code === 'STRAT') badgeColorClass = 'bg-emerald-600 text-white';

            return (
              <button
                key={d.id || d.code}
                onClick={() => {
                  setDivisionFilter(isSelected ? 'ALL' : (d.code || String(d.id)));
                  setDepartmentFilter('ALL');
                }}
                className={`px-3 py-1.5 rounded-theme text-xs font-bold transition flex items-center gap-1.5 border ${
                  isSelected
                    ? `${badgeColorClass} shadow-xs border-transparent`
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span>{d.name}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isSelected ? 'bg-black/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Secondary Filter Row: Date Nav (if calendar), Step Filter, Department Dropdown & Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {/* Navigation Controls (If Calendar View) or Title */}
          {viewMode === 'calendar' ? (
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="p-2 border border-slate-200 rounded-theme hover:bg-slate-100 text-slate-700 transition"
                title="เดือนก่อนหน้า"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={todayMonth}
                className="px-3 py-1.5 border border-slate-200 rounded-theme text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
              >
                วันนี้
              </button>
              <button
                onClick={nextMonth}
                className="p-2 border border-slate-200 rounded-theme hover:bg-slate-100 text-slate-700 transition"
                title="เดือนถัดไป"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 ml-2 flex items-center gap-1.5">
                <CalendarDays className="w-5 h-5 text-theme-primary" />
                <span>{THAI_MONTHS_FULL[month]} พ.ศ. {year + 543}</span>
              </h2>
            </div>
          ) : (
            <div className="font-bold text-slate-900 text-base flex items-center gap-2">
              <ListFilter className="w-5 h-5 text-theme-primary" />
              <span>
                {scopeTab === 'proposed'
                  ? 'รายการระยะเวลาโครงการที่เสนอเข้ามา (รออนุมัติ)'
                  : 'ตารางไทม์ไลน์กิจกรรม (Timeline List)'}
              </span>
            </div>
          )}

          {/* Filters: Department, Approval Step & Search Box */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อโครงการ/รหัส..."
                className="text-xs font-medium pl-8 pr-3 py-1.5 border border-slate-200 rounded-theme bg-slate-50 focus:bg-white focus:border-theme-primary outline-none w-[170px] sm:w-[200px]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Department Filter */}
            {availableDepartments.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-slate-400" />
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="text-xs font-medium px-3 py-1.5 border border-slate-200 rounded-theme bg-slate-50 focus:border-theme-primary outline-none cursor-pointer max-w-[170px] truncate"
                >
                  <option value="ALL">
                    {divisionFilter === 'ALL' ? 'ทุกแผนก/งาน' : 'ทุกแผนกในฝ่ายนี้'}
                  </option>
                  {availableDepartments.map((dept: any) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Step / Status Filter for Proposed Tab */}
            {scopeTab !== 'approved' && (
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={stepFilter}
                  onChange={(e) => setStepFilter(e.target.value)}
                  className="text-xs font-medium px-3 py-1.5 border border-slate-200 rounded-theme bg-slate-50 focus:border-theme-primary outline-none cursor-pointer max-w-[170px] truncate"
                >
                  <option value="ALL">ทุกขั้นตอนการเสนอ</option>
                  <option value="submitted">ขั้นที่ 1: รอหัวหน้าแผนก/งาน</option>
                  <option value="dept_approved">ขั้นที่ 2: รอรอง ผอ. ฝ่าย</option>
                  <option value="deputy_approved">ขั้นที่ 3: รองานแผนงานตรวจสอบ</option>
                  <option value="planning_approved">ขั้นที่ 4: รอ ผอ. ลงนามอนุมัติ</option>
                  <option value="revision_requested">ส่งกลับแก้ไข</option>
                  <option value="draft">ฉบับร่าง</option>
                </select>
              </div>
            )}

            {scopeTab === 'approved' && (
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer bg-amber-50/70 hover:bg-amber-100/80 px-3 py-1.5 rounded-theme border border-amber-200 transition">
                <input
                  type="checkbox"
                  checked={milestoneOnly}
                  onChange={(e) => setMilestoneOnly(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-400"
                />
                <Flag className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                <span>เฉพาะ Milestones</span>
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 bg-white rounded-theme border border-slate-200 shadow-xs">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-theme-primary border-t-transparent rounded-full mb-2"></div>
          <p className="text-xs">กำลังโหลดข้อมูลระยะเวลาและแผนปฏิบัติงาน...</p>
        </div>
      ) : scopeTab === 'proposed' && viewMode === 'list' ? (
        /* PROPOSED PROJECTS SPECIALIZED GANTT / DURATION CARDS LIST VIEW */
        <div className="space-y-3">
          {filteredProposedProjects.length === 0 ? (
            <div className="p-16 text-center text-slate-400 bg-white rounded-theme border border-slate-200 shadow-xs space-y-2">
              <Hourglass className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-sm font-medium">ไม่พบโครงการที่เสนอเข้ามาตามเงื่อนไขที่เลือก</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {filteredProposedProjects.map((p) => {
                const dur = p.durationInfo;
                const step = p.stepInfo;
                const divCode = p.department?.division?.code;
                const divName = p.department?.division?.name;
                const deptName = p.department?.name;

                return (
                  <div
                    key={p.id}
                    onClick={() =>
                      setSelectedActivity({
                        project_id: p.id,
                        project_title: p.title,
                        project_code: p.project_code,
                        project_status: p.status,
                        activity_name: `ระยะเวลาโครงการ: ${p.title}`,
                        start_date: dur.startDateStr,
                        end_date: dur.endDateStr,
                        location: dur.location,
                        division_code: divCode,
                        division_name: divName,
                        department_name: deptName,
                        leader_name: p.leader?.full_name,
                        total_budget: p.total_budget,
                        is_milestone: false,
                        is_approved: false,
                        step_info: step,
                        durationDays: dur.durationDays,
                        executionDates: dur.executionDates,
                      })
                    }
                    className="bg-white rounded-theme border border-slate-200 hover:border-amber-400 p-4 sm:p-5 shadow-2xs hover:shadow-md transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    {/* Left: Project Code, Status & Title */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Approval Step Badge */}
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${step.badgeClass}`}>
                          <span className={`w-2 h-2 rounded-full ${step.dotClass}`} />
                          {step.label}
                        </span>

                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getDivisionBadgeColor(divCode)}`}>
                          {divCode || 'DIV'}
                        </span>

                        <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          {deptName || '-'}
                        </span>

                        {p.project_code && (
                          <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {p.project_code}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-slate-900 hover:text-theme-primary transition">
                        {p.title}
                      </h3>

                      {/* Leader & Budget */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                        {p.leader?.full_name && (
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-medium text-slate-700">{p.leader.full_name}</span>
                          </span>
                        )}

                        <span className="flex items-center gap-1">
                          <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="font-bold text-slate-900">
                            ฿{(Number(p.total_budget) || 0).toLocaleString()}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Right: Duration Banner & Sub-timelines */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
                      {dur.hasDates ? (
                        <div className="bg-amber-50/80 border border-amber-200 rounded-theme px-3.5 py-2.5 text-xs space-y-1 min-w-[210px]">
                          <div className="flex items-center justify-between font-bold text-amber-950">
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              ระยะเวลาดำเนินงาน
                            </span>
                            <span className="bg-amber-200/80 text-amber-950 px-1.5 py-0.2 rounded text-[10px]">
                              {dur.durationDays} วัน
                            </span>
                          </div>
                          <div className="text-slate-800 font-medium">
                            {formatThaiDate(dur.startDate)} - {formatThaiDate(dur.endDate)}
                          </div>
                          {dur.executionDates.length > 1 && (
                            <div className="text-[10px] text-amber-800 pt-0.5">
                              • มีการแบ่งช่วงดำเนินงาน {dur.executionDates.length} ช่วง
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-slate-50 border border-slate-200 rounded-theme px-3.5 py-2.5 text-xs text-slate-500 min-w-[210px] flex items-center gap-2">
                          <CalendarRange className="w-4 h-4 text-slate-400" />
                          <span>ยังไม่ได้ระบุช่วงเวลาชัดเจน</span>
                        </div>
                      )}

                      <Link
                        href={`/projects/${p.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-2.5 text-slate-500 hover:text-theme-primary bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-theme transition flex items-center gap-1 text-xs font-bold"
                        title="เปิดดูโครงการ"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : viewMode === 'calendar' ? (
        /* CALENDAR MONTH GRID VIEW (SUPPORTING BOTH APPROVED & PROPOSED) */
        <div className="bg-white rounded-theme border border-slate-200 shadow-xs overflow-hidden">
          {/* Weekday Header */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-bold text-slate-600">
            {WEEKDAYS.map((day, idx) => (
              <div
                key={day}
                className={`py-2.5 ${idx === 0 || idx === 6 ? 'text-rose-600 bg-rose-50/50' : ''}`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Day Grid Cells */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-200">
            {calendarDays.map((dayObj, dIdx) => {
              const acts = getActivitiesForDay(dayObj.date);
              const isWeekend = dayObj.date.getDay() === 0 || dayObj.date.getDay() === 6;

              return (
                <div
                  key={dIdx}
                  className={`min-h-[115px] sm:min-h-[130px] p-1.5 sm:p-2 flex flex-col transition ${
                    !dayObj.isCurrentMonth
                      ? 'bg-slate-50/60 text-slate-300'
                      : isWeekend
                      ? 'bg-rose-50/20'
                      : 'bg-white'
                  } hover:bg-blue-50/30`}
                >
                  {/* Date Number Badge */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`inline-flex items-center justify-center text-xs font-bold w-6 h-6 rounded-full ${
                        dayObj.isToday
                          ? 'bg-theme-primary text-white shadow-xs ring-2 ring-blue-200'
                          : dayObj.isCurrentMonth
                          ? isWeekend
                            ? 'text-rose-600'
                            : 'text-slate-700'
                          : 'text-slate-300'
                      }`}
                    >
                      {dayObj.date.getDate()}
                    </span>

                    {acts.length > 0 && dayObj.isCurrentMonth && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">
                        {acts.length}
                      </span>
                    )}
                  </div>

                  {/* Activities Pills in Cell */}
                  <div className="space-y-1 overflow-y-auto max-h-[85px] sm:max-h-[95px] pr-0.5">
                    {acts.map((act, aIdx) => {
                      const isMilestone = act.is_milestone;
                      const isProposed = !act.is_approved;

                      return (
                        <button
                          key={aIdx}
                          onClick={() => setSelectedActivity(act)}
                          className={`w-full text-left p-1 rounded text-[11px] leading-tight truncate transition block border ${getActivityPillStyle(
                            act
                          )}`}
                          title={`${isProposed ? '[รออนุมัติ] ' : ''}${act.activity_name} (${act.project_title})`}
                        >
                          <span className="flex items-center gap-1">
                            {isProposed && <Hourglass className="w-2.5 h-2.5 shrink-0 text-amber-600" />}
                            {isMilestone && !isProposed && <Flag className="w-2.5 h-2.5 shrink-0 fill-amber-600 text-amber-600" />}
                            <span className="truncate">
                              {isProposed ? `⏳ ${act.activity_name}` : act.activity_name}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* STANDARD LIST / GANTT VIEW FOR APPROVED / ALL PROJECTS */
        <div className="bg-white rounded-theme border border-slate-200 shadow-xs p-5 space-y-4">
          {filteredActivities.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <p className="text-sm">ไม่พบกิจกรรมที่ตรงตามเงื่อนไข</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredActivities.map((act, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedActivity(act)}
                  className={`p-4 rounded-theme border transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer hover:shadow-md ${
                    !act.is_approved
                      ? 'bg-amber-50/40 border-amber-300 hover:border-amber-500'
                      : act.is_milestone
                      ? 'bg-amber-50/60 border-amber-300'
                      : 'bg-slate-50 border-slate-200 hover:border-theme-primary'
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {!act.is_approved ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white inline-flex items-center gap-1">
                          <Hourglass className="w-3 h-3" /> รออนุมัติ
                        </span>
                      ) : act.is_milestone ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white inline-flex items-center gap-1">
                          <Flag className="w-3 h-3 fill-white" /> Milestone
                        </span>
                      ) : null}

                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getDivisionBadgeColor(act.division_code)}`}>
                        {act.division_code || 'DIV'}
                      </span>
                      <span className="text-xs font-medium text-slate-600">{act.department_name}</span>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-slate-900">{act.activity_name}</h3>

                    <p className="text-xs text-slate-600 flex items-center gap-1">
                      <FolderKanban className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>โครงการ:</span>
                      <span className="text-theme-primary font-bold">{act.project_title}</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 shrink-0">
                    <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-theme border border-slate-200 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {formatThaiDate(act.start_date)} - {formatThaiDate(act.end_date)}
                      </span>
                    </div>

                    {act.location && (
                      <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-theme border border-slate-200 text-slate-700 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                        <span>{act.location}</span>
                      </div>
                    )}

                    <Link
                      href={`/projects/${act.project_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 text-slate-400 hover:text-theme-primary transition rounded-theme hover:bg-slate-100"
                      title="เปิดดูโครงการ"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Activity / Project Duration Details Modal Popup */}
      {selectedActivity && (
        <ModalPortal>
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-hidden flex flex-col relative my-auto animate-in fade-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className={`p-4 text-white flex justify-between items-center shrink-0 ${
                !selectedActivity.is_approved
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600'
                  : selectedActivity.is_milestone
                  ? 'bg-amber-600'
                  : 'bg-slate-900'
              }`}>
                <div className="flex items-center gap-2">
                  {!selectedActivity.is_approved ? (
                    <Hourglass className="w-5 h-5 text-white" />
                  ) : selectedActivity.is_milestone ? (
                    <Flag className="w-5 h-5 fill-white text-white" />
                  ) : (
                    <CalendarDays className="w-5 h-5 text-blue-400" />
                  )}
                  <h2 className="text-base sm:text-lg font-bold">
                    {!selectedActivity.is_approved
                      ? 'ระยะเวลาโครงการที่เสนอ (รออนุมัติ)'
                      : selectedActivity.is_milestone
                      ? 'เป้าหมายสำคัญ (Milestone)'
                      : 'รายละเอียดกิจกรรม'}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedActivity(null)}
                  className="p-1 hover:bg-white/20 rounded-lg transition text-white/80 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4 text-sm flex-1 overflow-y-auto">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold ${getDivisionBadgeColor(selectedActivity.division_code)}`}>
                      {selectedActivity.division_name || selectedActivity.division_code || 'ฝ่ายงาน'}
                    </span>
                    {selectedActivity.step_info && (
                      <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${selectedActivity.step_info.badgeClass}`}>
                        {selectedActivity.step_info.fullLabel || selectedActivity.step_info.label}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 leading-snug">
                    {selectedActivity.activity_name}
                  </h3>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-theme border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <FolderKanban className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-bold text-slate-700">โครงการ:</span>
                    <span className="text-slate-900 font-medium">{selectedActivity.project_title}</span>
                  </div>

                  {selectedActivity.project_code && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <span className="font-bold text-slate-700">รหัสโครงการ:</span>
                      <span className="font-mono font-bold text-theme-primary">{selectedActivity.project_code}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-bold text-slate-700">แผนก/งาน:</span>
                    <span>{selectedActivity.department_name || '-'}</span>
                  </div>

                  {selectedActivity.leader_name && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <User className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-bold text-slate-700">ผู้รับผิดชอบ:</span>
                      <span>{selectedActivity.leader_name}</span>
                    </div>
                  )}

                  {selectedActivity.total_budget !== undefined && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Banknote className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-bold text-slate-700">งบประมาณเสนอขอ:</span>
                      <span className="font-bold text-emerald-700">
                        ฿{(Number(selectedActivity.total_budget) || 0).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-blue-50/60 rounded-theme border border-blue-200 flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-theme-primary shrink-0" />
                    <div>
                      <div className="font-bold text-slate-700">ระยะเวลาดำเนินงาน</div>
                      <div className="text-slate-900 font-medium">
                        {formatThaiDate(selectedActivity.start_date)} - {formatThaiDate(selectedActivity.end_date)}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-theme border border-slate-200 flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-700">สถานที่</div>
                      <div className="text-slate-900">{selectedActivity.location || 'ไม่ได้ระบุ'}</div>
                    </div>
                  </div>
                </div>

                {/* If sub-execution dates exist */}
                {Array.isArray(selectedActivity.executionDates) && selectedActivity.executionDates.length > 0 && (
                  <div className="p-3 bg-amber-50/60 rounded-theme border border-amber-200 space-y-1.5 text-xs">
                    <div className="font-bold text-amber-950 flex items-center gap-1.5">
                      <CalendarRange className="w-3.5 h-3.5 text-amber-600" />
                      ช่วงเวลาดำเนินกิจกรรมย่อย ({selectedActivity.executionDates.length} ช่วง)
                    </div>
                    <div className="space-y-1 pl-1">
                      {selectedActivity.executionDates.map((ed: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-slate-700 text-[11px]">
                          <span>ช่วงที่ {idx + 1}: {ed.title || 'ดำเนินโครงการ'}</span>
                          <span className="font-medium text-slate-900">
                            {formatThaiDate(ed.start_date || ed.startDate)} - {formatThaiDate(ed.end_date || ed.endDate)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center gap-2 shrink-0">
                <Link
                  href={`/projects/${selectedActivity.project_id}`}
                  className="flex items-center gap-1.5 px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-white text-xs font-bold rounded-theme shadow-xs transition"
                >
                  <span>เปิดดูโครงการเต็ม</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>

                <button
                  onClick={() => setSelectedActivity(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-theme transition"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
