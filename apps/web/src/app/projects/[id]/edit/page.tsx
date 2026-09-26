'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import { getCurrentThaiFiscalYear, detectProjectFiscalYear, calculateFiscalYearFromDateString, getThaiFiscalYearDateRange, formatThaiBaht } from '@/lib/bahttext';
import { showAlert } from '@/lib/sweetalert';
import {
  ArrowLeft,
  Save,
  Send,
  Eye,
  FileText,
  AlertCircle,
  RefreshCw,
  Plus,
  Trash2,
  Clock,
  Calculator,
} from 'lucide-react';

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const [isLoadingProject, setIsLoadingProject] = useState(true);

  const { user, token } = useAuth();
  const {
    collegeName,
    directorName,
    directorPosition,
    deputyAcadName,
    deputyAcadPosition,
    deputyResName,
    deputyResPosition,
    deputyDevName,
    deputyDevPosition,
    deputyStratName,
    deputyStratPosition,
    planningHeadName,
    planningHeadPosition,
    currentFiscalYear,
    isSubmissionOpen,
    submissionStartDate,
    submissionEndDate
  } = useSettings();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // System fields
  const [title, setTitle] = useState('');
  const [fiscalYear, setFiscalYear] = useState(parseInt(currentFiscalYear) || new Date().getFullYear() + 543);
  const [departmentId, setDepartmentId] = useState('');
  const [totalBudget, setTotalBudget] = useState('0');

  // Dropdowns
  const [divisionsData, setDivisionsData] = useState<any[]>([]);
  const [proposalTemplate, setProposalTemplate] = useState<any>(null);

  const [dynamicData, setDynamicData] = useState<Record<string, any>>({});
  const [budgetItems, setBudgetItems] = useState<any[]>([]);

  const addBudgetItem = () => {
    setBudgetItems(prev => {
      const arr = [...prev, { category_id: 3, description: '', quantity: 1, unit: 'ชิ้น', unit_price: '', total_amount: 0 }];
      const totalSum = arr.reduce((sum, it) => sum + (Number(it.total_amount) || 0), 0);
      setTotalBudget(String(totalSum));
      return arr;
    });
  };

  const updateBudgetItem = (index: number, field: string, rawVal: any) => {
    setBudgetItems(prev => {
      const arr = [...prev];
      const item = { ...arr[index] };

      if (field === 'quantity') {
        const valStr = String(rawVal).replace(/,/g, '');
        if (valStr === '' || /^[0-9]*\.?[0-9]*$/.test(valStr)) {
          item.quantity = valStr;
        }
        const q = parseFloat(String(item.quantity)) || 0;
        const p = parseFloat(String(item.unit_price)) || 0;
        item.total_amount = Math.round(q * p * 100) / 100;
      } else if (field === 'unit_price') {
        const valStr = String(rawVal).replace(/,/g, '');
        if (valStr === '' || /^[0-9]*\.?[0-9]*$/.test(valStr)) {
          item.unit_price = valStr;
        }
        const q = parseFloat(String(item.quantity)) || 0;
        const p = parseFloat(String(item.unit_price)) || 0;
        item.total_amount = Math.round(q * p * 100) / 100;
      } else {
        item[field] = rawVal;
      }

      arr[index] = item;

      const totalSum = arr.reduce((sum, it) => sum + (Number(it.total_amount) || 0), 0);
      setTotalBudget(String(totalSum));
      setDynamicData(prevDyn => ({
        ...prevDyn,
        total_budget: totalSum,
        ...(prevDyn.total_budget_baht !== undefined || prevDyn.baht_text !== undefined ? {
          total_budget_baht: formatThaiBaht(totalSum),
          baht_text: formatThaiBaht(totalSum),
        } : {}),
      }));

      return arr;
    });
  };

  const handleBudgetItemBlur = (index: number, field: 'quantity' | 'unit_price') => {
    setBudgetItems(prev => {
      const arr = [...prev];
      const item = { ...arr[index] };
      if (field === 'quantity') {
        const q = parseFloat(String(item.quantity));
        item.quantity = isNaN(q) || q <= 0 ? 1 : q;
      } else if (field === 'unit_price') {
        const p = parseFloat(String(item.unit_price));
        item.unit_price = isNaN(p) || p < 0 ? 0 : p;
      }
      const q = parseFloat(String(item.quantity)) || 0;
      const p = parseFloat(String(item.unit_price)) || 0;
      item.total_amount = Math.round(q * p * 100) / 100;
      arr[index] = item;
      return arr;
    });
  };

  const removeBudgetItem = (index: number) => {
    setBudgetItems(prev => {
      const arr = [...prev];
      arr.splice(index, 1);
      const totalSum = arr.reduce((sum, it) => sum + (Number(it.total_amount) || 0), 0);
      setTotalBudget(String(totalSum));
      setDynamicData(prevDyn => ({
        ...prevDyn,
        total_budget: totalSum,
        ...(prevDyn.total_budget_baht !== undefined || prevDyn.baht_text !== undefined ? {
          total_budget_baht: formatThaiBaht(totalSum),
          baht_text: formatThaiBaht(totalSum),
        } : {}),
      }));
      return arr;
    });
  };

  useEffect(() => {
    if (token && projectId) {
      fetchDivisions().then(() => fetchProposalTemplate().then(() => fetchProject()));
    }
  }, [token, projectId, planningHeadName]);

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/v1/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        const proj = data.data;
        const isApprovedOrCompleted = proj.status === 'approved' || proj.status === 'in_progress' || proj.status === 'completed';
        if (isApprovedOrCompleted) {
          await showAlert.warning('ไม่สามารถแก้ไขได้', 'ไม่สามารถแก้ไขโครงการที่ได้รับการอนุมัติขั้นสุดท้ายหรือเสร็จสิ้นแล้วได้');
          router.push(`/projects/${projectId}`);
          return;
        }

        setTitle(proj.title || '');
        setFiscalYear(proj.fiscal_year || (parseInt(currentFiscalYear) || new Date().getFullYear() + 543));
        setDepartmentId(proj.department_id || '');
        setTotalBudget(proj.total_budget || '0');
        
        let parsedDynamic: Record<string, any> = {};
        try {
          let temp = proj.dynamic_data;
          while (typeof temp === 'string') {
            temp = JSON.parse(temp);
          }
          if (temp && typeof temp === 'object') {
            parsedDynamic = temp;
          }
        } catch(e){}

        if (!parsedDynamic.leader_name) parsedDynamic.leader_name = user?.full_name || '';
        if (!parsedDynamic.leader_position) {
          const userDept = user?.department;
          if (userDept) {
            if (user?.role === 'HEAD_DEPT' || (user as any)?.is_head) {
              parsedDynamic.leader_position = userDept.name.startsWith('งาน') || userDept.name.startsWith('แผนก') 
                ? `หัวหน้า${userDept.name}` 
                : `หัวหน้างาน${userDept.name}`;
            } else if (user?.position === 'เจ้าหน้าที่') {
              parsedDynamic.leader_position = userDept.name.startsWith('งาน') || userDept.name.startsWith('แผนก')
                ? `เจ้าหน้าที่${userDept.name}`
                : `เจ้าหน้าที่งาน${userDept.name}`;
            } else {
              parsedDynamic.leader_position = userDept.name.startsWith('แผนก') 
                ? `ครูประจำ${userDept.name}` 
                : (userDept.name.startsWith('งาน') ? `ครูผู้ช่วย${userDept.name}` : `ครูประจำแผนกวิชา${userDept.name}`);
            }
          } else {
            parsedDynamic.leader_position = user?.position || 'ครู';
          }
        }
        if (!parsedDynamic.planning_head_name) parsedDynamic.planning_head_name = planningHeadName || '';
        if (!parsedDynamic.planning_head_position) parsedDynamic.planning_head_position = planningHeadPosition || 'หัวหน้างานวางแผนและงบประมาณ';
        if (!parsedDynamic.head_name) {
          const userDept = (divisionsData || []).reduce((acc: any[], div: any) => [...acc, ...(div.departments || [])], []).find((d: any) => d.id === (proj.department_id || user?.department?.id || (user as any)?.department_id));
          if (userDept?.head_name) parsedDynamic.head_name = userDept.head_name;
        }
        if (!parsedDynamic.head_position) {
          const userDept = (divisionsData || []).reduce((acc: any[], div: any) => [...acc, ...(div.departments || [])], []).find((d: any) => d.id === (proj.department_id || user?.department?.id || (user as any)?.department_id));
          if (userDept) parsedDynamic.head_position = userDept.head_position || `หัวหน้า${userDept.name}`;
        }
        if (!parsedDynamic.director_name) parsedDynamic.director_name = directorName || '';
        if (!parsedDynamic.director_position) parsedDynamic.director_position = directorPosition || '';
        if (!parsedDynamic.college_name) parsedDynamic.college_name = collegeName || '';
        if (!parsedDynamic.deputy_acad_name) parsedDynamic.deputy_acad_name = deputyAcadName || '';
        if (!parsedDynamic.deputy_acad_position) parsedDynamic.deputy_acad_position = deputyAcadPosition || '';
        if (!parsedDynamic.deputy_res_name) parsedDynamic.deputy_res_name = deputyResName || '';
        if (!parsedDynamic.deputy_res_position) parsedDynamic.deputy_res_position = deputyResPosition || '';
        if (!parsedDynamic.deputy_dev_name) parsedDynamic.deputy_dev_name = deputyDevName || '';
        if (!parsedDynamic.deputy_dev_position) parsedDynamic.deputy_dev_position = deputyDevPosition || '';
        if (!parsedDynamic.deputy_strat_name) parsedDynamic.deputy_strat_name = deputyStratName || '';
        if (!parsedDynamic.deputy_strat_position) parsedDynamic.deputy_strat_position = deputyStratPosition || '';
        
        // Approver auto fill
        if (!parsedDynamic.approver_name && !parsedDynamic.approver && !parsedDynamic.endorser_name && !parsedDynamic.endorser) {
          const userDivId = proj.department?.division_id || user?.department?.division_id || (user as any)?.division_id;
          if (userDivId === 1 && deputyAcadName) parsedDynamic.approver_name = deputyAcadName;
          else if (userDivId === 2 && deputyResName) parsedDynamic.approver_name = deputyResName;
          else if (userDivId === 3 && deputyDevName) parsedDynamic.approver_name = deputyDevName;
          else if (userDivId === 4 && deputyStratName) parsedDynamic.approver_name = deputyStratName;
          else parsedDynamic.approver_name = deputyResName || deputyAcadName || deputyStratName || deputyDevName || '';
        }
        if (!parsedDynamic.approver_position && !parsedDynamic.approver_name_position && !parsedDynamic.endorser_position && !parsedDynamic.endorser_name_position) {
          const userDivId = proj.department?.division_id || user?.department?.division_id || (user as any)?.division_id;
          if (userDivId === 1 && deputyAcadPosition) parsedDynamic.approver_position = deputyAcadPosition;
          else if (userDivId === 2 && deputyResPosition) parsedDynamic.approver_position = deputyResPosition;
          else if (userDivId === 3 && deputyDevPosition) parsedDynamic.approver_position = deputyDevPosition;
          else if (userDivId === 4 && deputyStratPosition) parsedDynamic.approver_position = deputyStratPosition;
          else parsedDynamic.approver_position = deputyResPosition || deputyAcadPosition || deputyStratPosition || deputyDevPosition || 'รองผู้อำนวยการฝ่าย';
        }
        
        setDynamicData(parsedDynamic);
        
        if (proj.budget_items && Array.isArray(proj.budget_items)) {
          const bItems = proj.budget_items.map((b: any) => ({
             category_id: parseInt(b.category_id) || 3,
             description: b.description,
             quantity: Number(b.quantity),
             unit: b.unit,
             unit_price: Number(b.unit_price),
             total_amount: Number(b.total_amount)
          }));
          setBudgetItems(bItems);
        }
      }
    } catch(e) {
      console.error(e);
    } finally {
      setIsLoadingProject(false);
    }
  };

  const fetchDivisions = async () => {
    try {
      const res = await fetch('/api/v1/divisions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDivisionsData(data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

const fetchProposalTemplate = async () => {
    try {
      const res = await fetch('/api/v1/projects/active-proposal-template', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setProposalTemplate(data.data);
        // Initialize dynamic data
        const initial: Record<string, any> = {};
        data.data.tags?.forEach((t: any) => {
           if (t.tag_type === 'TABLE_LOOP') {
             initial[t.tag_name] = [{}];
           } else if (t.tag_type === 'BOOLEAN') {
             initial[t.tag_name] = false;
           } else {
             initial[t.tag_name] = '';
           }
        });
        setDynamicData(initial);
      } else {
         console.warn('No active proposal template found.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDynamicChange = (key: string, value: any) => {
    setDynamicData(prev => {
      const updated = { ...prev, [key]: value };
      const detectedFY = detectProjectFiscalYear(updated, currentFiscalYear || fiscalYear);
      if (detectedFY) {
        setFiscalYear(detectedFY);
        updated['fiscal_year'] = String(detectedFY);
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent, status: 'draft' | 'pending') => {
    e.preventDefault();
    
    // Format budget items to numbers and compute total sum
    const formattedBudgetItems = budgetItems.map((item) => {
      const q = parseFloat(String(item.quantity)) || 0;
      const p = parseFloat(String(item.unit_price)) || 0;
      return {
        ...item,
        quantity: q,
        unit_price: p,
        total_amount: Math.round(q * p * 100) / 100,
      };
    });
    const budgetItemsSum = formattedBudgetItems.reduce((sum, item) => sum + item.total_amount, 0);
    const computedTotalBudget = budgetItemsSum > 0 ? budgetItemsSum : (Number(dynamicData['total_budget']) || 0);

    // Auto-map system fields from dynamic data
    const computedTitle = dynamicData['title'] || dynamicData['project_name'] || 'โครงการไม่มีชื่อ';
    const computedFiscalYear = detectProjectFiscalYear(dynamicData, currentFiscalYear || fiscalYear);
    // For department, find department matching the selected approver/endorser or user's department
    const approverVal = dynamicData['endorser_name'] || dynamicData['endorser'] || dynamicData['approver_name'] || dynamicData['approver'] || '';
    const approverPos = dynamicData['endorser_position'] || dynamicData['endorser_name_position'] || dynamicData['approver_position'] || dynamicData['approver_name_position'] || '';
    const approverDivId = dynamicData['approver_division_id'];

    const matchedDiv = (divisionsData || []).find((d: any) => 
      (approverDivId && d.id === approverDivId) ||
      (approverVal && (d.deputy_name === approverVal || d.name === approverVal)) ||
      (approverPos && (d.deputy_position === approverPos || approverPos.includes(d.name)))
    );

    const allDepts = (divisionsData || []).reduce((acc: any[], div: any) => [...acc, ...(div.departments || [])], []);
    
    // STRICT ROUTING: Determine department ONLY from form selections (LEADER_POSITION or APPROVER_DROPDOWN), NEVER from user.department
    let computedDepartmentId: number | null = null;

    if (dynamicData['leader_department_id']) {
      computedDepartmentId = parseInt(dynamicData['leader_department_id']);
    } else if (dynamicData['leader_department_name']) {
      const d = allDepts.find((dept: any) => dept.name === dynamicData['leader_department_name']);
      if (d) computedDepartmentId = d.id;
    } else if (dynamicData['leader_position']) {
      const leaderPosStr = String(dynamicData['leader_position']);
      for (const d of allDepts) {
        if (leaderPosStr.includes(d.name)) {
          computedDepartmentId = d.id;
          break;
        }
      }
    }

    if (!computedDepartmentId && departmentId) {
      computedDepartmentId = parseInt(departmentId);
    }

    if (!computedDepartmentId && matchedDiv && matchedDiv.departments?.length > 0) {
      computedDepartmentId = matchedDiv.departments[0].id;
    }

    if (!computedDepartmentId && allDepts.length > 0) {
      computedDepartmentId = allDepts[0].id;
    }

    if (!computedDepartmentId) {
      computedDepartmentId = 1;
    }
    
    // Check required fields validation
    if (proposalTemplate && Array.isArray(proposalTemplate.tags)) {
      const missingRequiredTags: { label: string; tag_name: string }[] = [];

      for (const tag of proposalTemplate.tags) {
        // Skip hidden tags
        if (tag.options && typeof tag.options === 'object' && !Array.isArray(tag.options) && tag.options.is_hidden) {
          continue;
        }

        if (tag.is_required) {
          const val = dynamicData[tag.tag_name];
          const tagLabel = tag.label || tag.tag_name;

          if (val === undefined || val === null || val === '') {
            missingRequiredTags.push({ label: tagLabel, tag_name: tag.tag_name });
          } else if (typeof val === 'string' && val.trim() === '') {
            missingRequiredTags.push({ label: tagLabel, tag_name: tag.tag_name });
          } else if (tag.tag_type === 'DATERANGE') {
            if (!val || typeof val !== 'object' || !val.start || !val.end) {
              missingRequiredTags.push({ label: tagLabel, tag_name: tag.tag_name });
            }
          } else if (tag.tag_type === 'ALIGNMENT_CHECKLIST') {
            if (!val || typeof val !== 'object' || !Object.values(val).some(Boolean)) {
              missingRequiredTags.push({ label: tagLabel, tag_name: tag.tag_name });
            }
          } else if (tag.tag_type === 'TABLE_LOOP' && Array.isArray(val)) {
            const hasValidRow = val.some((row: any) => row && typeof row === 'object' && Object.values(row).some((v: any) => typeof v === 'string' ? v.trim() !== '' : !!v));
            if (!hasValidRow) {
              missingRequiredTags.push({ label: tagLabel, tag_name: tag.tag_name });
            }
          }
        }
      }

      if (missingRequiredTags.length > 0) {
        showAlert.warning(
          'กรอกข้อมูลไม่ครบถ้วน',
          `กรุณากรอกหัวข้อที่จำเป็น (${missingRequiredTags.map(t => t.label).join(', ')}) ให้ครบถ้วน`
        );

        // Scroll to the first missing field if possible
        const firstMissing = missingRequiredTags[0];
        const el = document.getElementById(`field-${firstMissing.tag_name}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        setErrorMsg(`กรุณากรอกข้อมูลที่จำเป็นให้ครบ: ${missingRequiredTags.map(t => t.label).join(', ')}`);
        return;
      }
    }

    // Validate project duration dates against configured fiscal year
    const configuredFY = parseInt(currentFiscalYear || String(fiscalYear)) || (new Date().getFullYear() + 543);
    const { minDate: minFiscalDate, minDateThai } = getThaiFiscalYearDateRange(configuredFY);

    for (const [k, val] of Object.entries(dynamicData)) {
      if (!val) continue;
      if (typeof val === 'object' && !Array.isArray(val)) {
        if (val.start && val.start < minFiscalDate) {
          showAlert.warning(
            'ระยะเวลาดำเนินโครงการไม่ถูกต้อง',
            `วันที่เริ่มต้นดำเนินโครงการ (${val.start}) ไม่สามารถตั้งค่าต่ำกว่าวันเริ่มต้นของปีงบประมาณ ${configuredFY} (${minDateThai}) ได้`
          );
          setErrorMsg(`วันที่ดำเนินโครงการต้องไม่ต่ำกว่าวันเริ่มต้นของปีงบประมาณ ${configuredFY} (${minDateThai})`);
          return;
        }
        if (val.start && val.end && val.end < val.start) {
          showAlert.warning(
            'ระยะเวลาดำเนินโครงการไม่ถูกต้อง',
            `วันที่สิ้นสุดดำเนินโครงการ (${val.end}) ต้องไม่ต่ำกว่าวันที่เริ่มต้น (${val.start})`
          );
          setErrorMsg('วันที่สิ้นสุดดำเนินโครงการต้องไม่ต่ำกว่าวันที่เริ่มต้น');
          return;
        }
      } else if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
        const lk = k.toLowerCase();
        if ((lk.includes('start') || lk.includes('begin') || lk.includes('date') || lk.includes('period') || lk.includes('duration')) && val < minFiscalDate) {
          showAlert.warning(
            'ระยะเวลาดำเนินโครงการไม่ถูกต้อง',
            `วันที่ดำเนินโครงการ (${val}) ไม่สามารถตั้งค่าต่ำกว่าวันเริ่มต้นของปีงบประมาณ ${configuredFY} (${minDateThai}) ได้`
          );
          setErrorMsg(`วันที่ดำเนินโครงการต้องไม่ต่ำกว่าวันเริ่มต้นของปีงบประมาณ ${configuredFY} (${minDateThai})`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        title: computedTitle,
        fiscal_year: computedFiscalYear,
        department_id: computedDepartmentId,
        total_budget: computedTotalBudget,
        template_id: proposalTemplate?.id,
        status: status === 'pending' ? 'submitted' : status,
        dynamic_data: JSON.stringify({ ...dynamicData, fiscal_year: String(computedFiscalYear) }),
        // Mock essential relational data to satisfy backend API requirements for now
        background: dynamicData['background'] || '',
        expected_results: dynamicData['expected_results'] || '',
        timelines: [],
        budget_items: formattedBudgetItems,
      };

      const res = await fetch(`/api/v1/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('บันทึกการแก้ไขโครงการสำเร็จ');
        setTimeout(() => {
          router.push('/my-projects');
        }, 1500);
      } else {
        setErrorMsg(data.message);
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'เกิดข้อผิดพลาด');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreview = async () => {
    if (!proposalTemplate) return;
    try {
      const computedFiscalYear = detectProjectFiscalYear(dynamicData, currentFiscalYear || fiscalYear);
      const formattedBudgetItems = budgetItems.map((item) => {
        const q = parseFloat(String(item.quantity)) || 0;
        const p = parseFloat(String(item.unit_price)) || 0;
        return {
          ...item,
          quantity: q,
          unit_price: p,
          total_amount: Math.round(q * p * 100) / 100,
        };
      });
      const budgetItemsSum = formattedBudgetItems.reduce((sum, item) => sum + item.total_amount, 0);
      const computedTotalBudget = budgetItemsSum > 0 ? budgetItemsSum : (Number(dynamicData['total_budget']) || 0);

      // Create a combined form data
      const formData = {
        ...dynamicData,
        title,
        fiscal_year: computedFiscalYear,
        total_budget: computedTotalBudget,
        budget_items: formattedBudgetItems,
      };

      const res = await fetch('/api/v1/documents/export-dynamic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          template_id: proposalTemplate.id,
          formData,
          format: 'docx'
        })
      });
      
      const data = await res.json();
      if (data.success) {
        window.location.href = data.download_url;
      } else {
        showAlert.error('สร้างตัวอย่างไม่สำเร็จ', data.message);
      }
    } catch (e) {
      showAlert.error('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการสร้างตัวอย่าง');
    }
  };

  const renderTagInput = (tag: any) => {
    const key = tag.tag_name;
    const value = dynamicData[key];
    const label = tag.label || tag.tag_name;
    const isEditing = true;

    switch (tag.tag_type) {
      case 'LONGTEXT':
        return (
          <div key={key} className="col-span-1 lg:col-span-2">
            <div className="mb-1">
              <label className="block text-sm font-medium text-gray-700">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
              {tag.description && <p className="text-xs text-gray-500 mt-0.5">{tag.description}</p>}
            </div>
            <textarea
              value={value || ''}
              onChange={(e) => handleDynamicChange(key, e.target.value)}
              rows={4}
              required={tag.is_required}
              className="w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        );
      case 'DEPUTY_DROPDOWN': {
        const dynamicDeputies = (typeof divisionsData !== 'undefined' && divisionsData?.length > 0)
          ? divisionsData.map((div: any) => ({
              id: div.id,
              name: div.deputy_name || `รองผู้อำนวยการ${div.name}`,
              rawName: div.deputy_name || '',
              division: div.name,
              code: div.code,
              position: div.deputy_position || `รองผู้อำนวยการ${div.name}`,
            }))
          : [
              { id: 2, name: deputyResName || 'รองผู้อำนวยการฝ่ายบริหารทรัพยากร', rawName: deputyResName, division: 'ฝ่ายบริหารทรัพยากร', position: deputyResPosition || 'รองผู้อำนวยการฝ่ายบริหารทรัพยากร' },
              { id: 4, name: deputyStratName || 'รองผู้อำนวยการฝ่ายแผนงานและความร่วมมือ', rawName: deputyStratName, division: 'ฝ่ายแผนงานและความร่วมมือ', position: deputyStratPosition || 'รองผู้อำนวยการฝ่ายแผนงานและความร่วมมือ' },
              { id: 3, name: deputyDevName || 'รองผู้อำนวยการฝ่ายพัฒนากิจการนักเรียน นักศึกษา', rawName: deputyDevName, division: 'ฝ่ายพัฒนากิจการนักเรียนฯ', position: deputyDevPosition || 'รองผู้อำนวยการฝ่ายพัฒนากิจการนักเรียนฯ' },
              { id: 1, name: deputyAcadName || 'รองผู้อำนวยการฝ่ายวิชาการ', rawName: deputyAcadName, division: 'ฝ่ายวิชาการ', position: deputyAcadPosition || 'รองผู้อำนวยการฝ่ายวิชาการ' },
            ];
        const deputyList = dynamicDeputies.filter((d: any) => !!d.name);

        return (
          <div key={key} className="col-span-1 lg:col-span-2">
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                รองผู้อำนวยการ ๔ ฝ่าย
              </span>
            </div>
            {tag.description && <p className="text-xs text-gray-500 mb-1">{tag.description}</p>}
            <select
              value={value || ''}
              onChange={(e) => {
                const selectedVal = e.target.value;
                const selected = deputyList.find(d => d.name === selectedVal);
                setDynamicData(prev => {
                  const next: Record<string, any> = { ...prev, [key]: selectedVal };
                  if (selected) {
                    next['approver_position'] = selected.position;
                    next['approver_name_position'] = selected.position;
                    next[`${key}_position`] = selected.position;
                    next['deputy_position'] = selected.position;
                    proposalTemplate?.tags?.forEach((t: any) => {
                      if (
                        t.tag_type === 'APPROVER_POSITION' ||
                        t.tag_type === 'DEPUTY_POSITION' ||
                        t.tag_name === 'approver_position' ||
                        t.tag_name === 'approver_name_position' ||
                        t.tag_name === 'deputy_position' ||
                        t.tag_name === `${key}_position` ||
                        (t.tag_name.includes('approver') && t.tag_name.includes('pos'))
                      ) {
                        next[t.tag_name] = selected.position;
                      }
                    });
                  }
                  return next;
                });
              }}
              disabled={!isEditing}
              required={tag.is_required}
              className="w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">-- เลือกรองผู้อำนวยการประจำฝ่าย --</option>
              {deputyList.map((d, i) => (
                <option key={i} value={d.name}>
                  {d.name} ({d.division})
                </option>
              ))}
            </select>
          </div>
        );
      }
      case 'HEAD_DROPDOWN': {
        const allDepts = (typeof divisionsData !== 'undefined' ? divisionsData : []).reduce((acc: any[], div: any) => [...acc, ...(div.departments || [])], []);
        const headList = allDepts.filter((d: any) => !!d.head_name);

        return (
          <div key={key} className="col-span-1 lg:col-span-2">
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                หัวหน้างาน / หัวหน้าแผนก
              </span>
            </div>
            {tag.description && <p className="text-xs text-gray-500 mb-1">{tag.description}</p>}
            <select
              value={value || ''}
              onChange={(e) => {
                const selectedVal = e.target.value;
                const selected = headList.find((d: any) => d.head_name === selectedVal);
                setDynamicData(prev => {
                  const next: Record<string, any> = { ...prev, [key]: selectedVal };
                  if (selected) {
                    const pos = selected.head_position || `หัวหน้า${selected.name}`;
                    next['head_position'] = pos;
                    next[`${key}_position`] = pos;
                    proposalTemplate?.tags?.forEach((t: any) => {
                      if (
                        t.tag_type === 'HEAD_POSITION' ||
                        t.tag_name === 'head_position' ||
                        t.tag_name === `${key}_position`
                      ) {
                        next[t.tag_name] = pos;
                      }
                    });
                  }
                  return next;
                });
              }}
              disabled={!isEditing}
              required={tag.is_required}
              className="w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">-- เลือกหัวหน้างาน / หัวหน้าแผนก --</option>
              {headList.map((d: any, i: number) => (
                <option key={i} value={d.head_name}>
                  {d.head_name} ({d.name})
                </option>
              ))}
            </select>
          </div>
        );
      }
      case 'APPROVER_DROPDOWN': {
        const dynamicDeputies = (typeof divisionsData !== 'undefined' && divisionsData?.length > 0)
          ? divisionsData.map((div: any) => ({
              id: div.id,
              name: div.deputy_name || `รองผู้อำนวยการ${div.name}`,
              rawName: div.deputy_name || '',
              division: div.name,
              code: div.code,
              position: div.deputy_position || `รองผู้อำนวยการ${div.name}`,
            }))
          : [
              { id: 2, name: deputyResName || 'รองผู้อำนวยการฝ่ายบริหารทรัพยากร', rawName: deputyResName, division: 'ฝ่ายบริหารทรัพยากร', position: deputyResPosition || 'รองผู้อำนวยการฝ่ายบริหารทรัพยากร' },
              { id: 4, name: deputyStratName || 'รองผู้อำนวยการฝ่ายแผนงานและความร่วมมือ', rawName: deputyStratName, division: 'ฝ่ายแผนงานและความร่วมมือ', position: deputyStratPosition || 'รองผู้อำนวยการฝ่ายแผนงานและความร่วมมือ' },
              { id: 3, name: deputyDevName || 'รองผู้อำนวยการฝ่ายพัฒนากิจการนักเรียน นักศึกษา', rawName: deputyDevName, division: 'ฝ่ายพัฒนากิจการนักเรียนฯ', position: deputyDevPosition || 'รองผู้อำนวยการฝ่ายพัฒนากิจการนักเรียนฯ' },
              { id: 1, name: deputyAcadName || 'รองผู้อำนวยการฝ่ายวิชาการ', rawName: deputyAcadName, division: 'ฝ่ายวิชาการ', position: deputyAcadPosition || 'รองผู้อำนวยการฝ่ายวิชาการ' },
            ];
        const deputyList = dynamicDeputies;

        return (
          <div key={key} className="col-span-1 lg:col-span-2">
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
              <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                ผู้เห็นชอบโครงการ (รองฝ่าย)
              </span>
            </div>
            {tag.description && <p className="text-xs text-gray-500 mb-1">{tag.description}</p>}
            <div className="space-y-1.5">
              <select
                value={value || ''}
                onChange={(e) => {
                  const selectedVal = e.target.value;
                  const selectedDeputy = deputyList.find(d => d.name === selectedVal || d.rawName === selectedVal);
                  setDynamicData(prev => {
                    const next: Record<string, any> = { ...prev, [key]: selectedVal };
                    if (selectedDeputy) {
                      next['approver_division_id'] = selectedDeputy.id;
                      next['approver_division_name'] = selectedDeputy.division;
                      next['approver_position'] = selectedDeputy.position;
                      next['approver_name_position'] = selectedDeputy.position;
                      next[`${key}_position`] = selectedDeputy.position;
                      next['deputy_position'] = selectedDeputy.position;
                      proposalTemplate?.tags?.forEach((t: any) => {
                        if (
                          t.tag_type === 'APPROVER_POSITION' ||
                          t.tag_type === 'DEPUTY_POSITION' ||
                          t.tag_name === 'approver_position' ||
                          t.tag_name === 'approver_name_position' ||
                          t.tag_name === 'endorser_position' ||
                          t.tag_name === 'endorser_name_position' ||
                          t.tag_name === 'deputy_position' ||
                          t.tag_name === `${key}_position` ||
                          (t.tag_name.includes('approver') && t.tag_name.includes('pos')) ||
                          (t.tag_name.includes('endorser') && t.tag_name.includes('pos'))
                        ) {
                          next[t.tag_name] = selectedDeputy.position;
                        }
                      });
                    }
                    return next;
                  });
                }}
                disabled={!isEditing}
                className="w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white"
              >
                <option value="">-- เลือกผู้เห็นชอบโครงการ (รองผู้อำนวยการฝ่าย) --</option>
                {deputyList.map((d, i) => (
                  <option key={`dep-${i}`} value={d.rawName || d.name}>
                    {d.rawName ? `${d.rawName} (${d.division})` : `${d.name} (${d.division})`}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={value || ''}
                onChange={(e) => handleDynamicChange(key, e.target.value)}
                placeholder="ชื่อ-นามสกุล ผู้เห็นชอบโครงการ (สามารถพิมพ์หรือแก้ไขได้)..."
                required={tag.is_required}
                disabled={!isEditing}
                className="w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-slate-50/50 focus:bg-white"
              />
            </div>
          </div>
        );
      }
      case 'LEADER_POSITION': {
        const standardBasePositions = [
          { label: 'หัวหน้างาน', prefix: 'หัวหน้า' },
          { label: 'ผู้ช่วยงาน', prefix: 'ผู้ช่วย' },
          { label: 'ครูประจำแผนก / สาขาวิชา', prefix: 'ครูประจำ' },
          { label: 'หัวหน้าแผนกวิชา / หัวหน้าสาขา', prefix: 'หัวหน้า' },
          { label: 'เจ้าหน้าที่', prefix: 'เจ้าหน้าที่' },
        ];

        const allDivisions = typeof divisionsData !== 'undefined' ? divisionsData : [];
        const userDeptName = user?.department?.name || '';

        const buildPositionTitle = (baseRole: string, dept: string) => {
          if (!dept) return baseRole;
          if (!baseRole) return dept;

          if (baseRole === 'หัวหน้างาน') {
            return dept.startsWith('งาน') ? `หัวหน้า${dept}` : `หัวหน้างาน${dept}`;
          }
          if (baseRole === 'ผู้ช่วยงาน') {
            return dept.startsWith('งาน') ? `ผู้ช่วย${dept}` : `ผู้ช่วยงาน${dept}`;
          }
          if (baseRole === 'ครูประจำแผนก / สาขาวิชา' || baseRole === 'ครูประจำแผนก') {
            return dept.startsWith('แผนก') ? `ครูประจำ${dept}` : (dept.startsWith('งาน') ? `ครูประจำ${dept}` : `ครูประจำแผนกวิชา${dept}`);
          }
          if (baseRole === 'หัวหน้าแผนกวิชา / หัวหน้าสาขา' || baseRole === 'หัวหน้าแผนกวิชา') {
            return dept.startsWith('แผนก') ? `หัวหน้า${dept}` : `หัวหน้าแผนกวิชา${dept}`;
          }
          if (baseRole === 'เจ้าหน้าที่') {
            return dept.startsWith('งาน') || dept.startsWith('แผนก') ? `เจ้าหน้าที่${dept}` : `เจ้าหน้าที่งาน${dept}`;
          }
          return `${baseRole}${dept}`;
        };

        return (
          <div key={key} className="col-span-1 lg:col-span-2 bg-indigo-50/30 p-3.5 rounded-lg border border-indigo-100/80">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-1">
              <label className="block text-sm font-semibold text-gray-800">
                {label} {tag.is_required && <span className="text-red-500">*</span>}
              </label>
              <span className="text-[11px] font-medium text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-full border border-indigo-200">
                ตำแหน่งของผู้รับผิดชอบ / ผู้เสนอโครงการ
              </span>
            </div>
            {tag.description && <p className="text-xs text-gray-500 mb-2">{tag.description}</p>}

            <div className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">เลือกตำแหน่งหลัก:</label>
                  <select
                    disabled={!isEditing}
                    onChange={(e) => {
                      const base = e.target.value;
                      if (!base) return;
                      const currentVal = value || '';
                      let currentDept = '';
                      for (const div of allDivisions) {
                        for (const d of div.departments || []) {
                          if (currentVal.includes(d.name)) {
                            currentDept = d.name;
                            break;
                          }
                        }
                        if (currentDept) break;
                      }
                      const deptToUse = currentDept || userDeptName;
                      const formatted = buildPositionTitle(base, deptToUse);
                      handleDynamicChange(key, formatted);
                    }}
                    className="w-full text-xs rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white py-1.5"
                    defaultValue=""
                  >
                    <option value="">-- เลือกตำแหน่งหลักเพื่อรวมข้อความ --</option>
                    {standardBasePositions.map((pos) => (
                      <option key={pos.label} value={pos.label}>{pos.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">ใส่งานในฝ่าย / สาขาวิชา / แผนกวิชา:</label>
                  <select
                    disabled={!isEditing}
                    onChange={(e) => {
                      const selectedDeptName = e.target.value;
                      if (!selectedDeptName) return;
                      const currentVal = value || '';
                      let currentBase = '';
                      if (currentVal.startsWith('หัวหน้า')) currentBase = 'หัวหน้างาน';
                      else if (currentVal.startsWith('ผู้ช่วย')) currentBase = 'ผู้ช่วยงาน';
                      else if (currentVal.startsWith('ครูประจำ')) currentBase = 'ครูประจำแผนก';
                      else if (currentVal.startsWith('เจ้าหน้าที่')) currentBase = 'เจ้าหน้าที่';
                      else currentBase = user?.position || 'ครู';

                      const formatted = buildPositionTitle(currentBase, selectedDeptName);

                      // Find selected department to store ID and auto-sync head info
                      let foundDept: any = null;
                      let foundDiv: any = null;
                      for (const div of allDivisions) {
                        const d = (div.departments || []).find((dept: any) => dept.name === selectedDeptName);
                        if (d) {
                          foundDept = d;
                          foundDiv = div;
                          break;
                        }
                      }

                      setDynamicData(prev => {
                        const next: Record<string, any> = {
                          ...prev,
                          [key]: formatted,
                          leader_department_name: selectedDeptName,
                        };
                        if (foundDept) {
                          next['leader_department_id'] = foundDept.id;
                          if (foundDept.head_name) {
                            next['head_name'] = foundDept.head_name;
                            const headPos = foundDept.head_position || `หัวหน้า${foundDept.name}`;
                            next['head_position'] = headPos;
                            proposalTemplate?.tags?.forEach((t: any) => {
                              if (t.tag_type === 'HEAD_NAME' || t.tag_name === 'head_name') {
                                next[t.tag_name] = foundDept.head_name;
                              }
                              if (t.tag_type === 'HEAD_POSITION' || t.tag_name === 'head_position') {
                                next[t.tag_name] = headPos;
                              }
                            });
                          }
                        }
                        return next;
                      });
                    }}
                    className="w-full text-xs rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white py-1.5"
                    defaultValue=""
                  >
                    <option value="">-- เลือกงานในฝ่าย / สาขาวิชา --</option>
                    {allDivisions.map((div: any) => (
                      <optgroup key={div.id} label={div.name}>
                        {(div.departments || []).map((dept: any) => (
                          <option key={dept.id} value={dept.name}>
                            {dept.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  ข้อความตำแหน่งเต็ม (สามารถพิมพ์ระบุหรือแก้ไขเพิ่มเติมได้เอง):
                </label>
                <div className="relative rounded-md shadow-sm">
                  <input
                    type="text"
                    value={value || ''}
                    onChange={(e) => handleDynamicChange(key, e.target.value)}
                    placeholder="เช่น หัวหน้างานวางแผนและงบประมาณ, ครูประจำแผนกวิชาช่างยนต์, เจ้าหน้าที่งานการเงิน"
                    required={tag.is_required}
                    disabled={!isEditing}
                    className="w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm font-medium text-gray-900 bg-white px-3 py-2"
                  />
                </div>
              </div>
            </div>
          </div>
        );
      }
      case 'APPROVER_POSITION': {
        return (
          <div key={key} className="col-span-1">
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
              <span className="text-[10px] font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                ดึงอัตโนมัติตามรองฝ่าย
              </span>
            </div>
            {tag.description && <p className="text-xs text-gray-500 mb-1">{tag.description}</p>}
            <input
              type="text"
              value={value || ''}
              onChange={(e) => handleDynamicChange(key, e.target.value)}
              required={tag.is_required}
              placeholder="ระบบจะดึงอัตโนมัติตามรองฝ่ายที่เลือก"
              className="w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-purple-50/30 font-medium text-purple-950 focus:bg-white"
            />
          </div>
        );
      }
      case 'PLANNING_HEAD_NAME':
      case 'PLANNING_HEAD_POSITION': {
        return (
          <div key={key} className="col-span-1">
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
              <span className="text-[10px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                ดึงอัตโนมัติ (งานแผน)
              </span>
            </div>
            {tag.description && <p className="text-xs text-gray-500 mb-1">{tag.description}</p>}
            <input
              type="text"
              value={value || ''}
              onChange={(e) => handleDynamicChange(key, e.target.value)}
              required={tag.is_required}
              className="w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-blue-50/20 font-medium text-blue-950 focus:bg-white"
            />
          </div>
        );
      }
      case 'APPROVER_POSITION_DROPDOWN': {
        const standardPositions = [
          'หัวหน้างาน',
          'ผู้ช่วยงาน',
          'ครูประจำแผนก',
          'เจ้าหน้าที่',
        ];

        return (
          <div key={key} className="col-span-1 lg:col-span-2">
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
              <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                ตำแหน่งผู้เห็นชอบ
              </span>
            </div>
            {tag.description && <p className="text-xs text-gray-500 mb-1">{tag.description}</p>}
            <select
              value={value || ''}
              onChange={(e) => handleDynamicChange(key, e.target.value)}
              disabled={!isEditing}
              required={tag.is_required}
              className="w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">-- เลือกตำแหน่งผู้เห็นชอบโครงการ --</option>
              {standardPositions.map((pos, i) => (
                <option key={i} value={pos}>
                  {pos}
                </option>
              ))}
            </select>
          </div>
        );
      }
      case 'LEADER_NAME':
      case 'HEAD_NAME':
      case 'HEAD_POSITION':
      case 'DIRECTOR_NAME':
      case 'DIRECTOR_POSITION':
      case 'COLLEGE_NAME':
      case 'DEPUTY_ACAD_NAME':
      case 'DEPUTY_ACAD_POSITION':
      case 'DEPUTY_RES_NAME':
      case 'DEPUTY_RES_POSITION':
      case 'DEPUTY_DEV_NAME':
      case 'DEPUTY_DEV_POSITION':
      case 'DEPUTY_STRAT_NAME':
      case 'DEPUTY_STRAT_POSITION':
        return (
          <div key={key} className="col-span-1">
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
              <span className="text-[10px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                ดึงอัตโนมัติ
              </span>
            </div>
            {tag.description && <p className="text-xs text-gray-500 mb-1">{tag.description}</p>}
            <input
              type="text"
              value={value || ''}
              onChange={(e) => handleDynamicChange(key, e.target.value)}
              required={tag.is_required}
              className="w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-slate-50/50 focus:bg-white"
            />
          </div>
        );
      case 'DIVISION_DROPDOWN':
        return (
          <div key={key} className="col-span-1 lg:col-span-2">
            <div className="mb-1">
              <label className="block text-sm font-medium text-gray-700">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
              {tag.description && <p className="text-xs text-gray-500 mt-0.5">{tag.description}</p>}
            </div>
            <select
              value={value || ''}
              onChange={(e) => handleDynamicChange(key, e.target.value)}
              disabled={!isEditing}
              required={tag.is_required}
              className="w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">-- เลือกฝ่าย / กลุ่มงาน --</option>
              {(typeof divisionsData !== 'undefined' ? divisionsData : []).map((d: any) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>
        );
      case 'DEPARTMENT_DROPDOWN': {
        const allDepts = (typeof divisionsData !== 'undefined' ? divisionsData : []).reduce((acc: any[], div: any) => [...acc, ...(div.departments || [])], []);
        return (
          <div key={key} className="col-span-1 lg:col-span-2">
            <div className="mb-1">
              <label className="block text-sm font-medium text-gray-700">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
              {tag.description && <p className="text-xs text-gray-500 mt-0.5">{tag.description}</p>}
            </div>
            <select
              value={value || ''}
              onChange={(e) => handleDynamicChange(key, e.target.value)}
              disabled={!isEditing}
              required={tag.is_required}
              className="w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">-- เลือกแผนกวิชา / งาน --</option>
              {allDepts.map((d: any) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>
        );
      }
      case 'ALIGNMENT_CHECKLIST': {
        const valObj = typeof value === 'object' && value !== null ? value : {};
        const rawOptionsList = Array.isArray(tag.options) ? tag.options : [];
        const optionsList = rawOptionsList.map((opt: any, idx: number) => 
          typeof opt === 'string' ? { key: `chk_${idx}`, label: opt, indent: 0 } : { ...opt, key: opt.key || `chk_${idx}`, indent: opt.indent ?? 0 }
        );

        const toggleCheck = (targetIdx: number) => {
          const targetItem = optionsList[targetIdx];
          if (!targetItem) return;

          const isNowChecked = !valObj[targetItem.key];
          const newValObj = { ...valObj, [targetItem.key]: isNowChecked };

          if (isNowChecked) {
            // Traverse upwards to check all ancestor parents
            let currentIndent = targetItem.indent;
            for (let i = targetIdx - 1; i >= 0; i--) {
              const prevItem = optionsList[i];
              if (prevItem.indent < currentIndent) {
                newValObj[prevItem.key] = true;
                currentIndent = prevItem.indent;
                if (currentIndent === 0) break;
              }
            }
          } else {
            // If parent unchecked, uncheck all its descendant children
            const parentIndent = targetItem.indent;
            for (let i = targetIdx + 1; i < optionsList.length; i++) {
              const nextItem = optionsList[i];
              if (nextItem.indent > parentIndent) {
                newValObj[nextItem.key] = false;
              } else {
                break;
              }
            }
          }

          handleDynamicChange(key, newValObj);
        };

        const CheckItem = ({ itemIdx, k, label, indent }: { itemIdx: number; k: string; label: string; indent: number }) => {
          let marginClass = "";
          if (indent === 1) marginClass = "ml-6";
          if (indent === 2) marginClass = "ml-12";
          return (
            <div className={`flex items-start space-x-2 ${marginClass}`}>
              <input type="checkbox" checked={valObj[k] || false} onChange={() => toggleCheck(itemIdx)} disabled={!isEditing} className="mt-1 w-4 h-4 text-indigo-600 border border-gray-300 rounded focus:ring-indigo-500 disabled:bg-gray-100" />
              <label className="text-sm text-gray-700 leading-snug cursor-pointer" onClick={() => { if(isEditing) toggleCheck(itemIdx); }}>{label}</label>
            </div>
          );
        };

        return (
          <div key={key} className="col-span-1 lg:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-900">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
              {tag.description && <p className="text-xs text-gray-500 mt-0.5">{tag.description}</p>}
            </div>
            <div className="space-y-2">
              {optionsList.length > 0 ? optionsList.map((item: any, idx: number) => {
                return <CheckItem key={idx} itemIdx={idx} k={item.key} label={item.label} indent={item.indent} />;
              }) : (
                <div className="text-sm text-gray-500 italic">ไม่มีหัวข้อประเมิน (กรุณาเพิ่มในหน้าจัดการแม่แบบ)</div>
              )}
            </div>
            <div className="mt-4 p-3 bg-blue-50 text-blue-800 text-xs rounded border border-blue-100">
              <strong>💡 วิธีใช้ในเอกสาร Word:</strong> ครอบส่วนที่เป็นกลุ่มนี้ด้วย <code>&#123;#{tag.tag_name}&#125;</code>...<code>&#123;/{tag.tag_name}&#125;</code> จากนั้นใช้ตัวแปร เช่น <code>&#123;q_voc_chk&#125;</code> (นำชื่อตัวแปรที่ตั้งไว้มาต่อท้ายด้วย _chk) เพื่อแสดงเครื่องหมาย ☑ หรือ ☐ อัตโนมัติ
            </div>
          </div>
        );
      }
      case 'TIMELINE': {
        const defaultSteps = [
          "1. เสนอโครงการ (PLAN)",
          "2. ดำเนินการตามโครงการ (DO)",
          "3. การประเมินผลการดำเนินงานโครงการ/การติดตามผล/สรุปผล (CHECK)",
          "4. รายงานผล (Act)"
        ];
        const months = ["ต.ค.", "พ.ย.", "ธ.ค.", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย."];
        const timelineData = Array.isArray(value) && value.length > 0 ? value : defaultSteps.map(s => ({ step_name: s, m1: "", m1_check: "", m1_bullet: "", m2: "", m2_check: "", m2_bullet: "", m3: "", m3_check: "", m3_bullet: "", m4: "", m4_check: "", m4_bullet: "", m5: "", m5_check: "", m5_bullet: "", m6: "", m6_check: "", m6_bullet: "", m7: "", m7_check: "", m7_bullet: "", m8: "", m8_check: "", m8_bullet: "", m9: "", m9_check: "", m9_bullet: "", m10: "", m10_check: "", m10_bullet: "", m11: "", m11_check: "", m11_bullet: "", m12: "", m12_check: "", m12_bullet: "" }));

        return (
          <div key={key} className="col-span-1 lg:col-span-2 overflow-hidden">
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
              {tag.description && <p className="text-xs text-gray-500 mt-0.5">{tag.description}</p>}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border border-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 border-r w-1/3">ขั้นตอนการดำเนินงาน</th>
                    {months.map((m, i) => (
                      <th key={i} className="px-1 py-2 text-center font-medium text-gray-500 border-r min-w-[30px]">{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {timelineData.map((row, rIndex) => (
                    <tr key={rIndex}>
                      <td className="px-3 py-2 border-r whitespace-normal">{row.step_name}</td>
                      {Array.from({ length: 12 }).map((_, cIndex) => {
                        const mKey = 'm' + (cIndex + 1);
                        return (
                          <td key={cIndex} className="px-1 py-2 border-r text-center">
                            <input
                              type="checkbox"
                              checked={row[mKey] === "/"}
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                const newData = [...timelineData];
                                const row = { ...newData[rIndex] };
                                
                                if (isChecked) {
                                  let minIdx = cIndex;
                                  let maxIdx = cIndex;
                                  for (let i = 0; i < 12; i++) {
                                    if (row['m' + (i + 1)] === '/') {
                                      if (i < minIdx) minIdx = i;
                                      if (i > maxIdx) maxIdx = i;
                                    }
                                  }
                                  for (let i = minIdx; i <= maxIdx; i++) {
                                    const k = 'm' + (i + 1);
                                    row[k] = "/";
                                    row[k+"_check"] = "\u2713";
                                    row[k+"_bullet"] = "\u25CF";
                                  }
                                } else {
                                  row[mKey] = "";
                                  row[mKey+"_check"] = "";
                                  row[mKey+"_bullet"] = "";
                                }
                                
                                newData[rIndex] = row;
                                handleDynamicChange(key, newData);
                              }}
                              disabled={!isEditing}
                              className="w-4 h-4 text-indigo-600 border border-gray-300 rounded focus:ring-indigo-500 disabled:bg-gray-100"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-1 text-xs text-gray-400">คำแนะนำการใช้ตัวแปร: ให้ครอบตารางด้วย &#123;#{tag.tag_name}&#125; ... &#123;/{tag.tag_name}&#125; และใช้ตัวแปร &#123;step_name&#125; และ &#123;m1&#125; ถึง &#123;m12&#125; ในช่องต่างๆ</p>
          </div>
        );
      }
      case 'DATERANGE': {
        const targetFiscalYear = parseInt(currentFiscalYear || String(fiscalYear)) || (new Date().getFullYear() + 543);
        const { minDate: minFiscalDate, maxDate: maxFiscalDate, minDateThai, maxDateThai } = getThaiFiscalYearDateRange(targetFiscalYear);

        return (
          <div key={key}>
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
                {tag.description && <p className="text-xs text-gray-500 mt-0.5">{tag.description}</p>}
              </div>

              {isEditing && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleDynamicChange(key, { start: minFiscalDate, end: maxFiscalDate })}
                    className="px-2 py-0.5 text-[11px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-md font-medium transition"
                  >
                    ⚡ ตลอดปีงบประมาณ ({minDateThai} - {maxDateThai})
                  </button>
                  {(value?.start || value?.end) && (
                    <button
                      type="button"
                      onClick={() => handleDynamicChange(key, { start: '', end: '' })}
                      className="px-2 py-0.5 text-[11px] bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200 rounded-md font-medium transition"
                    >
                      ล้าง
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="mb-2">
              <span className="text-[11px] text-amber-800 bg-amber-50/90 px-2.5 py-1 rounded-md border border-amber-200/80 font-medium inline-flex items-center gap-1.5 shadow-2xs">
                <span>📅</span>
                <span>กรอบระยะเวลาปีงบประมาณ <strong>{targetFiscalYear}</strong>: <strong>{minDateThai} — {maxDateThai}</strong> (ระบบจำกัดไม่ให้เลือกวันที่ต่ำกว่า <strong>{minDateThai}</strong>)</span>
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="date"
                min={minFiscalDate}
                value={value?.start || ''}
                onChange={(e) => {
                  const newStart = e.target.value;
                  const safeStart = newStart && newStart < minFiscalDate ? minFiscalDate : newStart;
                  const newEnd = value?.end && safeStart && value.end < safeStart ? safeStart : value?.end;
                  handleDynamicChange(key, { ...(value || {}), start: safeStart, end: newEnd });
                }}
                disabled={!isEditing}
                required={tag.is_required}
                className="w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <span className="text-gray-500 text-sm font-medium">ถึง</span>
              <input
                type="date"
                min={value?.start || minFiscalDate}
                value={value?.end || ''}
                onChange={(e) => {
                  const newEnd = e.target.value;
                  const minRequired = value?.start || minFiscalDate;
                  const safeEnd = newEnd && minRequired && newEnd < minRequired ? minRequired : newEnd;
                  handleDynamicChange(key, { ...(value || {}), end: safeEnd });
                }}
                disabled={!isEditing}
                required={tag.is_required}
                className="w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        );
      }
      case 'DATE': {
        const targetFiscalYear = parseInt(currentFiscalYear || String(fiscalYear)) || (new Date().getFullYear() + 543);
        const { minDate: minFiscalDate, maxDate: maxFiscalDate, minDateThai, maxDateThai } = getThaiFiscalYearDateRange(targetFiscalYear);

        return (
          <div key={key}>
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
                {tag.description && <p className="text-xs text-gray-500 mt-0.5">{tag.description}</p>}
              </div>

              {isEditing && (
                <button
                  type="button"
                  onClick={() => handleDynamicChange(key, minFiscalDate)}
                  className="px-2 py-0.5 text-[11px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-md font-medium transition"
                >
                  ⚡ วันเริ่มต้นปีงบประมาณ ({minDateThai})
                </button>
              )}
            </div>

            <div className="mb-2">
              <span className="text-[11px] text-amber-800 bg-amber-50/90 px-2.5 py-1 rounded-md border border-amber-200/80 font-medium inline-flex items-center gap-1.5 shadow-2xs">
                <span>📅</span>
                <span>กรอบระยะเวลาปีงบประมาณ <strong>{targetFiscalYear}</strong>: <strong>{minDateThai} — {maxDateThai}</strong> (ระบบจำกัดไม่ให้เลือกวันที่ต่ำกว่า <strong>{minDateThai}</strong>)</span>
              </span>
            </div>

            <input
              type="date"
              min={minFiscalDate}
              value={value || ''}
              onChange={(e) => {
                const newDate = e.target.value;
                const safeDate = newDate && newDate < minFiscalDate ? minFiscalDate : newDate;
                handleDynamicChange(key, safeDate);
              }}
              required={tag.is_required}
              className="w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        );
      }
      case 'DROPDOWN':
        const options = Array.isArray(tag.options) ? tag.options : [];
        return (
          <div key={key}>
            <div className="mb-1">
              <label className="block text-sm font-medium text-gray-700">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
              {tag.description && <p className="text-xs text-gray-500 mt-0.5">{tag.description}</p>}
            </div>
            <select
              value={value || ''}
              onChange={(e) => handleDynamicChange(key, e.target.value)}
              required={tag.is_required}
              className="w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">-- กรุณาเลือก --</option>
              {options.map((opt: any, i: number) => (
                <option key={i} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        );
      case 'BOOLEAN':
        return (
          <div key={key} className="flex items-center pt-6">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={value || false}
                onChange={(e) => handleDynamicChange(key, e.target.checked)}
                className="w-5 h-5 rounded border border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                  {tag.description && <span className="text-xs text-gray-500 font-normal mt-0.5">{tag.description}</span>}
                </div>
            </label>
          </div>
        );
      case 'TABLE_LOOP':
        return (
          <div key={key} className="col-span-2 border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium text-gray-700">{label}</label>
              <button
                type="button"
                onClick={() => {
                  const arr = Array.isArray(value) ? [...value] : [];
                  const maxItems = (tag.options && !Array.isArray(tag.options) && typeof tag.options === 'object') ? tag.options.maxItems : null;
                  if (maxItems && arr.length >= maxItems) {
                    showAlert.warning('จำกัดจำนวนรายการ', `เพิ่มได้สูงสุด ${maxItems} รายการเท่านั้นครับ`);
                    return;
                  }
                  arr.push({});
                  handleDynamicChange(key, arr);
                }}
                className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded flex items-center hover:bg-indigo-200"
              >
                <Plus className="w-3 h-3 mr-1" /> เพิ่มรายการ
              </button>
            </div>
            {Array.isArray(value) && value.map((item: any, i: number) => (
              <div key={i} className="flex gap-2 items-center mb-2 bg-white p-2 rounded border">
                <span className="text-xs text-gray-400 font-medium w-4">{i+1}</span>
                <input
                  type="text"
                  placeholder="รายละเอียด..."
                  value={item.description || ''}
                  onChange={(e) => {
                     const arr = [...value];
                     arr[i] = { ...arr[i], description: e.target.value };
                     handleDynamicChange(key, arr);
                  }}
                  className="flex-1 text-sm border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => {
                     const arr = [...value];
                     arr.splice(i, 1);
                     handleDynamicChange(key, arr);
                  }}
                  className="text-red-500 hover:bg-red-50 p-1 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        );
      case 'IMAGE':
        return (
          <div key={key}>
            <div className="mb-1">
              <label className="block text-sm font-medium text-gray-700">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
              {tag.description && <p className="text-xs text-gray-500 mt-0.5">{tag.description}</p>}
            </div>
            <div className="flex gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      handleDynamicChange(key, (reader.result as string).split(',')[1]); // Store base64 data
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="w-full text-sm"
              />
              <input 
                type="number" 
                placeholder="กว้าง" 
                onChange={(e) => {
                   // Ensure size tag exists for WxH (e.g. tag_name_size = [W, H])
                   const sizeKey = key + '_size';
                   const currentSize = dynamicData[sizeKey] || [150, 150];
                   handleDynamicChange(sizeKey, [parseInt(e.target.value) || 150, currentSize[1]]);
                }}
                className="w-20 text-sm border border-gray-300 rounded" 
                title="ความกว้าง (px)"
              />
              <input 
                type="number" 
                placeholder="สูง" 
                onChange={(e) => {
                   const sizeKey = key + '_size';
                   const currentSize = dynamicData[sizeKey] || [150, 150];
                   handleDynamicChange(sizeKey, [currentSize[0], parseInt(e.target.value) || 150]);
                }}
                className="w-20 text-sm border border-gray-300 rounded"
                title="ความสูง (px)" 
              />
            </div>
          </div>
        );
      default: // TEXT or CALCULATION
        return (
          <div key={key}>
            <div className="mb-1">
              <label className="block text-sm font-medium text-gray-700">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
              {tag.description && <p className="text-xs text-gray-500 mt-0.5">{tag.description}</p>}
            </div>
            <input
              type={tag.tag_type === 'CALCULATION' ? 'number' : 'text'}
              value={value || ''}
              onChange={(e) => handleDynamicChange(key, e.target.value)}
              required={tag.is_required}
              className="w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        );
    }
  };

  if (isLoadingProject) return <div className="text-center py-20">กำลังโหลดข้อมูล...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2.5 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl text-gray-700 shadow-sm transition active:scale-95"
            title="ย้อนกลับ"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">แก้ไขร่างโครงการ</h1>
            <p className="text-gray-500 mt-0.5 text-sm">แก้ไขข้อมูลร่างโครงการของคุณ</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={handlePreview}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-md hover:bg-gray-50 transition-colors"
          >
            <Eye className="w-4 h-4 mr-2" />
            ดูตัวอย่างจำลอง
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 text-red-700 rounded-md flex items-start">
          <AlertCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-green-50 text-green-700 rounded-md flex items-start">
          <FileText className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Submission Closed or Window Alert */}
      {!isSubmissionOpen ? (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl flex items-start gap-3 shadow-sm">
          <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm space-y-0.5">
            <p className="font-bold">ระบบปิดรับข้อเสนอโครงการชั่วคราว</p>
            <p className="text-amber-700">ผู้ดูแลระบบได้ปิดการรับคำขอเสนอโครงการใหม่ชั่วคราว คุณยังสามารถบันทึกแบบร่างไว้ได้ แต่ยังไม่สามารถส่งขออนุมัติได้</p>
          </div>
        </div>
      ) : submissionEndDate && (
        <div className="p-3 bg-blue-50 border border-blue-100 text-blue-900 rounded-xl flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span>กำหนดเปิดรับข้อเสนอโครงการถึงวันที่: <strong className="font-semibold text-blue-950">{submissionEndDate}</strong> (ปีงบประมาณ {currentFiscalYear})</span>
          </div>
        </div>
      )}

      <form className="space-y-6">
        {/* Dynamic Form from Tags */}
        <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h2 className="text-lg font-medium text-gray-900">ข้อมูลตามแม่แบบ (Dynamic Form)</h2>
            {proposalTemplate && (
              <span className="text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                {proposalTemplate.name}
              </span>
            )}
          </div>
          
          {!proposalTemplate ? (
            <div className="text-center py-12 text-gray-500">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-300" />
              กำลังโหลดแม่แบบเอกสาร...
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {proposalTemplate.tags && proposalTemplate.tags.filter((t: any) => !(t.options && typeof t.options === 'object' && !Array.isArray(t.options) && t.options.is_hidden)).map((tag: any) => (
                <div key={tag.tag_name} id={`field-${tag.tag_name}`}>
                  {renderTagInput(tag)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Budget Items UI */}
        <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4 border-b pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">รายละเอียดค่าใช้จ่ายและงบประมาณ</h2>
                <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                  {budgetItems.length} รายการ
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">ระบุหมวดหมู่ รายการ จำนวน หน่วยนับ และราคาต่อหน่วย (ระบบคำนวณและสรุปยอดรวมให้อัตโนมัติ)</p>
            </div>
            <button
              type="button"
              onClick={addBudgetItem}
              className="text-xs bg-theme-primary hover:bg-theme-primary-hover text-white px-3.5 py-2 rounded-theme flex items-center gap-1.5 font-bold shadow-xs transition active:scale-95"
            >
              <Plus className="w-4 h-4" /> เพิ่มรายการค่าใช้จ่าย
            </button>
          </div>

          <datalist id="common-units-edit">
            <option value="ชิ้น" />
            <option value="คน" />
            <option value="วัน" />
            <option value="ชุด" />
            <option value="เล่ม" />
            <option value="มื้อ" />
            <option value="กล่อง" />
            <option value="แพ็ค" />
            <option value="แผ่น" />
            <option value="หน่วย" />
            <option value="งวด" />
            <option value="โครงการ" />
            <option value="ครั้ง" />
            <option value="เดือน" />
            <option value="ปี" />
          </datalist>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm text-left text-gray-600">
              <thead className="text-xs text-slate-700 font-bold uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3 w-40">หมวดหมู่</th>
                  <th className="px-3 py-3 min-w-[200px]">รายการค่าใช้จ่าย</th>
                  <th className="px-3 py-3 w-28 text-center">จำนวน</th>
                  <th className="px-3 py-3 w-28">หน่วยนับ</th>
                  <th className="px-3 py-3 w-36 text-right">ราคา/หน่วย (บาท)</th>
                  <th className="px-3 py-3 w-36 text-right">รวมเป็นเงิน (บาท)</th>
                  <th className="px-3 py-3 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {budgetItems.map((item, index) => (
                  <tr key={index} className="bg-white hover:bg-slate-50/70 transition-colors">
                    <td className="px-2.5 py-2">
                      <select 
                        value={item.category_id} 
                        onChange={(e) => updateBudgetItem(index, 'category_id', parseInt(e.target.value))}
                        className="w-full text-xs font-medium border-slate-300 rounded-md focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 py-1.5 bg-white"
                      >
                        <option value={1}>ค่าตอบแทน</option>
                        <option value={2}>ค่าใช้สอย</option>
                        <option value={3}>ค่าวัสดุ</option>
                      </select>
                    </td>
                    <td className="px-2.5 py-2">
                      <input 
                        type="text" 
                        value={item.description} 
                        onChange={(e) => updateBudgetItem(index, 'description', e.target.value)}
                        placeholder="ระบุรายละเอียด เช่น ค่าวิทยากร, ค่าอาหารกลางวัน, ค่ากระดาษ A4"
                        className="w-full text-xs sm:text-sm border-slate-300 rounded-md focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 px-2.5 py-1.5"
                      />
                    </td>
                    <td className="px-2.5 py-2">
                      <input 
                        type="text"
                        inputMode="decimal"
                        value={item.quantity} 
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => updateBudgetItem(index, 'quantity', e.target.value)}
                        onBlur={() => handleBudgetItemBlur(index, 'quantity')}
                        placeholder="1"
                        className="w-full text-xs sm:text-sm font-mono border-slate-300 rounded-md focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-center py-1.5"
                      />
                    </td>
                    <td className="px-2.5 py-2">
                      <input 
                        type="text" 
                        list="common-units-edit"
                        value={item.unit} 
                        onChange={(e) => updateBudgetItem(index, 'unit', e.target.value)}
                        placeholder="หน่วย"
                        className="w-full text-xs sm:text-sm border-slate-300 rounded-md focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 px-2.5 py-1.5"
                      />
                    </td>
                    <td className="px-2.5 py-2">
                      <div className="relative rounded-md shadow-2xs">
                        <input 
                          type="text" 
                          inputMode="decimal"
                          value={item.unit_price} 
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => updateBudgetItem(index, 'unit_price', e.target.value)}
                          onBlur={() => handleBudgetItemBlur(index, 'unit_price')}
                          placeholder="0.00"
                          className="w-full text-xs sm:text-sm font-mono font-medium border-slate-300 rounded-md focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-right pr-2 py-1.5 text-slate-900 bg-white"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-slate-800 text-xs sm:text-sm">
                      {(Number(item.total_amount) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button 
                        type="button" 
                        onClick={() => removeBudgetItem(index)}
                        title="ลบรายการนี้"
                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {budgetItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400 bg-slate-50/50">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Calculator className="w-8 h-8 text-slate-300 stroke-1" />
                        <p className="text-sm font-medium text-slate-600">ยังไม่มีรายการค่าใช้จ่าย</p>
                        <p className="text-xs text-slate-400">คลิกปุ่มด้านล่างหรือมุมขวาบนเพื่อเริ่มต้นเพิ่มรายการ</p>
                        <button
                          type="button"
                          onClick={addBudgetItem}
                          className="mt-2 text-xs bg-white hover:bg-slate-100 text-indigo-600 border border-indigo-200 px-3.5 py-1.5 rounded-theme font-bold transition flex items-center gap-1 shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" /> เพิ่มรายการแรก
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
              {budgetItems.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-50/90 font-bold border-t border-slate-200">
                    <td colSpan={5} className="px-4 py-3 text-right text-slate-700">
                      <div className="text-sm">ยอดรวมงบประมาณทั้งสิ้น:</div>
                      <div className="text-xs font-normal text-slate-500 mt-0.5">
                        ({formatThaiBaht(budgetItems.reduce((sum, item) => sum + (Number(item.total_amount) || 0), 0))})
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right text-indigo-700 text-base font-mono font-bold">
                      {budgetItems.reduce((sum, item) => sum + (Number(item.total_amount) || 0), 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={(e) => handleSubmit(e, 'draft')}
            disabled={isSubmitting}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2" />
            บันทึกแบบร่าง
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, 'pending')}
            disabled={isSubmitting}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4 mr-2" />
            เสนอโครงการ
          </button>
        </div>
      </form>
    </div>
  );
}
