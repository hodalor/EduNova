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
import { ConfirmDialog } from '../../components/ui/core';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/Tabs';
import { formatCurrencyAmount, resolvePrimaryCurrencyCode } from '../../utils/currency';
import PageHeader from '../shared/PageHeader';
import { useAuthStore } from '../../store/authStore';

const statusStyles: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  partial: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  pending: 'bg-slate-50 text-slate-700 ring-1 ring-slate-200',
  overdue: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
};

const invoiceSchema = z.object({
  studentName: z.string().min(2, 'Student name is required'),
  studentNumber: z.string().optional(),
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
  requiresApproval: z.boolean().optional(),
  proofReference: z.string().optional(),
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
  student_number?: string;
  class_name?: string;
  student_category?: 'local' | 'international' | string;
  currency_code?: string;
  total_amount: number | string;
  paid_amount: number | string;
  balance: number | string;
  credit_balance?: number | string;
  net_balance?: number | string;
  status: 'paid' | 'partial' | 'pending' | 'overdue' | string;
  due_date?: string;
}

interface PaymentRow {
  id: string;
  invoice_id: string;
  student_id?: string;
  amount: number | string;
  currency_code?: string;
  payment_method: string;
  receipt_number?: string;
  transaction_ref?: string;
  paid_at: string;
  received_by?: string;
  notes?: string;
}

interface PaymentApprovalRow {
  id: string;
  invoice_id: string;
  invoice_number?: string;
  student_name?: string;
  class_name?: string;
  amount: number | string;
  currency_code?: string;
  payment_method: string;
  transaction_ref?: string;
  proof_reference?: string;
  status: 'pending_director' | 'pending_accountant' | 'approved' | 'rejected' | string;
  requested_at: string;
  requested_by?: string;
  rejection_reason?: string | null;
  director_approval?: { approved_by?: string; approved_at?: string; note?: string } | null;
  accountant_approval?: { approved_by?: string; approved_at?: string; note?: string } | null;
  posted_payment?: { id?: string; receipt_number?: string | null; amount?: number | string } | null;
}

interface DebtorRow {
  student_id: string;
  student_name?: string;
  class_name?: string;
  student_category?: 'local' | 'international' | string;
  currency_code?: string;
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

interface PaymentGatewayRequestRow {
  id: string;
  student_id: string;
  student_number?: string | null;
  student_name?: string | null;
  program_name?: string | null;
  invoice_id: string;
  invoice_number?: string | null;
  amount: number | string;
  currency_code?: string | null;
  channel: 'bank' | 'card' | 'mobile_money' | 'ussd' | string;
  status: 'pending_gateway' | 'success' | 'failed' | string;
  gateway_reference: string;
  checkout_url?: string | null;
  ussd_code?: string | null;
  provider_message?: string | null;
  callback_status?: string | null;
  created_at: string;
  posted_payment?: { receipt_number?: string | null; amount?: number | string } | null;
}

interface PaymentAccountLookup {
  student_id: string;
  student_number?: string | null;
  student_name?: string | null;
  class_name?: string | null;
  level_code?: string | null;
  program_name?: string | null;
  currency_code?: string | null;
  credit_balance?: number | string;
  outstanding_amount?: number | string;
  net_outstanding_amount?: number | string;
  invoices: InvoiceRow[];
  payments: PaymentRow[];
}

interface StudentLookupRow {
  id: string;
  name: string;
  student_number: string;
  className?: string;
  level?: string;
}

interface FinanceSettings {
  default_local_currency: string;
  default_international_currency: string;
}

const resolveApiErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object') {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) {
      return response.data.message;
    }
    const message = (error as { message?: string }).message;
    if (message) {
      return message;
    }
  }

  return fallback;
};

const formatMoney = (
  currencyCode: string | null | undefined,
  value: number | string | null | undefined
) => formatCurrencyAmount(currencyCode, value);

const approvalLabel = (status: PaymentApprovalRow['status']) =>
  String(status || '').replaceAll('_', ' ');

const FinanceDashboardPage = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const institution = useAuthStore((state) => state.institution);
  const tenantContext = useAuthStore((state) => state.tenantContext);
  const activeInstitutionId = (tenantContext || institution)?.id || null;
  const permissions = useAuthStore((state) => state.permissions);
  const canDirectorApprove = permissions.includes('finance_approve_director');
  const canAccountantApprove = permissions.includes('finance_approve_accountant');
  const [tab, setTab] = useState('invoices');

  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [termOpen, setTermOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<PaymentTermRow | null>(null);
  const [deleteTermState, setDeleteTermState] = useState<{
    open: boolean;
    termId: string | null;
    termName: string;
  }>({
    open: false,
    termId: null,
    termName: '',
  });

  const [searchInvoice, setSearchInvoice] = useState('');
  const [searchPayment, setSearchPayment] = useState('');
  const [searchDebtor, setSearchDebtor] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [studentLookupOpen, setStudentLookupOpen] = useState(false);
  const [studentLookupField, setStudentLookupField] = useState<'studentName' | 'studentNumber'>(
    'studentName'
  );
  const [paymentChannelStudentId, setPaymentChannelStudentId] = useState('');
  const [gatewayInvoiceId, setGatewayInvoiceId] = useState('');
  const [gatewayChannel, setGatewayChannel] = useState<'bank' | 'card' | 'mobile_money' | 'ussd'>(
    'mobile_money'
  );
  const [gatewayAmount, setGatewayAmount] = useState('');
  const [gatewayPhone, setGatewayPhone] = useState('');
  const [gatewayReference, setGatewayReference] = useState('');

  const invalidateFinance = () => {
    queryClient.invalidateQueries({ queryKey: ['finance-invoices', activeInstitutionId] });
    queryClient.invalidateQueries({ queryKey: ['finance-payments', activeInstitutionId] });
    queryClient.invalidateQueries({ queryKey: ['finance-payment-approvals', activeInstitutionId] });
    queryClient.invalidateQueries({ queryKey: ['finance-debtors', activeInstitutionId] });
    queryClient.invalidateQueries({ queryKey: ['finance-payment-terms', activeInstitutionId] });
    queryClient.invalidateQueries({ queryKey: ['finance-payment-gateway-requests', activeInstitutionId] });
    queryClient.invalidateQueries({ queryKey: ['finance-dashboard', activeInstitutionId] });
  };

  const financeSettingsQuery = useQuery<FinanceSettings>({
    queryKey: ['finance-settings', activeInstitutionId],
    queryFn: eduovaApi.finance.settings,
    enabled: Boolean(activeInstitutionId),
  });

  const invoicesQuery = useQuery<InvoiceRow[]>({
    queryKey: ['finance-invoices', activeInstitutionId],
    queryFn: eduovaApi.finance.invoices,
    enabled: Boolean(activeInstitutionId),
  });
  const invoices = useMemo<InvoiceRow[]>(() => invoicesQuery.data ?? [], [invoicesQuery.data]);
  const primaryInvoiceCurrencyCode = useMemo(
    () => resolvePrimaryCurrencyCode(invoices, financeSettingsQuery.data?.default_local_currency),
    [financeSettingsQuery.data?.default_local_currency, invoices]
  );
  const invoiceCurrencyById = useMemo(
    () =>
      new Map(
        invoices.map((invoice) => [
          String(invoice.id || invoice.invoice_number || ''),
          invoice.currency_code || primaryInvoiceCurrencyCode,
        ])
      ),
    [invoices, primaryInvoiceCurrencyCode]
  );
  const invoicesLoading = invoicesQuery.isLoading;
  const invoicesError = invoicesQuery.isError;
  const refetchInvoices = invoicesQuery.refetch;

  const paymentsQuery = useQuery<PaymentRow[]>({
    queryKey: ['finance-payments', activeInstitutionId],
    queryFn: eduovaApi.finance.payments,
    enabled: Boolean(activeInstitutionId),
  });
  const payments = useMemo<PaymentRow[]>(() => paymentsQuery.data ?? [], [paymentsQuery.data]);
  const paymentsLoading = paymentsQuery.isLoading;

  const approvalsQuery = useQuery<PaymentApprovalRow[]>({
    queryKey: ['finance-payment-approvals', activeInstitutionId],
    queryFn: eduovaApi.finance.paymentApprovals,
    enabled: Boolean(activeInstitutionId),
  });
  const approvals = useMemo<PaymentApprovalRow[]>(
    () => approvalsQuery.data ?? [],
    [approvalsQuery.data]
  );

  const gatewayRequestsQuery = useQuery<PaymentGatewayRequestRow[]>({
    queryKey: ['finance-payment-gateway-requests', activeInstitutionId],
    queryFn: eduovaApi.finance.paymentGatewayRequests,
    enabled: Boolean(activeInstitutionId),
  });
  const gatewayRequests = useMemo<PaymentGatewayRequestRow[]>(
    () => gatewayRequestsQuery.data ?? [],
    [gatewayRequestsQuery.data]
  );

  const debtorsQuery = useQuery<DebtorRow[]>({
    queryKey: ['finance-debtors', activeInstitutionId],
    queryFn: eduovaApi.finance.debtors,
    enabled: Boolean(activeInstitutionId),
  });
  const debtors = useMemo<DebtorRow[]>(() => debtorsQuery.data ?? [], [debtorsQuery.data]);
  const debtorsLoading = debtorsQuery.isLoading;

  const termsQuery = useQuery<PaymentTermRow[]>({
    queryKey: ['finance-payment-terms', activeInstitutionId],
    queryFn: eduovaApi.finance.paymentTerms,
    enabled: Boolean(activeInstitutionId),
  });
  const paymentTerms = useMemo<PaymentTermRow[]>(
    () => termsQuery.data ?? [],
    [termsQuery.data]
  );
  const termsLoading = termsQuery.isLoading;

  const studentsQuery = useQuery<StudentLookupRow[]>({
    queryKey: ['finance-student-lookup', activeInstitutionId],
    queryFn: eduovaApi.students.list,
    enabled: Boolean(activeInstitutionId),
  });
  const students = useMemo<StudentLookupRow[]>(
    () =>
      (studentsQuery.data ?? []).map((student: StudentLookupRow) => ({
        id: student.id,
        name: student.name,
        student_number: student.student_number,
        className: student.className,
        level: student.level,
      })),
    [studentsQuery.data]
  );

  const paymentAccountLookup = useMutation({
    mutationFn: (identifier: string) => eduovaApi.finance.lookupPaymentAccount(identifier),
    onSuccess: (account: PaymentAccountLookup) => {
      toast.success('Student account confirmed.');
      const nextInvoiceId =
        account.invoices.find((item) => Number(item.net_balance ?? item.balance ?? 0) > 0)?.id || '';
      setGatewayInvoiceId(nextInvoiceId);
      const matchedInvoice = account.invoices.find((item) => item.id === nextInvoiceId);
      setGatewayAmount(
        matchedInvoice ? String(Number(matchedInvoice.net_balance ?? matchedInvoice.balance ?? 0)) : ''
      );
    },
    onError: (error: unknown) => toast.error(resolveApiErrorMessage(error, 'Unable to confirm that student ID.')),
  });

  const invoiceForm = useForm<InvoiceValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      studentName: '',
      studentNumber: '',
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
      requiresApproval: false,
      proofReference: '',
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
      setStudentLookupOpen(false);
      invalidateFinance();
    },
    onError: (error: unknown) => toast.error(resolveApiErrorMessage(error, 'Unable to create invoice. Please try again.')),
  });

  const recordPayment = useMutation({
    mutationFn: async (values: PaymentValues) => {
      if (values.requiresApproval) {
        return eduovaApi.finance.initiatePaymentApproval({
          invoice_id: values.invoiceId,
          amount: Number(values.amount),
          payment_method: values.paymentMethod,
          transaction_ref: values.transactionRef || undefined,
          proof_reference: values.proofReference || undefined,
          notes: values.notes || undefined,
        });
      }
      return eduovaApi.finance.recordPayment({
        invoice_id: values.invoiceId,
        amount: Number(values.amount),
        payment_method: values.paymentMethod,
        transaction_ref: values.transactionRef || undefined,
        paid_at: values.paidAt,
        notes: values.notes || undefined,
      });
    },
    onSuccess: () => {
      toast.success('Payment request saved successfully.');
      setPaymentOpen(false);
      paymentForm.reset();
      invalidateFinance();
    },
    onError: (error: unknown) => toast.error(resolveApiErrorMessage(error, 'Unable to save payment request. Please try again.')),
  });

  const approvePaymentApproval = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      eduovaApi.finance.approvePaymentApproval(id, { action }),
    onSuccess: () => {
      toast.success('Approval updated.');
      invalidateFinance();
    },
    onError: (error: unknown) =>
      toast.error(resolveApiErrorMessage(error, 'Unable to update finance approval.')),
  });

  const initiateGatewayPayment = useMutation({
    mutationFn: () =>
      eduovaApi.finance.initiateGatewayPayment({
        student_identifier: paymentChannelStudentId,
        invoice_id: gatewayInvoiceId,
        amount: Number(gatewayAmount || 0),
        channel: gatewayChannel,
        payer_phone: gatewayPhone || undefined,
      }),
    onSuccess: (request: PaymentGatewayRequestRow) => {
      toast.success('Gateway request created.');
      setGatewayReference(request.gateway_reference);
      queryClient.invalidateQueries({ queryKey: ['finance-payment-gateway-requests', activeInstitutionId] });
      invalidateFinance();
    },
    onError: (error: unknown) =>
      toast.error(resolveApiErrorMessage(error, 'Unable to start the gateway payment skeleton.')),
  });

  const handleGatewayCallback = useMutation({
    mutationFn: (status: 'success' | 'failed') =>
      eduovaApi.finance.handleGatewayCallback({
        gateway_reference: gatewayReference,
        status,
      }),
    onSuccess: () => {
      toast.success('Gateway callback processed.');
      invalidateFinance();
    },
    onError: (error: unknown) =>
      toast.error(resolveApiErrorMessage(error, 'Unable to process the gateway callback.')),
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
    onError: (error: unknown) => toast.error(resolveApiErrorMessage(error, 'Unable to save payment term.')),
  });

  const deletePaymentTerm = useMutation({
    mutationFn: (id: string) => eduovaApi.finance.deletePaymentTerm(id),
    onSuccess: () => {
      toast.success('Payment term removed.');
      invalidateFinance();
    },
    onError: (error: unknown) => toast.error(resolveApiErrorMessage(error, 'Unable to delete payment term.')),
  });

  const summary = useMemo(() => {
    const defaultLocalCurrency = financeSettingsQuery.data?.default_local_currency || '';
    const defaultInternationalCurrency =
      financeSettingsQuery.data?.default_international_currency || '';
    const base = {
      local: {
        billed: 0,
        paid: 0,
        outstanding: 0,
        currencyCode: defaultLocalCurrency,
      },
      international: {
        billed: 0,
        paid: 0,
        outstanding: 0,
        currencyCode: defaultInternationalCurrency,
      },
    };

    invoices.forEach((inv) => {
      const category =
        String(inv.student_category || 'local').trim().toLowerCase() === 'international'
          ? 'international'
          : 'local';
      const bucket = base[category];
      bucket.currencyCode = inv.currency_code || bucket.currencyCode;
      bucket.billed += Number(inv.total_amount || 0);
      bucket.paid += Number(inv.paid_amount || 0);
      bucket.outstanding += Number(inv.net_balance ?? inv.balance ?? 0);
    });

    const overdueCount = invoices.filter(
      (inv) =>
        (inv.status === 'overdue' ||
          (inv.due_date &&
            Number(inv.net_balance ?? inv.balance ?? 0) > 0 &&
            inv.due_date.slice(0, 10) < new Date().toISOString().slice(0, 10)))
    ).length;
    return { ...base, overdueCount };
  }, [financeSettingsQuery.data?.default_international_currency, financeSettingsQuery.data?.default_local_currency, invoices]);

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

  const directorQueue = useMemo(
    () => approvals.filter((item) => item.status === 'pending_director'),
    [approvals]
  );
  const accountantQueue = useMemo(
    () => approvals.filter((item) => item.status === 'pending_accountant'),
    [approvals]
  );
  const closedApprovals = useMemo(
    () => approvals.filter((item) => item.status === 'approved' || item.status === 'rejected'),
    [approvals]
  );
  const paymentAccount = paymentAccountLookup.data ?? null;
  const paymentAccountInvoices = paymentAccount?.invoices ?? [];

  const invoiceStudentName = invoiceForm.watch('studentName') || '';
  const invoiceStudentNumber = invoiceForm.watch('studentNumber') || '';
  const invoiceStudentId = invoiceForm.watch('studentId');
  const selectedStudent = useMemo(
    () => students.find((student) => student.id === invoiceStudentId) || null,
    [invoiceStudentId, students]
  );
  const activeLookupValue =
    studentLookupField === 'studentNumber' ? invoiceStudentNumber : invoiceStudentName;
  const matchedStudents = useMemo(() => {
    const query = activeLookupValue.trim().toLowerCase();
    if (!studentLookupOpen || !query) {
      return [];
    }

    return students
      .filter((student) => {
        const studentName = String(student.name || '').toLowerCase();
        const studentNumber = String(student.student_number || '').toLowerCase();
        return studentName.includes(query) || studentNumber.includes(query);
      })
      .slice(0, 8);
  }, [activeLookupValue, studentLookupOpen, students]);

  const applyStudentSelection = async (student: StudentLookupRow) => {
    invoiceForm.setValue('studentId', student.id, { shouldDirty: true });
    invoiceForm.setValue('studentName', student.name, {
      shouldDirty: true,
      shouldValidate: true,
    });
    invoiceForm.setValue('studentNumber', student.student_number, { shouldDirty: true });
    invoiceForm.setValue('className', student.className || student.level || '', {
      shouldDirty: true,
      shouldValidate: true,
    });
    setStudentLookupOpen(false);
    try {
      const registrationState = (await queryClient.fetchQuery({
        queryKey: ['finance-invoice-preview', student.id],
        queryFn: () => eduovaApi.tertiary.studentRegistration(student.id),
      })) as {
        current_period?: { name?: string };
        fee_summary?: { outstanding_amount?: number; total_amount?: number };
      };
      const outstandingAmount = Number(
        registrationState?.fee_summary?.outstanding_amount ??
          registrationState?.fee_summary?.total_amount ??
          0
      );
      if (outstandingAmount > 0) {
        invoiceForm.setValue('totalAmount', outstandingAmount, {
          shouldDirty: true,
          shouldValidate: true,
        });
        invoiceForm.setValue(
          'itemName',
          registrationState?.current_period?.name
            ? `${registrationState.current_period.name} semester fees`
            : 'Semester fees',
          { shouldDirty: true, shouldValidate: true }
        );
      }
    } catch (_error) {
      // Leave manual invoice entry available when no live fee preview is available.
    }
  };

  const handleInvoiceStudentInput = (
    field: 'studentName' | 'studentNumber',
    value: string
  ) => {
    const currentSelectedStudent =
      students.find((student) => student.id === invoiceForm.getValues('studentId')) || null;

    if (currentSelectedStudent) {
      const selectedFieldValue =
        field === 'studentName'
          ? currentSelectedStudent.name
          : currentSelectedStudent.student_number;
      const pairedField = field === 'studentName' ? 'studentNumber' : 'studentName';
      const pairedFieldValue =
        field === 'studentName'
          ? currentSelectedStudent.student_number
          : currentSelectedStudent.name;

      if (value !== selectedFieldValue) {
        invoiceForm.setValue('studentId', '', { shouldDirty: true });
        if (invoiceForm.getValues(pairedField) === pairedFieldValue) {
          invoiceForm.setValue(pairedField, '', { shouldDirty: true });
        }
      }
    }

    invoiceForm.setValue(field, value, { shouldDirty: true, shouldValidate: field === 'studentName' });
    setStudentLookupField(field);
    setStudentLookupOpen(Boolean(value.trim()));
  };

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
        amount: Number(invoice.net_balance ?? invoice.balance ?? 0),
        paymentMethod: 'cash',
        transactionRef: '',
        paidAt: new Date().toISOString().slice(0, 10),
        notes: '',
        requiresApproval: false,
        proofReference: '',
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          {
            label: `Local Billed (${summary.local.currencyCode})`,
            value: formatMoney(summary.local.currencyCode, summary.local.billed),
            icon: FileSpreadsheet,
            tone: 'slate',
          },
          {
            label: `Local Collected (${summary.local.currencyCode})`,
            value: formatMoney(summary.local.currencyCode, summary.local.paid),
            icon: BadgeCheck,
            tone: 'emerald',
          },
          {
            label: `Local Outstanding (${summary.local.currencyCode})`,
            value: formatMoney(summary.local.currencyCode, summary.local.outstanding),
            icon: ShieldAlert,
            tone: 'amber',
          },
          {
            label: `Intl Billed (${summary.international.currencyCode})`,
            value: formatMoney(summary.international.currencyCode, summary.international.billed),
            icon: FileSpreadsheet,
            tone: 'slate',
          },
          {
            label: `Intl Collected (${summary.international.currencyCode})`,
            value: formatMoney(summary.international.currencyCode, summary.international.paid),
            icon: BadgeCheck,
            tone: 'emerald',
          },
          {
            label: `Intl Outstanding (${summary.international.currencyCode})`,
            value: formatMoney(summary.international.currencyCode, summary.international.outstanding),
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

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        {summary.overdueCount} overdue invoice{summary.overdueCount === 1 ? '' : 's'} need follow-up.
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
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="channels">Payment Channels</TabsTrigger>
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
                      <th className="px-5 py-3">Category</th>
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
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant={
                                String(inv.student_category || 'local').trim().toLowerCase() ===
                                'international'
                                  ? 'inactive'
                                  : 'info'
                              }
                            >
                              {String(inv.student_category || 'local')}
                            </Badge>
                            <span className="text-[11px] font-medium text-slate-500">
                              {inv.currency_code || primaryInvoiceCurrencyCode}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right font-medium text-slate-700">
                          {formatMoney(inv.currency_code, inv.total_amount)}
                        </td>
                        <td className="px-5 py-4 text-right font-medium text-emerald-700">
                          {formatMoney(inv.currency_code, inv.paid_amount)}
                        </td>
                        <td
                          className={`px-5 py-4 text-right font-semibold ${
                            Number(inv.net_balance ?? inv.balance ?? 0) > 0
                              ? 'text-rose-700'
                              : Number(inv.credit_balance || 0) > 0
                                ? 'text-emerald-700'
                                : 'text-brand-navy'
                          }`}
                        >
                          {formatMoney(inv.currency_code, inv.net_balance ?? inv.balance)}
                          {Number(inv.credit_balance || 0) > 0 ? (
                            <div className="text-[11px] font-medium text-emerald-600">
                              Credit {formatMoney(inv.currency_code, inv.credit_balance)}
                            </div>
                          ) : null}
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
                            disabled={Number(inv.net_balance ?? inv.balance ?? 0) <= 0}
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
                          {formatMoney(
                            pay.currency_code || invoiceCurrencyById.get(String(pay.invoice_id || '')),
                            pay.amount
                          )}
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

        <TabsContent value="approvals">
          <div className="grid gap-6 xl:grid-cols-3">
            <Card title="Director Queue" description="Manual deposits wait here first.">
              <div className="space-y-3">
                {directorQueue.length ? (
                  directorQueue.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-brand-navy">
                            {item.student_name || 'Student'} · {item.invoice_number || item.invoice_id}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {String(item.payment_method).replace('_', ' ')} ·{' '}
                            {formatMoney(
                              item.currency_code ||
                                invoiceCurrencyById.get(String(item.invoice_id || '')) ||
                                primaryInvoiceCurrencyCode,
                              item.amount
                            )}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {item.proof_reference || item.transaction_ref || 'Awaiting proof reference'}
                          </p>
                        </div>
                        <Badge variant="info">{approvalLabel(item.status)}</Badge>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => approvePaymentApproval.mutate({ id: item.id, action: 'approve' })}
                          loading={approvePaymentApproval.isPending}
                          disabled={!canDirectorApprove}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => approvePaymentApproval.mutate({ id: item.id, action: 'reject' })}
                          loading={approvePaymentApproval.isPending}
                          disabled={!canDirectorApprove}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    icon={<ShieldAlert className="h-6 w-6" />}
                    title="No director approvals pending"
                    message="New manual payment requests will land here before they move to the accountant."
                  />
                )}
              </div>
            </Card>

            <Card title="Accountant Queue" description="Second approval posts the payment to the student account.">
              <div className="space-y-3">
                {accountantQueue.length ? (
                  accountantQueue.map((item) => {
                    const isSameApprover =
                      Boolean(item.director_approval?.approved_by) &&
                      String(item.director_approval?.approved_by) === String(user?.id || '');
                    return (
                      <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-brand-navy">
                              {item.student_name || 'Student'} · {item.invoice_number || item.invoice_id}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {String(item.payment_method).replace('_', ' ')} ·{' '}
                              {formatMoney(
                                item.currency_code ||
                                  invoiceCurrencyById.get(String(item.invoice_id || '')) ||
                                  primaryInvoiceCurrencyCode,
                                item.amount
                              )}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              Director approved on {String(item.director_approval?.approved_at || '').slice(0, 10) || '—'}
                            </p>
                            {isSameApprover ? (
                              <p className="mt-2 text-xs font-medium text-amber-700">
                                Final approval must be completed by a different user with accountant approval access.
                              </p>
                            ) : null}
                          </div>
                          <Badge variant="info">{approvalLabel(item.status)}</Badge>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            onClick={() => approvePaymentApproval.mutate({ id: item.id, action: 'approve' })}
                            loading={approvePaymentApproval.isPending}
                            disabled={!canAccountantApprove || isSameApprover}
                          >
                            Final Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => approvePaymentApproval.mutate({ id: item.id, action: 'reject' })}
                            loading={approvePaymentApproval.isPending}
                            disabled={!canAccountantApprove || isSameApprover}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <EmptyState
                    icon={<BadgeCheck className="h-6 w-6" />}
                    title="No accountant approvals pending"
                    message="Director-approved requests will appear here for final posting."
                  />
                )}
              </div>
            </Card>

            <Card title="Closed Requests" description="Approved and rejected manual payment requests.">
              <div className="space-y-3">
                {closedApprovals.length ? (
                  closedApprovals.slice(0, 8).map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-brand-navy">
                            {item.student_name || 'Student'} · {item.invoice_number || item.invoice_id}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {formatMoney(
                              item.currency_code ||
                                invoiceCurrencyById.get(String(item.invoice_id || '')) ||
                                primaryInvoiceCurrencyCode,
                              item.amount
                            )}{' '}
                            · {String(item.payment_method).replace('_', ' ')}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {item.posted_payment?.receipt_number
                              ? `Receipt ${item.posted_payment.receipt_number}`
                              : item.rejection_reason || 'Closed'}
                          </p>
                        </div>
                        <Badge variant={item.status === 'approved' ? 'active' : 'inactive'}>
                          {approvalLabel(item.status)}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    icon={<ReceiptText className="h-6 w-6" />}
                    title="No approval history yet"
                    message="Approved and rejected requests will build an audit trail here."
                  />
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="channels">
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <Card title="Student Payment Lookup" description="Confirm a student ID before card, bank, mobile money, or USSD payment.">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Student ID"
                  value={paymentChannelStudentId}
                  onChange={(event) => setPaymentChannelStudentId(event.target.value)}
                />
                <div className="flex items-end">
                  <Button
                    className="w-full"
                    onClick={() => paymentAccountLookup.mutate(paymentChannelStudentId)}
                    loading={paymentAccountLookup.isPending}
                  >
                    Confirm Student
                  </Button>
                </div>
                {paymentAccount ? (
                  <>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Student</p>
                      <p className="mt-2 font-semibold text-brand-navy">
                        {paymentAccount.student_name || 'Student'}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {paymentAccount.student_number || paymentAccount.student_id}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Program</p>
                      <p className="mt-2 font-semibold text-brand-navy">
                        {paymentAccount.program_name || paymentAccount.class_name || 'Not assigned'}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Outstanding{' '}
                        {formatMoney(
                          paymentAccount.currency_code || primaryInvoiceCurrencyCode,
                          paymentAccount.net_outstanding_amount
                        )}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <Select
                        label="Invoice"
                        value={gatewayInvoiceId}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          setGatewayInvoiceId(nextValue);
                          const match = paymentAccountInvoices.find((item) => item.id === nextValue);
                          setGatewayAmount(
                            match ? String(Number(match.net_balance ?? match.balance ?? 0)) : ''
                          );
                        }}
                      >
                        <option value="">Select invoice…</option>
                        {paymentAccountInvoices
                          .filter((item) => Number(item.net_balance ?? item.balance ?? 0) > 0)
                          .map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.invoice_number} ·{' '}
                              {formatMoney(
                                item.currency_code ||
                                  paymentAccount.currency_code ||
                                  primaryInvoiceCurrencyCode,
                                item.net_balance ?? item.balance
                              )}{' '}
                              balance
                            </option>
                          ))}
                      </Select>
                    </div>
                    <Input
                      label="Amount"
                      type="number"
                      min={0}
                      step="0.01"
                      value={gatewayAmount}
                      onChange={(event) => setGatewayAmount(event.target.value)}
                    />
                    <Select
                      label="Channel"
                      value={gatewayChannel}
                      onChange={(event) =>
                        setGatewayChannel(
                          event.target.value as 'bank' | 'card' | 'mobile_money' | 'ussd'
                        )
                      }
                    >
                      <option value="mobile_money">Mobile Money</option>
                      <option value="card">Bank Card</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="ussd">USSD</option>
                    </Select>
                    <Input
                      label="Payer Phone"
                      value={gatewayPhone}
                      onChange={(event) => setGatewayPhone(event.target.value)}
                    />
                    <div className="md:col-span-2 flex justify-end">
                      <Button
                        onClick={() => initiateGatewayPayment.mutate()}
                        loading={initiateGatewayPayment.isPending}
                        disabled={!paymentAccount || !gatewayInvoiceId || !gatewayAmount}
                      >
                        Start Payment Skeleton
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="md:col-span-2">
                    <Alert
                      title="Lookup required"
                      message="Enter the student ID first so the name, program, and invoice balance can be confirmed before payment."
                      variant="info"
                    />
                  </div>
                )}
              </div>
            </Card>

            <Card title="Gateway Callback Sandbox" description="Simulate the provider callback that credits the invoice after success.">
              <div className="space-y-4">
                <Input
                  label="Gateway Reference"
                  value={gatewayReference}
                  onChange={(event) => setGatewayReference(event.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => handleGatewayCallback.mutate('success')}
                    loading={handleGatewayCallback.isPending}
                    disabled={!gatewayReference}
                  >
                    Simulate Success
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleGatewayCallback.mutate('failed')}
                    loading={handleGatewayCallback.isPending}
                    disabled={!gatewayReference}
                  >
                    Simulate Failure
                  </Button>
                </div>
                <div className="space-y-3 border-t border-slate-100 pt-4">
                  {gatewayRequests.length ? (
                    gatewayRequests.slice(0, 8).map((request) => (
                      <div key={request.id} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-brand-navy">
                              {request.student_name || request.student_number || request.student_id}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {request.invoice_number || request.invoice_id} ·{' '}
                              {formatMoney(
                                request.currency_code ||
                                  invoiceCurrencyById.get(String(request.invoice_id || '')) ||
                                  paymentAccount?.currency_code ||
                                  primaryInvoiceCurrencyCode,
                                request.amount
                              )}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">{request.gateway_reference}</p>
                            {request.ussd_code ? (
                              <p className="mt-1 text-xs font-semibold text-brand-navy">
                                USSD {request.ussd_code}
                              </p>
                            ) : null}
                          </div>
                          <Badge
                            variant={
                              request.status === 'success'
                                ? 'active'
                                : request.status === 'failed'
                                  ? 'inactive'
                                  : 'info'
                            }
                          >
                            {request.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      icon={<Wallet className="h-6 w-6" />}
                      title="No gateway requests yet"
                      message="Once a student payment skeleton starts, the callback-ready references will show here."
                    />
                  )}
                </div>
              </div>
            </Card>
          </div>
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
                      <th className="px-5 py-3">Category</th>
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
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant={
                                String(d.student_category || 'local').trim().toLowerCase() ===
                                'international'
                                  ? 'inactive'
                                  : 'info'
                              }
                            >
                              {String(d.student_category || 'local')}
                            </Badge>
                            <span className="text-[11px] font-medium text-slate-500">
                              {d.currency_code || primaryInvoiceCurrencyCode}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right font-semibold text-rose-700">
                          {formatMoney(d.currency_code, d.total_owing)}
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
                                  {formatMoney(d.currency_code, inv.balance)}
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
                        onClick={() =>
                          setDeleteTermState({
                            open: true,
                            termId: term.id,
                            termName: term.name,
                          })
                        }
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
          if (!open) setStudentLookupOpen(false);
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
            value={invoiceStudentName}
            helperText={
              selectedStudent
                ? `Linked to ${selectedStudent.className || selectedStudent.level || 'active enrollment'}`
                : 'Type a student name or use the student ID field to search.'
            }
            error={invoiceForm.formState.errors.studentName?.message}
            onFocus={() => {
              setStudentLookupField('studentName');
              setStudentLookupOpen(Boolean(invoiceStudentName.trim()));
            }}
            onBlur={() => window.setTimeout(() => setStudentLookupOpen(false), 120)}
            onChange={(event) => handleInvoiceStudentInput('studentName', event.target.value)}
          />
          <Input
            label="Student ID"
            value={invoiceStudentNumber}
            helperText="Live search works with the student number as well."
            onFocus={() => {
              setStudentLookupField('studentNumber');
              setStudentLookupOpen(Boolean(invoiceStudentNumber.trim()));
            }}
            onBlur={() => window.setTimeout(() => setStudentLookupOpen(false), 120)}
            onChange={(event) => handleInvoiceStudentInput('studentNumber', event.target.value)}
          />
          {studentLookupOpen ? (
            <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
              {studentsQuery.isLoading ? (
                <p className="px-3 py-2 text-sm text-slate-500">Loading students…</p>
              ) : matchedStudents.length ? (
                <div className="space-y-1">
                  {matchedStudents.map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      className="w-full rounded-2xl px-3 py-3 text-left transition hover:bg-white"
                      onMouseDown={() => applyStudentSelection(student)}
                    >
                      <p className="font-semibold text-brand-navy">{student.name}</p>
                      <p className="text-sm text-slate-500">
                        {student.student_number}
                        {student.className || student.level
                          ? ` · ${student.className || student.level}`
                          : ''}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="px-3 py-2 text-sm text-slate-500">
                  No students match that search yet.
                </p>
              )}
            </div>
          ) : null}
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
          <input type="hidden" {...invoiceForm.register('studentName')} />
          <input type="hidden" {...invoiceForm.register('studentId')} />
          <input type="hidden" {...invoiceForm.register('studentNumber')} />
          <div className="flex items-center justify-between gap-2 md:col-span-2 pt-4">
            {selectedStudent ? (
              <span className="text-sm text-slate-500">
                Selected learner: {selectedStudent.name} ({selectedStudent.student_number})
              </span>
            ) : (
              <span className="text-sm text-slate-400">
                You can still create an ad-hoc invoice without linking a saved student.
              </span>
            )}
            <div className="flex items-center gap-2">
              {selectedStudent ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    invoiceForm.setValue('studentId', '', { shouldDirty: true });
                    invoiceForm.setValue('studentName', '', { shouldDirty: true });
                    invoiceForm.setValue('studentNumber', '', { shouldDirty: true });
                    invoiceForm.setValue('className', '', { shouldDirty: true });
                  }}
                >
                  Clear Student
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setInvoiceOpen(false);
                  setStudentLookupOpen(false);
                  invoiceForm.reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={createInvoice.isPending}>
                Create Invoice
              </Button>
            </div>
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
                .filter((inv) => Number(inv.net_balance ?? inv.balance ?? 0) > 0)
                .map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number} · {inv.student_name || 'Student'} ·{' '}
                    {formatMoney(
                      inv.currency_code || primaryInvoiceCurrencyCode,
                      inv.net_balance ?? inv.balance
                    )}{' '}
                    balance
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
          <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label className="flex items-start gap-3 text-sm text-slate-700">
              <input type="checkbox" className="mt-0.5" {...paymentForm.register('requiresApproval')} />
              <span>
                Use manual approval flow.
                <span className="mt-1 block text-xs text-slate-500">
                  Director approves first, then accountant posts the payment to the student account.
                </span>
              </span>
            </label>
          </div>
          {paymentForm.watch('requiresApproval') ? (
            <div className="md:col-span-2">
              <Input
                label="Proof Reference"
                error={paymentForm.formState.errors.proofReference?.message}
                {...paymentForm.register('proofReference')}
              />
            </div>
          ) : null}
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

      <ConfirmDialog
        open={deleteTermState.open}
        onOpenChange={(open) =>
          setDeleteTermState((current) => ({
            ...current,
            open,
          }))
        }
        title="Delete Payment Term"
        description={`Delete payment term "${deleteTermState.termName}"? Existing invoices will keep their saved balances, but this payment template will no longer be available.`}
        onConfirm={() => {
          if (deleteTermState.termId) {
            deletePaymentTerm.mutate(deleteTermState.termId);
          }
        }}
        confirmLabel="Delete Term"
      />
    </div>
  );
};

export default FinanceDashboardPage;
