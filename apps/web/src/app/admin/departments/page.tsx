'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { showAlert } from '@/lib/sweetalert';
import {
  Building2,
  FolderPlus,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Layers,
  Search,
  BookOpen,
  Users,
  Compass,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface Department {
  id: number;
  name: string;
  division_id: number;
  head_name?: string;
  head_position?: string;
}

interface Division {
  id: number;
  name: string;
  code: string;
  deputy_name?: string;
  deputy_position?: string;
  departments: Department[];
}

import AccessDenied from '@/components/common/AccessDenied';

export default function AdminDepartmentsPage() {
  const { user, token } = useAuth();

  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDivisionId, setActiveDivisionId] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Protect route
  if (user && user.role !== 'ADMIN') {
    return <AccessDenied requiredRole="ผู้ดูแลระบบ (ADMIN)" />;
  }

  // Notifications
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Department Actions
  const [newDeptNames, setNewDeptNames] = useState<Record<number, string>>({});
  const [editingDeptId, setEditingDeptId] = useState<number | null>(null);
  const [editingDeptName, setEditingDeptName] = useState('');
  const [editingDeptHeadName, setEditingDeptHeadName] = useState('');
  const [editingDeptHeadPos, setEditingDeptHeadPos] = useState('');
  const [editingDeptDivId, setEditingDeptDivId] = useState<number>(1);

  // Division Actions Modal
  const [showDivisionModal, setShowDivisionModal] = useState(false);
  const [newDivName, setNewDivName] = useState('');
  const [newDivCode, setNewDivCode] = useState('');
  const [newDivDeputyName, setNewDivDeputyName] = useState('');
  const [newDivDeputyPos, setNewDivDeputyPos] = useState('');
  const [editingDivId, setEditingDivId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 5000);
  };

  // 1. Load all Divisions & Departments
  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/divisions');
      const data = await res.json();
      if (data.success) {
        setDivisions(data.data);
      } else {
        showError(data.message || 'ไม่สามารถโหลดข้อมูลฝ่ายและแผนกได้');
      }
    } catch (err: any) {
      showError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 2. Add Department to a specific division
  const handleAddDepartment = async (divisionId: number) => {
    const name = newDeptNames[divisionId]?.trim();
    if (!name) return;

    setActionLoading(true);
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/v1/divisions/departments', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name,
          division_id: divisionId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewDeptNames((prev) => ({ ...prev, [divisionId]: '' }));
        showSuccess(`เพิ่ม "${name}" เรียบร้อยแล้ว`);
        await loadData();
      } else {
        showError(data.message || 'ไม่สามารถเพิ่มแผนกได้');
      }
    } catch (err: any) {
      showError('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Edit Department
  const handleUpdateDepartment = async (deptId: number) => {
    if (!editingDeptName.trim()) return;

    setActionLoading(true);
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/v1/divisions/departments/${deptId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          name: editingDeptName.trim(),
          division_id: editingDeptDivId,
          head_name: editingDeptHeadName.trim(),
          head_position: editingDeptHeadPos.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingDeptId(null);
        setEditingDeptName('');
        setEditingDeptHeadName('');
        setEditingDeptHeadPos('');
        showSuccess('อัปเดตข้อมูลแผนกวิชา / งาน สำเร็จ');
        await loadData();
      } else {
        showError(data.message || 'ไม่สามารถอัปเดตแผนกได้');
      }
    } catch (err) {
      showError('เกิดข้อผิดพลาดในการอัปเดตข้อมูล');
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Delete Department
  const handleDeleteDepartment = async (deptId: number, deptName: string) => {
    const confirmed = await showAlert.confirm('ยืนยันการลบแผนก', `คุณต้องการลบ "${deptName}" ออกจากระบบอย่างถาวรหรือไม่?`);
    if (!confirmed) return;

    setActionLoading(true);
    try {
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/v1/divisions/departments/${deptId}`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();
      if (data.success) {
        showSuccess(`ลบ "${deptName}" เรียบร้อยแล้ว`);
        await loadData();
      } else {
        showError(data.message || 'ไม่สามารถลบแผนกได้');
      }
    } catch (err) {
      showError('เกิดข้อผิดพลาดในการลบข้อมูล');
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Add or Update Division
  const handleSaveDivision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDivName.trim() || !newDivCode.trim()) return;

    setActionLoading(true);
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const url = editingDivId ? `/api/v1/divisions/${editingDivId}` : '/api/v1/divisions';
      const method = editingDivId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify({
          name: newDivName.trim(),
          code: newDivCode.trim(),
          deputy_name: newDivDeputyName.trim(),
          deputy_position: newDivDeputyPos.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowDivisionModal(false);
        setNewDivName('');
        setNewDivCode('');
        setNewDivDeputyName('');
        setNewDivDeputyPos('');
        setEditingDivId(null);
        showSuccess(editingDivId ? 'อัปเดตฝ่ายสำเร็จ' : 'เพิ่มฝ่าย / กลุ่มงานใหม่สำเร็จ');
        await loadData();
      } else {
        showError(data.message || 'ไม่สามารถบันทึกข้อมูลฝ่ายได้');
      }
    } catch (err) {
      showError('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Delete Division
  const handleDeleteDivision = async (divId: number, divName: string) => {
    const confirmed = await showAlert.confirm('ยืนยันการลบฝ่าย', `คุณต้องการลบ "${divName}" และข้อมูลแผนกทั้งหมดในฝ่ายนี้หรือไม่?`);
    if (!confirmed) return;

    setActionLoading(true);
    try {
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/v1/divisions/${divId}`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();
      if (data.success) {
        showSuccess(`ลบฝ่าย "${divName}" สำเร็จ`);
        await loadData();
      } else {
        showError(data.message || 'ไม่สามารถลบฝ่ายได้');
      }
    } catch (err) {
      showError('เกิดข้อผิดพลาดในการลบข้อมูล');
    } finally {
      setActionLoading(false);
    }
  };

  // Calculate stats
  const totalDepartments = divisions.reduce((acc, div) => acc + (div.departments?.length || 0), 0);

  // Filter divisions to display
  const filteredDivisions = divisions
    .filter((div) => activeDivisionId === 'all' || div.id === activeDivisionId)
    .map((div) => {
      const filteredDepts = (div.departments || []).filter((dept) =>
        dept.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return { ...div, filteredDepts };
    });

  const getDivisionIcon = (code: string) => {
    switch (code?.toLowerCase()) {
      case 'acad':
        return <BookOpen className="w-5 h-5 text-blue-600" />;
      case 'res':
        return <Building2 className="w-5 h-5 text-emerald-600" />;
      case 'dev':
        return <Users className="w-5 h-5 text-purple-600" />;
      case 'strat':
        return <Compass className="w-5 h-5 text-amber-600" />;
      default:
        return <Layers className="w-5 h-5 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="bg-theme-gradient rounded-theme p-6 text-white shadow-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-white/80 text-xs font-semibold uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            <span>โครงสร้างการบริหารสถานศึกษา</span>
          </div>
          <h1 className="text-2xl font-bold">จัดการ ฝ่าย / กลุ่มงาน และ แผนกวิชา / งาน</h1>
          <p className="text-white/80 text-xs mt-1">
            กำหนดโครงสร้างฝ่ายบริหารและแผนกวิชา/งาน เพื่อใช้อ้างอิงในระบบเอกสารและแบบฟอร์มขออนุมัติโครงการ
          </p>
        </div>

        <button
          onClick={() => {
            setEditingDivId(null);
            setNewDivName('');
            setNewDivCode('');
            setShowDivisionModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-theme-accent hover:brightness-110 text-white rounded-theme text-xs font-bold shadow-md transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มฝ่าย / กลุ่มงาน</span>
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 text-xs font-medium animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center gap-2 text-xs font-medium animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center font-bold">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">ฝ่าย / กลุ่มงาน ทั้งหมด</div>
            <div className="text-2xl font-bold text-slate-900">{divisions.length} ฝ่าย</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-900 flex items-center justify-center font-bold">
            <FolderPlus className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">แผนกวิชา / งาน ทั้งหมด</div>
            <div className="text-2xl font-bold text-slate-900">{totalDepartments} รายการ</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-900 flex items-center justify-center font-bold">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">สถานะการเชื่อมโยงระบบ</div>
            <div className="text-xs font-bold text-emerald-700 mt-1">พร้อมใช้งานในแบบฟอร์ม 100%</div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Division Tab Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveDivisionId('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeDivisionId === 'all'
                ? 'bg-blue-950 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            แสดงทุกฝ่าย ({divisions.length})
          </button>

          {divisions.map((div) => (
            <button
              key={div.id}
              onClick={() => setActiveDivisionId(div.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeDivisionId === div.id
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{div.name}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeDivisionId === div.id ? 'bg-blue-800 text-blue-200' : 'bg-slate-200 text-slate-600'
              }`}>
                {div.departments?.length || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาแผนกวิชา / งาน..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 bg-slate-50 focus:bg-white"
          />
        </div>
      </div>

      {/* Main Divisions & Departments Hierarchy List */}
      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-400 text-sm">
            กำลังโหลดข้อมูลโครงสร้างฝ่ายและแผนกวิชา...
          </div>
        ) : filteredDivisions.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-400 text-sm">
            ไม่พบข้อมูลฝ่ายหรือแผนกที่ค้นหา
          </div>
        ) : (
          filteredDivisions.map((division) => (
            <div
              key={division.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition hover:border-slate-300"
            >
              {/* Division Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    {getDivisionIcon(division.code)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-slate-900 text-sm">{division.name}</h2>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200">
                        CODE: {division.code?.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                      <span>แผนกและงานในสังกัด {division.departments?.length || 0} รายการ</span>
                      {division.deputy_name && (
                        <span className="text-blue-900 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                          👤 รอง ผอ.: {division.deputy_name} {division.deputy_position ? `(${division.deputy_position})` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingDivId(division.id);
                      setNewDivName(division.name);
                      setNewDivCode(division.code);
                      setNewDivDeputyName(division.deputy_name || '');
                      setNewDivDeputyPos(division.deputy_position || '');
                      setShowDivisionModal(true);
                    }}
                    className="p-1.5 text-slate-500 hover:text-blue-900 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 text-xs flex items-center gap-1 transition cursor-pointer"
                    title="แก้ไขชื่อฝ่ายและรองผู้อำนวยการ"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>แก้ไขฝ่าย</span>
                  </button>

                  <button
                    onClick={() => handleDeleteDivision(division.id, division.name)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-xs flex items-center gap-1 transition cursor-pointer"
                    title="ลบฝ่าย"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Quick Add Department Inside Division */}
              <div className="p-4 bg-blue-50/40 border-b border-blue-100/70">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddDepartment(division.id);
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={newDeptNames[division.id] || ''}
                    onChange={(e) =>
                      setNewDeptNames({ ...newDeptNames, [division.id]: e.target.value })
                    }
                    placeholder={`+ เพิ่มแผนกวิชาหรือชื่อกลุ่มงานใหม่ สังกัด "${division.name}"...`}
                    className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-blue-900 outline-none bg-white font-medium text-slate-800"
                    disabled={actionLoading}
                  />
                  <button
                    type="submit"
                    disabled={actionLoading || !(newDeptNames[division.id] || '').trim()}
                    className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่มเข้าฝ่ายนี้</span>
                  </button>
                </form>
              </div>

              {/* Department Items Grid */}
              <div className="p-4">
                {division.filteredDepts.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    {searchQuery ? 'ไม่พบแผนกที่ตรงกับคำค้นหา' : 'ยังไม่มีแผนกวิชาหรือกลุ่มงานในฝ่ายนี้'}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {division.filteredDepts.map((dept) => {
                      const isEditing = editingDeptId === dept.id;

                      if (isEditing) {
                        return (
                          <div
                            key={dept.id}
                            className="p-3.5 bg-blue-50 border-2 border-blue-400 rounded-xl space-y-2.5 col-span-full md:col-span-2 lg:col-span-1 shadow-sm"
                          >
                            <div className="flex items-center justify-between text-xs font-bold text-blue-950">
                              <span>แก้ไขข้อมูลแผนก / งาน</span>
                              <span className="text-[10px] font-mono text-slate-500">ID: {dept.id}</span>
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-slate-700 block mb-0.5">
                                ชื่อแผนกวิชา / งาน: <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={editingDeptName}
                                onChange={(e) => setEditingDeptName(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs border border-blue-300 rounded-lg bg-white outline-none font-bold"
                                placeholder="เช่น แผนกวิชาช่างยนต์, งานการเงิน..."
                                autoFocus
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-slate-700 block mb-0.5">
                                ชื่อหัวหน้าแผนก / หัวหน้างาน:
                              </label>
                              <input
                                type="text"
                                value={editingDeptHeadName}
                                onChange={(e) => setEditingDeptHeadName(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white outline-none"
                                placeholder="เช่น นายประสิทธิ์ ใจดี"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-slate-700 block mb-0.5">
                                ตำแหน่งหัวหน้า:
                              </label>
                              <input
                                type="text"
                                value={editingDeptHeadPos}
                                onChange={(e) => setEditingDeptHeadPos(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white outline-none"
                                placeholder="เช่น หัวหน้าแผนกวิชาเทคโนโลยีสารสนเทศ"
                              />
                            </div>

                            <div className="space-y-0.5">
                              <label className="text-[11px] font-bold text-slate-700 block">
                                สังกัดฝ่าย:
                              </label>
                              <select
                                value={editingDeptDivId}
                                onChange={(e) => setEditingDeptDivId(parseInt(e.target.value))}
                                className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                              >
                                {divisions.map((d) => (
                                  <option key={d.id} value={d.id}>
                                    {d.name} ({d.code})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex justify-end gap-1.5 pt-1 border-t border-blue-200">
                              <button
                                type="button"
                                onClick={() => setEditingDeptId(null)}
                                className="px-2.5 py-1 text-xs text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
                              >
                                ยกเลิก
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateDepartment(dept.id)}
                                disabled={actionLoading || !editingDeptName.trim()}
                                className="px-3 py-1 text-xs font-bold text-white bg-blue-900 rounded-lg hover:bg-blue-800 flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3 h-3" /> บันทึก
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={dept.id}
                          className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start justify-between gap-2 hover:bg-white hover:border-slate-300 hover:shadow-2xs transition group"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>
                              <span className="text-xs font-bold text-slate-800 truncate">
                                {dept.name}
                              </span>
                            </div>
                            {dept.head_name ? (
                              <p className="text-[11px] text-slate-600 pl-4 flex items-center gap-1">
                                <span className="text-slate-400">หัวหน้า:</span>
                                <span className="font-semibold text-slate-800 truncate">{dept.head_name}</span>
                              </p>
                            ) : (
                              <p className="text-[10px] text-slate-400 pl-4 italic">
                                ยังไม่ได้ระบุหัวหน้า
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingDeptId(dept.id);
                                setEditingDeptName(dept.name);
                                setEditingDeptHeadName(dept.head_name || '');
                                setEditingDeptHeadPos(dept.head_position || `หัวหน้า${dept.name}`);
                                setEditingDeptDivId(dept.division_id);
                              }}
                              className="p-1 text-slate-400 hover:text-blue-900 hover:bg-blue-50 rounded transition cursor-pointer"
                              title="แก้ไขชื่อ หัวหน้า หรือย้ายฝ่าย"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                              disabled={actionLoading}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                              title="ลบแผนกนี้"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Division Add/Edit Modal */}
      {showDivisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-blue-950 text-white">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-300" />
                <h3 className="font-bold text-sm">
                  {editingDivId ? 'แก้ไขฝ่าย / กลุ่มงาน' : 'เพิ่มฝ่าย / กลุ่มงานใหม่'}
                </h3>
              </div>
              <button
                onClick={() => setShowDivisionModal(false)}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveDivision} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อฝ่าย / กลุ่มงาน: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newDivName}
                  onChange={(e) => setNewDivName(e.target.value)}
                  placeholder="เช่น ฝ่ายบริหารทรัพยากร, ฝ่ายวิชาการ..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-blue-900 outline-none font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  รหัสฝ่าย (Code ย่อ): <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newDivCode}
                  onChange={(e) => setNewDivCode(e.target.value)}
                  placeholder="เช่น acad, res, dev, strat..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-blue-900 outline-none font-mono"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  ใช้สำหรับสร้าง URL และกำหนดสิทธิ์ เช่น /divisions/acad
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ชื่อรองผู้อำนวยการประจำฝ่าย:
                  </label>
                  <input
                    type="text"
                    value={newDivDeputyName}
                    onChange={(e) => setNewDivDeputyName(e.target.value)}
                    placeholder="เช่น ดร.สมศักดิ์ มั่นคง"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-blue-900 outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ตำแหน่งรองผู้อำนวยการ:
                  </label>
                  <input
                    type="text"
                    value={newDivDeputyPos}
                    onChange={(e) => setNewDivDeputyPos(e.target.value)}
                    placeholder={`เช่น รองผู้อำนวยการ${newDivName || 'ฝ่าย'}`}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-blue-900 outline-none font-medium"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDivisionModal(false)}
                  className="px-4 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !newDivName.trim() || !newDivCode.trim()}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg transition disabled:opacity-50 flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>บันทึกข้อมูลฝ่าย</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
