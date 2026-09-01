'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Server,
  ShieldCheck,
  Building,
  User,
  Database,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Lock,
  Mail,
  Palette,
  Check,
  Globe,
  Phone,
  MapPin,
  RefreshCw,
  FolderCheck,
  Laptop,
} from 'lucide-react';
import { showAlert } from '@/lib/sweetalert';

export default function SetupWizardPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [isAlreadySetup, setIsAlreadySetup] = useState(false);

  // Health check state
  const [healthChecking, setHealthChecking] = useState(false);
  const [healthResult, setHealthResult] = useState<{
    database: boolean;
    storage: boolean;
    nodeVersion: string;
    directories: Record<string, boolean>;
  } | null>(null);

  // MySQL Database Connection Config State
  const [dbConfig, setDbConfig] = useState({
    host: 'localhost',
    port: '3306',
    database: 'vocational_plan_db',
    user: 'root',
    password: '',
  });
  const [testingDb, setTestingDb] = useState(false);
  const [dbTestMsg, setDbTestMsg] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestDbConnection = async () => {
    setTestingDb(true);
    setDbTestMsg(null);
    try {
      const res = await fetch('/api/v1/setup/test-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbConfig),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDbTestMsg({ success: true, message: data.message });
        setHealthResult((prev: any) => ({ ...prev, database: true }));
      } else {
        setDbTestMsg({ success: false, message: data.message || 'ไม่สามารถเชื่อมต่อ MySQL ได้' });
      }
    } catch (err: any) {
      setDbTestMsg({ success: false, message: `เกิดข้อผิดพลาด: ${err.message}` });
    } finally {
      setTestingDb(false);
    }
  };

  // Form State
  const [formData, setFormData] = useState({
    // Step 2: College & Branding
    college_name: 'วิทยาลัยการอาชีพเชียงราย',
    college_name_en: 'Chiangrai Industrial And Community Education College',
    college_address: 'เลขที่ ๑๒๓ หมู่ ๑๑ ตำบลท่าสาย อำเภอเมืองเชียงราย จังหวัดเชียงราย ๕๗๐๐๐',
    college_phone: '053-774505',
    college_email: 'cic.chiangrai@vec.mail.go.th',
    college_website: 'www.cic.ac.th',
    director_name: 'นางปิยะพร พูลเพิ่ม',
    director_position: 'ผู้อำนวยการวิทยาลัยการอาชีพเชียงราย',
    current_fiscal_year: '2569',
    theme_preset: 'royal_blue',
    theme_primary_color: '#1e3a8a',
    theme_primary_hover: '#172554',
    theme_accent_color: '#0d9488',
    theme_font_family: 'Prompt',

    // Step 3: Admin Account
    admin_name: 'ผู้ดูแลระบบส่วนกลาง',
    admin_username: 'admin',
    admin_password: '',
    admin_password_confirm: '',
    admin_email: 'admin@cic.ac.th',
    enable_test_mode: false,

    // Step 4: Seed Options
    seed_departments: true,
    seed_budget_categories: true,
    seed_strategic_plans: true,
    seed_demo_accounts: false,
  });

  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    checkInitialStatus();
  }, []);

  const checkInitialStatus = async () => {
    setCheckingStatus(true);
    try {
      const res = await fetch('/api/v1/setup/status');
      const data = await res.json();
      if (data.success && data.is_setup) {
        setIsAlreadySetup(true);
      } else {
        fetchHealthCheck();
      }
    } catch (e) {
      fetchHealthCheck();
    } finally {
      setCheckingStatus(false);
    }
  };

  const fetchHealthCheck = async () => {
    setHealthChecking(true);
    try {
      const res = await fetch('/api/v1/setup/health');
      const data = await res.json();
      if (data.success && data.checks) {
        setHealthResult(data.checks);
      }
    } catch (e) {
      console.error('Health check failed', e);
    } finally {
      setHealthChecking(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (healthResult && (!healthResult.database || !healthResult.storage)) {
        showAlert.warning('กรุณาตรวจสอบให้แน่ใจว่าระบบฐานข้อมูลและโฟลเดอร์ Storage พร้อมทำงาน');
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!formData.college_name.trim()) {
        showAlert.warning('กรุณาระบุชื่อสถานศึกษา');
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (!formData.admin_name.trim() || !formData.admin_username.trim()) {
        showAlert.warning('กรุณาระบุชื่อและชื่อผู้ใช้สำหรับ Super Admin');
        return;
      }
      if (!formData.admin_password || formData.admin_password.length < 6) {
        showAlert.warning('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
        return;
      }
      if (formData.admin_password !== formData.admin_password_confirm) {
        showAlert.warning('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
        return;
      }
      setCurrentStep(4);
    }
  };

  const handleInstall = async () => {
    setInstalling(true);
    try {
      const res = await fetch('/api/v1/setup/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          db_config: dbConfig,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'การติดตั้งระบบล้มเหลว');
      }

      showAlert.success('🎉 ติดตั้งและตั้งค่าระบบสำเร็จ! กำลังพาท่านไปหน้าเข้าสู่ระบบ');
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } catch (err: any) {
      showAlert.error(err.message || 'เกิดข้อผิดพลาดในการติดตั้ง');
    } finally {
      setInstalling(false);
    }
  };

  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center text-white space-y-3">
          <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-300">กำลังตรวจสอบสถานะการติดตั้งระบบ...</p>
        </div>
      </div>
    );
  }

  if (isAlreadySetup) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 sm:p-8 text-center space-y-5 text-white shadow-2xl">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-500/10">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">ระบบได้รับการติดตั้งเรียบร้อยแล้ว</h2>
            <p className="text-xs text-slate-400 mt-2">
              Vocational Plan System ได้รับการตั้งค่าเริ่มต้นและเปิดใช้งานแล้ว ท่านสามารถเข้าสู่ระบบเพื่อเริ่มใช้งานได้ทันที
            </p>
          </div>
          <button
            onClick={() => router.push('/login')}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg transition active:scale-98 flex items-center justify-center gap-2"
          >
            <span>ไปที่หน้าเข้าสู่ระบบ (Sign In)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const steps = [
    { num: 1, label: 'ความพร้อมระบบ', icon: Server },
    { num: 2, label: 'ข้อมูลสถานศึกษา', icon: Building },
    { num: 3, label: 'บัญชีผู้ดูแล', icon: ShieldCheck },
    { num: 4, label: 'ติดตั้ง & ข้อมูลเริ่มต้น', icon: Database },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-4xl w-full mx-auto space-y-6">
        {/* Header Branding */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-blue-600/30">
              วก
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Vocational Plan System — Setup Wizard
              </h1>
              <p className="text-xs text-slate-400">ระบบติดตั้งและตั้งค่าเริ่มต้นสำหรับสถานศึกษา</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              First Time Setup
            </span>
          </div>
        </div>

        {/* Stepper Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {steps.map((s) => {
            const Icon = s.icon;
            const isActive = currentStep === s.num;
            const isDone = currentStep > s.num;

            return (
              <div
                key={s.num}
                className={`p-3 rounded-xl border transition flex items-center gap-2.5 ${
                  isActive
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                    : isDone
                    ? 'bg-slate-900 border-slate-800 text-emerald-400'
                    : 'bg-slate-900/50 border-slate-800/60 text-slate-500'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : isDone
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isDone ? <Check className="w-4 h-4" /> : s.num}
                </div>
                <div className="truncate">
                  <div className="text-[11px] font-medium leading-none text-slate-400">ขั้นตอนที่ {s.num}</div>
                  <div className="text-xs font-bold mt-1 truncate">{s.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Step Contents Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          {/* STEP 1: System Health Check */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Server className="w-5 h-5 text-blue-400" />
                  ตรวจสอบความพร้อมของเซิร์ฟเวอร์และฐานข้อมูล (Environment Check)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  ระบบทำการตรวจสอบการเชื่อมต่อ MySQL Database และสิทธิ์การเขียนไฟล์ในโฟลเดอร์ Storage
                </p>
              </div>

              {healthChecking ? (
                <div className="p-8 text-center text-slate-400 text-xs space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-400" />
                  <div>กำลังตรวจสอบการเชื่อมต่อระบบ...</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Database Connection Status & Configuration Card */}
                  <div className="p-4 sm:p-5 rounded-xl border border-slate-800 bg-slate-850 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${healthResult?.database ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                          <Database className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-bold text-white">การเชื่อมต่อฐานข้อมูล (MySQL Database)</div>
                          <div className="text-[11px] text-slate-400">ระบุการตั้งค่าและรหัสผ่าน MySQL เพื่อใช้ในระบบ</div>
                        </div>
                      </div>
                      <div>
                        {healthResult?.database ? (
                          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-full border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> เชื่อมต่อสำเร็จ
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-bold rounded-full border border-amber-500/30 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> รอการทดสอบ/เชื่อมต่อ
                          </span>
                        )}
                      </div>
                    </div>

                    {/* MySQL Connection Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">Database Host</label>
                        <input
                          type="text"
                          value={dbConfig.host}
                          onChange={(e) => setDbConfig((prev) => ({ ...prev, host: e.target.value }))}
                          placeholder="localhost หรือ host.docker.internal"
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono outline-none focus:border-blue-500 transition"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">Port</label>
                        <input
                          type="text"
                          value={dbConfig.port}
                          onChange={(e) => setDbConfig((prev) => ({ ...prev, port: e.target.value }))}
                          placeholder="3306"
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono outline-none focus:border-blue-500 transition"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">Database Name</label>
                        <input
                          type="text"
                          value={dbConfig.database}
                          onChange={(e) => setDbConfig((prev) => ({ ...prev, database: e.target.value }))}
                          placeholder="vocational_plan_db"
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono outline-none focus:border-blue-500 transition"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">MySQL Username</label>
                        <input
                          type="text"
                          value={dbConfig.user}
                          onChange={(e) => setDbConfig((prev) => ({ ...prev, user: e.target.value }))}
                          placeholder="root หรือ plan_user"
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono outline-none focus:border-blue-500 transition"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center justify-between">
                          <span>MySQL Password (รหัสผ่านฐานข้อมูล)</span>
                          <span className="text-[10px] text-amber-400 font-normal">* รหัสผ่านของ Server MySQL</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="password"
                            value={dbConfig.password}
                            onChange={(e) => setDbConfig((prev) => ({ ...prev, password: e.target.value }))}
                            placeholder="ระบุรหัสผ่าน MySQL Server"
                            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono outline-none focus:border-blue-500 transition"
                          />
                          <button
                            type="button"
                            onClick={handleTestDbConnection}
                            disabled={testingDb}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                          >
                            {testingDb ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>กำลังทดสอบ...</span>
                              </>
                            ) : (
                              <>
                                <Database className="w-3.5 h-3.5" />
                                <span>ทดสอบการเชื่อมต่อ</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {dbTestMsg && (
                      <div
                        className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                          dbTestMsg.success
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-red-500/15 text-red-300 border border-red-500/30'
                        }`}
                      >
                        {dbTestMsg.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                        )}
                        <span>{dbTestMsg.message}</span>
                      </div>
                    )}
                  </div>

                  {/* Storage Directory Check */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-850 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${healthResult?.storage ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        <FolderCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-white">สิทธิ์การเขียนโฟลเดอร์จัดเก็บไฟล์ (Storage Writable)</div>
                        <div className="text-[11px] text-slate-400">โฟลเดอร์สำหรับเก็บเทมเพลต Word, โลโก้ และเอกสารส่งออก</div>
                      </div>
                    </div>
                    <div>
                      {healthResult?.storage ? (
                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-full border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> เขียนไฟล์ได้ปกติ
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-bold rounded-full border border-amber-500/30 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> ติดปัญหา Permission
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Node Runtime Info */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <Laptop className="w-4 h-4 text-slate-500" />
                      <span>Node.js Runtime: <strong className="text-slate-200">{healthResult?.nodeVersion || process.version}</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={fetchHealthCheck}
                      className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition flex items-center gap-1 text-[11px]"
                    >
                      <RefreshCw className="w-3 h-3" /> ตรวจสอบอีกครั้ง
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Institution & Branding */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Building className="w-5 h-5 text-blue-400" />
                  กำหนดข้อมูลสถานศึกษาและชุดสีประจำวิทยาลัย
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  ข้อมูลนี้จะนำไปใช้แสดงผลที่หน้าแรก เอกสารราชการ (Live Preview) และส่วนหัวของระบบ
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    ชื่อสถานศึกษา (ภาษาไทย) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.college_name}
                    onChange={(e) => handleInputChange('college_name', e.target.value)}
                    placeholder="เช่น วิทยาลัยการอาชีพเชียงราย"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    ชื่อสถานศึกษา (ภาษาอังกฤษ)
                  </label>
                  <input
                    type="text"
                    value={formData.college_name_en}
                    onChange={(e) => handleInputChange('college_name_en', e.target.value)}
                    placeholder="เช่น Chiangrai Industrial College"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    ปีงบประมาณเริ่มต้น (พ.ศ.)
                  </label>
                  <input
                    type="text"
                    value={formData.current_fiscal_year}
                    onChange={(e) => handleInputChange('current_fiscal_year', e.target.value)}
                    placeholder="2569"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    ที่อยู่สถานศึกษา (สำหรับส่วนท้ายเอกสาร)
                  </label>
                  <input
                    type="text"
                    value={formData.college_address}
                    onChange={(e) => handleInputChange('college_address', e.target.value)}
                    placeholder="เลขที่ ๑๒๓ หมู่ ๑๑ ตำบลท่าสาย อำเภอเมือง จังหวัดเชียงราย"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    ชื่อผู้อำนวยการสถานศึกษา
                  </label>
                  <input
                    type="text"
                    value={formData.director_name}
                    onChange={(e) => handleInputChange('director_name', e.target.value)}
                    placeholder="เช่น นางปิยะพร พูลเพิ่ม"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    ตำแหน่งผู้อำนวยการ
                  </label>
                  <input
                    type="text"
                    value={formData.director_position}
                    onChange={(e) => handleInputChange('director_position', e.target.value)}
                    placeholder="ผู้อำนวยการวิทยาลัยการอาชีพเชียงราย"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              {/* Theme Preset Picker */}
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-purple-400" />
                  <span>เลือกโทนสีประจำสถานศึกษา (Theme Color):</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'royal_blue', name: 'Royal Blue (น้ำเงินมาตรฐาน)', primary: '#1e3a8a', hover: '#172554', accent: '#0d9488' },
                    { id: 'emerald', name: 'Emerald (เขียวมรกต)', primary: '#047857', hover: '#065f46', accent: '#d97706' },
                    { id: 'purple', name: 'Royal Purple (ม่วงหรู)', primary: '#6b21a8', hover: '#581c87', accent: '#0284c7' },
                    { id: 'amber', name: 'Warm Amber (ส้มทอง/ชาไทย)', primary: '#b45309', hover: '#92400e', accent: '#0369a1' },
                    { id: 'crimson', name: 'Crimson (แดงเลือดนก)', primary: '#991b1b', hover: '#7f1d1d', accent: '#0891b2' },
                    { id: 'slate', name: 'Midnight Slate (เทาเข้ม)', primary: '#1e293b', hover: '#0f172a', accent: '#3b82f6' },
                  ].map((preset) => {
                    const isSelected = formData.theme_preset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            theme_preset: preset.id,
                            theme_primary_color: preset.primary,
                            theme_primary_hover: preset.hover,
                            theme_accent_color: preset.accent,
                          }));
                        }}
                        className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500/15 ring-1 ring-blue-500/40 text-white'
                            : 'border-slate-800 bg-slate-800/60 hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: preset.primary }} />
                          <span className="text-xs font-semibold">{preset.name}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-blue-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Super Admin Account */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-400" />
                  สร้างบัญชีผู้ดูแลระบบสูงสุด (Super Administrator)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  บัญชีนี้จะมีสิทธิ์สูงสุดในการจัดการผู้ใช้ แผนกวิชา แม่แบบเอกสาร และการตั้งค่าระบบทั้งหมด
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    ชื่อ-นามสกุล ผู้ดูแลระบบ <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.admin_name}
                    onChange={(e) => handleInputChange('admin_name', e.target.value)}
                    placeholder="เช่น ผู้ดูแลระบบส่วนกลาง หรือ นายวิชัย ยุทธการ"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    ชื่อผู้ใช้เข้าสู่ระบบ (Username) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.admin_username}
                    onChange={(e) => handleInputChange('admin_username', e.target.value)}
                    placeholder="admin"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    อีเมลผู้ดูแลระบบ (Admin Email)
                  </label>
                  <input
                    type="email"
                    value={formData.admin_email}
                    onChange={(e) => handleInputChange('admin_email', e.target.value)}
                    placeholder="admin@college.ac.th"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    รหัสผ่าน (Password) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.admin_password}
                    onChange={(e) => handleInputChange('admin_password', e.target.value)}
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    ยืนยันรหัสผ่าน (Confirm Password) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.admin_password_confirm}
                    onChange={(e) => handleInputChange('admin_password_confirm', e.target.value)}
                    placeholder="กรอกรหัสผ่านอีกครั้ง"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              {/* Demo Mode Toggle */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-800/40 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-200">เปิดโหมดทดสอบระบบ (Enable 1-Click Test Login)</div>
                  <div className="text-[11px] text-slate-400">
                    แสดงปุ่มล็อกอินด่วนสำหรับครู, หัวหน้าแผนก, รอง ผอ. และ ผอ. ที่หน้าเข้าสู่ระบบ (แนะนำให้ปิดในการใช้งานจริง)
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={formData.enable_test_mode}
                    onChange={(e) => handleInputChange('enable_test_mode', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          )}

          {/* STEP 4: Seed Options & Confirmation */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-400" />
                  เลือกสร้างข้อมูลเริ่มต้นและยืนยันการติดตั้ง (Default Data Seeding)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  เลือกว่าต้องการให้ระบบสร้างโครงสร้างองค์กร 4 ฝ่าย, หมวดงบประมาณ และยุทธศาสตร์เริ่มต้นหรือไม่
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    key: 'seed_departments',
                    title: 'โครงสร้าง 4 ฝ่ายบริหารและแผนกวิชามาตรฐาน สอศ.',
                    desc: 'สร้างฝ่ายวิชาการ, ฝ่ายบริหารทรัพยากร, ฝ่ายพัฒนากิจการฯ และฝ่ายแผนงานฯ พร้อมแผนกตัวอย่าง',
                  },
                  {
                    key: 'seed_budget_categories',
                    title: 'หมวดหมู่งบประมาณมาตรฐาน 3 หมวด',
                    desc: 'สร้างหมวดค่าตอบแทน, ค่าใช้สอย และค่าวัสดุ พร้อมใช้งาน',
                  },
                  {
                    key: 'seed_strategic_plans',
                    title: 'แผนยุทธศาสตร์และตัวชี้วัดสถานศึกษา',
                    desc: `สร้างแผนปฏิบัติราชการและตัวชี้วัดประจำปีงบประมาณ ${formData.current_fiscal_year}`,
                  },
                  {
                    key: 'seed_demo_accounts',
                    title: 'สร้างบัญชีผู้ใช้ตัวอย่างสำหรับทดสอบ (Demo Users)',
                    desc: 'สร้างบัญชีครู (teacher1), หัวหน้าแผนก (head_tech), รอง ผอ. (deputy_acad) เพื่อทดสอบสายการอนุมัติ',
                  },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="p-3.5 rounded-xl border border-slate-800 bg-slate-800/40 hover:bg-slate-800/80 transition flex items-start gap-3 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={(formData as any)[item.key]}
                      onChange={(e) => handleInputChange(item.key, e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-blue-600 bg-slate-700 border-slate-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-white">{item.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{item.desc}</div>
                    </div>
                  </label>
                ))}
              </div>

              {/* Summary Card */}
              <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/10 space-y-2 text-xs">
                <div className="font-bold text-blue-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> สรุปข้อมูลการติดตั้ง:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300 text-[11px]">
                  <div>• สถานศึกษา: <strong>{formData.college_name}</strong></div>
                  <div>• ปีงบประมาณ: <strong>{formData.current_fiscal_year}</strong></div>
                  <div>• Super Admin: <strong>{formData.admin_username}</strong> ({formData.admin_name})</div>
                  <div>• ธีมสีระบบ: <span className="capitalize font-semibold">{formData.theme_preset}</span></div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                disabled={installing}
                className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> ย้อนกลับ
              </button>
            ) : (
              <div />
            )}

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-600/30 flex items-center gap-1.5 active:scale-95"
              >
                <span>ขั้นตอนถัดไป</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleInstall}
                disabled={installing}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/30 flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {installing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>กำลังติดตั้งระบบ...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>ยืนยันและเริ่มใช้งานระบบ</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[11px] text-slate-600 mt-6">
        Vocational Planning & Project Management System — Designed for Thai Vocational Education Commission (สอศ.)
      </div>
    </div>
  );
}
