'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Award,
  Settings,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Clock,
  QrCode,
  Copy,
  ExternalLink,
  Download,
  Trash2,
  Edit2,
  FileSpreadsheet,
  Upload,
  RefreshCw,
  Sparkles,
  ChevronRight,
  Eye,
  CheckCheck,
  UserCheck,
  AlertCircle,
  X,
  Palette,
  Image as ImageIcon,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import CertificateRenderer, { CertificateConfig, CertificateAttendeeData, THEME_STYLES } from '@/components/certificate/CertificateRenderer';

interface ProjectRegistrationTabProps {
  project: any;
  token: string | null;
  onRefresh: () => void;
  currentUser: any;
}

export default function ProjectRegistrationTab({
  project,
  token,
  onRefresh,
  currentUser,
}: ProjectRegistrationTabProps) {
  const [subTab, setSubTab] = useState<'attendees' | 'certificate' | 'settings'>('attendees');

  // Parse Dynamic Data
  const dynamicData = (() => {
    if (!project?.dynamic_data) return {};
    if (typeof project.dynamic_data === 'object') return project.dynamic_data;
    try {
      return JSON.parse(project.dynamic_data);
    } catch {
      return {};
    }
  })();

  const projectType = dynamicData.project_type || 'GENERAL';
  const regConfig = dynamicData.registration_config || {};
  const certConfig = dynamicData.certificate_config || {};

  // Attendees list state
  const [attendees, setAttendees] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, registered: 0, checked_in: 0, passed: 0 });
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // QR Modal
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Add/Edit Attendee Modal
  const [showAttendeeModal, setShowAttendeeModal] = useState(false);
  const [editingAttendee, setEditingAttendee] = useState<any>(null);
  const [attendeeForm, setAttendeeForm] = useState({
    title_name: '',
    full_name: '',
    position: '',
    organization: '',
    email: '',
    phone: '',
    citizen_id: '',
    status: 'registered',
    certificate_no: '',
  });
  const [savingAttendee, setSavingAttendee] = useState(false);

  // Batch Import Modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);

  // Preview Certificate Modal
  const [previewAttendee, setPreviewAttendee] = useState<any>(null);

  // Certificate Studio State
  const [studioConfig, setStudioConfig] = useState<CertificateConfig>({
    template_theme: certConfig.template_theme || 'classic_blue',
    background_image: certConfig.background_image || null,
    title: certConfig.title || 'เกียรติบัตรฉบับนี้ให้ไว้เพื่อแสดงว่า',
    subtitle: certConfig.subtitle || 'ได้เข้าร่วมและผ่านการอบรมโครงการ',
    course_name: certConfig.course_name || project?.title || '',
    signatory_1_name: certConfig.signatory_1_name || '',
    signatory_1_position: certConfig.signatory_1_position || '',
    signatory_1_image: certConfig.signatory_1_image || null,
    signatory_2_name: certConfig.signatory_2_name || '',
    signatory_2_position: certConfig.signatory_2_position || '',
    signatory_2_image: certConfig.signatory_2_image || null,
    certificate_no_prefix: certConfig.certificate_no_prefix || `CERT-${project?.fiscal_year || 2569}-${project?.id || ''}`,
    issue_date_text: certConfig.issue_date_text || '',
  });
  const [savingCertConfig, setSavingCertConfig] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [uploadingSig1, setUploadingSig1] = useState(false);
  const [uploadingSig2, setUploadingSig2] = useState(false);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const sig1FileInputRef = useRef<HTMLInputElement>(null);
  const sig2FileInputRef = useRef<HTMLInputElement>(null);

  // Settings tab form state
  const [settingsForm, setSettingsForm] = useState({
    project_type: projectType,
    is_active: regConfig.is_active !== false,
    start_at: regConfig.start_at || '',
    end_at: regConfig.end_at || '',
    max_participants: regConfig.max_participants || '',
    require_phone: regConfig.require_phone ?? true,
    require_org: regConfig.require_org ?? true,
    require_email: regConfig.require_email ?? false,
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Public URL
  const publicBaseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const publicRegUrl = `${publicBaseUrl}/projects/${project?.id}/register`;
  const publicCertUrl = `${publicBaseUrl}/projects/${project?.id}/certificates`;

  useEffect(() => {
    fetchAttendees();
  }, [project?.id, statusFilter]);

  const fetchAttendees = async () => {
    if (!project?.id) return;
    setLoadingAttendees(true);
    try {
      const q = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
      const st = statusFilter !== 'all' ? `&status=${statusFilter}` : '';
      const res = await fetch(`/api/v1/projects/${project.id}/attendees?page=1&limit=200${q}${st}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setAttendees(data.data.attendees || []);
        if (data.data.stats) {
          setStats(data.data.stats);
        }
      }
    } catch (e) {
      console.error('Fetch attendees error:', e);
    } finally {
      setLoadingAttendees(false);
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Check-in toggle
  const handleToggleCheckIn = async (attendee: any) => {
    const nextStatus = attendee.status === 'checked_in' ? 'registered' : 'checked_in';
    try {
      const res = await fetch(`/api/v1/projects/${project.id}/attendees/${attendee.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        fetchAttendees();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Pass / Certificate toggle
  const handleTogglePass = async (attendee: any) => {
    const nextStatus = attendee.status === 'passed' ? 'checked_in' : 'passed';
    try {
      const res = await fetch(`/api/v1/projects/${project.id}/attendees/${attendee.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        fetchAttendees();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Batch Status Update
  const handleBatchStatus = async (status: 'checked_in' | 'passed' | 'registered') => {
    if (selectedIds.length === 0) return;
    try {
      const res = await fetch(`/api/v1/projects/${project.id}/attendees/batch-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          attendee_ids: selectedIds,
          status,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedIds([]);
        fetchAttendees();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Save single attendee
  const handleSaveAttendee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendeeForm.full_name.trim()) return;
    setSavingAttendee(true);
    try {
      if (editingAttendee) {
        // update
        const res = await fetch(`/api/v1/projects/${project.id}/attendees/${editingAttendee.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(attendeeForm),
        });
        const data = await res.json();
        if (data.success) {
          setShowAttendeeModal(false);
          fetchAttendees();
        }
      } else {
        // create
        const res = await fetch(`/api/v1/projects/${project.id}/attendees`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ attendee: attendeeForm }),
        });
        const data = await res.json();
        if (data.success) {
          setShowAttendeeModal(false);
          fetchAttendees();
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingAttendee(false);
    }
  };

  // Delete single attendee
  const handleDeleteAttendee = async (id: string) => {
    if (!confirm('ต้องการลบข้อมูลผู้เข้าร่วมท่านนี้ใช่หรือไม่?')) return;
    try {
      const res = await fetch(`/api/v1/projects/${project.id}/attendees/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        fetchAttendees();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Batch Import parse
  const handleBatchImport = async () => {
    if (!importText.trim()) return;
    setImporting(true);
    try {
      const lines = importText.split('\n').map((l) => l.trim()).filter(Boolean);
      const parsedAttendees: any[] = [];

      lines.forEach((line) => {
        // Support Tab separated or Comma separated
        const parts = line.includes('\t') ? line.split('\t') : line.split(',');
        if (parts.length > 0 && parts[0].trim()) {
          parsedAttendees.push({
            full_name: parts[0].trim(),
            position: parts[1]?.trim() || '',
            organization: parts[2]?.trim() || '',
            phone: parts[3]?.trim() || '',
            email: parts[4]?.trim() || '',
            status: 'registered',
          });
        }
      });

      if (parsedAttendees.length > 0) {
        const res = await fetch(`/api/v1/projects/${project.id}/attendees`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ attendees: parsedAttendees }),
        });
        const data = await res.json();
        if (data.success) {
          setShowImportModal(false);
          setImportText('');
          fetchAttendees();
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setImporting(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (attendees.length === 0) return;
    const headers = ['ลำดับ', 'คำนำหน้า', 'ชื่อ-นามสกุล', 'ตำแหน่ง', 'หน่วยงาน/สถานศึกษา', 'เบอร์โทรศัพท์', 'อีเมล', 'สถานะ', 'เวลาเช็คอิน', 'เลขที่เกียรติบัตร'];
    const rows = attendees.map((a, i) => [
      i + 1,
      a.title_name || '',
      `"${a.full_name || ''}"`,
      `"${a.position || ''}"`,
      `"${a.organization || ''}"`,
      `"${a.phone || ''}"`,
      `"${a.email || ''}"`,
      a.status === 'passed' ? 'ผ่าน/ได้รับเกียรติบัตร' : a.status === 'checked_in' ? 'เช็คอินแล้ว' : 'ลงทะเบียนแล้ว',
      a.checked_in_at ? new Date(a.checked_in_at).toLocaleString('th-TH') : '-',
      a.certificate_no || '-',
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `รายชื่อผู้ลงทะเบียน_${project?.title || 'โครงการ'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Upload Custom Background Image
  const handleUploadBg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBg(true);
    try {
      const formData = new FormData();
      formData.append('background_file', file);

      const res = await fetch(`/api/v1/projects/${project.id}/certificate/upload-bg`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.data?.background_image) {
        setStudioConfig((prev) => ({
          ...prev,
          background_image: data.data.background_image,
          template_theme: 'custom',
        }));
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingBg(false);
    }
  };

  // Upload Signatures
  const handleUploadSignature = async (file: File, index: '1' | '2') => {
    const isSig1 = index === '1';
    if (isSig1) setUploadingSig1(true);
    else setUploadingSig2(true);

    try {
      const formData = new FormData();
      formData.append('signature_file', file);
      formData.append('signatory_index', index);

      const res = await fetch(`/api/v1/projects/${project.id}/certificate/upload-signature`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        const key = isSig1 ? 'signatory_1_image' : 'signatory_2_image';
        setStudioConfig((prev) => ({
          ...prev,
          [key]: data.data[key],
        }));
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (isSig1) setUploadingSig1(false);
      else setUploadingSig2(false);
    }
  };

  // Save Certificate Studio Config
  const handleSaveCertConfig = async () => {
    setSavingCertConfig(true);
    try {
      const res = await fetch(`/api/v1/projects/${project.id}/registration-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          certificate_config: studioConfig,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('บันทึกการตั้งค่าเกียรติบัตรเรียบร้อยแล้ว');
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingCertConfig(false);
    }
  };

  // Save Registration Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch(`/api/v1/projects/${project.id}/registration-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          project_type: settingsForm.project_type,
          registration_config: {
            is_active: settingsForm.is_active,
            start_at: settingsForm.start_at || null,
            end_at: settingsForm.end_at || null,
            max_participants: settingsForm.max_participants ? Number(settingsForm.max_participants) : null,
            require_phone: settingsForm.require_phone,
            require_org: settingsForm.require_org,
            require_email: settingsForm.require_email,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('บันทึกการตั้งค่าโครงการเรียบร้อยแล้ว');
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Links */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-amber-400 text-amber-950">
                {projectType === 'REGISTRATION_AND_CERTIFICATE'
                  ? '🏅 มีระบบลงทะเบียน & ออกเกียรติบัตร'
                  : projectType === 'REGISTRATION_ONLY'
                  ? '📝 มีระบบลงทะเบียนเข้าร่วม'
                  : '📌 โครงการทั่วไป'}
              </span>
              {regConfig.is_active !== false ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  เปิดรับลงทะเบียน
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  ปิดรับลงทะเบียน
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              ระบบจัดการการลงทะเบียน & ออกเกียรติบัตร
            </h2>
            <p className="text-xs sm:text-sm text-blue-200/80 max-w-2xl">
              โครงการ: &ldquo;{project?.title}&rdquo;
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setShowQrModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              <QrCode className="w-4 h-4 text-amber-400" />
              <span>QR Code รับสมัคร</span>
            </button>

            <button
              onClick={() => handleCopyLink(publicRegUrl)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              <Copy className="w-4 h-4 text-blue-300" />
              <span>{copiedLink ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์รับสมัคร'}</span>
            </button>

            <a
              href={publicRegUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-extrabold transition shadow-md"
            >
              <ExternalLink className="w-4 h-4" />
              <span>เปิดหน้ารับสมัครจริง</span>
            </a>
          </div>
        </div>

        {/* Metrics Counter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <div className="text-[11px] text-blue-200">ผู้ลงทะเบียนทั้งหมด</div>
            <div className="text-2xl font-black text-white mt-0.5">{stats.total} <span className="text-xs font-normal text-blue-300">คน</span></div>
            {regConfig.max_participants && (
              <div className="text-[10px] text-blue-300/80 mt-0.5">จำกัด {regConfig.max_participants} คน</div>
            )}
          </div>

          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <div className="text-[11px] text-blue-200">เช็คอินหน้างานแล้ว</div>
            <div className="text-2xl font-black text-emerald-300 mt-0.5">{stats.checked_in} <span className="text-xs font-normal text-blue-300">คน</span></div>
            <div className="text-[10px] text-emerald-400/80 mt-0.5">
              {stats.total > 0 ? `${Math.round((stats.checked_in / stats.total) * 100)}% ของผู้ลงทะเบียน` : '-'}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <div className="text-[11px] text-blue-200">ผ่าน/รับเกียรติบัตรแล้ว</div>
            <div className="text-2xl font-black text-amber-300 mt-0.5">{stats.passed} <span className="text-xs font-normal text-blue-300">คน</span></div>
            <div className="text-[10px] text-amber-400/80 mt-0.5">พร้อมดาวน์โหลดเกียรติบัตร</div>
          </div>

          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <div className="text-[11px] text-blue-200">ที่นั่งว่างคงเหลือ</div>
            <div className="text-2xl font-black text-purple-300 mt-0.5">
              {regConfig.max_participants
                ? Math.max(0, Number(regConfig.max_participants) - stats.total)
                : '∞'} <span className="text-xs font-normal text-blue-300">ที่นั่ง</span>
            </div>
            <div className="text-[10px] text-purple-400/80 mt-0.5">
              {regConfig.max_participants ? 'ตามจำนวนรับสมัคร' : 'ไม่จำกัดจำนวน'}
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Nav */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setSubTab('attendees')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition ${
            subTab === 'attendees'
              ? 'border-blue-900 text-blue-900 bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>รายชื่อผู้ลงทะเบียน ({stats.total})</span>
        </button>

        <button
          onClick={() => setSubTab('certificate')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition ${
            subTab === 'certificate'
              ? 'border-amber-600 text-amber-700 bg-amber-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4 text-amber-600" />
          <span>ออกแบบใบประกาศนียบัตร (Studio)</span>
        </button>

        <button
          onClick={() => setSubTab('settings')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition ${
            subTab === 'settings'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>ตั้งค่าการลงทะเบียน & เงื่อนไข</span>
        </button>
      </div>

      {/* ========================================================
          SUB-TAB 1: ATTENDEE MANAGEMENT
      ======================================================== */}
      {subTab === 'attendees' && (
        <div className="space-y-4">
          {/* Action Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            {/* Search & Filter */}
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative min-w-[220px] flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchAttendees()}
                  placeholder="ค้นหาชื่อ, เบอร์โทร, สังกัด, เลขที่เกียรติบัตร..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg outline-none focus:border-blue-600 focus:bg-white transition"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg outline-none font-medium text-slate-700"
              >
                <option value="all">ทุกสถานะ ({stats.total})</option>
                <option value="registered">ลงทะเบียนแล้ว ({stats.registered})</option>
                <option value="checked_in">เช็คอินแล้ว ({stats.checked_in})</option>
                <option value="passed">ผ่านการอบรม/ได้เกียรติบัตร ({stats.passed})</option>
              </select>

              <button
                onClick={fetchAttendees}
                disabled={loadingAttendees}
                className="p-2 text-slate-600 hover:text-blue-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingAttendees ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setEditingAttendee(null);
                  setAttendeeForm({
                    title_name: '',
                    full_name: '',
                    position: '',
                    organization: '',
                    email: '',
                    phone: '',
                    citizen_id: '',
                    status: 'registered',
                    certificate_no: '',
                  });
                  setShowAttendeeModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มผู้เข้าร่วม</span>
              </button>

              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 transition"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>นำเข้ารายชื่อ</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-200 transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>ส่งออก CSV</span>
              </button>
            </div>
          </div>

          {/* Batch Actions Bar (When items selected) */}
          {selectedIds.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
              <div className="flex items-center gap-2">
                <span className="font-bold">เลือกแล้ว {selectedIds.length} รายการ:</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleBatchStatus('checked_in')}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold transition flex items-center gap-1"
                >
                  <CheckCircle className="w-3 h-3" />
                  <span>เช็คอินที่เลือก</span>
                </button>
                <button
                  onClick={() => handleBatchStatus('passed')}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-bold transition flex items-center gap-1"
                >
                  <Award className="w-3 h-3" />
                  <span>ออกเกียรติบัตรที่เลือก</span>
                </button>
                <button
                  onClick={() => setSelectedIds([])}
                  className="px-2.5 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-md transition"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          )}

          {/* Attendees Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={attendees.length > 0 && selectedIds.length === attendees.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(attendees.map((a) => a.id));
                          } else {
                            setSelectedIds([]);
                          }
                        }}
                        className="rounded"
                      />
                    </th>
                    <th className="p-3 w-12 text-center">ลำดับ</th>
                    <th className="p-3">ชื่อ-นามสกุล</th>
                    <th className="p-3">ตำแหน่ง / สังกัด</th>
                    <th className="p-3">เบอร์โทรศัพท์</th>
                    <th className="p-3 text-center">การเช็คอิน</th>
                    <th className="p-3 text-center">เกียรติบัตร</th>
                    <th className="p-3 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendees.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        {loadingAttendees ? 'กำลังโหลดข้อมูล...' : 'ยังไม่มีรายชื่อผู้ลงทะเบียน'}
                      </td>
                    </tr>
                  ) : (
                    attendees.map((att, idx) => {
                      const isChecked = selectedIds.includes(att.id);
                      const isPassed = att.status === 'passed';
                      const isCheckedIn = att.status === 'checked_in' || isPassed;

                      return (
                        <tr
                          key={att.id}
                          className={`hover:bg-slate-50/80 transition ${
                            isChecked ? 'bg-blue-50/40' : ''
                          }`}
                        >
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedIds((prev) => [...prev, att.id]);
                                } else {
                                  setSelectedIds((prev) => prev.filter((i) => i !== att.id));
                                }
                              }}
                              className="rounded"
                            />
                          </td>
                          <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="p-3">
                            <div className="font-bold text-slate-900">
                              {att.title_name} {att.full_name}
                            </div>
                            {att.email && <div className="text-[11px] text-slate-400">{att.email}</div>}
                          </td>
                          <td className="p-3">
                            <div className="text-slate-800">{att.organization || '-'}</div>
                            {att.position && (
                              <div className="text-[11px] text-slate-500">{att.position}</div>
                            )}
                          </td>
                          <td className="p-3 font-mono text-slate-600">{att.phone || '-'}</td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleToggleCheckIn(att)}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition inline-flex items-center gap-1 ${
                                isCheckedIn
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              <CheckCircle className="w-3 h-3" />
                              <span>{isCheckedIn ? 'เช็คอินแล้ว' : 'ยังไม่เช็คอิน'}</span>
                            </button>
                          </td>
                          <td className="p-3 text-center">
                            {isPassed ? (
                              <div className="flex flex-col items-center gap-1">
                                <button
                                  onClick={() => handleTogglePass(att)}
                                  className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 hover:bg-amber-200 transition inline-flex items-center gap-1"
                                >
                                  <Award className="w-3 h-3 text-amber-700" />
                                  <span>ผ่านการอบรม</span>
                                </button>
                                {att.certificate_no && (
                                  <span className="text-[10px] font-mono text-slate-500">
                                    {att.certificate_no}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={() => handleTogglePass(att)}
                                className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 hover:bg-amber-50 hover:text-amber-800 transition"
                              >
                                กดให้ออกเกียรติบัตร
                              </button>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {isPassed && (
                                <button
                                  onClick={() => setPreviewAttendee(att)}
                                  className="p-1.5 text-blue-700 hover:bg-blue-100 rounded-lg transition"
                                  title="ดูและพิมพ์เกียรติบัตร"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setEditingAttendee(att);
                                  setAttendeeForm({
                                    title_name: att.title_name || '',
                                    full_name: att.full_name || '',
                                    position: att.position || '',
                                    organization: att.organization || '',
                                    email: att.email || '',
                                    phone: att.phone || '',
                                    citizen_id: att.citizen_id || '',
                                    status: att.status || 'registered',
                                    certificate_no: att.certificate_no || '',
                                  });
                                  setShowAttendeeModal(true);
                                }}
                                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                                title="แก้ไข"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteAttendee(att.id)}
                                className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition"
                                title="ลบ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          SUB-TAB 2: CERTIFICATE STUDIO & DESIGNER
      ======================================================== */}
      {subTab === 'certificate' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls & Customizer Panel (Left 5 cols) */}
          <div className="lg:col-span-5 space-y-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-black text-slate-900">
                  ปรับแต่งรูปแบบใบประกาศนียบัตร
                </h3>
              </div>
              <button
                onClick={handleSaveCertConfig}
                disabled={savingCertConfig}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                {savingCertConfig ? 'กำลังบันทึก...' : '💾 บันทึกรูปแบบ'}
              </button>
            </div>

            {/* Theme Presets */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                เลือกรูปแบบแม่แบบ (Template Theme):
              </label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(THEME_STYLES).map(([key, item]) => {
                  const isSelected = studioConfig.template_theme === key;
                  if (key === 'custom') return null;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        setStudioConfig((prev) => ({
                          ...prev,
                          template_theme: key as any,
                          background_image: null,
                        }))
                      }
                      className={`p-2.5 rounded-xl border text-left text-xs font-bold transition flex flex-col gap-1 ${
                        isSelected && !studioConfig.background_image
                          ? 'border-amber-600 bg-amber-50 text-amber-950 ring-2 ring-amber-500/20'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Background Upload */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <ImageIcon className="w-4 h-4 text-indigo-600" />
                  <span>อัปโหลดภาพพื้นหลังเกียรติบัตร (Custom A4 Background)</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                รองรับไฟล์ภาพ JPG, PNG แนวนอน (ขนาดแนะนำ 2970 x 2100 px หรืออัตราส่วน A4)
              </p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  ref={bgFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUploadBg}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => bgFileInputRef.current?.click()}
                  disabled={uploadingBg}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingBg ? 'กำลังอัปโหลด...' : 'เลือกไฟล์ภาพพื้นหลัง'}</span>
                </button>

                {studioConfig.background_image && (
                  <button
                    type="button"
                    onClick={() =>
                      setStudioConfig((prev) => ({
                        ...prev,
                        background_image: null,
                        template_theme: 'classic_blue',
                      }))
                    }
                    className="px-2.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-semibold border border-rose-200 transition"
                  >
                    ลบพื้นหลังที่อัปโหลด
                  </button>
                )}
              </div>
            </div>

            {/* Editable Text Fields */}
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  หัวข้อบนเกียรติบัตร:
                </label>
                <input
                  type="text"
                  value={studioConfig.title}
                  onChange={(e) => setStudioConfig((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  ข้อความแสดงสถานะ:
                </label>
                <input
                  type="text"
                  value={studioConfig.subtitle}
                  onChange={(e) =>
                    setStudioConfig((prev) => ({ ...prev, subtitle: e.target.value }))
                  }
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  ชื่อหลักสูตร / โครงการที่ระบุ:
                </label>
                <input
                  type="text"
                  value={studioConfig.course_name}
                  onChange={(e) =>
                    setStudioConfig((prev) => ({ ...prev, course_name: e.target.value }))
                  }
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  ข้อความวันที่ออกเกียรติบัตร (หากเว้นว่างจะแสดงวันที่ปัจจุบันแบบอัตโนมัติ):
                </label>
                <input
                  type="text"
                  placeholder="เช่น ให้ไว้ ณ วันที่ ๒๔ กันยายน พ.ศ. ๒๕๖๙"
                  value={studioConfig.issue_date_text || ''}
                  onChange={(e) =>
                    setStudioConfig((prev) => ({ ...prev, issue_date_text: e.target.value }))
                  }
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  รหัสขึ้นต้นเลขที่เกียรติบัตร (Certificate Prefix):
                </label>
                <input
                  type="text"
                  value={studioConfig.certificate_no_prefix || ''}
                  onChange={(e) =>
                    setStudioConfig((prev) => ({
                      ...prev,
                      certificate_no_prefix: e.target.value,
                    }))
                  }
                  placeholder="เช่น CERT-2569-PRJ01"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-amber-600"
                />
              </div>
            </div>

            {/* Signatories 1 & 2 */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-900">ผู้ลงนามในเกียรติบัตร</h4>

              {/* Signatory 1 */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="text-[11px] font-bold text-slate-700">ผู้ลงนามที่ ๑ (ผู้อำนวยการ/ประธาน)</div>
                <input
                  type="text"
                  placeholder="ชื่อ-นามสกุล ผู้ลงนาม 1"
                  value={studioConfig.signatory_1_name || ''}
                  onChange={(e) =>
                    setStudioConfig((prev) => ({ ...prev, signatory_1_name: e.target.value }))
                  }
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none"
                />
                <input
                  type="text"
                  placeholder="ตำแหน่ง (เช่น ผู้อำนวยการวิทยาลัยอาชีวศึกษาเชียงราย)"
                  value={studioConfig.signatory_1_position || ''}
                  onChange={(e) =>
                    setStudioConfig((prev) => ({
                      ...prev,
                      signatory_1_position: e.target.value,
                    }))
                  }
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none"
                />
                <div className="flex items-center gap-2 pt-1">
                  <input
                    ref={sig1FileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadSignature(f, '1');
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => sig1FileInputRef.current?.click()}
                    disabled={uploadingSig1}
                    className="text-[11px] font-bold px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-md"
                  >
                    {uploadingSig1 ? 'กำลังอัปโหลด...' : '🖋️ อัปโหลดภาพลายเซ็น 1'}
                  </button>
                  {studioConfig.signatory_1_image && (
                    <span className="text-[10px] text-emerald-600 font-bold">✓ มีภาพลายเซ็นแล้ว</span>
                  )}
                </div>
              </div>

              {/* Signatory 2 */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="text-[11px] font-bold text-slate-700">ผู้ลงนามที่ ๒ (ผู้รับผิดชอบโครงการ/หัวหน้างาน)</div>
                <input
                  type="text"
                  placeholder="ชื่อ-นามสกุล ผู้ลงนาม 2"
                  value={studioConfig.signatory_2_name || ''}
                  onChange={(e) =>
                    setStudioConfig((prev) => ({ ...prev, signatory_2_name: e.target.value }))
                  }
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none"
                />
                <input
                  type="text"
                  placeholder="ตำแหน่ง (เช่น หัวหน้างานโครงการพิเศษและบริการชุมชน)"
                  value={studioConfig.signatory_2_position || ''}
                  onChange={(e) =>
                    setStudioConfig((prev) => ({
                      ...prev,
                      signatory_2_position: e.target.value,
                    }))
                  }
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none"
                />
                <div className="flex items-center gap-2 pt-1">
                  <input
                    ref={sig2FileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadSignature(f, '2');
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => sig2FileInputRef.current?.click()}
                    disabled={uploadingSig2}
                    className="text-[11px] font-bold px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-md"
                  >
                    {uploadingSig2 ? 'กำลังอัปโหลด...' : '🖋️ อัปโหลดภาพลายเซ็น 2'}
                  </button>
                  {studioConfig.signatory_2_image && (
                    <span className="text-[10px] text-emerald-600 font-bold">✓ มีภาพลายเซ็นแล้ว</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Live Studio Preview (Right 7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-900/90 backdrop-blur-md text-white p-3.5 rounded-2xl flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold">ตัวอย่างแบบจำลองเกียรติบัตร (Live Preview)</span>
              </div>
              <span className="text-[11px] text-slate-400">ขนาด A4 แนวนอน (Landscape)</span>
            </div>

            <CertificateRenderer
              attendee={{
                full_name: 'นายตัวอย่าง นามสมมุติ',
                organization: 'วิทยาลัยอาชีวศึกษาเชียงราย',
                position: 'ผู้เข้ารับการอบรม',
                certificate_no: `${studioConfig.certificate_no_prefix || 'CERT-2569'}-0001`,
                project_title: studioConfig.course_name || project?.title,
              }}
              config={studioConfig}
              showActions={true}
            />
          </div>
        </div>
      )}

      {/* ========================================================
          SUB-TAB 3: REGISTRATION SETTINGS
      ======================================================== */}
      {subTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="max-w-3xl bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-black text-slate-900">
              ตั้งค่าประเภทโครงการและระยะเวลารับลงทะเบียน
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              กำหนดประเภทโครงการ ช่วงเวลาเปิด-ปิดรับสมัคร และเงื่อนไขการรับข้อมูล
            </p>
          </div>

          {/* Project Type Select */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2">
              ประเภทโครงการ (Project & Activity Type):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'GENERAL',
                  title: 'โครงการทั่วไป',
                  desc: 'โครงการ/กิจกรรมภายใน ไม่ต้องมีระบบลงทะเบียน',
                  icon: '📌',
                },
                {
                  id: 'REGISTRATION_AND_CERTIFICATE',
                  title: 'ลงทะเบียน & เกียรติบัตร',
                  desc: 'เปิดรับสมัคร และออกใบประกาศนียบัตรเมื่อเสร็จสิ้น',
                  icon: '🏅',
                },
                {
                  id: 'REGISTRATION_ONLY',
                  title: 'ลงทะเบียนเข้าร่วมอย่างเดียว',
                  desc: 'เปิดรับลงทะเบียนนับจำนวนผู้เข้าร่วม (ไม่มีเกียรติบัตร)',
                  icon: '📝',
                },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSettingsForm((prev) => ({ ...prev, project_type: t.id }))}
                  className={`p-4 rounded-xl border text-left transition flex flex-col gap-1.5 ${
                    settingsForm.project_type === t.id
                      ? 'border-blue-900 bg-blue-50/60 ring-2 ring-blue-900/10'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xl">{t.icon}</span>
                  <span className="text-xs font-bold text-slate-900">{t.title}</span>
                  <span className="text-[11px] text-slate-500 leading-tight">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Registration Timing & Seats */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">กำหนดเวลาและโควตารับสมัคร</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsForm.is_active}
                  onChange={(e) => setSettingsForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded text-blue-900"
                />
                <span className="text-xs font-bold text-slate-700">เปิดรับสมัคร (Active)</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  วัน-เวลา เริ่มเปิดรับลงทะเบียน:
                </label>
                <input
                  type="datetime-local"
                  value={settingsForm.start_at}
                  onChange={(e) => setSettingsForm((prev) => ({ ...prev, start_at: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  วัน-เวลา ปิดรับลงทะเบียน:
                </label>
                <input
                  type="datetime-local"
                  value={settingsForm.end_at}
                  onChange={(e) => setSettingsForm((prev) => ({ ...prev, end_at: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                จำนวนผู้เข้าร่วมสูงสุด (คน) (เว้นว่างหากไม่จำกัด):
              </label>
              <input
                type="number"
                min="0"
                value={settingsForm.max_participants}
                onChange={(e) => setSettingsForm((prev) => ({ ...prev, max_participants: e.target.value }))}
                placeholder="เช่น 100"
                className="w-full max-w-xs px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-900"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-md transition"
            >
              {savingSettings ? 'กำลังบันทึก...' : '💾 บันทึกการตั้งค่า'}
            </button>
          </div>
        </form>
      )}

      {/* ========================================================
          MODAL: QR CODE & PUBLIC URL SHARING
      ======================================================== */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center">
              <QrCode className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">QR Code ลงทะเบียนเข้าร่วม</h3>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{project?.title}</p>
            </div>

            {/* QR Visual */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl inline-block mx-auto shadow-inner">
              <QRCodeSVG value={publicRegUrl} size={180} level="H" includeMargin />
            </div>

            <div className="space-y-2">
              <button
                onClick={() => handleCopyLink(publicRegUrl)}
                className="w-full py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Copy className="w-4 h-4" />
                <span>{copiedLink ? 'คัดลอกลิงก์สำเร็จแล้ว!' : 'คัดลอกลิงก์รับสมัคร'}</span>
              </button>

              <button
                onClick={() => handleCopyLink(publicCertUrl)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <Award className="w-4 h-4 text-amber-600" />
                <span>คัดลอกลิงก์ตรวจสอบเกียรติบัตร</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: ADD / EDIT ATTENDEE
      ======================================================== */}
      {showAttendeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowAttendeeModal(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 border-b pb-3">
              {editingAttendee ? 'แก้ไขข้อมูลผู้เข้าร่วม' : 'เพิ่มผู้เข้าร่วมโครงการ'}
            </h3>

            <form onSubmit={handleSaveAttendee} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">คำนำหน้า:</label>
                  <input
                    type="text"
                    placeholder="เช่น นาย, นาง, นางสาว"
                    value={attendeeForm.title_name}
                    onChange={(e) => setAttendeeForm((p) => ({ ...p, title_name: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">ชื่อ-นามสกุล (*):</label>
                  <input
                    type="text"
                    required
                    placeholder="ระบุชื่อและนามสกุล"
                    value={attendeeForm.full_name}
                    onChange={(e) => setAttendeeForm((p) => ({ ...p, full_name: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none focus:border-blue-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ตำแหน่ง:</label>
                  <input
                    type="text"
                    placeholder="เช่น ครู, นักศึกษา, เจ้าหน้าที่"
                    value={attendeeForm.position}
                    onChange={(e) => setAttendeeForm((p) => ({ ...p, position: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">หน่วยงาน / สังกัด:</label>
                  <input
                    type="text"
                    placeholder="เช่น วก.เชียงราย, แผนกวิชา..."
                    value={attendeeForm.organization}
                    onChange={(e) => setAttendeeForm((p) => ({ ...p, organization: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์:</label>
                  <input
                    type="text"
                    placeholder="08X-XXX-XXXX"
                    value={attendeeForm.phone}
                    onChange={(e) => setAttendeeForm((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">อีเมล:</label>
                  <input
                    type="email"
                    placeholder="example@email.com"
                    value={attendeeForm.email}
                    onChange={(e) => setAttendeeForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">สถานะผู้เข้าร่วม:</label>
                  <select
                    value={attendeeForm.status}
                    onChange={(e) => setAttendeeForm((p) => ({ ...p, status: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none font-bold"
                  >
                    <option value="registered">ลงทะเบียนแล้ว</option>
                    <option value="checked_in">เช็คอินแล้ว</option>
                    <option value="passed">ผ่านการอบรม (ออกเกียรติบัตร)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">เลขที่เกียรติบัตร (ถ้ามี):</label>
                  <input
                    type="text"
                    placeholder="เว้นว่างเพื่อให้ระบบกำหนดอัตโนมัติ"
                    value={attendeeForm.certificate_no}
                    onChange={(e) => setAttendeeForm((p) => ({ ...p, certificate_no: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAttendeeModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingAttendee}
                  className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold shadow-xs transition"
                >
                  {savingAttendee ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: BATCH IMPORT ATTENDEES (CSV / TEXT)
      ======================================================== */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowImportModal(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-base font-bold text-slate-900">
                นำเข้ารายชื่อผู้เข้าร่วมแบบกลุ่ม (Batch Import)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                คัดลอกรายชื่อจากตาราง Excel หรือข้อความวางลงในช่องนี้ 1 บรรทัดต่อ 1 คน
                <br />
                รูปแบบคอลัมน์: <span className="font-mono text-blue-900">ชื่อ-นามสกุล, ตำแหน่ง, หน่วยงาน, เบอร์โทร, อีเมล</span>
              </p>
            </div>

            <textarea
              rows={8}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="ตัวอย่าง:&#10;นายสมชาย ใจดี, ครูชำนาญการ, วิทยาลัยอาชีวศึกษาเชียงราย, 0812345678, somchai@mail.com&#10;นางสาวสมหญิง รักเรียน, นักเรียน, แผนกวิชาการบัญชี, 0898765432"
              className="w-full p-3 text-xs font-mono border border-slate-300 rounded-xl outline-none focus:border-blue-900"
            />

            <div className="flex items-center justify-between gap-3 pt-2">
              <span className="text-xs text-slate-500">
                จำนวนบรรทัด: {importText.split('\n').filter((l) => l.trim()).length} รายการ
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleBatchImport}
                  disabled={importing || !importText.trim()}
                  className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs transition"
                >
                  {importing ? 'กำลังนำเข้า...' : 'นำเข้ารายชื่อ'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: PREVIEW ATTENDEE CERTIFICATE
      ======================================================== */}
      {previewAttendee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 text-white rounded-2xl max-w-4xl w-full p-6 space-y-4 shadow-2xl relative my-8">
            <button
              onClick={() => setPreviewAttendee(null)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold">
                  เกียรติบัตร: {previewAttendee.title_name} {previewAttendee.full_name}
                </h3>
              </div>
            </div>

            <CertificateRenderer
              attendee={{
                full_name: previewAttendee.full_name,
                title_name: previewAttendee.title_name,
                organization: previewAttendee.organization,
                position: previewAttendee.position,
                certificate_no: previewAttendee.certificate_no || `${studioConfig.certificate_no_prefix || 'CERT-2569'}-${String(previewAttendee.id).padStart(4, '0')}`,
                project_title: studioConfig.course_name || project?.title,
                issue_date: previewAttendee.checked_in_at || new Date().toISOString(),
              }}
              config={studioConfig}
              showActions={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}
