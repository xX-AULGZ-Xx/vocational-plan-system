'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import {
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ClipboardCheck,
  Send,
  Star,
  Building2,
  FileText,
  Clock,
  ChevronRight,
  RefreshCw,
  HeartHandshake,
  User,
  Phone,
  Search,
  Award,
  Check,
  ExternalLink,
  X,
  CheckCircle,
} from 'lucide-react';
import { showAlert } from '@/lib/sweetalert';
import { getSurveyTheme } from '@/lib/survey-themes';

interface Question {
  id: string;
  section_id: string;
  question_text: string;
  question_type: 'RATING_5' | 'TEXT' | 'RADIO' | 'CHECKBOX';
  options?: any;
  order_index: number;
  is_required: boolean;
}

interface Section {
  id: string;
  title: string;
  description?: string;
  order_index: number;
  questions: Question[];
}

export interface AttendeeItem {
  id: string;
  title_name?: string;
  full_name: string;
  phone?: string;
  organization?: string;
  position?: string;
  email?: string;
  status?: string;
  certificate_no?: string;
}

interface SurveyData {
  id: string;
  project_id?: string;
  title: string;
  description?: string;
  is_active: boolean;
  theme_config?: any;
  project_title: string;
  project_code?: string;
  department_name?: string;
  project_type?: string;
  is_registration_and_certificate?: boolean;
  sections: Section[];
}

export default function PublicSurveyPage() {
  const params = useParams();
  const formId = params.formId as string;

  const [loading, setLoading] = useState(true);
  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Participant Info for REGISTRATION_AND_CERTIFICATE
  const [attendeeName, setAttendeeName] = useState('');
  const [attendeePhone, setAttendeePhone] = useState('');
  const [selectedAttendee, setSelectedAttendee] = useState<AttendeeItem | null>(null);
  const [attendeeSuggestions, setAttendeeSuggestions] = useState<AttendeeItem[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSearchField, setActiveSearchField] = useState<'name' | 'phone' | null>(null);
  const [submitResultAttendee, setSubmitResultAttendee] = useState<any>(null);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Form states: key = question.id
  const [answers, setAnswers] = useState<Record<string, { score?: number; text_value?: string }>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (formId) {
      fetchSurvey();
    }
  }, [formId]);

  // Click outside to close suggestion dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSurvey = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/v1/public/surveys/${formId}`);
      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.message || 'ไม่สามารถโหลดแบบประเมินได้');
        return;
      }
      setSurvey(data.data);
    } catch (e: any) {
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  // Search registered attendees with debounce
  const handleSearchAttendees = (query: string, field: 'name' | 'phone') => {
    setActiveSearchField(field);
    if (field === 'name') {
      setAttendeeName(query);
    } else {
      setAttendeePhone(query);
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query || query.trim().length < 2) {
      setAttendeeSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const res = await fetch(`/api/v1/public/surveys/${formId}/attendees-lookup?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setAttendeeSuggestions(data.data);
          setShowSuggestions(true);
        } else {
          setAttendeeSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (err) {
        console.error('Error looking up attendees:', err);
        setAttendeeSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 280);
  };

  const handleSelectAttendee = (att: AttendeeItem) => {
    const formattedName = `${att.title_name || ''} ${att.full_name || ''}`.trim();
    setAttendeeName(formattedName);
    setAttendeePhone(att.phone || '');
    setSelectedAttendee(att);
    setShowSuggestions(false);
    setValidationErrors(prev => {
      const next = { ...prev };
      delete next.attendeeName;
      delete next.attendeePhone;
      return next;
    });
  };

  const handleClearSelectedAttendee = () => {
    setSelectedAttendee(null);
    setAttendeeName('');
    setAttendeePhone('');
    setAttendeeSuggestions([]);
    setShowSuggestions(false);
  };

  const handleScoreChange = (qId: string, score: number) => {
    setAnswers(prev => ({
      ...prev,
      [qId]: { ...(prev[qId] || {}), score }
    }));
    if (validationErrors[qId]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[qId];
        return next;
      });
    }
  };

  const handleTextChange = (qId: string, text_value: string) => {
    setAnswers(prev => ({
      ...prev,
      [qId]: { ...(prev[qId] || {}), text_value }
    }));
    if (validationErrors[qId]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[qId];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!survey) return;

    // Validate attendee identity if required
    const errors: Record<string, string> = {};
    if (survey.is_registration_and_certificate) {
      if (!attendeeName.trim()) {
        errors.attendeeName = 'กรุณากรอกชื่อ-นามสกุลของผู้ตอบแบบประเมิน';
      }
      if (!attendeePhone.trim()) {
        errors.attendeePhone = 'กรุณากรอกเบอร์โทรศัพท์ที่ใช้ลงทะเบียน';
      }
    }

    // Validate required questions
    const formattedAnswers: any[] = [];
    const respondentMeta: Record<string, any> = {};

    survey.sections.forEach(sec => {
      sec.questions.forEach(q => {
        const ans = answers[q.id];
        if (q.question_type === 'RATING_5') {
          if (q.is_required && (!ans || ans.score === undefined)) {
            errors[q.id] = 'กรุณาเลือกระดับความพึงพอใจ';
          } else if (ans && ans.score !== undefined) {
            formattedAnswers.push({
              question_id: q.id,
              score: ans.score,
            });
          }
        } else if (q.question_type === 'RADIO' || q.question_type === 'CHECKBOX') {
          if (q.is_required && (!ans || !ans.text_value)) {
            errors[q.id] = 'กรุณาเลือกข้อมูล';
          } else if (ans && ans.text_value) {
            formattedAnswers.push({
              question_id: q.id,
              text_value: ans.text_value,
            });
            respondentMeta[q.question_text] = ans.text_value;
          }
        } else if (q.question_type === 'TEXT') {
          if (q.is_required && (!ans || !ans.text_value?.trim())) {
            errors[q.id] = 'กรุณากรอกข้อความ';
          } else if (ans && ans.text_value?.trim()) {
            formattedAnswers.push({
              question_id: q.id,
              text_value: ans.text_value.trim(),
            });
          }
        }
      });
    });

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      showAlert.warning('กรอกข้อมูลไม่ครบถ้วน', 'กรุณากรอกข้อมูลและตอบคำถามที่มีเครื่องหมายดอกจันสีแดง (*) ให้ครบถ้วน');
      // Scroll to first error
      if (errors.attendeeName || errors.attendeePhone) {
        const el = document.getElementById('attendee-info-card');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        const firstErrorKey = Object.keys(errors)[0];
        const el = document.getElementById(`question-${firstErrorKey}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/public/surveys/${formId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: formattedAnswers,
          respondent_meta: respondentMeta,
          attendee_id: selectedAttendee?.id || undefined,
          attendee_name: attendeeName.trim(),
          attendee_phone: attendeePhone.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSubmitResultAttendee(data.attendee || null);
        setSubmitted(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        showAlert.error('ไม่สามารถส่งแบบประเมินได้', data.message);
      }
    } catch (e: any) {
      showAlert.error('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการส่งข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSubmitting(false);
    }
  };

  const theme = getSurveyTheme(survey?.theme_config);

  const scoreLabels = [
    { score: 5, label: 'มากที่สุด' },
    { score: 4, label: 'มาก' },
    { score: 3, label: 'ปานกลาง' },
    { score: 2, label: 'น้อย' },
    { score: 1, label: 'น้อยที่สุด' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center space-y-4 max-w-sm w-full text-center">
          <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin" />
          <p className="text-slate-600 font-medium">กำลังโหลดแบบประเมินความพึงพอใจ...</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !survey) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-red-100 flex flex-col items-center space-y-4 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">ไม่สามารถเข้าถึงแบบประเมินได้</h2>
          <p className="text-sm text-slate-600">{errorMsg || 'ไม่พบแบบประเมินในระบบ'}</p>
        </div>
      </div>
    );
  }

  if (!survey.is_active) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-amber-100 flex flex-col items-center space-y-4 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center">
            <Clock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">ปิดรับการประเมินแล้ว</h2>
          <p className="text-sm text-slate-600">แบบประเมินความพึงพอใจโครงการนี้ได้ปิดรับข้อมูลแล้ว ขอขอบพระคุณทุกท่านที่ให้ความร่วมมือ</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className={`min-h-screen ${theme.bg.bgClass} ${theme.font.className} flex flex-col items-center justify-center p-4`}>
        <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-xl border border-slate-100 flex flex-col items-center text-center max-w-lg w-full relative overflow-hidden animate-in fade-in zoom-in duration-300">
          <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${theme.color.headerGradient}`} />
          
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-inner ring-8 ring-emerald-50/50">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-2">ส่งแบบประเมินเรียบร้อยแล้ว</h2>
          <p className="text-slate-600 text-sm mb-6 leading-relaxed">
            ขอขอบพระคุณที่ท่านได้สละเวลาประเมินผลการดำเนินงานโครงการ ข้อมูลและข้อคิดเห็นอันมีค่าของท่านจะถูกนำไปพัฒนาและปรับปรุงคุณภาพการจัดโครงการต่อไป
          </p>

          <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left mb-6 text-xs text-slate-600 space-y-1">
            <div className="font-semibold text-slate-800 text-sm mb-1">{survey.project_title}</div>
            {survey.department_name && <div>หน่วยงาน: {survey.department_name}</div>}
            {survey.project_code && <div>รหัสโครงการ: {survey.project_code}</div>}
            {(attendeeName || submitResultAttendee?.full_name) && (
              <div className="pt-2 border-t border-slate-200 mt-2 text-slate-700">
                ผู้ประเมิน: <span className="font-semibold text-slate-900">{submitResultAttendee?.full_name || attendeeName}</span>
                {submitResultAttendee?.certificate_no && (
                  <span className="block text-amber-700 font-semibold mt-0.5">
                    เลขที่เกียรติบัตร: {submitResultAttendee.certificate_no}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Certificate Action Button */}
          {(survey.is_registration_and_certificate || survey.project_type === 'REGISTRATION_AND_CERTIFICATE' || submitResultAttendee) && survey.project_id && (
            <div className="w-full mb-6 space-y-2">
              <a
                href={`/projects/${survey.project_id}/certificates?q=${encodeURIComponent(submitResultAttendee?.certificate_no || submitResultAttendee?.full_name || attendeeName || '')}`}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold rounded-2xl shadow-md flex items-center justify-center gap-2 text-sm transition-all hover:scale-[1.02]"
              >
                <Award className="w-4 h-4" />
                <span>🎓 ดูและตรวจสอบเกียรติบัตรออนไลน์</span>
              </a>
            </div>
          )}

          <div className="flex items-center text-xs text-slate-400 gap-1">
            <HeartHandshake className="w-4 h-4 text-pink-500" />
            <span>ระบบบริหารจัดการงานแผนงานและโครงการ วิทยาลัยอาชีวศึกษา</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.bg.bgClass} ${theme.font.className} py-6 sm:py-10 px-4 sm:px-6`}>
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header Banner */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div
            className="p-6 sm:p-8 text-white relative shadow-sm"
            style={{ background: theme.color.gradientStyle }}
          >
            <div className="absolute top-0 right-0 translate-x-4 -translate-y-4 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-medium text-white/95 mb-3">
              <ClipboardCheck className="w-3.5 h-3.5 text-white" />
              <span>แบบประเมินความพึงพอใจ</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-2 leading-snug">
              {survey.title}
            </h1>
            <p className="text-white/90 text-xs sm:text-sm font-light leading-relaxed opacity-95">
              โครงการ: {survey.project_title}
            </p>
            {survey.department_name && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-white/80">
                <Building2 className="w-3.5 h-3.5" />
                <span>{survey.department_name}</span>
                {survey.project_code && <span>({survey.project_code})</span>}
              </div>
            )}
          </div>

          {survey.description && (
            <div className="p-4 sm:p-6 bg-slate-50/50 border-t border-slate-100 text-xs sm:text-sm text-slate-600 leading-relaxed">
              {survey.description}
            </div>
          )}
        </div>

        {/* Survey Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Attendee Info Card for REGISTRATION_AND_CERTIFICATE */}
          {survey.is_registration_and_certificate && (
            <div
              id="attendee-info-card"
              ref={dropdownRef}
              className="bg-white rounded-3xl shadow-sm border border-indigo-100 p-5 sm:p-7 space-y-4 relative overflow-visible"
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2 text-indigo-600 font-bold text-base sm:text-lg">
                    <Award className="w-5 h-5 text-indigo-600" />
                    <span>ข้อมูลผู้ประเมินสำหรับรับเกียรติบัตร</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    กรอกชื่อ-นามสกุล หรือเบอร์โทรศัพท์ที่ใช้ลงทะเบียนไว้ ระบบจะค้นหาและช่วยกรอกข้อมูลให้อัตโนมัติ (Auto-fill)
                  </p>
                </div>
                {selectedAttendee && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full shrink-0">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    เชื่อมโยงข้อมูลแล้ว
                  </span>
                )}
              </div>

              {selectedAttendee && (
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
                  <div className="space-y-0.5">
                    <div className="font-bold text-emerald-900 flex items-center gap-1.5 text-sm">
                      <span>{selectedAttendee.title_name || ''} {selectedAttendee.full_name}</span>
                      {selectedAttendee.status === 'passed' && (
                        <span className="text-[10px] bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full font-bold">ผ่านการอบรมแล้ว</span>
                      )}
                    </div>
                    <div className="text-emerald-700 text-[11px]">
                      {selectedAttendee.phone && <span>เบอร์โทร: {selectedAttendee.phone}</span>}
                      {selectedAttendee.organization && <span className="ml-2">| หน่วยงาน: {selectedAttendee.organization}</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearSelectedAttendee}
                    className="text-xs text-slate-500 hover:text-red-600 bg-white border border-slate-200 hover:border-red-200 px-2.5 py-1 rounded-xl shadow-xs transition-colors shrink-0"
                  >
                    เปลี่ยนข้อมูล
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative">
                {/* Name input */}
                <div className="space-y-1.5 relative">
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700">
                    ชื่อ - นามสกุล <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={attendeeName}
                      onChange={(e) => handleSearchAttendees(e.target.value, 'name')}
                      onFocus={() => {
                        if (attendeeSuggestions.length > 0) setShowSuggestions(true);
                      }}
                      placeholder="เช่น สมชาย ใจดี"
                      className={`w-full pl-9 pr-8 py-2.5 text-xs sm:text-sm rounded-2xl border transition-all ${
                        validationErrors.attendeeName
                          ? 'border-red-300 ring-1 ring-red-300 bg-red-50/30'
                          : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 bg-white'
                      }`}
                    />
                    {loadingSuggestions && activeSearchField === 'name' && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <RefreshCw className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                      </div>
                    )}
                  </div>
                  {validationErrors.attendeeName && (
                    <p className="text-[11px] text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {validationErrors.attendeeName}
                    </p>
                  )}
                </div>

                {/* Phone input */}
                <div className="space-y-1.5 relative">
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700">
                    เบอร์โทรศัพท์ <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      value={attendeePhone}
                      onChange={(e) => handleSearchAttendees(e.target.value, 'phone')}
                      onFocus={() => {
                        if (attendeeSuggestions.length > 0) setShowSuggestions(true);
                      }}
                      placeholder="เช่น 0812345678"
                      className={`w-full pl-9 pr-8 py-2.5 text-xs sm:text-sm rounded-2xl border transition-all ${
                        validationErrors.attendeePhone
                          ? 'border-red-300 ring-1 ring-red-300 bg-red-50/30'
                          : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 bg-white'
                      }`}
                    />
                    {loadingSuggestions && activeSearchField === 'phone' && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <RefreshCw className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                      </div>
                    )}
                  </div>
                  {validationErrors.attendeePhone && (
                    <p className="text-[11px] text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {validationErrors.attendeePhone}
                    </p>
                  )}
                </div>
              </div>

              {/* Auto-fill Dropdown Suggestions */}
              {showSuggestions && attendeeSuggestions.length > 0 && (
                <div className="absolute left-5 right-5 z-30 mt-1 bg-white rounded-2xl shadow-xl border border-indigo-100 overflow-hidden max-h-60 overflow-y-auto">
                  <div className="px-3 py-1.5 bg-indigo-50/80 border-b border-indigo-100 text-[11px] font-bold text-indigo-800 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Search className="w-3 h-3" />
                      พบรายชื่อผู้ลงทะเบียนที่ตรงกัน (คลิกเพื่อเลือก Auto-fill)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSuggestions(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {attendeeSuggestions.map((att) => (
                      <button
                        key={att.id}
                        type="button"
                        onClick={() => handleSelectAttendee(att)}
                        className="w-full text-left px-4 py-2.5 hover:bg-indigo-50/60 transition-colors flex items-center justify-between gap-3 text-xs group"
                      >
                        <div>
                          <div className="font-bold text-slate-800 group-hover:text-indigo-600 flex items-center gap-1.5">
                            <span>{att.title_name || ''} {att.full_name}</span>
                            {att.certificate_no && (
                              <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                {att.certificate_no}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                            {att.phone && <span>📞 {att.phone}</span>}
                            {att.organization && <span>🏢 {att.organization}</span>}
                          </div>
                        </div>
                        <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white px-2.5 py-1 rounded-lg transition-colors shrink-0">
                          เลือก
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {survey.sections.map((section, sIdx) => (
            <div
              key={section.id}
              className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-5 sm:p-7 space-y-6"
            >
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full ${theme.color.badgeClass} text-xs flex items-center justify-center font-bold`}>
                    {sIdx + 1}
                  </span>
                  {section.title}
                </h2>
                {section.description && (
                  <p className="text-xs text-slate-500 mt-1 pl-8">{section.description}</p>
                )}
              </div>

              <div className="space-y-6">
                {section.questions.map((question) => {
                  const error = validationErrors[question.id];
                  const currentAns = answers[question.id];

                  return (
                    <div
                      key={question.id}
                      id={`question-${question.id}`}
                      className={`p-4 rounded-2xl transition-all ${
                        error ? 'bg-red-50/40 border border-red-200 ring-1 ring-red-300' : 'bg-slate-50/60 hover:bg-slate-50 border border-slate-100'
                      }`}
                    >
                      <div className="mb-3">
                        <label className="block text-sm font-semibold text-slate-800 leading-snug">
                          {question.question_text}{' '}
                          {question.is_required && <span className="text-red-500">*</span>}
                        </label>
                        {error && (
                          <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {error}
                          </p>
                        )}
                      </div>

                      {/* RATING 5 (Likert Scale) */}
                      {question.question_type === 'RATING_5' && (
                        <div className="space-y-2">
                          {/* 1. BUTTONS STYLE */}
                          {theme.ratingStyle === 'buttons' && (
                            <>
                              <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                                {[5, 4, 3, 2, 1].map((num) => {
                                  const isSelected = currentAns?.score === num;
                                  const labelInfo = scoreLabels.find(l => l.score === num);
                                  return (
                                    <button
                                      type="button"
                                      key={num}
                                      onClick={() => handleScoreChange(question.id, num)}
                                      className={`flex flex-col items-center justify-center p-2.5 sm:p-3.5 rounded-2xl border transition-all ${
                                        isSelected
                                          ? theme.color.scoreSelectedClass + ' scale-[1.02]'
                                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                                      }`}
                                    >
                                      <span className={`text-base sm:text-lg font-bold ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                                        {num}
                                      </span>
                                      <span className={`text-[10px] sm:text-xs text-center line-clamp-1 mt-0.5 ${isSelected ? 'text-white/90 font-medium' : 'text-slate-500'}`}>
                                        {labelInfo?.label}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                              <div className="flex justify-between items-center px-1 text-[11px] text-slate-400">
                                <span>5 = มากที่สุด</span>
                                <span>1 = น้อยที่สุด</span>
                              </div>
                            </>
                          )}

                          {/* 2. STARS STYLE */}
                          {theme.ratingStyle === 'stars' && (
                            <div className="flex flex-col items-center py-2 space-y-2 bg-slate-50/50 rounded-2xl border border-slate-100 p-3">
                              <div className="flex items-center gap-2 sm:gap-3">
                                {[1, 2, 3, 4, 5].map((star) => {
                                  const currentScore = currentAns?.score || 0;
                                  return (
                                    <button
                                      type="button"
                                      key={star}
                                      onClick={() => handleScoreChange(question.id, star)}
                                      className="p-1 text-2xl transition-transform hover:scale-125 active:scale-95 focus:outline-none"
                                    >
                                      <Star
                                        className={`w-8 h-8 sm:w-9 sm:h-9 transition-colors ${
                                          star <= currentScore
                                            ? 'fill-amber-400 text-amber-400 drop-shadow-sm'
                                            : 'text-slate-300 hover:text-amber-200'
                                        }`}
                                      />
                                    </button>
                                  );
                                })}
                              </div>
                              <div className="text-xs font-bold text-slate-700 h-5 flex items-center">
                                {currentAns?.score === 5 && '⭐️⭐️⭐️⭐️⭐️ ระดับมากที่สุด (5 คะแนน)'}
                                {currentAns?.score === 4 && '⭐️⭐️⭐️⭐️ ระดับมาก (4 คะแนน)'}
                                {currentAns?.score === 3 && '⭐️⭐️⭐️ ระดับปานกลาง (3 คะแนน)'}
                                {currentAns?.score === 2 && '⭐️⭐️ ระดับน้อย (2 คะแนน)'}
                                {currentAns?.score === 1 && '⭐️ ระดับน้อยที่สุด (1 คะแนน)'}
                                {!currentAns?.score && <span className="text-slate-400 font-normal">คลิกเลือกดาวเพื่อประเมิน</span>}
                              </div>
                            </div>
                          )}

                          {/* 3. EMOJI STYLE */}
                          {theme.ratingStyle === 'emoji' && (
                            <div className="grid grid-cols-5 gap-1.5 sm:gap-2 pt-1">
                              {[
                                { score: 5, emoji: '😍', label: 'มากที่สุด' },
                                { score: 4, emoji: '😊', label: 'มาก' },
                                { score: 3, emoji: '😐', label: 'ปานกลาง' },
                                { score: 2, emoji: '🙁', label: 'น้อย' },
                                { score: 1, emoji: '😢', label: 'น้อยที่สุด' },
                              ].map((item) => {
                                const isSelected = currentAns?.score === item.score;
                                return (
                                  <button
                                    type="button"
                                    key={item.score}
                                    onClick={() => handleScoreChange(question.id, item.score)}
                                    className={`p-2.5 sm:p-3 rounded-2xl flex flex-col items-center border transition-all ${
                                      isSelected
                                        ? theme.color.activeRadioClass + ' ring-2 ring-indigo-400 scale-[1.04] shadow-sm'
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                  >
                                    <span className="text-2xl sm:text-3xl mb-1">{item.emoji}</span>
                                    <span className="text-[10px] sm:text-xs font-bold">{item.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* RADIO (Choice Options) */}
                      {(question.question_type === 'RADIO' || question.question_type === 'CHECKBOX') && (
                        <div className="space-y-2">
                          {Array.isArray(question.options) && question.options.map((opt: string, optIdx: number) => {
                            const isChecked = currentAns?.text_value === opt;
                            return (
                              <label
                                key={optIdx}
                                className={`flex items-center p-3 rounded-2xl border cursor-pointer transition-all ${
                                  isChecked
                                    ? theme.color.activeRadioClass + ' font-medium shadow-xs'
                                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`question_${question.id}`}
                                  value={opt}
                                  checked={isChecked}
                                  onChange={() => handleTextChange(question.id, opt)}
                                  className="w-4 h-4 border-slate-300 mr-3"
                                />
                                <span className="text-xs sm:text-sm">{opt}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {/* TEXT (Open-ended Feedback) */}
                      {question.question_type === 'TEXT' && (
                        <textarea
                          value={currentAns?.text_value || ''}
                          onChange={(e) => handleTextChange(question.id, e.target.value)}
                          placeholder="กรุณาระบุความคิดเห็นหรือข้อเสนอแนะของท่าน..."
                          rows={3}
                          className="w-full text-xs sm:text-sm rounded-2xl border-slate-200 bg-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 placeholder:text-slate-400 p-3"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 px-6 font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2 text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]"
              style={{ backgroundColor: theme.color.buttonColor, color: '#ffffff' }}
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>กำลังบันทึกข้อมูล...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>ส่งแบบประเมินความพึงพอใจ</span>
                </>
              )}
            </button>
            <p className="text-center text-xs text-slate-400 mt-3">
              ระบบไม่เปิดเผยตัวตนของผู้ตอบแบบประเมิน (Anonymous Survey)
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
