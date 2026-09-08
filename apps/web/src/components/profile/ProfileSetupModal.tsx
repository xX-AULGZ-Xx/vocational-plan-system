'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { showAlert } from '@/lib/sweetalert';
import {
  User,
  Building2,
  Briefcase,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  ShieldCheck,
  Building,
  UserCheck,
} from 'lucide-react';

interface Department {
  id: number;
  name: string;
  division_id: number;
}

interface Division {
  id: number;
  name: string;
  code: string;
  departments: Department[];
}

// Predefined teacher positions
const TEACHER_POSITIONS = [
  'ครู',
  'ครูผู้ช่วย',
  'ครูชำนาญการ',
  'ครูชำนาญการพิเศษ',
  'ครูเชี่ยวชาญ',
  'ครูอัตราจ้าง',
  'ครูพิเศษสอน',
];

// Predefined staff positions
const STAFF_POSITIONS = [
  'เจ้าหน้าที่',
  'เจ้าหน้าที่ธุรการ',
  'เจ้าหน้าที่การเงิน',
  'เจ้าหน้าที่พัสดุ',
  'เจ้าหน้าที่งานวางแผนและงบประมาณ',
  'เจ้าหน้าที่งานวิจัยและนวัตกรรม',
  'เจ้าหน้าที่งานทะเบียน',
  'เจ้าหน้าที่งานบุคลากร',
  'เจ้าหน้าที่งานอาคารสถานที่',
  'เจ้าหน้าที่ประชาสัมพันธ์',
  'เจ้าหน้าที่เทคโนโลยีสารสนเทศ',
  'พนักงานขับรถยนต์',
  'นักการภารโรง',
];

export default function ProfileSetupModal() {
  const { user, token, updateUser, logout } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingDivisions, setFetchingDivisions] = useState(true);

  // Form State
  const [fullName, setFullName] = useState('');
  const [personnelType, setPersonnelType] = useState<'TEACHER' | 'STAFF'>('TEACHER');
  const [position, setPosition] = useState('ครู');
  const [customPosition, setCustomPosition] = useState('');
  const [selectedDivisionId, setSelectedDivisionId] = useState<number | ''>('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | ''>('');
  const [errorMsg, setErrorMsg] = useState('');

  // Check if setup is needed
  const isNeeded = useMemo(() => {
    if (!user) return false;
    // Explicitly false in DB / user object
    if (user.is_profile_completed === false) return true;
    // Fallback heuristic: default name or no department
    if (!user.department || !user.full_name || user.full_name === user.username) return true;
    return false;
  }, [user]);

  useEffect(() => {
    setMounted(true);
    if (user) {
      if (user.full_name && user.full_name !== user.username) {
        setFullName(user.full_name);
      }
      if (user.position) {
        if (TEACHER_POSITIONS.includes(user.position)) {
          setPersonnelType('TEACHER');
          setPosition(user.position);
        } else if (STAFF_POSITIONS.includes(user.position)) {
          setPersonnelType('STAFF');
          setPosition(user.position);
        } else {
          setPosition('other');
          setCustomPosition(user.position);
        }
      }
      if (user.department?.division_id) {
        setSelectedDivisionId(user.department.division_id);
      }
      if (user.department?.id) {
        setSelectedDepartmentId(user.department.id);
      }
    }
  }, [user]);

  useEffect(() => {
    if (isNeeded) {
      fetchDivisions();
    }
  }, [isNeeded]);

  const fetchDivisions = async () => {
    setFetchingDivisions(true);
    try {
      const res = await fetch('/api/v1/divisions');
      const data = await res.json();
      if (data.success && data.data) {
        setDivisions(data.data);
        // Default to Academic division if teacher and nothing selected
        if (!selectedDivisionId) {
          const acadDiv = data.data.find((d: Division) => d.code === 'acad' || d.name.includes('วิชาการ'));
          if (acadDiv) {
            setSelectedDivisionId(acadDiv.id);
          } else if (data.data.length > 0) {
            setSelectedDivisionId(data.data[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load divisions', err);
    } finally {
      setFetchingDivisions(false);
    }
  };

  // Switch personnel type handler
  const handlePersonnelTypeChange = (type: 'TEACHER' | 'STAFF') => {
    setPersonnelType(type);
    if (type === 'TEACHER') {
      setPosition('ครู');
      setCustomPosition('');
      // Find academic division
      const acadDiv = divisions.find((d) => d.code === 'acad' || d.name.includes('วิชาการ'));
      if (acadDiv) {
        setSelectedDivisionId(acadDiv.id);
        setSelectedDepartmentId('');
      }
    } else {
      setPosition('เจ้าหน้าที่');
      setCustomPosition('');
      // Find resource management or planning division for staff
      const resDiv = divisions.find((d) => d.code === 'res' || d.name.includes('บริหาร'));
      if (resDiv) {
        setSelectedDivisionId(resDiv.id);
        setSelectedDepartmentId('');
      }
    }
  };

  // Filtered departments based on selected division
  const currentDepartments = useMemo(() => {
    if (!selectedDivisionId) return [];
    const div = divisions.find((d) => d.id === Number(selectedDivisionId));
    return div?.departments || [];
  }, [divisions, selectedDivisionId]);

  // When division changes, check if department is still valid
  const handleDivisionChange = (divId: number) => {
    setSelectedDivisionId(divId);
    const div = divisions.find((d) => d.id === divId);
    if (div && div.departments.length > 0) {
      const isCurrentValid = div.departments.some((dept) => dept.id === Number(selectedDepartmentId));
      if (!isCurrentValid) {
        setSelectedDepartmentId('');
      }
    } else {
      setSelectedDepartmentId('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim()) {
      setErrorMsg('กรุณากรอกชื่อ-นามสกุลจริง');
      return;
    }

    const effectivePosition = position === 'other' ? customPosition.trim() : position;
    if (!effectivePosition) {
      setErrorMsg('กรุณาระบุตำแหน่งของคุณ');
      return;
    }

    if (!selectedDivisionId) {
      setErrorMsg('กรุณาเลือกฝ่ายงานที่สังกัด');
      return;
    }

    if (!selectedDepartmentId) {
      setErrorMsg(personnelType === 'TEACHER' ? 'กรุณาเลือกแผนกวิชาที่สังกัด' : 'กรุณาเลือกงานที่สังกัด');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          position: effectivePosition,
          department_id: Number(selectedDepartmentId),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'บันทึกข้อมูลไม่สำเร็จ');
      }

      showAlert.success('บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว', `ยินดีต้อนรับคุณ ${data.user.full_name}`);
      updateUser(data.user, data.token);
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
      setErrorMsg(msg);
      showAlert.error('เกิดข้อผิดพลาด', msg);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || !isNeeded) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div
          className="p-6 text-white text-left relative overflow-hidden"
          style={{ backgroundColor: 'var(--color-primary, #1e3a8a)' }}
        >
          <div className="relative z-10 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20">
              <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-200 text-xs font-semibold border border-amber-400/30 mb-1">
                <span>เข้าสู่ระบบครั้งแรก (First-Time Setup)</span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                ตั้งค่าข้อมูลโปรไฟล์ส่วนตัว
              </h2>
              <p className="text-xs text-blue-100/90 mt-1 leading-relaxed">
                กรุณาระบุชื่อ-นามสกุลจริง ตำแหน่ง และแผนกวิชา/งานที่สังกัด เพื่อใช้แสดงผลในเอกสารและสายการอนุมัติโครงการ
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>ชื่อ - นามสกุลจริง (พร้อมคำนำหน้า เช่น นาย, นาง, นางสาว, ดร.)</span>
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="เช่น นายสมชาย ใจดี หรือ นางสาวสุภาวดี รักเรียน"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
            <p className="text-[11px] text-slate-400">ชื่อนี้จะปรากฏเป็นชื่อผู้เสนอโครงการในแบบเสนอโครงการและบันทึกข้อความ</p>
          </div>

          {/* Personnel Type Selector (ครู / เจ้าหน้าที่) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-slate-500" />
              <span>ประเภทบุคลากร</span>
              <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handlePersonnelTypeChange('TEACHER')}
                className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all ${
                  personnelType === 'TEACHER'
                    ? 'bg-blue-50/80 border-blue-500 text-blue-900 shadow-xs ring-1 ring-blue-500'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    personnelType === 'TEACHER' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold">ครู / สายผู้สอน</p>
                  <p className="text-[10px] text-slate-500">สังกัดแผนกวิชาต่างๆ</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handlePersonnelTypeChange('STAFF')}
                className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all ${
                  personnelType === 'STAFF'
                    ? 'bg-teal-50/80 border-teal-500 text-teal-900 shadow-xs ring-1 ring-teal-500'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    personnelType === 'STAFF' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold">เจ้าหน้าที่ / สายสนับสนุน</p>
                  <p className="text-[10px] text-slate-500">สังกัดงานตามฝ่ายต่างๆ</p>
                </div>
              </button>
            </div>
          </div>

          {/* Position Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span>ตำแหน่งระบุ</span>
              <span className="text-red-500">*</span>
            </label>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white"
            >
              {(personnelType === 'TEACHER' ? TEACHER_POSITIONS : STAFF_POSITIONS).map((pos) => (
                <option key={pos} value={pos}>
                  {pos}
                </option>
              ))}
              <option value="other">ระบุตำแหน่งอื่นๆ...</option>
            </select>

            {position === 'other' && (
              <input
                type="text"
                required
                value={customPosition}
                onChange={(e) => setCustomPosition(e.target.value)}
                placeholder="พิมพ์ระบุตำแหน่ง เช่น พนักงานราชการ, ครูพี่เลี้ยง"
                className="w-full mt-2 px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              />
            )}
          </div>

          {/* Division and Department Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Division */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>ฝ่ายงานที่สังกัด</span>
                <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={selectedDivisionId}
                onChange={(e) => handleDivisionChange(Number(e.target.value))}
                disabled={fetchingDivisions}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white disabled:bg-slate-100"
              >
                <option value="">-- เลือกฝ่ายงาน --</option>
                {divisions.map((div) => (
                  <option key={div.id} value={div.id}>
                    {div.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Department */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                <span>{personnelType === 'TEACHER' ? 'แผนกวิชา' : 'งานที่สังกัด'}</span>
                <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={selectedDepartmentId}
                onChange={(e) => setSelectedDepartmentId(Number(e.target.value))}
                disabled={fetchingDivisions || !selectedDivisionId}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white disabled:bg-slate-100"
              >
                <option value="">
                  {selectedDivisionId
                    ? personnelType === 'TEACHER'
                      ? '-- เลือกแผนกวิชา --'
                      : '-- เลือกงานที่สังกัด --'
                    : '-- กรุณาเลือกฝ่ายงานก่อน --'}
                </option>
                {currentDepartments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={logout}
              className="px-4 py-2.5 text-xs font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
            >
              ออกจากระบบ
            </button>

            <button
              type="submit"
              disabled={loading || fetchingDivisions}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-2"
              style={{ backgroundColor: 'var(--color-primary, #1e3a8a)' }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>บันทึกและเริ่มใช้งานระบบ</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
