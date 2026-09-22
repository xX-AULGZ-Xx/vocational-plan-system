'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import { getCurrentThaiFiscalYear } from '@/lib/bahttext';
import AccessDenied from '@/components/common/AccessDenied';
import ModalPortal from '@/components/ui/ModalPortal';
import {
  Settings,
  Building,
  User,
  Save,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Phone,
  Mail,
  Globe,
  MapPin,
  Clock,
  Key,
  ExternalLink,
  ShieldCheck,
  HelpCircle,
  FlaskConical,
  Sparkles,
  Palette,
  Check,
  Type,
  Layout,
  Sliders,
  Code,
  Trash2,
  Plus,
  Edit2,
  X,
  Bell,
  Send,
  Volume2,
  Radio,
  Users,
  RefreshCw,
  Activity,
  CheckCircle,
  XCircle,
  Database,
  Shield,
  Zap,
  Gauge,
  TrendingUp,
  BarChart3,
  Cpu,
  Layers,
  CheckSquare,
  FolderGit2,
  LayoutDashboard,
  Target,
  Building2,
} from 'lucide-react';
import { showAlert } from '@/lib/sweetalert';

export default function AdminSettingsPage() {
  const { user, token } = useAuth();
  const { refreshSettings } = useSettings();

  // Protect route
  if (user && user.role !== 'ADMIN') {
    return <AccessDenied requiredRole="ผู้ดูแลระบบ (ADMIN)" />;
  }

  const [settings, setSettings] = useState<Record<string, string>>({
    college_name: 'วิทยาลัยการอาชีพเชียงราย',
    college_name_en: 'Chiangrai Industrial And Community Education College',
    college_address: 'เลขที่ ๑๒๓ หมู่ ๑๑ ตำบลท่าสาย อำเภอเมืองเชียงราย จังหวัดเชียงราย ๕๗๐๐๐',
    college_phone: '053-774505',
    college_email: 'cic.chiangrai@vec.mail.go.th',
    college_website: 'www.cic.ac.th',
    current_fiscal_year: String(getCurrentThaiFiscalYear()),
    is_submission_open: 'true',
    submission_start_date: '',
    submission_end_date: '',
    enable_test_mode: 'true',
    director_name: 'นางปิยะพร พูลเพิ่ม',
    director_position: 'ผู้อำนวยการวิทยาลัยการอาชีพเชียงราย',
    google_client_id: '',
    google_allowed_domains: 'cric.ac.th, vec.mail.go.th',
    smtp_enabled: 'false',
    smtp_host: 'smtp.gmail.com',
    smtp_port: '587',
    smtp_secure: 'false',
    smtp_user: '',
    smtp_pass: '',
    smtp_from_name: 'ระบบบริหารจัดการโครงการ วก.เชียงราย',
    smtp_from_email: '',
    theme_preset: 'royal_blue',
    theme_primary_color: '#1e3a8a',
    theme_primary_hover: '#172554',
    theme_accent_color: '#0d9488',
    theme_font_family: 'Prompt',
    theme_sidebar_style: 'dark',
    theme_border_radius: 'md',
    developer_info: 'พัฒนาระบบโดย งานส่งเสริมการวิจัย นวัตกรรม และสิ่งประดิษฐ์ ร่วมกับ งานศูนย์ข้อมูลสารสนเทศ',
    project_code_template: 'PRJ-{YEAR}-{DIV}-{NUM}',
    project_code_digits: '4',
  });

  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  // In-app & Real-time Notification Test states
  const [testingNotification, setTestingNotification] = useState(false);
  const [testNotiResult, setTestNotiResult] = useState<{ success: boolean; message: string; timestamp?: string } | null>(null);
  const [testNotiTarget, setTestNotiTarget] = useState<'ALL' | 'ME'>('ALL');
  const [testNotiType, setTestNotiType] = useState<string>('PROJECT_APPROVED');
  const [testNotiTitle, setTestNotiTitle] = useState('🔔 ทดสอบระบบแจ้งเตือน Real-time');
  const [testNotiMessage, setTestNotiMessage] = useState('โครงการ "นวัตกรรมสิ่งประดิษฐ์เพื่อชุมชน" ได้รับการอนุมัติในขั้นตอนที่ ๔ เรียบร้อยแล้ว');
  const [testNotiSendEmail, setTestNotiSendEmail] = useState(false);

  // Users Connection Test states
  const [testingUsers, setTestingUsers] = useState(false);
  const [usersTestResult, setUsersTestResult] = useState<{
    success: boolean;
    timestamp?: string;
    latency_ms?: number;
    database?: {
      connected: boolean;
      total_users: number;
      active_users: number;
      inactive_users: number;
    };
    summary?: {
      total_roles: number;
      ready_count: number;
      missing_count: number;
      inactive_count: number;
      incomplete_count: number;
      all_ready: boolean;
    };
    roles?: Array<{
      key: string;
      role: string;
      role_name_th: string;
      step_label: string;
      expected_username: string;
      status: 'READY' | 'MISSING' | 'INACTIVE' | 'INCOMPLETE';
      status_label: string;
      matched_by: string | null;
      user_id: string | null;
      username: string | null;
      full_name: string | null;
      position: string;
      email: string;
      department_name: string;
      division_name: string;
      is_active: boolean;
      has_password: boolean;
      has_google: boolean;
      can_login: boolean;
    }>;
    message?: string;
  } | null>(null);

  // Load Test / Concurrency Test states
  const [testingLoad, setTestingLoad] = useState(false);
  const [loadTestMode, setLoadTestMode] = useState<'auto_detect' | 'fixed'>('auto_detect');
  const [loadTestScenario, setLoadTestScenario] = useState<'full_system' | 'high_traffic_submission' | 'approval_storm' | 'analytics_reporting'>('full_system');
  const [loadTestConcurrency, setLoadTestConcurrency] = useState<number>(50);
  const [loadTestRequestsPerUser, setLoadTestRequestsPerUser] = useState<number>(3);
  const [loadTestDurationMinutes, setLoadTestDurationMinutes] = useState<number>(0);
  const [loadTestResult, setLoadTestResult] = useState<{
    success: boolean;
    timestamp?: string;
    mode?: string;
    scenario?: string;
    total_duration_ms?: number;
    summary?: {
      max_safe_concurrent_users: number;
      max_tested_concurrent_users: number;
      estimated_capacity_label: string;
      duration_minutes_configured?: number;
      duration_seconds?: number;
      total_requests: number;
      successful_requests: number;
      failed_requests: number;
      overall_error_rate_pct: number;
      overall_avg_latency_ms: number;
      peak_throughput_rps: number;
      memory_heap_used_mb: number;
      memory_heap_total_mb: number;
      assessment: string;
      status: 'HEALTHY' | 'WARNING';
    };
    stages?: Array<{
      concurrency: number;
      requests_per_worker: number;
      total_requests: number;
      success_count: number;
      error_count: number;
      error_rate_pct: number;
      duration_ms: number;
      throughput_rps: number;
      min_latency_ms: number;
      max_latency_ms: number;
      avg_latency_ms: number;
      p95_latency_ms: number;
      p99_latency_ms: number;
      grade: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'DEGRADED' | 'FAILED';
      passed: boolean;
      errors?: string[];
    }>;
    modules?: Array<{
      key: string;
      name_th: string;
      icon: string;
      count: number;
      avg_latency_ms: number;
      p95_latency_ms: number;
    }>;
    message?: string;
  } | null>(null);

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [existingFiscalYears, setExistingFiscalYears] = useState<any[]>([]);
  const [deletingYear, setDeletingYear] = useState<number | null>(null);
  const [showAddYearModal, setShowAddYearModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newYearInput, setNewYearInput] = useState(String(getCurrentThaiFiscalYear() + 1));
  const [setAsActiveYear, setSetAsActiveYear] = useState(false);
  const [addingYear, setAddingYear] = useState(false);

  const handleSetActiveYear = async (year: number) => {
    handleChange('current_fiscal_year', String(year));
    try {
      const res = await fetch('/api/v1/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...settings, current_fiscal_year: String(year) }),
      });
      const data = await res.json();
      if (data.success) {
        await refreshSettings();
        fetchFiscalYears();
        showAlert.success('สำเร็จ', `เปลี่ยนปีงบประมาณปัจจุบันเป็น พ.ศ. ${year} เรียบร้อยแล้ว`);
      } else {
        showAlert.error('ผิดพลาด', data.message || 'ไม่สามารถเปลี่ยนปีงบประมาณได้');
      }
    } catch (err: any) {
      showAlert.error('ผิดพลาด', err.message || 'เกิดข้อผิดพลาดในการเปลี่ยนปีงบประมาณ');
    }
  };

  const handleAddFiscalYear = async (e: React.FormEvent) => {
    e.preventDefault();
    const year = parseInt(newYearInput, 10);
    if (isNaN(year) || year < 2500 || year > 2600) {
      showAlert.error('ข้อมูลไม่ถูกต้อง', 'กรุณาระบุปี พ.ศ. ให้ถูกต้อง (เช่น 2568, 2569)');
      return;
    }

    setAddingYear(true);
    try {
      const res = await fetch('/api/v1/admin/fiscal-years', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fiscal_year: year,
          set_active: setAsActiveYear,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showAlert.success('สำเร็จ', data.message || `เพิ่มปีงบประมาณ พ.ศ. ${year} สำเร็จ`);
        setShowAddYearModal(false);
        if (setAsActiveYear) {
          handleChange('current_fiscal_year', String(year));
          await refreshSettings();
        }
        fetchFiscalYears();
      } else {
        showAlert.error('ผิดพลาด', data.message || 'ไม่สามารถเพิ่มปีงบประมาณได้');
      }
    } catch (err: any) {
      showAlert.error('ผิดพลาด', err.message || 'เกิดข้อผิดพลาดในการบันทึกปีงบประมาณ');
    } finally {
      setAddingYear(false);
    }
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'theme' | 'college' | 'budget' | 'director' | 'email' | 'google'>('all');

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMsg({ type: 'error', text: 'กรุณาเลือกไฟล์รูปภาพที่ถูกต้อง (.png, .jpg, .svg, .webp)' });
      return;
    }

    setUploadingLogo(true);
    setMsg(null);

    const formData = new FormData();
    formData.append('logo', file);

    try {
      const res = await fetch('/api/v1/admin/settings/upload-logo', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'ไม่สามารถอัปโหลดโลโก้ได้');
      }

      setSettings((prev) => ({ ...prev, college_logo_url: data.logoUrl }));
      await refreshSettings();
      setMsg({ type: 'success', text: 'อัปโหลดและตั้งค่าตราสัญลักษณ์/โลโก้วิทยาลัยเรียบร้อยแล้ว' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'เกิดข้อผิดพลาดในการอัปโหลดโลโก้' });
    } finally {
      setUploadingLogo(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchFiscalYears();
  }, [token]);

  const fetchFiscalYears = async () => {
    try {
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/v1/admin/fiscal-years', { headers });
      const data = await res.json();
      if (data.success) {
        setExistingFiscalYears(data.data || []);
      }
    } catch (e) {
      console.error('Failed to load fiscal years', e);
    }
  };

  const handleDeleteFiscalYear = async (year: number, projectCount: number) => {
    const confirmText = projectCount > 0
      ? `คุณต้องการลบข้อมูลปีงบประมาณ พ.ศ. ${year} ใช่หรือไม่?\n\n⚠️ คำเตือน: ระบบจะลบโครงการทั้งหมดในรอบปีนี้ (${projectCount} โครงการ) และข้อมูลแผนยุทธศาสตร์ที่เกี่ยวข้องอย่างถาวร!`
      : `คุณต้องการลบข้อมูลปีงบประมาณ พ.ศ. ${year} ใช่หรือไม่?`;

    const confirmed = await showAlert.confirm(`ยืนยันการลบปีงบประมาณ ${year}`, confirmText);
    if (!confirmed) return;

    setDeletingYear(year);
    try {
      const res = await fetch(`/api/v1/admin/fiscal-years/${year}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        showAlert.success('ลบปีงบประมาณสำเร็จ', data.message);
        fetchFiscalYears();
        // If current_fiscal_year matches deleted year, reset to calculated year
        if (String(settings.current_fiscal_year) === String(year)) {
          handleChange('current_fiscal_year', String(getCurrentThaiFiscalYear()));
        }
      } else {
        showAlert.error('ลบไม่สำเร็จ', data.message);
      }
    } catch (e: any) {
      showAlert.error('ข้อผิดพลาด', e.message || 'เกิดข้อผิดพลาดในการลบข้อมูลปีงบประมาณ');
    } finally {
      setDeletingYear(null);
    }
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/v1/admin/settings', { headers });
      const data = await res.json();
      if (data.success && data.data) {
        setSettings((prev) => ({ ...prev, ...data.data }));
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setMsg(null);

    try {
      const res = await fetch('/api/v1/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      await refreshSettings();
      setMsg({ type: 'success', text: 'บันทึกการตั้งค่าระบบเรียบร้อยแล้ว' });
      
      // Auto dismiss success message after 4s
      setTimeout(() => {
        setMsg((current) => (current?.type === 'success' ? null : current));
      }, 4000);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'เกิดข้อผิดพลาดในการบันทึก' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleTestEmail = async () => {
    if (!testEmailRecipient || !testEmailRecipient.trim()) {
      setTestEmailResult({ success: false, message: 'กรุณาระบุอีเมลผู้รับเพื่อทดสอบ' });
      return;
    }

    setTestingEmail(true);
    setTestEmailResult(null);

    try {
      const res = await fetch('/api/v1/admin/settings/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: testEmailRecipient.trim(),
          host: settings.smtp_host,
          port: settings.smtp_port,
          secure: settings.smtp_secure,
          user: settings.smtp_user,
          pass: settings.smtp_pass,
          fromName: settings.smtp_from_name,
          fromEmail: settings.smtp_from_email,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTestEmailResult({ success: true, message: data.message });
      } else {
        setTestEmailResult({ success: false, message: data.message || 'ส่งอีเมลทดสอบไม่สำเร็จ' });
      }
    } catch (err: any) {
      setTestEmailResult({ success: false, message: `เกิดข้อผิดพลาด: ${err.message}` });
    } finally {
      setTestingEmail(false);
    }
  };

  const applyNotiPreset = (type: string) => {
    setTestNotiType(type);
    if (type === 'PROJECT_APPROVED') {
      setTestNotiTitle('✅ โครงการได้รับการอนุมัติเรียบร้อย');
      setTestNotiMessage('โครงการ "นวัตกรรมและสิ่งประดิษฐ์เพื่อชุมชน" ผ่านการลงนามอนุมัติจาก ผอ.วิทยาลัย ครบ ๔ ขั้นตอนแล้ว');
    } else if (type === 'PROJECT_SUBMITTED') {
      setTestNotiTitle('📥 มีคำขอพิจารณาโครงการใหม่');
      setTestNotiMessage('แผนกวิชาช่างยนต์ ได้ยื่นเสนอโครงการใหม่เข้าสู่ระบบ รอการพิจารณาในบทบาทของท่าน');
    } else if (type === 'PROJECT_REVISED') {
      setTestNotiTitle('📝 ขอให้แก้ไขรายละเอียดโครงการ');
      setTestNotiMessage('รอง ผอ. ประจำฝ่าย มีข้อเสนอแนะเพิ่มเติม กรุณาปรับแก้ตารางค่าใช้จ่ายตามแบบฟอร์ม');
    } else if (type === 'SYSTEM') {
      setTestNotiTitle('📢 แจ้งเตือนจากผู้ดูแลระบบ');
      setTestNotiMessage('ระบบบริหารจัดการโครงการและแผนงานปฏิบัติการ ทำงานได้ตามปกติและพร้อมใช้งาน');
    }
  };

  const handleTestNotification = async () => {
    setTestingNotification(true);
    setTestNotiResult(null);
    try {
      const res = await fetch('/api/v1/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: testNotiTitle.trim() || undefined,
          message: testNotiMessage.trim() || undefined,
          type: testNotiType || 'PROJECT_APPROVED',
          linkUrl: '/admin/settings',
          sendEmail: testNotiSendEmail && isSmtpEnabled,
          target: testNotiTarget,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTestNotiResult({
          success: true,
          message: data.message || 'ส่งการแจ้งเตือนทดสอบเรียบร้อยแล้ว (Real-time Notification Sent)',
          timestamp: new Date().toLocaleTimeString('th-TH'),
        });
        showAlert.success(
          '🔔 ทดสอบส่งการแจ้งเตือนสำเร็จ!',
          'ระบบได้ทำการส่งสัญญาณ Real-time (WebSocket & SSE), แสดงข้อความ และเล่นเสียงแจ้งเตือนเรียบร้อยแล้ว'
        );
      } else {
        setTestNotiResult({ success: false, message: data.message || 'ส่งการแจ้งเตือนไม่สำเร็จ' });
        showAlert.error('ผิดพลาด', data.message || 'ส่งการแจ้งเตือนไม่สำเร็จ');
      }
    } catch (err: any) {
      setTestNotiResult({ success: false, message: `เกิดข้อผิดพลาด: ${err.message}` });
      showAlert.error('ข้อผิดพลาด', err.message || 'เชื่อมต่อกับเซิร์ฟเวอร์ไม่สำเร็จ');
    } finally {
      setTestingNotification(false);
    }
  };

  const handleTestUsersConnection = async () => {
    setTestingUsers(true);
    try {
      const res = await fetch('/api/v1/admin/settings/test-users-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const contentType = res.headers.get('content-type');
      let data: any;
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || `เซิร์ฟเวอร์ตอบกลับด้วยรหัส ${res.status}`);
      }
      if (res.ok && data.success) {
        setUsersTestResult(data);
        if (data.summary?.all_ready) {
          showAlert.success('การเชื่อมต่อสมบูรณ์', `พบบัญชีผู้ใช้พร้อมใช้งานครบทั้ง ${data.summary?.ready_count} บทบาทหลัก (ความเร็ว ${data.latency_ms} ms)`);
        } else {
          showAlert.warning('ผลการตรวจสอบบัญชี', `พร้อมใช้งาน ${data.summary?.ready_count || 0}/${data.summary?.total_roles || 0} บทบาท กรุณาตรวจสอบสถานะด้านล่าง`);
        }
      } else {
        setUsersTestResult({
          success: false,
          message: data.message || 'ไม่สามารถทดสอบการเชื่อมต่อบัญชีผู้ใช้ได้',
        });
        showAlert.error('ทดสอบไม่สำเร็จ', data.message || 'ไม่สามารถทดสอบการเชื่อมต่อได้');
      }
    } catch (err: any) {
      setUsersTestResult({
        success: false,
        message: err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์',
      });
      showAlert.error('ผิดพลาด', err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setTestingUsers(false);
    }
  };

  const handleStartLoadTest = async () => {
    setTestingLoad(true);
    setLoadTestResult(null);
    try {
      const res = await fetch('/api/v1/admin/settings/load-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mode: loadTestMode,
          scenario: loadTestScenario,
          concurrency: loadTestConcurrency,
          requestsPerUser: loadTestRequestsPerUser,
          durationMinutes: loadTestDurationMinutes,
        }),
      });
      const contentType = res.headers.get('content-type');
      let data: any;
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || `เซิร์ฟเวอร์ตอบกลับด้วยรหัส ${res.status}`);
      }
      if (res.ok && data.success) {
        setLoadTestResult(data);
        if (data.summary?.overall_error_rate_pct === 0) {
          showAlert.success(
            'การจำลองโหลดสำเร็จ',
            `ระบบรองรับได้อย่างปลอดภัยสูงสุด ${data.summary?.max_safe_concurrent_users} ผู้ใช้พร้อมกัน (ความเร็วเฉลี่ย ${data.summary?.overall_avg_latency_ms} ms)`
          );
        } else {
          showAlert.warning(
            'ผลการจำลองโหลด',
            `ผ่านการทดสอบที่ ${data.summary?.max_safe_concurrent_users} ผู้ใช้พร้อมกัน (มีข้อผิดพลาดบางส่วนที่ระดับสูง)`
          );
        }
      } else {
        const errorMsg = data?.message || data?.error || `เซิร์ฟเวอร์ตอบกลับด้วยรหัส ${res.status}`;
        setLoadTestResult({
          success: false,
          message: errorMsg,
        });
        showAlert.error('ผิดพลาด', errorMsg);
      }
    } catch (err: any) {
      const errMsg = err?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
      setLoadTestResult({
        success: false,
        message: errMsg,
      });
      showAlert.error('ผิดพลาด', errMsg);
    } finally {
      setTestingLoad(false);
    }
  };

  const isSubmissionOpen = settings.is_submission_open !== 'false';
  const isSmtpEnabled = settings.smtp_enabled === 'true';
  const hasGoogleClientId = Boolean(
    settings.google_client_id &&
    settings.google_client_id.trim().length > 10 &&
    !settings.google_client_id.includes('YOUR_GOOGLE_CLIENT_ID')
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-theme-primary text-white rounded-theme shadow-xs">
              <Settings className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">ตั้งค่าระบบ</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            กำหนดข้อมูลสถานศึกษา ข้อมูลติดต่อ ระบบงบประมาณ การแจ้งเตือนทางอีเมล (SMTP) และการเชื่อมต่อ Google Sign-In
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving || loading}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-theme bg-theme-primary hover:bg-theme-primary-hover text-white shadow-md transition disabled:opacity-50 active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}</span>
          </button>
        </div>
      </div>

      {/* Alert Notifications */}
      {msg && (
        <div
          className={`p-3.5 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2.5 transition-all shadow-sm ${
            msg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {msg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Navigation Filter Tabs (Mobile Scrollable) */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto text-xs font-medium text-slate-600 no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-3.5 py-2 rounded-lg whitespace-nowrap transition-colors ${
            activeTab === 'all' ? 'bg-white text-blue-900 font-bold shadow-sm' : 'hover:text-slate-900'
          }`}
        >
          ทั้งหมด
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('theme')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg whitespace-nowrap transition-colors ${
            activeTab === 'theme' ? 'bg-white text-blue-900 font-bold shadow-sm' : 'hover:text-slate-900'
          }`}
        >
          <Palette className="w-4 h-4 text-purple-600" />
          ธีม & โทนสีหน้าเว็บ (Theme)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('college')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg whitespace-nowrap transition-colors ${
            activeTab === 'college' ? 'bg-white text-blue-900 font-bold shadow-sm' : 'hover:text-slate-900'
          }`}
        >
          <Building className="w-4 h-4" />
          ข้อมูลสถานศึกษา & ติดต่อ
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('budget')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg whitespace-nowrap transition-colors ${
            activeTab === 'budget' ? 'bg-white text-blue-900 font-bold shadow-sm' : 'hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          งบประมาณ & เวลาเสนอโครงการ
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('director')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg whitespace-nowrap transition-colors ${
            activeTab === 'director' ? 'bg-white text-blue-900 font-bold shadow-sm' : 'hover:text-slate-900'
          }`}
        >
          <User className="w-4 h-4" />
          ข้อมูลผู้บริหาร
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('email')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg whitespace-nowrap transition-colors ${
            activeTab === 'email' ? 'bg-white text-blue-900 font-bold shadow-sm' : 'hover:text-slate-900'
          }`}
        >
          <Bell className="w-4 h-4 text-blue-600" />
          การแจ้งเตือน & อีเมล
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('google')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg whitespace-nowrap transition-colors ${
            activeTab === 'google' ? 'bg-white text-blue-900 font-bold shadow-sm' : 'hover:text-slate-900'
          }`}
        >
          <Key className="w-4 h-4 text-red-500" />
          Google OAuth / ล็อกอิน
        </button>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400 text-sm bg-white rounded-xl border border-slate-200">
          <div className="w-8 h-8 border-2 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          กำลังโหลดการตั้งค่าระบบ...
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Section 0: Theme & UI Customization */}
          {(activeTab === 'all' || activeTab === 'theme') && (
            <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-purple-50 text-purple-700 rounded-md">
                    <Palette className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 text-sm sm:text-base">การปรับแต่งธีมและหน้าตาระบบ (Theme & UI Settings)</h2>
                    <p className="text-[11px] sm:text-xs text-slate-500">
                      ปรับเปลี่ยนโทนสีหลัก ฟอนต์ รูปแบบเมนูข้าง และความโค้งมนขององค์ประกอบทั้งหมดในระบบ (มีผลต่อผู้ใช้งานทุกคน)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                    Admin Only
                  </span>
                </div>
              </div>

              {/* 1. Quick Presets */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>เลือกโทนสีสำเร็จรูป (Quick Theme Presets):</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  {[
                    { id: 'royal_blue', name: 'Royal Blue (มาตรฐาน)', primary: '#1e3a8a', hover: '#172554', accent: '#0d9488' },
                    { id: 'emerald', name: 'Emerald Forest (เขียวมรกต)', primary: '#047857', hover: '#065f46', accent: '#d97706' },
                    { id: 'purple', name: 'Royal Purple (ม่วงหรู)', primary: '#6b21a8', hover: '#581c87', accent: '#0284c7' },
                    { id: 'amber', name: 'Warm Amber (ส้มทอง/ชาไทย)', primary: '#b45309', hover: '#92400e', accent: '#0369a1' },
                    { id: 'crimson', name: 'Crimson Maroon (แดงเลือดนก)', primary: '#991b1b', hover: '#7f1d1d', accent: '#0891b2' },
                    { id: 'slate', name: 'Midnight Slate (เทาเข้มมินิมอล)', primary: '#1e293b', hover: '#0f172a', accent: '#3b82f6' },
                  ].map((preset) => {
                    const isSelected = settings.theme_preset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setSettings((prev) => ({
                            ...prev,
                            theme_preset: preset.id,
                            theme_primary_color: preset.primary,
                            theme_primary_hover: preset.hover,
                            theme_accent_color: preset.accent,
                          }));
                        }}
                        className={`p-3 rounded-xl border text-left transition relative flex flex-col justify-between h-20 ${
                          isSelected
                            ? 'border-purple-600 ring-2 ring-purple-600/30 bg-purple-50/40 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full border border-white shadow-xs" style={{ backgroundColor: preset.primary }} />
                            <span className="w-3 h-3 rounded-full border border-white shadow-xs" style={{ backgroundColor: preset.accent }} />
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-purple-600 shrink-0" />}
                        </div>
                        <span className={`text-[11px] font-bold truncate leading-tight ${isSelected ? 'text-purple-950' : 'text-slate-700'}`}>
                          {preset.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Custom Color Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>สีหลักของระบบ (Primary Color)</span>
                    <span className="font-mono text-[10px] text-slate-500">{settings.theme_primary_color || '#1e3a8a'}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.theme_primary_color || '#1e3a8a'}
                      onChange={(e) => {
                        handleChange('theme_primary_color', e.target.value);
                        handleChange('theme_preset', 'custom');
                      }}
                      className="w-10 h-10 p-0.5 rounded-lg border border-slate-300 cursor-pointer bg-white"
                    />
                    <input
                      type="text"
                      value={settings.theme_primary_color || '#1e3a8a'}
                      onChange={(e) => {
                        handleChange('theme_primary_color', e.target.value);
                        handleChange('theme_preset', 'custom');
                      }}
                      placeholder="#1e3a8a"
                      className="flex-1 px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg outline-none focus:border-purple-600 transition uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>สีหลักตอน Hover (Primary Hover)</span>
                    <span className="font-mono text-[10px] text-slate-500">{settings.theme_primary_hover || '#172554'}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.theme_primary_hover || '#172554'}
                      onChange={(e) => {
                        handleChange('theme_primary_hover', e.target.value);
                        handleChange('theme_preset', 'custom');
                      }}
                      className="w-10 h-10 p-0.5 rounded-lg border border-slate-300 cursor-pointer bg-white"
                    />
                    <input
                      type="text"
                      value={settings.theme_primary_hover || '#172554'}
                      onChange={(e) => {
                        handleChange('theme_primary_hover', e.target.value);
                        handleChange('theme_preset', 'custom');
                      }}
                      placeholder="#172554"
                      className="flex-1 px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg outline-none focus:border-purple-600 transition uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>สีเน้นเสริม (Accent / Highlight Color)</span>
                    <span className="font-mono text-[10px] text-slate-500">{settings.theme_accent_color || '#0d9488'}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.theme_accent_color || '#0d9488'}
                      onChange={(e) => {
                        handleChange('theme_accent_color', e.target.value);
                        handleChange('theme_preset', 'custom');
                      }}
                      className="w-10 h-10 p-0.5 rounded-lg border border-slate-300 cursor-pointer bg-white"
                    />
                    <input
                      type="text"
                      value={settings.theme_accent_color || '#0d9488'}
                      onChange={(e) => {
                        handleChange('theme_accent_color', e.target.value);
                        handleChange('theme_preset', 'custom');
                      }}
                      placeholder="#0d9488"
                      className="flex-1 px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg outline-none focus:border-purple-600 transition uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Typography & UI Style */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                {/* Font Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5 text-slate-500" />
                    <span>ฟอนต์หลักของระบบ (UI Font)</span>
                  </label>
                  <select
                    value={settings.theme_font_family || 'Prompt'}
                    onChange={(e) => handleChange('theme_font_family', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-purple-600 transition bg-white"
                  >
                    <option value="Prompt">Prompt (แนะนำ - โมเดิร์น คมชัด อ่านง่าย)</option>
                    <option value="Sarabun">Sarabun (ทางการ มาตรฐานราชการ)</option>
                    <option value="Kanit">Kanit (โดดเด่น สวยงาม)</option>
                    <option value="Noto Sans Thai">Noto Sans Thai (มาตรฐานสากล)</option>
                    <option value="Mitr">Mitr (เป็นมิตร ทันสมัย)</option>
                    <option value="Bai Jamjuree">Bai Jamjuree (เหลี่ยมเรียบหรู)</option>
                    <option value="K2D">K2D (ล้ำสมัย)</option>
                  </select>
                </div>

                {/* Sidebar Style */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Layout className="w-3.5 h-3.5 text-slate-500" />
                    <span>สไตล์แถบเมนูข้าง (Sidebar)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleChange('theme_sidebar_style', 'dark')}
                      className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                        settings.theme_sidebar_style !== 'light'
                          ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>🌙 Dark (สีมืด)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange('theme_sidebar_style', 'light')}
                      className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                        settings.theme_sidebar_style === 'light'
                          ? 'border-purple-600 bg-purple-50 text-purple-900 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>☀️ Light (สีสว่าง)</span>
                    </button>
                  </div>
                </div>

                {/* Border Radius */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-slate-500" />
                    <span>ความโค้งมนของปุ่ม/กล่อง (Corner Radius)</span>
                  </label>
                  <select
                    value={settings.theme_border_radius || 'md'}
                    onChange={(e) => handleChange('theme_border_radius', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-purple-600 transition bg-white"
                  >
                    <option value="sm">มนน้อย (Sharp / 6px)</option>
                    <option value="md">มนปานกลาง (Medium / 10px - ค่าเริ่มต้น)</option>
                    <option value="lg">มนมาก (Rounded / 16px)</option>
                    <option value="full">มนกลม (Pill / Full)</option>
                  </select>
                </div>
              </div>

              {/* 4. Live UI Preview Box */}
              <div className="pt-3 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <span>ตัวอย่างการแสดงผลจริง (Live Preview):</span>
                </label>
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                  {/* Simulated Navbar Component */}
                  <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-xs"
                        style={{ backgroundColor: settings.theme_primary_color || '#1e3a8a' }}
                      >
                        วก
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">ระบบบริหารจัดการโครงการ</div>
                        <div className="text-[10px] text-slate-400">ตัวอย่างการแสดงผลส่วนหัวระบบ</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border"
                        style={{
                          backgroundColor: `${settings.theme_primary_color || '#1e3a8a'}15`,
                          color: settings.theme_primary_color || '#1e3a8a',
                          borderColor: `${settings.theme_primary_color || '#1e3a8a'}30`,
                        }}
                      >
                        {settings.college_name?.replace('วิทยาลัยการอาชีพ', 'วก.') || 'วก.เชียงราย'}
                      </span>
                      <button
                        type="button"
                        className="px-3 py-1 text-xs font-bold text-white rounded-md shadow-xs"
                        style={{ backgroundColor: settings.theme_primary_color || '#1e3a8a' }}
                      >
                        ปุ่มหลัก
                      </button>
                    </div>
                  </div>

                  {/* Simulated Status Badges & Action Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                      <span className="text-slate-600 font-medium text-[11px]">สถานะโครงการ:</span>
                      <span
                        className="px-2 py-0.5 rounded font-bold text-[10px]"
                        style={{
                          backgroundColor: `${settings.theme_accent_color || '#0d9488'}20`,
                          color: settings.theme_accent_color || '#0d9488',
                        }}
                      >
                        กำลังดำเนินการ
                      </span>
                    </div>

                    <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                      <span className="text-slate-600 font-medium text-[11px]">ปุ่มเน้นเสริม:</span>
                      <button
                        type="button"
                        className="px-2.5 py-1 text-[11px] font-bold text-white rounded shadow-xs"
                        style={{ backgroundColor: settings.theme_accent_color || '#0d9488' }}
                      >
                        + เพิ่มกิจกรรม
                      </button>
                    </div>

                    <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                      <span className="text-slate-600 font-medium text-[11px]">ตัวอย่างฟอนต์:</span>
                      <span
                        className="font-bold text-slate-800 text-[11px]"
                        style={{ fontFamily: settings.theme_font_family || 'Prompt' }}
                      >
                        {settings.theme_font_family || 'Prompt'} กขค 123
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 1: Institution Info & Contact */}
          {(activeTab === 'all' || activeTab === 'college') && (
            <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="p-1.5 bg-theme-primary-light text-theme-primary rounded-md">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-sm sm:text-base">๑. ข้อมูลสถานศึกษาและตราสัญลักษณ์ (Logo)</h2>
                  <p className="text-[11px] sm:text-xs text-slate-500">ข้อมูลพื้นฐานของสถานศึกษา ตราสัญลักษณ์ สำหรับใช้แสดงผลในระบบและเอกสารราชการ</p>
                </div>
              </div>

              {/* Logo Upload Section */}
              <div className="p-4 rounded-theme border border-slate-200 bg-slate-50/70 space-y-3">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>ตราสัญลักษณ์ / โลโก้สถานศึกษา (College Logo):</span>
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {/* Logo Preview Box */}
                  <div className="w-20 h-20 flex items-center justify-center p-0 shrink-0">
                    {settings.college_logo_url ? (
                      <img
                        src={settings.college_logo_url}
                        alt="College Logo"
                        className="w-full h-full object-contain drop-shadow-sm"
                        onError={(e) => {
                          // Fallback if image failed to load
                          (e.target as HTMLElement).style.display = 'none';
                          const parent = (e.target as HTMLElement).parentElement;
                          if (parent && !parent.querySelector('.logo-fallback')) {
                            const fallback = document.createElement('div');
                            fallback.className = 'logo-fallback w-full h-full rounded-theme text-white flex items-center justify-center font-bold text-base shadow-xs';
                            fallback.style.backgroundColor = settings.theme_primary_color || '#1e3a8a';
                            fallback.innerText = settings.college_name?.substring(0, 3) || 'วก.';
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    ) : (
                      <div
                        className="w-full h-full rounded-theme text-white flex items-center justify-center font-bold text-base shadow-xs"
                        style={{ backgroundColor: settings.theme_primary_color || '#1e3a8a' }}
                      >
                        {settings.college_name?.substring(0, 3) || 'วก.'}
                      </div>
                    )}
                  </div>

                  {/* Logo Upload Actions */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="cursor-pointer px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-white text-xs font-bold rounded-theme shadow-xs transition flex items-center gap-1.5">
                        <span>{uploadingLogo ? 'กำลังอัปโหลด...' : '📁 เลือกไฟล์รูปภาพโลโก้'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingLogo}
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>
                      {settings.college_logo_url && (
                        <button
                          type="button"
                          onClick={() => handleChange('college_logo_url', '')}
                          className="px-3 py-2 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-theme transition"
                        >
                          ลบโลโก้ (ใช้ตัวย่อแทน)
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      รองรับไฟล์ภาพ PNG, JPG, SVG, WebP ขนาดไม่เกิน 5MB (แนะนำภาพพื้นหลังโปร่งใส Transparent PNG)
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ชื่อสถานศึกษา (ภาษาไทย) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={settings.college_name || ''}
                    onChange={(e) => handleChange('college_name', e.target.value)}
                    placeholder="เช่น วิทยาลัยการอาชีพเชียงราย"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 transition bg-slate-50/50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ชื่อสถานศึกษา (ภาษาอังกฤษ)
                  </label>
                  <input
                    type="text"
                    value={settings.college_name_en || ''}
                    onChange={(e) => handleChange('college_name_en', e.target.value)}
                    placeholder="เช่น Chiangrai Industrial And Community Education College"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 transition bg-slate-50/50 focus:bg-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    ที่อยู่สถานศึกษา (สำหรับข้อมูลติดต่อ / ส่วนท้ายเอกสาร)
                  </label>
                  <textarea
                    rows={2}
                    value={settings.college_address || ''}
                    onChange={(e) => handleChange('college_address', e.target.value)}
                    placeholder="เช่น เลขที่ ๑๒๓ หมู่ ๑๑ ตำบลท่าสาย อำเภอเมืองเชียงราย จังหวัดเชียงราย ๕๗๐๐๐"
                    className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 transition bg-slate-50/50 focus:bg-white resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    เบอร์โทรศัพท์สถานศึกษา
                  </label>
                  <input
                    type="text"
                    value={settings.college_phone || ''}
                    onChange={(e) => handleChange('college_phone', e.target.value)}
                    placeholder="เช่น 053-774505"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 transition bg-slate-50/50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    อีเมลสถานศึกษา (E-mail)
                  </label>
                  <input
                    type="email"
                    value={settings.college_email || ''}
                    onChange={(e) => handleChange('college_email', e.target.value)}
                    placeholder="เช่น cic.chiangrai@vec.mail.go.th"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 transition bg-slate-50/50 focus:bg-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-slate-500" />
                    เว็บไซต์สถานศึกษา (Website)
                  </label>
                  <input
                    type="text"
                    value={settings.college_website || ''}
                    onChange={(e) => handleChange('college_website', e.target.value)}
                    placeholder="เช่น www.cic.ac.th"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 transition bg-slate-50/50 focus:bg-white"
                  />
                </div>

                <div className="md:col-span-2 pt-2 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5 text-theme-primary" />
                    <span>ข้อความข้อมูลผู้พัฒนา (แสดงที่แถบเมนูด้านข้าง Sidebar)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={settings.developer_info || ''}
                    onChange={(e) => handleChange('developer_info', e.target.value)}
                    placeholder="เช่น พัฒนาระบบโดย งานส่งเสริมการวิจัย นวัตกรรม และสิ่งประดิษฐ์ ร่วมกับ งานศูนย์ข้อมูลสารสนเทศ"
                    className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 transition bg-slate-50/50 focus:bg-white resize-none"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    ข้อความนี้จะปรากฏที่มุมล่างซ้ายของเมนูหลัก เพื่อให้เครดิตหน่วยงานหรือผู้พัฒนาระบบ
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Budget & Submission Window (Table Design) */}
          {(activeTab === 'all' || activeTab === 'budget') && (
            <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-emerald-50 text-emerald-800 rounded-md">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 text-sm sm:text-base">๒. จัดการปีงบประมาณและเวลาเสนอโครงการ</h2>
                    <p className="text-[11px] sm:text-xs text-slate-500">จัดการรายการปีงบประมาณ กำหนดปีปัจจุบัน และตั้งค่าช่วงเวลาเปิด/ปิดรับข้อเสนอโครงการ</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewYearInput(String(getCurrentThaiFiscalYear() + 1));
                      setShowAddYearModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ เพิ่มปีงบประมาณ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowScheduleModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-xs transition"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>ตั้งค่าเวลาและสถานะเปิดรับ</span>
                  </button>
                </div>
              </div>

              {/* Status Overview Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="space-y-1">
                  <span className="text-slate-500 font-medium text-[11px]">ปีงบประมาณที่เปิดใช้งานปัจจุบัน:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold font-mono text-blue-900">
                      พ.ศ. {settings.current_fiscal_year || getCurrentThaiFiscalYear()}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                      Active
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-500 font-medium text-[11px]">สถานะการเปิดรับข้อเสนอโครงการ:</span>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      isSubmissionOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${isSubmissionOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                      {isSubmissionOpen ? 'เปิดรับข้อเสนอโครงการ' : 'ปิดรับข้อเสนอ'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-500 font-medium text-[11px]">ช่วงเวลาเปิดรับ (Start - Deadline):</span>
                  <div className="font-mono text-slate-700 font-medium">
                    {settings.submission_start_date || settings.submission_end_date ? (
                      `${settings.submission_start_date ? new Date(settings.submission_start_date).toLocaleDateString('th-TH') : 'ไม่จำกัด'} — ${settings.submission_end_date ? new Date(settings.submission_end_date).toLocaleDateString('th-TH') : 'ไม่จำกัด'}`
                    ) : (
                      <span className="text-slate-400">เปิดรับตลอดเวลา (ไม่ระบุวันหมดเขต)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Fiscal Years Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-theme-primary" />
                    <span>ตารางข้อมูลปีงบประมาณและโครงการในระบบ</span>
                  </h3>
                  <button
                    type="button"
                    onClick={fetchFiscalYears}
                    className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition"
                  >
                    รีเฟรชตาราง
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">ปีงบประมาณ (พ.ศ.)</th>
                        <th className="px-4 py-3 text-center">สถานะ</th>
                        <th className="px-4 py-3 text-center">จำนวนโครงการ</th>
                        <th className="px-4 py-3 text-right">งบประมาณรวม</th>
                        <th className="px-4 py-3 text-right">เบิกจ่ายจริง</th>
                        <th className="px-4 py-3 text-center">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {existingFiscalYears.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400">
                            ยังไม่มีข้อมูลปีงบประมาณในระบบ สามารถกดปุ่ม "+ เพิ่มปีงบประมาณ" เพื่อสร้างได้ทันที
                          </td>
                        </tr>
                      ) : (
                        existingFiscalYears.map((item) => {
                          const isCurrent = String(settings.current_fiscal_year) === String(item.fiscal_year);
                          const isDeleting = deletingYear === item.fiscal_year;

                          return (
                            <tr key={item.fiscal_year} className={`hover:bg-slate-50/70 transition ${isCurrent ? 'bg-blue-50/30' : ''}`}>
                              <td className="px-4 py-3 font-medium text-slate-900">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-sm">พ.ศ. {item.fiscal_year}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                {isCurrent ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    <Check className="w-3 h-3" /> ปีปัจจุบัน (Active)
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleSetActiveYear(item.fiscal_year)}
                                    className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-800 border border-slate-200 transition"
                                    title="ตั้งเป็นปีงบประมาณปัจจุบันของระบบ"
                                  >
                                    ตั้งเป็นปีปัจจุบัน
                                  </button>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center font-semibold text-slate-700">
                                {item.project_count > 0 ? (
                                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono">
                                    {item.project_count} โครงการ
                                  </span>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-slate-700">
                                {item.total_budget > 0 ? `${item.total_budget.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท` : '-'}
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600">
                                {item.actual_spent > 0 ? `${item.actual_spent.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท` : '-'}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setShowScheduleModal(true)}
                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                                    title="แก้ไขเวลาและสถานะเปิดรับ"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isDeleting}
                                    onClick={() => handleDeleteFiscalYear(item.fiscal_year, item.project_count)}
                                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition disabled:opacity-50"
                                    title="ลบปีงบประมาณนี้"
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

              {/* Project Code Template Generator Card */}
              <div className="p-4 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-indigo-100">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                      <Code className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-indigo-950">
                        แม่แบบและรูปแบบรหัสโครงการ (Project Code Template)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        กำหนดรูปแบบรหัสโครงการอัตโนมัติเมื่อผ่านการตรวจสอบจากงานแผนงาน
                      </p>
                    </div>
                  </div>
                  {/* Live Preview Badge */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-indigo-200 rounded-lg shadow-2xs">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">ตัวอย่างรหัสจริง:</span>
                    <span className="font-mono font-black text-xs text-indigo-900">
                      {(settings.project_code_template || 'PRJ-{YEAR}-{DIV}-{NUM}')
                        .replace(/\{YEAR\}/gi, String(settings.current_fiscal_year || getCurrentThaiFiscalYear()))
                        .replace(/\{YEAR2\}/gi, String(settings.current_fiscal_year || getCurrentThaiFiscalYear()).slice(-2))
                        .replace(/\{DIV\}/gi, 'ACAD')
                        .replace(/\{DEPT\}/gi, 'IT')
                        .replace(/\{NUM\}/gi, '1'.padStart(parseInt(settings.project_code_digits || '4', 10), '0'))}
                    </span>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700 block">เลือกรูปแบบแม่แบบสำเร็จรูป:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { name: 'มาตรฐาน (PRJ-2569-ACAD-0001)', template: 'PRJ-{YEAR}-{DIV}-{NUM}', digits: '4' },
                      { name: 'สั้นกะทัดรัด (69-ACAD-001)', template: '{YEAR2}-{DIV}-{NUM}', digits: '3' },
                      { name: 'แบบทางการ (โครงการ-2569-0001)', template: 'PRJ-{YEAR}-{NUM}', digits: '4' },
                    ].map((p, idx) => {
                      const isSelected = settings.project_code_template === p.template && settings.project_code_digits === p.digits;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            handleChange('project_code_template', p.template);
                            handleChange('project_code_digits', p.digits);
                          }}
                          className={`p-2.5 rounded-lg border text-left transition flex items-center justify-between text-xs ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-950 font-bold shadow-2xs ring-1 ring-indigo-600/30'
                              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div>
                            <p className="font-bold text-[11px]">{p.name}</p>
                            <p className="font-mono text-[10px] text-slate-500 mt-0.5">{p.template}</p>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Template Input */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      กำหนดแม่แบบเอง (Custom Template Pattern):
                    </label>
                    <input
                      type="text"
                      value={settings.project_code_template || ''}
                      onChange={(e) => handleChange('project_code_template', e.target.value)}
                      placeholder="เช่น PRJ-{YEAR}-{DIV}-{NUM}"
                      className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg outline-none focus:border-indigo-600 transition bg-white"
                    />
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 pt-1">
                      <span className="font-semibold text-slate-600">แท็กที่รองรับ:</span>
                      <button
                        type="button"
                        onClick={() => handleChange('project_code_template', (settings.project_code_template || '') + '{YEAR}')}
                        className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-200 font-mono hover:bg-indigo-100"
                        title="ปี พ.ศ. 4 หลัก (เช่น 2569)"
                      >
                        {'{YEAR}'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChange('project_code_template', (settings.project_code_template || '') + '{YEAR2}')}
                        className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-200 font-mono hover:bg-indigo-100"
                        title="ปี พ.ศ. 2 หลักท้าย (เช่น 69)"
                      >
                        {'{YEAR2}'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChange('project_code_template', (settings.project_code_template || '') + '{DIV}')}
                        className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-200 font-mono hover:bg-indigo-100"
                        title="รหัสฝ่าย (เช่น ACAD, RES, DEV, STRAT)"
                      >
                        {'{DIV}'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChange('project_code_template', (settings.project_code_template || '') + '{NUM}')}
                        className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-200 font-mono hover:bg-indigo-100"
                        title="เลขรันนิ่งลำดับโครงการ (เช่น 0001)"
                      >
                        {'{NUM}'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      จำนวนหลักเลขรันนิ่ง (Digits):
                    </label>
                    <select
                      value={settings.project_code_digits || '4'}
                      onChange={(e) => handleChange('project_code_digits', e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg outline-none focus:border-indigo-600 transition bg-white"
                    >
                      <option value="3">3 หลัก (เช่น 001)</option>
                      <option value="4">4 หลัก (เช่น 0001)</option>
                      <option value="5">5 หลัก (เช่น 00001)</option>
                    </select>
                    <p className="text-[10px] text-slate-400">
                      กำหนดความยาวของตัวเลข {'{NUM}'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 1-Click Test Mode Settings */}
              <div className="pt-2 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between p-3 bg-amber-50/50 rounded-xl border border-amber-200/80">
                  <div className="space-y-0.5">
                    <p className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <FlaskConical className="w-4 h-4 text-amber-600" />
                      <span>โหมดทดสอบระบบ (1-Click Test Login ในหน้าล็อกอิน)</span>
                      {settings.enable_test_mode !== 'false' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          เปิดใช้งานอยู่
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                          ปิดใช้งาน
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      แสดงกล่องสลับบัญชีทดสอบด่วนในหน้าล็อกอินสำหรับทดสอบบทบาทต่างๆ (ครู, หน.แผนก, รอง ผอ., งานแผน, ผอ., Admin)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleChange('enable_test_mode', settings.enable_test_mode !== 'false' ? 'false' : 'true')}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      settings.enable_test_mode !== 'false' ? 'bg-amber-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        settings.enable_test_mode !== 'false' ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Users Connection Test Card */}
                <div className="p-4 bg-gradient-to-br from-amber-50/40 via-orange-50/20 to-slate-50 rounded-xl border border-amber-200/70 space-y-3.5 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-amber-200/50">
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 bg-amber-600 text-white rounded-lg shadow-2xs shrink-0 mt-0.5 sm:mt-0">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                            ทดสอบการเชื่อมต่อบัญชีผู้ใช้ระบบ (Users Connection Test)
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                            ๙ บทบาทหลัก
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          ตรวจสอบการเชื่อมต่อฐานข้อมูล ความพร้อมใช้งาน และสถานะบัญชีของทุกบทบาทในกระบวนการเสนอและอนุมัติโครงการ
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleTestUsersConnection}
                      disabled={testingUsers}
                      className="px-3.5 py-2 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-auto"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${testingUsers ? 'animate-spin' : ''}`} />
                      <span>{testingUsers ? 'กำลังทดสอบการเชื่อมต่อ...' : 'ทดสอบการเชื่อมต่อผู้ใช้'}</span>
                    </button>
                  </div>

                  {usersTestResult && (
                    <div className="space-y-3 animate-in fade-in duration-200">
                      {/* Summary Metrics Bar */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-0.5">
                          <span className="text-[10px] text-slate-500 block font-medium">ผลการทดสอบบทบาท</span>
                          <span className={`font-bold flex items-center gap-1 text-xs ${
                            usersTestResult.summary?.all_ready ? 'text-emerald-700' : 'text-amber-700'
                          }`}>
                            {usersTestResult.summary?.all_ready ? (
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            )}
                            พร้อม {usersTestResult.summary?.ready_count || 0}/{usersTestResult.summary?.total_roles || 0} บทบาท
                          </span>
                        </div>

                        <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-0.5">
                          <span className="text-[10px] text-slate-500 block font-medium">ความเร็ว Query DB</span>
                          <span className="font-bold text-slate-800 flex items-center gap-1 text-xs font-mono">
                            <Activity className="w-3.5 h-3.5 text-blue-600" />
                            {usersTestResult.latency_ms || 0} ms
                          </span>
                        </div>

                        <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-0.5">
                          <span className="text-[10px] text-slate-500 block font-medium">ผู้ใช้ทั้งหมดในฐานข้อมูล</span>
                          <span className="font-bold text-slate-800 flex items-center gap-1 text-xs">
                            <Database className="w-3.5 h-3.5 text-indigo-600" />
                            {usersTestResult.database?.total_users || 0} บัญชี (เปิดใช้ {usersTestResult.database?.active_users || 0})
                          </span>
                        </div>

                        <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-0.5">
                          <span className="text-[10px] text-slate-500 block font-medium">เวลาที่ทดสอบล่าสุด</span>
                          <span className="font-bold text-slate-700 flex items-center gap-1 text-[11px] font-mono">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            {usersTestResult.timestamp || '-'}
                          </span>
                        </div>
                      </div>

                      {/* Roles Status Cards Grid */}
                      {usersTestResult.roles && usersTestResult.roles.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold text-slate-700 block">
                            สถานะการเชื่อมต่อแยกตามบทบาท (Roles Connection Status):
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {usersTestResult.roles.map((r) => {
                              const isReady = r.status === 'READY';
                              const isMissing = r.status === 'MISSING';
                              const isInactive = r.status === 'INACTIVE';
                              const isIncomplete = r.status === 'INCOMPLETE';

                              return (
                                <div
                                  key={r.key}
                                  className={`p-3 rounded-xl border transition flex flex-col justify-between gap-2 shadow-2xs ${
                                    isReady
                                      ? 'bg-white border-emerald-200/90 hover:border-emerald-300'
                                      : isIncomplete
                                      ? 'bg-amber-50/40 border-amber-200 hover:border-amber-300'
                                      : isInactive
                                      ? 'bg-slate-50 border-slate-200'
                                      : 'bg-rose-50/50 border-rose-200 hover:border-rose-300'
                                  }`}
                                >
                                  <div>
                                    {/* Role Header */}
                                    <div className="flex items-start justify-between gap-1.5 mb-1.5">
                                      <div className="space-y-0.5">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                                          {r.step_label}
                                        </span>
                                        <span className="text-xs font-bold text-slate-900 block line-clamp-1">
                                          {r.role_name_th}
                                        </span>
                                      </div>
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 border ${
                                          isReady
                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                            : isIncomplete
                                            ? 'bg-amber-100 text-amber-900 border-amber-200'
                                            : isInactive
                                            ? 'bg-slate-200 text-slate-700 border-slate-300'
                                            : 'bg-rose-100 text-rose-800 border-rose-200'
                                        }`}
                                      >
                                        {r.status_label}
                                      </span>
                                    </div>

                                    {/* User Details */}
                                    {r.username ? (
                                      <div className="bg-slate-50/80 p-2 rounded-lg border border-slate-100 space-y-1 text-[11px]">
                                        <div className="flex items-center justify-between text-slate-700">
                                          <span className="font-bold text-slate-900 truncate">
                                            {r.full_name || '-'}
                                          </span>
                                          <span className="font-mono text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                            @{r.username}
                                          </span>
                                        </div>
                                        {(r.division_name || r.department_name) && (
                                          <p className="text-[10px] text-slate-500 truncate">
                                            🏢 {r.division_name ? `${r.division_name} ` : ''}{r.department_name ? `(${r.department_name})` : ''}
                                          </p>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="bg-rose-50/60 p-2 rounded-lg border border-rose-100 text-[11px] text-rose-700">
                                        <span>ไม่พบชื่อผู้ใช้ <code className="font-mono font-bold bg-white px-1 py-0.5 rounded border border-rose-200">@{r.expected_username}</code> หรือบัญชีที่ตรงกับบทบาทนี้</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Quick Flags Footer */}
                                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[10px]">
                                    <div className="flex items-center gap-1 text-slate-500">
                                      {r.has_password ? (
                                        <span className="text-emerald-700 font-medium flex items-center gap-0.5">
                                          <Check className="w-3 h-3 text-emerald-600" /> รหัสผ่านพร้อม
                                        </span>
                                      ) : (
                                        <span className="text-slate-400">ไม่มีรหัสผ่าน</span>
                                      )}
                                      {r.has_google && (
                                        <span className="text-blue-700 font-medium ml-1">
                                          • Google
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-slate-400 font-mono text-[9px]">
                                      {r.matched_by === 'exact_username' ? 'Exact Match' : r.matched_by === 'division_role' ? 'Div Match' : r.matched_by ? 'Role Match' : '-'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Concurrency & Load Test Simulator Card */}
                <div className="p-4 sm:p-5 bg-gradient-to-br from-indigo-50/60 via-purple-50/30 to-slate-50 rounded-xl border border-indigo-200/90 space-y-4 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-100">
                    <div className="flex items-start gap-2.5">
                      <div className="p-2.5 bg-indigo-600 text-white rounded-lg shadow-2xs shrink-0 mt-0.5 sm:mt-0">
                        <Gauge className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="text-xs sm:text-base font-bold text-slate-900">
                            จำลองการโหลดและการใช้งานพร้อมกันแบบเต็มระบบ (Full-System Load Test)
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
                            End-to-End Stress & Capacity Test
                          </span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                          ทดสอบการทำงานของมอดูลหลักครบทั้งระบบ (ตรวจสอบสิทธิ์, แดชบอร์ด, โครงการ, อนุมัติ ๔ ขั้นตอน, โครงสร้างฝ่าย, แจ้งเตือน และแผนยุทธศาสตร์)
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleStartLoadTest}
                      disabled={testingLoad}
                      className="px-4 py-2.5 text-xs sm:text-sm font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shrink-0 self-start sm:self-auto"
                    >
                      <Zap className={`w-4 h-4 ${testingLoad ? 'animate-bounce text-amber-300' : ''}`} />
                      <span>{testingLoad ? 'กำลังรัน Load Test เต็มระบบ...' : '🚀 เริ่มทดสอบเต็มระบบ (Run Full Load Test)'}</span>
                    </button>
                  </div>

                  {/* Scenario Selector */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-600" />
                      <span>เลือกรูปแบบการจำลองโหลด (Load Test Scenario):</span>
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => setLoadTestScenario('full_system')}
                        className={`p-2.5 text-left rounded-xl border text-xs transition cursor-pointer flex flex-col justify-between gap-1 ${
                          loadTestScenario === 'full_system'
                            ? 'bg-indigo-50/90 border-indigo-600 text-indigo-950 font-bold ring-2 ring-indigo-400/40 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">🌟</span>
                          <span className="font-bold text-[11px]">เต็มระบบ (Full System)</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-normal">
                          รันครบทั้ง ๗ มอดูลหลักในระบบพร้อมกัน
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setLoadTestScenario('high_traffic_submission')}
                        className={`p-2.5 text-left rounded-xl border text-xs transition cursor-pointer flex flex-col justify-between gap-1 ${
                          loadTestScenario === 'high_traffic_submission'
                            ? 'bg-indigo-50/90 border-indigo-600 text-indigo-950 font-bold ring-2 ring-indigo-400/40 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">📥</span>
                          <span className="font-bold text-[11px]">ยื่นเสนอโครงการ (Proposals)</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-normal">
                          เน้นโครงการ งบประมาณ และสังกัดแผนก
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setLoadTestScenario('approval_storm')}
                        className={`p-2.5 text-left rounded-xl border text-xs transition cursor-pointer flex flex-col justify-between gap-1 ${
                          loadTestScenario === 'approval_storm'
                            ? 'bg-indigo-50/90 border-indigo-600 text-indigo-950 font-bold ring-2 ring-indigo-400/40 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">⚖️</span>
                          <span className="font-bold text-[11px]">อนุมัติ ๔ ขั้นตอน (Approvals)</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-normal">
                          เน้นคิวพิจารณาของ หน.แผนก, รอง ผอ., งานแผน, ผอ.
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setLoadTestScenario('analytics_reporting')}
                        className={`p-2.5 text-left rounded-xl border text-xs transition cursor-pointer flex flex-col justify-between gap-1 ${
                          loadTestScenario === 'analytics_reporting'
                            ? 'bg-indigo-50/90 border-indigo-600 text-indigo-950 font-bold ring-2 ring-indigo-400/40 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">📊</span>
                          <span className="font-bold text-[11px]">ประมวลผลรายงาน (Analytics)</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-normal">
                          เน้นสถิติ แดชบอร์ด และตัวชี้วัดยุทธศาสตร์
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Concurrency Scale Selector */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-700 block">เลือกระดับ Concurrency (ผู้ใช้พร้อมกัน):</span>
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setLoadTestMode('auto_detect');
                          setLoadTestConcurrency(50);
                        }}
                        className={`p-2 text-left rounded-lg border text-xs transition cursor-pointer ${
                          loadTestMode === 'auto_detect'
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-950 font-bold ring-2 ring-indigo-400/40 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <span className="block truncate font-bold text-[11px]">🎯 ค้นหาขีดจำกัดอัตโนมัติ</span>
                        <span className="text-[10px] text-slate-500 font-normal">Ramp (10➔300 คน)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setLoadTestMode('fixed');
                          setLoadTestConcurrency(25);
                        }}
                        className={`p-2 text-left rounded-lg border text-xs transition cursor-pointer ${
                          loadTestMode === 'fixed' && loadTestConcurrency === 25
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-950 font-bold ring-2 ring-indigo-400/40 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <span className="block truncate font-bold text-[11px]">🚀 ๒๕ คน</span>
                        <span className="text-[10px] text-slate-500 font-normal">ใช้งานทั่วไป</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setLoadTestMode('fixed');
                          setLoadTestConcurrency(50);
                        }}
                        className={`p-2 text-left rounded-lg border text-xs transition cursor-pointer ${
                          loadTestMode === 'fixed' && loadTestConcurrency === 50
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-950 font-bold ring-2 ring-indigo-400/40 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <span className="block truncate font-bold text-[11px]">🔥 ๕๐ คน</span>
                        <span className="text-[10px] text-slate-500 font-normal">เปิดเสนอโครงการ</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setLoadTestMode('fixed');
                          setLoadTestConcurrency(100);
                        }}
                        className={`p-2 text-left rounded-lg border text-xs transition cursor-pointer ${
                          loadTestMode === 'fixed' && loadTestConcurrency === 100
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-950 font-bold ring-2 ring-indigo-400/40 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <span className="block truncate font-bold text-[11px]">⚡ ๑๐๐ คน</span>
                        <span className="text-[10px] text-slate-500 font-normal">ช่วงเร่งด่วน</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setLoadTestMode('fixed');
                          setLoadTestConcurrency(200);
                        }}
                        className={`p-2 text-left rounded-lg border text-xs transition cursor-pointer ${
                          loadTestMode === 'fixed' && loadTestConcurrency === 200
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-950 font-bold ring-2 ring-indigo-400/40 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <span className="block truncate font-bold text-[11px]">💥 ๒๐๐ คน</span>
                        <span className="text-[10px] text-slate-500 font-normal">Stress ระดับสูง</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setLoadTestMode('fixed');
                          setLoadTestConcurrency(300);
                        }}
                        className={`p-2 text-left rounded-lg border text-xs transition cursor-pointer ${
                          loadTestMode === 'fixed' && loadTestConcurrency === 300
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-950 font-bold ring-2 ring-indigo-400/40 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <span className="block truncate font-bold text-[11px]">🛡️ ๓๐๐ คน</span>
                        <span className="text-[10px] text-slate-500 font-normal">Stress สูงสุด</span>
                      </button>
                    </div>
                  </div>

                  {/* Duration Selector */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        <span>กำหนดระยะเวลาการทดสอบ (Test Duration):</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {loadTestDurationMinutes === 0
                          ? '⚡ 1 รอบ (Instant Burst Mode)'
                          : `⏱️ รันต่อเนื่อง ${loadTestDurationMinutes >= 1 ? `${loadTestDurationMinutes} นาที` : '30 วินาที'}`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                      {[
                        { label: '⚡ 1 รอบ', sub: 'Instant Burst', val: 0 },
                        { label: '⏱️ 30 วิ', sub: '0.5 นาที (Quick)', val: 0.5 },
                        { label: '⏱️ 1 นาที', sub: 'Standard Load', val: 1 },
                        { label: '⏱️ 2 นาที', sub: 'Medium Soak', val: 2 },
                        { label: '⏱️ 3 นาที', sub: 'Heavy Soak', val: 3 },
                        { label: '🛡️ 5 นาที', sub: 'Full Endurance', val: 5 },
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setLoadTestDurationMinutes(item.val)}
                          className={`p-2 text-left rounded-lg border text-xs transition cursor-pointer ${
                            loadTestDurationMinutes === item.val
                              ? 'bg-indigo-50 border-indigo-500 text-indigo-950 font-bold ring-2 ring-indigo-400/40 shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <span className="block truncate font-bold text-[11px]">{item.label}</span>
                          <span className="text-[10px] text-slate-500 font-normal block truncate">{item.sub}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Load Testing Results Dashboard */}
                  {loadTestResult && (
                    <div className="space-y-4 pt-1 animate-in fade-in duration-200">
                      {/* Capacity Highlight Card */}
                      <div className="p-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 text-white rounded-xl shadow-sm space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="text-indigo-200 text-[11px] uppercase font-bold tracking-wider block">
                              ผลการประเมินความสามารถรองรับการใช้งานพร้อมกันแบบเต็มระบบ (Full-System Capacity)
                            </span>
                            <h4 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 mt-0.5">
                              <span>รองรับได้อย่างปลอดภัย:</span>
                              <span className="text-amber-300 underline decoration-amber-400/60 underline-offset-4 font-mono">
                                {loadTestResult.summary?.max_safe_concurrent_users || 0}+ ผู้ใช้พร้อมกัน
                              </span>
                            </h4>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
                            {loadTestResult.summary?.duration_seconds ? (
                              <div className="flex items-center gap-1 bg-amber-400/20 text-amber-200 border border-amber-400/30 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{loadTestResult.summary.duration_seconds}s ({(loadTestResult.summary?.duration_minutes_configured ?? 0) > 0 ? `${loadTestResult.summary.duration_minutes_configured} นาที` : 'Burst'})</span>
                              </div>
                            ) : null}
                            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-white/20 text-xs font-bold">
                              <CheckCircle className="w-4 h-4 text-emerald-400" />
                              <span>{loadTestResult.summary?.estimated_capacity_label}</span>
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-indigo-100/90 leading-relaxed bg-black/15 p-2.5 rounded-lg border border-white/10">
                          💡 <strong>สรุปผลการวิเคราะห์:</strong> {loadTestResult.summary?.assessment}
                        </p>
                      </div>

                      {/* 4 Metrics Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                          <span className="text-[10px] text-slate-500 block font-medium">Throughput สูงสุด</span>
                          <span className="font-bold text-slate-900 flex items-center gap-1.5 text-sm font-mono">
                            <TrendingUp className="w-4 h-4 text-emerald-600" />
                            {loadTestResult.summary?.peak_throughput_rps || 0} req/s
                          </span>
                          <span className="text-[10px] text-slate-400 block">ปริมาณคำขอต่อวินาที</span>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                          <span className="text-[10px] text-slate-500 block font-medium">Latency เฉลี่ยรวมทั้งระบบ</span>
                          <span className="font-bold text-slate-900 flex items-center gap-1.5 text-sm font-mono">
                            <Activity className="w-4 h-4 text-blue-600" />
                            {loadTestResult.summary?.overall_avg_latency_ms || 0} ms
                          </span>
                          <span className="text-[10px] text-slate-400 block">เวลาตอบสนองต่อคำขอ</span>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                          <span className="text-[10px] text-slate-500 block font-medium">ความสำเร็จ (Success Rate)</span>
                          <span className="font-bold text-emerald-700 flex items-center gap-1.5 text-sm font-mono">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            {loadTestResult.summary?.successful_requests || 0}/{loadTestResult.summary?.total_requests || 0} ({100 - (loadTestResult.summary?.overall_error_rate_pct || 0)}%)
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            ข้อผิดพลาด: {loadTestResult.summary?.failed_requests || 0} ({loadTestResult.summary?.overall_error_rate_pct || 0}%)
                          </span>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                          <span className="text-[10px] text-slate-500 block font-medium">การใช้ Memory Heap</span>
                          <span className="font-bold text-slate-900 flex items-center gap-1.5 text-sm font-mono">
                            <Cpu className="w-4 h-4 text-purple-600" />
                            {loadTestResult.summary?.memory_heap_used_mb || 0} MB
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            จาก Total {loadTestResult.summary?.memory_heap_total_mb || 0} MB
                          </span>
                        </div>
                      </div>

                      {/* Module Performance Breakdown Cards */}
                      {loadTestResult.modules && loadTestResult.modules.length > 0 && (
                        <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2.5 shadow-2xs">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <BarChart3 className="w-4 h-4 text-indigo-600" />
                            <span>ความเร็วการตอบสนองจำแนกตามมอดูล (Module Latency Breakdown):</span>
                          </span>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {loadTestResult.modules.map((mod) => (
                              <div key={mod.key} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between gap-2">
                                <div className="space-y-0.5 truncate">
                                  <span className="text-[11px] font-bold text-slate-800 block truncate">
                                    {mod.name_th}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    P95: {mod.p95_latency_ms} ms ({mod.count} ops)
                                  </span>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="font-mono font-bold text-xs text-indigo-900 block">
                                    {mod.avg_latency_ms} ms
                                  </span>
                                  <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded">
                                    ปกติ
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Stage-by-stage Performance Table */}
                      {loadTestResult.stages && loadTestResult.stages.length > 0 && (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                          <div className="p-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                              <span>ตารางผลการทดสอบแยกตามระดับโหลด (Stage Breakdown)</span>
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              รวม {loadTestResult.total_duration_ms} ms
                            </span>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-slate-50 text-[10px] text-slate-500 font-bold border-b border-slate-200">
                                  <th className="p-2.5">ผู้ใช้พร้อมกัน</th>
                                  <th className="p-2.5">จำนวน Requests</th>
                                  <th className="p-2.5">Avg Latency</th>
                                  <th className="p-2.5">P95 Latency</th>
                                  <th className="p-2.5">Throughput</th>
                                  <th className="p-2.5">ข้อผิดพลาด</th>
                                  <th className="p-2.5 text-center">ระดับประสิทธิภาพ</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {loadTestResult.stages.map((stg, sIdx) => {
                                  return (
                                    <tr key={sIdx} className="hover:bg-slate-50/60 transition">
                                      <td className="p-2.5 font-bold text-slate-800 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                        <span>{stg.concurrency} ผู้ใช้</span>
                                      </td>
                                      <td className="p-2.5 text-slate-600 font-mono text-[11px]">
                                        {stg.total_requests} reqs
                                      </td>
                                      <td className="p-2.5 font-mono text-slate-800 font-bold">
                                        {stg.avg_latency_ms} ms
                                      </td>
                                      <td className="p-2.5 font-mono text-slate-600 text-[11px]">
                                        {stg.p95_latency_ms} ms
                                      </td>
                                      <td className="p-2.5 font-mono text-emerald-700 font-bold">
                                        {stg.throughput_rps} req/s
                                      </td>
                                      <td className="p-2.5 font-mono">
                                        {stg.error_count === 0 ? (
                                          <span className="text-emerald-600 font-medium">0%</span>
                                        ) : (
                                          <span className="text-rose-600 font-bold">{stg.error_rate_pct}% ({stg.error_count})</span>
                                        )}
                                      </td>
                                      <td className="p-2.5 text-center">
                                        <span
                                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-block ${
                                            stg.grade === 'EXCELLENT'
                                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                              : stg.grade === 'GOOD'
                                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                                              : stg.grade === 'FAIR'
                                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                                              : 'bg-rose-50 text-rose-800 border-rose-200'
                                          }`}
                                        >
                                          {stg.grade === 'EXCELLENT'
                                            ? 'ยอดเยี่ยม'
                                            : stg.grade === 'GOOD'
                                            ? 'ดีมาก'
                                            : stg.grade === 'FAIR'
                                            ? 'ปานกลาง'
                                            : 'ชะลอตัว'}
                                        </span>
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
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Executive & Director Info */}
          {(activeTab === 'all' || activeTab === 'director') && (
            <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="p-1.5 bg-indigo-50 text-indigo-800 rounded-md">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-sm sm:text-base">๓. ข้อมูลผู้บริหารและผู้อำนวยการ (Executive & Directors)</h2>
                  <p className="text-[11px] sm:text-xs text-slate-500">ข้อมูลผู้อำนวยการและรองผู้อำนวยการทั้ง 4 ฝ่าย สำหรับระบบเสนอโครงการและการสร้างเอกสาร Word อัตโนมัติ</p>
                </div>
              </div>

              {/* ผู้อำนวยการสถานศึกษา */}
              <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold text-indigo-950 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                  ผู้อำนวยการสถานศึกษา (ผู้ลงนามขั้นสุดท้าย)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      ชื่อ-นามสกุล ผู้อำนวยการ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={settings.director_name || ''}
                      onChange={(e) => handleChange('director_name', e.target.value)}
                      placeholder="เช่น นางปิยะพร พูลเพิ่ม"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 transition bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      ตำแหน่งทางการ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={settings.director_position || ''}
                      onChange={(e) => handleChange('director_position', e.target.value)}
                      placeholder="เช่น ผู้อำนวยการวิทยาลัยการอาชีพเชียงราย"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 transition bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* รองผู้อำนวยการ 4 ฝ่าย */}
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  รองผู้อำนวยการ ๔ ฝ่ายบริหาร
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 1. ฝ่ายบริหารทรัพยากร */}
                  <div className="p-3.5 bg-slate-50/50 rounded-xl border border-slate-200 space-y-3">
                    <p className="text-xs font-bold text-slate-800">๑. ฝ่ายบริหารทรัพยากร</p>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">ชื่อ-นามสกุล รอง ผอ.</label>
                      <input
                        type="text"
                        value={settings.deputy_res_name || ''}
                        onChange={(e) => handleChange('deputy_res_name', e.target.value)}
                        placeholder="เช่น นายสมศักดิ์ มั่นคง"
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white outline-none focus:border-blue-900 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">ตำแหน่งทางการ</label>
                      <input
                        type="text"
                        value={settings.deputy_res_position || 'รองผู้อำนวยการฝ่ายบริหารทรัพยากร'}
                        onChange={(e) => handleChange('deputy_res_position', e.target.value)}
                        placeholder="รองผู้อำนวยการฝ่ายบริหารทรัพยากร"
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white outline-none focus:border-blue-900 transition"
                      />
                    </div>
                  </div>

                  {/* 2. ฝ่ายแผนงานและความร่วมมือ */}
                  <div className="p-3.5 bg-slate-50/50 rounded-xl border border-slate-200 space-y-3">
                    <p className="text-xs font-bold text-slate-800">๒. ฝ่ายแผนงานและความร่วมมือ / ยุทธศาสตร์</p>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">ชื่อ-นามสกุล รอง ผอ.</label>
                      <input
                        type="text"
                        value={settings.deputy_strat_name || ''}
                        onChange={(e) => handleChange('deputy_strat_name', e.target.value)}
                        placeholder="เช่น นางสาววาสนา วางแผนดี"
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white outline-none focus:border-blue-900 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">ตำแหน่งทางการ</label>
                      <input
                        type="text"
                        value={settings.deputy_strat_position || 'รองผู้อำนวยการฝ่ายแผนงานและความร่วมมือ'}
                        onChange={(e) => handleChange('deputy_strat_position', e.target.value)}
                        placeholder="รองผู้อำนวยการฝ่ายแผนงานและความร่วมมือ"
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white outline-none focus:border-blue-900 transition"
                      />
                    </div>
                  </div>

                  {/* 3. ฝ่ายพัฒนากิจการนักเรียน นักศึกษา */}
                  <div className="p-3.5 bg-slate-50/50 rounded-xl border border-slate-200 space-y-3">
                    <p className="text-xs font-bold text-slate-800">๓. ฝ่ายพัฒนากิจการนักเรียน นักศึกษา</p>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">ชื่อ-นามสกุล รอง ผอ.</label>
                      <input
                        type="text"
                        value={settings.deputy_dev_name || ''}
                        onChange={(e) => handleChange('deputy_dev_name', e.target.value)}
                        placeholder="เช่น นายธนากร กิจการเด่น"
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white outline-none focus:border-blue-900 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">ตำแหน่งทางการ</label>
                      <input
                        type="text"
                        value={settings.deputy_dev_position || 'รองผู้อำนวยการฝ่ายพัฒนากิจการนักเรียน นักศึกษา'}
                        onChange={(e) => handleChange('deputy_dev_position', e.target.value)}
                        placeholder="รองผู้อำนวยการฝ่ายพัฒนากิจการนักเรียน นักศึกษา"
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white outline-none focus:border-blue-900 transition"
                      />
                    </div>
                  </div>

                  {/* 4. ฝ่ายวิชาการ */}
                  <div className="p-3.5 bg-slate-50/50 rounded-xl border border-slate-200 space-y-3">
                    <p className="text-xs font-bold text-slate-800">๔. ฝ่ายวิชาการ</p>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">ชื่อ-นามสกุล รอง ผอ.</label>
                      <input
                        type="text"
                        value={settings.deputy_acad_name || ''}
                        onChange={(e) => handleChange('deputy_acad_name', e.target.value)}
                        placeholder="เช่น นางสาวพรทิพย์ วิชาการเลิศ"
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white outline-none focus:border-blue-900 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">ตำแหน่งทางการ</label>
                      <input
                        type="text"
                        value={settings.deputy_acad_position || 'รองผู้อำนวยการฝ่ายวิชาการ'}
                        onChange={(e) => handleChange('deputy_acad_position', e.target.value)}
                        placeholder="รองผู้อำนวยการฝ่ายวิชาการ"
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white outline-none focus:border-blue-900 transition"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* หัวหน้างานวางแผนและงบประมาณ */}
              <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3 mt-4">
                <h3 className="text-xs font-bold text-blue-950 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  หัวหน้างานวางแผนและงบประมาณ (ดึง Auto Fill ลงในเอกสารและแบบเสนอโครงการ)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      ชื่อ-นามสกุล หัวหน้างานวางแผนและงบประมาณ
                    </label>
                    <input
                      type="text"
                      value={settings.planning_head_name || ''}
                      onChange={(e) => handleChange('planning_head_name', e.target.value)}
                      placeholder="เช่น นายรักแผน มุ่งมั่นพัฒนา (หากเว้นว่างจะดึงจากผู้ใช้บทบาทงานแผน)"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 transition bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      ตำแหน่งทางการ
                    </label>
                    <input
                      type="text"
                      value={settings.planning_head_position || 'หัวหน้างานวางแผนและงบประมาณ'}
                      onChange={(e) => handleChange('planning_head_position', e.target.value)}
                      placeholder="หัวหน้างานวางแผนและงบประมาณ"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 transition bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Email & SMTP Notification Settings */}
          {(activeTab === 'all' || activeTab === 'email') && (
            <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-blue-50 text-blue-900 rounded-md">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 text-sm sm:text-base">๔. ระบบการแจ้งเตือน & อีเมล (Real-time Notifications & SMTP)</h2>
                    <p className="text-[11px] sm:text-xs text-slate-500">
                      ระบบแจ้งเตือน Real-time บนหน้าจอ, เสียงเตือน Chime, และกำหนดค่า Mail Server สำหรับส่งอีเมลแจ้งเตือน
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleTestNotification}
                    disabled={testingNotification}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-900 hover:bg-blue-800 text-white shadow-xs transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                    title="ส่งการแจ้งเตือนทดสอบทันทีเพื่อตรวจสอบระบบ Real-time และเสียง"
                  >
                    <Bell className={`w-3.5 h-3.5 ${testingNotification ? 'animate-bounce' : ''}`} />
                    <span>{testingNotification ? 'กำลังส่ง...' : '🔔 ทดสอบแจ้งเตือน Real-time'}</span>
                  </button>

                  <div className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                    isSmtpEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${isSmtpEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                    {isSmtpEnabled ? 'เปิดใช้อีเมล' : 'ปิดใช้อีเมล'}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Enable/Disable Toggle */}
                <div className="flex items-center justify-between p-3 bg-blue-50/40 rounded-xl border border-blue-100">
                  <div className="space-y-0.5">
                    <p className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <span>เปิด/ปิดการส่งอีเมลแจ้งเตือนอัตโนมัติ (Email Notifications)</span>
                      {isSmtpEnabled ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          เปิดใช้งาน (Enabled)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                          ปิดใช้งาน (Disabled)
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      เมื่อเปิด: ระบบจะส่งอีเมลแจ้งเตือนไปยังผู้รับผิดชอบโครงการและผู้อนุมัติทุกครั้งที่มีการยื่นหรือเปลี่ยนสถานะโครงการ
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleChange('smtp_enabled', isSmtpEnabled ? 'false' : 'true')}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isSmtpEnabled ? 'bg-blue-900' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isSmtpEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      SMTP Host <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={settings.smtp_host || 'smtp.gmail.com'}
                      onChange={(e) => handleChange('smtp_host', e.target.value)}
                      placeholder="เช่น smtp.gmail.com หรือ smtp.office365.com"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 transition bg-slate-50/50 focus:bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      SMTP Port <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={settings.smtp_port || '587'}
                      onChange={(e) => handleChange('smtp_port', e.target.value)}
                      placeholder="587 หรือ 465"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 transition bg-slate-50/50 focus:bg-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      SMTP Username / อีเมลผู้ส่ง <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={settings.smtp_user || ''}
                      onChange={(e) => handleChange('smtp_user', e.target.value)}
                      placeholder="เช่น admin@vocational-plan.ac.th"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 transition bg-slate-50/50 focus:bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      SMTP Password / App Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={settings.smtp_pass || ''}
                      onChange={(e) => handleChange('smtp_pass', e.target.value)}
                      placeholder="••••••••••••••••"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 transition bg-slate-50/50 focus:bg-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      ชื่อผู้ส่ง (Sender Name)
                    </label>
                    <input
                      type="text"
                      value={settings.smtp_from_name || 'ระบบบริหารจัดการโครงการ วก.เชียงราย'}
                      onChange={(e) => handleChange('smtp_from_name', e.target.value)}
                      placeholder="เช่น ระบบบริหารจัดการโครงการ วก.เชียงราย"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 transition bg-slate-50/50 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      อีเมลผู้ส่ง (Sender From Email - ถ้าต่างจาก User)
                    </label>
                    <input
                      type="email"
                      value={settings.smtp_from_email || ''}
                      onChange={(e) => handleChange('smtp_from_email', e.target.value)}
                      placeholder="เช่น noreply@vocational-plan.ac.th"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 transition bg-slate-50/50 focus:bg-white font-mono"
                    />
                  </div>
                </div>

                {/* SMTP Setup Guide Accordion / Instruction Cards */}
                <div className="mt-4 p-4.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-blue-900" />
                      <span>คำแนะนำและวิธีการตั้งค่า SMTP ยอดนิยม (Quick Setup Guide):</span>
                    </div>
                  </div>

                  {/* Provider Quick Presets */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    {/* Gmail */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                          Google / Gmail
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            handleChange('smtp_host', 'smtp.gmail.com');
                            handleChange('smtp_port', '587');
                          }}
                          className="text-[10px] text-blue-900 font-bold hover:underline"
                        >
                          ใช้ค่านี้
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        • <strong>Host:</strong> <code className="text-slate-800 font-mono">smtp.gmail.com</code><br />
                        • <strong>Port:</strong> <code className="text-slate-800 font-mono">587</code><br />
                        • <strong>Password:</strong> ต้องสร้าง <strong>App Password (รหัสผ่านสำหรับแอป 16 หลัก)</strong> จาก Google Account &gt; ความปลอดภัย &gt; ยืนยัน 2 ขั้นตอน
                      </p>
                    </div>

                    {/* Microsoft 365 / Outlook */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          Microsoft 365 / Outlook
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            handleChange('smtp_host', 'smtp.office365.com');
                            handleChange('smtp_port', '587');
                          }}
                          className="text-[10px] text-blue-900 font-bold hover:underline"
                        >
                          ใช้ค่านี้
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        • <strong>Host:</strong> <code className="text-slate-800 font-mono">smtp.office365.com</code><br />
                        • <strong>Port:</strong> <code className="text-slate-800 font-mono">587</code><br />
                        • <strong>User/Pass:</strong> ใช้อีเมลและรหัสผ่านองค์กร (@vec.mail.go.th หรือ Outlook)
                      </p>
                    </div>

                    {/* Custom / Hosting */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          เว็บโฮสติ้ง / เมลเซิร์ฟเวอร์
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        • <strong>Host:</strong> เช่น <code className="text-slate-800 font-mono">mail.yourdomain.ac.th</code><br />
                        • <strong>Port:</strong> <code className="text-slate-800 font-mono">587</code> หรือ <code className="text-slate-800 font-mono">465</code><br />
                        • <strong>User/Pass:</strong> ข้อมูลบัญชีอีเมลจาก cPanel / DirectAdmin
                      </p>
                    </div>
                  </div>

                  {/* Gmail Step-by-step instruction */}
                  <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100 text-[11px] space-y-1 text-slate-700">
                    <p className="font-bold text-blue-950">💡 ขั้นตอนการขอ App Password ของ Gmail (แนะนำ):</p>
                    <ol className="list-decimal list-inside space-y-0.5 text-slate-600 pl-1">
                      <li>เข้าสู่ระบบ <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="text-blue-700 underline font-medium">บัญชี Google</a> &gt; ไปที่เมนู <strong>"ความปลอดภัย (Security)"</strong></li>
                      <li>เปิดใช้งาน <strong>"การยืนยันแบบ 2 ขั้นตอน (2-Step Verification)"</strong> ให้เรียบร้อย</li>
                      <li>ค้นหาหัวข้อ <strong>"รหัสผ่านสำหรับแอป (App passwords)"</strong> หรือเข้าที่ลิงก์ <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-blue-700 underline font-medium">myaccount.google.com/apppasswords</a></li>
                      <li>ตั้งชื่อแอป เช่น <code className="bg-white px-1.5 py-0.5 rounded border text-slate-800">ระบบโครงการ วก.เชียงราย</code> แล้วกดปุ่ม <strong>สร้าง (Create)</strong></li>
                      <li>คัดลอกรหัส 16 ตัวอักษรที่ได้มาวางในช่อง <strong>"SMTP Password / App Password"</strong> ด้านบน</li>
                    </ol>
                  </div>
                </div>

                {/* Test Real-time In-App Notification Card */}
                <div className="mt-5 p-4 sm:p-5 bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-slate-50 rounded-xl border border-blue-200 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-blue-100/80">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-blue-900 text-white rounded-lg shadow-xs shrink-0">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex flex-wrap items-center gap-1.5">
                          <span>ทดสอบระบบแจ้งเตือนในระบบ (In-App & Real-Time Notification Test)</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                            WebSocket / SSE + ระบบเสียง
                          </span>
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          จำลองการส่งแจ้งเตือนทันทีเพื่อทดสอบ Pop-up แจ้งเตือน, Badge ตัวเลข Unread, และเสียงแจ้งเตือน Chime
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white px-3 py-1 rounded-lg border border-slate-200 self-start sm:self-auto shadow-2xs">
                      <Volume2 className="w-3.5 h-3.5 text-blue-700" />
                      <span className="text-[11px] font-medium">มีระบบเสียง Chime อัตโนมัติ</span>
                    </div>
                  </div>

                  {/* Preset Buttons */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-600 block">เลือกรูปแบบข้อความตัวอย่าง:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => applyNotiPreset('PROJECT_APPROVED')}
                        className={`p-2.5 text-left rounded-lg border text-xs transition cursor-pointer ${
                          testNotiType === 'PROJECT_APPROVED'
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold ring-2 ring-emerald-400/50 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <span className="block truncate font-bold text-[11px]">✅ อนุมัติโครงการ</span>
                        <span className="text-[10px] text-slate-500 font-normal">ผอ. อนุมัติครบ ๔ ขั้นตอน</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyNotiPreset('PROJECT_SUBMITTED')}
                        className={`p-2.5 text-left rounded-lg border text-xs transition cursor-pointer ${
                          testNotiType === 'PROJECT_SUBMITTED'
                            ? 'bg-blue-50 border-blue-400 text-blue-950 font-bold ring-2 ring-blue-400/50 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <span className="block truncate font-bold text-[11px]">📥 ยื่นเสนอโครงการ</span>
                        <span className="text-[10px] text-slate-500 font-normal">มีคิวรอพิจารณาใหม่</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyNotiPreset('PROJECT_REVISED')}
                        className={`p-2.5 text-left rounded-lg border text-xs transition cursor-pointer ${
                          testNotiType === 'PROJECT_REVISED'
                            ? 'bg-amber-50 border-amber-400 text-amber-950 font-bold ring-2 ring-amber-400/50 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <span className="block truncate font-bold text-[11px]">📝 ส่งกลับแก้ไข</span>
                        <span className="text-[10px] text-slate-500 font-normal">มีข้อเสนอแนะให้ปรับแก้</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyNotiPreset('SYSTEM')}
                        className={`p-2.5 text-left rounded-lg border text-xs transition cursor-pointer ${
                          testNotiType === 'SYSTEM'
                            ? 'bg-purple-50 border-purple-400 text-purple-950 font-bold ring-2 ring-purple-400/50 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <span className="block truncate font-bold text-[11px]">📢 ประกาศระบบ</span>
                        <span className="text-[10px] text-slate-500 font-normal">ข้อความประกาศทั่วไป</span>
                      </button>
                    </div>
                  </div>

                  {/* Input Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">หัวข้อการแจ้งเตือน (Notification Title)</label>
                      <input
                        type="text"
                        value={testNotiTitle}
                        onChange={(e) => setTestNotiTitle(e.target.value)}
                        placeholder="เช่น 🔔 ทดสอบระบบแจ้งเตือน Real-time"
                        className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 bg-white shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">ข้อความรายละเอียด (Notification Message)</label>
                      <input
                        type="text"
                        value={testNotiMessage}
                        onChange={(e) => setTestNotiMessage(e.target.value)}
                        placeholder="ข้อความที่ต้องการให้ปรากฏในการแจ้งเตือน..."
                        className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 bg-white shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Target Recipient Selector */}
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                      <span>👥 ผู้รับการแจ้งเตือน:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setTestNotiTarget('ALL')}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-lg border transition cursor-pointer flex items-center gap-1.5 ${
                          testNotiTarget === 'ALL'
                            ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <span>📢 ทุกคนในระบบ (All Active Users)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTestNotiTarget('ME')}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-lg border transition cursor-pointer flex items-center gap-1.5 ${
                          testNotiTarget === 'ME'
                            ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <span>👤 เฉพาะฉัน (Only Me)</span>
                      </button>
                    </div>
                  </div>

                  {/* Action row */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 select-none">
                      <input
                        type="checkbox"
                        checked={testNotiSendEmail}
                        onChange={(e) => setTestNotiSendEmail(e.target.checked)}
                        disabled={!isSmtpEnabled}
                        className="w-4 h-4 rounded text-blue-900 focus:ring-blue-900 disabled:opacity-40 cursor-pointer"
                      />
                      <span className={!isSmtpEnabled ? 'text-slate-400' : 'font-medium'}>
                        ส่งสำเนาเข้าอีเมลด้วย {isSmtpEnabled ? `(${settings.smtp_user || user?.email || 'ตามอีเมลผู้ใช้'})` : '(เปิดใช้อีเมลด้านบนก่อน)'}
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={handleTestNotification}
                      disabled={testingNotification}
                      className="px-5 py-2.5 text-xs sm:text-sm font-bold rounded-lg bg-blue-900 hover:bg-blue-800 text-white shadow-sm hover:shadow transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Send className={`w-4 h-4 ${testingNotification ? 'animate-spin' : ''}`} />
                      <span>{testingNotification ? 'กำลังส่งแจ้งเตือน...' : '🚀 ยิงแจ้งเตือนทดสอบทันที (Trigger Test)'}</span>
                    </button>
                  </div>

                  {testNotiResult && (
                    <div
                      className={`p-3.5 rounded-lg text-xs font-medium flex items-center justify-between gap-2 border animate-in fade-in ${
                        testNotiResult.success
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                          : 'bg-rose-50 text-rose-900 border-rose-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {testNotiResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>{testNotiResult.message}</span>
                      </div>
                      {testNotiResult.timestamp && (
                        <span className="text-[10px] text-emerald-700/90 font-mono shrink-0 font-bold">
                          ส่งเมื่อ {testNotiResult.timestamp}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Test Email Box */}
                <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-900" />
                    <h3 className="text-xs sm:text-sm font-bold text-slate-800">ทดสอบการส่งอีเมล (Send Test Email)</h3>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    ทดสอบการเชื่อมต่อกับ Mail Server และตรวจสอบการส่งข้อความจริงไปยังกล่องจดหมาย
                  </p>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="email"
                      value={testEmailRecipient}
                      onChange={(e) => setTestEmailRecipient(e.target.value)}
                      placeholder="ใส่อีเมลของคุณเพื่อรับข้อความทดสอบ..."
                      className="flex-1 px-3.5 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleTestEmail}
                      disabled={testingEmail}
                      className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-900 hover:bg-blue-800 text-white shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>{testingEmail ? 'กำลังทดสอบส่ง...' : 'ทดสอบส่งอีเมล'}</span>
                    </button>
                  </div>

                  {testEmailResult && (
                    <div
                      className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
                        testEmailResult.success
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}
                    >
                      {testEmailResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      )}
                      <span>{testEmailResult.message}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Section 5: Google OAuth Settings */}
          {(activeTab === 'all' || activeTab === 'google') && (
            <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-red-50 text-red-600 rounded-md">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 text-sm sm:text-base">๕. การเชื่อมต่อ Google OAuth (Sign in with Google)</h2>
                    <p className="text-[11px] sm:text-xs text-slate-500">
                      กำหนด Google Client ID เพื่อเปิดให้ครูและบุคลากรเข้าสู่ระบบด้วยบัญชี Google
                    </p>
                  </div>
                </div>

                <div className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                  hasGoogleClientId ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${hasGoogleClientId ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {hasGoogleClientId ? 'เชื่อมต่อ Google สำเร็จ' : 'ยังไม่ได้ระบุ Client ID'}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>Google OAuth Client ID (Web Application)</span>
                    <a
                      href="https://console.cloud.google.com/apis/credentials"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-900 hover:underline flex items-center gap-1 font-normal text-[11px]"
                    >
                      <span>เปิด Google Cloud Console</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </label>
                  <input
                    type="text"
                    value={settings.google_client_id || ''}
                    onChange={(e) => handleChange('google_client_id', e.target.value)}
                    placeholder="เช่น 1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 transition bg-slate-50/50 focus:bg-white font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    นำ Client ID จาก Google Cloud Console (APIs & Services &gt; Credentials &gt; OAuth 2.0 Client IDs) มาวางที่นี่
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    โดเมนอีเมลองค์กรที่อนุญาตให้ล็อกอิน (Allowed Email Domains)
                  </label>
                  <input
                    type="text"
                    value={settings.google_allowed_domains || 'cric.ac.th, vec.mail.go.th'}
                    onChange={(e) => handleChange('google_allowed_domains', e.target.value)}
                    placeholder="เช่น cric.ac.th, vec.mail.go.th"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 transition bg-slate-50/50 focus:bg-white font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    ระบุโดเมนที่อนุญาตให้เข้าสู่ระบบ (คั่นด้วยเครื่องหมายจุลภาค <code>,</code>) หากบุคคลภายนอกใช้อีเมลอื่นระบบจะปฏิเสธการเข้าถึง
                  </p>
                </div>

                {/* Setup Instructions Card */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2.5">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-blue-900" />
                    <span>ข้อมูลสำหรับกรอกบน Google Cloud Console (Authorized URIs):</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1">
                      <span className="font-semibold text-slate-500 block">Authorized JavaScript origins:</span>
                      <code className="text-blue-900 font-mono block select-all">http://localhost:3005</code>
                      <code className="text-blue-900 font-mono block select-all">http://localhost:3000</code>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1">
                      <span className="font-semibold text-slate-500 block">Authorized redirect URIs:</span>
                      <code className="text-blue-900 font-mono block select-all">http://localhost:3005</code>
                      <code className="text-blue-900 font-mono block select-all">http://localhost:3000</code>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>
      )}

      {/* Floating Save Button on Mobile */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur border-t border-slate-200 shadow-lg flex items-center justify-between z-30">
        <div className="text-xs text-slate-500">
          ปีงบประมาณ <span className="font-bold text-slate-800">{settings.current_fiscal_year}</span>
        </div>
        <button
          type="button"
          onClick={() => handleSave()}
          disabled={saving || loading}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-blue-900 hover:bg-blue-800 text-white shadow transition disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}</span>
        </button>
      </div>

      {/* Modal 1: เพิ่มปีงบประมาณใหม่ */}
      {showAddYearModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">เพิ่มปีงบประมาณใหม่</h3>
                    <p className="text-xs text-slate-500">สร้างรอบปีงบประมาณสำหรับจัดทำแผนงานและโครงการ</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddYearModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddFiscalYear} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ระบุปีงบประมาณ (พ.ศ.) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="2500"
                    max="2600"
                    required
                    value={newYearInput}
                    onChange={(e) => setNewYearInput(e.target.value)}
                    placeholder="เช่น 2568, 2569"
                    className="w-full px-3.5 py-2.5 text-sm font-mono font-bold border border-slate-300 rounded-xl outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
                  />
                  
                  {/* Quick Year Selection Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[11px] text-slate-400">เลือกด่วน:</span>
                    {[
                      getCurrentThaiFiscalYear() - 1,
                      getCurrentThaiFiscalYear(),
                      getCurrentThaiFiscalYear() + 1,
                      getCurrentThaiFiscalYear() + 2,
                    ].map((y) => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => setNewYearInput(String(y))}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium transition ${
                          newYearInput === String(y)
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={setAsActiveYear}
                      onChange={(e) => setSetAsActiveYear(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                    />
                    <span>กำหนดให้เป็น <strong>ปีงบประมาณปัจจุบันของระบบ (Active)</strong> ทันที</span>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddYearModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={addingYear}
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{addingYear ? 'กำลังบันทึก...' : 'เพิ่มปีงบประมาณ'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal 2: ตั้งค่าสถานะและเวลาเปิดรับข้อเสนอโครงการ */}
      {showScheduleModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-50 text-blue-900 rounded-xl">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">ตั้งค่าสถานะและเวลาเปิดรับข้อเสนอโครงการ</h3>
                    <p className="text-xs text-slate-500">กำหนดเปิด/ปิดรับ และกรอบระยะเวลาเสนอโครงการประจำปีงบประมาณ</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Submission Open/Close Switch */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <label className="block text-xs font-bold text-slate-800">
                    สถานะการเปิดรับข้อเสนอโครงการ:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleChange('is_submission_open', 'true')}
                      className={`p-3 rounded-xl border text-center font-bold text-xs transition flex items-center justify-center gap-2 ${
                        settings.is_submission_open === 'true'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-xs ring-2 ring-emerald-600/20'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>เปิดรับข้อเสนอโครงการ</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleChange('is_submission_open', 'false')}
                      className={`p-3 rounded-xl border text-center font-bold text-xs transition flex items-center justify-center gap-2 ${
                        settings.is_submission_open === 'false'
                          ? 'border-red-600 bg-red-50 text-red-800 shadow-xs ring-2 ring-red-600/20'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      <span>ปิดรับข้อเสนอโครงการ</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    หากเลือก "ปิดรับข้อเสนอโครงการ" ครูและบุคลากรจะไม่สามารถกดสร้างหรือเสนอโครงการใหม่ได้
                  </p>
                </div>

                {/* Date Ranges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-900" />
                      <span>วันเริ่มต้นเปิดรับข้อเสนอ</span>
                    </label>
                    <input
                      type="date"
                      value={settings.submission_start_date || ''}
                      onChange={(e) => handleChange('submission_start_date', e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-blue-900 bg-white"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1">ปล่อยว่างได้หากไม่จำกัดวันเริ่ม</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-red-500" />
                      <span>วันสิ้นสุดการรับ (Deadline)</span>
                    </label>
                    <input
                      type="date"
                      value={settings.submission_end_date || ''}
                      onChange={(e) => handleChange('submission_end_date', e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-blue-900 bg-white"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1">ปล่อยว่างได้หากไม่จำกัดวันหมดเขต</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowScheduleModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={async () => {
                      await handleSave();
                      setShowScheduleModal(false);
                    }}
                    className="px-5 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
