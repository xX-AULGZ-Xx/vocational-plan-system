# `DESIGN.md`

# System Design Document: ระบบบริหารจัดการงานแผนงานและโครงการ (วก.เชียงราย)

**เวอร์ชันเอกสาร:** 1.0.0

**สถานะ:** Approved for Development

**องค์กร:** วิทยาลัยอาชีวศึกษาเชียงราย (Chiang Rai Vocational College)

---

## 1. บทนำและวัตถุประสงค์ (Introduction & Goals)

ระบบบริหารจัดการงานแผนงานและโครงการ พัฒนาขึ้นเพื่อยกระดับกระบวนการเสนอโครงการ การตรวจอนุมัติตามลำดับบังคับบัญชา การควบคุมงบประมาณ การติดตามปฏิทินปฏิบัติงาน และการจัดทำเอกสารโครงการราชการให้เป็นไปอย่างมีมาตรฐาน ถูกต้อง รวดเร็ว และตรวจสอบได้แบบเรียลไทม์

### วัตถุประสงค์หลัก

1. **ลดภาระงานเอกสาร:** สร้างระบบ Live Preview และ Document Automation แปลงข้อมูลโครงการเป็นไฟล์ `.docx` และ `.pdf` มาตรฐานงานสารบรรณ
2. **โปร่งใสและตรวจสอบได้:** ควบคุมสายการอนุมัติแบบดิจิทัล (Digital Approval Chain) พร้อมบันทึก Audit Logs ทุกขั้นตอน
3. **ติดตามงบประมาณแบบ Real-Time:** แสดงสรุปงบประมาณรวม งบผูกพัน งบใช้จริง จำแนกตาม 4 ฝ่ายบริหารหลัก
4. **วางแผนงานแบบบูรณาการ:** ติดตามกิจกรรมโครงการผ่านมุมมอง Calendar/Gantt Chart

---

## 2. สถาปัตยกรรมระบบและเทคโนโลยี (System Architecture & Tech Stack)

ระบบใช้สถาปัตยกรรมแบบ **Modular Monolith / Decoupled Client-Server** โดยคำนึงถึงความถูกต้องของการจัดพิมพ์เอกสารภาษาไทยเป็นหัวใจสำคัญ

```
[ Client: Next.js (React) ] ── (REST / tRPC) ──> [ Server: Node.js / Laravel API ]
            │                                                      │
     [ Live Preview ]                                     [ Workflow Engine ]
  (HTML Print CSS / Canvas)                                        │
                                                                   ▼
                                                       [ Docx Templater + LibreOffice ]
                                                                   │
                                                      ┌────────────┴────────────┐
                                                      ▼                         ▼
                                               [ .docx Export ]          [ .pdf Export ]
                                                      │                         │
                                                      └────────────┬────────────┘
                                                                   ▼
                                                          [ MySQL / PostgreSQL ]

```

### รายละเอียด Tech Stack

| ส่วนประกอบ | เทคโนโลยีที่เลือกใช้ | บทบาทหน้าที่ |
| --- | --- | --- |
| **Frontend UI** | Next.js (App Router), React, Tailwind CSS | แสดงผล UI, จัดการ State ฟอร์มแบบ Multi-step, Live Preview |
| **Component Library** | Lucide Icons, Shadcn UI / Radix Primitives | UI Component ที่เข้าถึงง่าย สะอาด และปรับแต่งได้สูง |
| **Backend API** | Node.js (NestJS / Express) หรือ PHP (Laravel) | ตรรกะทางธุรกิจ, RBAC, ระบบจัดการ Approval Flow |
| **Database** | MySQL 8.0+ / PostgreSQL 15+ | จัดเก็บโครงสร้างข้อมูล Relational, Transaction งบประมาณ |
| **Docx Engine** | `docxtemplater` + `pizzip` (Node.js) | ประมวลผลแท็กตัวแปร, ลูปตารางค่าใช้จ่าย, ลายเซ็นภาพ ลง Word |
| **PDF Conversion** | Hybrid (Word COM on Windows / LibreOffice on Linux) | แปลงไฟล์ `.docx` เป็น `.pdf` รักษา Layout และสระภาษาไทยได้สมบูรณ์แบบที่สุด |
| **Authentication** | NextAuth.js / Laravel Sanctum (JWT / Session) | ยืนยันตัวตน, จัดการ Role และสิทธิ์ตามฝ่าย |

---

## 3. ผังโครงสร้างฐานข้อมูล (Database Schema Specifications)

### 3.1 DDL Statements (SQL)

```sql
-- 1. ตารางฝ่ายบริหารหลัก 4 ฝ่าย
CREATE TABLE divisions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT 'ชื่อฝ่าย',
    code VARCHAR(20) UNIQUE NOT NULL COMMENT 'รหัสย่อฝ่าย เช่น ACAD, RES, DEV, STRAT'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. ตารางแผนกวิชา / งาน
CREATE TABLE departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    division_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    FOREIGN KEY (division_id) REFERENCES divisions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. ตารางผู้ใช้งาน
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    department_id INT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    position VARCHAR(100) NULL,
    signature_img VARCHAR(255) NULL COMMENT 'Path รูปภาพลายเซ็นโปร่งใส .png',
    role ENUM('TEACHER', 'HEAD_DEPT', 'DEPUTY_DIRECTOR', 'PLANNING_OFFICER', 'DIRECTOR', 'ADMIN') DEFAULT 'TEACHER',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. ตารางแผนยุทธศาสตร์และตัวชี้วัด
CREATE TABLE strategic_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fiscal_year INT NOT NULL,
    title VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE strategic_indicators (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plan_id INT NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    FOREIGN KEY (plan_id) REFERENCES strategic_plans(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. ตารางโครงการหลัก
CREATE TABLE projects (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_code VARCHAR(50) UNIQUE NULL,
    fiscal_year INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    department_id INT NOT NULL,
    leader_id BIGINT NOT NULL,
    background TEXT NULL COMMENT 'หลักการและเหตุผล',
    objectives JSON NULL COMMENT 'วัตถุประสงค์ [item1, item2]',
    target_groups JSON NULL COMMENT 'กลุ่มเป้าหมายเชิงปริมาณและคุณภาพ',
    expected_results TEXT NULL COMMENT 'ผลที่คาดว่าจะได้รับ',
    status ENUM(
        'draft',
        'submitted',
        'dept_approved',
        'deputy_approved',
        'planning_approved',
        'approved',
        'rejected',
        'in_progress',
        'completed',
        'cancelled'
    ) DEFAULT 'draft',
    total_budget DECIMAL(12,2) DEFAULT 0.00,
    actual_spent DECIMAL(12,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id),
    FOREIGN KEY (leader_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. ตารางเชื่อมความสอดคล้องยุทธศาสตร์
CREATE TABLE project_alignments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    indicator_id INT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (indicator_id) REFERENCES strategic_indicators(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. ตารางหมวดหมู่งบประมาณและรายการค่าใช้จ่าย
CREATE TABLE budget_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT 'เช่น ค่าตอบแทน, ค่าใช้สอย, ค่าวัสดุ',
    source_type ENUM('GOVERNMENT', 'SUBSIDY', 'REVENUE') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE project_budget_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    category_id INT NOT NULL,
    description VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES budget_categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. ตารางปฏิทินปฏิบัติงานและไทม์ไลน์
CREATE TABLE project_timelines (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    activity_name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    location VARCHAR(255) NULL,
    is_milestone BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. ตารางประวัติการพิจารณาและอนุมัติ (Approval Audit Log)
CREATE TABLE project_approvals (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    step_order INT NOT NULL COMMENT '1: หัวหน้างาน, 2: รอง ผอ., 3: งานแผน, 4: ผอ.',
    approver_id BIGINT NOT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED') DEFAULT 'PENDING',
    comment TEXT NULL,
    signed_at TIMESTAMP NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (approver_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. ตารางจัดการไฟล์และเวอร์ชันเอกสาร
CREATE TABLE project_documents (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    version INT DEFAULT 1,
    is_generated BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

```

---

## 4. ข้อกำหนดหน้าจอและเส้นทางระบบ (UI & Route Specifications)

### 4.1 แผนผังเมนูหลัก (Sidebar Navigation)

* **ภาพรวมระบบ (`/dashboard`):** แสดงตัวชี้วัดหลัก กราฟงบประมาณ และตารางสถานะ
* **แผนปฏิบัติงาน (`/schedule`):** ปฏิทินและ Gantt Chart ติดตามช่วงเวลาดำเนินงาน
* **เขียนโครงการใหม่ (`/projects/new`):** แบบฟอร์ม 2 ฝั่ง (Form Input ซ้าย | Live Preview ขวา)
* **แยกตามฝ่ายงาน (`/divisions/[code]`):**
* ฝ่ายวิชาการ (`/divisions/acad`)
* ฝ่ายบริหารทรัพยากร (`/divisions/res`)
* ฝ่ายพัฒนากิจการฯ (`/divisions/dev`)
* ฝ่ายยุทธศาสตร์และแผนงานฯ (`/divisions/strat`)


* **จัดการและอนุมัติ (`/approvals`):** คิวงานสำหรับหัวหน้างาน, รอง ผอ., เจ้าหน้าที่แผน, และ ผอ.

---

### 4.2 รายละเอียดหน้าจอสำคัญ (Screen Specifications)

#### หน้า Dashboard (`/dashboard`)

* **Top Metric Cards:**
* งบประมาณรวมทั้งสิ้น (`total_allocated`)
* งบประมาณที่ใช้จริง (`actual_spent`)
* งบประมาณคงเหลือ (`remaining_budget`)
* อัตราการเบิกจ่าย (`spending_percentage %`)


* **Status Badges Breakdown:** ผ่านอนุมัติ | ยังไม่ดำเนินการ | กำลังดำเนินการ | รายงานผลแล้ว
* **Charts Area:**
* **Bar Chart:** การจัดสรรและใช้งบประมาณจำแนกตาม 4 ฝ่ายบริหาร
* **Donut Chart:** สัดส่วนความสอดคล้องตามยุทธศาสตร์/นโยบายสถานศึกษา


* **Data Table:** รายการโครงการ พร้อมตัวกรอง (ปีงบประมาณ, ฝ่าย, สถานะ) และปุ่ม Quick Action (ดูรายละเอียด, ดาวน์โหลด PDF)

#### หน้าเขียนโครงการและ Live Preview (`/projects/new`)

* **Layout:** หน้าจอแบ่งแบบ 2 คอลัมน์ (Split Pane 50:50 หรือปรับขยายได้)
* **Pane ด้านซ้าย (Form Controls):**
* ข้อมูลทั่วไป (ชื่อโครงการ, ฝ่าย, ผู้รับผิดชอบ)
* ความสอดคล้องยุทธศาสตร์ (Checkboxes ดึงจาก `strategic_indicators`)
* หลักการ วัตถุประสงค์ และเป้าหมาย (Dynamic List Input)
* แผนกิจกรรม (Date Pickers, ตารางกิจกรรม)
* รายละเอียดงบประมาณ (ตารางคำนวณอัตโนมัติ: รายการ x จำนวน x ราคา = รวม)


* **Pane ด้านขวา (Live Document Preview):**
* จำลองหน้าเอกสารกระดาษ A4 ขนาด `210mm x 297mm` พร้อมตั้งค่า Margins ตามมาตรฐานงานสารบรรณ (บน 2.5cm, ล่าง 2.0cm, ซ้าย 2.5cm, ขวา 1.5cm)
* ใช้ฟอนต์ **TH Sarabun PSK / TH Sarabun New**
* อัปเดตข้อความ ตารางงบประมาณ และหัวข้อแบบ Real-time ตาม State ฝั่งซ้าย





---

## 5. กระบวนการตรวจอนุมัติ (Approval Workflow Engine)

```
[ ครู/ผู้เสนอโครงการ ] ──(Submit)──> [ สถานะ: submitted ]
                                              │
                                              ▼
                                 [ ขั้นที่ 1: หัวหน้าแผนก/งาน ]
                                              │ (Approve)
                                              ▼
                                 [ ขั้นที่ 2: รอง ผอ. ประจำฝ่าย ]
                                              │ (Approve)
                                              ▼
                                 [ ขั้นที่ 3: งานแผนงานและงบประมาณ ]
                                              │ (Approve & ออกรหัสโครงการ)
                                              ▼
                                 [ ขั้นที่ 4: ผู้อำนวยการวิทยาลัย ]
                                              │ (Final Approval & ประทับตรา/ลายเซ็น)
                                              ▼
                                     [ สถานะ: approved ]
                                              │
                                    (สร้างไฟล์ .docx/.pdf ทางการ)

```

### กฎการทำงานของ Workflow (Business Rules)

1. **การขอแก้ไข (Revision Request):** ผู้อนุมัติในทุกระดับสามารถส่งคำขอแก้ไขกลับไปยังผู้เสนอโครงการได้ พร้อมแนบข้อคิดเห็น (Comments) โดยโครงการจะเปลี่ยนสถานะเป็น `draft` หรือ `revision_needed`
2. **การปฏิเสธ (Reject):** หากถูกปฏิเสธ โครงการจะถูกยุติสถานะเป็น `rejected` พร้อมระบุเหตุผลใน Audit Log
3. **การออกรหัสโครงการ (Project Code):** เมื่อผ่านการตรวจสอบจาก "งานแผนงานและงบประมาณ" (ขั้นที่ 3) ระบบจะทำการ Generate รหัสโครงการตามรูปแบบ: `PRJ-YYYY-[DIV]-XXXX` (เช่น `PRJ-2569-ACAD-0012`)

---

## 6. สถาปัตยกรรมระบบเอกสาร (Document Generation Engine)

### 6.1 โครงสร้าง Template Tag (`template_project.docx`)

ไฟล์ต้นแบบ Microsoft Word กำหนดแท็กเพื่อรองรับ Library `docxtemplater`:

```text
บันทึกข้อความ
ส่วนราชการ: วิทยาลัยอาชีวศึกษาเชียงราย
โครงการ: {title}
ผู้รับผิดชอบ: {leader_name} สังกัด: {department_name} ฝ่าย: {division_name}

1. หลักการและเหตุผล
{background}

2. วัตถุประสงค์
{#objectives}
  - {item}
{/objectives}

3. แผนการดำเนินงาน
{#timelines}
  • {activity_name} ({start_date} ถึง {end_date}) สถานที่: {location}
{/timelines}

4. ประมาณการงบประมาณ
{#budget_items}
| {no} | {description} | {quantity} | {unit} | {unit_price} | {total_amount} |
{/budget_items}
รวมงบประมาณทั้งสิ้น {total_budget_text} บาท ({total_budget_bahttext})

                                          (ลงชื่อ)...................................................
                                                ( {leader_name} )
                                              ผู้เสนอโครงการ

```

### 6.2 กลไกการแปลงไฟล์เป็น PDF บน Server

1. Backend ทำการ Bind ข้อมูล JSON เข้ากับ `template_project.docx` และฝังรูปลายเซ็นจาก `users.signature_img`
2. บันทึกไฟล์ `.docx` ผลลัพธ์ลงบน Storage
3. รัน Command ประมวลผลแปลงไฟล์เป็น PDF (Cross-platform Hybrid):
   - **กรณีใช้งานบน Windows Server:** จะทำงานผ่าน PowerShell สั่งงาน Microsoft Word (COM Automation) เพื่อให้เอกสารภาษาไทยและ Layout สมบูรณ์ 100%
     ```powershell
     powershell.exe -NoProfile -ExecutionPolicy Bypass -File "./lib/docx2pdf.ps1" -docxPath "/path/to/input.docx" -pdfPath "/path/to/output.pdf"
     ```
   - **กรณีใช้งานบน Linux Server:** จะทำงานผ่าน Headless LibreOffice (จำเป็นต้องติดตั้งฟอนต์ TH Sarabun PSK/New ไว้ใน Server)
     ```bash
     libreoffice --headless --convert-to pdf:writer_pdf_Export "/path/to/input.docx" --outdir "/path/to/output/"
     ```

4. จัดเก็บ Metadata ลงตาราง `project_documents` พร้อมเปิดสิทธิ์ให้ดาวน์โหลด

---

## 7. แผนความปลอดภัยและการจัดการสิทธิ์ (Security & RBAC Matrix)

| สิทธิ์ / บทบาท (Role) | เสนอโครงการ | แก้ไขโครงการตนเอง | ดูโครงการฝ่ายตนเอง | อนุมัติระดับฝ่าย | ตรวจสอบงบภาพรวม | อนุมัติขั้นสุดท้าย (ผอ.) |
| --- | --- | --- | --- | --- | --- | --- |
| **TEACHER** | ✅ | ✅ (ก่อนส่ง) | ✅ | ❌ | ❌ | ❌ |
| **HEAD_DEPT** | ✅ | ✅ (ก่อนส่ง) | ✅ | ✅ (ขั้นที่ 1) | ❌ | ❌ |
| **DEPUTY_DIRECTOR** | ✅ | ✅ (ก่อนส่ง) | ✅ (เฉพาะฝ่ายตน) | ✅ (ขั้นที่ 2) | ❌ | ❌ |
| **PLANNING_OFFICER** | ✅ | ✅ (ก่อนส่ง) | ✅ (ทุกฝ่าย) | ✅ (ขั้นที่ 3) | ✅ | ❌ |
| **DIRECTOR** | ❌ | ❌ | ✅ (ทุกฝ่าย) | ✅ (ขั้นที่ 4) | ✅ | ✅ |
| **ADMIN** | ✅ | ✅ | ✅ (ทุกฝ่าย) | จัดการระบบ | จัดการระบบ | จัดการระบบ |

---

## 8. แผนผังโครงสร้างโฟลเดอร์โครงการ (Project Directory Structure)

```text
vocational-plan-system/
├── apps/
│   ├── web/ (Next.js Frontend)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (auth)/login/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── schedule/
│   │   │   │   ├── projects/
│   │   │   │   │   ├── new/
│   │   │   │   │   └── [id]/
│   │   │   │   ├── divisions/[code]/
│   │   │   │   └── approvals/
│   │   │   ├── components/
│   │   │   │   ├── ui/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── preview/ (A4 Live Preview Component)
│   │   │   │   └── forms/ (Project Multi-step Form)
│   │   │   └── lib/ (Utils, hooks, api-client)
│   │   └── public/templates/
│   └── api/ (Node.js/NestJS or Laravel Backend)
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── projects/
│       │   │   ├── approvals/
│       │   │   ├── budgets/
│       │   │   └── documents/ (Docxtemplater & PDF Engine)
│       │   ├── database/
│       │   │   ├── migrations/
│       │   │   └── seeders/
│       │   └── templates/ (Official .docx Templates)
├── docker/
│   ├── libreoffice-converter/
│   └── mysql/
├── docker-compose.yml
├── DESIGN.md
└── README.md

```