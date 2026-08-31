import { PrismaClient, Role, SourceType, ProjectStatus, ApprovalStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Database for Vocational Plan System (CRVC) ---');

  // 1. Divisions (4 ฝ่ายหลัก)
  const acad = await prisma.division.upsert({
    where: { code: 'ACAD' },
    update: {},
    create: {
      name: 'ฝ่ายวิชาการ',
      code: 'ACAD',
    },
  });

  const res = await prisma.division.upsert({
    where: { code: 'RES' },
    update: {},
    create: {
      name: 'ฝ่ายบริหารทรัพยากร',
      code: 'RES',
    },
  });

  const dev = await prisma.division.upsert({
    where: { code: 'DEV' },
    update: {},
    create: {
      name: 'ฝ่ายพัฒนากิจการนักเรียน นักศึกษา',
      code: 'DEV',
    },
  });

  const strat = await prisma.division.upsert({
    where: { code: 'STRAT' },
    update: {},
    create: {
      name: 'ฝ่ายแผนงานและความร่วมมือ',
      code: 'STRAT',
    },
  });

  console.log('✔ Divisions created');

  // 2. Departments
  const deptTech = await prisma.department.create({
    data: {
      name: 'แผนกวิชาเทคโนโลยีสารสนเทศ',
      division_id: acad.id,
    },
  });

  const deptAcc = await prisma.department.create({
    data: {
      name: 'แผนกวิชาการบัญชี',
      division_id: acad.id,
    },
  });

  const deptFin = await prisma.department.create({
    data: {
      name: 'งานการเงินและบัญชี',
      division_id: res.id,
    },
  });

  const deptActivity = await prisma.department.create({
    data: {
      name: 'งานกิจกรรมนักเรียนนักศึกษา',
      division_id: dev.id,
    },
  });

  const deptPlan = await prisma.department.create({
    data: {
      name: 'งานวางแผนและงบประมาณ',
      division_id: strat.id,
    },
  });

  console.log('✔ Departments created');

  // 3. Users for each role
  const defaultPassword = await bcrypt.hash('password123', 10);

  const users = [
    {
      username: 'teacher1',
      password_hash: defaultPassword,
      full_name: 'อาจารย์สมชาย ใจดี',
      position: 'ครูประจำแผนกวิชาเทคโนโลยีสารสนเทศ',
      role: Role.TEACHER,
      department_id: deptTech.id,
    },
    {
      username: 'head_tech',
      password_hash: defaultPassword,
      full_name: 'นายประสิทธิ์ วิชาการ',
      position: 'หัวหน้าแผนกวิชาเทคโนโลยีสารสนเทศ',
      role: Role.HEAD_DEPT,
      department_id: deptTech.id,
    },
    {
      username: 'deputy_acad',
      password_hash: defaultPassword,
      full_name: 'ดร.สมศักดิ์ ภักดี',
      position: 'รองผู้อำนวยการฝ่ายวิชาการ',
      role: Role.DEPUTY_DIRECTOR,
      department_id: deptTech.id,
    },
    {
      username: 'deputy_res',
      password_hash: defaultPassword,
      full_name: 'นางสายใจ รักษ์ทรัพย์',
      position: 'รองผู้อำนวยการฝ่ายบริหารทรัพยากร',
      role: Role.DEPUTY_DIRECTOR,
      department_id: deptFin.id,
    },
    {
      username: 'deputy_dev',
      password_hash: defaultPassword,
      full_name: 'นายพัฒนา กิจการกล้า',
      position: 'รองผู้อำนวยการฝ่ายพัฒนากิจการนักเรียนนักศึกษา',
      role: Role.DEPUTY_DIRECTOR,
      department_id: deptActivity.id,
    },
    {
      username: 'deputy_strat',
      password_hash: defaultPassword,
      full_name: 'ดร.วิชัย ยุทธศาสตร์',
      position: 'รองผู้อำนวยการฝ่ายแผนงานและความร่วมมือ',
      role: Role.DEPUTY_DIRECTOR,
      department_id: deptPlan.id,
    },
    {
      username: 'planning_officer',
      password_hash: defaultPassword,
      full_name: 'น.ส.อารีย์ แผนงานดี',
      position: 'เจ้าหน้าที่งานวางแผนและงบประมาณ',
      role: Role.PLANNING_OFFICER,
      department_id: deptPlan.id,
    },
    {
      username: 'director',
      password_hash: defaultPassword,
      full_name: 'นายชูชาติ วงศ์สว่าง',
      position: 'ผู้อำนวยการวิทยาลัยอาชีวศึกษาเชียงราย',
      role: Role.DIRECTOR,
      department_id: null,
    },
    {
      username: 'admin',
      password_hash: defaultPassword,
      full_name: 'ผู้ดูแลระบบส่วนกลาง',
      position: 'System Administrator',
      role: Role.ADMIN,
      department_id: null,
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: u,
    });
  }

  console.log('✔ Users created');

  // 4. Strategic Plans and Indicators
  const plan2569 = await prisma.strategicPlan.create({
    data: {
      fiscal_year: 2569,
      title: 'แผนปฏิบัติราชการประจำปีงบประมาณ พ.ศ. 2569 วิทยาลัยอาชีวศึกษาเชียงราย',
      indicators: {
        create: [
          {
            code: 'STRAT-1.1',
            description: 'ยุทธศาสตร์ที่ 1: พัฒนาคุณภาพและมาตรฐานการจัดการศึกษาอาชีวศึกษาสู่สากล',
          },
          {
            code: 'STRAT-1.2',
            description: 'ยุทธศาสตร์ที่ 1 (ตัวชี้วัด): ร้อยละของผู้สำเร็จการศึกษาที่มีงานทำหรือประกอบอาชีพอิสระ',
          },
          {
            code: 'STRAT-2.1',
            description: 'ยุทธศาสตร์ที่ 2: พัฒนาครูและบุคลากรทางการศึกษาให้มีความเชี่ยวชาญด้านวิชาชีพและเทคโนโลยีดิจิทัล',
          },
          {
            code: 'STRAT-3.1',
            description: 'ยุทธศาสตร์ที่ 3: ขยายโอกาสทางการศึกษาวิชาชีพและฝึกอบรมทักษะอาชีพแก่ชุมชนท้องถิ่น',
          },
          {
            code: 'STRAT-4.1',
            description: 'ยุทธศาสตร์ที่ 4: พัฒนาระบบบริหารจัดการด้วยเทคโนโลยีดิจิทัลและหลักธรรมาภิบาล',
          },
        ],
      },
    },
    include: { indicators: true },
  });

  console.log('✔ Strategic Plans & Indicators created');

  // 5. Budget Categories
  const catRemuneration = await prisma.budgetCategory.create({
    data: { name: 'ค่าตอบแทน (วิทยากร / คณะกรรมการ)', source_type: SourceType.SUBSIDY },
  });
  const catOperating = await prisma.budgetCategory.create({
    data: { name: 'ค่าใช้สอย (ค่าอาหารว่างและเครื่องดื่ม / ค่าสถานที่ / ค่าจ้างเหมา)', source_type: SourceType.SUBSIDY },
  });
  const catMaterials = await prisma.budgetCategory.create({
    data: { name: 'ค่าวัสดุ (เอกสาร / อุปกรณ์อบรม / วัสดุฝึก)', source_type: SourceType.SUBSIDY },
  });

  console.log('✔ Budget Categories created');

  // 6. Sample Project
  const teacherUser = await prisma.user.findUnique({ where: { username: 'teacher1' } });
  if (teacherUser) {
    const sampleProject = await prisma.project.create({
      data: {
        project_code: 'PRJ-2569-ACAD-0001',
        fiscal_year: 2569,
        title: 'โครงการอบรมเชิงปฏิบัติการพัฒนาทักษะปัญญาประดิษฐ์และคลาวด์สำหรับนักศึกษาอาชีวศึกษา',
        department_id: deptTech.id,
        leader_id: teacherUser.id,
        background: 'เนื่องด้วยในยุคปัจจุบัน เทคโนโลยีปัญญาประดิษฐ์ (AI) และคลาวด์คอมพิวติงเข้ามามีบทบาทสำคัญต่อการประกอบอาชีพในศตวรรษที่ 21 เพื่อเพิ่มขีดความสามารถในการแข่งขันของนักศึกษาอาชีวศึกษาเชียงราย จึงเห็นสมควรจัดโครงการอบรมนี้ขึ้น',
        objectives: [
          'เพื่อให้นักศึกษาเข้าใจหลักการพื้นฐานและการประยุกต์ใช้ AI ในงานธุรกิจและอุตสาหกรรม',
          'เพื่อพัฒนาทักษะปฏิบัติการใช้งาน Cloud Platforms ในการประมวลผลข้อมูล',
          'เพื่อเตรียมความพร้อมสู่การทดสอบสมรรถนะวิชาชีพมาตรฐานสากล',
        ],
        target_groups: {
          quantitative: 'นักศึกษาระดับ ปวส. สาขาวิชาเทคโนโลยีสารสนเทศ จำนวน 60 คน',
          qualitative: 'ผู้เข้าร่วมอบรมร้อยละ 85 มีผลการประเมินทักษะการปฏิบัติงานในระดับดีขึ้นไป',
        },
        expected_results: 'นักศึกษาสามารถนำความรู้และทักษะด้าน AI และ Cloud ไปต่อยอดในการจัดทำโครงงานวิชาชีพและพร้อมสำหรับการทำงานจริง',
        status: ProjectStatus.submitted,
        total_budget: 25000.0,
        actual_spent: 0.0,
        alignments: {
          create: [
            { indicator_id: plan2569.indicators[0].id },
            { indicator_id: plan2569.indicators[2].id },
          ],
        },
        timelines: {
          create: [
            {
              activity_name: 'ประชุมวางแผนและจัดเตรียมเอกสารโครงการ',
              start_date: new Date('2026-09-01'),
              end_date: new Date('2026-09-05'),
              location: 'ห้องประชุมแผนกเทคโนโลยีสารสนเทศ',
            },
            {
              activity_name: 'จัดอบรมเชิงปฏิบัติการ AI & Cloud (2 วัน)',
              start_date: new Date('2026-09-15'),
              end_date: new Date('2026-09-16'),
              location: 'ห้องปฏิบัติการคอมพิวเตอร์ 421',
              is_milestone: true,
            },
            {
              activity_name: 'ประเมินผล สรุปรายงาน และจัดทำรูปเล่มเสนอผู้บริหาร',
              start_date: new Date('2026-09-20'),
              end_date: new Date('2026-09-25'),
              location: 'วิทยาลัยอาชีวศึกษาเชียงราย',
            },
          ],
        },
        budget_items: {
          create: [
            {
              category_id: catRemuneration.id,
              description: 'ค่าตอบแทนวิทยากรภายนอก (12 ชม. x 600 บาท)',
              quantity: 12,
              unit: 'ชั่วโมง',
              unit_price: 600,
              total_amount: 7200,
            },
            {
              category_id: catOperating.id,
              description: 'ค่าอาหารกลางวันและเครื่องดื่ม (60 คน x 2 มื้อ x 80 บาท)',
              quantity: 120,
              unit: 'ชุด',
              unit_price: 80,
              total_amount: 9600,
            },
            {
              category_id: catOperating.id,
              description: 'ค่าอาหารว่างและเครื่องดื่ม (60 คน x 4 มื้อ x 35 บาท)',
              quantity: 240,
              unit: 'ชุด',
              unit_price: 35,
              total_amount: 8400,
            },
            {
              category_id: catMaterials.id,
              description: 'ค่าเอกสารประกอบการอบรมและวัสดุฝึกปฏิบัติ',
              quantity: 60,
              unit: 'ชุด',
              unit_price: 50,
              total_amount: 3000,
            },
          ],
        },
      },
    });

    // Create Approval Step 1 Pending
    const headUser = await prisma.user.findUnique({ where: { username: 'head_tech' } });
    if (headUser) {
      await prisma.projectApproval.create({
        data: {
          project_id: sampleProject.id,
          step_order: 1,
          approver_id: headUser.id,
          status: ApprovalStatus.PENDING,
          comment: 'รอการตรวจสอบและลงนามจากหัวหน้าแผนกวิชา',
        },
      });
    }
  }

  console.log('✔ Sample project & approval flow created');
  console.log('=== Seeding completed successfully ===');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
