import crypto from "crypto";
import { tidb } from "../config/tidb";
import {
  VecnaSenderRecord,
  VecnaMessageTemplateRecord,
  VecnaMessageRecord,
  TeamVecnaDeliveryRecord,
} from "../types";
import { socketService } from "./socket.service";
import { db } from "./db.service";

export interface SubmitMessageInput {
  senderId: number;
  clientRequestId?: string;
  sourceType: "custom" | "template";
  templateId?: number;
  bodyText?: string;
  recipientScope: "all_teams" | "selected_teams";
  selectedTeamIds?: string[];
}

export class VecnaService {
  // In-memory fallbacks for resilient offline execution
  private static templates: VecnaMessageTemplateRecord[] = [
    {
      templateId: 1,
      templateCode: "TPL_TICK_TOCK",
      templateName: "The Clock Strikes",
      bodyText: "Tick tock... the grandfather clock tolls four times. Your time in Hawkins is coming to an end.",
      isActive: true,
      createdByAdminId: 1,
      createdAt: new Date().toISOString(),
    },
    {
      templateId: 2,
      templateCode: "TPL_MINDFLAYER",
      templateName: "Shadow Over Hawkins",
      bodyText: "You cannot hide in the dark. The Shadow Monster already controls the perimeter.",
      isActive: true,
      createdByAdminId: 1,
      createdAt: new Date().toISOString(),
    },
    {
      templateId: 3,
      templateCode: "TPL_RUN",
      templateName: "Joyce Byers Warning",
      bodyText: "R... U... N... The bulbs flicker wildly on the living room wall.",
      isActive: true,
      createdByAdminId: 1,
      createdAt: new Date().toISOString(),
    },
    {
      templateId: 4,
      templateCode: "TPL_VOID_SPEECH",
      templateName: "Void Whispers",
      bodyText: "I have seen your fears, Hawkins squad. Every secret you hold belongs to me now.",
      isActive: true,
      createdByAdminId: 1,
      createdAt: new Date().toISOString(),
    },
  ];

  private static messages: VecnaMessageRecord[] = [];
  private static deliveries: TeamVecnaDeliveryRecord[] = [];
  private static nextMessageId = 1;
  private static nextDeliveryId = 1;

  /**
   * Returns list of safe team labels so Vecna senders can choose targets
   */
  public static async getRecipients(): Promise<{ teamId: string; teamName: string; squadLeader: string }[]> {
    const pool = tidb.pool;
    if (pool) {
      try {
        const [rows] = await pool.query<any[]>(
          "SELECT team_id, team_name, squad_leader FROM teams WHERE role = 'PLAYER' AND is_enabled = 1 ORDER BY team_name ASC"
        );
        if (Array.isArray(rows) && rows.length > 0) {
          return rows.map((r) => ({
            teamId: r.team_id,
            teamName: r.team_name,
            squadLeader: r.squad_leader,
          }));
        }
      } catch (err) {
        // Fall back
      }
    }

    const allTeams = db.getAllTeams();
    return allTeams
      .filter((t) => t.role === "PLAYER")
      .map((t) => ({ teamId: t.id, teamName: t.teamName, squadLeader: t.leaderName }));
  }

  /**
   * Returns active prepared message templates (body strictly <= 150 chars)
   */
  public static async getTemplates(): Promise<VecnaMessageTemplateRecord[]> {
    const pool = tidb.pool;
    if (pool) {
      try {
        const [rows] = await pool.query<any[]>(
          "SELECT * FROM vecna_message_templates WHERE is_active = 1 ORDER BY template_name ASC"
        );
        if (Array.isArray(rows) && rows.length > 0) {
          return rows.map((r) => ({
            templateId: r.template_id,
            templateCode: r.template_code,
            templateName: r.template_name,
            bodyText: r.body_text,
            isActive: Boolean(r.is_active),
            createdByAdminId: r.created_by_admin_id,
            createdAt: new Date(r.created_at).toISOString(),
          }));
        }
      } catch (err) {
        // Fall back
      }
    }

    return this.templates.filter((t) => t.isActive);
  }

  /**
   * Submits a Vecna message for MANDATORY ADMIN REVIEW.
   * Body must be between 1 and 150 characters.
   * Creates record in 'pending_approval' status.
   * NEVER delivers to Hawkins teams until approved!
   */
  public static async submitMessage(input: SubmitMessageInput): Promise<{
    success: boolean;
    message?: VecnaMessageRecord;
    error?: string;
  }> {
    const clientRequestId = input.clientRequestId || crypto.randomUUID();

    // 1. Resolve body text
    let resolvedBody = "";
    if (input.sourceType === "template") {
      if (!input.templateId) {
        return { success: false, error: "templateId is required when source is 'template'." };
      }
      const templates = await this.getTemplates();
      const tpl = templates.find((t) => t.templateId === input.templateId);
      if (!tpl) {
        return { success: false, error: "Selected template does not exist or is inactive." };
      }
      resolvedBody = tpl.bodyText;
    } else {
      resolvedBody = (input.bodyText || "").trim();
    }

    // 2. Authoritative length validation: 1 to 150 characters
    if (resolvedBody.length < 1 || resolvedBody.length > 150) {
      return {
        success: false,
        error: `Message body must be between 1 and 150 characters (Current: ${resolvedBody.length}).`,
      };
    }

    // 3. Target scope validation
    if (input.recipientScope === "selected_teams") {
      if (!input.selectedTeamIds || input.selectedTeamIds.length === 0) {
        return { success: false, error: "Must specify at least one target team for 'selected_teams' scope." };
      }
    }

    const pool = tidb.pool;
    const now = new Date().toISOString();

    // 4. Check idempotency: sender_id + clientRequestId
    if (pool) {
      try {
        const [existing] = await pool.query<any[]>(
          "SELECT * FROM vecna_messages WHERE sender_id = ? AND client_request_id = ?",
          [input.senderId, clientRequestId]
        );
        if (Array.isArray(existing) && existing.length > 0) {
          const row = existing[0];
          return {
            success: true,
            message: {
              messageId: row.message_id,
              senderId: row.sender_id,
              clientRequestId: row.client_request_id,
              sourceType: row.source_type,
              templateId: row.template_id,
              bodyText: row.body_text,
              recipientScope: row.recipient_scope,
              approvalStatus: row.approval_status,
              requestedAt: new Date(row.requested_at).toISOString(),
              reviewedByAdminId: row.reviewed_by_admin_id,
              reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : null,
              rejectionReason: row.rejection_reason,
              sentAt: row.sent_at ? new Date(row.sent_at).toISOString() : null,
            },
          };
        }

        // Insert new message in pending_approval
        const [insertRes]: any = await pool.query(
          `INSERT INTO vecna_messages 
           (sender_id, client_request_id, source_type, template_id, body_text, recipient_scope, approval_status, requested_at)
           VALUES (?, ?, ?, ?, ?, ?, 'pending_approval', NOW(3))`,
          [
            input.senderId,
            clientRequestId,
            input.sourceType,
            input.templateId || null,
            resolvedBody,
            input.recipientScope,
          ]
        );
        const messageId = insertRes.insertId;

        // Save target teams if selected_teams
        if (input.recipientScope === "selected_teams" && input.selectedTeamIds) {
          for (const teamId of input.selectedTeamIds) {
            await pool.query(
              "INSERT IGNORE INTO vecna_message_targets (message_id, team_id) VALUES (?, ?)",
              [messageId, teamId]
            ).catch(() => {});
          }
        }

        const msgRecord: VecnaMessageRecord = {
          messageId,
          senderId: input.senderId,
          clientRequestId,
          sourceType: input.sourceType,
          templateId: input.templateId || null,
          bodyText: resolvedBody,
          recipientScope: input.recipientScope,
          selectedTeamIds: input.selectedTeamIds,
          approvalStatus: "pending_approval",
          requestedAt: now,
          reviewedByAdminId: null,
          reviewedAt: null,
          rejectionReason: null,
          sentAt: null,
        };

        // Emit real-time review notification to admins room ONLY (Hawkins teams receive NOTHING)
        socketService.broadcastToAdmins("admin:vecna_message_pending", {
          messageId,
          senderId: input.senderId,
          body: resolvedBody,
          recipientScope: input.recipientScope,
          selectedRecipientSummary: input.selectedTeamIds || ["ALL_HAWKINS_TEAMS"],
          requestedAt: now,
        });

        return { success: true, message: msgRecord };
      } catch (err: any) {
        console.warn("[VECNA SERVICE] TiDB submitMessage fallback:", err.message);
      }
    }

    // Local fallback
    const messageId = this.nextMessageId++;
    const msgRecord: VecnaMessageRecord = {
      messageId,
      senderId: input.senderId,
      clientRequestId,
      sourceType: input.sourceType,
      templateId: input.templateId || null,
      bodyText: resolvedBody,
      recipientScope: input.recipientScope,
      selectedTeamIds: input.selectedTeamIds,
      approvalStatus: "pending_approval",
      requestedAt: now,
      reviewedByAdminId: null,
      reviewedAt: null,
      rejectionReason: null,
      sentAt: null,
    };
    this.messages.push(msgRecord);

    socketService.broadcastToAdmins("admin:vecna_message_pending", {
      messageId,
      senderId: input.senderId,
      body: resolvedBody,
      recipientScope: input.recipientScope,
      selectedRecipientSummary: input.selectedTeamIds || ["ALL_HAWKINS_TEAMS"],
      requestedAt: now,
    });

    return { success: true, message: msgRecord };
  }

  /**
   * Retrieves pending messages awaiting administrator review
   */
  public static async getPendingMessages(): Promise<VecnaMessageRecord[]> {
    const pool = tidb.pool;
    if (pool) {
      try {
        const [rows] = await pool.query<any[]>(
          `SELECT m.*, s.sender_name 
           FROM vecna_messages m
           LEFT JOIN vecna_senders s ON m.sender_id = s.vecna_sender_id
           WHERE m.approval_status = 'pending_approval'
           ORDER BY m.requested_at ASC`
        );
        if (Array.isArray(rows)) {
          return rows.map((r) => ({
            messageId: r.message_id,
            senderId: r.sender_id,
            senderName: r.sender_name || `Sender #${r.sender_id}`,
            clientRequestId: r.client_request_id,
            sourceType: r.source_type,
            templateId: r.template_id,
            bodyText: r.body_text,
            recipientScope: r.recipient_scope,
            approvalStatus: r.approval_status,
            requestedAt: new Date(r.requested_at).toISOString(),
            reviewedByAdminId: r.reviewed_by_admin_id,
            reviewedAt: r.reviewed_at ? new Date(r.reviewed_at).toISOString() : null,
            rejectionReason: r.rejection_reason,
            sentAt: r.sent_at ? new Date(r.sent_at).toISOString() : null,
          }));
        }
      } catch (err) {
        // Fall back
      }
    }

    return this.messages.filter((m) => m.approvalStatus === "pending_approval");
  }

  /**
   * Administrator explicitly approves a message:
   * Sets status to 'approved', snapshots deliveries into team_vecna_deliveries,
   * emits vecna:message to recipient team rooms, and vecna:message_status to sender room.
   */
  public static async approveMessage(
    messageId: number,
    adminId: number = 1
  ): Promise<{ success: boolean; deliveredCount: number; error?: string }> {
    const pool = tidb.pool;
    const now = new Date().toISOString();

    if (pool) {
      try {
        // 1. Fetch message and verify pending status
        const [rows] = await pool.query<any[]>(
          "SELECT * FROM vecna_messages WHERE message_id = ?",
          [messageId]
        );
        if (!Array.isArray(rows) || rows.length === 0) {
          return { success: false, deliveredCount: 0, error: "Message not found." };
        }
        const msg = rows[0];
        if (msg.approval_status !== "pending_approval") {
          return {
            success: false,
            deliveredCount: 0,
            error: `Message is already ${msg.approval_status}.`,
          };
        }

        // 2. Update status to approved
        await pool.query(
          `UPDATE vecna_messages 
           SET approval_status = 'approved', reviewed_by_admin_id = ?, reviewed_at = NOW(3), sent_at = NOW(3)
           WHERE message_id = ?`,
          [adminId, messageId]
        );

        // 3. Resolve target teams
        let targetTeamIds: string[] = [];
        if (msg.recipient_scope === "all_teams") {
          const [teamRows] = await pool.query<any[]>(
            "SELECT team_id FROM teams WHERE role = 'PLAYER' AND is_enabled = 1"
          );
          targetTeamIds = teamRows.map((t) => t.team_id);
        } else {
          const [targetRows] = await pool.query<any[]>(
            "SELECT team_id FROM vecna_message_targets WHERE message_id = ?",
            [messageId]
          );
          targetTeamIds = targetRows.map((t) => t.team_id);
        }

        // 4. Create durable team_vecna_deliveries
        let deliveredCount = 0;
        for (const teamId of targetTeamIds) {
          const [deliveryRes]: any = await pool.query(
            "INSERT IGNORE INTO team_vecna_deliveries (message_id, team_id, delivered_at) VALUES (?, ?, NOW(3))",
            [messageId, teamId]
          );
          const deliveryId = deliveryRes.insertId || Date.now();
          deliveredCount++;

          // 5. Emit real-time delivery to authorized team room
          socketService.emitToTeam(teamId, "vecna:message", {
            deliveryId,
            messageId,
            body: msg.body_text,
            deliveredAt: now,
            senderDisplayName: "VECNA / SHADOW MONSTER",
          });
        }

        // 6. Notify originating sender room of approval
        socketService.emitToVecnaSender(msg.sender_id, "vecna:message_status", {
          messageId,
          status: "approved",
          reviewedAt: now,
          deliveredCount,
        });

        return { success: true, deliveredCount };
      } catch (err: any) {
        console.warn("[VECNA SERVICE] TiDB approveMessage error:", err.message);
      }
    }

    // Local fallback
    const msg = this.messages.find((m) => m.messageId === messageId);
    if (!msg) return { success: false, deliveredCount: 0, error: "Message not found." };
    if (msg.approvalStatus !== "pending_approval") {
      return { success: false, deliveredCount: 0, error: `Message is already ${msg.approvalStatus}.` };
    }

    msg.approvalStatus = "approved";
    msg.reviewedByAdminId = adminId;
    msg.reviewedAt = now;
    msg.sentAt = now;

    let targetTeamIds: string[] = [];
    if (msg.recipientScope === "all_teams") {
      targetTeamIds = db.getAllTeams().filter((t) => t.role === "PLAYER").map((t) => t.id);
    } else {
      targetTeamIds = msg.selectedTeamIds || [];
    }

    let deliveredCount = 0;
    for (const teamId of targetTeamIds) {
      const deliveryId = this.nextDeliveryId++;
      this.deliveries.push({
        deliveryId,
        messageId,
        teamId,
        bodyText: msg.bodyText,
        senderName: "VECNA",
        deliveredAt: now,
        readAt: null,
      });
      deliveredCount++;

      socketService.emitToTeam(teamId, "vecna:message", {
        deliveryId,
        messageId,
        body: msg.bodyText,
        deliveredAt: now,
        senderDisplayName: "VECNA / SHADOW MONSTER",
      });
    }

    socketService.emitToVecnaSender(msg.senderId, "vecna:message_status", {
      messageId,
      status: "approved",
      reviewedAt: now,
      deliveredCount,
    });

    return { success: true, deliveredCount };
  }

  /**
   * Administrator explicitly rejects a message:
   * Sets status to 'rejected', records reason, notifies sender,
   * NEVER delivers anything to Hawkins teams.
   */
  public static async rejectMessage(
    messageId: number,
    adminId: number = 1,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    const pool = tidb.pool;
    const now = new Date().toISOString();

    if (pool) {
      try {
        const [rows] = await pool.query<any[]>(
          "SELECT * FROM vecna_messages WHERE message_id = ?",
          [messageId]
        );
        if (!Array.isArray(rows) || rows.length === 0) {
          return { success: false, error: "Message not found." };
        }
        const msg = rows[0];
        if (msg.approval_status !== "pending_approval") {
          return { success: false, error: `Message is already ${msg.approval_status}.` };
        }

        await pool.query(
          `UPDATE vecna_messages 
           SET approval_status = 'rejected', reviewed_by_admin_id = ?, reviewed_at = NOW(3), rejection_reason = ?
           WHERE message_id = ?`,
          [adminId, reason || "Content rejected by event administration.", messageId]
        );

        socketService.emitToVecnaSender(msg.sender_id, "vecna:message_status", {
          messageId,
          status: "rejected",
          reviewedAt: now,
          rejectionReason: reason || "Content rejected by event administration.",
        });

        return { success: true };
      } catch (err: any) {
        console.warn("[VECNA SERVICE] TiDB rejectMessage error:", err.message);
      }
    }

    const msg = this.messages.find((m) => m.messageId === messageId);
    if (!msg) return { success: false, error: "Message not found." };
    if (msg.approvalStatus !== "pending_approval") {
      return { success: false, error: `Message is already ${msg.approvalStatus}.` };
    }

    msg.approvalStatus = "rejected";
    msg.reviewedByAdminId = adminId;
    msg.reviewedAt = now;
    msg.rejectionReason = reason || "Content rejected by event administration.";

    socketService.emitToVecnaSender(msg.senderId, "vecna:message_status", {
      messageId,
      status: "rejected",
      reviewedAt: now,
      rejectionReason: msg.rejectionReason,
    });

    return { success: true };
  }

  /**
   * Fetches only approved delivered messages for a specific Hawkins team inbox
   */
  public static async getTeamInbox(teamId: string): Promise<TeamVecnaDeliveryRecord[]> {
    const pool = tidb.pool;
    if (pool) {
      try {
        const [rows] = await pool.query<any[]>(
          `SELECT d.delivery_id, d.message_id, d.team_id, d.delivered_at, d.read_at, m.body_text, s.sender_name
           FROM team_vecna_deliveries d
           JOIN vecna_messages m ON d.message_id = m.message_id
           LEFT JOIN vecna_senders s ON m.sender_id = s.vecna_sender_id
           WHERE d.team_id = ? AND m.approval_status = 'approved'
           ORDER BY d.delivered_at DESC`,
          [teamId]
        );
        if (Array.isArray(rows)) {
          return rows.map((r) => ({
            deliveryId: r.delivery_id,
            messageId: r.message_id,
            teamId: r.team_id,
            bodyText: r.body_text,
            senderName: r.sender_name || "VECNA",
            deliveredAt: new Date(r.delivered_at).toISOString(),
            readAt: r.read_at ? new Date(r.read_at).toISOString() : null,
          }));
        }
      } catch (err) {
        // Fall back
      }
    }

    return this.deliveries.filter((d) => d.teamId === teamId);
  }

  /**
   * Marks a delivered message as read
   */
  public static async markMessageRead(teamId: string, deliveryId: number): Promise<boolean> {
    const pool = tidb.pool;
    if (pool) {
      try {
        await pool.query(
          "UPDATE team_vecna_deliveries SET read_at = NOW(3) WHERE delivery_id = ? AND team_id = ?",
          [deliveryId, teamId]
        );
        return true;
      } catch {}
    }

    const del = this.deliveries.find((d) => d.deliveryId === deliveryId && d.teamId === teamId);
    if (del) {
      del.readAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * Sender views own submitted message history
   */
  public static async getSenderMessages(senderId: number): Promise<VecnaMessageRecord[]> {
    const pool = tidb.pool;
    if (pool) {
      try {
        const [rows] = await pool.query<any[]>(
          "SELECT * FROM vecna_messages WHERE sender_id = ? ORDER BY requested_at DESC",
          [senderId]
        );
        if (Array.isArray(rows)) {
          return rows.map((r) => ({
            messageId: r.message_id,
            senderId: r.sender_id,
            clientRequestId: r.client_request_id,
            sourceType: r.source_type,
            templateId: r.template_id,
            bodyText: r.body_text,
            recipientScope: r.recipient_scope,
            approvalStatus: r.approval_status,
            requestedAt: new Date(r.requested_at).toISOString(),
            reviewedByAdminId: r.reviewed_by_admin_id,
            reviewedAt: r.reviewed_at ? new Date(r.reviewed_at).toISOString() : null,
            rejectionReason: r.rejection_reason,
            sentAt: r.sent_at ? new Date(r.sent_at).toISOString() : null,
          }));
        }
      } catch {}
    }

    return this.messages.filter((m) => m.senderId === senderId);
  }

  /**
   * Admin template management
   */
  public static async createTemplate(
    adminId: number,
    data: { templateCode: string; templateName: string; bodyText: string }
  ): Promise<{ success: boolean; template?: VecnaMessageTemplateRecord; error?: string }> {
    const trimmed = (data.bodyText || "").trim();
    if (trimmed.length < 1 || trimmed.length > 150) {
      return { success: false, error: "Template body must be between 1 and 150 characters." };
    }

    const pool = tidb.pool;
    const now = new Date().toISOString();

    if (pool) {
      try {
        const [res]: any = await pool.query(
          "INSERT INTO vecna_message_templates (template_code, template_name, body_text, is_active, created_by_admin_id) VALUES (?, ?, ?, 1, ?)",
          [data.templateCode, data.templateName, trimmed, adminId]
        );
        return {
          success: true,
          template: {
            templateId: res.insertId,
            templateCode: data.templateCode,
            templateName: data.templateName,
            bodyText: trimmed,
            isActive: true,
            createdByAdminId: adminId,
            createdAt: now,
          },
        };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    const template: VecnaMessageTemplateRecord = {
      templateId: this.templates.length + 1,
      templateCode: data.templateCode,
      templateName: data.templateName,
      bodyText: trimmed,
      isActive: true,
      createdByAdminId: adminId,
      createdAt: now,
    };
    this.templates.push(template);
    return { success: true, template };
  }
}
