import { IsUUID } from 'class-validator';

export class CreateInvoiceIntentDto {
  @IsUUID()
  invoiceId: string;
}
