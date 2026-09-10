'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import { showAlert } from '@/lib/sweetalert';
import {
  User,
  Mail,
  Building,
  Building2,
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
  EyeOff,
  GraduationCap,
  ShieldCheck,
  UserCheck,
  ZoomIn,
  ZoomOut,
  Move,
  RotateCw,
  AlignCenter,
  Maximize2,
  Sliders,
  Crop,
  ArrowUp,
  ArrowDown,
  ArrowLeft as ArrowLeftIcon,
  ArrowRight as ArrowRightIcon,
  RefreshCw,
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

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { user, token, login } = useAuth();
  const { collegeName } = useSettings();

  const [activeTab, setActiveTab] = useState<'info' | 'avatar' | 'signature' | 'security'>('info');
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [personnelType, setPersonnelType] = useState<'TEACHER' | 'STAFF'>('TEACHER');
  const [position, setPosition] = useState('ครู');
  const [customPosition, setCustomPosition] = useState('');
  const [selectedDivisionIds, setSelectedDivisionIds] = useState<number[]>([]);
  const [primaryDivisionId, setPrimaryDivisionId] = useState<number | ''>('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | ''>(''); // Primary department
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<number[]>([]);
  const [headDeptIds, setHeadDeptIds] = useState<number[]>([]);

  const [signatureImg, setSignatureImg] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Avatar Reposition & Crop State
  const [rawAvatarImage, setRawAvatarImage] = useState<string | null>(null);
  const [avatarZoom, setAvatarZoom] = useState<number>(1);
  const [avatarOffsetX, setAvatarOffsetX] = useState<number>(0);
  const [avatarOffsetY, setAvatarOffsetY] = useState<number>(0);
  const [avatarRotation, setAvatarRotation] = useState<number>(0);
  const [isDraggingAvatar, setIsDraggingAvatar] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const avatarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const avatarImgRef = useRef<HTMLImageElement | null>(null);

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
  }, [token]);

  // Sync initial user state if available
  useEffect(() => {
    if (user) {
      if (!fullName && user.full_name) setFullName(user.full_name);
      if (!email && user.email) setEmail(user.email);
      if (!avatarUrl && user.avatar_url) {
        setAvatarUrl(user.avatar_url);
        setRawAvatarImage(user.avatar_url);
      }
      if (!signatureImg && (user as any).signature_img) setSignatureImg((user as any).signature_img);
    }
  }, [user]);

  const fetchProfileAndMetadata = async () => {
    setLoading(true);
    try {
      // Safely load profile from /api/v1/auth/me
      let profileUser = null;
      try {
        const profileRes = await fetch('/api/v1/auth/me', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (profileRes.ok) {
          const profileJson = await profileRes.json();
          if (profileJson.success && profileJson.user) {
            profileUser = profileJson.user;
          }
        }
      } catch (e) {
        console.warn('Could not fetch /api/v1/auth/me, using local user state:', e);
      }

      // Safely load divisions
      let divList: Division[] = [];
      try {
        const divRes = await fetch('/api/v1/divisions');
        if (divRes.ok) {
          const divJson = await divRes.json();
          if (divJson.success && Array.isArray(divJson.data)) {
            divList = divJson.data;
            setDivisions(divList);
          }
        }
      } catch (e) {
        console.warn('Could not fetch /api/v1/divisions:', e);
      }

      const activeUser = profileUser || user;
      if (activeUser) {
        const u = activeUser;
        setFullName(u.full_name || u.username || '');
        setEmail(u.email || '');
        setSignatureImg(u.signature_img || '');
        setAvatarUrl(u.avatar_url || '');
        if (u.avatar_url) {
          setRawAvatarImage(u.avatar_url);
        }

        if (u.position) {
          if (TEACHER_POSITIONS.includes(u.position)) {
            setPersonnelType('TEACHER');
            setPosition(u.position);
          } else if (STAFF_POSITIONS.includes(u.position)) {
            setPersonnelType('STAFF');
            setPosition(u.position);
          } else {
            setPosition('other');
            setCustomPosition(u.position);
          }
        }

        const deptId = u.department?.id ? Number(u.department.id) : ((u as any).department_id ? Number((u as any).department_id) : null);
        const divId = u.department?.division_id ? Number(u.department.division_id) : ((u as any).division_id ? Number((u as any).division_id) : null);

        if (divId) {
          setSelectedDivisionIds([divId]);
          setPrimaryDivisionId(divId);
        } else if (divList.length > 0) {
          setSelectedDivisionIds([divList[0].id]);
          setPrimaryDivisionId(divList[0].id);
        }

        if (deptId) {
          setSelectedDepartmentId(deptId);
          setSelectedDepartmentIds([deptId]);
          if (u.role === 'HEAD_DEPT') {
            setHeadDeptIds([deptId]);
          }
        }
      }
    } catch (err: any) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
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
        if (prev.length === 1) return prev;
        next = prev.filter((id) => id !== divId);
      } else {
        next = [...prev, divId];
      }

      if (!next.includes(Number(primaryDivisionId))) {
        setPrimaryDivisionId(next[0] || '');
      }

      const validDeptIds = divisions
        .filter((d) => next.includes(d.id))
        .flatMap((d) => (d.departments || []).map((dept) => dept.id));

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

  // -------------------------------------------------------------
  // Avatar Canvas Cropper & Repositioning Logic
  // -------------------------------------------------------------
  const renderAvatarToCanvas = useCallback(() => {
    const canvas = avatarCanvasRef.current;
    if (!canvas || !rawAvatarImage) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = rawAvatarImage;
    img.onload = () => {
      avatarImgRef.current = img;
      const size = canvas.width; // e.g. 300x300
      ctx.clearRect(0, 0, size, size);

      // Background fill
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, size, size);

      ctx.save();
      // Move to center of canvas
      ctx.translate(size / 2, size / 2);
      ctx.rotate((avatarRotation * Math.PI) / 180);
      ctx.scale(avatarZoom, avatarZoom);

      // Calculate aspect ratio covering
      const imgAspect = img.width / img.height;
      let drawW = size;
      let drawH = size;

      if (imgAspect > 1) {
        drawW = size * imgAspect;
        drawH = size;
      } else {
        drawW = size;
        drawH = size / imgAspect;
      }

      // Draw image with offset
      ctx.drawImage(
        img,
        -drawW / 2 + avatarOffsetX,
        -drawH / 2 + avatarOffsetY,
        drawW,
        drawH
      );

      ctx.restore();
    };
  }, [rawAvatarImage, avatarZoom, avatarOffsetX, avatarOffsetY, avatarRotation]);

  useEffect(() => {
    if (rawAvatarImage && activeTab === 'avatar') {
      renderAvatarToCanvas();
    }
  }, [rawAvatarImage, avatarZoom, avatarOffsetX, avatarOffsetY, avatarRotation, activeTab, renderAvatarToCanvas]);

  // Apply crop from canvas to avatarUrl
  const handleApplyCroppedAvatar = () => {
    const canvas = avatarCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png', 0.95);
    setAvatarUrl(dataUrl);
    showAlert.success('ปรับตำแหน่งเรียบร้อย', 'รูปภาพของคุณได้รับการตัดและปรับมุมมองแล้ว อย่าลืมกดบันทึกรูปโปรไฟล์');
  };

  // Mouse / Touch Drag handlers for Avatar canvas
  const handleAvatarMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDraggingAvatar(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleAvatarMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingAvatar) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    setAvatarOffsetX((prev) => Math.max(-200, Math.min(200, prev + deltaX * (1 / avatarZoom))));
    setAvatarOffsetY((prev) => Math.max(-200, Math.min(200, prev + deltaY * (1 / avatarZoom))));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleAvatarMouseUp = () => {
    setIsDraggingAvatar(false);
  };

  const handleAvatarTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      setIsDraggingAvatar(true);
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  const handleAvatarTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDraggingAvatar || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - dragStart.x;
    const deltaY = e.touches[0].clientY - dragStart.y;
    setAvatarOffsetX((prev) => Math.max(-200, Math.min(200, prev + deltaX * (1 / avatarZoom))));
    setAvatarOffsetY((prev) => Math.max(-200, Math.min(200, prev + deltaY * (1 / avatarZoom))));
    setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleAvatarTouchEnd = () => {
    setIsDraggingAvatar(false);
  };

  const resetAvatarPosition = () => {
    setAvatarZoom(1);
    setAvatarOffsetX(0);
    setAvatarOffsetY(0);
    setAvatarRotation(0);
  };

  const handleUpdateProfile = async (e?: React.FormEvent, customSuccessMsg?: string) => {
    if (e) e.preventDefault();
    
    // Determine effective full name
    const effectiveFullName = fullName.trim() || user?.full_name || user?.username || '';
    if (!effectiveFullName) {
      showAlert.error('กรุณากรอกชื่อ-นามสกุลจริง', 'ชื่อ-นามสกุลจำเป็นสำหรับการออกเอกสารราชการ');
      return;
    }

    const effectivePosition = position === 'other' ? customPosition.trim() : (position || user?.position || 'ครูผู้สอน');

    const effectiveDeptId = selectedDepartmentId || (selectedDepartmentIds.length > 0 ? selectedDepartmentIds[0] : (user?.department?.id || (user as any)?.department_id || null));
    if (user?.role !== 'ADMIN' && !effectiveDeptId) {
      showAlert.error(
        'กรุณาเลือกงานที่รับผิดชอบ',
        personnelType === 'TEACHER'
          ? 'โปรดเลือกแผนกวิชาหรือภาระงานที่รับผิดชอบอย่างน้อย 1 รายการ'
          : 'โปรดเลือกงานที่รับผิดชอบอย่างน้อย 1 งาน'
      );
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
        body: JSON.stringify({
          full_name: effectiveFullName,
          email: email.trim() || user?.email || '',
          position: effectivePosition,
          department_id: effectiveDeptId ? Number(effectiveDeptId) : null,
          is_head: headDeptIds.length > 0,
          head_dept_ids: headDeptIds,
          signature_img: signatureImg,
          avatar_url: avatarUrl,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showAlert.success('บันทึกสำเร็จ', customSuccessMsg || 'อัปเดตข้อมูลการตั้งค่าโปรไฟล์เรียบร้อยแล้ว');
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
      setSignatureImg(dataUrl);
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
    if (file.size > 5 * 1024 * 1024) {
      showAlert.error('ไฟล์มีขนาดใหญ่เกินไป', 'กรุณาอัปโหลดรูปภาพขนาดไม่เกิน 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      setRawAvatarImage(res);
      setAvatarUrl(res);
      resetAvatarPosition();
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
      setSignatureImg(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const avatarPresets = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&auto=format&fit=crop&q=80',
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

  // Active divisions with departments for group rendering
  const activeDivisionsWithDepts = divisions.filter((d) => selectedDivisionIds.includes(d.id));

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Top Banner & User Card Styled with System Gradient */}
      <div className="relative overflow-hidden bg-theme-gradient text-white rounded-theme p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative shrink-0 group">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={fullName}
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
                  avatarUrl ? 'hidden' : ''
                }`}
              >
                {fullName?.charAt(0) || user?.username?.charAt(0) || 'U'}
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
                  {fullName || user?.username}
                </h1>
                <span className="px-3 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white border border-white/20 backdrop-blur-sm">
                  {getRoleLabel(user?.role)}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-white/90 flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-white/80" />
                  {email || user?.email || 'ยังไม่ได้ระบุอีเมล'}
                </span>
                {position && (
                  <>
                    <span className="text-white/40">•</span>
                    <span className="text-white font-medium">{position === 'other' ? customPosition : position}</span>
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
          <span>รูปภาพโปรไฟล์ & ปรับตำแหน่ง</span>
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

      {/* TAB 1: General Info, Personnel Type, Positions, Multi-Division, Multi-Department with Head Toggle */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <form onSubmit={handleUpdateProfile} className="md:col-span-2 bg-white p-6 sm:p-7 rounded-theme border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-theme bg-theme-primary-light text-theme-primary">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-sm sm:text-base text-slate-900">ข้อมูลส่วนตัวและหน้าที่ความรับผิดชอบ</h2>
                  <p className="text-[11px] text-slate-500">ข้อมูลนี้จะถูกนำไปพิมพ์ลงในเอกสารโครงการและบันทึกข้อความราชการ</p>
                </div>
              </div>
            </div>

            <div className="space-y-5 text-xs font-sans">
              {/* 1. Full Name */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>ชื่อ - นามสกุลจริง (พร้อมคำนำหน้า เช่น นาย, นาง, นางสาว, ดร.)</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="เช่น นายสมชาย ใจดี หรือ นางสาวสุภาวดี รักเรียน"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-theme outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/10 transition bg-slate-50/50 focus:bg-white text-sm"
                />
                <p className="text-[11px] text-slate-400">ชื่อนี้จะปรากฏเป็นชื่อผู้เสนอโครงการในแบบเสนอโครงการและบันทึกข้อความ</p>
              </div>

              {/* 2. Personnel Type Selector (ครู / เจ้าหน้าที่) */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-700 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                  <span>ประเภทบุคลากร</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handlePersonnelTypeChange('TEACHER')}
                    className={`p-3.5 rounded-theme border text-left flex items-center gap-3 transition-all ${
                      personnelType === 'TEACHER'
                        ? 'bg-theme-primary-light border-theme-primary text-slate-900 shadow-xs ring-1 ring-theme-primary'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-theme flex items-center justify-center shrink-0 ${
                        personnelType === 'TEACHER' ? 'bg-theme-primary text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">ครู / สายผู้สอน</p>
                      <p className="text-[10px] text-slate-500">แผนกวิชา / ช่วยงานฝ่าย</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePersonnelTypeChange('STAFF')}
                    className={`p-3.5 rounded-theme border text-left flex items-center gap-3 transition-all ${
                      personnelType === 'STAFF'
                        ? 'bg-emerald-50/80 border-emerald-500 text-emerald-950 shadow-xs ring-1 ring-emerald-500'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-theme flex items-center justify-center shrink-0 ${
                        personnelType === 'STAFF' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">เจ้าหน้าที่ / สายสนับสนุน</p>
                      <p className="text-[10px] text-slate-500">งานตามฝ่ายต่างๆ</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* 3. Position and Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700 flex items-center gap-1.5">
                    <span>ตำแหน่งทางการ</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <select
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-theme outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/10 transition bg-white text-sm"
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
                      className="w-full mt-2 px-3.5 py-2 text-sm border border-slate-300 rounded-theme focus:border-theme-primary outline-none transition"
                    />
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>อีเมลติดต่อ (Email)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@cric.ac.th"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-theme outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/10 transition bg-slate-50/50 focus:bg-white text-sm"
                  />
                </div>
              </div>

              {/* 4. Division Multi-Select */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-700 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>ฝ่ายงานที่ปฏิบัติหน้าที่ (เลือกได้มากกว่า 1 ฝ่าย)</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <span className="text-[11px] text-theme-primary font-bold bg-theme-primary-light px-2.5 py-0.5 rounded-full border border-theme-primary/20">
                    เลือกแล้ว {selectedDivisionIds.length} ฝ่าย
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {divisions.map((div) => {
                    const isChecked = selectedDivisionIds.includes(div.id);
                    return (
                      <div
                        key={div.id}
                        onClick={() => handleToggleDivision(div.id)}
                        className={`p-3 rounded-theme border text-xs flex items-center justify-between cursor-pointer transition ${
                          isChecked
                            ? 'bg-theme-primary-light border-theme-primary text-slate-900 font-bold shadow-2xs ring-1 ring-theme-primary'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="w-4 h-4 text-theme-primary rounded border-slate-300 pointer-events-none"
                          />
                          <span>{div.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">[{div.code?.toUpperCase()}]</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 5. Departments & Works Selection with Inline Head of Work Toggle */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-700 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      {personnelType === 'TEACHER' ? 'แผนกวิชา / งานที่รับผิดชอบ' : 'งานที่รับผิดชอบในฝ่าย'}
                      <span className="text-rose-500 font-bold ml-1">*</span>
                    </span>
                  </label>
                  <span className="text-[11px] text-theme-primary font-bold bg-theme-primary-light px-2.5 py-0.5 rounded-full border border-theme-primary/20">
                    เลือก {selectedDepartmentIds.length} งาน / หัวหน้างาน {headDeptIds.length} งาน
                  </span>
                </div>

                <div className="border border-slate-200 rounded-theme p-3 bg-slate-50/50 max-h-72 overflow-y-auto space-y-3">
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
                          {(div.departments || []).map((dept) => {
                            const isChecked = selectedDepartmentIds.includes(dept.id);
                            const isPrimary = selectedDepartmentId === dept.id;
                            const isHeadOfThisDept = headDeptIds.includes(dept.id);

                            return (
                              <div
                                key={dept.id}
                                onClick={() => handleToggleDepartment(dept.id)}
                                className={`p-2.5 rounded-theme border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer transition ${
                                  isChecked
                                    ? 'bg-white border-theme-primary/50 text-slate-900 font-semibold shadow-2xs ring-1 ring-theme-primary/20'
                                    : 'bg-white/80 border-slate-200 text-slate-700 hover:bg-white'
                                }`}
                              >
                                {/* Left: Department Name */}
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {}}
                                    className="w-4 h-4 text-theme-primary rounded border-slate-300 pointer-events-none shrink-0"
                                  />
                                  <span className="truncate">{dept.name}</span>
                                  {isPrimary && (
                                    <span className="text-[9px] bg-theme-primary text-white px-2 py-0.5 rounded font-bold shrink-0">
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
                                      className="text-[10px] px-2 py-0.5 rounded-theme border bg-slate-50 text-slate-600 border-slate-300 hover:bg-theme-primary-light hover:text-theme-primary hover:border-theme-primary/30 font-medium"
                                    >
                                      ตั้งเป็นงานหลัก
                                    </button>
                                  )}

                                  {/* Head of department toggle button */}
                                  <button
                                    type="button"
                                    onClick={(e) => handleToggleHeadDept(dept.id, e)}
                                    className={`px-2.5 py-1 rounded-theme text-[11px] font-bold border transition flex items-center gap-1.5 ${
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
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <span className="text-[11px] text-slate-400">กดบันทึกเพื่ออัปเดตข้อมูลสังกัดและสิทธิ์ในระบบทันที</span>
              <button
                type="submit"
                disabled={savingProfile}
                className="flex items-center gap-2 px-6 py-2.5 rounded-theme bg-theme-primary hover:bg-theme-primary-hover text-white text-xs font-bold shadow-md transition disabled:opacity-50 active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>{savingProfile ? 'กำลังบันทึก...' : 'บันทึกข้อมูลส่วนตัวและสังกัด'}</span>
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
                <p>• หัวหน้างานมีสิทธิ์พิจารณาอนุมัติขั้นต้น</p>
                <p>• สิทธิ์แก้ไขข้อมูลโครงการและแนบลายเซ็น</p>
              </div>
            </div>

            <div className="bg-slate-50 p-5 rounded-theme border border-slate-200 text-xs text-slate-500 space-y-2">
              <p className="font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>คำแนะนำการตั้งค่า</span>
              </p>
              <p className="text-[11px] leading-relaxed">
                การระบุชื่อ-นามสกุลจริง ตำแหน่งทางการ และสังกัดงานหลักที่ถูกต้อง จะช่วยให้การออกรายงานสรุปโครงการและเอกสารเสนอขออนุมัติมีความสมบูรณ์ถูกต้องตามระเบียบสารบรรณ
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Avatar Photo & Position / Zoom Adjuster */}
      {activeTab === 'avatar' && (
        <div className="bg-white p-6 sm:p-8 rounded-theme border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-theme bg-theme-primary-light text-theme-primary">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-sm sm:text-base text-slate-900">รูปภาพประจำตัว & ปรับตำแหน่ง (Avatar Position Adjuster)</h2>
                <p className="text-[11px] text-slate-500">อัปโหลด ซูมเข้า-ออก ลากเลื่อนตำแหน่ง และตัดรูปภาพให้สวยงามพอดีกรอบ</p>
              </div>
            </div>
            {rawAvatarImage && (
              <button
                type="button"
                onClick={resetAvatarPosition}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-theme transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>รีเซ็ตตำแหน่ง</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Interactive Image Repositioning / Cropping Canvas Pad */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Move className="w-4 h-4 text-theme-primary" />
                  <span>ลากเมาส์หรือนิ้วบนรูปภาพเพื่อเลื่อนตำแหน่ง (Drag & Position)</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  X: {Math.round(avatarOffsetX)}px, Y: {Math.round(avatarOffsetY)}px
                </span>
              </div>

              {/* Canvas viewport */}
              <div className="relative border-2 border-dashed border-slate-300 hover:border-theme-primary rounded-theme bg-slate-900/5 p-4 flex flex-col items-center justify-center transition">
                {rawAvatarImage ? (
                  <div className="relative group cursor-grab active:cursor-grabbing select-none overflow-hidden rounded-2xl shadow-md border-2 border-theme-primary">
                    <canvas
                      ref={avatarCanvasRef}
                      width={320}
                      height={320}
                      onMouseDown={handleAvatarMouseDown}
                      onMouseMove={handleAvatarMouseMove}
                      onMouseUp={handleAvatarMouseUp}
                      onMouseLeave={handleAvatarMouseUp}
                      onTouchStart={handleAvatarTouchStart}
                      onTouchMove={handleAvatarTouchMove}
                      onTouchEnd={handleAvatarTouchEnd}
                      className="bg-white touch-none max-w-full h-auto"
                    />

                    {/* Overlay Grid / Visual Circular Guide */}
                    <div className="absolute inset-0 pointer-events-none border border-white/40 rounded-full m-3 ring-1 ring-black/20" />
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <div className="bg-black/60 text-white text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1 backdrop-blur-xs">
                        <Move className="w-3 h-3" />
                        <span>คลิกค้างแล้วลากเพื่อขยับ</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <Camera className="w-12 h-12 mx-auto opacity-30" />
                    <p className="text-xs font-bold text-slate-600">ยังไม่มีการเลือกรูปภาพ</p>
                    <p className="text-[11px]">กรุณาอัปโหลดรูปภาพหรือเลือกจากตัวอย่างด้านล่าง</p>
                  </div>
                )}
              </div>

              {/* Interactive Controls (Zoom, Move, Rotate) */}
              {rawAvatarImage && (
                <div className="p-4 bg-slate-50 rounded-theme border border-slate-200/80 space-y-3 text-xs">
                  {/* Zoom Slider */}
                  <div className="flex items-center gap-3">
                    <ZoomOut className="w-4 h-4 text-slate-400 shrink-0" />
                    <div className="flex-1">
                      <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1">
                        <span>ซูมขยายภาพ (Zoom Scale)</span>
                        <span className="font-mono text-theme-primary">{avatarZoom.toFixed(1)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.8"
                        max="3.0"
                        step="0.05"
                        value={avatarZoom}
                        onChange={(e) => setAvatarZoom(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-theme-primary"
                      />
                    </div>
                    <ZoomIn className="w-4 h-4 text-slate-400 shrink-0" />
                  </div>

                  {/* Horizontal & Vertical Positioning Sliders */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-1">
                        <span>ตำแหน่งแนวนอน (X)</span>
                        <span className="font-mono">{Math.round(avatarOffsetX)}</span>
                      </div>
                      <input
                        type="range"
                        min="-150"
                        max="150"
                        step="1"
                        value={avatarOffsetX}
                        onChange={(e) => setAvatarOffsetX(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-theme-primary"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-1">
                        <span>ตำแหน่งแนวตั้ง (Y)</span>
                        <span className="font-mono">{Math.round(avatarOffsetY)}</span>
                      </div>
                      <input
                        type="range"
                        min="-150"
                        max="150"
                        step="1"
                        value={avatarOffsetY}
                        onChange={(e) => setAvatarOffsetY(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-theme-primary"
                      />
                    </div>
                  </div>

                  {/* Quick Direction & Rotation Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-500 mr-1">ปุ่มปรับด่วน:</span>
                      <button
                        type="button"
                        onClick={() => setAvatarOffsetY((prev) => prev - 15)}
                        className="p-1.5 rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-slate-700"
                        title="เลื่อนขึ้น"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setAvatarOffsetY((prev) => prev + 15)}
                        className="p-1.5 rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-slate-700"
                        title="เลื่อนลง"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setAvatarOffsetX((prev) => prev - 15)}
                        className="p-1.5 rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-slate-700"
                        title="เลื่อนซ้าย"
                      >
                        <ArrowLeftIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setAvatarOffsetX((prev) => prev + 15)}
                        className="p-1.5 rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-slate-700"
                        title="เลื่อนขวา"
                      >
                        <ArrowRightIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarOffsetX(0);
                          setAvatarOffsetY(0);
                        }}
                        className="px-2 py-1 rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-[10px] font-bold text-slate-700"
                      >
                        กึ่งกลาง
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setAvatarRotation((prev) => (prev + 90) % 360)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-[10px] font-bold text-slate-700"
                    >
                      <RotateCw className="w-3 h-3 text-theme-primary" />
                      <span>หมุน 90°</span>
                    </button>
                  </div>

                  {/* Apply Crop Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleApplyCroppedAvatar}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-theme-primary hover:bg-theme-primary-hover text-white rounded-theme font-bold text-xs shadow-sm transition active:scale-95"
                    >
                      <Crop className="w-4 h-4" />
                      <span>ตัดและนำมุมมองนี้ไปใช้ (Apply Viewport Crop)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Upload, Presets, and Live Navbar / Profile Preview */}
            <div className="lg:col-span-5 space-y-5">
              {/* Preview in Navbar & Profile */}
              <div className="p-5 bg-slate-50 rounded-theme border border-slate-200/80 space-y-4">
                <span className="text-xs font-bold text-slate-800 block">ตัวอย่างการแสดงผลจริงในระบบ (Live Preview)</span>
                
                <div className="flex items-center justify-around gap-4 py-2">
                  {/* Circular Preview (Navbar) */}
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-theme-primary shadow-sm bg-white">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-slate-900 text-white flex items-center justify-center font-bold text-lg">
                          {fullName?.charAt(0) || 'U'}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">แถบเมนู Navbar</span>
                  </div>

                  {/* Rounded Square Preview (Profile Card) */}
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-20 h-20 rounded-theme overflow-hidden border-2 border-theme-primary shadow-md bg-white">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-slate-900 text-white flex items-center justify-center font-bold text-2xl">
                          {fullName?.charAt(0) || 'U'}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">หน้าโปรไฟล์ Profile</span>
                  </div>
                </div>
              </div>

              {/* Upload Image File */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  อัปโหลดไฟล์รูปภาพใหม่ (Upload Photo)
                </label>
                <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-300 hover:border-theme-primary rounded-theme cursor-pointer bg-slate-50/50 hover:bg-theme-primary-light/40 transition group">
                  <Upload className="w-6 h-6 text-slate-400 group-hover:text-theme-primary mb-1.5 transition" />
                  <span className="text-xs font-bold text-slate-700 group-hover:text-theme-primary">
                    เลือกรูปภาพจากเครื่อง (JPG, PNG, WebP)
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">ขนาดไม่เกิน 5MB</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Image URL Direct Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  หรือระบุลิงก์รูปภาพโดยตรง (Image URL)
                </label>
                <input
                  type="text"
                  value={rawAvatarImage || avatarUrl}
                  onChange={(e) => {
                    setRawAvatarImage(e.target.value);
                    setAvatarUrl(e.target.value);
                    resetAvatarPosition();
                  }}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-theme outline-none focus:border-theme-primary transition bg-slate-50/50 focus:bg-white text-xs"
                />
              </div>

              {/* Preset Avatars */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  หรือเลือกจากภาพตัวอย่าง (Preset Avatars)
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {avatarPresets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setRawAvatarImage(preset);
                        setAvatarUrl(preset);
                        resetAvatarPosition();
                      }}
                      className={`relative w-11 h-11 rounded-theme overflow-hidden border-2 transition ${
                        avatarUrl === preset ? 'border-theme-primary ring-2 ring-theme-primary/30 scale-105' : 'border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <img src={preset} alt="preset" className="w-full h-full object-cover" />
                      {avatarUrl === preset && (
                        <div className="absolute inset-0 bg-theme-primary/40 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white stroke-[3]" />
                        </div>
                      )}
                    </button>
                  ))}
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setRawAvatarImage(null);
                        setAvatarUrl('');
                      }}
                      className="px-3 py-1.5 rounded-theme border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 text-[11px] font-bold transition flex items-center gap-1"
                    >
                      <Eraser className="w-3.5 h-3.5" />
                      <span>รีเซ็ตเป็นตัวย่อ</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Save All Profile button */}
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleUpdateProfile(undefined, 'บันทึกรูปโปรไฟล์เรียบร้อยแล้ว')}
                  disabled={savingProfile}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-theme bg-theme-primary hover:bg-theme-primary-hover text-white text-xs font-bold shadow-md transition disabled:opacity-50"
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
        <div className="bg-white p-6 sm:p-8 rounded-theme border border-slate-200 shadow-sm space-y-6">
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
                  {signatureImg ? (
                    <div className="flex flex-col items-center gap-2">
                      <img
                        src={signatureImg}
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
                  onClick={() => handleUpdateProfile(undefined, 'บันทึกลายเซ็นดิจิทัลเรียบร้อยแล้ว')}
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
        <form onSubmit={handleChangePassword} className="bg-white p-6 sm:p-8 rounded-theme border border-slate-200 shadow-sm space-y-6 max-w-2xl">
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
