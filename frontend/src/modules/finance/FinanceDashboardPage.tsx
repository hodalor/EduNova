import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';
import {
  BadgeCheck,
  Banknote,
  FileSpreadsheet,
  Receipt,
  ReceiptText,
  ShieldAlert,
  Trash2,
  UserPlus,
  Wallet,
} from 'lucide-react';

import { eduovaApi } from '../../api/eduovaApi';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import PageLoader from '../../components/ui/PageLoader';
import SearchInput from '../../components/ui/SearchInput';
import Select from '../../components/ui/Select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/Tabs';
import PageHeader from '../shared/PageHeader';

const statusStyles: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  partial: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  pending: 'bg-slate-50 text-slate-700 ring-1 ring-slate-200',
  overdue: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
};

const invoiceSchema = z.object({
  studentName: z.string().min(2, 'Student name is required'),
  className: z.string().min(1, 'Class or level is required'),
  totalAmount: z.coerce.number().min(1, 'Total amount must be greater than zero'),
  dueDate: z.string().min(1, 'Due date is required'),
  itemName: z.string().min(1, 'Line item name is required'),
  studentId: z.string().optional(),
});

const paymentSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice is required'),
  amount: z.coerce.number().min(1, 'Amount must be greater than zero'),
  paymentMethod: z.enum(['cash', 'mobile_money', 'bank', 'card']),
  transactionRef: z.string().optional(),
  paidAt: z.string().min(1, 'Payment date is required'),
  notes: z.string().optional(),
});

const paymentTermSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  code: z.string().min(1, 'Short code is required'),
  description: z.string().optional(),
  dueDays: z.coerce.number().int().min(0, 'Due days cannot be negative'),
  installmentCount: z.coerce.number().int().min(1, 'At least one installment is required'),
  isActive: z.boolean().optional(),
});

type InvoiceValues = z.infer<typeof invoiceSchema>;
type PaymentValues = z.infer<typeof paymentSchema>;
type PaymentTermValues = z.infer<typeof paymentTermSchema>;

interface InvoiceRow {
  id: string;
  invoice_number: string;
  student_id?: string;
  student_name?: string;
  class_name?: string;
  total_amount: number | string;
  paid_amount: number | string;
  balance: number | string;
  status: 'paid' | 'partial' | 'pending' | 'overdue' | string;
  due_date?: string;
}

interface PaymentRow {
  id: string;
  invoice_id: string;
  student_id?: string;
  amount: number | string;
  payment_method: string;
  receipt_number?: string;
  transaction_ref?: string;
  paid_at: string;
  received_by?: string;
}

interface DebtorRow {
  student_id: string;
  student_name?: string;
  class_name?: string;
  total_owing: number | string;
  invoice_count: number;
  invoices: Array<{
    id: string;
    invoice_number: string;
    due_date?: string;
    balance: number | string;
    status?: string;
  }>;
}

interface PaymentTermRow {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  due_days: number;
  installment_count: number;
  installment_percentages?: number[];
  is_active: boolean;
}

const currency = (value: number | string | null | undefined) => {
  const num = Number(value || 0);
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const FinanceDashboardPage = () => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('invoices');

  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [termOpen, setTermOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<PaymentTermRow | null>(null);

  const [searchInvoice, setSearchInvoice] = useState('');
  const [searchPayment, setSearchPayment] = useState('');
  const [searchDebtor, setSearchDebtor] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const invalidateFinance = () => {
    queryClient.invalidateQueries({ queryKey: ['finance-invoices'] });
    queryClient.invalidateQueries({ queryKey: ['finance-payments'] });
    queryClient.invalidateQueries({ queryKey: ['finance-debtors'] });
    queryClient.invalidateQueries({ queryKey: ['finance-payment-terms'] });
    queryClient.invalidateQueries({ queryKey: ['finance-dashboard'] });
  };

  const invoicesQuery = useQuery<InvoiceRow[]>({
    queryKey: ['finance-invoices'],
    queryFn: eduovaApi.finance.invoices,
  });
  const invoices = useMemo<InvoiceRow[]>(() => invoicesQuery.data ?? [], [invoicesQuery.data]);
  const invoicesLoading = invoicesQuery.isLoading;
  const invoicesError = invoicesQuery.isError;
  const refetchInvoices = invoicesQuery.refetch;

  const paymentsQuery = useQuery<PaymentRow[]>({
    queryKey: ['finance-payments'],
    queryFn: eduovaApi.finance.payments,
  });
  const payments = useMemo<PaymentRow[]>(() => paymentsQuery.data ?? [], [paymentsQuery.data]);
  const paymentsLoading = paymentsQuery.isLoading;

  const debtorsQuery = useQuery<DebtorRow[]>({
    queryKey: ['finance-debtors'],
    queryFn: eduovaApi.finance.debtors,
  });
  const debtors = useMemo<DebtorRow[]>(() => debtorsQuery.data ?? [], [debtorsQuery.data]);
  const debtorsLoading = debtorsQuery.isLoading;

  const termsQuery = useQuery<PaymentTermRow[]>({
    queryKey: ['finance-payment-terms'],
    queryFn: eduovaApi.finance.paymentTerms,
  });
  const paymentTerms = useMemo<PaymentTermRow[]>(
    () => termsQuery.data ?? [],
    [termsQuery.data]
  );
  const termsLoading = termsQuery.isLoading;

  const invoiceForm = useForm<InvoiceValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      studentName: '',
      className: '',
      totalAmount: 0,
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString().slice(0, 10),
      itemName: 'Tuition',
      studentId: '',
    },
  });

  const paymentForm = useForm<PaymentValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      invoiceId: '',
      amount: 0,
      paymentMethod: 'cash',
      transactionRef: '',
      paidAt: new Date().toISOString().slice(0, 10),
      notes: '',
    },
  });

  const termForm = useForm<PaymentTermValues>({
    resolver: zodResolver(paymentTermSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
      dueDays: 0,
      installmentCount: 1,
      isActive: true,
    },
  });

  const createInvoice = useMutation({
    mutationFn: (values: InvoiceValues) =>
      eduovaApi.finance.createInvoice({
        student_id: values.studentId || undefined,
        student_name: values.studentName,
        class_name: values.className,
        total_amount: Number(values.totalAmount),
        due_date: values.dueDate,
        items: [{ name: values.itemName, amount: Number(values.totalAmount) }],
      }),
    onSuccess: () => {
      toast.success('Invoice created successfully.');
      setInvoiceOpen(false);
      invoiceForm.reset();
      invalidateFinance();
    },
    onError: () => toast.error('Unable to create invoice. Please try again.'),
  });

  const recordPayment = useMutation({
    mutationFn: (values: PaymentValues) =>
      eduovaApi.finance.recordPayment({
        invoice_id: values.invoiceId,
        amount: Number(values.amount),
        payment_method: values.paymentMethod,
        transaction_ref: values.transactionRef || undefined,
        paid_at: values.paidAt,
        notes: values.notes || undefined,
      }),
    onSuccess: () => {
      toast.success('Payment recorded successfully.');
      setPaymentOpen(false);
      paymentForm.reset();
      invalidateFinance();
    },
    onError: () => toast.error('Unable to record payment. Please try again.'),
  });

  const savePaymentTerm = useMutation({
    mutationFn: (values: PaymentTermValues) => {
      const count = Number(values.installmentCount);
      const each = Math.round(100 / count);
      const percentages = Array.from({ length: count }, (_, i) => {
        if (i === count - 1) {
          const prevSum = Array.from({ length: count - 1 }).reduce<number>(
            (sum) => sum + each,
            0
          );
          return Math.max(100 - prevSum, 0);
        }
        return each;
      });
      const payload = {
        name: values.name,
        code: values.code.toUpperCase(),
        description: values.description || null,
        due_days: Number(values.dueDays),
        installment_count: count,
        installment_percentages: percentages,
        is_active: values.isActive !== false,
      };
      if (editingTerm) {
        return eduovaApi.finance.updatePaymentTerm(editingTerm.id, payload);
      }
      return eduovaApi.finance.createPaymentTerm(payload);
    },
    onSuccess: () => {
      toast.success(editingTerm ? 'Payment term updated.' : 'Payment term created.');
      setTermOpen(false);
      setEditingTerm(null);
      termForm.reset();
      invalidateFinance();
    },
    onError: () => toast.error('Unable to save payment term.'),
  });

  const deletePaymentTerm = useMutation({
    mutationFn: (id: string) => eduovaApi.finance.deletePaymentTerm(id),
    onSuccess: () => {
      toast.success('Payment term removed.');
      invalidateFinance();
    },
    onError: () => toast.error('Unable to delete payment term.'),
  });

  const summary = useMemo(() => {
    const totalBilled = invoices.reduce(
      (sum, inv) => sum + Number(inv.total_amount || 0),
      0
    );
    const totalPaid = invoices.reduce(
      (sum, inv) => sum + Number(inv.paid_amount || 0),
      0
    );
    const totalOutstanding = invoices.reduce(
      (sum, inv) => sum + Number(inv.balance || 0),
      0
    );
    const overdueCount = invoices.filter(
      (inv) =>
        (inv.status === 'overdue' ||
          (inv.due_date &&
            Number(inv.balance || 0) > 0 &&
            inv.due_date.slice(0, 10) < new Date().toISOString().slice(0, 10)))
    ).length;
    return { totalBilled, totalPaid, totalOutstanding, overdueCount };
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    const q = searchInvoice.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
      if (!q) return true;
      return (
        String(inv.invoice_number || '').toLowerCase().includes(q) ||
        String(inv.student_name || '').toLowerCase().includes(q) ||
        String(inv.class_name || '').toLowerCase().includes(q)
      );
    });
  }, [invoices, searchInvoice, statusFilter]);

  const filteredPayments = useMemo(() => {
    const q = searchPayment.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter((pay) =>
      [pay.receipt_number, pay.transaction_ref, pay.payment_method, pay.paid_at]
        .map((s) => String(s || '').toLowerCase())
        .some((s) => s.includes(q))
    );
  }, [payments, searchPayment]);

  const filteredDebtors = useMemo(() => {
    const q = searchDebtor.trim().toLowerCase();
    if (!q) return debtors;
    return debtors.filter((d) =>
      String(d.student_name || '')
        .toLowerCase()
        .includes(q)
    );
  }, [debtors, searchDebtor]);

  const openNewTerm = () => {
    setEditingTerm(null);
    termForm.reset({
      name: '',
      code: '',
      description: '',
      dueDays: 0,
      installmentCount: 1,
      isActive: true,
    });
    setTermOpen(true);
  };

  const openEditTerm = (term: PaymentTermRow) => {
    setEditingTerm(term);
    termForm.reset({
      name: term.name,
      code: term.code,
      description: term.description || '',
      dueDays: Number(term.due_days || 0),
      installmentCount: Number(term.installment_count || 1),
      isActive: term.is_active,
    });
    setTermOpen(true);
  };

  const openPaymentModal = (invoice?: InvoiceRow) => {
    if (invoice) {
      paymentForm.reset({
        invoiceId: invoice.id,
        amount: Number(invoice.balance || 0),
        paymentMethod: 'cash',
        transactionRef: '',
        paidAt: new Date().toISOString().slice(0, 10),
        notes: '',
      });
    }
    setPaymentOpen(true);
  };

  if (invoicesLoading && paymentsLoading && debtorsLoading && termsLoading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance Workspace"
        description="Manage invoices, record payments, track debtors, and configure payment terms for the school."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              leftIcon={<ReceiptText className="h-4 w-4" />}
              onClick={() => setInvoiceOpen(true)}
            >
              Create Invoice
            </Button>
            <Button
              variant="secondary"
              leftIcon={<Banknote className="h-4 w-4" />}
              onClick={() => openPaymentModal()}
            >
              Record Payment
            </Button>
            <Button
              leftIcon={<Wallet className="h-4 w-4" />}
              onClick={openNewTerm}
            >
              New Payment Term
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Total Billed',
            value: currency(summary.totalBilled),
            icon: FileSpreadsheet,
            tone: 'slate',
          },
          {
            label: 'Total Collected',
            value: currency(summary.totalPaid),
            icon: BadgeCheck,
            tone: 'emerald',
          },
          {
            label: 'Outstanding Balance',
            value: currency(summary.totalOutstanding),
            icon: ShieldAlert,
            tone: 'amber',
          },
          {
            label: 'Overdue Invoices',
            value: String(summary.overdueCount),
            icon: Receipt,
            tone: 'rose',
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="h-full">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-1 truncate text-2xl font-bold text-brand-navy">
                    {item.value}
                  </p>
                </div>
                <span className="shrink-0 rounded-2xl bg-brand-navy/5 p-3 text-brand-navy">
                  <Icon className="h-5 w-5" />
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {invoicesError ? (
        <Alert
          title="Unable to load finance records"
          message="Retry loading the latest invoices, payments, and balances."
          variant="error"
          action={<Button onClick={() => refetchInvoices()}>Retry</Button>}
        />
      ) : null}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="debtors">Debtors</TabsTrigger>
          <TabsTrigger value="terms">Payment Terms</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <Card>
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
              <div className="w-full max-w-sm">
                <SearchInput
                  value={searchInvoice}
                  placeholder="Search invoices by student, class, or number…"
                  onDebouncedChange={setSearchInvoice}
                />
              </div>
              <Select
                className="w-full max-w-[180px]"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </Select>
              <div className="ml-auto text-sm text-slate-500">
                {filteredInvoices.length} invoice{filteredInvoices.length === 1 ? '' : 's'}
              </div>
            </div>
            {filteredInvoices.length === 0 ? (
              <EmptyState
                icon={<ReceiptText className="h-6 w-6" />}
                title="No invoices match"
                message="Create an invoice to start tracking fees and balances for this institution."
                cta={
                  <Button leftIcon={<UserPlus className="h-4 w-4" />} onClick={() => setInvoiceOpen(true)}>
                    Create First Invoice
                  </Button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Invoice</th>
                      <th className="px-5 py-3">Student</th>
                      <th className="px-5 py-3">Class</th>
                      <th className="px-5 py-3 text-right">Total</th>
                      <th className="px-5 py-3 text-right">Paid</th>
                      <th className="px-5 py-3 text-right">Balance</th>
                      <th className="px-5 py-3">Due</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="align-middle">
                        <td className="px-5 py-4 font-semibold text-brand-navy">
                          {inv.invoice_number}
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          {inv.student_name || '—'}
                        </td>
                        <td className="px-5 py-4 text-slate-500">
                          {inv.class_name || '—'}
                        </td>
                        <td className="px-5 py-4 text-right font-medium text-slate-700">
                          {currency(inv.total_amount)}
                        </td>
                        <td className="px-5 py-4 text-right font-medium text-emerald-700">
                          {currency(inv.paid_amount)}
                        </td>
                        <td className="px-5 py-4 text-right font-semibold text-brand-navy">
                          {currency(inv.balance)}
                        </td>
                        <td className="px-5 py-4 text-slate-500">
                          {inv.due_date ? String(inv.due_date).slice(0, 10) : '—'}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                              statusStyles[inv.status] || statusStyles.pending
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Button
                            size="sm"
                            variant="secondary"
                            leftIcon={<Banknote className="h-4 w-4" />}
                            onClick={() => openPaymentModal(inv)}
                            disabled={Number(inv.balance || 0) <= 0}
                          >
                            Record Payment
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
              <div className="w-full max-w-sm">
                <SearchInput
                  value={searchPayment}
                  placeholder="Search payments by receipt, reference, or date…"
                  onDebouncedChange={setSearchPayment}
                />
              </div>
              <div className="ml-auto text-sm text-slate-500">
                {filteredPayments.length} payment{filteredPayments.length === 1 ? '' : 's'}
              </div>
            </div>
            {filteredPayments.length === 0 ? (
              <EmptyState
                icon={<Banknote className="h-6 w-6" />}
                title="No payments yet"
                message="Record a payment to mark an invoice as partially or fully settled."
                cta={
                  <Button leftIcon={<Banknote className="h-4 w-4" />} onClick={() => openPaymentModal()}>
                    Record First Payment
                  </Button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Receipt</th>
                      <th className="px-5 py-3">Invoice</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                      <th className="px-5 py-3">Method</th>
                      <th className="px-5 py-3">Reference</th>
                      <th className="px-5 py-3">Paid On</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredPayments.map((pay) => (
                      <tr key={pay.id} className="align-middle">
                        <td className="px-5 py-4 font-semibold text-brand-navy">
                          {pay.receipt_number || pay.id}
                        </td>
                        <td className="px-5 py-4 text-slate-700">{pay.invoice_id}</td>
                        <td className="px-5 py-4 text-right font-medium text-emerald-700">
                          {currency(pay.amount)}
                        </td>
                        <td className="px-5 py-4 capitalize text-slate-600">
                          <Badge variant="info">
                            {String(pay.payment_method || '').replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-slate-500">
                          {pay.transaction_ref || '—'}
                        </td>
                        <td className="px-5 py-4 text-slate-500">
                          {String(pay.paid_at || '').slice(0, 10)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="debtors">
          <Card>
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
              <div className="w-full max-w-sm">
                <SearchInput
                  value={searchDebtor}
                  placeholder="Search debtors by student name…"
                  onDebouncedChange={setSearchDebtor}
                />
              </div>
              <div className="ml-auto text-sm text-slate-500">
                {filteredDebtors.length} debtor{filteredDebtors.length === 1 ? '' : 's'}
              </div>
            </div>
            {debtorsLoading ? (
              <div className="p-6 text-sm text-slate-400">Loading debtors register…</div>
            ) : filteredDebtors.length === 0 ? (
              <EmptyState
                icon={<ShieldAlert className="h-6 w-6" />}
                title="No outstanding balances"
                message="Every learner currently has a settled account. Great work."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Student</th>
                      <th className="px-5 py-3">Class</th>
                      <th className="px-5 py-3 text-right">Owing</th>
                      <th className="px-5 py-3">Open Invoices</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredDebtors.map((d) => (
                      <tr key={d.student_id} className="align-middle">
                        <td className="px-5 py-4 font-semibold text-brand-navy">
                          {d.student_name || d.student_id}
                        </td>
                        <td className="px-5 py-4 text-slate-500">{d.class_name || '—'}</td>
                        <td className="px-5 py-4 text-right font-semibold text-rose-700">
                          {currency(d.total_owing)}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1.5">
                            {d.invoices.map((inv) => (
                              <div
                                key={inv.id}
                                className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2"
                              >
                                <div>
                                  <p className="text-xs font-semibold text-brand-navy">
                                    {inv.invoice_number}
                                  </p>
                                  <p className="text-[11px] text-slate-500">
                                    Due {inv.due_date ? String(inv.due_date).slice(0, 10) : '—'}
                                  </p>
                                </div>
                                <p className="text-xs font-semibold text-rose-700">
                                  {currency(inv.balance)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="terms">
          <Card>
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold text-brand-navy">Payment Terms</h3>
                <p className="text-xs text-slate-500">
                  Define how invoices are split and when they become due.
                </p>
              </div>
              <div className="ml-auto">
                <Button leftIcon={<Wallet className="h-4 w-4" />} onClick={openNewTerm}>
                  New Payment Term
                </Button>
              </div>
            </div>
            {termsLoading ? (
              <div className="p-6 text-sm text-slate-400">Loading payment terms…</div>
            ) : paymentTerms.length === 0 ? (
              <EmptyState
                icon={<Wallet className="h-6 w-6" />}
                title="No payment terms configured"
                message="Add your first term such as Full Payment on Admission or Two Equal Installments."
                cta={
                  <Button leftIcon={<Wallet className="h-4 w-4" />} onClick={openNewTerm}>
                    Create Payment Term
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 p-5">
                {paymentTerms.map((term) => (
                  <div
                    key={term.id}
                    className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-base font-semibold text-brand-navy">
                              {term.name}
                            </p>
                            {term.is_active ? (
                              <Badge variant="active">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="inactive">
                                Inactive
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            {term.code}
                          </p>
                        </div>
                      </div>
                      {term.description ? (
                        <p className="mt-3 text-sm text-slate-600">{term.description}</p>
                      ) : null}
                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-xl bg-brand-navy/[0.04] px-3 py-2">
                          <p className="text-slate-500">Due after issue</p>
                          <p className="mt-1 text-sm font-semibold text-brand-navy">
                            {term.due_days} day{term.due_days === 1 ? '' : 's'}
                          </p>
                        </div>
                        <div className="rounded-xl bg-brand-navy/[0.04] px-3 py-2">
                          <p className="text-slate-500">Installments</p>
                          <p className="mt-1 text-sm font-semibold text-brand-navy">
                            {term.installment_count}
                          </p>
                        </div>
                      </div>
                      {Array.isArray(term.installment_percentages) &&
                      term.installment_percentages.length > 0 ? (
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {term.installment_percentages.map((p, i) => (
                            <span
                              key={i}
                              className="rounded-full bg-brand-gold/10 px-2.5 py-1 text-[11px] font-semibold text-brand-navy ring-1 ring-brand-gold/20"
                            >
                              Installment {i + 1} · {p}%
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Trash2 className="h-4 w-4 text-rose-600" />}
                        onClick={() => {
                          if (window.confirm(`Delete payment term "${term.name}"?`)) {
                            deletePaymentTerm.mutate(term.id);
                          }
                        }}
                        loading={deletePaymentTerm.isPending}
                      >
                        Delete
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openEditTerm(term)}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <Modal
        open={invoiceOpen}
        onOpenChange={(open) => {
          setInvoiceOpen(open);
          if (!open) invoiceForm.reset();
        }}
        title="Create Invoice"
        description="Raise a new fee invoice against a learner or class assignment."
        size="lg"
      >
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={invoiceForm.handleSubmit((values) =>
            createInvoice.mutate(values)
          )}
        >
          <Input
            label="Student Name"
            error={invoiceForm.formState.errors.studentName?.message}
            {...invoiceForm.register('studentName')}
          />
          <Input
            label="Class or Level"
            error={invoiceForm.formState.errors.className?.message}
            {...invoiceForm.register('className')}
          />
          <Input
            label="Primary Line Item"
            error={invoiceForm.formState.errors.itemName?.message}
            {...invoiceForm.register('itemName')}
          />
          <Input
            label="Total Amount"
            type="number"
            min={0}
            step="0.01"
            error={invoiceForm.formState.errors.totalAmount?.message}
            {...invoiceForm.register('totalAmount')}
          />
          <Input
            label="Due Date"
            type="date"
            error={invoiceForm.formState.errors.dueDate?.message}
            {...invoiceForm.register('dueDate')}
          />
          <Input
            label="Student ID (optional)"
            {...invoiceForm.register('studentId')}
          />
          <div className="flex items-center justify-end gap-2 md:col-span-2 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setInvoiceOpen(false);
                invoiceForm.reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={createInvoice.isPending}>
              Create Invoice
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={paymentOpen}
        onOpenChange={(open) => {
          setPaymentOpen(open);
          if (!open) paymentForm.reset();
        }}
        title="Record Payment"
        description="Settle all or part of an issued invoice."
        size="lg"
      >
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={paymentForm.handleSubmit((values) =>
            recordPayment.mutate(values)
          )}
        >
          <div className="md:col-span-2">
            <Select
              label="Invoice"
              error={paymentForm.formState.errors.invoiceId?.message}
              {...paymentForm.register('invoiceId')}
            >
              <option value="">Select invoice…</option>
              {invoices
                .filter((inv) => Number(inv.balance || 0) > 0)
                .map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number} · {inv.student_name || 'Student'} ·{' '}
                    {currency(inv.balance)} balance
                  </option>
                ))}
            </Select>
          </div>
          <Input
            label="Amount"
            type="number"
            min={0}
            step="0.01"
            error={paymentForm.formState.errors.amount?.message}
            {...paymentForm.register('amount')}
          />
          <Select
            label="Payment Method"
            error={paymentForm.formState.errors.paymentMethod?.message}
            {...paymentForm.register('paymentMethod')}
          >
            <option value="cash">Cash</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="bank">Bank Transfer</option>
            <option value="card">Card</option>
          </Select>
          <Input
            label="Payment Date"
            type="date"
            error={paymentForm.formState.errors.paidAt?.message}
            {...paymentForm.register('paidAt')}
          />
          <Input
            label="Transaction Reference (optional)"
            {...paymentForm.register('transactionRef')}
          />
          <div className="md:col-span-2">
            <Input
              label="Notes (optional)"
              {...paymentForm.register('notes')}
            />
          </div>
          <div className="flex items-center justify-end gap-2 md:col-span-2 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setPaymentOpen(false);
                paymentForm.reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={recordPayment.isPending}>
              Record Payment
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={termOpen}
        onOpenChange={(open) => {
          setTermOpen(open);
          if (!open) {
            setEditingTerm(null);
            termForm.reset();
          }
        }}
        title={editingTerm ? 'Edit Payment Term' : 'Create Payment Term'}
        description="Control due windows and installment splits for invoices."
        size="lg"
      >
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={termForm.handleSubmit((values) => savePaymentTerm.mutate(values))}
        >
          <Input
            label="Term Name"
            error={termForm.formState.errors.name?.message}
            {...termForm.register('name')}
          />
          <Input
            label="Short Code"
            error={termForm.formState.errors.code?.message}
            {...termForm.register('code')}
          />
          <Input
            label="Due Days (after issue)"
            type="number"
            min={0}
            error={termForm.formState.errors.dueDays?.message}
            {...termForm.register('dueDays')}
          />
          <Input
            label="Number of Installments"
            type="number"
            min={1}
            error={termForm.formState.errors.installmentCount?.message}
            {...termForm.register('installmentCount')}
          />
          <div className="md:col-span-2">
            <Input
              label="Description (optional)"
              error={termForm.formState.errors.description?.message}
              {...termForm.register('description')}
            />
          </div>
          <div className="flex items-center justify-end gap-2 md:col-span-2 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setTermOpen(false);
                setEditingTerm(null);
                termForm.reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={savePaymentTerm.isPending}>
              {editingTerm ? 'Save Changes' : 'Create Payment Term'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default FinanceDashboardPage;
