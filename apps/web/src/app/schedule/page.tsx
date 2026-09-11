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
} from 'lucide-react';

const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const WEEKDAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

export default function SchedulePage() {
  const { token, user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View Mode: 'calendar' (Month Grid) or 'list' (Timeline List)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Calendar Date State (Current Month / Year)
  const [currentDate, setCurrentDate] = useState(() => new Date());

  // Filter by Division or Department
  const [divisionFilter, setDivisionFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [milestoneOnly, setMilestoneOnly] = useState(false);

  // Selected Activity for Detail Modal Popup
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

  // Flatten all activities (including timelines and post-approval permitted execution dates)
  const allActivities = useMemo(() => {
    return projects.flatMap((p) => {
      const items: any[] = [];
      const divCode = p.department?.division?.code;
      const divName = p.department?.division?.name;
      const deptName = p.department?.name;
      const leaderName = p.leader?.full_name;
      const budget = p.total_budget;

      // 1. Standard project timelines (including synced execution dates from database)
      (p.timelines || []).forEach((t: any) => {
        const isExec = t.activity_name?.includes('📍') || t.activity_name?.includes('ดำเนินโครงการ');
        items.push({
          ...t,
          project_id: p.id,
          project_title: p.title,
          project_code: p.project_code,
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

      // 2. Parse dynamic_data.execution_dates ONLY if not already present in p.timelines
      let dyn: any = {};
      if (p.dynamic_data) {
        try {
          dyn = typeof p.dynamic_data === 'string' ? JSON.parse(p.dynamic_data) : p.dynamic_data;
        } catch {}
      }

      if (Array.isArray(dyn?.execution_dates)) {
        dyn.execution_dates.forEach((ed: any, edIdx: number) => {
          const s = ed.start_date || ed.startDate;
          const e = ed.end_date || ed.endDate || s;
          if (s) {
            // Check if any timeline already covers execution
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
                activity_name: `📍 การดำเนินโครงการ${dyn.execution_dates.length > 1 ? ` (ช่วงที่ ${edIdx + 1})` : ''}: ${ed.title || p.title}`,
                start_date: s,
                end_date: e,
                location: ed.location || dyn.execution_status_location || '',
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
      }

      return items;
    }).sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  }, [projects]);

  // Departments available for current selected division
  const availableDepartments = useMemo(() => {
    if (divisionFilter === 'ALL') {
      return (divisions || []).reduce((acc: any[], d: any) => [...acc, ...(d.departments || [])], []);
    }
    const matchedDiv = (divisions || []).find((d: any) => d.code === divisionFilter || String(d.id) === divisionFilter);
    return matchedDiv?.departments || [];
  }, [divisions, divisionFilter]);

  // Filtered activities based on filters
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
      return true;
    });
  }, [allActivities, divisionFilter, departmentFilter, milestoneOnly]);

  const formatThaiDate = (dStr: string) => {
    if (!dStr) return '-';
    const d = new Date(dStr);
    const months = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
  };

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
      const s = new Date(act.start_date);
      const sTime = new Date(s.getFullYear(), s.getMonth(), s.getDate()).getTime();
      const e = new Date(act.end_date);
      const eTime = new Date(e.getFullYear(), e.getMonth(), e.getDate()).getTime();
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
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-theme-primary text-white rounded-theme shadow-xs">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">แผนปฏิบัติงานและปฏิทินกิจกรรมโครงการ</h1>
              <p className="text-xs text-slate-500">
                ติดตามไทม์ไลน์ ลำดับกิจกรรม และเป้าหมายสำคัญ (Milestones) ของทุกโครงการในรูปแบบปฏิทิน
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Calendar / List View Tabs */}
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
              <span>มุมมองรายการ</span>
            </button>
          </div>

          <div className="text-xs bg-white px-3.5 py-2 rounded-theme border border-slate-200 font-bold text-slate-700 shadow-xs">
            กิจกรรมทั้งหมด {allActivities.length} รายการ
          </div>
        </div>
      </div>

      {/* Enhanced Division & Department Filter Section */}
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
              {allActivities.length}
            </span>
          </button>

          {(divisions.length > 0 ? divisions : [
            { id: 1, code: 'ACAD', name: 'ฝ่ายวิชาการ' },
            { id: 2, code: 'RES', name: 'ฝ่ายบริหารทรัพยากร' },
            { id: 3, code: 'DEV', name: 'ฝ่ายพัฒนากิจการนักเรียนฯ' },
            { id: 4, code: 'STRAT', name: 'ฝ่ายแผนงานและความร่วมมือ' },
          ]).map((d: any) => {
            const isSelected = divisionFilter === d.code || divisionFilter === String(d.id);
            const count = allActivities.filter(
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

        {/* Secondary Filter Row: Date Nav (if calendar), Department Dropdown & Milestone Checkbox */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {/* Navigation Controls (If Calendar View) */}
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
              <span>ตารางไทม์ไลน์กิจกรรม (Timeline Gantt List)</span>
            </div>
          )}

          {/* Department Filter & Milestone Toggle */}
          <div className="flex flex-wrap items-center gap-2.5">
            {availableDepartments.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-slate-400" />
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="text-xs font-medium px-3 py-1.5 border border-slate-200 rounded-theme bg-slate-50 focus:border-theme-primary outline-none cursor-pointer max-w-[200px] truncate"
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

            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer bg-amber-50/70 hover:bg-amber-100/80 px-3 py-1.5 rounded-theme border border-amber-200 transition">
              <input
                type="checkbox"
                checked={milestoneOnly}
                onChange={(e) => setMilestoneOnly(e.target.checked)}
                className="rounded text-amber-500 focus:ring-amber-400"
              />
              <Flag className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
              <span>เฉพาะเป้าหมายสำคัญ (Milestones)</span>
            </label>
          </div>
        </div>
      </div>

      {/* Main Content View */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 bg-white rounded-theme border border-slate-200 shadow-xs">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-theme-primary border-t-transparent rounded-full mb-2"></div>
          <p className="text-xs">กำลังโหลดข้อมูลแผนปฏิบัติงาน...</p>
        </div>
      ) : viewMode === 'calendar' ? (
        /* CALENDAR MONTH GRID VIEW */
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
                        return (
                          <button
                            key={aIdx}
                            onClick={() => setSelectedActivity(act)}
                            className={`w-full text-left p-1 rounded text-[11px] font-medium leading-tight truncate transition block border ${getActivityPillStyle(
                              act
                            )}`}
                            title={`${act.activity_name} (${act.project_title})`}
                          >
                            <span className="flex items-center gap-1">
                              {isMilestone && <Flag className="w-2.5 h-2.5 shrink-0 fill-amber-600 text-amber-600" />}
                            <span className="truncate">{act.activity_name}</span>
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
        /* LIST / GANTT VIEW */
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
                    act.is_milestone
                      ? 'bg-amber-50/60 border-amber-300'
                      : 'bg-slate-50 border-slate-200 hover:border-theme-primary'
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {act.is_milestone && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white inline-flex items-center gap-1">
                          <Flag className="w-3 h-3 fill-white" /> Milestone
                        </span>
                      )}
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

      {/* Activity Details Modal Popup */}
      {selectedActivity && (
        <ModalPortal>
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col relative my-auto animate-in fade-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className={`p-4 text-white flex justify-between items-center shrink-0 ${
                selectedActivity.is_milestone ? 'bg-amber-600' : 'bg-slate-900'
              }`}>
                <div className="flex items-center gap-2">
                  {selectedActivity.is_milestone ? (
                    <Flag className="w-5 h-5 fill-white text-white" />
                  ) : (
                    <CalendarDays className="w-5 h-5 text-blue-400" />
                  )}
                  <h2 className="text-base sm:text-lg font-bold">
                    {selectedActivity.is_milestone ? 'เป้าหมายสำคัญ (Milestone)' : 'รายละเอียดกิจกรรม'}
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
              <div className="p-6 space-y-4 text-sm">
                <div>
                  <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold mb-2 ${getDivisionBadgeColor(selectedActivity.division_code)}`}>
                    {selectedActivity.division_name || selectedActivity.division_code || 'ฝ่ายงาน'}
                  </span>
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
                      <span className="font-bold text-slate-700">ผู้รับผิดชอบ:</span>
                      <span>{selectedActivity.leader_name}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-blue-50/60 rounded-theme border border-blue-200 flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-theme-primary shrink-0" />
                    <div>
                      <div className="font-bold text-slate-700">ระยะเวลาดำเนินงาน</div>
                      <div className="text-slate-900">
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
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center gap-2">
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
