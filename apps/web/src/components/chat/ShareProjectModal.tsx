'use client';

import React, { useState, useEffect } from 'react';
import { Search, FolderKanban, X, Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface ProjectItem {
  id: string;
  project_code?: string;
  title: string;
  status: string;
  total_budget: number;
  fiscal_year: number;
  department?: { id: number; name: string };
}

interface ShareProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProject: (project: ProjectItem) => void;
}

export default function ShareProjectModal({ isOpen, onClose, onSelectProject }: ShareProjectModalProps) {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      fetchProjects(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  const fetchProjects = async (q: string) => {
    try {
      setIsLoading(true);
      const authToken = token || (typeof window !== 'undefined' ? (localStorage.getItem('vps_token') || localStorage.getItem('token') || localStorage.getItem('access_token')) : null);
      const res = await fetch(`/api/v1/chat/projects?q=${encodeURIComponent(q)}`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setProjects(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <FolderKanban className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-base">แชร์ข้อมูลโครงการลงในแชท</h3>
              <p className="text-xs text-slate-500">เลือกโครงการเพื่อส่งเป็นการ์ดข้อมูลที่สามารถกดเปิดดูได้ทันที</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาชื่อโครงการ หรือรหัสโครงการ..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              autoFocus
            />
          </div>
        </div>

        {/* Projects List */}
        <div className="overflow-y-auto p-4 space-y-2.5 flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span className="text-sm">กำลังค้นหาโครงการ...</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <FolderKanban className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm">ไม่พบโครงการที่ค้นหา</p>
            </div>
          ) : (
            projects.map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  onSelectProject(p);
                  onClose();
                }}
                className="group p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer transition flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-blue-600">
                      {p.project_code || 'โครงการ'}
                    </span>
                    {p.department && (
                      <span className="text-[11px] text-slate-400 truncate max-w-[150px]">
                        • {p.department.name}
                      </span>
                    )}
                  </div>
                  <h5 className="text-sm font-medium text-slate-800 line-clamp-1 group-hover:text-blue-700">
                    {p.title}
                  </h5>
                  <p className="text-xs text-slate-500 mt-1">
                    งบประมาณ: <strong>{Number(p.total_budget || 0).toLocaleString()}</strong> บาท • ปีงบฯ {p.fiscal_year}
                  </p>
                </div>
                <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition shrink-0 opacity-90 group-hover:opacity-100">
                  เลือก
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
