import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../db/prisma.service'

type Recipient = {
  id: string
  name: string
  active?: boolean
  channels: {
    type: 'webhook'
    url: string
    secret?: string
  }[]
}

type ScheduleWindow = {
  id: string
  label?: string
  daysOfWeek: number[] // 0-6 (Sun-Sat) or 1-7? We will use 0-6
  start: string // HH:mm
  end: string // HH:mm
  recipientIds: string[]
}

export type NotificationConfig = {
  mode: 'all' | 'scheduled'
  timezone?: string
  fallbackAll?: boolean
  recipients: Recipient[]
  schedules: ScheduleWindow[]
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)
  private readonly TABLE = 'system_settings'
  private readonly KEY = 'notification_config'

  constructor(private readonly prisma: PrismaService) {}

  async ensureStorage() {
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ${this.TABLE} (
        key TEXT PRIMARY KEY,
        value JSONB,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `)
  }

  async getConfig(): Promise<NotificationConfig> {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT value FROM ${this.TABLE} WHERE key = $1`,
      this.KEY,
    )
    if (rows && rows.length > 0) {
      const raw = rows[0]?.value as any
      if (raw && typeof raw === 'object') return raw as NotificationConfig
    }
    return { mode: 'all', timezone: 'Asia/Shanghai', fallbackAll: true, recipients: [], schedules: [] }
  }

  async setConfig(cfg: NotificationConfig): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO ${this.TABLE} (key, value, updated_at) VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
      this.KEY,
      JSON.stringify(cfg || {}),
    )
  }

  private timeInWindow(now: Date, start: string, end: string, tz?: string): boolean {
    // We ignore timezone for simplicity; assume server local time is fine.
    const [sh, sm] = start.split(':').map((n) => parseInt(n, 10))
    const [eh, em] = end.split(':').map((n) => parseInt(n, 10))
    const minutesNow = now.getHours() * 60 + now.getMinutes()
    const startMin = (sh % 24) * 60 + (sm % 60)
    const endMin = (eh % 24) * 60 + (em % 60)
    if (endMin >= startMin) return minutesNow >= startMin && minutesNow < endMin
    // Over midnight window
    return minutesNow >= startMin || minutesNow < endMin
  }

  private resolveRecipients(cfg: NotificationConfig, now = new Date()): Recipient[] {
    const active = (cfg.recipients || []).filter((r) => r.active !== false)
    if (cfg.mode === 'all') return active
    const dow = now.getDay() // 0-6 Sun..Sat
    const matchedIds = new Set<string>()
    for (const w of cfg.schedules || []) {
      if (!w.daysOfWeek?.includes(dow)) continue
      if (this.timeInWindow(now, w.start, w.end, cfg.timezone)) {
        for (const id of w.recipientIds || []) matchedIds.add(id)
      }
    }
    const selected = active.filter((r) => matchedIds.has(r.id))
    if (selected.length > 0) return selected
    return cfg.fallbackAll === false ? [] : active
  }

  async dispatchOrderPaid(orderId: string) {
    try {
      // Idempotency: check notification event
      const payment = await this.prisma.payment.findFirst({ where: { orderId } })
      if (!payment) return
      const existed = await this.prisma.paymentEvent.findFirst({
        where: { paymentId: payment.id, eventType: 'order_paid_notified' },
      })
      if (existed) return

      const order = await this.prisma.order.findUnique({ where: { id: orderId } })
      if (!order) return

      const cfg = await this.getConfig()
      const recipients = this.resolveRecipients(cfg, new Date())
      if (recipients.length === 0) {
        this.logger.log('No recipients resolved for order paid notification')
        await this.prisma.paymentEvent.create({
          data: { paymentId: payment.id, eventType: 'order_paid_notified', payload: { recipients: 0, skipped: true } },
        })
        return
      }

      const payload = {
        type: 'order_paid',
        orderId: order.id,
        orderNumber: order.orderNumber,
        userPhone: order.phoneNumber,
        amount: payment.amount,
        currency: payment.currency,
        provider: payment.provider,
        paidAt: payment.paidAt,
        link_admin_order: `https://nexus.omnilaze.co/admin/orders?order=${encodeURIComponent(order.orderNumber)}`,
      }

      let sent = 0
      for (const r of recipients) {
        for (const ch of r.channels || []) {
          if (ch.type === 'webhook' && ch.url) {
            try {
              const isSlack = /hooks\.slack\.com/.test(ch.url)
              const body = isSlack
                ? {
                    text:
                      `🔔 新订单支付成功\n` +
                      `• 订单号: ${payload.orderNumber}\n` +
                      `• 用户: ${payload.userPhone}\n` +
                      `• 金额: ${payload.amount} ${payload.currency}\n` +
                      `• 支付渠道: ${payload.provider}\n` +
                      `• 支付时间: ${payload.paidAt || ''}\n` +
                      `• 管理链接: ${payload.link_admin_order}`,
                  }
                : { recipient: { id: r.id, name: r.name }, data: payload }
              await fetch(ch.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
              })
              sent++
            } catch (e) {
              this.logger.warn(`Webhook notify failed for ${r.name}: ${(e as any)?.message || e}`)
            }
          }
        }
      }

      await this.prisma.paymentEvent.create({
        data: { paymentId: payment.id, eventType: 'order_paid_notified', payload: { recipients: recipients.length, sent } },
      })
    } catch (e) {
      this.logger.error('Failed to dispatch order paid notification', e as any)
    }
  }
}
