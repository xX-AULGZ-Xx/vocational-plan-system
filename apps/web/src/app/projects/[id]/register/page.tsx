'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  Calendar,
  MapPin,
  Users,
  Award,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Share2,
  Building2,
  Sparkles,
  Search,
  Download,
  QrCode,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import CertificateRenderer from '@/components/certificate/CertificateRenderer';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PublicProjectRegistrationPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const [loading, setLoading] = useState(true);
  const [projectInfo, setProjectInfo] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Tab: 'register' | 'lookup_certificate'
  const [activeTab, setActiveTab] = useState<'register' | 'lookup_certificate'>('register');

  // Form State
  const [form, setForm] = useState({
    title_name: 'นาย',
    full_name: '',
    position: '',
    organization: '',
    phone: '',
    email: '',
    citizen_id: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [registeredAttendee, setRegisteredAttendee] = useState<any>(null);

  // Certificate Lookup State
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchCertResults, setSearchCertResults] = useState<any[]>([]);
  const [selectedCertAttendee, setSelectedCertAttendee] = useState<any>(null);

  useEffect(() => {
    fetchRegistrationInfo();
  }, [projectId]);

  const fetchRegistrationInfo = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/registration-info`);
      const data = await res.json();
      if (data.success) {
        setProjectInfo(data.data);
      } else {
        setErrorMsg(data.message || 'ไม่พบข้อมูลโครงการ');
      }
    } catch (e: any) {
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (data.success) {
        setRegisteredAttendee(data.data);
        fetchRegistrationInfo();
      } else {
        alert(data.message || 'เกิดข้อผิดพลาดในการลงทะเบียน');
        if (data.data) {
          setRegisteredAttendee(data.data);
        }
      }
    } catch (e: any) {
      alert('เกิดข้อผิดพลาดในการส่งข้อมูล');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearchCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const res = await fetch(
        `/api/v1/projects/${projectId}/certificates/search?q=${encodeURIComponent(searchQuery.trim())}`
      );
      const data = await res.json();
      if (data.success) {
        setSearchCertResults(data.data?.attendees || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const formatThaiDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600">กำลังโหลดระบบลงทะเบียน...</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !projectInfo) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">ไม่สามารถเปิดระบบลงทะเบียนได้</h2>
          <p className="text-xs text-slate-500">{errorMsg || 'ไม่พบโครงการนี้ในระบบ'}</p>
        </div>
      </div>
    );
  }

  const isRegOpen = projectInfo.is_registration_open;
  const isCertEnabled = projectInfo.project_type === 'REGISTRATION_AND_CERTIFICATE';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-16">
      {/* Header Banner */}
      <header className="bg-gradient-to-r from-blue-950 via-indigo-900 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 relative z-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-400 shrink-0 shadow-lg">
              <Award className="w-9 h-9 sm:w-11 sm:h-11" />
            </div>

            <div className="space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="px-3 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-amber-950">
                  {projectInfo.department?.name || 'วิทยาลัยอาชีวศึกษาเชียงราย'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-blue-200">
                  ปีงบประมาณ {projectInfo.fiscal_year}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">
                {projectInfo.title}
              </h1>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-blue-200/90 pt-1">
                {projectInfo.execution_dates?.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    <span>
                      {formatThaiDate(projectInfo.execution_dates[0]?.start_date)} -{' '}
                      {formatThaiDate(projectInfo.execution_dates[0]?.end_date)}
                    </span>
                  </div>
                )}
                {projectInfo.location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span>{projectInfo.location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 -mt-4 relative z-20">
        {/* Navigation Tabs (Register vs Certificate Lookup) */}
        <div className="flex items-center bg-white rounded-2xl p-1.5 shadow-md border border-slate-200 mb-6">
          <button
            onClick={() => setActiveTab('register')}
            className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'register'
                ? 'bg-blue-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>แบบฟอร์มลงทะเบียนเข้าร่วม</span>
          </button>

          {isCertEnabled && (
            <button
              onClick={() => setActiveTab('lookup_certificate')}
              className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
                activeTab === 'lookup_certificate'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Award className="w-4 h-4 text-amber-300" />
              <span>ค้นหาและดาวน์โหลดเกียรติบัตร</span>
            </button>
          )}
        </div>

        {/* ========================================================
            TAB 1: REGISTRATION FORM
        ======================================================== */}
        {activeTab === 'register' && (
          <div className="space-y-6">
            {/* Registration Success Card */}
            {registeredAttendee ? (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-200 shadow-xl space-y-6 text-center animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div className="space-y-1">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                    ลงทะเบียนเข้าร่วมโครงการสำเร็จแล้ว!
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500">
                    ระบบได้บันทึกข้อมูลการลงทะเบียนของท่านเรียบร้อยแล้ว
                  </p>
                </div>

                {/* Registration Confirmation Ticket */}
                <div className="max-w-md mx-auto bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-6 rounded-2xl shadow-xl text-left relative overflow-hidden">
                  <div className="text-[10px] text-amber-400 font-bold tracking-wider uppercase">
                    E-Ticket / บัตรยืนยันการลงทะเบียน
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">
                    {registeredAttendee.title_name} {registeredAttendee.full_name}
                  </h3>
                  {registeredAttendee.organization && (
                    <div className="text-xs text-blue-200 mt-0.5">
                      สังกัด: {registeredAttendee.organization}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-4 mt-4 border-t border-white/10 text-xs">
                    <div>
                      <div className="text-[10px] text-blue-300">เบอร์โทรศัพท์</div>
                      <div className="font-mono font-bold text-white">{registeredAttendee.phone || '-'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-blue-300">สถานะ</div>
                      <div className="font-bold text-emerald-400">ลงทะเบียนสำเร็จ</div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between">
                    <div>
                      <div className="text-[9px] text-slate-400">รหัสผู้เข้าร่วม</div>
                      <div className="font-mono text-xs font-bold text-amber-300">
                        REG-{projectInfo.fiscal_year}-{registeredAttendee.id}
                      </div>
                    </div>
                    <div className="bg-white p-1.5 rounded-lg">
                      <QRCodeSVG
                        value={`ATTENDEE:${registeredAttendee.id}:${projectInfo.project_id}`}
                        size={56}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      setRegisteredAttendee(null);
                      setForm({
                        title_name: 'นาย',
                        full_name: '',
                        position: '',
                        organization: '',
                        phone: '',
                        email: '',
                        citizen_id: '',
                      });
                    }}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                  >
                    ลงทะเบียนเพิ่มอีกคน
                  </button>

                  {isCertEnabled && (
                    <button
                      onClick={() => setActiveTab('lookup_certificate')}
                      className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-md"
                    >
                      <Award className="w-4 h-4" />
                      <span>ตรวจสอบเกียรติบัตร</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Registration Form Card */
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-6">
                {/* Status Notice */}
                {!isRegOpen ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 flex items-center gap-3 text-xs">
                    <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <div className="font-bold">สถานะการลงทะเบียน:</div>
                      <div>{projectInfo.registration_message}</div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-bold">ระบบกำลังเปิดรับลงทะเบียน</span>
                    </div>
                    {projectInfo.stats?.max_participants && (
                      <span className="text-slate-600">
                        ผู้ลงทะเบียนแล้ว {projectInfo.stats.total} / {projectInfo.stats.max_participants} คน (ว่าง {projectInfo.stats.remaining_seats} ที่นั่ง)
                      </span>
                    )}
                  </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-1">
                      <label className="block font-bold text-slate-700 mb-1">คำนำหน้า:</label>
                      <select
                        value={form.title_name}
                        onChange={(e) => setForm((p) => ({ ...p, title_name: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-blue-900 focus:bg-white transition font-medium"
                      >
                        <option value="นาย">นาย</option>
                        <option value="นาง">นาง</option>
                        <option value="นางสาว">นางสาว</option>
                        <option value="ดร.">ดร.</option>
                        <option value="ผศ.">ผศ.</option>
                        <option value="อาจารย์">อาจารย์</option>
                        <option value="นักเรียน/นักศึกษา">นักเรียน/นักศึกษา</option>
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block font-bold text-slate-700 mb-1">
                        ชื่อและนามสกุล (<span className="text-rose-600">* สำหรับพิมพ์บนเกียรติบัตร</span>):
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="เช่น สมชาย ใจดีมั่นคง (ไม่ต้องใส่คำนำหน้า)"
                        value={form.full_name}
                        onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-blue-900 focus:bg-white transition text-xs font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">ตำแหน่ง / สถานะ:</label>
                      <input
                        type="text"
                        placeholder="เช่น ครู, นักเรียน ปวช., บุคลากรทางการศึกษา"
                        value={form.position}
                        onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-blue-900 focus:bg-white transition text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">หน่วยงาน / สังกัด / แผนกวิชา:</label>
                      <input
                        type="text"
                        placeholder="เช่น วิทยาลัยอาชีวศึกษาเชียงราย, แผนกวิชาคอมพิวเตอร์ธุรกิจ"
                        value={form.organization}
                        onChange={(e) => setForm((p) => ({ ...p, organization: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-blue-900 focus:bg-white transition text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        เบอร์โทรศัพท์มือถือ (<span className="text-rose-600">* ใช้สำหรับค้นหาเกียรติบัตร</span>):
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="08X-XXX-XXXX"
                        value={form.phone}
                        onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-blue-900 focus:bg-white transition text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">อีเมล (ถ้ามี):</label>
                      <input
                        type="email"
                        placeholder="example@email.com"
                        value={form.email}
                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-blue-900 focus:bg-white transition text-xs"
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={!isRegOpen || submitting}
                      className={`w-full py-3.5 rounded-2xl font-bold text-sm transition shadow-lg flex items-center justify-center gap-2 ${
                        !isRegOpen
                          ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white hover:opacity-95'
                      }`}
                    >
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>{submitting ? 'กำลังบันทึกข้อมูลการลงทะเบียน...' : 'ยืนยันการลงทะเบียนเข้าร่วม'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 2: CERTIFICATE LOOKUP & DOWNLOAD
        ======================================================== */}
        {activeTab === 'lookup_certificate' && (
          <div className="space-y-6">
            {/* Search Box */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-4">
              <div className="text-center max-w-lg mx-auto space-y-1">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  ค้นหาและดาวน์โหลดเกียรติบัตร
                </h2>
                <p className="text-xs text-slate-500">
                  กรอกชื่อ-นามสกุล หรือเบอร์โทรศัพท์ที่ใช้ลงทะเบียน เพื่อค้นหาเกียรติบัตรของท่าน
                </p>
              </div>

              <form onSubmit={handleSearchCertificate} className="max-w-xl mx-auto flex gap-2 pt-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="พิมพ์ชื่อ-นามสกุล หรือเบอร์โทรศัพท์..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold outline-none focus:border-amber-600 focus:bg-white transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={searching || !searchQuery.trim()}
                  className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition shrink-0"
                >
                  {searching ? 'กำลังค้นหา...' : 'ค้นหาเกียรติบัตร'}
                </button>
              </form>

              {/* Search Results */}
              {searchCertResults.length > 0 && (
                <div className="pt-6 border-t border-slate-100 space-y-3">
                  <h3 className="text-xs font-bold text-slate-700">
                    พบเกียรติบัตรจำนวน {searchCertResults.length} รายการ:
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {searchCertResults.map((att) => (
                      <div
                        key={att.id}
                        className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-amber-400 transition shadow-2xs"
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
                          onClick={() => setSelectedCertAttendee(att)}
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

            {/* Certificate Display Modal / Bottom Section */}
            {selectedCertAttendee && (
              <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white">
                      เกียรติบัตร - {selectedCertAttendee.title_name} {selectedCertAttendee.full_name}
                    </h3>
                    <p className="text-xs text-slate-400">เลขที่: {selectedCertAttendee.certificate_no}</p>
                  </div>
                  <button
                    onClick={() => setSelectedCertAttendee(null)}
                    className="text-xs text-slate-400 hover:text-white px-3 py-1 bg-slate-800 rounded-lg"
                  >
                    ปิดการแสดงผล
                  </button>
                </div>

                <CertificateRenderer
                  attendee={{
                    full_name: selectedCertAttendee.full_name,
                    title_name: selectedCertAttendee.title_name,
                    organization: selectedCertAttendee.organization,
                    position: selectedCertAttendee.position,
                    certificate_no: selectedCertAttendee.certificate_no,
                    project_title: projectInfo.certificate_config?.course_name || projectInfo.title,
                  }}
                  config={projectInfo.certificate_config}
                  showActions={true}
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
