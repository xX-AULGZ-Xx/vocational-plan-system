import { prisma, serializeBigInt } from '../../lib/prisma';
import { wsManager } from '../notifications/socket.manager';
import { ChatRoomType } from '@prisma/client';

export class ChatService {
  /**
   * Get all chat rooms for a given user with unread counts, latest message, and online status
   */
  async getUserRooms(userId: bigint) {
    const userParticipants = await prisma.chatParticipant.findMany({
      where: { user_id: userId },
      include: {
        room: {
          include: {
            project: {
              select: {
                id: true,
                project_code: true,
                title: true,
                status: true,
                total_budget: true,
                fiscal_year: true,
                department: {
                  select: { id: true, name: true },
                },
              },
            },
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    full_name: true,
                    username: true,
                    avatar_url: true,
                    role: true,
                    position: true,
                    department: {
                      select: { id: true, name: true },
                    },
                  },
                },
              },
            },
            messages: {
              where: { is_deleted: false },
              orderBy: { created_at: 'desc' },
              take: 1,
              include: {
                sender: {
                  select: {
                    id: true,
                    full_name: true,
                    avatar_url: true,
                  },
                },
                attachments: true,
                reactions: {
                  include: {
                    user: {
                      select: { id: true, full_name: true, username: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        room: {
          updated_at: 'desc',
        },
      },
    });

    const roomsWithDetails = await Promise.all(
      userParticipants.map(async (up) => {
        const room = up.room;
        const lastMessage = room.messages[0] || null;

        // Unread messages count for this user
        const unreadCount = await prisma.chatMessage.count({
          where: {
            room_id: room.id,
            is_deleted: false,
            sender_id: { not: userId },
            ...(up.last_read_at ? { created_at: { gt: up.last_read_at } } : {}),
          },
        });

        // Other participants (excluding current user if direct)
        const otherParticipants = room.participants
          .filter((p) => p.user_id !== userId)
          .map((p) => ({
            ...p,
            user: {
              ...p.user,
              is_online: wsManager.isUserOnline(p.user_id),
            },
          }));

        // Display name and avatar resolution
        let displayName = room.name;
        let displayAvatar = room.avatar_url;
        let subtitle = '';

        if (room.type === 'DIRECT') {
          const otherUser = otherParticipants[0]?.user;
          if (otherUser) {
            displayName = otherUser.full_name;
            displayAvatar = otherUser.avatar_url || null;
            subtitle = otherUser.position || otherUser.department?.name || otherUser.role;
          } else {
            displayName = 'แชทส่วนตัว';
          }
        } else if (room.type === 'PROJECT') {
          displayName = room.project?.title || room.name || 'ห้องแชทโครงการ';
          subtitle = room.project?.project_code ? `รหัส: ${room.project.project_code}` : 'ห้องปรึกษาโครงการ';
        } else if (room.type === 'GROUP') {
          subtitle = `${room.participants.length} สมาชิก`;
        }

        return {
          id: room.id.toString(),
          type: room.type,
          name: room.name,
          displayName,
          displayAvatar,
          subtitle,
          description: room.description,
          project_id: room.project_id ? room.project_id.toString() : null,
          project: room.project ? serializeBigInt(room.project) : null,
          unread_count: unreadCount,
          last_read_at: up.last_read_at,
          last_message: lastMessage ? serializeBigInt(lastMessage) : null,
          participants: room.participants.map((p) => ({
            id: p.id.toString(),
            user_id: p.user_id.toString(),
            role: p.role,
            is_muted: p.is_muted,
            user: {
              ...serializeBigInt(p.user),
              is_online: wsManager.isUserOnline(p.user_id),
            },
          })),
          updated_at: room.updated_at,
          created_at: room.created_at,
        };
      })
    );

    // Sort rooms by latest activity (last message created_at or room updated_at)
    roomsWithDetails.sort((a, b) => {
      const timeA = a.last_message?.created_at ? new Date(a.last_message.created_at).getTime() : new Date(a.updated_at).getTime();
      const timeB = b.last_message?.created_at ? new Date(b.last_message.created_at).getTime() : new Date(b.updated_at).getTime();
      return timeB - timeA;
    });

    return roomsWithDetails;
  }

  /**
   * Get or create a 1-on-1 direct chat room
   */
  async getOrCreateDirectRoom(userId: bigint, targetUserId: bigint) {
    if (userId === targetUserId) {
      throw new Error('ไม่สามารถสร้างห้องแชทกับตัวเองได้');
    }

    // Find if a direct room already exists between these 2 users
    const existingDirectRooms = await prisma.chatRoom.findMany({
      where: {
        type: 'DIRECT',
        AND: [
          { participants: { some: { user_id: userId } } },
          { participants: { some: { user_id: targetUserId } } },
        ],
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                full_name: true,
                username: true,
                avatar_url: true,
                role: true,
                position: true,
                department: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (existingDirectRooms.length > 0) {
      return serializeBigInt(existingDirectRooms[0]);
    }

    // Create new direct room
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { full_name: true },
    });

    if (!targetUser) {
      throw new Error('ไม่พบผู้ใช้งานที่ต้องการเริ่มแชท');
    }

    const newRoom = await prisma.chatRoom.create({
      data: {
        type: 'DIRECT',
        created_by: userId,
        participants: {
          create: [
            { user_id: userId, role: 'OWNER' },
            { user_id: targetUserId, role: 'MEMBER' },
          ],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                full_name: true,
                username: true,
                avatar_url: true,
                role: true,
                position: true,
                department: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    return serializeBigInt(newRoom);
  }

  /**
   * Get or create project room and automatically sync project stakeholders from proposal & dynamic_data
   */
  async getOrCreateProjectRoom(projectId: bigint, currentUserId: bigint) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        leader: { select: { id: true, full_name: true } },
        department: true,
        approvals: { select: { approver_id: true } },
      },
    });

    if (!project) {
      throw new Error('ไม่พบข้อมูลโครงการ');
    }

    // 1. Fetch all active users to match proposal names and planning officers
    const allUsers = await prisma.user.findMany({
      where: { is_active: true },
      select: {
        id: true,
        full_name: true,
        username: true,
        role: true,
        position: true,
      },
    });

    const normalizeName = (name: string) =>
      name
        ? name
            .replace(/^(นาย|นางสาว|นาง|น\.ส\.|ดร\.|อ\.|อาจารย์|ผศ\.|รศ\.|ศ\.)\s*/, '')
            .replace(/\s+/g, ' ')
            .trim()
        : '';

    const stakeholderUserIds = new Set<string>();

    // A. Project Leader
    if (project.leader_id) {
      stakeholderUserIds.add(project.leader_id.toString());
    }

    // B. Current User
    if (currentUserId) {
      stakeholderUserIds.add(currentUserId.toString());
    }

    // C. Approvers in project approval pipeline
    if (project.approvals) {
      project.approvals.forEach((a) => {
        if (a.approver_id) stakeholderUserIds.add(a.approver_id.toString());
      });
    }

    // D. Scan dynamic_data in project proposal (proposer, committee, responsible persons, endorser, etc.)
    let dyn: any = project.dynamic_data;
    if (typeof dyn === 'string') {
      try {
        dyn = JSON.parse(dyn);
      } catch {}
    }

    const candidateNames = new Set<string>();
    if (dyn && typeof dyn === 'object') {
      for (const [k, v] of Object.entries(dyn)) {
        if (typeof v === 'string' && v.trim()) {
          const lowerK = k.toLowerCase();
          if (
            lowerK.includes('name') ||
            lowerK.includes('leader') ||
            lowerK.includes('proposer') ||
            lowerK.includes('endorser') ||
            lowerK.includes('approver') ||
            lowerK.includes('head') ||
            lowerK.includes('director') ||
            lowerK.includes('reporter') ||
            lowerK.includes('teacher') ||
            lowerK.includes('member') ||
            lowerK.includes('committee') ||
            lowerK.includes('coordinator') ||
            lowerK.includes('consultant')
          ) {
            candidateNames.add(v.trim());
          }
        } else if (Array.isArray(v)) {
          // Table loops (e.g. committee, team members)
          v.forEach((row) => {
            if (row && typeof row === 'object') {
              for (const [, rv] of Object.entries(row)) {
                if (typeof rv === 'string' && rv.trim()) {
                  candidateNames.add(rv.trim());
                }
              }
            }
          });
        }
      }
    }

    // Match candidate names from proposal against active users
    for (const name of candidateNames) {
      const norm = normalizeName(name);
      if (!norm || norm.length < 3) continue;

      const matchedUser = allUsers.find((u) => {
        const uNorm = normalizeName(u.full_name);
        return (
          uNorm === norm ||
          u.full_name.trim() === name.trim() ||
          (norm.length >= 5 && (uNorm.includes(norm) || norm.includes(uNorm)))
        );
      });

      if (matchedUser) {
        stakeholderUserIds.add(matchedUser.id.toString());
      }
    }

    // E. Planning officers & Key Admins
    allUsers
      .filter((u) => ['PLANNING_OFFICER', 'ADMIN', 'DIRECTOR', 'DEPUTY_DIRECTOR'].includes(u.role))
      .forEach((u) => stakeholderUserIds.add(u.id.toString()));

    let room = await prisma.chatRoom.findFirst({
      where: {
        type: 'PROJECT',
        project_id: projectId,
      },
      include: {
        project: {
          select: {
            id: true,
            project_code: true,
            title: true,
            status: true,
            total_budget: true,
            fiscal_year: true,
            department: { select: { id: true, name: true } },
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                full_name: true,
                username: true,
                avatar_url: true,
                role: true,
                position: true,
                department: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!room) {
      // Create new Project Chat Room with all stakeholders from proposal
      room = await prisma.chatRoom.create({
        data: {
          type: 'PROJECT',
          name: `ห้องปรึกษา: ${project.title}`,
          description: `ห้องสนทนาและติดตามงานโครงการ ${project.project_code || ''} - ${project.title}`,
          project_id: projectId,
          created_by: currentUserId,
          participants: {
            create: Array.from(stakeholderUserIds).map((uid) => ({
              user_id: BigInt(uid),
              role: uid === project.leader_id?.toString() ? 'OWNER' : 'MEMBER',
            })),
          },
        },
        include: {
          project: {
            select: {
              id: true,
              project_code: true,
              title: true,
              status: true,
              total_budget: true,
              fiscal_year: true,
              department: { select: { id: true, name: true } },
            },
          },
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  full_name: true,
                  username: true,
                  avatar_url: true,
                  role: true,
                  position: true,
                  department: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      });

      // Post initial system message
      await prisma.chatMessage.create({
        data: {
          room_id: room.id,
          sender_id: currentUserId,
          message_type: 'PROJECT_CARD',
          content: `เปิดห้องปรึกษาโครงการ "${project.title}"`,
          metadata: {
            project_id: project.id.toString(),
            project_code: project.project_code,
            title: project.title,
            status: project.status,
            total_budget: project.total_budget,
            fiscal_year: project.fiscal_year,
            department_name: project.department?.name,
          },
        },
      });
    } else {
      // Room already exists: Synchronize any new stakeholders from proposal into participants
      const existingParticipantIds = new Set(room.participants.map((p) => p.user_id.toString()));
      const missingStakeholderIds = Array.from(stakeholderUserIds).filter(
        (uid) => !existingParticipantIds.has(uid)
      );

      if (missingStakeholderIds.length > 0) {
        await prisma.chatParticipant.createMany({
          data: missingStakeholderIds.map((uid) => ({
            room_id: room!.id,
            user_id: BigInt(uid),
            role: uid === project.leader_id?.toString() ? 'OWNER' : 'MEMBER',
          })),
        });
      }

      // Re-fetch updated room participants
      room = (await prisma.chatRoom.findUnique({
        where: { id: room.id },
        include: {
          project: {
            select: {
              id: true,
              project_code: true,
              title: true,
              status: true,
              total_budget: true,
              fiscal_year: true,
              department: { select: { id: true, name: true } },
            },
          },
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  full_name: true,
                  username: true,
                  avatar_url: true,
                  role: true,
                  position: true,
                  department: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      }))!;
    }

    return serializeBigInt(room);
  }

  /**
   * Create a group chat
   */
  async createGroupRoom(creatorId: bigint, name: string, description?: string, participantIds: bigint[] = []) {
    const uniqueUserIds = Array.from(new Set([creatorId.toString(), ...participantIds.map((id) => id.toString())]));

    const room = await prisma.chatRoom.create({
      data: {
        type: 'GROUP',
        name: name || 'กลุ่มสนทนา',
        description: description || null,
        created_by: creatorId,
        participants: {
          create: uniqueUserIds.map((uid) => ({
            user_id: BigInt(uid),
            role: uid === creatorId.toString() ? 'OWNER' : 'MEMBER',
          })),
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                full_name: true,
                username: true,
                avatar_url: true,
                role: true,
                position: true,
                department: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    // Send system message
    const creator = await prisma.user.findUnique({ where: { id: creatorId }, select: { full_name: true } });
    await prisma.chatMessage.create({
      data: {
        room_id: room.id,
        sender_id: creatorId,
        message_type: 'SYSTEM',
        content: `${creator?.full_name || 'ผู้ดูแล'} ได้สร้างกลุ่ม "${name}"`,
      },
    });

    return serializeBigInt(room);
  }

  /**
   * Get messages for a specific chat room
   */
  async getRoomMessages(roomId: bigint, userId: bigint, limit = 50, beforeId?: bigint) {
    // Verify user is a participant
    const participant = await prisma.chatParticipant.findUnique({
      where: {
        room_id_user_id: {
          room_id: roomId,
          user_id: userId,
        },
      },
    });

    if (!participant) {
      throw new Error('คุณไม่ได้เป็นสมาชิกในห้องสนทนานี้');
    }

    const whereClause: any = {
      room_id: roomId,
      is_deleted: false,
    };

    if (beforeId) {
      whereClause.id = { lt: beforeId };
    }

    const messages = await prisma.chatMessage.findMany({
      where: whereClause,
      include: {
        sender: {
          select: {
            id: true,
            full_name: true,
            username: true,
            avatar_url: true,
            role: true,
            position: true,
          },
        },
        reply_to: {
          select: {
            id: true,
            content: true,
            message_type: true,
            sender: {
              select: {
                id: true,
                full_name: true,
                username: true,
              },
            },
          },
        },
        attachments: true,
        reactions: {
          include: {
            user: {
              select: { id: true, full_name: true, username: true },
            },
          },
        },
      },
      orderBy: { id: 'desc' },
      take: limit,
    });

    // Auto mark room as read when fetching messages
    await prisma.chatParticipant.update({
      where: {
        room_id_user_id: {
          room_id: roomId,
          user_id: userId,
        },
      },
      data: {
        last_read_at: new Date(),
      },
    });

    // Return in chronological order (oldest to newest)
    return serializeBigInt(messages.reverse());
  }

  /**
   * Send a message to a chat room
   */
  async sendMessage(
    senderId: bigint,
    roomId: bigint,
    data: {
      content?: string;
      message_type?: string;
      metadata?: any;
      reply_to_id?: bigint;
      attachments?: Array<{
        file_name: string;
        file_url: string;
        file_type: string;
        file_size: number;
      }>;
    }
  ) {
    // Verify participant
    let participant = await prisma.chatParticipant.findUnique({
      where: {
        room_id_user_id: {
          room_id: roomId,
          user_id: senderId,
        },
      },
    });

    if (!participant) {
      // Auto join if room exists
      const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
      if (!room) throw new Error('ไม่พบห้องสนทนานี้');
      participant = await prisma.chatParticipant.create({
        data: {
          room_id: roomId,
          user_id: senderId,
          role: 'MEMBER',
        },
      });
    }

    const newMessage = await prisma.chatMessage.create({
      data: {
        room_id: roomId,
        sender_id: senderId,
        reply_to_id: data.reply_to_id,
        content: data.content || '',
        message_type: data.message_type || (data.attachments && data.attachments.length > 0 ? 'FILE' : 'TEXT'),
        metadata: data.metadata || {},
        attachments: data.attachments && data.attachments.length > 0 ? {
          create: data.attachments.map((att) => ({
            file_name: att.file_name,
            file_url: att.file_url,
            file_type: att.file_type,
            file_size: att.file_size,
          })),
        } : undefined,
      },
      include: {
        sender: {
          select: {
            id: true,
            full_name: true,
            username: true,
            avatar_url: true,
            role: true,
            position: true,
          },
        },
        reply_to: {
          select: {
            id: true,
            content: true,
            message_type: true,
            sender: {
              select: {
                id: true,
                full_name: true,
                username: true,
              },
            },
          },
        },
        attachments: true,
        reactions: {
          include: {
            user: {
              select: { id: true, full_name: true, username: true },
            },
          },
        },
        room: {
          include: {
            participants: {
              select: {
                user_id: true,
              },
            },
          },
        },
      },
    });

    // Update room update timestamp and sender last_read_at
    await prisma.$transaction([
      prisma.chatRoom.update({
        where: { id: roomId },
        data: { updated_at: new Date() },
      }),
      prisma.chatParticipant.update({
        where: {
          room_id_user_id: {
            room_id: roomId,
            user_id: senderId,
          },
        },
        data: { last_read_at: new Date() },
      }),
    ]);

    const serializedMessage = serializeBigInt(newMessage);

    // Broadcast message to room members in real-time
    wsManager.sendToChatRoom(roomId, 'chat_message', serializedMessage);

    // Send instant badge update notification to all other participants
    newMessage.room.participants.forEach((p) => {
      if (p.user_id !== senderId) {
        wsManager.sendToUser(p.user_id, 'chat_notification', {
          room_id: roomId.toString(),
          message: serializedMessage,
          timestamp: new Date().toISOString(),
        });
      }
    });

    return serializedMessage;
  }

  /**
   * Toggle reaction on a message (add if not reacted, remove if already reacted)
   */
  async toggleReaction(userId: bigint, messageId: bigint, emoji: string) {
    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: {
        room: {
          include: {
            participants: {
              select: { user_id: true },
            },
          },
        },
      },
    });

    if (!message) {
      throw new Error('ไม่พบข้อความที่ต้องการ React');
    }

    const isParticipant = message.room.participants.some((p) => p.user_id === userId);
    if (!isParticipant) {
      throw new Error('คุณไม่ได้อยู่ในห้องสนทนานี้');
    }

    const cleanEmoji = emoji.trim();
    if (!cleanEmoji) {
      throw new Error('กรุณาระบุ Emoji ที่ต้องการ React');
    }

    // Check existing reaction
    const existing = await prisma.chatMessageReaction.findUnique({
      where: {
        message_id_user_id_emoji: {
          message_id: messageId,
          user_id: userId,
          emoji: cleanEmoji,
        },
      },
    });

    if (existing) {
      // Remove reaction
      await prisma.chatMessageReaction.delete({
        where: { id: existing.id },
      });
    } else {
      // Add reaction
      await prisma.chatMessageReaction.create({
        data: {
          message_id: messageId,
          user_id: userId,
          emoji: cleanEmoji,
        },
      });
    }

    // Fetch updated reactions for this message
    const allReactions = await prisma.chatMessageReaction.findMany({
      where: { message_id: messageId },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
            username: true,
          },
        },
      },
      orderBy: { created_at: 'asc' },
    });

    const serializedReactions = serializeBigInt(allReactions);

    // Broadcast real-time reaction update to room
    wsManager.sendToChatRoom(message.room_id, 'chat_message_reaction', {
      message_id: messageId.toString(),
      room_id: message.room_id.toString(),
      reactions: serializedReactions,
    });

    return {
      success: true,
      message_id: messageId.toString(),
      reactions: serializedReactions,
    };
  }

  /**
   * Mark room as read for user
   */
  async markRoomAsRead(userId: bigint, roomId: bigint) {
    const now = new Date();
    await prisma.chatParticipant.updateMany({
      where: {
        room_id: roomId,
        user_id: userId,
      },
      data: {
        last_read_at: now,
      },
    });

    wsManager.sendToChatRoom(roomId, 'chat_read_receipt', {
      roomId: roomId.toString(),
      userId: userId.toString(),
      readAt: now.toISOString(),
    });

    return { success: true, read_at: now };
  }

  /**
   * Get total unread count across all rooms for current user
   */
  async getTotalUnreadCount(userId: bigint): Promise<number> {
    const participants = await prisma.chatParticipant.findMany({
      where: { user_id: userId },
      select: { room_id: true, last_read_at: true },
    });

    let totalUnread = 0;
    for (const p of participants) {
      const count = await prisma.chatMessage.count({
        where: {
          room_id: p.room_id,
          is_deleted: false,
          sender_id: { not: userId },
          ...(p.last_read_at ? { created_at: { gt: p.last_read_at } } : {}),
        },
      });
      totalUnread += count;
    }

    return totalUnread;
  }

  /**
   * Search users to start chat
   */
  async searchUsers(query: string, currentUserId: bigint) {
    const users = await prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        is_active: true,
        OR: query
          ? [
              { full_name: { contains: query } },
              { username: { contains: query } },
              { position: { contains: query } },
              { department: { name: { contains: query } } },
            ]
          : undefined,
      },
      select: {
        id: true,
        full_name: true,
        username: true,
        avatar_url: true,
        role: true,
        position: true,
        department: { select: { id: true, name: true } },
      },
      take: 20,
    });

    return users.map((u) => ({
      ...serializeBigInt(u),
      is_online: wsManager.isUserOnline(u.id),
    }));
  }

  /**
   * Delete a chat room and all its messages
   */
  async deleteRoom(userId: bigint, roomId: bigint, userRole?: string) {
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        participants: true,
      },
    });

    if (!room) {
      throw new Error('ไม่พบห้องสนทนานี้');
    }

    const isParticipant = room.participants.some((p) => p.user_id === userId);
    const isOwner = room.created_by === userId || room.participants.some((p) => p.user_id === userId && p.role === 'OWNER');
    const isAdmin = userRole === 'ADMIN';

    // In direct chats, any participant can delete/close the conversation
    // In group/project chats, the owner or admin can delete
    const canDelete = room.type === 'DIRECT' ? isParticipant : (isOwner || isAdmin);

    if (!canDelete) {
      throw new Error('คุณไม่มีสิทธิ์ในการลบห้องสนทนานี้ (เฉพาะผู้สร้างกลุ่มหรือผู้ดูแลระบบ)');
    }

    // Broadcast room deletion to all room participants before deleting from DB
    wsManager.sendToChatRoom(roomId, 'chat_room_deleted', {
      roomId: roomId.toString(),
      deletedBy: userId.toString(),
    });

    room.participants.forEach((p) => {
      wsManager.sendToUser(p.user_id, 'chat_room_deleted', {
        roomId: roomId.toString(),
        deletedBy: userId.toString(),
      });
    });

    // Cascade delete room from DB
    await prisma.chatRoom.delete({
      where: { id: roomId },
    });

    return { success: true, message: 'ลบห้องสนทนาเรียบร้อยแล้ว' };
  }

  /**
   * Search projects to share or create room
   */
  async searchProjects(query: string) {
    const projects = await prisma.project.findMany({
      where: {
        OR: query
          ? [
              { title: { contains: query } },
              { project_code: { contains: query } },
            ]
          : undefined,
      },
      select: {
        id: true,
        project_code: true,
        title: true,
        status: true,
        total_budget: true,
        fiscal_year: true,
        department: { select: { id: true, name: true } },
        leader: { select: { id: true, full_name: true } },
      },
      take: 15,
      orderBy: { created_at: 'desc' },
    });

    return serializeBigInt(projects);
  }
}

export const chatService = new ChatService();
