import { apiClient } from './client';

export interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  createdAt: string;
  paidAt: string | null;
  student: { id: string; name: string | null; email: string };
}

export interface InvoiceIntentResponse {
  invoiceId: string;
  clientSecret: string | null;
  id: string;
}

export const paymentApi = {
  createIntent: (invoiceId: string) =>
    apiClient.post<InvoiceIntentResponse>('/payments/create-intent', { invoiceId }),
  
  createInvoice: (studentId: string, amount: number, description: string) =>
    apiClient.post<Invoice>('/payments/invoices', { studentId, amount, description }),
    
  getHistory: () => 
    apiClient.get<Invoice[]>('/payments/history'),
};
