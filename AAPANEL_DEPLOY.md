# คู่มือการติดตั้งและ Deploy บน aaPanel (ฉบับสมบูรณ์)

บน **aaPanel** สามารถติดตั้งและรันได้ 2 วิธีหลัก (แนะนำวิธีที่ 1 ผ่าน Docker สะดวกและลดปัญหา Environment ที่สุด):

---

## วิธีที่ 1: ติดตั้งผ่าน Docker บน aaPanel (แนะนำ ⭐️)

### 1.1 ติดตั้ง Docker Manager ใน aaPanel
1. ไปที่เมนู **App Store** ใน aaPanel
2. ค้นหาคำว่า `Docker` แล้วกด **Install**
3. เมื่อติดตั้งเสร็จ ให้คลิกเปิด **Docker Manager** ตรวจสอบว่า Service ทำงานเป็นปกติ (Running)

### 1.2 ติดตั้ง Git และ Clone โปรเจกต์ลง Server
เปิด **Terminal** บน aaPanel หรือ SSH เข้าเซิร์ฟเวอร์:
```bash
cd /www/wwwroot
git clone https://github.com/<USERNAME>/<REPO_NAME>.git vocational-plan-system
cd vocational-plan-system
```

### 1.3 ตั้งค่าไฟล์ `.env`
- หากใช้ **MySQL ของ aaPanel** (Port 3306):
  1. ไปที่เมนู **Databases** ใน aaPanel -> กด **Add Database**
     - DB Name: `vocational_plan_db`
     - DB User: `plan_user` (หรือ root)
     - Password: `รหัสผ่านที่ต้องการ`
     - Access Permission: `Everyone` หรือ `Specified IP (172.17.0.1)`
  2. สร้างไฟล์ `.env` ในโฟลเดอร์โปรเจกต์:
     ```env
     DATABASE_URL="mysql://plan_user:รหัสผ่าน@172.17.0.1:3306/vocational_plan_db"
     JWT_SECRET="super-secret-jwt-key-chiangrai-vocational-2026"
     NEXT_PUBLIC_GOOGLE_CLIENT_ID=""
     ```
  3. สั่งรัน Docker:
     ```bash
     docker compose -f docker-compose.yml -f docker-compose.external-db.yml up -d --build
     ```

- หากต้องการให้ **Docker สร้าง MySQL ให้เองอัตโนมัติ**:
  ```bash
  docker compose up -d --build
  ```

### 1.4 สร้าง Reverse Proxy ใน aaPanel ให้เปิดผ่านโดเมน / พอร์ต 80
1. ไปที่เมนู **Website** ใน aaPanel -> กด **Add Site**
2. ใส่ Domain Name ของคุณ (เช่น `plan.cic.ac.th` หรือ IP เครื่อง)
3. คลิกเข้าไปที่ชื่อเว็บ -> ไปที่แท็บ **Reverse Proxy** -> กด **Add reverse proxy**:
   - Proxy Name: `vps-frontend`
   - Target URL: `http://127.0.0.1:3005`
   - Sent Domain: `$host`
   - กด **Submit**

---

## วิธีที่ 2: ติดตั้งแบบ Node.js Project โดยตรง (Non-Docker)

หากไม่ต้องการใช้ Docker และต้องการรันผ่าน **Node.js Version Manager** ของ aaPanel:

### 2.1 เตรียมความพร้อมใน App Store
1. ติดตั้ง **Node.js Version Manager** จาก App Store
2. ติดตั้ง **Node.js v20.x** หรือ **v22.x** และตั้งค่าเป็น CLI Version
3. ติดตั้ง `pnpm` ผ่าน Terminal:
   ```bash
   npm install -g pnpm
   ```
4. ติดตั้ง LibreOffice และฟอนต์ภาษาไทย (สำหรับแปลง PDF):
   ```bash
   apt-get update && apt-get install -y libreoffice libreoffice-writer fonts-thai-tlwg fontconfig
   ```

### 2.2 ติดตั้ง Dependencies และ Build
```bash
cd /www/wwwroot/vocational-plan-system
pnpm install
pnpm build
```

### 2.3 ตั้งค่า Database Migration
สร้างไฟล์ `apps/api/.env`:
```env
PORT=5050
DATABASE_URL="mysql://plan_user:รหัสผ่าน@localhost:3306/vocational_plan_db"
JWT_SECRET="super-secret-jwt-key-chiangrai-vocational-2026"
CORS_ORIGIN="http://localhost:3005,http://โดเมนของคุณ"
STORAGE_DIR="./storage"
```
รันคำสั่งสร้างตาราง:
```bash
cd apps/api
npx prisma migrate deploy
```

### 2.4 สร้าง Process ผ่าน PM2 หรือ Node Project Manager ใน aaPanel
1. ไปที่ **Website** -> แท็บ **Node project** -> กด **Add Node project**
2. **สร้าง Service 1 (API)**:
   - Path: `/www/wwwroot/vocational-plan-system/apps/api`
   - Startup file: `dist/index.js` (หรือ Run script: `pnpm start`)
   - Port: `5050`
   - Project Name: `vps-api`
3. **สร้าง Service 2 (Web)**:
   - Path: `/www/wwwroot/vocational-plan-system/apps/web`
   - Run script: `pnpm start`
   - Port: `3005`
   - Project Name: `vps-web`

---

## 3. ปัญหาที่พบบ่อย (Troubleshooting บน aaPanel)

1. **Error: `Can't connect to MySQL server` จาก Docker**:
   - บน aaPanel ให้ไปที่เมนู **Security** -> เปิด Firewall Port `3306`
   - ที่เมนู **Databases** -> แก้ไข Permission ของ User ให้เป็น `Everyone` หรือ IP Docker Gateway `172.17.0.1`
2. **Error: `pnpm: command not found`**:
   - รัน `npm install -g pnpm`
3. **หน้าเว็บขึ้น 502 Bad Gateway**:
   - ตรวจสอบว่า Container หรือ Process Node.js กำลังรันอยู่หรือไม่ ด้วยคำสั่ง `docker compose ps` หรือ `pm2 status`
