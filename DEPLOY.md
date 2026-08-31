# คู่มือการ Deploy ระบบ Vocational Plan System ด้วย Docker

ระบบรองรับการติดตั้งและ Deploy ผ่าน **Docker & Docker Compose** ได้ทั้ง 2 รูปแบบ:

---

## รูปแบบที่ 1: กรณี Server **มี MySQL Server อยู่แล้ว** (Port 3306)

หากเซิร์ฟเวอร์ของคุณมี MySQL ติดตั้งและเปิดใช้งานอยู่แล้วที่เครื่อง Host:

### 1.1 สร้าง Database และ User ใน MySQL ของคุณ
```sql
CREATE DATABASE IF NOT EXISTS vocational_plan_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 1.2 กำหนดค่า Connection String ในไฟล์ `.env`
สร้างไฟล์ `.env` ที่ root ของโปรเจกต์:
```env
DATABASE_URL="mysql://root:รหัสผ่านของคุณ@host.docker.internal:3306/vocational_plan_db"
JWT_SECRET="super-secret-jwt-key-chiangrai-vocational-2026"
NEXT_PUBLIC_GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
```

### 1.3 เริ่มต้นระบบ (Docker Compose with External DB)
```bash
docker compose -f docker-compose.yml -f docker-compose.external-db.yml up -d --build
```
ระบบจะรันเฉพาะ **Backend API (`vps-api`)** และ **Frontend Web (`vps-web`)** โดยไม่สร้าง MySQL Container ซ้ำซ้อน

---

## รูปแบบที่ 2: กรณีติดตั้งแบบ **All-in-One** (รวม MySQL ใน Docker)

หากเซิร์ฟเวอร์ยังไม่มี MySQL หรือต้องการให้ Docker จัดการทุกอย่างอัตโนมัติ:

```bash
docker compose up -d --build
```

---

## 3. การเข้าใช้งานระบบหลัง Deploy

- **Frontend Web Application**: [http://localhost:3005](http://localhost:3005) หรือ `http://IP_SERVER:3005`
- **Backend API**: [http://localhost:5050](http://localhost:5050)
- **หน้าติดตั้งระบบครั้งแรก (First Run)**: เปิดเบราว์เซอร์ไปที่ `http://IP_SERVER:3005/setup` เพื่อสร้างบัญชี Super Admin และตั้งค่าสถานศึกษา

---

## 4. คำสั่งจัดการระบบที่สำคัญ

```bash
# ตรวจสอบสถานะ Container
docker compose ps

# ดู Logs การทำงานแบบ Real-time
docker compose logs -f api
docker compose logs -f web

# หยุดการทำงาน
docker compose down

# อัปเดตโค้ดและ Rebuild ใหม่
git pull
docker compose up -d --build
```
