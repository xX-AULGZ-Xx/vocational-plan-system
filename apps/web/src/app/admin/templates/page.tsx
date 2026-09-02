'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { showAlert } from '@/lib/sweetalert';
import {
  FileText,
  Upload,
  CheckCircle2,
  Trash2, X,
  Tag,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Plus,
  ArrowUp,
  ArrowDown,
  Save,
  Check,
  AlertCircle
} from 'lucide-react';
import AccessDenied from '@/components/common/AccessDenied';

export default function AdminTemplatesPage() {
  const { user, token } = useAuth();

  if (user && !['ADMIN', 'PLANNING_OFFICER'].includes(user.role)) {
    return <AccessDenied allowedRoles={['ผู้ดูแลระบบ (ADMIN)', 'เจ้าหน้าที่งานแผนงาน (PLANNING_OFFICER)']} />;
  }

  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultType, setDefaultType] = useState('NONE');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Tag Manager state
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [tags, setTags] = useState<any[]>([]);
  const [savingTags, setSavingTags] = useState(false);
  const [extracting, setExtracting] = useState(false);

  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (token) {
      fetchTemplates();
    }
  }, [token]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/v1/admin/templates', { headers });
      const data = await res.json();
      if (data.success) {
        setTemplates(data.data);
      }
    } catch (e) {
      console.error('Failed to load templates', e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      showAlert.warning('กรุณาเลือกไฟล์', 'กรุณาเลือกไฟล์ .docx');
      return;
    }

    setUploading(true);
    setMsg(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name || file.name.replace('.docx', ''));
      formData.append('description', description);
      formData.append('default_type', defaultType);

      const res = await fetch('/api/v1/admin/templates', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setMsg({ type: 'error', text: data.message || 'เกิดข้อผิดพลาดในการอัปโหลดเทมเพลต' });
        return;
      }

      setMsg({ type: 'success', text: data.message || 'อัปโหลดสำเร็จ' });
      setShowUploadModal(false);
      setName('');
      setDescription('');
      setFile(null);
      setDefaultType('NONE');
      fetchTemplates();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'เกิดข้อผิดพลาดในการอัปโหลด' });
    } finally {
      setUploading(false);
    }
  };

  const handleToggleActive = async (id: number, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/v1/admin/templates/${id}/toggle`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      if (res.ok) {
        fetchTemplates();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSetDefaultType = async (id: number, type: string) => {
    try {
      const res = await fetch(`/api/v1/admin/templates/${id}/default`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ default_type: type }),
      });
      if (res.ok) {
        fetchTemplates();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [updatingId, setUpdatingId] = React.useState<number | null>(null);

  const handleUpdateFileClick = (id: number) => {
    setUpdatingId(id);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleUpdateFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !updatingId) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/admin/templates/${updatingId}/file`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: 'success', text: data.message || 'อัปเดตไฟล์สำเร็จ' });
        fetchTemplates();
      } else {
        setMsg({ type: 'error', text: data.message || 'ไม่สามารถอัปเดตไฟล์ได้' });
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'เกิดข้อผิดพลาดในการอัปเดตไฟล์' });
    } finally {
      setLoading(false);
      setUpdatingId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showAlert.confirm('ยืนยันการลบ', 'ยืนยันการลบแม่แบบเอกสาร?');
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/v1/admin/templates/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showAlert.success('ลบแม่แบบเอกสารเรียบร้อยแล้ว');
        fetchTemplates();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openTagManager = async (tpl: any) => {
    setSelectedTemplate(tpl);
    setMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/templates/${tpl.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setTags(data.data.tags || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRescanTags = async () => {
    if (!selectedTemplate) return;
    setExtracting(true);
    try {
      const res = await fetch(`/api/v1/admin/templates/${selectedTemplate.id}/extract-tags`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const resData = await res.json();
      if (resData.success) {
        // Just reload tags from the updated template
        openTagManager(selectedTemplate);
        setMsg({ type: 'success', text: `แสกนพบ ${resData.data.length} แท็กใหม่` });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setExtracting(false);
    }
  };

  const handleSaveTags = async () => {
    if (!selectedTemplate) return;
    setSavingTags(true);
    try {
      const res = await fetch(`/api/v1/admin/templates/${selectedTemplate.id}/tags`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tags }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: 'success', text: 'บันทึกตัวแปรเรียบร้อยแล้ว' });
      } else {
        setMsg({ type: 'error', text: data.message });
      }
    } catch (e) {
      setMsg({ type: 'error', text: 'เกิดข้อผิดพลาดในการบันทึกตัวแปร' });
    } finally {
      setSavingTags(false);
    }
  };

  const moveTag = (index: number, direction: 'up' | 'down') => {
    const newTags = [...tags];
    if (direction === 'up' && index > 0) {
      const temp = newTags[index];
      newTags[index] = newTags[index - 1];
      newTags[index - 1] = temp;
    } else if (direction === 'down' && index < newTags.length - 1) {
      const temp = newTags[index];
      newTags[index] = newTags[index + 1];
      newTags[index + 1] = temp;
    }
    // Update sort_order for all
    newTags.forEach((t, i) => { t.sort_order = i; });
    setTags(newTags);
  };

  return (
    <div className="space-y-6">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleUpdateFileChange} 
        accept=".docx" 
        className="hidden" 
      />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">จัดการแม่แบบเอกสาร (Template Manager)</h1>
          <p className="text-slate-500 mt-1">อัปโหลด ตั้งค่าตัวแปร และจัดการเอกสารแม่แบบ (.docx)</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-white rounded-theme shadow-sm transition-colors text-xs font-bold"
        >
          <Upload className="w-4 h-4 mr-2" />
          อัปโหลดแม่แบบใหม่
        </button>
      </div>

      {msg && (
        <div className={`p-4 rounded-md flex items-start ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />}
          <div>{msg.text}</div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อแม่แบบ / ไฟล์</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ประเภทแม่แบบ (Default)</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะ</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">จัดการ</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {templates.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p>ยังไม่มีข้อมูลแม่แบบเอกสาร</p>
                    </td>
                  </tr>
                ) : (
                  templates.map((tpl) => (
                    <tr key={tpl.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-start">
                          <FileText className="w-5 h-5 text-blue-500 mr-3 mt-0.5" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{tpl.name}</div>
                            <div className="text-xs text-gray-500">{tpl.file_name} (v{tpl.version})</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={tpl.default_type || 'NONE'}
                          onChange={(e) => handleSetDefaultType(tpl.id, e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        >
                          <option value="NONE">- ไม่ได้ตั้งค่า -</option>
                          <option value="PROPOSAL">แบบเสนอโครงการ (Proposal)</option>
                          <option value="FULL_SUMMARY">สรุปแบบเต็ม (Full Summary)</option>
                          <option value="SHORT_SUMMARY">สรุปหน้าเดียว (Short Summary)</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleToggleActive(tpl.id, tpl.is_active)}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${tpl.is_active ? 'bg-blue-600' : 'bg-gray-200'}`}
                        >
                          <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${tpl.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => openTagManager(tpl)}
                          className="inline-flex items-center px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md transition-colors"
                        >
                          <Tag className="w-4 h-4 mr-1.5" />
                          Tag Manager
                        </button>
                          <button
                            onClick={() => handleUpdateFileClick(tpl.id)}
                            className="inline-flex items-center p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors mr-1"
                            title="อัปเดตไฟล์ (Upload new version)"
                          >
                            <Upload className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(tpl.id)}
                            className="inline-flex items-center p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="ลบ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="md:hidden">
            {templates.length === 0 ? (
              <div className="p-8 text-center text-gray-500 border-t border-gray-100">
                <FileText className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                <p className="text-sm">ยังไม่มีข้อมูลแม่แบบเอกสาร</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {templates.map((tpl) => (
                  <div key={tpl.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-start flex-1 pr-3">
                        <FileText className="w-5 h-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="text-sm font-semibold text-gray-900 leading-tight">{tpl.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{tpl.file_name} (v{tpl.version})</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleActive(tpl.id, tpl.is_active)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${tpl.is_active ? 'bg-blue-600' : 'bg-gray-200'}`}
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${tpl.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <div className="mb-3">
                      <label className="block text-xs text-gray-500 mb-1">ประเภทแม่แบบ (Default):</label>
                      <select
                        value={tpl.default_type || 'NONE'}
                        onChange={(e) => handleSetDefaultType(tpl.id, e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-sm py-1.5"
                      >
                        <option value="NONE">- ไม่ได้ตั้งค่า -</option>
                        <option value="PROPOSAL">แบบเสนอโครงการ (Proposal)</option>
                        <option value="FULL_SUMMARY">สรุปแบบเต็ม (Full Summary)</option>
                        <option value="SHORT_SUMMARY">สรุปหน้าเดียว (Short Summary)</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => openTagManager(tpl)}
                        className="inline-flex items-center px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md transition-colors text-xs font-medium"
                      >
                        <Tag className="w-3.5 h-3.5 mr-1.5" />
                        Tag Manager
                      </button>
                      
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleUpdateFileClick(tpl.id)}
                          className="inline-flex items-center p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="อัปเดตไฟล์"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(tpl.id)}
                          className="inline-flex items-center p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="ลบ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col relative">
            <div className="p-4 bg-blue-900 text-white flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold">อัปโหลดแม่แบบใหม่</h2>
              <button onClick={() => setShowUploadModal(false)} className="p-1 hover:bg-white/20 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อแม่แบบ</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">รายละเอียด (ถ้ามี)</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ประเภทเอกสาร (Default Type)</label>
                <select value={defaultType} onChange={e => setDefaultType(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value="NONE">ไม่ระบุ (None)</option>
                  <option value="PROPOSAL">แบบเสนอโครงการ (Proposal)</option>
                  <option value="FULL_SUMMARY">สรุปแบบเต็ม (Full Summary)</option>
                  <option value="SHORT_SUMMARY">สรุปหน้าเดียว (Short Summary)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ไฟล์แม่แบบ (.docx)</label>
                <input type="file" accept=".docx" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full" />
              </div>
              {msg && (
                <p className={`text-sm ${msg.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>{msg.text}</p>
              )}
            </div>
            <div className="p-4 border-t bg-slate-50 flex justify-end gap-2">
              <button onClick={() => setShowUploadModal(false)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300">ยกเลิก</button>
              <button onClick={handleUpload} disabled={uploading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {uploading ? 'กำลังอัปโหลด...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tag Manager Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white sm:rounded-2xl shadow-xl w-full h-full sm:max-w-5xl sm:h-[90vh] flex flex-col overflow-hidden relative">
            
            <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                    <Tag className="w-5 h-5 mr-2 text-indigo-500" />
                    Tag Manager: {selectedTemplate.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">ตั้งค่าตัวแปร (Tags) สำหรับใช้สร้างฟอร์มกรอกข้อมูลอัตโนมัติ</p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleRescanTags}
                    disabled={extracting}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${extracting ? 'animate-spin' : ''}`} />
                    สแกนแท็กใหม่
                  </button>
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className="text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 px-6 py-3 border-b border-gray-200 flex items-center space-x-2 overflow-x-auto text-sm shrink-0">
                  <span className="font-semibold text-blue-800 whitespace-nowrap">Tag แนะนำ:</span>
                  {[
                    { key: 'project_name', label: 'ชื่อโครงการ', type: 'TEXT' },
                    { key: 'fiscal_year', label: 'ปีงบประมาณ', type: 'TEXT' },
                    { key: 'total_budget', label: 'งบประมาณรวม', type: 'TEXT' },
                    { key: 'department', label: 'แผนก/ฝ่าย', type: 'DEPARTMENT_DROPDOWN' },
                    { key: 'project_code', label: 'รหัสโครงการ', type: 'TEXT' }
                  ].map(sysTag => (
                    <button
                      key={sysTag.key}
                      onClick={() => {
                        if (tags.some(t => t.tag_name === sysTag.key)) return;
                        setTags([...tags, { 
                          tag_name: sysTag.key, 
                          label: sysTag.label, 
                          tag_type: sysTag.type, 
                          is_required: true, 
                          sort_order: tags.length 
                        }]);
                      }}
                      className="px-2 py-1 bg-white border border-blue-200 text-blue-600 rounded hover:bg-blue-100 whitespace-nowrap transition-colors"
                      title="คลิกเพื่อเพิ่ม"
                    >
                      + {sysTag.key}
                    </button>
                  ))}
                  <div className="flex-1"></div>
                  <button
                    onClick={() => {
                      setTags([...tags, { 
                        tag_name: 'new_tag_' + (tags.length + 1), 
                        label: 'ฟิลด์ใหม่', 
                        tag_type: 'TEXT', 
                        is_required: false, 
                        sort_order: tags.length 
                      }]);
                    }}
                    className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 whitespace-nowrap transition-colors flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-1" /> เพิ่ม Tag เอง
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                {tags.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>ไม่พบตัวแปรในระบบ กรุณากดสแกนแท็กใหม่</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tags.map((tag, index) => (
                      <div key={tag.id || index} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-start gap-4">
                        <div className="flex flex-col items-center justify-center space-y-1 pt-1">
                          <button
                            onClick={() => moveTag(index, 'up')}
                            disabled={index === 0}
                            className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <span className="text-xs text-gray-400 font-medium">{index + 1}</span>
                          <button
                            onClick={() => moveTag(index, 'down')}
                            disabled={index === tags.length - 1}
                            className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="lg:col-span-1">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Tag ในเอกสาร (ตัวแปร)</label>
                            <input
                              type="text"
                              value={tag.tag_name || ''}
                              onChange={(e) => {
                                const newTags = [...tags];
                                newTags[index].tag_name = e.target.value;
                                setTags(newTags);
                              }}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono text-indigo-700"
                            />
                          </div>
                          
                          <div className="lg:col-span-1">
                            <label className="block text-xs font-medium text-gray-500 mb-1">ชื่อฟิลด์ที่แสดงผล (Label)</label>
                            <input
                              type="text"
                              value={tag.label || ''}
                              onChange={(e) => {
                                const newTags = [...tags];
                                newTags[index].label = e.target.value;
                                setTags(newTags);
                              }}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            />
                          </div>

                          <div className="lg:col-span-1">
                            <label className="block text-xs font-medium text-gray-500 mb-1">ประเภท Tag</label>
                            <select
                              value={tag.tag_type}
                              onChange={(e) => {
                                const newTags = [...tags];
                                newTags[index].tag_type = e.target.value;
                                setTags(newTags);
                              }}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            >
                              <option value="TEXT">ข้อความสั้น (Text)</option>
                              <option value="LONGTEXT">ข้อความยาว (Textarea)</option>
                              <option value="DATE">วันที่ (Date)</option>
                                <option value="DATERANGE">ช่วงวันที่ (Start-End Date)</option>
                                <option value="TIMELINE">ตารางแผนปฏิบัติงาน (Timeline PDCA)</option>
                                <option value="ALIGNMENT_CHECKLIST">แบบประเมินความสอดคล้อง (Alignment Checklist)</option>
                                <option value="DIVISION_DROPDOWN">เลือกฝ่าย / กลุ่มงาน (Division)</option>
                                <option value="DEPARTMENT_DROPDOWN">เลือกแผนกวิชา / งาน (Department)</option>
                              <option value="BOOLEAN">Checkbox (True/False)</option>
                              <option value="IMAGE">รูปภาพ (Image)</option>
                              <option value="TABLE_LOOP">ตาราง/ทำซ้ำ (Table/Loop)</option>
                              <option value="DROPDOWN">ตัวเลือก (Dropdown)</option>
                                <option value="CALCULATION">การคำนวน (Calculation)</option>
                            </select>
                          </div>

                          <div className="lg:col-span-1 flex items-center pt-5">
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={tag.is_required || false}
                                onChange={(e) => {
                                  const newTags = [...tags];
                                  newTags[index].is_required = e.target.checked;
                                  setTags(newTags);
                                }}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="text-sm text-gray-700">จำเป็นต้องกรอก (Required)</span>
                            </label>
                            
                            <label className="flex items-center gap-2 cursor-pointer mt-2">
                              <input
                                type="checkbox"
                                checked={!(tag.options && typeof tag.options === 'object' && !Array.isArray(tag.options) && tag.options.is_hidden)}
                                onChange={(e) => {
                                  const newTags = [...tags];
                                  const currentOptions = Array.isArray(tag.options) ? {} : (tag.options || {});
                                  newTags[index].options = { ...currentOptions, is_hidden: !e.target.checked };
                                  setTags(newTags);
                                }}
                                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                              />
                              <span className="text-sm text-gray-700">เปิดใช้งาน (Active)</span>
                            </label>
                          </div>
                          
                          <div className="lg:col-span-4">
                            <label className="block text-xs font-medium text-gray-500 mb-1">คำอธิบาย (Tooltip / Placeholder)</label>
                            <input
                              type="text"
                              value={tag.description || ''}
                              onChange={(e) => {
                                const newTags = [...tags];
                                newTags[index].description = e.target.value;
                                setTags(newTags);
                              }}
                              placeholder="ข้อความแนะนำสำหรับผู้ใช้งาน..."
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-600"
                            />
                          </div>
                          {/* OPTIONS UI */}
                          {tag.tag_type === 'DROPDOWN' && (
                            <div className="mt-3 w-full bg-gray-50 p-3 rounded-md border border-gray-200 col-span-1 md:col-span-2 lg:col-span-4">
                              <div className="flex justify-between items-center mb-2">
                                <label className="block text-xs font-medium text-gray-700">รายการตัวเลือก</label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newTags = [...tags];
                                    const opts = Array.isArray(newTags[index].options) ? [...newTags[index].options] : [];
                                    opts.push('ตัวเลือกใหม่');
                                    newTags[index].options = opts;
                                    setTags(newTags);
                                  }}
                                  className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200 flex items-center"
                                >
                                  + เพิ่มตัวเลือก
                                </button>
                              </div>
                              <div className="space-y-2">
                                {(Array.isArray(tag.options) ? tag.options : []).map((opt: any, optIndex: number) => (
                                  <div key={optIndex} className="flex gap-2">
                                    <input
                                      type="text"
                                      value={opt}
                                      onChange={(e) => {
                                        const newTags = [...tags];
                                        const opts = [...newTags[index].options];
                                        opts[optIndex] = e.target.value;
                                        newTags[index].options = opts;
                                        setTags(newTags);
                                      }}
                                      className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newTags = [...tags];
                                        const opts = [...newTags[index].options];
                                        opts.splice(optIndex, 1);
                                        newTags[index].options = opts;
                                        setTags(newTags);
                                      }}
                                      className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded-md"
                                    >
                                      ลบ
                                    </button>
                                  </div>
                                ))}
                                {(!Array.isArray(tag.options) || tag.options.length === 0) && (
                                  <div className="text-xs text-gray-500 italic py-1 text-center">ยังไม่มีตัวเลือก กด + เพิ่มตัวเลือก</div>
                                )}
                              </div>
                            </div>
                          )}
                        {/* ALIGNMENT CHECKLIST UI */}

                        {tag.tag_type === 'TABLE_LOOP' && (
                          <div className="mt-3 w-full bg-blue-50 p-3 rounded-md border border-blue-200 col-span-1 md:col-span-2 lg:col-span-4">
                            <label className="block text-xs font-medium text-gray-700 mb-1">จำกัดจำนวนรายการสูงสุด (Max Items)</label>
                            <input
                              type="number"
                              min="0"
                              placeholder="เช่น 3 หรือ 5 (ปล่อยว่างถ้าไม่จำกัด)"
                              value={(tag.options && !Array.isArray(tag.options) && typeof tag.options === 'object') ? tag.options.maxItems || '' : ''}
                              onChange={(e) => {
                                const newTags = [...tags];
                                const currentOptions = Array.isArray(tag.options) ? {} : (tag.options || {});
                                newTags[index] = { 
                                  ...tag, 
                                  options: { ...currentOptions, maxItems: e.target.value ? parseInt(e.target.value) : null } 
                                };
                                setTags(newTags);
                              }}
                              className="w-full sm:w-1/2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            />
                            <p className="text-xs text-gray-500 mt-1">ตั้งค่าเพื่อป้องกันไม่ให้ผู้ใช้เพิ่มรายการเกินจำนวนที่กำหนด</p>
                          </div>
                        )}

                        {tag.tag_type === 'ALIGNMENT_CHECKLIST' && (
                          <div className="mt-3 w-full bg-gray-50 p-3 rounded-md border border-gray-200 col-span-1 md:col-span-2 lg:col-span-4">
                            <div className="flex justify-between items-center mb-2">
                              <label className="block text-xs font-medium text-gray-700">รายการหัวข้อประเมิน (Checklist)</label>
                              <button
                                type="button"
                                onClick={() => {
                                  const newTags = [...tags];
                                  const opts = Array.isArray(newTags[index].options) ? [...newTags[index].options] : [];
                                  opts.push({ key: 'chk_' + Date.now(), label: 'หัวข้อใหม่', indent: 0 });
                                  newTags[index].options = opts;
                                  setTags(newTags);
                                }}
                                className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200 flex items-center"
                              >
                                + เพิ่มหัวข้อ
                              </button>
                            </div>
                            <div className="space-y-2">
                              {(Array.isArray(tag.options) ? tag.options : []).map((opt: any, optIndex: number) => {
                                const item = typeof opt === 'string' ? { key: 'chk_' + optIndex, label: opt, indent: 0 } : opt;
                                return (
                                  <div key={optIndex} className="flex gap-2 items-center">
                                    <select
                                      value={item.indent || 0}
                                      onChange={(e) => {
                                        const newTags = [...tags];
                                        const opts = [...newTags[index].options];
                                        opts[optIndex] = { ...item, indent: parseInt(e.target.value) };
                                        newTags[index].options = opts;
                                        setTags(newTags);
                                      }}
                                      className="w-20 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-xs"
                                    >
                                      <option value={0}>หลัก</option>
                                      <option value={1}>ย่อย 1</option>
                                      <option value={2}>ย่อย 2</option>
                                    </select>
                                    <input
                                      type="text"
                                      placeholder="ตัวแปร (เช่น q_1)"
                                      value={item.key || ''}
                                      onChange={(e) => {
                                        const newTags = [...tags];
                                        const opts = [...newTags[index].options];
                                        opts[optIndex] = { ...item, key: e.target.value };
                                        newTags[index].options = opts;
                                        setTags(newTags);
                                      }}
                                      className="w-28 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-xs font-mono text-indigo-600"
                                      title="ตัวแปรสำหรับเรียกใช้ใน Word"
                                    />
                                    <input
                                      type="text"
                                      placeholder="ข้อความที่แสดง"
                                      value={item.label || ''}
                                      onChange={(e) => {
                                        const newTags = [...tags];
                                        const opts = [...newTags[index].options];
                                        opts[optIndex] = { ...item, label: e.target.value };
                                        newTags[index].options = opts;
                                        setTags(newTags);
                                      }}
                                      className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-xs"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newTags = [...tags];
                                        const opts = [...newTags[index].options];
                                        opts.splice(optIndex, 1);
                                        newTags[index].options = opts;
                                        setTags(newTags);
                                      }}
                                      className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded-md"
                                    >
                                      ลบ
                                    </button>
                                  </div>
                                );
                              })}
                              {(!Array.isArray(tag.options) || tag.options.length === 0) && (
                                <div className="text-xs text-gray-500 italic py-1 text-center">ยังไม่มีหัวข้อ กด + เพิ่มหัวข้อ</div>
                              )}
                            </div>
                          </div>
                        )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="bg-white px-4 py-4 border-t border-gray-200 sm:px-6 flex justify-between items-center flex-shrink-0">
                <div className="text-sm text-gray-500">
                  ลากจัดเรียงโดยใช้ลูกศรขึ้น/ลง เพื่อกำหนดลำดับในหน้าฟอร์ม
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:text-sm"
                  >
                    ปิด
                  </button>
                  <button
                    onClick={handleSaveTags}
                    disabled={savingTags || tags.length === 0}
                    className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none sm:text-sm disabled:opacity-50"
                  >
                    {savingTags ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า Tag'}
                  </button>
                </div>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}
