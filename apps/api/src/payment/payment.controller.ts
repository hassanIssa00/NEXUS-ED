import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  Headers,
  Req,
  BadRequestException,
  ForbiddenException,
  Query,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { RolesGuard } from '../auth/roles.guard';
import { CreateSchoolInvoiceDto } from './dto/create-school-invoice.dto';
import { CreateInvoiceIntentDto } from './dto/create-invoice-intent.dto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-intent')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.STUDENT, Role.PARENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Stripe Payment Intent' })
  async createIntent(@Body() body: CreateInvoiceIntentDto, @Request() req: any) {
    return this.paymentService.createIntentForInvoice(
      body.invoiceId,
      req.user.userId || req.user.sub || req.user.id,
      req.user.role,
    );
  }

  @Post('invoices')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ACCOUNTANT, Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new invoice' })
  async createInvoice(
    @Request() req: any,
    @Body() body: CreateSchoolInvoiceDto,
  ) {
    if (!req.user.schoolId) throw new ForbiddenException('The account is not assigned to a school');
    return this.paymentService.createInvoice(
      body.studentId,
      body.amount,
      body.description,
      req.user.schoolId,
    );
  }

  @Get('history')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.STUDENT, Role.PARENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment history' })
  async getHistory(@Request() req: any) {
    return this.paymentService.getInvoicesForAccount(
      req.user.userId || req.user.sub || req.user.id,
      req.user.role,
    );
  }

  @Get('school-invoices')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ACCOUNTANT, Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL)
  async getSchoolInvoices(
    @Request() req: any,
    @Query('page') pageValue?: string,
    @Query('limit') limitValue?: string,
  ) {
    if (!req.user.schoolId) throw new ForbiddenException('The account is not assigned to a school');
    const page = Math.max(1, Number(pageValue) || 1);
    const limit = Math.min(100, Math.max(1, Number(limitValue) || 25));
    return this.paymentService.getSchoolInvoices(req.user.schoolId, page, limit);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Handle Stripe payment webhooks' })
  async handleWebhook(
    @Headers('stripe-signature') signature: string | undefined,
    @Req() req: ExpressRequest & { body: Buffer },
  ) {
    if (!Buffer.isBuffer(req.body)) {
      throw new BadRequestException('Stripe webhook requires raw body');
    }

    return this.paymentService.handleStripeWebhook(signature, req.body);
  }
}
