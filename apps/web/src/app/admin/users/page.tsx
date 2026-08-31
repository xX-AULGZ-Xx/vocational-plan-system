'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import AccessDenied from '@/components/common/AccessDenied';
import { showAlert } from '@/lib/sweetalert';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Key,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldCheck,
  Building,
  Briefcase,
  X,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  Lock,
} from 'lucide-react';

interface Division {
  id: number;
  name: string;
  code: string;
  departments: Department[];
}

interface Department {
  id: number;
  name: string;
  division_id: number;
  division?: {
    id: number;
    name: string;
    code: string;
  };
}

interface UserItem {
  id: string;
  username: string;
  email?: string | null;
  google_id?: string | null;
  avatar_url?: string | null;
  full_name: string;
  position: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  department_id: number | null;
  department_name: string;
  division_name: string;
  division_code: string;
  projects_count: number;
  approvals_count: number;
}

const ROLE_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  TEACHER: {
    label: 'ครู / ผู้เสนอโครงการ',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  HEAD_DEPT: {
    label: 'หัวหน้าแผนก / หัวหน้างาน',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  DEPUTY_DIRECTOR: {
    label: 'รองผู้อำนวยการ',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
  },
  PLANNING_OFFICER: {
    label: 'เจ้าหน้าที่งานวางแผนฯ',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  DIRECTOR: {
    label: 'ผู้อำนวยการ',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
  ADMIN: {
    label: 'ผู้ดูแลระบบ (ADMIN)',
    bg: 'bg-slate-900',
    text: 'text-amber-300',
    border: 'border-slate-800',
  },
};

export default function AdminUsersPage() {
  const { user: currentUser, token } = useAuth();

  // Protect route
  if (currentUser && currentUser.role !== 'ADMIN') {
    return <AccessDenied requiredRole="ผู้ดูแลระบบ (ADMIN)" />;
  }

  const [users, setUsers] = useState<UserItem[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Notifications
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // User Form Modal State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    full_name: '',
    position: '',
    role: 'TEACHER',
    department_id: '',
    is_active: true,
  });

  // Reset Password Modal State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<UserItem | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchDivisions();
  }, [token]);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text });
    setTimeout(() => {
      setMsg((current) => (current?.text === text ? null : current));
    }, 4500);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setUsers(data.data);
      } else {
        showNotification('error', data.message || 'ไม่สามารถดึงข้อมูลผู้ใช้ได้');
      }
    } catch (e: any) {
      showNotification('error', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  const fetchDivisions = async () => {
    try {
      const res = await fetch('/api/v1/divisions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setDivisions(data.data);
      }
    } catch (e) {
      console.error('Failed to fetch divisions', e);
    }
  };

  // Flattened departments list for easy dropdowns
  const allDepartments = useMemo(() => {
    return divisions.flatMap((div) =>
      div.departments.map((dept) => ({
        ...dept,
        division_name: div.name,
        division_code: div.code,
      }))
    );
  }, [divisions]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Search
      const matchSearch =
        searchQuery.trim() === '' ||
        u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.position && u.position.toLowerCase().includes(searchQuery.toLowerCase())) ||
        u.department_name.toLowerCase().includes(searchQuery.toLowerCase());

      // Role
      const matchRole = selectedRole === 'ALL' || u.role === selectedRole;

      // Department
      const matchDept =
        selectedDept === 'ALL' || String(u.department_id) === String(selectedDept);

      // Status
      const matchStatus =
        selectedStatus === 'ALL' ||
        (selectedStatus === 'ACTIVE' && u.is_active) ||
        (selectedStatus === 'INACTIVE' && !u.is_active);

      return matchSearch && matchRole && matchDept && matchStatus;
    });
  }, [users, searchQuery, selectedRole, selectedDept, selectedStatus]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      email: '',
      full_name: '',
      position: '',
      role: 'TEACHER',
      department_id: allDepartments.length > 0 ? String(allDepartments[0].id) : '',
      is_active: true,
    });
    setShowPassword(false);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (u: UserItem) => {
    setEditingUser(u);
    setFormData({
      username: u.username,
      password: '',
      email: u.email || '',
      full_name: u.full_name,
      position: u.position || '',
      role: u.role,
      department_id: u.department_id ? String(u.department_id) : '',
      is_active: u.is_active,
    });
    setShowPassword(false);
    setIsModalOpen(true);
  };

  // Submit User Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);

    try {
      const url = editingUser ? `/api/v1/admin/users/${editingUser.id}` : '/api/v1/admin/users';
      const method = editingUser ? 'PUT' : 'POST';

      const payload: any = {
        email: formData.email ? formData.email.trim() : null,
        full_name: formData.full_name,
        position: formData.position,
        role: formData.role,
        department_id: formData.department_id ? parseInt(formData.department_id) : null,
        is_active: formData.is_active,
      };

      if (!editingUser) {
        payload.username = formData.username;
        payload.password = formData.password;
      } else if (formData.password.trim().length > 0) {
        payload.password = formData.password.trim();
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      showNotification('success', data.message || 'บันทึกข้อมูลเรียบร้อยแล้ว');
      setIsModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      showNotification('error', err.message || 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Toggle Active Status
  const handleToggleStatus = async (u: UserItem) => {
    const newStatus = !u.is_active;
    try {
      const res = await fetch(`/api/v1/admin/users/${u.id}/toggle`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: newStatus }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      showNotification('success', data.message);
      setUsers((prev) =>
        prev.map((item) => (item.id === u.id ? { ...item, is_active: newStatus } : item))
      );
    } catch (err: any) {
      showNotification('error', err.message || 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะ');
    }
  };

  // Open Reset Password
  const handleOpenResetPassword = (u: UserItem) => {
    setResetTargetUser(u);
    setNewPassword('');
    setIsResetModalOpen(true);
  };

  // Submit Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser) return;
    setResetSubmitting(true);

    try {
      const res = await fetch(`/api/v1/admin/users/${resetTargetUser.id}/reset-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ new_password: newPassword }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      showNotification('success', data.message || 'รีเซ็ตรหัสผ่านสำเร็จ');
      setIsResetModalOpen(false);
    } catch (err: any) {
      showNotification('error', err.message || 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน');
    } finally {
      setResetSubmitting(false);
    }
  };

  // Delete User
  const handleDeleteUser = async (u: UserItem) => {
    const confirmed = await showAlert.confirm(
      'ยืนยันการลบผู้ใช้',
      `คุณแน่ใจหรือไม่ว่าต้องการลบหรือระงับบัญชีผู้ใช้ "${u.full_name}" (${u.username})?`
    );
    if (!confirmed) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/admin/users/${u.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      showNotification('success', data.message || 'ลบบัญชีผู้ใช้เรียบร้อยแล้ว');
      fetchUsers();
    } catch (err: any) {
      showNotification('error', err.message || 'เกิดข้อผิดพลาดในการลบผู้ใช้');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-theme-primary text-white rounded-theme shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">จัดการผู้ใช้งานในระบบ</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            สร้าง แก้ไข กำหนดสิทธิ์บทบาทหน้าที่ สังกัดแผนกวิชา/งาน และรีเซ็ตรหัสผ่านของผู้ใช้งานทั้งหมด
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="p-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-theme shadow-xs transition"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-theme-primary' : ''}`} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold rounded-theme bg-theme-primary hover:bg-theme-primary-hover text-white shadow-md transition active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>เพิ่มผู้ใช้ใหม่</span>
          </button>
        </div>
      </div>

      {/* Alert Notifications */}
      {msg && (
        <div
          className={`p-3.5 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2.5 shadow-sm ${
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

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] text-slate-500 block font-medium">ผู้ใช้ทั้งหมด</span>
          <div className="text-xl font-bold text-slate-900 mt-0.5">{users.length} คน</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] text-emerald-600 block font-medium">ครู / ผู้เสนอ</span>
          <div className="text-xl font-bold text-emerald-700 mt-0.5">
            {users.filter((u) => u.role === 'TEACHER').length} คน
          </div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] text-blue-600 block font-medium">หัวหน้าแผนก/งาน</span>
          <div className="text-xl font-bold text-blue-700 mt-0.5">
            {users.filter((u) => u.role === 'HEAD_DEPT').length} คน
          </div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] text-amber-600 block font-medium">งานวางแผนฯ</span>
          <div className="text-xl font-bold text-amber-700 mt-0.5">
            {users.filter((u) => u.role === 'PLANNING_OFFICER').length} คน
          </div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] text-purple-600 block font-medium">ผู้บริหาร/รอง ผอ.</span>
          <div className="text-xl font-bold text-purple-700 mt-0.5">
            {users.filter((u) => ['DEPUTY_DIRECTOR', 'DIRECTOR'].includes(u.role)).length} คน
          </div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] text-slate-700 block font-medium">ผู้ดูแลระบบ (Admin)</span>
          <div className="text-xl font-bold text-slate-900 mt-0.5">
            {users.filter((u) => u.role === 'ADMIN').length} คน
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อ, username, ตำแหน่ง..."
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 transition"
            />
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-900 transition bg-white"
            >
              <option value="ALL">-- ทุกบทบาท / สิทธิ์การใช้งาน --</option>
              <option value="TEACHER">ครู / ผู้เสนอโครงการ</option>
              <option value="HEAD_DEPT">หัวหน้าแผนก / หัวหน้างาน</option>
              <option value="DEPUTY_DIRECTOR">รองผู้อำนวยการ</option>
              <option value="PLANNING_OFFICER">เจ้าหน้าที่งานวางแผนฯ</option>
              <option value="DIRECTOR">ผู้อำนวยการ</option>
              <option value="ADMIN">ผู้ดูแลระบบ (ADMIN)</option>
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-900 transition bg-white"
            >
              <option value="ALL">-- ทุกแผนกวิชา / งาน --</option>
              {allDepartments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.division_code ? `[${d.division_code}] ` : ''}
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-900 transition bg-white"
            >
              <option value="ALL">-- ทุกสถานะการใช้งาน --</option>
              <option value="ACTIVE">เปิดใช้งาน (Active)</option>
              <option value="INACTIVE">ระงับการใช้งาน (Inactive)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>
            แสดงผล <strong>{filteredUsers.length}</strong> จากทั้งหมด {users.length} บัญชี
          </span>
          {(searchQuery || selectedRole !== 'ALL' || selectedDept !== 'ALL' || selectedStatus !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedRole('ALL');
                setSelectedDept('ALL');
                setSelectedStatus('ALL');
              }}
              className="text-blue-900 hover:underline font-medium"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          )}
        </div>
      </div>

      {/* Main List Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-sm">
            <div className="w-8 h-8 border-2 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            กำลังโหลดข้อมูลผู้ใช้งาน...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-2">
            <Users className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700 text-sm">ไม่พบข้อมูลผู้ใช้งาน</p>
            <p className="text-xs text-slate-400">ลองปรับเปลี่ยนคำค้นหาหรือตัวกรองด้านบน</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs sm:text-sm">
                <thead className="bg-slate-50/75 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">ผู้ใช้งาน / ชื่อล็อกอิน</th>
                    <th className="px-5 py-3.5">ตำแหน่งทางการ</th>
                    <th className="px-5 py-3.5">แผนกวิชา / ฝ่ายสังกัด</th>
                    <th className="px-5 py-3.5">บทบาท (Role)</th>
                    <th className="px-4 py-3.5 text-center">สถานะ</th>
                    <th className="px-5 py-3.5 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredUsers.map((u) => {
                    const roleCfg = ROLE_CONFIG[u.role] || {
                      label: u.role,
                      bg: 'bg-slate-100',
                      text: 'text-slate-800',
                      border: 'border-slate-200',
                    };

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Name & Username */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            {u.avatar_url ? (
                              <img
                                src={u.avatar_url}
                                alt={u.full_name}
                                className="w-9 h-9 rounded-full object-cover border border-slate-200 flex-shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                {u.full_name ? u.full_name.charAt(0) : 'U'}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{u.full_name}</span>
                                {u.username === currentUser?.username && (
                                  <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-normal">
                                    คุณ
                                  </span>
                                )}
                                {u.google_id && (
                                  <span
                                    title="เชื่อมต่อกับบัญชี Google แล้ว"
                                    className="text-[10px] bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.2 rounded font-semibold flex items-center gap-0.5"
                                  >
                                    <span className="font-bold">G</span>oogle
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 font-mono flex items-center gap-2">
                                <span>@{u.username}</span>
                                {u.email && <span className="text-slate-400 font-sans">• {u.email}</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Position */}
                        <td className="px-5 py-3.5 text-slate-700">
                          {u.position || <span className="text-slate-400 italic">- ไม่ได้ระบุ -</span>}
                        </td>

                        {/* Department & Division */}
                        <td className="px-5 py-3.5">
                          <div className="text-slate-900 font-medium">{u.department_name}</div>
                          <div className="text-[11px] text-slate-500">{u.division_name}</div>
                        </td>

                        {/* Role Badge */}
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${roleCfg.bg} ${roleCfg.text} ${roleCfg.border}`}
                          >
                            {roleCfg.label}
                          </span>
                        </td>

                        {/* Status Toggle */}
                        <td className="px-4 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(u)}
                            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              u.is_active ? 'bg-emerald-600' : 'bg-slate-300'
                            }`}
                            title={u.is_active ? 'กดเพื่อระงับการใช้งาน' : 'กดเพื่อเปิดใช้งาน'}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                u.is_active ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </td>

                        {/* Action Buttons */}
                        <td className="px-5 py-3.5 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenResetPassword(u)}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="รีเซ็ตรหัสผ่าน"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            title="แก้ไขข้อมูลผู้ใช้"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="ลบ / ระงับบัญชี"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredUsers.map((u) => {
                const roleCfg = ROLE_CONFIG[u.role] || {
                  label: u.role,
                  bg: 'bg-slate-100',
                  text: 'text-slate-800',
                  border: 'border-slate-200',
                };

                return (
                  <div key={u.id} className="p-4 space-y-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {u.avatar_url ? (
                          <img
                            src={u.avatar_url}
                            alt={u.full_name}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {u.full_name ? u.full_name.charAt(0) : 'U'}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-1">
                            <span>{u.full_name}</span>
                            {u.google_id && (
                              <span className="text-[9px] bg-red-50 text-red-600 border border-red-200 px-1 py-0.2 rounded font-bold">
                                G
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 font-mono">@{u.username}</div>
                          {u.email && <div className="text-[11px] text-slate-400 font-sans">{u.email}</div>}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleStatus(u)}
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          u.is_active ? 'bg-emerald-600' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            u.is_active ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="space-y-1 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg">
                      {u.position && (
                        <div className="flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                          <span>{u.position}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {u.department_name} ({u.division_name})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${roleCfg.bg} ${roleCfg.text} ${roleCfg.border}`}
                      >
                        {roleCfg.label}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenResetPassword(u)}
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition"
                          title="รีเซ็ตรหัสผ่าน"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-2 text-blue-700 hover:bg-blue-50 rounded-lg transition"
                          title="แก้ไข"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="ลบ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Modal 1: Create / Edit User */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 text-blue-900 rounded-lg">
                  {editingUser ? <Edit2 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                </div>
                <h3 className="font-bold text-slate-900 text-base">
                  {editingUser ? 'แก้ไขข้อมูลผู้ใช้งาน' : 'เพิ่มผู้ใช้งานใหม่'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Username */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ชื่อผู้ใช้ (Username) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingUser)}
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="เช่น somchai.k"
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 transition disabled:bg-slate-100 font-mono"
                  />
                  {editingUser && <span className="text-[10px] text-slate-400">ชื่อผู้ใช้ไม่สามารถเปลี่ยนได้</span>}
                </div>

                {/* Password (Optional for Edit) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {editingUser ? 'รหัสผ่านใหม่ (เว้นว่างได้)' : 'รหัสผ่าน (Password)'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required={!editingUser && !formData.email}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={editingUser ? '••••••••' : 'อย่างน้อย 4 ตัวอักษร'}
                      className="w-full pl-3 pr-8 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  อีเมลองค์กร / Google Account (เช่น user@cric.ac.th)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="เช่น somchai@cric.ac.th หรือ somchai@vec.mail.go.th"
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 transition"
                />
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อ-นามสกุล <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="เช่น นายสมชาย เข็มทอง"
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 transition"
                />
              </div>

              {/* Position */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ตำแหน่งทางการ</label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="เช่น ครูชำนาญการ, หัวหน้างาน..."
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Role */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    บทบาท / สิทธิ์การใช้งาน <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-900 transition bg-white"
                  >
                    <option value="TEACHER">ครู / ผู้เสนอโครงการ (TEACHER)</option>
                    <option value="HEAD_DEPT">หัวหน้าแผนก / งาน (HEAD_DEPT)</option>
                    <option value="DEPUTY_DIRECTOR">รองผู้อำนวยการ (DEPUTY_DIRECTOR)</option>
                    <option value="PLANNING_OFFICER">เจ้าหน้าที่งานวางแผนฯ (PLANNING_OFFICER)</option>
                    <option value="DIRECTOR">ผู้อำนวยการ (DIRECTOR)</option>
                    <option value="ADMIN">ผู้ดูแลระบบ (ADMIN)</option>
                  </select>
                </div>

                {/* Department */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">แผนกวิชา / ฝ่ายสังกัด</label>
                  <select
                    value={formData.department_id}
                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-900 transition bg-white"
                  >
                    <option value="">-- ไม่ระบุแผนก --</option>
                    {allDepartments.map((d) => (
                      <option key={d.id} value={d.id}>
                        [{d.division_code}] {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status Toggle */}
              <div className="pt-2">
                <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-900 rounded border-slate-300 focus:ring-blue-900"
                  />
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-slate-800 block">เปิดใช้งานบัญชีนี้ (Active)</span>
                    <span className="text-[11px] text-slate-500">หากปิด บัญชีจะไม่สามารถล็อกอินเข้าสู่ระบบได้</span>
                  </div>
                </label>
              </div>

              {/* Modal Footer Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs sm:text-sm font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{formSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Reset Password Dialog */}
      {isResetModalOpen && resetTargetUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-amber-50/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-100 text-amber-900 rounded-lg">
                  <Key className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">รีเซ็ตรหัสผ่าน</h3>
              </div>
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
                <div className="text-slate-500">ผู้ใช้งาน:</div>
                <div className="font-bold text-slate-900 text-sm">{resetTargetUser.full_name}</div>
                <div className="text-slate-500 font-mono">Username: @{resetTargetUser.username}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  กำหนดรหัสผ่านใหม่ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 4 ตัวอักษร)"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-lg outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 transition font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={resetSubmitting || newPassword.trim().length < 4}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs sm:text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow transition disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  <span>{resetSubmitting ? 'กำลังตั้งรหัส...' : 'ยืนยันรหัสผ่านใหม่'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
