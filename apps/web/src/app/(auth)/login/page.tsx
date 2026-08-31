'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import { showAlert } from '@/lib/sweetalert';
import { Lock, User, Key, CheckCircle2, Shield, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

export default function LoginPage() {
  const { googleClientId } = useSettings();
  const effectiveClientId = googleClientId && !googleClientId.includes('YOUR_GOOGLE_CLIENT_ID')
    ? googleClientId
    : (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'demo-client-id');

  return (
    <GoogleOAuthProvider clientId={effectiveClientId}>
      <LoginForm />
    </GoogleOAuthProvider>
  );
}

function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const { collegeLogoUrl, collegeName, collegeNameEn, directorName, googleAllowedDomains, googleClientId, enableTestMode } = useSettings();

  const [mounted, setMounted] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setMounted(true);
    // Check if system needs setup
    fetch('/api/v1/setup/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.is_setup === false) {
          router.push('/setup');
        }
      })
      .catch((e) => {});
  }, [router]);

  const handleLogin = async (u = username, p = password) => {
    if (!u.trim() || !p.trim()) {
      showAlert.warning('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u.trim(), password: p }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }

      login(data.token, data.user);
      showAlert.success(`ยินดีต้อนรับ ${data.user?.full_name || 'เข้าสู่ระบบ'}`);
      router.push('/dashboard');
    } catch (err: any) {
      const msg = err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ';
      setErrorMsg(msg);
      showAlert.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setGoogleLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/v1/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ');
      }

      login(data.token, data.user);
      showAlert.success(`ยินดีต้อนรับ ${data.user?.full_name || 'เข้าสู่ระบบ'}`);
      router.push('/dashboard');
    } catch (err: any) {
      const msg = err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google';
      setErrorMsg(msg);
      showAlert.error(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    const msg = 'การเชื่อมต่อกับ Google ไม่สำเร็จ หรือผู้ใช้ยกเลิกการล็อกอิน';
    setErrorMsg(msg);
    showAlert.warning(msg);
  };

  const shortName = collegeName
    .replace('วิทยาลัยการอาชีพ', 'วก.')
    .replace('วิทยาลัยอาชีวศึกษา', 'วอศ.')
    .replace('วิทยาลัยเทคนิค', 'วท.');

  const allowedDomainsList = (googleAllowedDomains || 'cric.ac.th, vec.mail.go.th')
    .split(',')
    .map((d) => d.trim().replace(/^@/, ''))
    .filter(Boolean);

  const quickRoles = [
    { label: 'ครูผู้เสนอโครงการ', username: 'teacher1', role: 'TEACHER', desc: 'อาจารย์สมชาย (แผนก IT)' },
    { label: 'หัวหน้าแผนก (ขั้นที่ 1)', username: 'head_tech', role: 'HEAD_DEPT', desc: 'นายประสิทธิ์ (หน.แผนก IT)' },
    { label: 'รอง ผอ. วิชาการ (ขั้นที่ 2)', username: 'deputy_acad', role: 'DEPUTY_DIRECTOR', desc: 'ดร.สมศักดิ์ (รอง ผอ. วิชาการ)' },
    { label: 'จนท.แผนงาน (ขั้นที่ 3)', username: 'planning_officer', role: 'PLANNING_OFFICER', desc: 'น.ส.อารีย์ (ออกรหัสโครงการ)' },
    { label: 'ผู้อำนวยการ (ขั้นที่ 4)', username: 'director', role: 'DIRECTOR', desc: `${directorName} (ผอ.สถานศึกษา)` },
    { label: 'ผู้ดูแลระบบ', username: 'admin', role: 'ADMIN', desc: 'System Admin' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        {/* Left Intro / Quick Roles */}
        <div className="md:col-span-7 space-y-6 text-white">
          <div className="flex items-center gap-3">
            {collegeLogoUrl ? (
              <div className="w-14 h-14 flex items-center justify-center p-0 shrink-0">
                <img
                  src={collegeLogoUrl}
                  alt={collegeName}
                  className="w-full h-full object-contain drop-shadow-md"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-theme bg-theme-primary flex items-center justify-center font-bold text-2xl shadow-lg shadow-theme-primary/30">
                {shortName.substring(0, 3)}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold tracking-tight">{collegeName}</h1>
              <p className="text-xs text-blue-200">{collegeNameEn}</p>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-100">ระบบบริหารจัดการงานแผนงานและโครงการ</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              รองรับกระบวนการเสนอโครงการดิจิทัล ระบบสายการอนุมัติ 4 ขั้นตอน ตรวจสอบงบประมาณ 4 ฝ่าย และ Live Preview เอกสารสารบรรณไทยตามระเบียบสำนักนายกฯ
            </p>
          </div>

          {/* Quick Login Test Accounts (Only shown when enableTestMode is true) */}
          {mounted && enableTestMode && (
            <div className="space-y-3 pt-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span>⚡ ทดสอบสิทธิ์การใช้งานด่วน (1-Click Test Login):</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  โหมดทดสอบ
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {quickRoles.map((r) => (
                  <button
                    key={r.username}
                    onClick={() => {
                      setUsername(r.username);
                      setPassword('password123');
                      handleLogin(r.username, 'password123');
                    }}
                    className="p-3 text-left rounded-theme bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:border-theme-primary transition group flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-xs text-white group-hover:text-theme-primary">
                        {r.label}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition" />
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1">{r.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Form Card */}
        <div className="md:col-span-5 bg-white p-7 sm:p-8 rounded-2xl shadow-2xl border border-slate-800 space-y-5">
          <div>
            <h3 className="text-lg font-bold text-slate-900">เข้าสู่ระบบ (Sign In)</h3>
            <p className="text-xs text-slate-500 mt-0.5">เข้าใช้งานด้วยบัญชี Google องค์กร หรือชื่อผู้ใช้ระบบ</p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-theme text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Google Sign-In Block */}
          <div className="space-y-2.5">
            <div className="w-full flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap={false}
                theme="outline"
                size="large"
                text="signin_with"
                shape="rectangular"
                width="100%"
              />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1 text-[11px] text-slate-500">
              <span>อนุญาตเฉพาะ:</span>
              {allowedDomainsList.map((domain) => (
                <span
                  key={domain}
                  className="font-semibold text-theme-primary bg-theme-primary-light px-1.5 py-0.5 rounded border border-theme-primary/20"
                >
                  @{domain}
                </span>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-2.5 text-[11px] text-slate-400 font-medium whitespace-nowrap">
              หรือเข้าสู่ระบบด้วยชื่อผู้ใช้
            </span>
            <div className="border-t border-slate-200 w-full" />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="space-y-3.5"
          >
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อผู้ใช้ (Username)</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="เช่น teacher1, head_tech, director"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-theme focus:border-theme-primary outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">รหัสผ่าน (Password)</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="รหัสผ่านเข้าสู่ระบบ"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-theme focus:border-theme-primary outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full py-2.5 px-4 bg-theme-primary hover:bg-theme-primary-hover text-white font-bold text-xs rounded-theme shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>

          {mounted && enableTestMode && (
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-theme text-[11px] text-amber-900 space-y-1">
              <div className="font-semibold text-amber-950">📌 โหมดทดสอบระบบ (Test Mode Active):</div>
              <div>รหัสผ่านเริ่มต้นทุกบัญชี: <code className="bg-amber-200/80 px-1 py-0.5 rounded text-amber-950 font-bold">password123</code></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
