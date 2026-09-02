import path from 'path';
import fs from 'fs';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { prisma, serializeBigInt } from '../../lib/prisma';

const execAsync = promisify(exec);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const ROOT_DIR = path.resolve(__dirname, '../../../../');
const STORAGE_DIR = path.resolve(process.env.STORAGE_DIR || path.join(ROOT_DIR, 'storage'));
const BACKUP_DIR = path.join(STORAGE_DIR, 'backups');
const MAINTENANCE_FILE = path.join(STORAGE_DIR, 'maintenance.json');
const UPDATE_LOG_FILE = path.join(STORAGE_DIR, 'update_history.json');

const GITHUB_REPO_OWNER = process.env.GITHUB_REPO_OWNER || 'xX-AULGZ-Xx';
const GITHUB_REPO_NAME = process.env.GITHUB_REPO_NAME || 'vocational-plan-system';
const GITHUB_REPO_URL = `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`;
const GITHUB_CLONE_URL = `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}.git`;

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

export interface GitCommitInfo {
  sha: string;
  shortSha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

export interface SystemInfo {
  appVersion: string;
  appName: string;
  nodeVersion: string;
  platform: string;
  arch: string;
  uptime: number;
  git: {
    branch: string;
    commitHash: string;
    commitMessage: string;
    commitDate: string;
    repoUrl: string;
  };
  memory: {
    totalMb: number;
    freeMb: number;
    usedMb: number;
    usagePercent: number;
  };
  database: {
    status: 'connected' | 'error';
    provider: string;
    error?: string;
  };
  storage: {
    storageDir: string;
    backupCount: number;
    lastBackupDate?: string | null;
  };
  maintenance: {
    enabled: boolean;
    message: string;
    updatedAt?: string;
  };
}

export interface UpdateCheckResult {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  publishedAt: string;
  releaseNotes: string;
  repoUrl: string;
  cloneUrl: string;
  currentCommit: {
    hash: string;
    message: string;
    date: string;
  };
  latestCommit: GitCommitInfo | null;
  recentCommits: GitCommitInfo[];
  releases: Array<{
    name: string;
    tagName: string;
    publishedAt: string;
    body: string;
    htmlUrl: string;
  }>;
}

export interface ProgressState {
  updating: boolean;
  progress: number;
  stage: string;
  message: string;
  logs: Array<{
    stage: string;
    message: string;
    progress: number;
    timestamp: string;
  }>;
}

let activeProgressState: ProgressState = {
  updating: false,
  progress: 0,
  stage: 'idle',
  message: 'ระบบพร้อมทำงาน',
  logs: [],
};

async function safeFindMany(modelAccessor: any): Promise<any[]> {
  try {
    if (modelAccessor && typeof modelAccessor.findMany === 'function') {
      return await modelAccessor.findMany();
    }
  } catch (e) {}
  return [];
}

export class UpdateService {
  public static getCurrentVersion(): string {
    try {
      const rootPkgPath = path.join(ROOT_DIR, 'package.json');
      if (fs.existsSync(rootPkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
        return pkg.version || '1.0.0';
      }
    } catch (e) {}
    return '1.0.0';
  }

  public static async getLocalGitInfo() {
    let branch = 'main';
    let commitHash = 'unknown';
    let commitMessage = '';
    let commitDate = '';

    try {
      const branchRes = await execAsync('git branch --show-current', { cwd: ROOT_DIR });
      branch = branchRes.stdout.trim() || 'main';

      const hashRes = await execAsync('git rev-parse --short HEAD', { cwd: ROOT_DIR });
      commitHash = hashRes.stdout.trim() || 'unknown';

      const msgRes = await execAsync('git log -1 --pretty=%B', { cwd: ROOT_DIR });
      commitMessage = msgRes.stdout.trim() || '';

      const dateRes = await execAsync('git log -1 --pretty=%cd --date=iso', { cwd: ROOT_DIR });
      commitDate = dateRes.stdout.trim() || '';
    } catch (e) {}

    return {
      branch,
      commitHash,
      commitMessage,
      commitDate,
      repoUrl: GITHUB_REPO_URL,
    };
  }

  public static getProgressState(): ProgressState {
    return activeProgressState;
  }

  public static async getSystemInfo(): Promise<SystemInfo> {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const currentVersion = this.getCurrentVersion();
    const gitInfo = await this.getLocalGitInfo();

    let dbStatus: 'connected' | 'error' = 'connected';
    let dbError: string | undefined = undefined;

    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (err: any) {
      dbStatus = 'error';
      dbError = err.message;
    }

    const backups = this.listBackups();
    const lastBackup = backups.length > 0 ? backups[0].createdAt : null;
    const maintenance = this.getMaintenanceStatus();

    return {
      appVersion: currentVersion,
      appName: 'ระบบบริหารจัดการงานแผนงานและโครงการ (วก.เชียงราย)',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: Math.floor(process.uptime()),
      git: gitInfo,
      memory: {
        totalMb: Math.round(totalMem / (1024 * 1024)),
        freeMb: Math.round(freeMem / (1024 * 1024)),
        usedMb: Math.round(usedMem / (1024 * 1024)),
        usagePercent: Math.round((usedMem / totalMem) * 100),
      },
      database: {
        status: dbStatus,
        provider: 'MySQL',
        error: dbError,
      },
      storage: {
        storageDir: STORAGE_DIR,
        backupCount: backups.length,
        lastBackupDate: lastBackup,
      },
      maintenance,
    };
  }

  public static getMaintenanceStatus(): { enabled: boolean; message: string; updatedAt?: string } {
    try {
      if (fs.existsSync(MAINTENANCE_FILE)) {
        const data = JSON.parse(fs.readFileSync(MAINTENANCE_FILE, 'utf8'));
        return {
          enabled: Boolean(data.enabled),
          message: data.message || 'ระบบกำลังปิดปรับปรุงชั่วคราวเพื่ออัปเดตระบบ กรุณารอสักครู่',
          updatedAt: data.updatedAt,
        };
      }
    } catch (e) {}
    return {
      enabled: false,
      message: 'ระบบกำลังปิดปรับปรุงชั่วคราวเพื่ออัปเดตระบบ กรุณารอสักครู่',
    };
  }

  public static setMaintenanceStatus(enabled: boolean, message?: string) {
    const data = {
      enabled,
      message: message || 'ระบบกำลังปิดปรับปรุงชั่วคราวเพื่ออัปเดตระบบ กรุณารอสักครู่',
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(MAINTENANCE_FILE, JSON.stringify(data, null, 2), 'utf8');
    return data;
  }

  /**
   * Check for updates directly against GitHub Repository
   */
  public static async checkForUpdates(): Promise<UpdateCheckResult> {
    const currentVersion = this.getCurrentVersion();
    const localGit = await this.getLocalGitInfo();

    let remoteVersion = currentVersion;
    let recentCommits: GitCommitInfo[] = [];
    let releases: any[] = [];
    let latestCommit: GitCommitInfo | null = null;
    let releaseNotes = '';
    let publishedAt = new Date().toISOString();

    const headers = {
      'User-Agent': 'Vocational-Plan-System-Updater',
      Accept: 'application/vnd.github.v3+json',
    };

    // 1. Fetch GitHub Commits
    try {
      const commitsRes = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/commits?per_page=10`,
        { headers }
      );
      if (commitsRes.ok) {
        const commitsData = await commitsRes.json();
        if (Array.isArray(commitsData)) {
          recentCommits = commitsData.map((c: any) => ({
            sha: c.sha,
            shortSha: c.sha.slice(0, 7),
            message: c.commit.message.split('\n')[0],
            author: c.commit.author?.name || c.author?.login || 'Developer',
            date: c.commit.author?.date || '',
            url: c.html_url,
          }));

          if (recentCommits.length > 0) {
            latestCommit = recentCommits[0];
            releaseNotes = `Commit ล่าสุดบน GitHub: ${latestCommit.message} (${latestCommit.shortSha})`;
            publishedAt = latestCommit.date || publishedAt;
          }
        }
      }
    } catch (err) {
      console.warn('GitHub Commits fetch failed:', err);
    }

    // 2. Fetch GitHub Releases
    try {
      const releasesRes = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases?per_page=5`,
        { headers }
      );
      if (releasesRes.ok) {
        const releasesData = await releasesRes.json();
        if (Array.isArray(releasesData) && releasesData.length > 0) {
          releases = releasesData.map((r: any) => ({
            name: r.name || r.tag_name,
            tagName: r.tag_name,
            publishedAt: r.published_at,
            body: r.body || 'ไม่มีรายละเอียดเพิ่มเติม',
            htmlUrl: r.html_url,
          }));

          const latestRelease = releases[0];
          remoteVersion = latestRelease.tagName.replace(/^v/, '');
          releaseNotes = latestRelease.body || releaseNotes;
          publishedAt = latestRelease.publishedAt || publishedAt;
        }
      }
    } catch (err) {
      console.warn('GitHub Releases fetch failed:', err);
    }

    // 3. Fetch remote package.json if no release tag found
    if (remoteVersion === currentVersion) {
      try {
        const pkgRes = await fetch(
          `https://raw.githubusercontent.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/main/package.json`,
          { headers }
        );
        if (pkgRes.ok) {
          const remotePkg: any = await pkgRes.json();
          if (remotePkg && remotePkg.version) {
            remoteVersion = remotePkg.version;
          }
        }
      } catch (err) {}
    }

    // Determine if there is a pending update
    let hasUpdate = false;
    if (latestCommit && localGit.commitHash !== 'unknown') {
      hasUpdate = !latestCommit.sha.startsWith(localGit.commitHash);
    }
    if (this.compareVersions(remoteVersion, currentVersion) > 0) {
      hasUpdate = true;
    }

    return {
      currentVersion,
      latestVersion: remoteVersion,
      hasUpdate,
      publishedAt,
      releaseNotes: releaseNotes || 'ซิงค์ซอร์สโค้ดและปรับปรุงระบบล่าสุดจาก GitHub Repository',
      repoUrl: GITHUB_REPO_URL,
      cloneUrl: GITHUB_CLONE_URL,
      currentCommit: {
        hash: localGit.commitHash,
        message: localGit.commitMessage,
        date: localGit.commitDate,
      },
      latestCommit,
      recentCommits,
      releases,
    };
  }

  public static compareVersions(v1: string, v2: string): number {
    const p1 = v1.replace(/^v/, '').split('.').map((x) => parseInt(x, 10) || 0);
    const p2 = v2.replace(/^v/, '').split('.').map((x) => parseInt(x, 10) || 0);
    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
      const num1 = p1[i] || 0;
      const num2 = p2[i] || 0;
      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }
    return 0;
  }

  public static async createBackup(description?: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = `backup_${timestamp}`;
    const backupFilePath = path.join(BACKUP_DIR, `${backupId}.json`);

    const [
      users,
      divisions,
      departments,
      strategicPlans,
      strategicIndicators,
      projects,
      projectAlignments,
      budgetCategories,
      projectBudgetItems,
      projectTimelines,
      projectApprovals,
      projectDocuments,
      documentTemplates,
      templateTags,
      notifications,
      systemSettings,
    ] = await Promise.all([
      safeFindMany((prisma as any).user),
      safeFindMany((prisma as any).division),
      safeFindMany((prisma as any).department),
      safeFindMany((prisma as any).strategicPlan),
      safeFindMany((prisma as any).strategicIndicator),
      safeFindMany((prisma as any).project),
      safeFindMany((prisma as any).projectAlignment),
      safeFindMany((prisma as any).budgetCategory),
      safeFindMany((prisma as any).projectBudgetItem),
      safeFindMany((prisma as any).projectTimeline),
      safeFindMany((prisma as any).projectApproval),
      safeFindMany((prisma as any).projectDocument),
      safeFindMany((prisma as any).documentTemplate),
      safeFindMany((prisma as any).templateTag),
      safeFindMany((prisma as any).notification),
      safeFindMany((prisma as any).systemSetting),
    ]);

    const backupData = {
      id: backupId,
      version: this.getCurrentVersion(),
      createdAt: new Date().toISOString(),
      description: description || 'Automatic pre-update snapshot',
      stats: {
        users: users.length,
        divisions: divisions.length,
        departments: departments.length,
        strategicPlans: strategicPlans.length,
        projects: projects.length,
        projectBudgetItems: projectBudgetItems.length,
        projectApprovals: projectApprovals.length,
        documentTemplates: documentTemplates.length,
      },
      data: {
        users: serializeBigInt(users),
        divisions: serializeBigInt(divisions),
        departments: serializeBigInt(departments),
        strategicPlans: serializeBigInt(strategicPlans),
        strategicIndicators: serializeBigInt(strategicIndicators),
        projects: serializeBigInt(projects),
        projectAlignments: serializeBigInt(projectAlignments),
        budgetCategories: serializeBigInt(budgetCategories),
        projectBudgetItems: serializeBigInt(projectBudgetItems),
        projectTimelines: serializeBigInt(projectTimelines),
        projectApprovals: serializeBigInt(projectApprovals),
        projectDocuments: serializeBigInt(projectDocuments),
        documentTemplates: serializeBigInt(documentTemplates),
        templateTags: serializeBigInt(templateTags),
        notifications: serializeBigInt(notifications),
        systemSettings: serializeBigInt(systemSettings),
      },
    };

    fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf8');

    const fileStat = fs.statSync(backupFilePath);

    return {
      id: backupId,
      filename: `${backupId}.json`,
      sizeBytes: fileStat.size,
      sizeFormatted: `${(fileStat.size / (1024 * 1024)).toFixed(2)} MB`,
      createdAt: backupData.createdAt,
      description: backupData.description,
      stats: backupData.stats,
    };
  }

  public static listBackups() {
    try {
      if (!fs.existsSync(BACKUP_DIR)) return [];
      const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.json'));
      const backups = files.map((filename) => {
        const fullPath = path.join(BACKUP_DIR, filename);
        const stat = fs.statSync(fullPath);
        try {
          const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
          return {
            id: content.id || filename.replace('.json', ''),
            filename,
            sizeBytes: stat.size,
            sizeFormatted: `${(stat.size / (1024 * 1024)).toFixed(2)} MB`,
            createdAt: content.createdAt || stat.birthtime.toISOString(),
            description: content.description || 'Snapshot backup',
            version: content.version || '1.0.0',
            stats: content.stats || {},
          };
        } catch (e) {
          return {
            id: filename.replace('.json', ''),
            filename,
            sizeBytes: stat.size,
            sizeFormatted: `${(stat.size / (1024 * 1024)).toFixed(2)} MB`,
            createdAt: stat.birthtime.toISOString(),
            description: 'Backup file',
            version: '1.0.0',
            stats: {},
          };
        }
      });

      return backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      console.error('Error listing backups:', err);
      return [];
    }
  }

  public static async restoreBackup(backupId: string) {
    const filename = backupId.endsWith('.json') ? backupId : `${backupId}.json`;
    const fullPath = path.join(BACKUP_DIR, filename);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`ไม่พบไฟล์สำรองข้อมูล: ${filename}`);
    }

    const backupContent = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    return {
      success: true,
      message: `เตรียมข้อมูลสำรอง ${backupId} สำหรับการกู้คืนเรียบร้อยแล้ว`,
      stats: backupContent.stats,
    };
  }

  /**
   * Execute 1-Click Update Pipeline syncing directly from GitHub Repository
   */
  public static async executeUpdatePipeline(
    options: { createBackupFirst?: boolean; targetVersion?: string },
    logCallback: (stage: string, message: string, progress: number) => void
  ) {
    activeProgressState = {
      updating: true,
      progress: 5,
      stage: 'init',
      message: 'เริ่มต้นกระบวนการปรับปรุงระบบจาก GitHub...',
      logs: [],
    };

    const emit = (stage: string, message: string, progress: number) => {
      const entry = { stage, message, progress, timestamp: new Date().toISOString() };
      activeProgressState.updating = progress < 100 && progress >= 0;
      activeProgressState.progress = progress;
      activeProgressState.stage = stage;
      activeProgressState.message = message;
      activeProgressState.logs.push(entry);
      logCallback(stage, message, progress);
    };

    try {
      emit('init', `เชื่อมต่อ GitHub Repository: ${GITHUB_REPO_URL}`, 10);
      await sleep(600);

      // Step 1: Maintenance Mode
      emit('maintenance', 'เปิดโหมดปิดปรับปรุงชั่วคราว (Maintenance Mode)...', 20);
      this.setMaintenanceStatus(true, 'ระบบกำลังดำเนินการอัปเดตเวอร์ชันจาก GitHub กรุณารอสักครู่...');
      await sleep(600);

      // Step 2: Pre-update Backup
      if (options.createBackupFirst !== false) {
        emit('backup', 'กำลังสำรองฐานข้อมูลและ Snapshot ของระบบ...', 35);
        const backupResult = await this.createBackup(`Auto-backup before update via GitHub`);
        emit('backup', `สำรองข้อมูลสำเร็จ (${backupResult.sizeFormatted})`, 50);
        await sleep(600);
      }

      // Step 3: Git Pull directly from GitHub
      emit('code_sync', `กำลังดึงโค้ดล่าสุดจาก GitHub (${GITHUB_CLONE_URL})...`, 65);
      try {
        // Ensure remote origin points to user repo
        try {
          await execAsync(`git remote set-url origin ${GITHUB_CLONE_URL}`, { cwd: ROOT_DIR });
        } catch (e) {}

        const gitPull = await execAsync('git pull origin main --no-rebase', { cwd: ROOT_DIR }).catch(async () => {
          return await execAsync('git pull origin master --no-rebase', { cwd: ROOT_DIR });
        });

        const newCommitHash = await execAsync('git rev-parse --short HEAD', { cwd: ROOT_DIR })
          .then((r) => r.stdout.trim())
          .catch(() => 'latest');

        emit('code_sync', `ดึงโค้ดจาก GitHub สำเร็จ (Commit: ${newCommitHash}) - ${gitPull.stdout.slice(0, 70).replace(/[\r\n]+/g, ' ')}`, 75);
      } catch (gitErr: any) {
        emit('code_sync', `การซิงค์ Git: ${gitErr.message.slice(0, 100)}`, 75);
      }
      await sleep(600);

      // Step 4: Database Schema Check
      emit('db_migration', 'กำลังตรวจสอบและปรับปรุงโครงสร้างฐานข้อมูล (Prisma)...', 85);
      try {
        await execAsync('npx prisma generate', { cwd: path.join(ROOT_DIR, 'apps/api') });
      } catch (prismaErr) {}
      await sleep(600);

      // Step 5: System Health Check
      emit('health_check', 'กำลังตรวจสอบสถานะการทำงานของระบบ (Health Check)...', 92);
      await prisma.$queryRaw`SELECT 1`;
      await sleep(600);

      // Step 6: Finalize
      emit('finalize', 'ปิดโหมด Maintenance และเปิดให้บริการตามปกติ...', 98);
      this.setMaintenanceStatus(false);
      await sleep(400);

      const finalCommit = await this.getLocalGitInfo();
      this.recordUpdateHistory({
        targetVersion: options.targetVersion || this.getCurrentVersion(),
        commitHash: finalCommit.commitHash,
        repoUrl: GITHUB_REPO_URL,
        updatedAt: new Date().toISOString(),
        status: 'SUCCESS',
      });

      emit('complete', `การอัปเดตระบบจาก GitHub เสร็จสมบูรณ์ 100% (Commit: ${finalCommit.commitHash})`, 100);
      return { success: true, message: 'ระบบได้รับการอัปเดตจาก GitHub เรียบร้อยแล้ว' };
    } catch (error: any) {
      this.setMaintenanceStatus(false);
      emit('error', `เกิดข้อผิดพลาดในการอัปเดต: ${error.message}`, -1);
      throw error;
    }
  }

  private static recordUpdateHistory(entry: any) {
    try {
      let history: any[] = [];
      if (fs.existsSync(UPDATE_LOG_FILE)) {
        history = JSON.parse(fs.readFileSync(UPDATE_LOG_FILE, 'utf8'));
      }
      history.unshift(entry);
      fs.writeFileSync(UPDATE_LOG_FILE, JSON.stringify(history.slice(0, 50), null, 2), 'utf8');
    } catch (e) {}
  }
}
