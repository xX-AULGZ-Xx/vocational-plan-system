'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Award, Search, Download, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import CertificateRenderer from '@/components/certificate/CertificateRenderer';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PublicCertificatesPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const [loading, setLoading] = useState(true);
  const [projectInfo, setProjectInfo] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [selectedAttendee, setSelectedAttendee] = useState<any>(null);

  useEffect(() => {
    fetchInfo();
  }, [projectId]);

  const fetchInfo = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/registration-info`);
      const data = await res.json();
      if (data.success) {
        setProjectInfo(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const res = await fetch(
        `/api/v1/projects/${projectId}/certificates/search?q=${encodeURIComponent(searchQuery.trim())}`
      );
      const data = await res.json();
      if (data.success) {
        setResults(data.data?.attendees || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600">กำลังโหลดระบบตรวจสอบเกียรติบัตร...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-16">
      {/* Header Banner */}
      <header className="bg-gradient-to-r from-amber-900 via-amber-950 to-slate-900 text-white shadow-xl">
        <div className="max-w-4xl mx-auto px-4 py-8 sm:py-10">
          <Link
            href={`/projects/${projectId}/register`}
            className="inline-flex items-center gap-1.5 text-xs text-amber-200 hover:text-white mb-3 font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>กลับหน้าลงทะเบียน</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-amber-400 shrink-0">
              <Award className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white">ระบบตรวจสอบและรับเกียรติบัตรออนไลน์</h1>
              <p className="text-xs text-amber-200 line-clamp-1">{projectInfo?.title}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 -mt-4 space-y-6">
        {/* Search Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-4">
          <div className="text-center max-w-lg mx-auto space-y-1">
            <h2 className="text-lg sm:text-xl font-black text-slate-900">
              ค้นหารายชื่อผู้ได้รับเกียรติบัตร
            </h2>
            <p className="text-xs text-slate-500">
              กรอกชื่อ-นามสกุล หรือเบอร์โทรศัพท์ เพื่อค้นหาและดาวน์โหลดเกียรติบัตร
            </p>
          </div>

          <form onSubmit={handleSearch} className="max-w-xl mx-auto flex gap-2 pt-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="พิมพ์ชื่อ-นามสกุล หรือเบอร์โทร..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold outline-none focus:border-amber-600 focus:bg-white transition"
              />
            </div>
            <button
              type="submit"
              disabled={searching || !searchQuery.trim()}
              className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition shrink-0"
            >
              {searching ? 'กำลังค้นหา...' : 'ค้นหา'}
            </button>
          </form>

          {/* Results List */}
          {results.length > 0 && (
            <div className="pt-6 border-t border-slate-100 space-y-3">
              <h3 className="text-xs font-bold text-slate-700">
                พบข้อมูลจำนวน {results.length} รายการ:
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {results.map((att) => (
                  <div
                    key={att.id}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-amber-400 transition"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-sm text-slate-900">
                        {att.title_name} {att.full_name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {att.organization || 'วิทยาลัยอาชีวศึกษาเชียงราย'} {att.position ? `(${att.position})` : ''}
                      </div>
                      <div className="text-[11px] font-mono text-amber-700 font-semibold pt-1">
                        เลขที่เกียรติบัตร: {att.certificate_no}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedAttendee(att)}
                      className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <Download className="w-4 h-4" />
                      <span>ดูและดาวน์โหลดเกียรติบัตร</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Certificate Display */}
        {selectedAttendee && (
          <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  เกียรติบัตร: {selectedAttendee.title_name} {selectedAttendee.full_name}
                </h3>
                <p className="text-xs text-slate-400">เลขที่: {selectedAttendee.certificate_no}</p>
              </div>
              <button
                onClick={() => setSelectedAttendee(null)}
                className="text-xs text-slate-400 hover:text-white px-3 py-1 bg-slate-800 rounded-lg"
              >
                ปิด
              </button>
            </div>

            <CertificateRenderer
              attendee={{
                id: selectedAttendee.id,
                project_id: projectId,
                full_name: selectedAttendee.full_name,
                title_name: selectedAttendee.title_name,
                organization: selectedAttendee.organization,
                position: selectedAttendee.position,
                certificate_no: selectedAttendee.certificate_no,
                project_title: projectInfo?.certificate_config?.course_name || projectInfo?.title,
              }}
              config={projectInfo?.certificate_config}
              showActions={true}
            />
          </div>
        )}
      </main>
    </div>
  );
}
