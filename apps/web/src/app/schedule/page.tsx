'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  Calendar as CalendarIcon,
  Flag,
  MapPin,
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function SchedulePage() {
  const { token } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, [token]);

  const fetchProjects = async () => {
    try {
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/v1/projects', { headers });
      const data = await res.json();
      if (data.success) {
        setProjects(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Flatten all activities
  const allActivities = projects.flatMap((p) =>
    (p.timelines || []).map((t: any) => ({
      ...t,
      project_id: p.id,
      project_title: p.title,
      project_code: p.project_code,
      division_code: p.department?.division?.code,
      department_name: p.department?.name,
    }))
  ).sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

  const formatThaiDate = (dStr: string) => {
    if (!dStr) return '-';
    const d = new Date(dStr);
    const months = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-blue-900" />
            <h1 className="text-2xl font-bold text-slate-900">แผนปฏิบัติงานและปฏิทินกิจกรรมโครงการ</h1>
          </div>
          <p className="text-sm text-slate-500">
            ติดตามไทม์ไลน์ ลำดับกิจกรรม และเป้าหมายสำคัญ (Milestones) ของทุกโครงการ
          </p>
        </div>

        <div className="text-xs bg-white px-3.5 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-700">
          กิจกรรมทั้งหมด {allActivities.length} รายการ
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full mb-2"></div>
          <p className="text-xs">กำลังโหลดปฏิทินปฏิบัติงาน...</p>
        </div>
      ) : allActivities.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
          <p className="text-slate-400 text-sm">ยังไม่มีกิจกรรมโครงการในระบบ</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <span>ตารางไทม์ไลน์กิจกรรม (Activity Gantt / Schedule View)</span>
          </h2>

          <div className="space-y-3">
            {allActivities.map((act, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  act.is_milestone
                    ? 'bg-amber-50/60 border-amber-300'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {act.is_milestone && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white inline-flex items-center gap-1">
                        <Flag className="w-3 h-3" /> Milestone
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900">
                      {act.division_code || 'DIV'}
                    </span>
                    <span className="text-xs text-slate-500">{act.department_name}</span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">{act.activity_name}</h3>

                  <p className="text-xs text-slate-600">
                    โครงการ:{' '}
                    <Link
                      href={`/projects/${act.project_id}`}
                      className="text-blue-900 hover:underline font-medium"
                    >
                      {act.project_title}
                    </Link>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 shrink-0">
                  <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {formatThaiDate(act.start_date)} - {formatThaiDate(act.end_date)}
                    </span>
                  </div>

                  {act.location && (
                    <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-red-500" />
                      <span>{act.location}</span>
                    </div>
                  )}

                  <Link
                    href={`/projects/${act.project_id}`}
                    className="p-1.5 text-slate-400 hover:text-blue-900"
                    title="เปิดดูโครงการ"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
