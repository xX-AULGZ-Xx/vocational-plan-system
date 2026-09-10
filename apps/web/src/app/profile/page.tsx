'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
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
  ArrowLeft
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, token, login } = useAuth();
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

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
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
        showAlert.success('บันทึกสำเร็จ', 'อัปเดตข้อมูลโปรไฟล์ส่วนตัวเรียบร้อยแล้ว');
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
      <div className="max-w-4xl mx-auto p-12 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-theme-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs">กำลังโหลดข้อมูลโปรไฟล์...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative group shrink-0">
            {profileData.avatar_url ? (
              <img
                src={profileData.avatar_url}
                alt={profileData.full_name}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-full object-cover border-2 border-theme-primary shadow-sm"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className={`w-16 h-16 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-2xl shadow-sm ${
                profileData.avatar_url ? 'hidden' : ''
              }`}
            >
              {profileData.full_name?.charAt(0) || 'U'}
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{profileData.full_name || user?.username}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-theme-primary/10 text-theme-primary border border-theme-primary/20">
                {getRoleLabel(user?.role)}
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              <span>{user?.email || 'ยังไม่ได้ระบุอีเมล'}</span>
            </p>
            <p className="text-[11px] text-slate-400">
              ชื่อผู้ใช้เข้าระบบ: <span className="font-mono font-semibold text-slate-600">{user?.username}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) {
              router.back();
            } else {
              router.push('/dashboard');
            }
          }}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-xl transition-colors self-stretch sm:self-auto justify-center"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>ย้อนกลับ</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Profile Form */}
        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handleUpdateProfile} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <User className="w-4 h-4 text-theme-primary" />
              <h2 className="font-bold text-sm text-slate-800">ข้อมูลส่วนตัวและตำแหน่ง (Profile Details)</h2>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ชื่อ - นามสกุล (สำหรับออกเอกสารราชการ) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={profileData.full_name}
                  onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                  placeholder="เช่น นายสมชาย ใจดี"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:border-theme-primary transition bg-slate-50/50 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ตำแหน่งทางการ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={profileData.position}
                    onChange={(e) => setProfileData({ ...profileData, position: e.target.value })}
                    placeholder="เช่น ครู, หัวหน้าแผนกวิชาช่างยนต์"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:border-theme-primary transition bg-slate-50/50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    แผนกวิชา / ฝ่ายงานที่สังกัด <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={profileData.department_id}
                    onChange={(e) => setProfileData({ ...profileData, department_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:border-theme-primary transition bg-white"
                  >
                    <option value="">-- เลือกแผนก/งาน --</option>
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

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ลิงก์รูปภาพประจำตัว (Avatar Image URL)
                </label>
                <input
                  type="text"
                  value={profileData.avatar_url}
                  onChange={(e) => setProfileData({ ...profileData, avatar_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:border-theme-primary transition bg-slate-50/50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ลายเซ็นดิจิทัล (Digital Signature / Image URL)
                </label>
                <input
                  type="text"
                  value={profileData.signature_img}
                  onChange={(e) => setProfileData({ ...profileData, signature_img: e.target.value })}
                  placeholder="data:image/png;base64,... หรือ ลิงก์รูปภาพลายเซ็น"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl outline-none focus:border-theme-primary transition bg-slate-50/50 focus:bg-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  ลายเซ็นจะถูกนำไปใช้อัตโนมัติในส่วนลงนามเอกสารขออนุมัติโครงการและสรุปผล
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="submit"
                disabled={savingProfile}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-theme-primary hover:bg-theme-primary-hover text-white text-xs font-bold shadow-md transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingProfile ? 'กำลังบันทึก...' : 'บันทึกข้อมูลส่วนตัว'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right 1 Col: Security / Password Form */}
        <div className="space-y-6">
          <form onSubmit={handleChangePassword} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Lock className="w-4 h-4 text-theme-primary" />
              <h2 className="font-bold text-sm text-slate-800">เปลี่ยนรหัสผ่าน (Password)</h2>
            </div>

            <div className="space-y-3 text-xs font-sans">
              <div>
                <label className="block font-bold text-slate-700 mb-1">รหัสผ่านปัจจุบัน</label>
                <input
                  type="password"
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl outline-none focus:border-theme-primary transition"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)</label>
                <input
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl outline-none focus:border-theme-primary transition"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ยืนยันรหัสผ่านใหม่</label>
                <input
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl outline-none focus:border-theme-primary transition"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingPassword}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shadow-sm transition disabled:opacity-50"
              >
                <Key className="w-3.5 h-3.5" />
                <span>{savingPassword ? 'กำลังเปลี่ยน...' : 'อัปเดตรหัสผ่าน'}</span>
              </button>
            </div>
          </form>

          {/* Quick Account Info Card */}
          <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-indigo-900">
              <Shield className="w-4 h-4" />
              <span>สิทธิ์การใช้งาน (RBAC)</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              บทบาทปัจจุบันของคุณคือ <strong className="text-indigo-950">{getRoleLabel(user?.role)}</strong> หากต้องการปรับเปลี่ยนสิทธิ์หรือเพิ่มภาระงาน กรุณาติดต่อผู้ดูแลระบบ
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
