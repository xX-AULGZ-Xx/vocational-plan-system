'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import { showAlert } from '@/lib/sweetalert';
import {
  User,
  Mail,
  Building,
  Briefcase,
  Shield,
  Key,
  Save,
  CheckCircle2,
  Lock,
  FileSignature,
  Camera,
  Award,
  ArrowLeft,
  Sparkles,
  Eraser,
  Upload,
  Check,
  Phone,
  HelpCircle,
  ExternalLink,
  Eye,
  EyeOff
} from 'lucide-react';

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { user, token, login } = useAuth();
  const { collegeName } = useSettings();
  const [activeTab, setActiveTab] = useState<'info' | 'avatar' | 'signature' | 'security'>('info');
  const [departments, setDepartments] = useState<any[]>([]);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Profile Form State
  const [profileData, setProfileData] = useState({
    full_name: '',
    email: '',
    position: '',
    department_id: '',
    signature_img: '',
    avatar_url: '',
  });

  // Password Form State
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Canvas Signature pad state
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    fetchProfileAndMetadata();
  }, []);

  const fetchProfileAndMetadata = async () => {
    setLoading(true);
    try {
      const [profileRes, deptRes, divRes] = await Promise.all([
        fetch('/api/v1/auth/me', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }),
        fetch('/api/v1/departments'),
        fetch('/api/v1/divisions'),
      ]);

      const profileJson = await profileRes.json();
      const deptJson = await deptRes.json();
      const divJson = await divRes.json();

      if (profileJson.success && profileJson.user) {
        const u = profileJson.user;
        setProfileData({
          full_name: u.full_name || '',
          email: u.email || '',
          position: u.position || '',
          department_id: u.department?.id ? String(u.department.id) : (u.department_id ? String(u.department_id) : ''),
          signature_img: u.signature_img || '',
          avatar_url: u.avatar_url || '',
        });
      }

      if (deptJson.success && Array.isArray(deptJson.data)) {
        setDepartments(deptJson.data);
      }
      if (divJson.success && Array.isArray(divJson.data)) {
        setDivisions(divJson.data);
      }
    } catch (err: any) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!profileData.full_name.trim()) {
      showAlert.error('กรุณากรอกชื่อ-นามสกุล', 'ชื่อ-นามสกุลจำเป็นสำหรับการออกเอกสารราชการ');
      return;
    }
    if (!profileData.department_id) {
      showAlert.error('กรุณาเลือกแผนก/ฝ่ายงาน', 'จำเป็นต้องระบุสังกัดในการบริหารโครงการ');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await fetch('/api/v1/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showAlert.success('บันทึกสำเร็จ', 'อัปเดตข้อมูลการตั้งค่าโปรไฟล์เรียบร้อยแล้ว');
        if (data.token && data.user) {
          login(data.token, data.user);
        }
      } else {
        showAlert.error('บันทึกไม่สำเร็จ', data.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (err: any) {
      showAlert.error('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.new_password.length < 6) {
      showAlert.error('รหัสผ่านสั้นเกินไป', 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      showAlert.error('รหัสผ่านไม่ตรงกัน', 'กรุณากรอกรหัสผ่านใหม่และการยืนยันให้ตรงกัน');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch('/api/v1/auth/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showAlert.success('เปลี่ยนรหัสผ่านสำเร็จ', 'รหัสผ่านใหม่ของคุณได้รับการอัปเดตแล้ว');
        setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
      } else {
        showAlert.error('เปลี่ยนรหัสผ่านไม่สำเร็จ', data.message || 'รหัสผ่านปัจจุบันไม่ถูกต้อง');
      }
    } catch (err: any) {
      showAlert.error('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setSavingPassword(false);
    }
  };

  // --- Signature Pad Methods ---
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = sigCanvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      setProfileData((prev) => ({ ...prev, signature_img: dataUrl }));
    }
  };

  const clearSignatureCanvas = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  // Avatar file upload (Data URL)
  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showAlert.error('ไฟล์มีขนาดใหญ่เกินไป', 'กรุณาอัปโหลดรูปภาพขนาดไม่เกิน 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setProfileData((prev) => ({ ...prev, avatar_url: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  // Signature file upload
  const handleSignatureFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showAlert.error('ไฟล์มีขนาดใหญ่เกินไป', 'กรุณาอัปโหลดรูปภาพขนาดไม่เกิน 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setProfileData((prev) => ({ ...prev, signature_img: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const avatarPresets = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
  ];

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'ADMIN': return 'ผู้ดูแลระบบ (System Admin)';
      case 'DIRECTOR': return 'ผู้อำนวยการสถานศึกษา';
      case 'DEPUTY_DIRECTOR': return 'รองผู้อำนวยการสถานศึกษา';
      case 'PLANNING_OFFICER': return 'เจ้าหน้าที่งานวางแผนและงบประมาณ';
      case 'HEAD_DEPT': return 'หัวหน้าแผนกวิชา / หัวหน้างาน';
      case 'TEACHER':
      default: return 'ครูผู้สอน / ผู้รับผิดชอบโครงการ';
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-16 text-center text-slate-400">
        <div className="w-10 h-10 border-3 border-theme-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium">กำลังโหลดการตั้งค่าโปรไฟล์ส่วนตัว...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Top Banner & User Card Styled with System Gradient */}
      <div className="relative overflow-hidden bg-theme-gradient text-white rounded-theme p-6 sm:p-8 shadow-xl transition-all duration-300">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative shrink-0 group">
              {profileData.avatar_url ? (
                <img
                  src={profileData.avatar_url}
                  alt={profileData.full_name}
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 rounded-theme object-cover border-2 border-white/30 shadow-md ring-4 ring-white/10"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className={`w-20 h-20 rounded-theme bg-white/20 text-white flex items-center justify-center font-bold text-3xl shadow-md border-2 border-white/30 ring-4 ring-white/10 backdrop-blur-sm ${
                  profileData.avatar_url ? 'hidden' : ''
                }`}
              >
                {profileData.full_name?.charAt(0) || 'U'}
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('avatar')}
                className="absolute -bottom-2 -right-2 p-1.5 rounded-theme bg-white text-slate-900 shadow-md hover:bg-slate-100 transition"
                title="เปลี่ยนรูปโปรไฟล์"
              >
                <Camera className="w-3.5 h-3.5 text-theme-primary" />
              </button>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {profileData.full_name || user?.username}
                </h1>
                <span className="px-3 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white border border-white/20 backdrop-blur-sm">
                  {getRoleLabel(user?.role)}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-white/90 flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-white/80" />
                  {profileData.email || user?.email || 'ยังไม่ได้ระบุอีเมล'}
                </span>
                {profileData.position && (
                  <>
                    <span className="text-white/40">•</span>
                    <span className="text-white font-medium">{profileData.position}</span>
                  </>
                )}
              </p>
              <p className="text-[11px] text-white/70">
                บัญชีผู้ใช้งาน: <span className="font-mono text-white font-semibold">{user?.username}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-stretch sm:self-auto justify-end">
            <button
              type="button"
              onClick={() => router.push('/profile')}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-theme transition shadow-sm"
            >
              <User className="w-4 h-4 text-theme-primary" />
              <span>ดูหน้าโปรไฟล์</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) {
                  router.back();
                } else {
                  router.push('/dashboard');
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-theme transition border border-white/15 backdrop-blur-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>ย้อนกลับ</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modern Navigation Tabs Styled with Theme */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 backdrop-blur-sm rounded-theme border border-slate-200/80 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('info')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-theme text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'info'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <User className={`w-4 h-4 ${activeTab === 'info' ? 'text-theme-primary' : 'text-slate-400'}`} />
          <span>ข้อมูลทั่วไปและสังกัด</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('avatar')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-theme text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'avatar'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Camera className={`w-4 h-4 ${activeTab === 'avatar' ? 'text-theme-primary' : 'text-slate-400'}`} />
          <span>รูปภาพโปรไฟล์</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('signature')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-theme text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'signature'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <FileSignature className={`w-4 h-4 ${activeTab === 'signature' ? 'text-theme-primary' : 'text-slate-400'}`} />
          <span>ลายเซ็นดิจิทัล (Digital Signature)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-theme text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'security'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Lock className={`w-4 h-4 ${activeTab === 'security' ? 'text-theme-primary' : 'text-slate-400'}`} />
          <span>ความปลอดภัย & รหัสผ่าน</span>
        </button>
      </div>

      {/* TAB 1: General Info & Department */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-150">
          <form onSubmit={handleUpdateProfile} className="md:col-span-2 bg-white p-6 sm:p-7 rounded-theme border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-theme bg-theme-primary-light text-theme-primary">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-sm sm:text-base text-slate-900">ข้อมูลส่วนตัวและตำแหน่ง</h2>
                  <p className="text-[11px] text-slate-500">ข้อมูลนี้จะถูกนำไปพิมพ์ลงในเอกสารโครงการและบันทึกข้อความราชการ</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  ชื่อ - นามสกุล (สำหรับออกเอกสารราชการ) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={profileData.full_name}
                  onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                  placeholder="เช่น นายสมชาย ใจดี"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-theme outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/10 transition bg-slate-50/50 focus:bg-white text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    ตำแหน่งทางการ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={profileData.position}
                    onChange={(e) => setProfileData({ ...profileData, position: e.target.value })}
                    placeholder="เช่น ครู คศ.๒, หัวหน้างาน..."
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-theme outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/10 transition bg-slate-50/50 focus:bg-white text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    อีเมลติดต่อ (Email)
                  </label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    placeholder="name@cric.ac.th"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-theme outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/10 transition bg-slate-50/50 focus:bg-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  แผนกวิชา / ฝ่ายงานที่สังกัด <span className="text-rose-500">*</span>
                </label>
                <select
                  value={profileData.department_id}
                  onChange={(e) => setProfileData({ ...profileData, department_id: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-theme outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/10 transition bg-white text-sm"
                  required
                >
                  <option value="">-- กรุณาเลือกแผนก/ฝ่ายงาน --</option>
                  {divisions.map((div) => {
                    const depts = departments.filter((d) => d.division_id === div.id);
                    if (depts.length === 0) return null;
                    return (
                      <optgroup key={div.id} label={`ฝ่าย${div.name}`}>
                        {depts.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <span className="text-[11px] text-slate-400">กดบันทึกเพื่ออัปเดตข้อมูลในระบบทันที</span>
              <button
                type="submit"
                disabled={savingProfile}
                className="flex items-center gap-2 px-6 py-2.5 rounded-theme bg-theme-primary hover:bg-theme-primary-hover text-white text-xs font-bold shadow-md transition disabled:opacity-50 active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>{savingProfile ? 'กำลังบันทึก...' : 'บันทึกข้อมูลส่วนตัว'}</span>
              </button>
            </div>
          </form>

          {/* Right Info Card */}
          <div className="space-y-4">
            <div className="bg-theme-primary-light p-6 rounded-theme border border-theme-primary/20 space-y-3">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Shield className="w-4 h-4 text-theme-primary" />
                <span>สิทธิ์การใช้งาน (RBAC)</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                คุณเข้าสู่ระบบด้วยสิทธิ์ <strong className="text-slate-900 font-bold">{getRoleLabel(user?.role)}</strong>
              </p>
              <div className="pt-2 border-t border-theme-primary/20 text-[11px] text-slate-600 space-y-1">
                <p>• สามารถสร้างและเสนอโครงการตามแผนกที่สังกัด</p>
                <p>• เข้าถึงระบบติดตามและสรุปผลโครงการ</p>
              </div>
            </div>

            <div className="bg-slate-50 p-5 rounded-theme border border-slate-200 text-xs text-slate-500 space-y-2">
              <p className="font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>คำแนะนำการตั้งค่า</span>
              </p>
              <p className="text-[11px] leading-relaxed">
                การระบุชื่อ-นามสกุล และตำแหน่งที่ถูกต้อง จะช่วยให้การออกรายงานสรุปโครงการและเอกสารเสนอขออนุมัติมีความสมบูรณ์ถูกต้องตามระเบียบสารบรรณ
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Avatar Photo */}
      {activeTab === 'avatar' && (
        <div className="bg-white p-6 sm:p-8 rounded-theme border border-slate-200 shadow-sm space-y-6 animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="p-2 rounded-theme bg-theme-primary-light text-theme-primary">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-slate-900">รูปภาพประจำตัว (Avatar Picture)</h2>
              <p className="text-[11px] text-slate-500">เลือกรูปภาพเพื่อแสดงผลใน Navbar และโปรไฟล์ของคุณ</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            {/* Current Preview */}
            <div className="flex flex-col items-center p-6 bg-slate-50 rounded-theme border border-slate-200/80 space-y-3">
              <span className="text-xs font-bold text-slate-700">ตัวอย่างรูปปัจจุบัน</span>
              <div className="relative">
                {profileData.avatar_url ? (
                  <img
                    src={profileData.avatar_url}
                    alt={profileData.full_name}
                    referrerPolicy="no-referrer"
                    className="w-28 h-28 rounded-theme object-cover border-2 border-theme-primary shadow-md"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-theme bg-slate-900 text-white flex items-center justify-center font-bold text-4xl shadow-md">
                    {profileData.full_name?.charAt(0) || 'U'}
                  </div>
                )}
              </div>
              <p className="text-[10px] text-slate-400 text-center">
                จะแสดงผลในแถบเมนูบน และระบบอนุมัติโครงการ
              </p>
            </div>

            {/* Upload & Presets */}
            <div className="md:col-span-2 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  อัปโหลดรูปภาพจากอุปกรณ์ (Upload Image File)
                </label>
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 hover:border-theme-primary rounded-theme cursor-pointer bg-slate-50/50 hover:bg-theme-primary-light/40 transition group">
                  <Upload className="w-6 h-6 text-slate-400 group-hover:text-theme-primary mb-2 transition" />
                  <span className="text-xs font-bold text-slate-700 group-hover:text-theme-primary">
                    คลิกเพื่อเลือกไฟล์รูปภาพ (JPG, PNG, WebP)
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">ขนาดไม่เกิน 2MB</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  หรือระบุลิงก์รูปภาพโดยตรง (Image URL)
                </label>
                <input
                  type="text"
                  value={profileData.avatar_url}
                  onChange={(e) => setProfileData({ ...profileData, avatar_url: e.target.value })}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-theme outline-none focus:border-theme-primary transition bg-slate-50/50 focus:bg-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  หรือเลือกจากภาพตัวอย่าง (Preset Avatars)
                </label>
                <div className="flex flex-wrap gap-3">
                  {avatarPresets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setProfileData({ ...profileData, avatar_url: preset })}
                      className={`relative w-12 h-12 rounded-theme overflow-hidden border-2 transition ${
                        profileData.avatar_url === preset ? 'border-theme-primary ring-2 ring-theme-primary/30 scale-105' : 'border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <img src={preset} alt="preset" className="w-full h-full object-cover" />
                      {profileData.avatar_url === preset && (
                        <div className="absolute inset-0 bg-theme-primary/40 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white stroke-[3]" />
                        </div>
                      )}
                    </button>
                  ))}
                  {profileData.avatar_url && (
                    <button
                      type="button"
                      onClick={() => setProfileData({ ...profileData, avatar_url: '' })}
                      className="px-3 py-1.5 rounded-theme border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 text-[11px] font-bold transition flex items-center gap-1"
                    >
                      <Eraser className="w-3.5 h-3.5" />
                      <span>รีเซ็ตเป็นตัวย่อ</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleUpdateProfile()}
                  disabled={savingProfile}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-theme bg-theme-primary hover:bg-theme-primary-hover text-white text-xs font-bold shadow-md transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingProfile ? 'กำลังบันทึก...' : 'บันทึกรูปโปรไฟล์'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Digital Signature */}
      {activeTab === 'signature' && (
        <div className="bg-white p-6 sm:p-8 rounded-theme border border-slate-200 shadow-sm space-y-6 animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="p-2 rounded-theme bg-emerald-50 text-emerald-600">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-slate-900">ลายเซ็นดิจิทัล (Digital Signature)</h2>
              <p className="text-[11px] text-slate-500">
                ลายเซ็นนี้จะถูกนำไปใช้อัตโนมัติในส่วนลงนามเอกสารขออนุมัติโครงการและสรุปผล
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Draw Pad */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-theme-primary" />
                  <span>เซ็นสดบนหน้าจอ (Touch / Mouse Pad)</span>
                </span>
                <button
                  type="button"
                  onClick={clearSignatureCanvas}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 px-2.5 py-1 rounded-theme transition"
                >
                  <Eraser className="w-3 h-3" />
                  <span>ล้างลายเซ็น</span>
                </button>
              </div>

              <div className="relative border-2 border-dashed border-slate-300 rounded-theme p-2 bg-slate-50/50 hover:bg-white transition flex items-center justify-center">
                <canvas
                  ref={sigCanvasRef}
                  width={420}
                  height={160}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="bg-white rounded-theme shadow-inner w-full cursor-crosshair touch-none border border-slate-200"
                />
                {!hasDrawn && (
                  <div className="absolute pointer-events-none text-slate-400 text-xs flex flex-col items-center gap-1">
                    <FileSignature className="w-5 h-5 opacity-40" />
                    <span>ใช้นิ้วหรือเมาส์จรดเพื่อเซ็นชื่อที่นี่</span>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-slate-400">
                เมื่อวาดเสร็จ ระบบจะนำภาพลายเซ็นไปบันทึกเป็นลายเซ็นประจำตัวของคุณโดยอัตโนมัติ
              </p>
            </div>

            {/* Current & Upload */}
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold text-slate-700 block mb-2">ตัวอย่างลายเซ็นปัจจุบัน</span>
                <div className="p-4 bg-slate-50 rounded-theme border border-slate-200/80 flex items-center justify-center min-h-[140px]">
                  {profileData.signature_img ? (
                    <div className="flex flex-col items-center gap-2">
                      <img
                        src={profileData.signature_img}
                        alt="Signature"
                        className="max-h-24 max-w-full object-contain filter drop-shadow-sm"
                      />
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        พร้อมใช้งานในเอกสาร
                      </span>
                    </div>
                  ) : (
                    <div className="text-center text-slate-400 text-xs">
                      <FileSignature className="w-6 h-6 mx-auto mb-1 opacity-30" />
                      <span>ยังไม่มีลายเซ็นในระบบ</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  หรืออัปโหลดไฟล์รูปภาพลายเซ็น (PNG พื้นหลังโปร่งใส แนะนำ)
                </label>
                <label className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-300 hover:border-theme-primary rounded-theme cursor-pointer bg-white hover:bg-slate-50 transition text-xs font-semibold text-slate-700 shadow-2xs">
                  <Upload className="w-4 h-4 text-theme-primary" />
                  <span>เลือกไฟล์รูปลายเซ็นจากเครื่อง</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSignatureFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleUpdateProfile()}
                  disabled={savingProfile}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-theme bg-theme-primary hover:bg-theme-primary-hover text-white text-xs font-bold shadow-md transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingProfile ? 'กำลังบันทึก...' : 'บันทึกลายเซ็น'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Security & Password */}
      {activeTab === 'security' && (
        <form onSubmit={handleChangePassword} className="bg-white p-6 sm:p-8 rounded-theme border border-slate-200 shadow-sm space-y-6 max-w-2xl animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="p-2 rounded-theme bg-amber-50 text-amber-600">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-slate-900">เปลี่ยนรหัสผ่าน (Change Password)</h2>
              <p className="text-[11px] text-slate-500">กำหนดรหัสผ่านใหม่เพื่อความปลอดภัยในการเข้าใช้งานระบบ</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                รหัสผ่านปัจจุบัน <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword.current ? 'text' : 'password'}
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                  placeholder="กรอกรหัสผ่านเดิมของคุณ"
                  className="w-full px-4 py-2.5 pr-10 border border-slate-300 rounded-theme outline-none focus:border-theme-primary text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => ({ ...p, current: !p.current }))}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword.new ? 'text' : 'password'}
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                  placeholder="กรอกรหัสผ่านใหม่"
                  className="w-full px-4 py-2.5 pr-10 border border-slate-300 rounded-theme outline-none focus:border-theme-primary text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => ({ ...p, new: !p.new }))}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                ยืนยันรหัสผ่านใหม่อีกครั้ง <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword.confirm ? 'text' : 'password'}
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                  placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                  className="w-full px-4 py-2.5 pr-10 border border-slate-300 rounded-theme outline-none focus:border-theme-primary text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => ({ ...p, confirm: !p.confirm }))}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">หลังเปลี่ยนรหัสผ่านสามารถใช้งานต่อได้ทันที</span>
            <button
              type="submit"
              disabled={savingPassword}
              className="flex items-center gap-2 px-6 py-2.5 rounded-theme bg-theme-primary hover:bg-theme-primary-hover text-white text-xs font-bold shadow-md transition disabled:opacity-50"
            >
              <Key className="w-4 h-4" />
              <span>{savingPassword ? 'กำลังเปลี่ยนรหัส...' : 'อัปเดตรหัสผ่านใหม่'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
