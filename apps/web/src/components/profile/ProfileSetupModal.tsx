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
  const [selectedDivisionIds, setSelectedDivisionIds] = useState<number[]>([]);
  const [primaryDivisionId, setPrimaryDivisionId] = useState<number | ''>('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | ''>(''); // Primary department
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<number[]>([]);
  const [headDeptIds, setHeadDeptIds] = useState<number[]>([]);
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
        setSelectedDivisionIds([user.department.division_id]);
        setPrimaryDivisionId(user.department.division_id);
      }
      if (user.department?.id) {
        setSelectedDepartmentId(user.department.id);
        setSelectedDepartmentIds([user.department.id]);
        if (user.role === 'HEAD_DEPT') {
          setHeadDeptIds([user.department.id]);
        }
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
        // Default select divisions based on teacher/staff
        if (selectedDivisionIds.length === 0) {
          const acadDiv = data.data.find((d: Division) => d.code === 'acad' || d.name.includes('วิชาการ'));
          if (acadDiv) {
            setSelectedDivisionIds([acadDiv.id]);
            setPrimaryDivisionId(acadDiv.id);
          } else if (data.data.length > 0) {
            setSelectedDivisionIds([data.data[0].id]);
            setPrimaryDivisionId(data.data[0].id);
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
      const acadDiv = divisions.find((d) => d.code === 'acad' || d.name.includes('วิชาการ'));
      if (acadDiv) {
        setSelectedDivisionIds([acadDiv.id]);
        setPrimaryDivisionId(acadDiv.id);
        setSelectedDepartmentId('');
        setSelectedDepartmentIds([]);
        setHeadDeptIds([]);
      }
    } else {
      setPosition('เจ้าหน้าที่');
      setCustomPosition('');
      const resDiv = divisions.find((d) => d.code === 'res' || d.name.includes('บริหาร'));
      if (resDiv) {
        setSelectedDivisionIds([resDiv.id]);
        setPrimaryDivisionId(resDiv.id);
        setSelectedDepartmentId('');
        setSelectedDepartmentIds([]);
        setHeadDeptIds([]);
      }
    }
  };

  // Toggle division selection (multiple divisions allowed)
  const handleToggleDivision = (divId: number) => {
    setSelectedDivisionIds((prev) => {
      let next: number[];
      if (prev.includes(divId)) {
        if (prev.length === 1) return prev; // Keep at least 1
        next = prev.filter((id) => id !== divId);
      } else {
        next = [...prev, divId];
      }

      // If primary division was removed, set new primary
      if (!next.includes(Number(primaryDivisionId))) {
        setPrimaryDivisionId(next[0] || '');
      }

      // Remove departments that belong to unselected divisions
      const validDeptIds = divisions
        .filter((d) => next.includes(d.id))
        .flatMap((d) => d.departments.map((dept) => dept.id));

      setSelectedDepartmentIds((curDepts) => {
        const filtered = curDepts.filter((id) => validDeptIds.includes(id));
        if (!filtered.includes(Number(selectedDepartmentId))) {
          setSelectedDepartmentId(filtered[0] || '');
        }
        return filtered;
      });

      setHeadDeptIds((curHeads) => curHeads.filter((id) => validDeptIds.includes(id)));

      return next;
    });
  };

  // Toggle department in multi-select mode
  const handleToggleDepartment = (deptId: number) => {
    setSelectedDepartmentIds((prev) => {
      let next: number[];
      if (prev.includes(deptId)) {
        next = prev.filter((id) => id !== deptId);
        // Also remove from headDeptIds if unchecked
        setHeadDeptIds((heads) => heads.filter((h) => h !== deptId));
      } else {
        next = [...prev, deptId];
      }

      if (next.length > 0) {
        if (!next.includes(Number(selectedDepartmentId))) {
          setSelectedDepartmentId(next[0]);
        }
      } else {
        setSelectedDepartmentId('');
      }
      return next;
    });
  };

  // Toggle is_head for specific department
  const handleToggleHeadDept = (deptId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    // Auto-select department if not already selected
    if (!selectedDepartmentIds.includes(deptId)) {
      setSelectedDepartmentIds((prev) => [...prev, deptId]);
      if (!selectedDepartmentId) setSelectedDepartmentId(deptId);
    }

    setHeadDeptIds((prev) => {
      if (prev.includes(deptId)) {
        return prev.filter((id) => id !== deptId);
      } else {
        return [...prev, deptId];
      }
    });
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

    if (selectedDivisionIds.length === 0) {
      setErrorMsg('กรุณาเลือกฝ่ายงานที่สังกัดอย่างน้อย 1 ฝ่าย');
      return;
    }

    const effectiveDeptId = selectedDepartmentId || (selectedDepartmentIds.length > 0 ? selectedDepartmentIds[0] : null);
    if (!effectiveDeptId) {
      setErrorMsg(personnelType === 'TEACHER' ? 'กรุณาเลือกแผนกวิชาหรือภาระงานที่รับผิดชอบอย่างน้อย 1 รายการ' : 'กรุณาเลือกงานที่รับผิดชอบอย่างน้อย 1 งาน');
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
          department_id: Number(effectiveDeptId),
          is_head: headDeptIds.length > 0,
          head_dept_ids: headDeptIds,
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

  // Group departments by selected divisions
  const activeDivisionsWithDepts = divisions.filter((d) => selectedDivisionIds.includes(d.id));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col my-8">
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
                ตั้งค่าข้อมูลโปรไฟล์และหน้าที่ความรับผิดชอบ
              </h2>
              <p className="text-xs text-blue-100/90 mt-1 leading-relaxed">
                กรุณาระบุชื่อ-นามสกุลจริง ตำแหน่ง และเลือกฝ่าย/งานที่สังกัด (สามารถเลือกได้หลายฝ่ายและหลายงาน) พร้อมติ๊กตำแหน่งหัวหน้างานได้ทันที
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
                  <p className="text-[10px] text-slate-500">สังกัดแผนกวิชา / ช่วยงานฝ่าย</p>
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

          {/* Division Multi-Select */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>ฝ่ายงานที่ปฏิบัติหน้าที่ (เลือกได้มากกว่า 1 ฝ่าย)</span>
                <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-blue-900 font-medium bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                เลือกแล้ว {selectedDivisionIds.length} ฝ่าย
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {divisions.map((div) => {
                const isChecked = selectedDivisionIds.includes(div.id);
                return (
                  <div
                    key={div.id}
                    onClick={() => handleToggleDivision(div.id)}
                    className={`p-3 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition ${
                      isChecked
                        ? 'bg-blue-50/90 border-blue-500 text-blue-950 font-bold shadow-2xs ring-1 ring-blue-500'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="w-4 h-4 text-blue-900 rounded border-slate-300 pointer-events-none"
                      />
                      <span>{div.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">[{div.code?.toUpperCase()}]</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Departments & Works Selection with Inline Head of Work Checkbox */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  {personnelType === 'TEACHER' ? 'แผนกวิชา / งานที่รับผิดชอบ' : 'งานที่รับผิดชอบในฝ่าย'}
                  <span className="text-red-500 font-bold ml-1">*</span>
                </span>
              </label>
              <span className="text-[11px] text-blue-900 font-medium bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                เลือกงานแล้ว {selectedDepartmentIds.length} งาน / หัวหน้างาน {headDeptIds.length} งาน
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 max-h-64 overflow-y-auto space-y-3">
              {activeDivisionsWithDepts.length === 0 ? (
                <div className="text-center py-5 text-slate-400 text-xs">
                  กรุณาเลือกฝ่ายงานด้านบนเพื่อแสดงรายการงาน/แผนกวิชา
                </div>
              ) : (
                activeDivisionsWithDepts.map((div) => (
                  <div key={div.id} className="space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-600 bg-slate-200/70 px-2.5 py-1 rounded-md flex items-center justify-between">
                      <span>📁 {div.name}</span>
                      <span className="text-[10px] font-mono text-slate-500">[{div.code?.toUpperCase()}]</span>
                    </div>

                    <div className="space-y-1.5 pl-1">
                      {div.departments.map((dept) => {
                        const isChecked = selectedDepartmentIds.includes(dept.id);
                        const isPrimary = selectedDepartmentId === dept.id;
                        const isHeadOfThisDept = headDeptIds.includes(dept.id);

                        return (
                          <div
                            key={dept.id}
                            onClick={() => handleToggleDepartment(dept.id)}
                            className={`p-2.5 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer transition ${
                              isChecked
                                ? 'bg-white border-blue-400 text-slate-900 font-semibold shadow-2xs'
                                : 'bg-white/80 border-slate-200 text-slate-700 hover:bg-white'
                            }`}
                          >
                            {/* Left: Department Name */}
                            <div className="flex items-center gap-2.5 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="w-4 h-4 text-blue-900 rounded border-slate-300 pointer-events-none shrink-0"
                              />
                              <span className="truncate">{dept.name}</span>
                              {isPrimary && (
                                <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.2 rounded font-bold shrink-0">
                                  งานหลัก
                                </span>
                              )}
                            </div>

                            {/* Right Actions: [Set Primary] & [เป็นหัวหน้างาน Toggle] */}
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pl-6 sm:pl-0">
                              {isChecked && !isPrimary && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDepartmentId(dept.id);
                                  }}
                                  className="text-[10px] px-1.5 py-0.5 rounded border bg-slate-50 text-slate-600 border-slate-300 hover:bg-blue-50 hover:text-blue-900 hover:border-blue-300"
                                >
                                  ตั้งเป็นงานหลัก
                                </button>
                              )}

                              {/* Head of department toggle button */}
                              <button
                                type="button"
                                onClick={(e) => handleToggleHeadDept(dept.id, e)}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition flex items-center gap-1.5 ${
                                  isHeadOfThisDept
                                    ? 'bg-amber-500 text-white border-amber-600 shadow-xs ring-1 ring-amber-400'
                                    : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-amber-50 hover:text-amber-900 hover:border-amber-300'
                                }`}
                                title="ติ๊กเพื่อระบุว่าท่านดำรงตำแหน่งหัวหน้าสำหรับงาน/แผนกนี้"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>{isHeadOfThisDept ? '✓ เป็นหัวหน้างาน' : '+ เป็นหัวหน้างาน'}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
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
