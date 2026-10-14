import { Request } from 'express';
import { prisma, serializeBigInt } from '../../lib/prisma';
import { AuthRequest } from '../../middlewares/auth';

export interface LogActivityParams {
  userId?: string | bigint | number | null;
  action: string;
  module: string;
  targetId?: string | bigint | number | null;
  targetType?: string | null;
  description: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  oldData?: any;
  newData?: any;
  req?: Request | AuthRequest;
}

export interface GetAuditLogsParams {
  page?: number;
  limit?: number;
  module?: string;
  action?: string;
  userId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Extract client IP address from express request
 */
export function getClientIp(req?: Request): string | null {
  if (!req) return null;
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || null;
}

/**
 * Log activity asynchronously without blocking main flow
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    let resolvedUserId: bigint | null = null;
    const rawUserId = params.userId ?? (params.req as AuthRequest)?.user?.id;
    if (rawUserId) {
      resolvedUserId = BigInt(rawUserId.toString());
    }

    const ipAddress = params.ipAddress ?? getClientIp(params.req);
    const userAgent = params.userAgent ?? (params.req?.headers['user-agent'] as string) ?? null;

    let sanitizedOldData = params.oldData ? serializeBigInt(params.oldData) : undefined;
    let sanitizedNewData = params.newData ? serializeBigInt(params.newData) : undefined;

    // Do not log sensitive passwords
    if (sanitizedOldData && typeof sanitizedOldData === 'object') {
      if ('password' in sanitizedOldData) delete (sanitizedOldData as any).password;
      if ('password_hash' in sanitizedOldData) delete (sanitizedOldData as any).password_hash;
    }
    if (sanitizedNewData && typeof sanitizedNewData === 'object') {
      if ('password' in sanitizedNewData) delete (sanitizedNewData as any).password;
      if ('password_hash' in sanitizedNewData) delete (sanitizedNewData as any).password_hash;
    }

    await prisma.auditLog.create({
      data: {
        user_id: resolvedUserId,
        action: params.action.toUpperCase(),
        module: params.module.toUpperCase(),
        target_id: params.targetId ? params.targetId.toString() : null,
        target_type: params.targetType || null,
        description: params.description,
        ip_address: ipAddress,
        user_agent: userAgent,
        old_data: sanitizedOldData ?? null,
        new_data: sanitizedNewData ?? null,
      },
    });
  } catch (err) {
    // Non-blocking error catch
    console.error('[AuditLog] Failed to record audit log:', err);
  }
}

/**
 * Query audit logs with pagination and filters
 */
export async function getAuditLogs(params: GetAuditLogsParams) {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
  const skip = (page - 1) * limit;

  const where: any = {};

  if (params.module && params.module !== 'ALL') {
    where.module = params.module.toUpperCase();
  }

  if (params.action && params.action !== 'ALL') {
    where.action = params.action.toUpperCase();
  }

  if (params.userId && params.userId !== 'ALL') {
    where.user_id = BigInt(params.userId);
  }

  // Date range filter
  if (params.startDate || params.endDate) {
    where.created_at = {};
    if (params.startDate) {
      const start = new Date(params.startDate);
      if (!isNaN(start.getTime())) {
        if (params.startDate.length <= 10) {
          start.setHours(0, 0, 0, 0);
        }
        where.created_at.gte = start;
      }
    }
    if (params.endDate) {
      const end = new Date(params.endDate);
      if (!isNaN(end.getTime())) {
        if (params.endDate.length <= 10) {
          end.setHours(23, 59, 59, 999);
        }
        where.created_at.lte = end;
      }
    }
  }

  // Keyword search
  if (params.search && params.search.trim()) {
    const q = params.search.trim();
    where.OR = [
      { description: { contains: q } },
      { target_id: { contains: q } },
      { ip_address: { contains: q } },
      {
        user: {
          OR: [
            { full_name: { contains: q } },
            { username: { contains: q } },
          ],
        },
      },
    ];
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
            username: true,
            role: true,
            position: true,
            avatar_url: true,
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    data: serializeBigInt(logs),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get single audit log detail with full snapshots
 */
export async function getAuditLogById(id: string | bigint) {
  const log = await prisma.auditLog.findUnique({
    where: { id: BigInt(id.toString()) },
    include: {
      user: {
        select: {
          id: true,
          full_name: true,
          username: true,
          role: true,
          position: true,
          avatar_url: true,
          department: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  return log ? serializeBigInt(log) : null;
}

/**
 * Get statistics for dashboard overview
 */
export async function getAuditLogStats() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [totalLogs, todayLogs, moduleCountsGroup, uniqueUsersGroup, recentActions] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.count({
      where: { created_at: { gte: todayStart } },
    }),
    prisma.auditLog.groupBy({
      by: ['module'],
      _count: { _all: true },
    }),
    prisma.auditLog.groupBy({
      by: ['user_id'],
      where: { user_id: { not: null } },
    }),
    prisma.auditLog.findMany({
      take: 5,
      orderBy: { created_at: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
            role: true,
          },
        },
      },
    }),
  ]);

  const moduleBreakdown: Record<string, number> = {};
  moduleCountsGroup.forEach((m) => {
    moduleBreakdown[m.module] = m._count._all;
  });

  return {
    totalLogs: totalLogs || 0,
    todayLogs: todayLogs || 0,
    moduleBreakdown,
    moduleCounts: moduleBreakdown,
    uniqueUsersCount: uniqueUsersGroup?.length || 0,
    recentActions: serializeBigInt(recentActions),
  };
}

/**
 * Export logs for CSV output (limit to 5000 records)
 */
export async function getLogsForExport(params: Omit<GetAuditLogsParams, 'page' | 'limit'>) {
  const result = await getAuditLogs({
    ...params,
    page: 1,
    limit: 5000,
  });
  return result.data;
}
