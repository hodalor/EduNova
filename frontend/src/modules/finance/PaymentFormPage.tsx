import { useMemo, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { z } from 'zod';

import { eduovaApi } from '../../api/eduovaApi';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import PageLoader from '../../components/ui/PageLoader';
import SearchInput from '../../components/ui/SearchInput';
import Select from '../../components/ui/Select';
import PageHeader from '../shared/PageHeader';
import ReceiptPDF from './ReceiptPDF';

const paymentSchema = z.object({
  student: z.string().min(1, 'Student is required'),
  invoice: z.string().min(1, 'Invoice is required'),
  amount: z.coerce.number().positive('Amount is required'),
  method: z.string().min(1, 'Payment method is required'),
  reference: z.string().optional(),
});

type PaymentValues = z.input<typeof paymentSchema>;

interface InvoiceRow {
  id: string;
  student: string;
  className: string;
  invoice_number: string;
  total: number;
  paid: number;
  balance: number;
}

const PaymentFormPage = () => {
  const [search, setSearch] = useState('');
  const receiptRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: receiptRef, documentTitle: 'eduova-receipt' });
  const { data, isLoading } = useQuery({
    queryKey: ['finance-payment-invoices'],
    queryFn: eduovaApi.finance.invoices,
  });

  const {
    register,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<PaymentValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      method: 'cash',
    },
  });

  const values = watch();
  const invoices = useMemo(() => (data || []) as InvoiceRow[], [data]);
  const matchingStudents = useMemo(
    () =>
      invoices.filter((item) =>
        item.student.toLowerCase().includes(search.toLowerCase())
      ),
    [invoices, search]
  );
  const selectedInvoice = invoices.find((item) => item.invoice_number === values.invoice);

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Record Payment"
        description="Search for a student, select an invoice, and generate a printable receipt."
      />

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Card title="Payment Form" description="Capture the payment transaction details.">
          <form className="space-y-5" onSubmit={handleSubmit(() => undefined)}>
            <div>
              <SearchInput placeholder="Search student" onDebouncedChange={setSearch} />
              {search ? (
                <div className="mt-3 max-h-52 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 p-3">
                  {matchingStudents.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100"
                    >
                      <p className="font-semibold text-brand-navy">{item.student}</p>
                      <p className="text-sm text-slate-500">
                        {item.className} · Balance GHS {item.balance.toLocaleString()}
                      </p>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <Input label="Student" error={errors.student?.message} {...register('student')} />
            <Select label="Invoice" error={errors.invoice?.message} {...register('invoice')}>
              <option value="">Select invoice</option>
              {invoices.map((item) => (
                <option key={item.invoice_number} value={item.invoice_number}>
                  {item.invoice_number} · {item.student}
                </option>
              ))}
              <option value="ADHOC-001">Create ad-hoc payment</option>
            </Select>
            <Input
              label="Amount"
              type="number"
              error={errors.amount?.message}
              {...register('amount')}
            />
            <Select label="Payment Method" {...register('method')}>
              <option value="cash">Cash</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="bank">Bank</option>
              <option value="card">Card</option>
            </Select>
            <Input
              label="Reference Number"
              helperText="Required for mobile money and bank payments."
              {...register('reference')}
            />
          </form>
        </Card>

        <Card title="Receipt Preview" description="Review the receipt before submitting or printing.">
          <div ref={receiptRef} className="space-y-4 rounded-3xl bg-slate-50 p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-brand-gold">EDUOVA</p>
              <h3 className="mt-2 text-xl font-semibold text-brand-navy">Receipt Preview</h3>
            </div>
            <div className="space-y-2 text-sm text-slate-600">
              <p>Student: {values.student || selectedInvoice?.student || 'Not selected'}</p>
              <p>Invoice: {values.invoice || 'Not selected'}</p>
              <p>Method: {values.method}</p>
              <p>Reference: {values.reference || 'N/A'}</p>
              <p className="font-semibold text-brand-navy">
                Total: GHS {Number(values.amount || 0).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button leftIcon={<Printer className="h-4 w-4" />} onClick={handlePrint}>
              Print Receipt
            </Button>
            <PDFDownloadLink
              document={
                <ReceiptPDF
                  receiptNumber="RCT-2026-001"
                  student={values.student || selectedInvoice?.student || 'Walk-in Student'}
                  className={selectedInvoice?.className || 'Ad-hoc'}
                  paymentMethod={values.method}
                  reference={values.reference || ''}
                  items={[
                    {
                      label: values.invoice || 'Ad-hoc payment',
                      amount: Number(values.amount || 0),
                    },
                  ]}
                />
              }
              fileName="eduova-receipt.pdf"
            >
              {({ loading }) => (
                <Button variant="secondary" loading={loading}>
                  Download PDF
                </Button>
              )}
            </PDFDownloadLink>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PaymentFormPage;
