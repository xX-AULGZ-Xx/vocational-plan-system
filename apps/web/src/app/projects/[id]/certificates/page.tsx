'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { Award, Search, Download, CheckCircle2, AlertCircle, ArrowLeft, Sparkles, X } from 'lucide-react';
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
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchInfo();
  }, [projectId]);

  // Handle URL query parameters (e.g. ?q=...)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const qParam = urlParams.get('q');
      if (qParam && qParam.trim()) {
        setSearchQuery(qParam.trim());
        triggerDirectSearch(qParam.trim());
      }
    }
  }, [projectId]);

  // Click outside to close auto-fill suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const triggerDirectSearch = async (queryText: string) => {
    if (!queryText.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `/api/v1/projects/${projectId}/certificates/search?q=${encodeURIComponent(queryText.trim())}`
      );
      const data = await res.json();
      if (data.success) {
        const list = data.data?.attendees || [];
        setResults(list);
        if (list.length === 1) {
          setSelectedAttendee(list[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchInputChange = (text: string) => {
    setSearchQuery(text);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!text || text.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const res = await fetch(
          `/api/v1/projects/${projectId}/certificates/search?q=${encodeURIComponent(text.trim())}`
        );
        const data = await res.json();
        if (data.success && Array.isArray(data.data?.attendees) && data.data.attendees.length > 0) {
          setSuggestions(data.data.attendees);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (err) {
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 280);
  };

  const handleSelectSuggestion = (att: any) => {
    const displayName = `${att.title_name || ''} ${att.full_name}`.trim();
    setSearchQuery(displayName);
    setSelectedAttendee(att);
    setResults([att]);
    setShowSuggestions(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    triggerDirectSearch(searchQuery.trim());
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

          <div ref={dropdownRef} className="max-w-xl mx-auto relative pt-2">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={searchQuery}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestions(true);
                  }}
                  placeholder="พิมพ์ชื่อ-นามสกุล หรือเบอร์โทรศัพท์ (มี Auto-fill)..."
                  className="w-full pl-10 pr-9 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold outline-none focus:border-amber-600 focus:bg-white transition"
                />
                {loadingSuggestions && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <div className="w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={searching || !searchQuery.trim()}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition shrink-0"
              >
                {searching ? 'กำลังค้นหา...' : 'ค้นหา'}
              </button>
            </form>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 z-30 mt-1.5 bg-white rounded-2xl shadow-2xl border border-amber-200 overflow-hidden max-h-64 overflow-y-auto divide-y divide-slate-100 animate-in fade-in duration-150">
                <div className="px-3.5 py-1.5 bg-amber-50 text-[11px] font-bold text-amber-900 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    พบรายชื่อผู้ได้รับเกียรติบัตร (คลิกเพื่อดูทันที)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSuggestions(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                </div>
                {suggestions.map((att) => (
                  <button
                    key={att.id}
                    type="button"
                    onClick={() => handleSelectSuggestion(att)}
                    className="w-full text-left px-4 py-2.5 hover:bg-amber-50/70 transition-colors flex items-center justify-between gap-3 text-xs group"
                  >
                    <div>
                      <div className="font-bold text-slate-800 group-hover:text-amber-700 flex items-center gap-1.5">
                        <span>{att.title_name || ''} {att.full_name}</span>
                        {att.certificate_no && (
                          <span className="text-[10px] font-mono bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                            {att.certificate_no}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                        {att.organization && <span>🏢 {att.organization}</span>}
                        {att.position && <span>({att.position})</span>}
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-100 group-hover:bg-amber-600 group-hover:text-white px-2.5 py-1 rounded-lg transition-colors shrink-0">
                      ดูเกียรติบัตร
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

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
