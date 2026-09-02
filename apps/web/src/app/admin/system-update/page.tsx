'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  GitBranch,
  GitCommit,
  GitPullRequest,
  Check,
} from 'lucide-react';

interface GitCommitInfo {
  sha: string;
  shortSha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

interface SystemInfo {
  appVersion: string;
  appName: string;
  nodeVersion: string;
  platform: string;
  arch: string;
  uptime: number;
  git: {
    branch: string;
    commitHash: string;
    commitMessage: string;
    commitDate: string;
    repoUrl: string;
  };
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
  repoUrl: string;
  cloneUrl: string;
  currentCommit: {
    hash: string;
    message: string;
    date: string;
  };
  latestCommit: GitCommitInfo | null;
  recentCommits: GitCommitInfo[];
  releases: Array<{
    name: string;
    tagName: string;
    publishedAt: string;
    body: string;
    htmlUrl: string;
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

  const [activeTab, setActiveTab] = useState<'update' | 'commits' | 'backups' | 'cli'>('update');
  const [loading, setLoading] = useState<boolean>(true);
  const [checkingUpdate, setCheckingUpdate] = useState<boolean>(false);
  const [creatingBackup, setCreatingBackup] = useState<boolean>(false);
  const [updating, setUpdating] = useState<boolean>(false);

  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [logs, setLogs] = useState<ProgressLog[]>([]);
  const [currentProgress, setCurrentProgress] = useState<number>(0);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

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
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
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
          setAlertInfo({
            type: 'info',
            message: `พบการอัปเดตใหม่บน GitHub! Commit ล่าสุด: ${res.data.latestCommit?.message || res.data.latestVersion}`,
          });
        } else {
          setAlertInfo({ type: 'success', message: 'ระบบของคุณซิงค์ตรงกับ GitHub Repository ล่าสุดแล้ว' });
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
        message: `เริ่มต้นการดึงโค้ดอัปเดตจาก GitHub (https://github.com/xX-AULGZ-Xx/vocational-plan-system.git)...`,
        progress: 10,
        timestamp: new Date().toLocaleTimeString('th-TH'),
      },
    ]);
    setCurrentProgress(10);

    try {
      // 1. Setup SSE Connection with Token
      const sseUrl = `/api/v1/system-update/stream?token=${encodeURIComponent(token || '')}`;
      const eventSource = new EventSource(sseUrl);

      const handleProgressData = (data: any) => {
        if (data.logs && Array.isArray(data.logs) && data.logs.length > 0) {
          setLogs(
            data.logs.map((l: any) => ({
              ...l,
              timestamp: l.timestamp
                ? new Date(l.timestamp).toLocaleTimeString('th-TH')
                : new Date().toLocaleTimeString('th-TH'),
            }))
          );
        } else if (data.message) {
          setLogs((prev) => {
            const exists = prev.some((p) => p.message === data.message);
            if (exists) return prev;
            return [
              ...prev,
              {
                stage: data.stage || 'update',
                message: data.message,
                progress: data.progress,
                timestamp: new Date().toLocaleTimeString('th-TH'),
              },
            ];
          });
        }

        if (typeof data.progress === 'number' && data.progress >= 0) {
          setCurrentProgress(data.progress);
        }

        if (data.progress === 100) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          eventSource.close();
          setUpdating(false);
          setAlertInfo({ type: 'success', message: 'ระบบได้รับการอัปเดตจาก GitHub สำเร็จ 100%' });
          fetchInitialData();
        } else if (data.progress === -1) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          eventSource.close();
          setUpdating(false);
          setAlertInfo({ type: 'error', message: 'การอัปเดตล้มเหลว: ' + data.message });
        }
      };

      eventSource.onmessage = (event) => {
        try {
          const logData = JSON.parse(event.data);
          handleProgressData(logData);
        } catch (e) {}
      };

      eventSource.onerror = () => {
        eventSource.close();
      };

      // 2. Dual Fallback: Poll /api/v1/system-update/progress every 1s
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/v1/system-update/progress?token=${encodeURIComponent(token || '')}`).then((r) =>
            r.json()
          );
          if (res?.data) {
            handleProgressData(res.data);
          }
        } catch (e) {}
      }, 1000);

      // 3. Trigger execute API
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
      if (pollingRef.current) clearInterval(pollingRef.current);
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
      {/* Header Banner with GitHub Repo Link */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-6 rounded-2xl text-white shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-full text-xs font-semibold">
            <GitBranch className="w-3.5 h-3.5" />
            GitHub Repository Sync & Updater
          </div>
          <h1 className="text-2xl font-black tracking-tight">ศูนย์ควบคุมการอัปเดตและสำรองระบบ</h1>
          <p className="text-sm text-slate-300 flex items-center gap-2 flex-wrap">
            <span>เชื่อมโยงกับ GitHub:</span>
            <a
              href={updateInfo?.repoUrl || 'https://github.com/xX-AULGZ-Xx/vocational-plan-system'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-xs text-blue-300 hover:text-white bg-white/10 px-2.5 py-0.5 rounded-md transition"
            >
              <span>xX-AULGZ-Xx/vocational-plan-system</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCheckUpdate}
            disabled={checkingUpdate || loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl text-sm font-medium transition backdrop-blur-xs border border-white/15"
          >
            <RefreshCw className={`w-4 h-4 ${checkingUpdate ? 'animate-spin' : ''}`} />
            <span>{checkingUpdate ? 'กำลังตรวจ GitHub...' : 'ตรวจสอบจาก GitHub'}</span>
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
        {/* Card 1: Version & Git Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">สถานะ Git / เวอร์ชัน</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                updateInfo?.hasUpdate
                  ? 'bg-amber-100 text-amber-800 animate-pulse'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {updateInfo?.hasUpdate ? 'มีโค้ดใหม่บน GitHub' : 'ซิงค์ล่าสุดแล้ว'}
            </span>
          </div>
          <div className="my-3">
            <div className="text-xl font-black text-slate-900 flex items-center gap-2">
              <span>v{systemInfo?.appVersion || '1.0.0'}</span>
              <span className="text-xs font-mono px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                {systemInfo?.git?.commitHash || 'unknown'}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1 truncate">
              GitHub ล่าสุด: <span className="font-mono font-semibold text-slate-700">{updateInfo?.latestCommit?.shortSha || '19f6338'}</span>
            </div>
          </div>
          <div className="text-xs text-slate-400">Branch: {systemInfo?.git?.branch || 'main'}</div>
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
          onClick={() => setActiveTab('commits')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'commits'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <GitCommit className="w-4 h-4" />
          <span>ประวัติ GitHub Commits ({updateInfo?.recentCommits?.length || 0})</span>
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
          <span>ประวัติการสำรองข้อมูล ({backups.length})</span>
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
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">
                    GitHub Remote: xX-AULGZ-Xx/vocational-plan-system
                  </h2>
                  <a
                    href="https://github.com/xX-AULGZ-Xx/vocational-plan-system"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
                  >
                    <span>ดูบน GitHub</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-sm text-slate-600">
                  {updateInfo?.releaseNotes || 'ซิงค์ซอร์สโค้ดและปรับปรุงระบบล่าสุดจาก GitHub Repository'}
                </p>
                {updateInfo?.latestCommit && (
                  <div className="text-xs text-slate-500 pt-1 flex items-center gap-2">
                    <span className="font-semibold">Commit ล่าสุด:</span>
                    <span className="font-mono bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                      {updateInfo.latestCommit.shortSha}
                    </span>
                    <span>- {updateInfo.latestCommit.message}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowConfirmModal(true)}
                  disabled={updating}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition active:scale-95 disabled:opacity-50"
                >
                  <PlayCircle className="w-5 h-5" />
                  <span>{updating ? 'กำลังดึงโค้ดจาก GitHub...' : 'ดึงโค้ดและอัปเดตจาก GitHub (1-Click Update)'}</span>
                </button>
              </div>
            </div>

            {/* Live Update Progress Console */}
            {(updating || logs.length > 0) && (
              <div className="bg-slate-900 rounded-xl p-5 text-white font-mono text-xs space-y-4 shadow-inner">
                <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span>Live GitHub Sync Execution Stream</span>
                  </div>
                  <span className="font-bold text-emerald-400">{currentProgress}%</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
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

            {/* Recent GitHub Commits preview on Update Tab */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <GitCommit className="w-4 h-4 text-indigo-600" />
                <span>รายการ Commits ล่าสุดบน GitHub (xX-AULGZ-Xx/vocational-plan-system)</span>
              </h3>

              <div className="space-y-2">
                {updateInfo?.recentCommits?.slice(0, 5).map((commit, idx) => (
                  <div
                    key={commit.sha || idx}
                    className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                        {commit.shortSha}
                      </span>
                      <span className="text-xs font-medium text-slate-800">{commit.message}</span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-[11px] text-slate-500">
                      <span>{commit.author}</span>
                      <a
                        href={commit.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5"
                      >
                        <span>GitHub</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
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

      {/* TAB 2: GITHUB COMMITS LIST */}
      {activeTab === 'commits' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <GitCommit className="w-5 h-5 text-indigo-600" />
                <span>ประวัติ Commits ทั้งหมดจาก GitHub</span>
              </h2>
              <p className="text-xs text-slate-500">
                ดึงข้อมูล Real-time จาก Repository: <code>https://github.com/xX-AULGZ-Xx/vocational-plan-system</code>
              </p>
            </div>

            <a
              href="https://github.com/xX-AULGZ-Xx/vocational-plan-system/commits/main"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              <span>เปิดดูบน GitHub</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="divide-y divide-slate-100">
            {updateInfo?.recentCommits?.map((commit) => (
              <div key={commit.sha} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md">
                      {commit.shortSha}
                    </span>
                    <span className="text-sm font-bold text-slate-900">{commit.message}</span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span>ผู้แก้ไข: <strong>{commit.author}</strong></span>
                    <span>•</span>
                    <span>{commit.date ? new Date(commit.date).toLocaleString('th-TH') : '-'}</span>
                  </div>
                </div>

                <a
                  href={commit.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 shrink-0"
                >
                  <span>ดูการเปลี่ยนแปลง</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: BACKUPS MANAGEMENT */}
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

      {/* TAB 4: SERVER CLI GUIDE */}
      {activeTab === 'cli' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-indigo-600" />
              <span>คำสั่งอัปเดตผ่านเซิร์ฟเวอร์ Linux / aaPanel / SSH</span>
            </h2>
            <p className="text-sm text-slate-600">
              สำหรับผู้ดูแลระบบที่ต้องการสั่งอัปเดตโดยตรงบนเซิร์ฟเวอร์จาก GitHub Repository:
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
                <span>2. หรือสั่งอัปเดตผ่าน Git & Docker Compose โดยตรง:</span>
              </div>
              <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-xs overflow-x-auto space-y-1 shadow-inner">
                <div className="text-emerald-400"># ดึงโค้ดจาก https://github.com/xX-AULGZ-Xx/vocational-plan-system.git</div>
                <div>git pull origin main</div>
                <div className="text-emerald-400 mt-1"># Rebuild Container</div>
                <div>docker compose up -d --build</div>
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
            <div className="flex items-center gap-3 text-indigo-600">
              <GitPullRequest className="w-7 h-7" />
              <h3 className="text-lg font-black text-slate-900">ยืนยันการดึงโค้ดและอัปเดตจาก GitHub?</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              ระบบจะทำการเปิด <strong>Maintenance Mode</strong> ชั่วคราว และดึงโค้ดล่าสุดจาก Repository:{' '}
              <strong className="text-indigo-700">https://github.com/xX-AULGZ-Xx/vocational-plan-system.git</strong>{' '}
              พร้อมอัปเดตโครงสร้างฐานข้อมูล
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
                ยืนยันและเริ่มอัปเดตจาก GitHub
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
