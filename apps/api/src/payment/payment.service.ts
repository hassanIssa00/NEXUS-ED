import { BadRequestException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import Stripe from 'stripe';
import { InvoiceStatus, Prisma, Role } from '@prisma/client';

@Injectable()
export class PaymentService {
  private stripe: Stripe | null;

  constructor(private prisma: PrismaService) {
    this.stripe = process.env.STRIPE_SECRET_KEY
      ? new Stripe(process.env.STRIPE_SECRET_KEY, {
          // @ts-ignore
          apiVersion: '2024-12-18.acacia',
        })
      : null;
  }

  private requireStripe() {
    if (!this.stripe) throw new ServiceUnavailableException('Payment provider is not configured');
    return this.stripe;
  }

  private async createAuditLog(params: {
    action: string;
    entityId?: string;
    userId?: string;
    schoolId?: string | null;
    metadata?: Prisma.InputJsonValue;
  }) {
    if (!('auditLog' in this.prisma) || !this.prisma.auditLog) {
      return;
    }

    await this.prisma.auditLog.create({
      data: {
        action: params.action,
        entityType: 'invoice',
        entityId: params.entityId,
        userId: params.userId,
        schoolId: params.schoolId ?? undefined,
        metadata: params.metadata,
      },
    });
  }

  private mapPaymentIntentStatus(
    status: Stripe.PaymentIntent.Status,
  ): InvoiceStatus {
    switch (status) {
      case 'succeeded':
        return InvoiceStatus.PAID;
      case 'requires_action':
      case 'requires_capture':
      case 'requires_confirmation':
      case 'requires_payment_method':
        return InvoiceStatus.REQUIRES_ACTION;
      case 'canceled':
        return InvoiceStatus.FAILED;
      default:
        return InvoiceStatus.PENDING;
    }
  }

  async createPaymentIntent(
    amount: number,
    currency: string = 'usd',
    metadata?: Record<string, string>,
    idempotencyKey?: string,
  ) {
    return this.requireStripe().paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe expects cents
      currency,
      metadata,
      automatic_payment_methods: { enabled: true },
    }, idempotencyKey ? { idempotencyKey } : undefined);
  }

  async createInvoice(studentId: string, amount: number, description: string, schoolId: string) {
    const student = await this.prisma.user.findFirst({
      where: { id: studentId, schoolId, role: Role.STUDENT, isActive: true },
      select: { id: true, schoolId: true, email: true },
    });
    if (!student) throw new NotFoundException('Student not found in this school');

    const invoice = await this.prisma.invoice.create({
      data: {
        studentId,
        amount,
        description,
        schoolId,
        status: InvoiceStatus.PENDING,
      },
    });

    await this.createAuditLog({
      action: 'payment.invoice_created',
      entityId: invoice.id,
      userId: studentId,
      schoolId: invoice.schoolId,
      metadata: {
        amount,
        currency: invoice.currency,
      },
    });

    return invoice;
  }

  async updateInvoiceStatus(
    id: string,
    status: InvoiceStatus,
    stripeId?: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    const invoice = await this.prisma.invoice.update({
      where: { id },
      data: {
        status,
        stripeId,
        paidAt: status === InvoiceStatus.PAID ? new Date() : undefined,
        metadata: metadata ?? undefined,
      },
    });

    await this.createAuditLog({
      action: 'payment.invoice_status_updated',
      entityId: invoice.id,
      userId: invoice.studentId,
      schoolId: invoice.schoolId,
      metadata: {
        status,
        stripeId,
      },
    });

    return invoice;
  }

  async getInvoicesForAccount(userId: string, role: string) {
    let studentIds: string[];
    let schoolId: string | null;
    if (role === Role.STUDENT) {
      const student = await this.prisma.user.findFirst({ where: { id: userId, role: Role.STUDENT }, select: { id: true, schoolId: true } });
      if (!student) throw new NotFoundException('Student not found');
      if (!student.schoolId) throw new ForbiddenException('The account is not assigned to a school');
      studentIds = [student.id];
      schoolId = student.schoolId;
    } else if (role === Role.PARENT) {
      const parent = await this.prisma.user.findFirst({ where: { id: userId, role: Role.PARENT }, select: { schoolId: true } });
      if (!parent) throw new NotFoundException('Parent not found');
      if (!parent.schoolId) throw new ForbiddenException('The account is not assigned to a school');
      schoolId = parent.schoolId;
      const children = await this.prisma.parentStudent.findMany({
        where: { parentId: userId, student: { role: Role.STUDENT, schoolId: parent.schoolId } },
        select: { studentId: true },
      });
      studentIds = children.map((child) => child.studentId);
    } else {
      throw new ForbiddenException('Only students and their linked parents can view payment history');
    }

    if (!studentIds.length) return [];
    return this.prisma.invoice.findMany({
      where: { studentId: { in: studentIds }, ...(schoolId ? { schoolId } : {}) },
      include: { student: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createIntentForInvoice(invoiceId: string, userId: string, role: string) {
    if (role !== Role.STUDENT && role !== Role.PARENT) {
      throw new ForbiddenException('Only a student or linked parent can pay an invoice');
    }
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (!invoice.schoolId) throw new ForbiddenException('Invoice is not assigned to a school');
    if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.REFUNDED) {
      throw new BadRequestException('This invoice is not payable');
    }
    const student = await this.prisma.user.findFirst({
      where: { id: invoice.studentId, role: Role.STUDENT, schoolId: invoice.schoolId },
      select: { id: true },
    });
    if (!student) throw new NotFoundException('Invoice student not found');

    if (role === Role.STUDENT && userId !== student.id) {
      throw new ForbiddenException('You cannot pay another student’s invoice');
    }
    if (role === Role.PARENT) {
      const parent = await this.prisma.user.findFirst({ where: { id: userId, role: Role.PARENT, schoolId: invoice.schoolId }, select: { id: true } });
      const link = parent ? await this.prisma.parentStudent.findUnique({ where: { parentId_studentId: { parentId: userId, studentId: student.id } }, select: { id: true } }) : null;
      if (!link) throw new ForbiddenException('You can only pay an invoice for a linked child');
    }

    const stripe = this.requireStripe();
    if (invoice.stripeId) {
      const existingIntent = await stripe.paymentIntents.retrieve(invoice.stripeId);
      if (existingIntent.status === 'succeeded') {
        await this.updateInvoiceStatus(invoice.id, InvoiceStatus.PAID, existingIntent.id, { stripeStatus: existingIntent.status });
        throw new BadRequestException('This invoice has already been paid');
      }
      if (existingIntent.status !== 'canceled') {
        return { invoiceId: invoice.id, id: existingIntent.id, clientSecret: existingIntent.client_secret };
      }
    }

    const intent = await this.createPaymentIntent(Number(invoice.amount), invoice.currency, {
      invoiceId: invoice.id,
      studentId: student.id,
      schoolId: invoice.schoolId,
    }, `invoice-${invoice.id}-${invoice.updatedAt.getTime()}`);
    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: { stripeId: intent.id, status: this.mapPaymentIntentStatus(intent.status), metadata: { stripeStatus: intent.status } },
    });
    await this.createAuditLog({ action: 'payment.invoice_intent_created', entityId: invoice.id, userId, schoolId: invoice.schoolId, metadata: { stripeId: intent.id } });
    return { invoiceId: invoice.id, id: intent.id, clientSecret: intent.client_secret };
  }

  async getSchoolInvoices(schoolId: string, page: number, limit: number) {
    const where = { schoolId };
    const [invoices, total, totals] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: { student: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.groupBy({
        by: ['currency', 'status'],
        where,
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);

    return {
      invoices,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      summary: totals.map(({ currency, status, _sum, _count }) => ({
        currency,
        status,
        amount: _sum.amount ?? 0,
        count: _count._all,
      })),
    };
  }

  async handleStripeWebhook(signature: string | undefined, payload: Buffer) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret || !signature) {
      throw new Error('Stripe webhook secret/signature missing');
    }

    const event = this.requireStripe().webhooks.constructEvent(
      payload,
      signature,
      webhookSecret,
    );

    switch (event.type) {
      case 'payment_intent.succeeded':
      case 'payment_intent.payment_failed':
      case 'payment_intent.canceled':
      case 'payment_intent.requires_action':
      case 'payment_intent.processing':
      case 'payment_intent.created': {
        const paymentIntent = event.data.object;
        await this.syncInvoiceFromPaymentIntent(paymentIntent);
        break;
      }
      default:
        break;
    }

    return { received: true };
  }

  private async syncInvoiceFromPaymentIntent(paymentIntent: Stripe.PaymentIntent) {
    const invoiceId =
      paymentIntent.metadata?.invoiceId ||
      (
        await this.prisma.invoice.findFirst({
          where: { stripeId: paymentIntent.id },
          select: { id: true },
        })
      )?.id;

    if (!invoiceId) {
      return null;
    }

    const status = this.mapPaymentIntentStatus(paymentIntent.status);

    return this.updateInvoiceStatus(invoiceId, status, paymentIntent.id, {
      stripeStatus: paymentIntent.status,
      amountReceived: paymentIntent.amount_received,
      lastEventAt: new Date().toISOString(),
    });
  }
}
