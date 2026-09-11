'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { showAlert } from '@/lib/sweetalert';
import { useSettings } from '@/lib/settings-context';
import ModalPortal from '@/components/ui/ModalPortal';
import {
  Save,
  Eye,
  FileText,
  AlertCircle,
  RefreshCw,
  Plus,
  Trash2,
  Download,
  ArrowLeft,
  UploadCloud,
  Paperclip,
  Image as ImageIcon,
  Check,
  X
} from 'lucide-react';
import Link from 'next/link';

export default function ProjectSummaryPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
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
  } = useSettings();
  const projectId = params.id as string;
  const templateId = searchParams.get('templateId');

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Project context data
  const [project, setProject] = useState<any>(null);

  // Template data
  const [template, setTemplate] = useState<any>(null);

  // Dynamic tags
  const [dynamicData, setDynamicData] = useState<Record<string, any>>({});
  const [divisionsData, setDivisionsData] = useState<any[]>([]);
  const [selectingImageTag, setSelectingImageTag] = useState<string | null>(null);

  const imageDocuments = useMemo(() => {
    if (!Array.isArray(project?.documents)) return [];
    return project.documents.filter((doc: any) => {
      const ext = (doc.file_type || '').toLowerCase();
      return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) || (doc.file_name && /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.file_name));
    });
  }, [project?.documents]);

  useEffect(() => {
    if (projectId && templateId && token) {
      fetchData();
    }
  }, [projectId, templateId, token, planningHeadName]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Project
      const resProj = await fetch(`/api/v1/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dataProj = await resProj.json();
      if (!dataProj.success) throw new Error('ไม่พบข้อมูลโครงการ');
      
      const proj = dataProj.data;
      setProject(proj);

      // Fetch Template
      const resTpl = await fetch(`/api/v1/admin/templates/${templateId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dataTpl = await resTpl.json();
      if (!dataTpl.success) throw new Error('ไม่พบแบบฟอร์มสรุป');
      
      const tpl = dataTpl.data;
      setTemplate(tpl);

      // Fetch Divisions
      let fetchedDivs: any[] = [];
      try {
        const resDiv = await fetch('/api/v1/divisions', { headers: { Authorization: `Bearer ${token}` } });
        const dataDiv = await resDiv.json();
        if (dataDiv.success && Array.isArray(dataDiv.data)) {
          fetchedDivs = dataDiv.data;
          setDivisionsData(dataDiv.data);
        }
      } catch (e) {
        console.error(e);
      }

      // Initialize dynamic data recursively from project and project summary
      const initial: Record<string, any> = {};
      let projDynamic: any = proj.dynamic_data || {};
      while (typeof projDynamic === 'string') {
        try {
          projDynamic = JSON.parse(projDynamic);
        } catch {
          break;
        }
      }
      if (typeof projDynamic !== 'object' || projDynamic === null) {
        projDynamic = {};
      }

      const normalizeKey = (k: string) => (k || '').toLowerCase().replace(/[%_\-\s]/g, '');

      // Find current division of the project's department
      const allDivs = fetchedDivs.length > 0 ? fetchedDivs : divisionsData;
      const currentDiv = allDivs.find((div: any) =>
        (div.departments || []).some((d: any) => d.id === (proj.department_id || proj.department?.id)) ||
        (proj.department?.division_id && div.id === proj.department.division_id) ||
        (proj.department?.division?.name && div.name === proj.department.division.name) ||
        (proj.department?.division?.code && div.code === proj.department.division.code)
      );

      const resolveTagValue = (t: any) => {
        const key = t.tag_name || '';
        const rawLabel = t.label || '';
        const norm = normalizeKey(key);
        const normLabel = normalizeKey(rawLabel);
        const clean = key.replace(/[%]/g, '').trim();

        // 1. Direct match from dynamic_data
        if (projDynamic[key] !== undefined && projDynamic[key] !== '' && projDynamic[key] !== null) return projDynamic[key];
        if (projDynamic[clean] !== undefined && projDynamic[clean] !== '' && projDynamic[clean] !== null) return projDynamic[clean];

        // 2. Activity Images (activity_image_1..4, image1..4, photo1..4, pic1..4, etc.)
        if (norm.includes('activityimage1') || norm.includes('image1') || norm.includes('photo1') || norm.includes('img1') || norm.includes('pic1')) {
          return projDynamic.activity_image_1 || projDynamic.image_1 || projDynamic.photo_1 || '';
        }
        if (norm.includes('activityimage2') || norm.includes('image2') || norm.includes('photo2') || norm.includes('img2') || norm.includes('pic2')) {
          return projDynamic.activity_image_2 || projDynamic.image_2 || projDynamic.photo_2 || '';
        }
        if (norm.includes('activityimage3') || norm.includes('image3') || norm.includes('photo3') || norm.includes('img3') || norm.includes('pic3')) {
          return projDynamic.activity_image_3 || projDynamic.image_3 || projDynamic.photo_3 || '';
        }
        if (norm.includes('activityimage4') || norm.includes('image4') || norm.includes('photo4') || norm.includes('img4') || norm.includes('pic4')) {
          return projDynamic.activity_image_4 || projDynamic.image_4 || projDynamic.photo_4 || '';
        }

        // 3. Core project title & code & fiscal year
        if (key === 'title' || key === 'project_name' || norm === 'title' || norm === 'projectname' || norm === 'projecttitle' || norm === 'name') {
          return proj.title || '';
        }
        if (key === 'fiscal_year' || norm === 'fiscalyear' || norm === 'year' || norm === 'budgetyear') {
          return proj.fiscal_year || new Date().getFullYear() + 543;
        }
        if (key === 'project_code' || norm === 'projectcode' || norm === 'code' || norm === 'projcode') {
          return proj.project_code || '';
        }

        // 4. Department & Division
        if (norm === 'division' || norm === 'divisionname' || norm === 'divname' || norm === 'departmentdivision') {
          return proj.department?.division?.name || currentDiv?.name || '';
        }
        if (key === 'department' || norm === 'department' || norm === 'departmentname' || norm === 'dept' || norm === 'deptname') {
          return proj.department?.name || '';
        }

        // 5. Budgets (Total, Spent, Remaining, Items)
        if (norm === 'budget' || norm === 'totalbudget' || norm === 'approvedbudget' || norm === 'totalamount') {
          return proj.total_budget || 0;
        }
        if (norm.includes('actualspent') || norm.includes('actualexpense') || norm.includes('spentamount') || norm.includes('totalspent') || norm.includes('spentbudget') || norm.includes('disbursement') || norm.includes('disbursedamount')) {
          return proj.actual_spent || projDynamic.actual_spent || projDynamic.actual_expense || proj.total_budget || 0;
        }
        if (norm.includes('remaining') || norm.includes('balance') || norm.includes('budgetbalance') || norm.includes('leftbudget')) {
          const total = Number(proj.total_budget || 0);
          const spent = Number(proj.actual_spent || projDynamic.actual_spent || projDynamic.actual_expense || 0);
          return Math.max(0, total - spent);
        }
        if (norm.includes('budgetitem') || norm.includes('expenses') || norm.includes('budgetdetail')) {
          if (t.tag_type === 'TABLE_LOOP') {
            if (Array.isArray(proj.budget_items) && proj.budget_items.length > 0) {
              return proj.budget_items.map((b: any) => ({
                description: b.name || b.description || b.category?.name || '',
                category: b.category?.name || b.name || '',
                amount: Number(b.amount || 0).toLocaleString(),
                total: Number(b.amount || 0).toLocaleString(),
              }));
            }
            return [{}];
          }
          if (Array.isArray(proj.budget_items) && proj.budget_items.length > 0) {
            return proj.budget_items.map((b: any, idx: number) => `${idx + 1}. ${b.name || b.category?.name || 'ค่าใช้จ่าย'}: ${Number(b.amount || 0).toLocaleString()} บาท`).join('\n');
          }
        }

        // 6. Operation / execution status & achievements
        if (norm.includes('operationstatus') || norm.includes('executionstatus') || norm.includes('projectstatus') || norm.includes('progressstatus')) {
          return projDynamic.operation_status || 'ดำเนินงานแล้วเสร็จ 100%';
        }
        if (norm.includes('keyachievement') || norm.includes('keyresult') || norm.includes('achievement') || norm.includes('successrate') || norm.includes('highlight')) {
          return projDynamic.key_achievements || projDynamic.key_results || '';
        }

        // 7. Summary 4 columns (ตารางสรุปผล ๔ ช่อง)
        if (norm.includes('activitiessummary') || norm.includes('activitysummary') || norm === 'activities' || norm.includes('activitydesc') || norm.includes('operationactivities') || norm.includes('implementationsummary')) {
          return projDynamic.activities_summary || projDynamic.activity_summary || '';
        }
        if (norm.includes('actualresult') || norm.includes('resultssummary') || norm === 'results' || norm === 'actualoutcome' || norm.includes('benefit') || norm.includes('accomplishment')) {
          return projDynamic.actual_results || projDynamic.results_summary || proj.expected_results || proj.expected_outcome || '';
        }
        if (norm.includes('problem') || norm.includes('obstacle') || norm.includes('problemsobstacles') || norm.includes('issue')) {
          return projDynamic.problems_obstacles || projDynamic.problems_obstacles_text || projDynamic.obstacles_and_solutions || '';
        }
        if (norm.includes('projectsuggestion') || norm.includes('suggestion') || norm.includes('summarynote') || norm.includes('recommendation') || norm.includes('solution') || norm.includes('note')) {
          return projDynamic.project_suggestions || projDynamic.summary_notes || '';
        }

        // 8. Vocational Standards & Strategic Alignments
        if (norm.includes('standard') || norm.includes('vocationalstandard') || norm.includes('curriculumstandard')) {
          return projDynamic.vocational_standards || projDynamic.standards || proj.standard || 'มาตรฐานที่ ๑ คุณลักษณะของผู้สำเร็จการศึกษาอาชีวศึกษาที่พึงประสงค์';
        }
        if (norm.includes('strategy') || norm.includes('strategic') || norm.includes('alignment')) {
          if (Array.isArray(proj.alignments) && proj.alignments.length > 0) {
            return proj.alignments.map((a: any) => a.indicator?.description || a.indicator?.plan?.title || '').filter(Boolean).join(', ');
          }
          return projDynamic.strategic_indicators || projDynamic.strategy || '';
        }

        // 9. Objectives (TABLE_LOOP or text)
        if (norm.includes('objective') || norm.includes('purpose') || norm.includes('goal')) {
          if (t.tag_type === 'TABLE_LOOP') {
            if (Array.isArray(projDynamic.objectives) && projDynamic.objectives.length > 0) return projDynamic.objectives;
            if (Array.isArray(proj.objectives) && proj.objectives.length > 0) {
              return proj.objectives.map((o: any) => typeof o === 'string' ? { description: o } : { description: o.name || o.description || '' });
            }
            return [{}];
          }
          if (Array.isArray(proj.objectives)) {
            return proj.objectives.map((o: any) => typeof o === 'string' ? o : (o.name || o.description || '')).filter(Boolean).join('\n');
          }
          return proj.objectives || projDynamic.objectives || '';
        }

        // 10. Targets / Target Groups
        if (norm.includes('target') || norm.includes('targetgroup')) {
          if (Array.isArray(proj.target_groups) && proj.target_groups.length > 0) {
            return proj.target_groups.map((tg: any) => typeof tg === 'string' ? tg : (tg.name || tg.description || `${tg.group || ''} ${tg.amount || ''} ${tg.unit || ''}`.trim())).filter(Boolean).join('\n');
          }
          return proj.target_group || proj.target || projDynamic.target_group || projDynamic.target || '';
        }

        // 11. Indicators & KPIs
        if (norm.includes('indicator') || norm.includes('kpi')) {
          return proj.indicators || proj.indicator || projDynamic.indicators || '';
        }

        // 12. Principles / Rationale / Background
        if (norm.includes('rationale') || norm.includes('principle') || norm.includes('background') || norm.includes('origin') || norm.includes('justification')) {
          return proj.background || proj.rationale || proj.principles || projDynamic.rationale || projDynamic.principles || '';
        }

        // 13. Location & Venue
        if (norm.includes('location') || norm.includes('place') || norm.includes('venue')) {
          return projDynamic.location || proj.location || collegeName || 'สถานศึกษา';
        }

        // 14. Specific 4-Division Deputy matches by tag name or label
        if (
          norm.includes('deputystrat') ||
          norm.includes('deputyplan') ||
          rawLabel.includes('แผนงาน') ||
          key.includes('แผนงาน')
        ) {
          if (t.tag_type === 'DEPUTY_STRAT_POSITION' || norm.includes('pos') || rawLabel.includes('ตำแหน่ง')) {
            return deputyStratPosition || 'รองผู้อำนวยการฝ่ายแผนงานและความร่วมมือ';
          }
          return deputyStratName || currentDiv?.deputy_name || '';
        }

        if (
          norm.includes('deputyacad') ||
          rawLabel.includes('วิชาการ') ||
          key.includes('วิชาการ')
        ) {
          if (t.tag_type === 'DEPUTY_ACAD_POSITION' || norm.includes('pos') || rawLabel.includes('ตำแหน่ง')) {
            return deputyAcadPosition || 'รองผู้อำนวยการฝ่ายวิชาการ';
          }
          return deputyAcadName || currentDiv?.deputy_name || '';
        }

        if (
          norm.includes('deputyres') ||
          rawLabel.includes('บริหารทรัพยากร') ||
          rawLabel.includes('ทรัพยากร') ||
          key.includes('ทรัพยากร')
        ) {
          if (t.tag_type === 'DEPUTY_RES_POSITION' || norm.includes('pos') || rawLabel.includes('ตำแหน่ง')) {
            return deputyResPosition || 'รองผู้อำนวยการฝ่ายบริหารทรัพยากร';
          }
          return deputyResName || currentDiv?.deputy_name || '';
        }

        if (
          norm.includes('deputydev') ||
          rawLabel.includes('พัฒนากิจการ') ||
          rawLabel.includes('พัฒนานักเรียน') ||
          key.includes('พัฒนา')
        ) {
          if (t.tag_type === 'DEPUTY_DEV_POSITION' || norm.includes('pos') || rawLabel.includes('ตำแหน่ง')) {
            return deputyDevPosition || 'รองผู้อำนวยการฝ่ายพัฒนากิจการนักเรียน นักศึกษา';
          }
          return deputyDevName || currentDiv?.deputy_name || '';
        }

        // 15. General Deputy & Approver (รองผู้อำนวยการฝ่ายประจำฝ่ายที่สังกัด)
        if (
          t.tag_type === 'APPROVER_DROPDOWN' ||
          t.tag_type === 'DEPUTY_DROPDOWN' ||
          key === 'approver_name' ||
          key === 'deputy_name' ||
          norm === 'deputyname' ||
          norm === 'approvername' ||
          rawLabel.includes('รองผู้อำนวยการ') ||
          rawLabel.includes('ผู้เห็นชอบ')
        ) {
          if (norm.includes('pos') || rawLabel.includes('ตำแหน่ง')) {
            return (
              projDynamic.deputy_position ||
              projDynamic.approver_position ||
              currentDiv?.deputy_position ||
              (currentDiv ? (currentDiv.deputy_position || `รองผู้อำนวยการ${currentDiv.name}`) : '') ||
              deputyStratPosition ||
              'รองผู้อำนวยการ'
            );
          }
          return (
            projDynamic.deputy_name ||
            projDynamic.approver_name ||
            currentDiv?.deputy_name ||
            (currentDiv?.code === 'ACAD' ? deputyAcadName : null) ||
            (currentDiv?.code === 'RES' ? deputyResName : null) ||
            (currentDiv?.code === 'DEV' ? deputyDevName : null) ||
            (currentDiv?.code === 'STRAT' ? deputyStratName : null) ||
            deputyStratName ||
            deputyAcadName ||
            deputyResName ||
            ''
          );
        }

        if (
          t.tag_type === 'APPROVER_POSITION' ||
          t.tag_type === 'DEPUTY_POSITION' ||
          key === 'approver_position' ||
          key === 'deputy_position' ||
          norm === 'deputyposition' ||
          norm === 'approverposition'
        ) {
          return (
            projDynamic.deputy_position ||
            projDynamic.approver_position ||
            currentDiv?.deputy_position ||
            (currentDiv ? (currentDiv.deputy_position || `รองผู้อำนวยการ${currentDiv.name}`) : '') ||
            (currentDiv?.code === 'ACAD' ? (deputyAcadPosition || 'รองผู้อำนวยการฝ่ายวิชาการ') : null) ||
            (currentDiv?.code === 'RES' ? (deputyResPosition || 'รองผู้อำนวยการฝ่ายบริหารทรัพยากร') : null) ||
            (currentDiv?.code === 'DEV' ? (deputyDevPosition || 'รองผู้อำนวยการฝ่ายพัฒนากิจการนักเรียน นักศึกษา') : null) ||
            (currentDiv?.code === 'STRAT' ? (deputyStratPosition || 'รองผู้อำนวยการฝ่ายแผนงานและความร่วมมือ') : null) ||
            deputyStratPosition ||
            'รองผู้อำนวยการ'
          );
        }

        // 16. Head of Department / Unit (หัวหน้างาน/หัวหน้าแผนก)
        if (t.tag_type === 'HEAD_NAME' || key === 'head_name' || norm === 'headname' || rawLabel.includes('หัวหน้างาน') || rawLabel.includes('หัวหน้าแผนก')) {
          const userDept = (allDivs || []).reduce((acc: any[], div: any) => [...acc, ...(div.departments || [])], []).find((d: any) => d.id === (proj.department_id || user?.department?.id || (user as any)?.department_id));
          return projDynamic.head_name || userDept?.head_name || '';
        }
        if (t.tag_type === 'HEAD_POSITION' || key === 'head_position' || norm === 'headposition') {
          const userDept = (allDivs || []).reduce((acc: any[], div: any) => [...acc, ...(div.departments || [])], []).find((d: any) => d.id === (proj.department_id || user?.department?.id || (user as any)?.department_id));
          return projDynamic.head_position || userDept?.head_position || (userDept ? (userDept.name.startsWith('งาน') || userDept.name.startsWith('แผนก') ? `หัวหน้า${userDept.name}` : `หัวหน้างาน${userDept.name}`) : 'หัวหน้างาน');
        }

        // 17. Timelines & Dates & Duration
        const formatThaiDate = (d: any) => {
          if (!d) return '';
          const dateObj = new Date(d);
          if (isNaN(dateObj.getTime())) return String(d);
          const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
          return `${dateObj.getDate()} ${months[dateObj.getMonth()]} พ.ศ. ${dateObj.getFullYear() + 543}`;
        };

        let sDate = '';
        let eDate = '';
        if (Array.isArray(proj.timelines) && proj.timelines.length > 0) {
          const validStart = [...proj.timelines].filter((tm: any) => tm.start_date).sort((a: any, b: any) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
          const validEnd = [...proj.timelines].filter((tm: any) => tm.end_date || tm.start_date).sort((a: any, b: any) => new Date(a.end_date || a.start_date).getTime() - new Date(b.end_date || b.start_date).getTime());
          if (validStart.length > 0) sDate = formatThaiDate(validStart[0].start_date);
          if (validEnd.length > 0) eDate = formatThaiDate(validEnd[validEnd.length - 1].end_date || validEnd[validEnd.length - 1].start_date);
        }

        if (key === 'start_date' || norm === 'startdate') return projDynamic.start_date || sDate;
        if (key === 'end_date' || norm === 'enddate') return projDynamic.end_date || eDate;
        if (key === 'doc_date' || norm.includes('docdate') || norm.includes('reportdate')) {
          if (projDynamic.doc_date) return projDynamic.doc_date;
          const now = new Date();
          return `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear() + 543}`;
        }
        if (key === 'duration_text' || key === 'duration' || norm.includes('duration') || norm.includes('period') || norm.includes('timeline')) {
          if (t.tag_type === 'TIMELINE' || t.tag_type === 'TABLE_LOOP') {
            if (Array.isArray(proj.timelines) && proj.timelines.length > 0) {
              return proj.timelines.map((tm: any) => ({
                step_name: tm.name || tm.step_name || tm.activity || '',
                start_date: formatThaiDate(tm.start_date),
                end_date: formatThaiDate(tm.end_date),
                description: tm.name || '',
              }));
            }
          }
          const dText = (sDate && eDate) ? (sDate === eDate ? sDate : `${sDate} ถึง ${eDate}`) : (sDate || eDate);
          return projDynamic[key] || dText;
        }

        // 18. Fuzzy match in projDynamic
        for (const k of Object.keys(projDynamic)) {
          if (normalizeKey(k) === norm) {
            return projDynamic[k];
          }
        }

        // 19. Proposer / Leader details
        if (t.tag_type === 'LEADER_NAME' || key === 'leader_name' || norm === 'leadername' || norm.includes('proposername') || norm.includes('ownername')) {
          return proj.leader?.full_name || user?.full_name || '';
        }
        if (t.tag_type === 'LEADER_POSITION' || key === 'leader_position' || norm === 'leaderposition' || norm.includes('proposerposition')) {
          const userDept = user?.department || proj.department;
          if (userDept) {
            if (user?.role === 'HEAD_DEPT' || (user as any)?.is_head) {
              return userDept.name.startsWith('งาน') || userDept.name.startsWith('แผนก') 
                ? `หัวหน้า${userDept.name}` 
                : `หัวหน้างาน${userDept.name}`;
            } else if (user?.position === 'เจ้าหน้าที่') {
              return userDept.name.startsWith('งาน') || userDept.name.startsWith('แผนก')
                ? `เจ้าหน้าที่${userDept.name}`
                : `เจ้าหน้าที่งาน${userDept.name}`;
            } else {
              return userDept.name.startsWith('แผนก') 
                ? `ครูประจำ${userDept.name}` 
                : (userDept.name.startsWith('งาน') ? `ครูผู้ช่วย${userDept.name}` : `ครูประจำแผนกวิชา${userDept.name}`);
            }
          }
          return proj.leader?.position || user?.position || 'ครู';
        }

        // 20. Planning Head, Director & College defaults
        if (t.tag_type === 'DIRECTOR_NAME' || key === 'director_name' || norm === 'directorname') {
          return directorName || '';
        }
        if (t.tag_type === 'DIRECTOR_POSITION' || key === 'director_position' || norm === 'directorposition') {
          return directorPosition || '';
        }
        if (t.tag_type === 'COLLEGE_NAME' || key === 'college_name' || norm === 'collegename' || norm.includes('schoolname')) {
          return collegeName || '';
        }
        if (t.tag_type === 'PLANNING_HEAD_NAME' || key === 'planning_head_name' || norm === 'planningheadname') {
          return planningHeadName || '';
        }
        if (t.tag_type === 'PLANNING_HEAD_POSITION' || key === 'planning_head_position' || norm === 'planningheadposition') {
          return planningHeadPosition || 'หัวหน้างานวางแผนและงบประมาณ';
        }

        // Tag type fallbacks
        if (t.tag_type === 'TABLE_LOOP') return [{}];
        if (t.tag_type === 'BOOLEAN') return false;
        return '';
      };

      tpl.tags?.forEach((t: any) => {
        initial[t.tag_name] = resolveTagValue(t);
      });
      setDynamicData(initial);

    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDynamicChange = (key: string, value: any) => {
    setDynamicData(prev => ({ ...prev, [key]: value }));
  };

  const handlePreview = async (format: 'docx' | 'pdf') => {
    if (!template) return;
    try {
      const res = await fetch('/api/v1/documents/export-dynamic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          template_id: template.id,
          formData: dynamicData,
          format
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
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                    template?.tags?.forEach((t: any) => {
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
                const selected = headList.find((d: any) => d.head_name === e.target.value);
                setDynamicData(prev => {
                  const next: Record<string, any> = { ...prev, [key]: selectedVal };
                  if (selected) {
                    const pos = selected.head_position || `หัวหน้า${selected.name}`;
                    next['head_position'] = pos;
                    next[`${key}_position`] = pos;
                    template?.tags?.forEach((t: any) => {
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
                      template?.tags?.forEach((t: any) => {
                        if (
                          t.tag_type === 'APPROVER_POSITION' ||
                          t.tag_type === 'DEPUTY_POSITION' ||
                          t.tag_name === 'approver_position' ||
                          t.tag_name === 'approver_name_position' ||
                          t.tag_name === 'deputy_position' ||
                          t.tag_name === `${key}_position` ||
                          (t.tag_name.includes('approver') && t.tag_name.includes('pos'))
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
                      handleDynamicChange(key, formatted);
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
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
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
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
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
        const toggleCheck = (k: string) => {
          handleDynamicChange(key, { ...valObj, [k]: !valObj[k] });
        };
        const optionsList = Array.isArray(tag.options) ? tag.options : [];
        const CheckItem = ({ k, label, indent }: { k: string; label: string; indent: number }) => {
          let marginClass = "";
          if (indent === 1) marginClass = "ml-6";
          if (indent === 2) marginClass = "ml-12";
          return (
            <div className={`flex items-start space-x-2 ${marginClass}`}>
              <input type="checkbox" checked={valObj[k] || false} onChange={() => toggleCheck(k)} disabled={!isEditing} className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:bg-gray-100" />
              <label className="text-sm text-gray-700 leading-snug cursor-pointer" onClick={() => { if(isEditing) toggleCheck(k); }}>{label}</label>
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
              {optionsList.length > 0 ? optionsList.map((opt: any, idx: number) => {
                const item = typeof opt === 'string' ? { key: `chk_${idx}`, label: opt, indent: 0 } : opt;
                return <CheckItem key={idx} k={item.key} label={item.label} indent={item.indent} />;
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
                              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:bg-gray-100"
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
      case 'DATERANGE':
        return (
          <div key={key}>
            <div className="mb-1">
              <label className="block text-sm font-medium text-gray-700">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
              {tag.description && <p className="text-xs text-gray-500 mt-0.5">{tag.description}</p>}
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={value?.start || ''}
                onChange={(e) => handleDynamicChange(key, { ...(value || {}), start: e.target.value })}
                disabled={!isEditing}
                required={tag.is_required}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <span className="text-gray-500 text-sm">ถึง</span>
              <input
                type="date"
                value={value?.end || ''}
                onChange={(e) => handleDynamicChange(key, { ...(value || {}), end: e.target.value })}
                disabled={!isEditing}
                required={tag.is_required}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        );
      case 'DATE':
        return (
          <div key={key}>
            <div className="mb-1">
              <label className="block text-sm font-medium text-gray-700">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
              {tag.description && <p className="text-xs text-gray-500 mt-0.5">{tag.description}</p>}
            </div>
            <input
              type="date"
              value={value || ''}
              onChange={(e) => handleDynamicChange(key, e.target.value)}
              required={tag.is_required}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        );
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
              disabled={!isEditing}
              required={tag.is_required}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
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
                  className="flex-1 text-sm border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
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
      case 'IMAGE': {
        const imgVal = value;
        const displaySrc = imgVal
          ? (imgVal.startsWith('data:') || imgVal.startsWith('/') || imgVal.startsWith('http') ? imgVal : `data:image/jpeg;base64,${imgVal}`)
          : null;

        return (
          <div key={key} className="col-span-1 lg:col-span-2 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm font-bold text-slate-800">
                {label} {tag.is_required && <span className="text-red-500">*</span>}
              </label>
              {displaySrc && (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <Check className="w-3 h-3" /> ดึงข้อมูลรูปภาพแล้ว
                </span>
              )}
            </div>
            {tag.description && <p className="text-xs text-slate-500 mb-3">{tag.description}</p>}

            <div className="flex flex-col sm:flex-row gap-4 items-start">
              {displaySrc ? (
                <div className="relative w-44 aspect-4/3 rounded-lg overflow-hidden border border-slate-300 bg-slate-900/5 shadow-2xs flex items-center justify-center shrink-0">
                  <img src={displaySrc} alt={label} className="w-full h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => handleDynamicChange(key, '')}
                    className="absolute top-1.5 right-1.5 p-1 bg-rose-600/90 hover:bg-rose-700 text-white rounded-full text-xs transition shadow-xs"
                    title="ลบรูปภาพ"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="w-44 aspect-4/3 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 bg-white shrink-0">
                  <ImageIcon className="w-7 h-7 mb-1 opacity-40" />
                  <span className="text-xs font-medium">ยังไม่มีรูปภาพ</span>
                </div>
              )}

              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-indigo-500 text-slate-700 text-xs font-bold rounded-lg cursor-pointer shadow-2xs transition">
                    <UploadCloud className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{displaySrc ? 'เปลี่ยนรูปภาพ...' : 'อัปโหลดรูปภาพ...'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            handleDynamicChange(key, reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>

                  {imageDocuments.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectingImageTag(key)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>เลือกจากไฟล์แนบโครงการ ({imageDocuments.length})</span>
                    </button>
                  )}

                  {displaySrc && (
                    <button
                      type="button"
                      onClick={() => handleDynamicChange(key, '')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-lg border border-rose-200 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ลบรูป</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>ขนาดในเอกสาร:</span>
                  <input
                    type="number"
                    placeholder="กว้าง"
                    value={dynamicData[`${key}_size`]?.[0] || ''}
                    onChange={(e) => {
                      const sizeKey = `${key}_size`;
                      const currentSize = dynamicData[sizeKey] || [150, 150];
                      handleDynamicChange(sizeKey, [parseInt(e.target.value) || 150, currentSize[1]]);
                    }}
                    className="w-16 px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                    title="ความกว้าง (px)"
                  />
                  <span>×</span>
                  <input
                    type="number"
                    placeholder="สูง"
                    value={dynamicData[`${key}_size`]?.[1] || ''}
                    onChange={(e) => {
                      const sizeKey = `${key}_size`;
                      const currentSize = dynamicData[sizeKey] || [150, 150];
                      handleDynamicChange(sizeKey, [currentSize[0], parseInt(e.target.value) || 150]);
                    }}
                    className="w-16 px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                    title="ความสูง (px)"
                  />
                  <span className="text-[11px] text-slate-400">(px)</span>
                </div>
              </div>
            </div>
          </div>
        );
      }
      default:
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
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        );
    }
  };

  const handleSave = async () => {
    if (!project?.id) return;
    setIsSaving(true);
    try {
      let currentDynamic = project.dynamic_data || {};
      while (typeof currentDynamic === 'string') {
        try { currentDynamic = JSON.parse(currentDynamic); } catch { break; }
      }
      if (typeof currentDynamic !== 'object' || currentDynamic === null) {
        currentDynamic = {};
      }

      // Merge and synchronize dynamicData
      const mergedDynamic = {
        ...currentDynamic,
        ...dynamicData,
      };

      // Ensure activity_image_1..4 and 4-column summaries are synced back
      for (const [k, v] of Object.entries(dynamicData)) {
        const norm = (k || '').toLowerCase().replace(/[%_\-\s]/g, '');
        if (norm.includes('activityimage1') || norm.includes('image1') || norm.includes('photo1') || norm.includes('img1')) {
          mergedDynamic['activity_image_1'] = v;
        } else if (norm.includes('activityimage2') || norm.includes('image2') || norm.includes('photo2') || norm.includes('img2')) {
          mergedDynamic['activity_image_2'] = v;
        } else if (norm.includes('activityimage3') || norm.includes('image3') || norm.includes('photo3') || norm.includes('img3')) {
          mergedDynamic['activity_image_3'] = v;
        } else if (norm.includes('activityimage4') || norm.includes('image4') || norm.includes('photo4') || norm.includes('img4')) {
          mergedDynamic['activity_image_4'] = v;
        } else if (norm.includes('activitiessummary') || norm.includes('activitysummary')) {
          mergedDynamic['activities_summary'] = v;
        } else if (norm.includes('actualresult') || norm.includes('resultssummary')) {
          mergedDynamic['actual_results'] = v;
        } else if (norm.includes('problem') || norm.includes('obstacle')) {
          mergedDynamic['problems_obstacles'] = v;
        } else if (norm.includes('projectsuggestion') || norm.includes('summarynote')) {
          mergedDynamic['project_suggestions'] = v;
        } else if (norm.includes('actualspent') || norm.includes('actualexpense') || norm.includes('spentamount')) {
          mergedDynamic['actual_spent'] = v;
        }
      }

      const authToken = token || localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');

      let res = await fetch(`/api/v1/projects/${project.id}/summary`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          dynamic_data: JSON.stringify(mergedDynamic),
          actual_spent: Number(mergedDynamic.actual_spent || project.actual_spent) || 0,
        }),
      });

      if (res.status === 404 || res.status === 405) {
        res = await fetch(`/api/v1/projects/${project.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            dynamic_data: JSON.stringify(mergedDynamic),
            actual_spent: Number(mergedDynamic.actual_spent || project.actual_spent) || 0,
          }),
        });
      }

      const data = await res.json().catch(() => ({ success: false, message: 'การตอบสนองจากเซิร์ฟเวอร์ไม่ถูกต้อง' }));
      if (res.ok && data.success) {
        showAlert.success('บันทึกสำเร็จ', 'บันทึกข้อมูลสรุปโครงการและเชื่อมโยงกับระบบเรียบร้อยแล้ว');
      } else {
        showAlert.error('บันทึกไม่สำเร็จ', data.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (e: any) {
      showAlert.error('เกิดข้อผิดพลาด', e.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="p-12 text-center text-red-500">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <h2 className="text-lg font-bold">{errorMsg}</h2>
        <Link href="/my-projects" className="mt-4 inline-block text-indigo-600 hover:underline">กลับไปหน้า My Projects</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-3">
          <Link href={`/projects/${projectId}`} className="p-2 bg-white rounded-full border border-gray-200 hover:bg-gray-50 text-gray-500 transition shadow-2xs">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">สร้างรายงานสรุปโครงการ</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              อ้างอิงจากโครงการ: <span className="font-semibold text-indigo-700">{project?.title}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</span>
          </button>
          <button
            type="button"
            onClick={() => handlePreview('docx')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-lg transition"
          >
            <Download className="w-4 h-4" />
            <span>Word (.docx)</span>
          </button>
        </div>
      </div>

      <form className="space-y-6">
        <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6 border-b pb-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">ฟอร์มกรอกข้อมูลสรุป ({template?.name})</h2>
              <p className="text-xs text-slate-500 mt-0.5">ระบบดึงข้อมูลจากหน้ารายละเอียดโครงการ และแท็บบันทึกผล/สรุปผลให้อัตโนมัติ</p>
            </div>
          </div>
          
          <div className="flex flex-col gap-6">
            {template?.tags?.length === 0 ? (
               <div className="col-span-2 text-center py-10 text-gray-400">
                 ไม่พบการตั้งค่า Tag ในแม่แบบนี้
               </div>
            ) : (
               template?.tags?.filter((t: any) => !(t.options && typeof t.options === 'object' && !Array.isArray(t.options) && t.options.is_hidden)).map((tag: any) => renderTagInput(tag))
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            กลับหน้ารายละเอียดโครงการ
          </Link>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
              <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</span>
            </button>
            <button
              type="button"
              onClick={() => handlePreview('docx')}
              className="inline-flex items-center px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 text-xs font-bold transition-colors"
            >
              <Download className="w-4 h-4 mr-1.5" />
              ดาวน์โหลด .docx
            </button>
            <button
              type="button"
              onClick={() => handlePreview('pdf')}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs font-bold transition-colors shadow-sm"
            >
              <Eye className="w-4 h-4 mr-1.5" />
              พรีวิว PDF จำลอง
            </button>
          </div>
        </div>
      </form>

      {/* Attachment Image Picker Modal */}
      {selectingImageTag && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-theme-primary" />
                  <h3 className="font-bold text-slate-800 text-base">เลือกภาพจากไฟล์แนบโครงการ</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectingImageTag(null)}
                  className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-500">
                คลิกเลือกรูปภาพที่ต้องการนำมาใช้ในช่อง <span className="font-bold text-indigo-700">{selectingImageTag}</span>:
              </p>

              <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3 p-1">
                {imageDocuments.map((doc: any) => {
                  const docUrl = doc.file_path?.startsWith('http') || doc.file_path?.startsWith('/')
                    ? doc.file_path
                    : `/api/v1/projects/documents/${doc.id}/${encodeURIComponent(doc.file_name || 'image')}`;

                  return (
                    <div
                      key={doc.id}
                      onClick={() => {
                        handleDynamicChange(selectingImageTag, docUrl);
                        setSelectingImageTag(null);
                      }}
                      className="group cursor-pointer border border-slate-200 hover:border-indigo-500 rounded-xl overflow-hidden shadow-2xs hover:shadow-md transition bg-slate-50 flex flex-col"
                    >
                      <div className="aspect-4/3 bg-slate-900/5 overflow-hidden flex items-center justify-center relative">
                        <img
                          src={docUrl}
                          alt={doc.file_name}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                          onError={(e: any) => {
                            e.currentTarget.src = '';
                            e.currentTarget.className = 'hidden';
                          }}
                        />
                      </div>
                      <div className="p-2 text-center bg-white border-t border-slate-100">
                        <p className="text-[11px] font-bold text-slate-700 truncate">{doc.file_name}</p>
                        <span className="text-[10px] text-indigo-600 font-medium group-hover:underline">เลือกรูปนี้</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setSelectingImageTag(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
