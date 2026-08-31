# ระบบบริหารจัดการงานแผนงานและโครงการ (วก.เชียงราย)
### Chiang Rai Vocational College Planning & Project Management System

ระบบบริหารจัดการงานแผนงานและโครงการ พัฒนาขึ้นตามมาตรฐานงานสารบรรณระเบียบสำนักนายกรัฐมนตรีสำหรับวิทยาลัยอาชีวศึกษาเชียงราย เพื่อยกระดับกระบวนการเสนอโครงการ การตรวจอนุมัติตามลำดับบังคับบัญชา (Digital Approval Chain) การควบคุมและวิเคราะห์งบประมาณ 4 ฝ่ายบริหาร และระบบจำลองเอกสาร A4 Live Preview พร้อมแปลงเป็นไฟล์ราชการอัตโนมัติ

---

## 🌟 ฟีเจอร์หลัก (Key Features)

1. **ระบบ Live Preview สารบรรณไทย (A4 Real-time):**
   - หน้าจอแบ่ง 50:50 (แบบฟอร์มบันทึกข้อมูลฝั่งซ้าย | เอกสาร A4 มาตรฐานราชการฝั่งขวา)
   - ฟอนต์มาตรฐาน TH Sarabun New พร้อม Margins ตามระเบียบสำนักนายกฯ (บน 2.5cm, ล่าง 2.0cm, ซ้าย 2.5cm, ขวา 1.5cm)
   - คำนวณตารางงบประมาณอัตโนมัติและแปลงตัวเลขเป็นข้อความบาทภาษาไทยทันที

2. **สายการอนุมัติดิจิทัล 4 ขั้นตอน (Approval Chain Workflow):**
   - **ขั้นที่ 1:** หัวหน้าแผนกวิชา / หัวหน้างาน (`HEAD_DEPT`)
   - **ขั้นที่ 2:** รองผู้อำนวยการประจำฝ่าย (`DEPUTY_DIRECTOR`)
   - **ขั้นที่ 3:** เจ้าหน้าที่งานแผนงานและงบประมาณ (`PLANNING_OFFICER`) พร้อมระบบ **Auto-Generate รหัสโครงการ** (`PRJ-YYYY-[DIV]-XXXX`)
   - **ขั้นที่ 4:** ผู้อำนวยการวิทยาลัยอาชีวศึกษาเชียงราย (`DIRECTOR`) อนุมัติขั้นสุดท้าย
   - รองรับคำสั่ง: อนุมัติเห็นชอบ, ขอให้แก้ไขกลับไปยังผู้เสนอ (Revision Request), และปฏิเสธ (Reject)

3. **ศูนย์กลางติดตามงบประมาณ 4 ฝ่ายบริหาร (Dashboard & Analytics):**
   - แสดงตัวชี้วัดหลัก: งบจัดสรรรวม, งบใช้จริง, งบคงเหลือ, อัตราการเบิกจ่าย %
   - กราฟแท่งจำแนกตาม 4 ฝ่าย: ฝ่ายวิชาการ (ACAD), ฝ่ายบริหารทรัพยากร (RES), ฝ่ายพัฒนากิจการนักเรียนฯ (DEV), ฝ่ายแผนงานและความร่วมมือ (STRAT)
   - สรุปสัดส่วนตามยุทธศาสตร์และตัวชี้วัดสถานศึกษา

4. **ปฏิทินปฏิบัติงานและไทม์ไลน์ (Schedule & Gantt):**
   - ติดตามช่วงเวลากิจกรรมและเป้าหมายสำคัญ (Milestones)

5. **ระบบแจ้งเตือน Real-time และอีเมล (Notifications & SMTP):**
   - **In-App Notification Center:** ไอคอนกระดิ่ง 🔔 บน Navbar นับตัวเลขแจ้งเตือนที่ยังไม่ได้อ่าน พร้อมหน้าประวัติรวม `/notifications`
   - **Real-time Engine (SSE):** ส่งแจ้งเตือนระดับวินาทีผ่าน Server-Sent Events พร้อมเสียงเตือนและ Toast Popup
   - **Email Notifications:** ส่งอีเมลแจ้งเตือนผู้เสนอและผู้อนุมัติทุกขั้นตอน (ยื่นเสนอ, อนุมัติ, ขอแก้ไข, ปฏิเสธ)
   - **Admin SMTP Management:** หน้าต่างตั้งค่า SMTP Server พร้อมปุ่มทดสอบส่งอีเมลทันทีในหน้า `/admin/settings`

---

## 👥 บัญชีผู้ใช้สำหรับทดสอบระบบ (Test Accounts)

> ทุกบัญชีใช้รหัสผ่านเริ่มต้น: **`password123`** (มีปุ่ม 1-Click Quick Login ในหน้าเข้าสู่ระบบ)

| บทบาท (Role) | ชื่อผู้ใช้ (Username) | ชื่อ-นามสกุล / ตำแหน่ง | สิทธิ์หน้าที่ในระบบ |
| :--- | :--- | :--- | :--- |
| **TEACHER** | `teacher1` | อ.สมชาย ใจดี (แผนก IT) | เสนอโครงการ, บันทึกแบบร่าง |
| **HEAD_DEPT** | `head_tech` | นายประสิทธิ์ วิชาการ (หน.แผนก IT) | อนุมัติขั้นที่ 1 (ระดับแผนก/งาน) |
| **DEPUTY_DIRECTOR** | `deputy_acad` | ดร.สมศักดิ์ ภักดี (รอง ผอ. ฝ่ายวิชาการ) | อนุมัติขั้นที่ 2 (ระดับฝ่ายวิชาการ) |
| **PLANNING_OFFICER** | `planning_officer` | น.ส.อารีย์ แผนงานดี (จนท.งานแผน) | อนุมัติขั้นที่ 3 & ออกรหัสโครงการ |
| **DIRECTOR** | `director` | นายชูชาติ วงศ์สว่าง (ผอ.วก.เชียงราย) | อนุมัติขั้นที่ 4 (อนุมัติขั้นสุดท้าย) |
| **ADMIN** | `admin` | ผู้ดูแลระบบส่วนกลาง | จัดการระบบและข้อมูลทั้งหมด |

---

## 🚀 ขั้นตอนการติดตั้งและรันระบบ (Quick Start)

### 1. เริ่มต้นฐานข้อมูล MySQL ด้วย Docker
```bash
docker compose up -d mysql
```
*(MySQL จะทำงานที่ Port 3308 พร้อมฐานข้อมูล `vocational_plan_db`)*

### 2. สร้างโครงสร้างฐานข้อมูลและ Seed ข้อมูลตัวอย่าง
```bash
# Push schema เข้า MySQL
pnpm --filter api exec prisma db push

# รัน Seed ข้อมูลฝ่าย, ยุทธศาสตร์, ผู้ใช้งาน และโครงการตัวอย่าง
pnpm --filter api exec tsx prisma/seed.ts
```

### 3. รันระบบ Backend API & Frontend Web พร้อมกัน
```bash
pnpm dev
```
- **Frontend Web:** [http://localhost:3005](http://localhost:3005)
- **Backend API:** [http://localhost:5050](http://localhost:5050)
- **API Health Check:** [http://localhost:5050/health](http://localhost:5050/health)

---

## 📧 วิธีการตั้งค่าระบบส่งอีเมลแจ้งเตือน (SMTP Configuration Guide)

ระบบรองรับการตั้งค่า Mail Server จากหน้าเว็บผู้ดูแลระบบโดยตรงที่เมนู **ตั้งค่าระบบสถานศึกษา (`/admin/settings`) > แท็บ "ระบบอีเมล & SMTP"**

### 1. วิธีตั้งค่าด้วย Google / Gmail (แนะนำ)
1. เข้าไปที่ [บัญชี Google (Google Account)](https://myaccount.google.com/security) > เมนู **"ความปลอดภัย (Security)"**
2. เปิดใช้งาน **"การยืนยันแบบ 2 ขั้นตอน (2-Step Verification)"**
3. ไปที่หัวข้อ **"รหัสผ่านสำหรับแอป (App passwords)"** หรือเปิดลิงก์ [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
4. ตั้งชื่อแอป เช่น `ระบบโครงการ วก.เชียงราย` แล้วกด **สร้าง (Create)** จะได้รับรหัสผ่าน 16 ตัวอักษร
5. นำข้อมูลมากรอกในหน้าเว็บ `/admin/settings`:
   - **SMTP Host:** `smtp.gmail.com`
   - **SMTP Port:** `587`
   - **SMTP Username:** อีเมล Gmail ของคุณ (เช่น `yourname@gmail.com`)
   - **SMTP Password:** รหัสผ่านสำหรับแอป 16 ตัวที่ได้จากข้อ 4
   - **ชื่อผู้ส่ง (Sender Name):** `ระบบบริหารจัดการโครงการ วก.เชียงราย`
   - **อีเมลผู้ส่ง (Sender Email):** อีเมลเดียวกับ Username
6. เลื่อนสวิตช์เป็น **"เปิดใช้งาน (Enabled)"** แล้วกด **"บันทึกการตั้งค่า"**
7. ทดสอบส่งในกล่อง **"ทดสอบการส่งอีเมล (Send Test Email)"**

### 2. วิธีตั้งค่าด้วย Microsoft 365 / Outlook / อีเมลองค์กร (@vec.mail.go.th)
- **SMTP Host:** `smtp.office365.com`
- **SMTP Port:** `587`
- **SMTP Username:** อีเมลองค์กรของคุณ (เช่น `user@vec.mail.go.th`)
- **SMTP Password:** รหัสผ่านอีเมลของคุณ
- **ชื่อผู้ส่ง:** `ระบบบริหารจัดการโครงการ วก.เชียงราย`

### 3. วิธีตั้งค่าด้วย Web Hosting / Private Mail Server
- **SMTP Host:** เช่น `mail.yourdomain.ac.th`
- **SMTP Port:** `587` (TLS) หรือ `465` (SSL)
- **SMTP Username:** บัญชีอีเมลที่สร้างในโฮสติ้ง
- **SMTP Password:** รหัสผ่านของบัญชีอีเมลนั้น

---

## 📁 โครงสร้างโปรเจกต์ (Monorepo Directory Structure)

```text
vocational-plan-system/
├── apps/
│   ├── web/                     # Next.js 14 Frontend App
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (auth)/login/    # หน้าเข้าสู่ระบบและปุ่มสลับบทบาท
│   │   │   │   ├── dashboard/       # หน้าแดชบอร์ดงบประมาณและตารางโครงการ
│   │   │   │   ├── projects/
│   │   │   │   │   ├── new/         # หน้าเขียนโครงการ + A4 Split Live Preview
│   │   │   │   │   └── [id]/        # หน้ารายละเอียดโครงการ + Approval Chain
│   │   │   │   ├── approvals/       # หน้าคิวงานพิจารณาอนุมัติ
│   │   │   │   ├── divisions/[code] # หน้ารายละเอียด 4 ฝ่ายบริหาร
│   │   │   │   └── schedule/        # หน้าปฏิทินปฏิบัติงานและไทม์ไลน์
│   │   │   └── components/
│   │   │       ├── preview/         # A4 Live Preview (TH Sarabun Thai Memo)
│   │   │       └── layout/          # Navbar, Sidebar, MainLayout
│   └── api/                     # Express & Prisma Backend API
│       ├── src/
│       │   ├── index.ts             # Express Server Setup (Port 5050)
│       │   ├── middlewares/auth.ts  # JWT Authentication & RBAC Guards
│       │   └── modules/
│       │       ├── auth/            # Login, Profile, Users
│       │       ├── projects/        # Project CRUD, Submissions
│       │       ├── approvals/       # 4-Step Approval Engine, Code Generator
│       │       ├── budgets/         # 4 Divisions Budget Analytics
│       │       ├── divisions/       # Divisions & Departments
│       │       ├── strategics/      # Strategic Plans & Categories
│       │       └── documents/       # Docxtemplater & PDF Generator
│       └── prisma/
│           ├── schema.prisma        # 10 Models Schema
│           └── seed.ts              # Database Seeder Script
├── docker-compose.yml           # MySQL 8.0 & LibreOffice Container Config
├── DESIGN.md                    # System Architecture Specifications
└── README.md
```
