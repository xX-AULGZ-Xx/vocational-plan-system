'use client';

import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Sparkles,
  HelpCircle,
  GripVertical,
  CheckCircle,
  ListPlus,
  Check,
  Palette,
  Type,
  LayoutTemplate,
  Sliders,
  Eye,
  Layers,
  Star,
  Smile,
  Smartphone,
  Monitor,
  Wand2
} from 'lucide-react';
import { showAlert } from '@/lib/sweetalert';
import {
  SURVEY_FONTS,
  SURVEY_COLORS,
  BACKGROUND_STYLES,
  THEME_PRESETS,
  RATING_STYLES,
  getSurveyTheme
} from '@/lib/survey-themes';

interface Question {
  id?: string;
  question_text: string;
  question_type: 'RATING_5' | 'TEXT' | 'RADIO' | 'CHECKBOX';
  options?: string[];
  order_index: number;
  is_required: boolean;
}

interface Section {
  id?: string;
  title: string;
  description?: string;
  order_index: number;
  questions: Question[];
}

interface EvaluationFormEditorProps {
  projectId: string;
  token: string | null;
  initialData: any;
  onClose: () => void;
  onSaved: () => void;
}

export default function EvaluationFormEditor({
  projectId,
  token,
  initialData,
  onClose,
  onSaved,
}: EvaluationFormEditorProps) {
  const [activeEditorTab, setActiveEditorTab] = useState<'content' | 'theme'>('content');
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [previewRatingScore, setPreviewRatingScore] = useState<number>(5);

  // Form Base Info
  const [title, setTitle] = useState(initialData?.title || 'แบบประเมินความพึงพอใจโครงการ');
  const [description, setDescription] = useState(initialData?.description || '');
  const [targetResponses, setTargetResponses] = useState(initialData?.target_responses || 50);
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);

  // Theme & Font States
  const existingTheme = initialData?.theme_config || {};
  const [selectedPreset, setSelectedPreset] = useState<string>(existingTheme.preset || '');
  const [selectedFont, setSelectedFont] = useState<string>(existingTheme.font || 'prompt');
  const [selectedColor, setSelectedColor] = useState<string>(existingTheme.color || 'indigo');
  const [selectedBg, setSelectedBg] = useState<string>(existingTheme.bg_style || 'gradient');
  const [selectedRatingStyle, setSelectedRatingStyle] = useState<'buttons' | 'stars' | 'emoji'>(
    existingTheme.rating_style || 'buttons'
  );
  const [selectedBorderRadius, setSelectedBorderRadius] = useState<string>(
    existingTheme.border_radius || 'rounded-3xl'
  );

  const [sections, setSections] = useState<Section[]>(
    initialData?.sections?.length > 0
      ? initialData.sections
      : [
          {
            title: 'ตอนที่ 1: ความพึงพอใจต่อการดำเนินงานโครงการ',
            description: 'ระดับคะแนน: 5 = มากที่สุด, 4 = มาก, 3 = ปานกลาง, 2 = น้อย, 1 = น้อยที่สุด',
            order_index: 1,
            questions: [
              {
                question_text: '1. ความเหมาะสมของรูปแบบและขั้นตอนการจัดกิจกรรม',
                question_type: 'RATING_5',
                order_index: 1,
                is_required: true,
              },
            ],
          },
        ]
  );

  const [saving, setSaving] = useState(false);

  // Computed theme for live preview
  const liveTheme = getSurveyTheme({
    font: selectedFont,
    color: selectedColor,
    bg_style: selectedBg,
    rating_style: selectedRatingStyle,
    border_radius: selectedBorderRadius,
  });

  const handleApplyPreset = (presetKey: string) => {
    const preset = THEME_PRESETS[presetKey];
    if (!preset) return;
    setSelectedPreset(presetKey);
    setSelectedFont(preset.font);
    setSelectedColor(preset.color);
    setSelectedBg(preset.bg_style);
    setSelectedRatingStyle(preset.rating_style);
    setSelectedBorderRadius(preset.border_radius);
  };

  // Section Management
  const handleAddSection = () => {
    const nextOrder = sections.length + 1;
    setSections([
      ...sections,
      {
        title: `ตอนที่ ${nextOrder}: หัวข้อการประเมิน`,
        description: '',
        order_index: nextOrder,
        questions: [
          {
            question_text: 'ข้อคำถามใหม่...',
            question_type: 'RATING_5',
            order_index: 1,
            is_required: true,
          },
        ],
      },
    ]);
  };

  const handleRemoveSection = (sIdx: number) => {
    if (sections.length <= 1) {
      showAlert.warning('ไม่สามารถลบได้', 'แบบประเมินต้องมีอย่างน้อย 1 ตอนครับ');
      return;
    }
    const next = sections.filter((_, idx) => idx !== sIdx);
    setSections(next);
  };

  const handleSectionChange = (sIdx: number, field: string, val: any) => {
    const next = [...sections];
    next[sIdx] = { ...next[sIdx], [field]: val };
    setSections(next);
  };

  // Question Management
  const handleAddQuestion = (sIdx: number, type: 'RATING_5' | 'TEXT' | 'RADIO' = 'RATING_5') => {
    const next = [...sections];
    const sec = next[sIdx];
    const nextQOrder = sec.questions.length + 1;

    sec.questions.push({
      question_text: `ข้อคำถามที่ ${nextQOrder}`,
      question_type: type,
      options: type === 'RADIO' ? ['ตัวเลือก 1', 'ตัวเลือก 2'] : undefined,
      order_index: nextQOrder,
      is_required: true,
    });
    setSections(next);
  };

  const handleRemoveQuestion = (sIdx: number, qIdx: number) => {
    const next = [...sections];
    const sec = next[sIdx];
    sec.questions = sec.questions.filter((_, idx) => idx !== qIdx);
    setSections(next);
  };

  const handleQuestionChange = (sIdx: number, qIdx: number, field: string, val: any) => {
    const next = [...sections];
    const sec = next[sIdx];
    sec.questions[qIdx] = { ...sec.questions[qIdx], [field]: val };
    setSections(next);
  };

  // Save form structure & theme
  const handleSave = async () => {
    if (!title.trim()) {
      showAlert.warning('กรอกข้อมูลไม่ครบ', 'กรุณาระบุชื่อแบบประเมิน');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/evaluation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          target_responses: Number(targetResponses) || 0,
          is_active: isActive,
          theme_config: {
            preset: selectedPreset,
            font: selectedFont,
            color: selectedColor,
            bg_style: selectedBg,
            rating_style: selectedRatingStyle,
            border_radius: selectedBorderRadius,
          },
          sections: sections.map((s, sIdx) => ({
            title: s.title,
            description: s.description,
            order_index: sIdx + 1,
            questions: s.questions.map((q, qIdx) => ({
              question_text: q.question_text,
              question_type: q.question_type,
              options: q.options,
              order_index: qIdx + 1,
              is_required: q.is_required,
            })),
          })),
        }),
      });

      const data = await res.json();
      if (data.success) {
        showAlert.success('บันทึกสำเร็จ', 'อัปเดตแบบประเมินและธีมเรียบร้อยแล้ว');
        onSaved();
      } else {
        showAlert.error('บันทึกไม่สำเร็จ', data.message);
      }
    } catch (e: any) {
      showAlert.error('ข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้');
    } finally {
      setSaving(false);
    }
  };

  // Reset to default standard vocational evaluation template
  const handleResetToDefault = async () => {
    const confirmed = await showAlert.confirm(
      'โหลดเทมเพลตมาตรฐาน?',
      'การกระทำนี้จะรีเซ็ตข้อคำถามเป็นชุดมาตรฐาน 3 ตอนตามระเบียบอาชีวศึกษา คุณต้องการดำเนินการต่อหรือไม่?'
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/evaluation/init-default`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        showAlert.success('โหลดสำเร็จ', 'นำเข้าแบบประเมินมาตรฐานเรียบร้อยแล้ว');
        onSaved();
      } else {
        showAlert.error('เกิดข้อผิดพลาด', data.message);
      }
    } catch (e) {
      showAlert.error('ข้อผิดพลาด', 'ไม่สามารถโหลดเทมเพลตได้');
    } finally {
      setSaving(false);
    }
  };

  const emojiIcons = [
    { score: 5, emoji: '😍', label: 'มากที่สุด' },
    { score: 4, emoji: '😊', label: 'มาก' },
    { score: 3, emoji: '😐', label: 'ปานกลาง' },
    { score: 2, emoji: '🙁', label: 'น้อย' },
    { score: 1, emoji: '😢', label: 'น้อยที่สุด' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-5xl w-full max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/90">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <span>ปรับแต่งแบบประเมินความพึงพอใจ</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              กำหนดชุดคำถาม หมวดหมู่ และตกแต่งธีมสี/ฟอนต์ของแบบประเมิน
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Editor Tabs Navigation */}
            <div className="flex bg-slate-200/80 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setActiveEditorTab('content')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeEditorTab === 'content'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>เนื้อหาคำถาม</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveEditorTab('theme')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeEditorTab === 'theme'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Palette className="w-3.5 h-3.5 text-indigo-600" />
                <span>ธีมและฟอนต์ (Theme)</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/30">
          
          {/* TAB 1: CONTENT EDITOR */}
          {activeEditorTab === 'content' && (
            <div className="space-y-6">
              {/* Quick Preset Action */}
              <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 p-4 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-xs text-indigo-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>เทมเพลตมาตรฐานอาชีวศึกษา (3 ตอน 9 ตัวชี้วัด)</span>
                  </div>
                  <p className="text-xs text-indigo-700/80 mt-0.5">
                    ครอบคลุมข้อมูลทั่วไป, ความพึงพอใจ 5 ระดับ (ด้านกิจกรรม, ด้านสถานที่, ด้านประโยชน์ที่ได้รับ) และข้อเสนอแนะ
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  disabled={saving}
                  className="px-3.5 py-1.5 bg-white text-indigo-700 hover:bg-indigo-600 hover:text-white border border-indigo-200 font-medium text-xs rounded-xl shadow-sm transition-all whitespace-nowrap"
                >
                  โหลดเทมเพลตมาตรฐาน
                </button>
              </div>

              {/* Form Settings */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800">ข้อมูลทั่วไปของแบบประเมิน</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ชื่อแบบประเมิน <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full text-sm rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 p-2.5"
                      placeholder="เช่น แบบประเมินความพึงพอใจการดำเนินงานโครงการ..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      เป้าหมายผู้ตอบ (คน)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={targetResponses}
                      onChange={(e) => setTargetResponses(parseInt(e.target.value) || 0)}
                      className="w-full text-sm rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 p-2.5"
                      placeholder="50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    คำชี้แจง / วัตถุประสงค์
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="w-full text-sm rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 p-2.5"
                    placeholder="คำอธิบายสั้นๆ สำหรับผู้ตอบแบบประเมิน..."
                  />
                </div>
              </div>

              {/* Sections & Questions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800">หมวดหมู่และข้อคำถาม ({sections.length} ตอน)</h3>
                  <button
                    type="button"
                    onClick={handleAddSection}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่มตอนใหม่</span>
                  </button>
                </div>

                {sections.map((sec, sIdx) => (
                  <div key={sIdx} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                    
                    {/* Section Header */}
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">
                            ชื่อตอน ({sIdx + 1})
                          </label>
                          <input
                            type="text"
                            value={sec.title}
                            onChange={(e) => handleSectionChange(sIdx, 'title', e.target.value)}
                            className="w-full text-xs font-bold text-slate-800 rounded-lg border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 p-2"
                            placeholder="ชื่อตอน..."
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">
                            คำอธิบายเพิ่มเติม
                          </label>
                          <input
                            type="text"
                            value={sec.description || ''}
                            onChange={(e) => handleSectionChange(sIdx, 'description', e.target.value)}
                            className="w-full text-xs text-slate-600 rounded-lg border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 p-2"
                            placeholder="เช่น ระดับคะแนน 5-1..."
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveSection(sIdx)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-4"
                        title="ลบตอนนี้"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Questions List */}
                    <div className="space-y-3 pl-2 sm:pl-4 border-l-2 border-indigo-100">
                      {sec.questions.map((q, qIdx) => (
                        <div key={qIdx} className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/60 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-400 w-5">{qIdx + 1}.</span>
                              <input
                                type="text"
                                value={q.question_text}
                                onChange={(e) => handleQuestionChange(sIdx, qIdx, 'question_text', e.target.value)}
                                className="flex-1 text-xs font-medium text-slate-800 rounded-lg border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 p-2 bg-white"
                                placeholder="ข้อความคำถาม..."
                              />
                            </div>

                            {/* Question Type Selector */}
                            <select
                              value={q.question_type}
                              onChange={(e) => handleQuestionChange(sIdx, qIdx, 'question_type', e.target.value)}
                              className="text-xs rounded-lg border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 p-2 bg-white text-slate-700"
                            >
                              <option value="RATING_5">⭐ สเกล 5 ระดับ (Likert)</option>
                              <option value="RADIO">🔘 ตัวเลือก (Single Choice)</option>
                              <option value="TEXT">📝 ข้อความปลายเปิด (Text)</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => handleRemoveQuestion(sIdx, qIdx)}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="ลบข้อคำถาม"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Options editor for RADIO */}
                          {q.question_type === 'RADIO' && (
                            <div className="pl-7 pt-1">
                              <label className="block text-[11px] text-slate-500 mb-1">
                                ตัวเลือก (คั่นด้วยเครื่องหมายจุลภาค , เช่น: ชาย, หญิง, อื่นๆ)
                              </label>
                              <input
                                type="text"
                                value={Array.isArray(q.options) ? q.options.join(', ') : ''}
                                onChange={(e) => {
                                  const opts = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                  handleQuestionChange(sIdx, qIdx, 'options', opts);
                                }}
                                className="w-full text-xs rounded-lg border-slate-200 p-2 bg-white"
                                placeholder="ตัวเลือก 1, ตัวเลือก 2, ตัวเลือก 3"
                              />
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Add Question Buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleAddQuestion(sIdx, 'RATING_5')}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-indigo-600 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 px-2.5 py-1.5 rounded-lg transition-all"
                        >
                          <Plus className="w-3 h-3 text-indigo-500" />
                          <span>+ สเกล 5 ระดับ</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddQuestion(sIdx, 'RADIO')}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-indigo-600 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 px-2.5 py-1.5 rounded-lg transition-all"
                        >
                          <Plus className="w-3 h-3 text-indigo-500" />
                          <span>+ ตัวเลือก</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddQuestion(sIdx, 'TEXT')}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-indigo-600 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 px-2.5 py-1.5 rounded-lg transition-all"
                        >
                          <Plus className="w-3 h-3 text-indigo-500" />
                          <span>+ ข้อความข้อเสนอแนะ</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: THEME & FONT CUSTOMIZER */}
          {activeEditorTab === 'theme' && (
            <div className="space-y-6">
              
              {/* Top Live Interactive Preview Banner */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                      ตัวอย่างหน้าตาแบบประเมินแบบเรียลไทม์ (Interactive Live Preview)
                    </h3>
                  </div>

                  {/* Device Switcher (Mobile / Desktop) */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('mobile')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                        previewDevice === 'mobile'
                          ? 'bg-white text-indigo-600 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>มือถือ (Mobile)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('desktop')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                        previewDevice === 'desktop'
                          ? 'bg-white text-indigo-600 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Monitor className="w-3.5 h-3.5" />
                      <span>จอคอมพิวเตอร์ (Desktop)</span>
                    </button>
                  </div>
                </div>

                {/* Simulated Container */}
                <div className="flex justify-center p-2 sm:p-4 bg-slate-100/70 rounded-2xl border border-slate-200/60 overflow-hidden">
                  <div
                    className={`transition-all duration-300 ${
                      previewDevice === 'mobile' ? 'max-w-md w-full shadow-2xl rounded-3xl border border-slate-200' : 'w-full'
                    } p-5 ${liveTheme.font.className} ${liveTheme.bg.bgClass} overflow-hidden`}
                  >
                    {/* Header Banner Preview */}
                    <div
                      className="p-5 rounded-2xl text-white shadow-md space-y-1 mb-4 relative overflow-hidden"
                      style={{ background: liveTheme.color.gradientStyle }}
                    >
                      <div className="absolute top-0 right-0 translate-x-4 -translate-y-4 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
                      <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-medium text-white/95 mb-1">
                        ✨ แบบประเมินความพึงพอใจ
                      </div>
                      <h4 className="text-base font-bold leading-tight">{title || 'แบบประเมินความพึงพอใจ'}</h4>
                      <p className="text-xs text-white/85">โครงการตัวอย่าง (PRJ-2569-ACAD-0001)</p>
                    </div>

                    {/* Sample Interactive Question Card */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-xs space-y-3">
                      <div className="text-xs font-bold text-slate-800 leading-snug">
                        1. ความเหมาะสมของขั้นตอนและรูปแบบการจัดกิจกรรม <span className="text-red-500">*</span>
                      </div>

                      {/* Interactive Rating Component Preview based on selectedRatingStyle */}
                      {selectedRatingStyle === 'buttons' && (
                        <div className="grid grid-cols-5 gap-1.5 pt-1">
                          {[5, 4, 3, 2, 1].map((num) => {
                            const isSelected = previewRatingScore === num;
                            return (
                              <button
                                type="button"
                                key={num}
                                onClick={() => setPreviewRatingScore(num)}
                                className={`p-2 rounded-xl text-center text-xs font-bold border transition-all ${
                                  isSelected
                                    ? liveTheme.color.scoreSelectedClass + ' scale-[1.02]'
                                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                              >
                                <div>{num}</div>
                                <div className="text-[9px] font-normal opacity-85">
                                  {num === 5 ? 'มากที่สุด' : num === 4 ? 'มาก' : num === 3 ? 'ปานกลาง' : num === 2 ? 'น้อย' : 'น้อยที่สุด'}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {selectedRatingStyle === 'stars' && (
                        <div className="flex flex-col items-center py-2 space-y-1.5">
                          <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                type="button"
                                key={star}
                                onClick={() => setPreviewRatingScore(star)}
                                className="p-1 text-2xl transition-transform hover:scale-125 focus:outline-none"
                              >
                                <Star
                                  className={`w-7 h-7 ${
                                    star <= previewRatingScore
                                      ? 'fill-amber-400 text-amber-400 drop-shadow-sm'
                                      : 'text-slate-300 hover:text-amber-200'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                          <div className="text-xs font-bold text-slate-700">
                            {previewRatingScore === 5 && '⭐️⭐️⭐️⭐️⭐️ มากที่สุด (5 คะแนน)'}
                            {previewRatingScore === 4 && '⭐️⭐️⭐️⭐️ มาก (4 คะแนน)'}
                            {previewRatingScore === 3 && '⭐️⭐️⭐️ ปานกลาง (3 คะแนน)'}
                            {previewRatingScore === 2 && '⭐️⭐️ น้อย (2 คะแนน)'}
                            {previewRatingScore === 1 && '⭐️ น้อยที่สุด (1 คะแนน)'}
                          </div>
                        </div>
                      )}

                      {selectedRatingStyle === 'emoji' && (
                        <div className="grid grid-cols-5 gap-1.5 pt-1">
                          {emojiIcons.map((item) => {
                            const isSelected = previewRatingScore === item.score;
                            return (
                              <button
                                type="button"
                                key={item.score}
                                onClick={() => setPreviewRatingScore(item.score)}
                                className={`p-2 rounded-2xl flex flex-col items-center border transition-all ${
                                  isSelected
                                    ? liveTheme.color.activeRadioClass + ' ring-2 ring-indigo-400 scale-[1.05]'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                <span className="text-2xl mb-0.5">{item.emoji}</span>
                                <span className="text-[9px] font-bold">{item.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Sample Submit Button */}
                    <div className="pt-3 text-center">
                      <div
                        className="w-full py-3 rounded-xl font-bold text-xs shadow-md transition-all"
                        style={{ backgroundColor: liveTheme.color.buttonColor, color: '#ffffff' }}
                      >
                        ส่งแบบประเมินความพึงพอใจ
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 0. One-Click Theme Presets */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-indigo-600" />
                      <span>ชุดธีมสำเร็จรูปยอดนิยม (One-Click Theme Presets)</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      เลือกชุดธีมสำเร็จรูปที่ผสมผสานฟอนต์ สี และสไตล์ให้เข้ากับลักษณะของโครงการได้ทันทีในคลิกเดียว
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.values(THEME_PRESETS).map((preset) => {
                    const isSelected = selectedPreset === preset.id;
                    const presetColor = SURVEY_COLORS[preset.color] || SURVEY_COLORS.indigo;
                    return (
                      <button
                        type="button"
                        key={preset.id}
                        onClick={() => handleApplyPreset(preset.id)}
                        className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                          isSelected
                            ? 'bg-indigo-50/70 border-indigo-600 ring-2 ring-indigo-600/30 shadow-md'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{preset.icon}</span>
                            <div>
                              <div className="text-xs font-bold text-slate-900 leading-snug">
                                {preset.name}
                              </div>
                              <div className="text-[10px] text-slate-400 font-medium">
                                ฟอนต์: {SURVEY_FONTS[preset.font]?.name.split(' ')[0]} • สี: {presetColor.name.split(' ')[0]}
                              </div>
                            </div>
                          </div>
                          {isSelected && (
                            <span className="w-4 h-4 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-xs shrink-0">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          )}
                        </div>

                        <div
                          className="h-2.5 rounded-full mb-1.5 shadow-xs"
                          style={{ background: presetColor.gradientStyle }}
                        />
                        <p className="text-[11px] text-slate-500 font-normal line-clamp-2">
                          {preset.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 1. Rating Style Selector */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Star className="w-4 h-4 text-indigo-600" />
                      <span>รูปแบบปุ่มให้คะแนน 5 ระดับ (Rating Style)</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      เลือกรูปแบบการแสดงผลของตัวเลือกคะแนนความพึงพอใจ
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {Object.values(RATING_STYLES).map((rs) => {
                    const isSelected = selectedRatingStyle === rs.id;
                    return (
                      <button
                        type="button"
                        key={rs.id}
                        onClick={() => {
                          setSelectedRatingStyle(rs.id);
                          setSelectedPreset('');
                        }}
                        className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                          isSelected
                            ? 'bg-indigo-50/70 border-indigo-600 ring-2 ring-indigo-600/30 shadow-md'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute top-2.5 right-2.5 w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-xs">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                        <div>
                          <div className="text-xs font-bold text-slate-900 leading-snug">
                            {rs.name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-normal mt-1 leading-relaxed">
                            {rs.desc}
                          </div>
                        </div>

                        {/* Visual sample */}
                        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-center gap-1 text-slate-600">
                          {rs.id === 'buttons' && (
                            <div className="flex gap-1 text-[10px]">
                              {[1, 2, 3, 4, 5].map((n) => (
                                <span key={n} className="px-1.5 py-0.5 rounded bg-slate-100 font-bold">{n}</span>
                              ))}
                            </div>
                          )}
                          {rs.id === 'stars' && (
                            <div className="flex text-amber-400 text-sm">
                              {'⭐️⭐️⭐️⭐️⭐️'}
                            </div>
                          )}
                          {rs.id === 'emoji' && (
                            <div className="flex gap-1 text-sm">
                              <span>😢</span><span>🙁</span><span>😐</span><span>😊</span><span>😍</span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Font Family Selector */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Type className="w-4 h-4 text-indigo-600" />
                      <span>รูปแบบตัวอักษร (Thai Font Family)</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ฟอนต์ภาษาไทยยอดนิยมที่ออกแบบให้อ่านง่ายทั้งบนมือถือและคอมพิวเตอร์
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {Object.values(SURVEY_FONTS).map((font) => {
                    const isSelected = selectedFont === font.id;
                    return (
                      <button
                        type="button"
                        key={font.id}
                        onClick={() => {
                          setSelectedFont(font.id);
                          setSelectedPreset('');
                        }}
                        className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${font.className} ${
                          isSelected
                            ? 'bg-indigo-50/70 border-indigo-600 ring-2 ring-indigo-600/30 shadow-md shadow-indigo-100'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute top-2.5 right-2.5 w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-xs">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                        <div>
                          <div className="text-sm font-bold text-slate-900 leading-snug">
                            {font.name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                            {font.desc}
                          </div>
                        </div>
                        <div className="mt-3 pt-2 border-t border-slate-100 text-xs text-slate-700 font-medium line-clamp-1">
                          กขคง อาชีวศึกษา 1234
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Color Theme Palette Selector */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Palette className="w-4 h-4 text-indigo-600" />
                      <span>ชุดโทนสี (Color Palette)</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      โทนสีหลักของแบนเนอร์ ปุ่มกด และไฮไลต์คำตอบในแบบประเมิน
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {Object.values(SURVEY_COLORS).map((color) => {
                    const isSelected = selectedColor === color.id;
                    return (
                      <button
                        type="button"
                        key={color.id}
                        onClick={() => {
                          setSelectedColor(color.id);
                          setSelectedPreset('');
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                          isSelected
                            ? 'bg-slate-50 border-slate-800 ring-2 ring-slate-800/30 shadow-md'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div
                          className="w-full h-8 rounded-xl mb-2 shadow-inner flex items-center justify-end pr-2"
                          style={{ background: color.gradientStyle }}
                        >
                          {isSelected && (
                            <span className="w-4 h-4 bg-white text-slate-900 rounded-full flex items-center justify-center shadow-xs">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-bold text-slate-800 leading-tight">
                          {color.name}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Background Style Selector */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      <span>สไตล์พื้นหลัง (Background Pattern)</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ลวดลายและเอฟเฟกต์พื้นหลังของหน้าแบบประเมิน
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {Object.values(BACKGROUND_STYLES).map((bg) => {
                    const isSelected = selectedBg === bg.id;
                    return (
                      <button
                        type="button"
                        key={bg.id}
                        onClick={() => {
                          setSelectedBg(bg.id);
                          setSelectedPreset('');
                        }}
                        className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
                          isSelected
                            ? 'bg-indigo-50/70 border-indigo-600 ring-2 ring-indigo-600/30 shadow-md'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute top-2.5 right-2.5 w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-xs">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                        <div className="text-xs font-bold text-slate-800">{bg.name}</div>
                        <div className={`mt-2 h-8 rounded-lg border border-slate-200/60 ${bg.bgClass}`} />
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-white flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 hidden sm:block">
            {activeEditorTab === 'theme' ? (
              <span>✨ ธีม ฟอนต์ และสไตล์การให้คะแนนจะแสดงผลทันทีเมื่อผู้ประเมินสแกน QR Code</span>
            ) : (
              <span>💡 สามารถสลับแท็บ "ธีมและฟอนต์" ด้านบนเพื่อตกแต่งหน้าจอได้</span>
            )}
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-xs sm:text-sm transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-indigo-200 transition-all disabled:opacity-50 hover:scale-[1.02]"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'กำลังบันทึก...' : 'บันทึกแบบประเมิน'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
