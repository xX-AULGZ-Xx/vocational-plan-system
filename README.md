# ระบบบริหารจัดการงานแผนงานและโครงการ (วก.เชียงราย)
### Chiang Rai Vocational College Planning & Project Management System

ระบบบริหารจัดการงานแผนงานและโครงการ พัฒนาขึ้นตามมาตรฐานงานสารบรรณระเบียบสำนักนายกรัฐมนตรีสำหรับวิทยาลัยอาชีวศึกษาเชียงราย เพื่อยกระดับกระบวนการเสนอโครงการ การตรวจอนุมัติตามลำดับบังคับบัญชา (Digital Approval Chain) การติดตามสถานะหลังอนุมัติ (Post-Approval Execution Stages) การควบคุมและวิเคราะห์งบประมาณ 4 ฝ่ายบริหาร ระบบจำลองเอกสาร Live Preview แบบ A4 และการพิมพ์ออกเอกสาร Word (DOCX) ตามแม่แบบราชการอัตโนมัติ

---

## 🌟 ฟีเจอร์หลัก (Key Features)

1. **ระบบ Live Preview สารบรรณไทย & แม่แบบเอกสาร DOCX อัจฉริยะ:**
   - หน้าจอเสนอโครงการแบบ Responsive Form พร้อม A4 Live Preview ตามระเบียบสำนักนายกฯ
   - รองรับการสแกน Tag ในไฟล์แม่แบบ Word (`.docx`) แบบอัตโนมัติ (Custom Form Fields, Table Loops, Dynamic Signatures)
   - ส่งออกเอกสารเล่มโครงการฉบับสมบูรณ์, แบบสรุปโครงการแผ่นเดียว (One-page Summary), และแบบฟอร์มขออนุมัติเป็นไฟล์ `.docx` พร้อมจัดรูปแบบให้อัตโนมัติ

2. **สายการอนุมัติดิจิทัล 4 ขั้นตอน (Approval Chain Workflow):**
   - **ขั้นที่ 1:** หัวหน้าแผนกวิชา / หัวหน้างาน (`HEAD_DEPT`)
   - **ขั้นที่ 2:** รองผู้อำนวยการประจำฝ่าย (`DEPUTY_DIRECTOR`)
   - **ขั้นที่ 3:** เจ้าหน้าที่งานแผนงานและงบประมาณ (`PLANNING_OFFICER`) พร้อมระบบ **Auto-Generate รหัสโครงการ** (`PRJ-YYYY-[DIV]-XXXX`)
   - **ขั้นที่ 4:** ผู้อำนวยการวิทยาลัยอาชีวศึกษาเชียงราย (`DIRECTOR`) อนุมัติขั้นสุดท้าย
   - **ระบบพิจารณาโครงการ:** อนุมัติเห็นชอบ, ส่งกลับเพื่อขอให้แก้ไข (Revision Request) ส่งคืนตามลำดับขั้นที่ถูกต้อง, และปฏิเสธ (Reject)

3. **ระบบติดตามสถานะการดำเนินงานโครงการ 4 ขั้นตอน (หลัง ผอ. อนุมัติ):**
   - ๑. **อนุมัติโครงการ** (Approved)
   - ๒. **อนุญาตดำเนินโครงการ** (Permitted) - กำหนดช่วงวันดำเนินงาน (รองรับหลายช่วงเวลา/หลายวัน) พร้อมสถานที่และซิงค์เข้าปฏิทินสถานศึกษาอัตโนมัติ
   - ๓. **ดำเนินโครงการ** (In Progress)
   - ๔. **สรุปผลโครงการ** (Completed) - แนบรูปภาพกิจกรรม สรุปผลสัมฤทธิ์ตัวชี้วัด ประเมินงบประมาณ และออกเล่มสรุปผลโครงการ

4. **ปฏิทินปฏิบัติงานและไทม์ไลน์กิจกรรม (Interactive Schedule & Timeline):**
   - มุมมองปฏิทินรายเดือน (Month View) และมุมมองรายการ (Gantt/Timeline List View)
   - **ระบบกรองฝ่ายและแผนก (Interactive Division & Department Filter):** กรองกิจกรรมตามฝ่ายงาน พร้อม Badge ตัวเลขนับกิจกรรมแบบ Real-time และเลือกเจาะจงแผนก/งานได้
   - **แยกโทนสีตามฝ่ายงาน:** แสดงสีประจำฝ่ายชัดเจน และเน้นแถบสีทองสำหรับเป้าหมายสำคัญ (Milestones)

5. **ศูนย์กลางติดตามงบประมาณ 4 ฝ่ายบริหาร (Dashboard & Analytics):**
   - แสดงตัวชี้วัดหลัก: งบจัดสรรรวม, งบใช้จริง, งบคงเหลือ, อัตราการเบิกจ่าย %
   - กราฟจำแนกตาม 4 ฝ่าย: ฝ่ายวิชาการ (ACAD), ฝ่ายบริหารทรัพยากร (RES), ฝ่ายพัฒนากิจการนักเรียนฯ (DEV), ฝ่ายแผนงานและความร่วมมือ (STRAT)
   - สรุปสัดส่วนตามแผนยุทธศาสตร์และตัวชี้วัดสถานศึกษา

6. **ระบบแจ้งเตือน Real-time และอีเมล (Notifications & SMTP):**
   - **In-App Notification Center:** กระดิ่งแจ้งเตือน 🔔 บน Navbar นับตัวเลขแจ้งเตือนแบบ Badge Real-time พร้อมหน้าสรุป `/notifications`
   - **Real-Time Engine (Server-Sent Events - SSE):** แจ้งเตือนทันทีระดับวินาที พร้อมเสียงเตือนและระบบ Reconnect อัตโนมัติ
   - **Email Notifications:** ส่งอีเมลแจ้งเตือนผู้เสนอและผู้อนุมัติทุกขั้นตอน
   - **Admin Management:** ตั้งค่า SMTP Server, ระบบจัดการโครงสร้างฝ่าย/แผนก, แม่แบบเอกสาร, และปุ่มทดสอบระบบแจ้งเตือนในหน้า `/admin/settings`

---

## 👥 บัญชีผู้ใช้สำหรับทดสอบระบบ (Test Accounts)

> ทุกบัญชีใช้รหัสผ่านเริ่มต้น: **`password123`** (มีปุ่ม 1-Click Quick Login ในหน้าเข้าสู่ระบบ)

| บทบาท (Role) | ชื่อผู้ใช้ (Username) | ชื่อ-นามสกุล / ตำแหน่ง | สิทธิ์หน้าที่ในระบบ |
| :--- | :--- | :--- | :--- |
| **TEACHER** | `teacher1` | อ.สมชาย ใจดี (แผนก IT) | เสนอโครงการ, บันทึกแบบร่าง |
| **HEAD_DEPT** | `head_tech` | นายประสิทธิ์ วิชาการ (หน.แผนก IT) | อนุมัติขั้นที่ 1 (ระดับแผนก/งาน) |
| **DEPUTY_DIRECTOR** | `deputy_acad` | ดร.สมศักดิ์ ภักดี (รอง ผอ. ฝ่ายวิชาการ) | อนุมัติขั้นที่ 2 (ระดับฝ่ายวิชาการ) |
| **PLANNING_OFFICER** | `planning_officer` | น.ส.อารีย์ แผนงานดี (จนท.งานแผน) | อนุมัติขั้นที่ 3, ออกรหัสโครงการ & ปรับสถานะดำเนินงาน |
| **DIRECTOR** | `director` | นายชูชาติ วงศ์สว่าง (ผอ.วก.เชียงราย) | อนุมัติขั้นที่ 4 (อนุมัติขั้นสุดท้าย) |
| **ADMIN** | `admin` | ผู้ดูแลระบบส่วนกลาง | จัดการระบบ โครงสร้างฝ่าย แม่แบบ และข้อมูลทั้งหมด |

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

## 🌐 การตั้งค่า Nginx Reverse Proxy บน Server (สำหรับ Real-time SSE)

หากใช้งานบน Production หรือ aaPanel ที่ผ่าน Nginx Reverse Proxy ให้เพิ่มการตั้งค่าสำหรับ SSE Streaming endpoint (`/api/v1/notifications/stream`) เพื่อป้องกันปัญหา `ERR_CONNECTION_CLOSED`:

```nginx
location /api/v1/notifications/stream {
    proxy_pass http://127.0.0.1:5050;
    proxy_http_version 1.1;
    proxy_set_header Connection '';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # ปิด Buffering และเปิด Timeout สำหรับ Long-lived connection
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;
    chunked_transfer_encoding off;
}
```

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

---

## 📁 โครงสร้างโปรเจกต์ (Monorepo Directory Structure)

```text
vocational-plan-system/
├── apps/
│   ├── web/                     # Next.js 16 / React 19 Frontend App
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (auth)/login/    # หน้าเข้าสู่ระบบและปุ่มสลับบทบาท (Quick Login)
│   │   │   │   ├── dashboard/       # แดชบอร์ดงบประมาณและภาพรวมสถานะโครงการ
│   │   │   │   ├── my-projects/     # รายการโครงการของผู้ใช้
│   │   │   │   ├── projects/
│   │   │   │   │   ├── new/         # หน้าเขียนโครงการ + Dynamic Form Template
│   │   │   │   │   ├── [id]/        # หน้ารายละเอียดโครงการ + Approval Chain & Execution Stages
│   │   │   │   │   ├── [id]/edit/   # หน้าแก้ไขโครงการตามข้อเสนอแนะ
│   │   │   │   │   └── [id]/summary/# หน้าสรุปผลโครงการ & พิมพ์เล่มรายงาน DOCX
│   │   │   │   ├── approvals/       # หน้าคิวงานพิจารณาอนุมัติโครงการ
│   │   │   │   ├── divisions/[code] # หน้ารายละเอียด 4 ฝ่ายบริหาร
│   │   │   │   ├── schedule/        # แผนปฏิบัติงานและปฏิทินกิจกรรมโครงการ (Filter ฝ่าย/แผนก)
│   │   │   │   ├── notifications/   # หน้าศูนย์รวมการแจ้งเตือนทั้งหมด
│   │   │   │   └── admin/           # จัดการฝ่าย/แผนก, ผู้ใช้, แม่แบบเอกสาร, ตั้งค่าระบบ
│   │   │   └── components/
│   │   │       ├── preview/         # A4 Live Preview (TH Sarabun Thai Memo)
│   │   │       └── layout/          # Navbar, Sidebar, Realtime Indicator
│   └── api/                     # Express, TypeScript & Prisma Backend API
│       ├── src/
│       │   ├── index.ts             # Express Server Setup (Port 5050)
│       │   ├── middlewares/auth.ts  # JWT Authentication & RBAC Guards
│       │   └── modules/
│       │       ├── auth/            # Login, Profile, Users Management
│       │       ├── projects/        # Project CRUD, Execution Stages, Submissions
│       │       ├── approvals/       # 4-Step Approval Engine & Code Generator
│       │       ├── budgets/         # 4 Divisions Budget Analytics
│       │       ├── divisions/       # Divisions & Departments Management
│       │       ├── strategics/      # Strategic Plans & Categories
│       │       ├── notifications/   # In-App, Real-Time SSE Stream, Mail Service
│       │       └── documents/       # Dynamic Docxtemplater Engine & Template AST Parser
│       └── prisma/
│           ├── schema.prisma        # Database Schema & Relations
│           └── seed.ts              # Initial Database Seeder
├── docker-compose.yml           # MySQL 8.0 & LibreOffice Container Config
├── DESIGN.md                    # System Architecture Specifications
└── README.md                    # Project Documentation
```

