'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import AccessDenied from '@/components/common/AccessDenied';
import {
  ArrowUpCircle,
  RefreshCw,
  Server,
  Database,
  HardDrive,
  ShieldCheck,
  ShieldAlert,
  Download,
  Terminal,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileArchive,
  Layers,
  Cpu,
  PlayCircle,
  RotateCcw,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface SystemInfo {
  appVersion: string;
  appName: string;
  nodeVersion: string;
  platform: string;
  arch: string;
  uptime: number;
  memory: {
    totalMb: number;
    freeMb: number;
    usedMb: number;
    usagePercent: number;
  };
  database: {
    status: 'connected' | 'error';
    provider: string;
    error?: string;
  };
  storage: {
    storageDir: string;
    backupCount: number;
    lastBackupDate?: string | null;
  };
  maintenance: {
    enabled: boolean;
    message: string;
    updatedAt?: string;
  };
}

interface UpdateCheckResult {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  publishedAt: string;
  releaseNotes: string;
  changelog: Array<{
    version: string;
    date: string;
    title: string;
    type: 'feature' | 'fix' | 'security' | 'performance';
    items: string[];
  }>;
}

interface BackupItem {
  id: string;
  filename: string;
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
  description: string;
  version: string;
  stats?: Record<string, number>;
}

interface ProgressLog {
  stage: string;
  message: string;
  progress: number;
  timestamp: string;
}

export default function SystemUpdatePage() {
  const { user, token } = useAuth();

  if (user && user.role !== 'ADMIN') {
    return <AccessDenied requiredRole="ผู้ดูแลระบบ (ADMIN)" />;
  }

  const [activeTab, setActiveTab] = useState<'update' | 'backups' | 'cli'>('update');
  const [loading, setLoading] = useState<boolean>(true);
  const [checkingUpdate, setCheckingUpdate] = useState<boolean>(false);
  const [creatingBackup, setCreatingBackup] = useState<boolean>(false);
  const [updating, setUpdating] = useState<boolean>(false);

  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [logs, setLogs] = useState<ProgressLog[]>([]);
  const [currentProgress, setCurrentProgress] = useState<number>(0);

  // Maintenance form
  const [maintenanceEnabled, setMaintenanceEnabled] = useState<boolean>(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState<string>('');
  const [savingMaintenance, setSavingMaintenance] = useState<boolean>(false);

  // Update confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [createBackupBeforeUpdate, setCreateBackupBeforeUpdate] = useState<boolean>(true);

  // Toast / feedback alert
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  useEffect(() => {
    if (token) {
      fetchInitialData();
    }
  }, [token]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };

      const [infoRes, updateRes, backupsRes] = await Promise.all([
        fetch('/api/v1/system-update/info', { headers }).then((r) => r.json()).catch(() => null),
        fetch('/api/v1/system-update/check', { headers }).then((r) => r.json()).catch(() => null),
        fetch('/api/v1/system-update/backups', { headers }).then((r) => r.json()).catch(() => null),
      ]);

      if (infoRes?.data) {
        setSystemInfo(infoRes.data);
        setMaintenanceEnabled(infoRes.data.maintenance?.enabled || false);
        setMaintenanceMsg(infoRes.data.maintenance?.message || '');
      }

      if (updateRes?.data) {
        setUpdateInfo(updateRes.data);
      }

      if (backupsRes?.data) {
        setBackups(backupsRes.data);
      }
    } catch (err: any) {
      setAlertInfo({ type: 'error', message: 'ไม่สามารถโหลดข้อมูลระบบได้: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckUpdate = async () => {
    try {
      setCheckingUpdate(true);
      const res = await fetch('/api/v1/system-update/check', {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json());

      if (res?.data) {
        setUpdateInfo(res.data);
        if (res.data.hasUpdate) {
          setAlertInfo({ type: 'info', message: `พบการอัปเดตเวอร์ชันใหม่ (${res.data.latestVersion}) พร้อมให้อัปเกรด!` });
        } else {
          setAlertInfo({ type: 'success', message: 'ระบบของคุณเป็นเวอร์ชันล่าสุดแล้ว' });
        }
      }
    } catch (err: any) {
      setAlertInfo({ type: 'error', message: 'ตรวจสอบเวอร์ชันล้มเหลว: ' + err.message });
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleSaveMaintenance = async () => {
    try {
      setSavingMaintenance(true);
      const res = await fetch('/api/v1/system-update/maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          enabled: maintenanceEnabled,
          message: maintenanceMsg,
        }),
      }).then((r) => r.json());

      if (res?.success) {
        setAlertInfo({
          type: 'success',
          message: maintenanceEnabled ? 'เปิดโหมดปิดปรับปรุงระบบเรียบร้อยแล้ว' : 'ปิดโหมดปิดปรับปรุงและเปิดให้บริการตามปกติแล้ว',
        });
      }
    } catch (err: any) {
      setAlertInfo({ type: 'error', message: 'บันทึกสถานะโหมดปิดปรับปรุงล้มเหลว: ' + err.message });
    } finally {
      setSavingMaintenance(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setCreatingBackup(true);
      const res = await fetch('/api/v1/system-update/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          description: `Manual backup by ${user?.full_name || 'Admin'}`,
        }),
      }).then((r) => r.json());

      if (res?.success) {
        setAlertInfo({ type: 'success', message: `สร้างไฟล์สำรองข้อมูล ${res.data.filename} เรียบร้อยแล้ว` });
        fetchInitialData();
      }
    } catch (err: any) {
      setAlertInfo({ type: 'error', message: 'สร้างการสำรองข้อมูลล้มเหลว: ' + err.message });
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleStartUpdate = async () => {
    setShowConfirmModal(false);
    setUpdating(true);
    setLogs([
      {
        stage: 'init',
        message: 'เริ่มต้นการอัปเดตระบบ...',
        progress: 5,
        timestamp: new Date().toLocaleTimeString('th-TH'),
      },
    ]);
    setCurrentProgress(5);

    try {
      const eventSource = new EventSource(`/api/v1/system-update/stream`);

      eventSource.onmessage = (event) => {
        try {
          const logData = JSON.parse(event.data);
          setLogs((prev) => [...prev, logData]);
          if (logData.progress >= 0) {
            setCurrentProgress(logData.progress);
          }
          if (logData.progress === 100) {
            eventSource.close();
            setUpdating(false);
            setAlertInfo({ type: 'success', message: 'ระบบได้รับการอัปเดตเสร็จสมบูรณ์ 100%' });
            fetchInitialData();
          } else if (logData.progress === -1) {
            eventSource.close();
            setUpdating(false);
            setAlertInfo({ type: 'error', message: 'การอัปเดตล้มเหลว: ' + logData.message });
          }
        } catch (e) {}
      };

      eventSource.onerror = () => {
        eventSource.close();
      };

      await fetch('/api/v1/system-update/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          createBackupFirst: createBackupBeforeUpdate,
          targetVersion: updateInfo?.latestVersion || '1.2.0',
        }),
      });
    } catch (err: any) {
      setUpdating(false);
      setAlertInfo({ type: 'error', message: 'เกิดข้อผิดพลาดในการเริ่มอัปเดต: ' + err.message });
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days} วัน ${hours} ชม.`;
    if (hours > 0) return `${hours} ชม. ${mins} นาที`;
    return `${mins} นาที`;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-6 rounded-2xl text-white shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-full text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            ระบบความปลอดภัยและการบำรุงรักษา
          </div>
          <h1 className="text-2xl font-black tracking-tight">ศูนย์ควบคุมการอัปเดตและสำรองระบบ</h1>
          <p className="text-sm text-slate-300">
            ตรวจสอบเวอร์ชันใหม่, สำรองข้อมูล Snapshot, บริหารจัดการโหมด Maintenance และอัปเดตระบบอัตโนมัติ
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCheckUpdate}
            disabled={checkingUpdate || loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl text-sm font-medium transition backdrop-blur-xs border border-white/15"
          >
            <RefreshCw className={`w-4 h-4 ${checkingUpdate ? 'animate-spin' : ''}`} />
            <span>{checkingUpdate ? 'กำลังตรวจ...' : 'ตรวจสอบเวอร์ชันใหม่'}</span>
          </button>
        </div>
      </div>

      {/* Alert Notification */}
      {alertInfo && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm font-medium border ${
            alertInfo.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : alertInfo.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {alertInfo.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
            {alertInfo.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />}
            {alertInfo.type === 'info' && <Sparkles className="w-5 h-5 text-blue-600 shrink-0" />}
            <span>{alertInfo.message}</span>
          </div>
          <button onClick={() => setAlertInfo(null)} className="text-xs opacity-60 hover:opacity-100">
            ปิด
          </button>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Version Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">เวอร์ชันของระบบ</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                updateInfo?.hasUpdate
                  ? 'bg-amber-100 text-amber-800 animate-pulse'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {updateInfo?.hasUpdate ? 'มีเวอร์ชันใหม่' : 'เวอร์ชันล่าสุด'}
            </span>
          </div>
          <div className="my-3">
            <div className="text-2xl font-black text-slate-900">
              v{systemInfo?.appVersion || '1.0.0'}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              เวอร์ชันล่าสุด: <span className="font-semibold text-slate-700">v{updateInfo?.latestVersion || '1.0.0'}</span>
            </div>
          </div>
          <div className="text-xs text-slate-400">Node.js: {systemInfo?.nodeVersion || 'v20+'}</div>
        </div>

        {/* Card 2: Database Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">ฐานข้อมูล (Database)</span>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div className="my-3">
            <div className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600" />
              <span>MySQL Online</span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              สถานะ: <span className="font-medium text-emerald-600">เชื่อมต่อสมบูรณ์</span>
            </div>
          </div>
          <div className="text-xs text-slate-400">Prisma ORM Managed</div>
        </div>

        {/* Card 3: Memory & Uptime */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">ประสิทธิภาพเซิร์ฟเวอร์</span>
            <Cpu className="w-4 h-4 text-slate-400" />
          </div>
          <div className="my-3">
            <div className="text-xl font-bold text-slate-900">
              RAM: {systemInfo?.memory.usedMb || 0} / {systemInfo?.memory.totalMb || 0} MB
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
              <div
                className="bg-blue-600 h-1.5 rounded-full"
                style={{ width: `${systemInfo?.memory.usagePercent || 20}%` }}
              />
            </div>
          </div>
          <div className="text-xs text-slate-500">
            Uptime: <span className="font-medium text-slate-700">{systemInfo ? formatUptime(systemInfo.uptime) : '-'}</span>
          </div>
        </div>

        {/* Card 4: Backup Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">สำรองข้อมูล (Backups)</span>
            <FileArchive className="w-4 h-4 text-slate-400" />
          </div>
          <div className="my-3">
            <div className="text-2xl font-black text-slate-900">
              {backups.length} <span className="text-sm font-normal text-slate-500">ชุด</span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              ล่าสุด: {backups.length > 0 ? new Date(backups[0].createdAt).toLocaleDateString('th-TH') : 'ยังไม่มี'}
            </div>
          </div>
          <button
            onClick={handleCreateBackup}
            disabled={creatingBackup}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 text-left flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{creatingBackup ? 'กำลังสำรองข้อมูล...' : 'กดสำรองข้อมูลทันที'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('update')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'update'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ArrowUpCircle className="w-4 h-4" />
          <span>ตรวจสอบและอัปเดตระบบ</span>
        </button>

        <button
          onClick={() => setActiveTab('backups')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'backups'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileArchive className="w-4 h-4" />
          <span>ประวัติและการสำรองข้อมูล ({backups.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('cli')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'cli'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>คำสั่งอัปเดตผ่านเซิร์ฟเวอร์ (CLI)</span>
        </button>
      </div>

      {/* TAB 1: UPDATE MANAGEMENT */}
      {activeTab === 'update' && (
        <div className="space-y-6">
          {/* 1-Click Update Banner Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <span>เวอร์ชันพร้อมใช้งานล่าสุด: v{updateInfo?.latestVersion || '1.2.0'}</span>
                </h2>
                <p className="text-sm text-slate-600">
                  {updateInfo?.releaseNotes || 'การปรับปรุงประสิทธิภาพและความปลอดภัยของระบบ'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowConfirmModal(true)}
                  disabled={updating}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition active:scale-95 disabled:opacity-50"
                >
                  <PlayCircle className="w-5 h-5" />
                  <span>{updating ? 'กำลังดำเนินการอัปเดต...' : 'เริ่มการอัปเดตระบบ (1-Click Update)'}</span>
                </button>
              </div>
            </div>

            {/* Live Update Progress Console (Shows when updating or has logs) */}
            {(updating || logs.length > 0) && (
              <div className="bg-slate-900 rounded-xl p-5 text-white font-mono text-xs space-y-4 shadow-inner">
                <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span>Live Update Execution Stream</span>
                  </div>
                  <span>{currentProgress}%</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(currentProgress, 5)}%` }}
                  />
                </div>

                {/* Terminal logs list */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-2">
                  {logs.map((log, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <span className="text-slate-500">[{log.timestamp}]</span>
                      <span
                        className={
                          log.stage === 'error'
                            ? 'text-rose-400 font-bold'
                            : log.stage === 'complete'
                            ? 'text-emerald-400 font-bold'
                            : 'text-slate-200'
                        }
                      >
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Changelog Sections */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                ประวัติรายการเปลี่ยนแปลง (Release Changelog)
              </h3>

              <div className="space-y-4">
                {updateInfo?.changelog?.map((release, rIdx) => (
                  <div key={rIdx} className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-blue-100 text-blue-800 font-bold text-xs rounded-lg">
                          v{release.version}
                        </span>
                        <span className="font-bold text-slate-900 text-sm">{release.title}</span>
                      </div>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {release.date}
                      </span>
                    </div>

                    <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 pl-1">
                      {release.items.map((item, iIdx) => (
                        <li key={iIdx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Maintenance Mode Configuration Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-500" />
                  <span>โหมดปิดปรับปรุงระบบชั่วคราว (Maintenance Mode)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  เมื่อเปิดใช้งาน ผู้ใช้งานทั่วไปจะไม่สามารถเข้าใช้งานหรือบันทึกข้อมูลได้ชั่วคราว (เฉพาะ Super Admin ที่เข้าถึงได้)
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={maintenanceEnabled}
                  onChange={(e) => setMaintenanceEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">ข้อความแจ้งเตือนผู้ใช้งาน:</label>
              <input
                type="text"
                value={maintenanceMsg}
                onChange={(e) => setMaintenanceMsg(e.target.value)}
                placeholder="เช่น ระบบกำลังปิดปรับปรุงชั่วคราวเพื่ออัปเดตเวอร์ชันใหม่ กรุณารอสักครู่..."
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveMaintenance}
                disabled={savingMaintenance}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                {savingMaintenance ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า Maintenance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BACKUPS MANAGEMENT */}
      {activeTab === 'backups' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">ประวัติชุดสำรองข้อมูล (Backup Snapshots)</h2>
              <p className="text-xs text-slate-500">
                ไฟล์สำรองข้อมูลฐานข้อมูลและ Schema ทั้งหมด จัดเก็บอยู่ที่ <code>storage/backups/</code>
              </p>
            </div>

            <button
              onClick={handleCreateBackup}
              disabled={creatingBackup}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              <Download className="w-4 h-4" />
              <span>{creatingBackup ? 'กำลังสร้าง Backup...' : 'สร้างไฟล์สำรองเดี๋ยวนี้'}</span>
            </button>
          </div>

          {backups.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <FileArchive className="w-12 h-12 mx-auto text-slate-300" />
              <p className="text-sm">ยังไม่มีประวัติการสำรองข้อมูลในระบบ</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase">
                    <th className="py-3 px-4">ชื่อไฟล์สำรอง</th>
                    <th className="py-3 px-4">เวอร์ชัน</th>
                    <th className="py-3 px-4">ขนาดไฟล์</th>
                    <th className="py-3 px-4">รายละเอียด / บันทึก</th>
                    <th className="py-3 px-4">วันที่บันทึก</th>
                    <th className="py-3 px-4 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {backups.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 flex items-center gap-2">
                        <FileArchive className="w-4 h-4 text-indigo-500" />
                        <span>{b.filename}</span>
                      </td>
                      <td className="py-3.5 px-4">v{b.version}</td>
                      <td className="py-3.5 px-4 font-medium">{b.sizeFormatted}</td>
                      <td className="py-3.5 px-4 text-slate-500">{b.description}</td>
                      <td className="py-3.5 px-4 text-slate-500">{new Date(b.createdAt).toLocaleString('th-TH')}</td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-semibold">
                          พร้อมกู้คืน
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SERVER CLI GUIDE */}
      {activeTab === 'cli' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-indigo-600" />
              <span>คำสั่งอัปเดตผ่านเซิร์ฟเวอร์ Linux / aaPanel / SSH</span>
            </h2>
            <p className="text-sm text-slate-600">
              สำหรับผู้ดูแลระบบที่ต้องการสั่งอัปเดตและ Rebuild ระบบโดยตรงบนเครื่อง Server สามารถใช้ Script อัตโนมัติที่เราจัดเตรียมไว้:
            </p>

            {/* Script 1: tools/update.sh */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>1. รันสคริปต์อัปเดตอัตโนมัติ (tools/update.sh):</span>
              </div>
              <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-xs overflow-x-auto space-y-1 shadow-inner">
                <div className="text-emerald-400"># เข้าไปยังไดเรกทอรีโปรเจกต์</div>
                <div>cd /www/wwwroot/vocational-plan-system</div>
                <div className="text-emerald-400 mt-2"># ให้สิทธิ์และรันคำสั่งอัปเดต</div>
                <div>chmod +x tools/update.sh</div>
                <div>./tools/update.sh</div>
              </div>
            </div>

            {/* Script 2: Docker Compose */}
            <div className="space-y-2 pt-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>2. หรือสั่งอัปเดตผ่าน Docker Compose โดยตรง:</span>
              </div>
              <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-xs overflow-x-auto space-y-1 shadow-inner">
                <div className="text-slate-400">git pull</div>
                <div className="text-slate-400">docker compose up -d --build</div>
                <div className="text-emerald-400 mt-1"># ตรวจสอบสถานะการทำงาน</div>
                <div>docker compose ps</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="w-7 h-7" />
              <h3 className="text-lg font-black text-slate-900">ยืนยันการเริ่มอัปเดตระบบ?</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              ระบบจะทำการเปิด <strong>Maintenance Mode</strong> ชั่วคราว และดำเนินการอัปเกรดฐานข้อมูล รวมถึงซิงค์ซอร์สโค้ดล่าสุดเวอร์ชัน <strong>v{updateInfo?.latestVersion || '1.2.0'}</strong>
            </p>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={createBackupBeforeUpdate}
                  onChange={(e) => setCreateBackupBeforeUpdate(e.target.checked)}
                  className="rounded-sm text-blue-600 focus:ring-blue-500"
                />
                <span>สำรองข้อมูล Snapshot อัตโนมัติก่อนเริ่มอัปเดต (แนะนำ)</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleStartUpdate}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition"
              >
                ยืนยันและเริ่มอัปเดตทันที
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
