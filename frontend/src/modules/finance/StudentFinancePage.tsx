import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { eduovaApi } from '../../api/eduovaApi';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import PageHeader from '../shared/PageHeader';
import Select from '../../components/ui/Select';
import { useAuthStore } from '../../store/authStore';

interface InvoiceRow {
  id: string;
  invoice_number: string;
  total_amount: number | string;
  paid_amount: number | string;
  balance: number | string;
  net_balance?: number | string;
  credit_balance?: number | string;
  due_date?: string;
  status: string;
}

interface PaymentAccountLookup {
  student_id: string;
  student_number?: string | null;
  student_name?: string | null;
  class_name?: string | null;
  program_name?: string | null;
  credit_balance?: number | string;
  outstanding_amount?: number | string;
  net_outstanding_amount?: number | string;
  invoices: InvoiceRow[];
}

interface GatewayRequest {
  gateway_reference: string;
  checkout_url?: string | null;
  ussd_code?: string | null;
  provider_message?: string | null;
  status: string;
}

const currency = (value: number | string | null | undefined) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const StudentFinancePage = () => {
  const user = useAuthStore((state) => state.user);
  const [studentIdentifier, setStudentIdentifier] = useState(
    user?.student_number || user?.student_id || ''
  );
  const [invoiceId, setInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [channel, setChannel] = useState<'mobile_money' | 'card' | 'bank' | 'ussd'>(
    'mobile_money'
  );
  const [payerPhone, setPayerPhone] = useState(user?.phone || '');

  const lookupAccount = useMutation({
    mutationFn: (identifier: string) => eduovaApi.finance.lookupPaymentAccount(identifier),
    onError: () => toast.error('Unable to confirm your student finance account.'),
  });

  const initiatePayment = useMutation({
    mutationFn: () =>
      eduovaApi.finance.initiateGatewayPayment({
        student_identifier: studentIdentifier,
        invoice_id: invoiceId,
        amount: Number(amount || 0),
        channel,
        payer_phone: payerPhone || undefined,
      }),
    onSuccess: () => toast.success('Payment request created.'),
    onError: () => toast.error('Unable to start this payment request.'),
  });

  const account = lookupAccount.data as PaymentAccountLookup | undefined;
  const paymentRequest = initiatePayment.data as GatewayRequest | undefined;
  const payableInvoices = useMemo(
    () => (account?.invoices || []).filter((item) => Number(item.net_balance ?? item.balance ?? 0) > 0),
    [account]
  );

  useEffect(() => {
    if (!studentIdentifier) {
      return;
    }
    lookupAccount.mutate(studentIdentifier);
    // We only want this initial verification when the identifier is seeded from auth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!account) {
      return;
    }
    const nextInvoice = payableInvoices[0];
    if (nextInvoice) {
      setInvoiceId(nextInvoice.id);
      setAmount(String(Number(nextInvoice.net_balance ?? nextInvoice.balance ?? 0)));
    }
  }, [account, payableInvoices]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Finance"
        description="Confirm your student account, review invoices, and start a bank, card, mobile money, or USSD payment."
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card title="Account Confirmation">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Student ID"
              value={studentIdentifier}
              onChange={(event) => setStudentIdentifier(event.target.value)}
            />
            <div className="flex items-end">
              <Button
                className="w-full"
                onClick={() => lookupAccount.mutate(studentIdentifier)}
                loading={lookupAccount.isPending}
              >
                Confirm My Account
              </Button>
            </div>
            {account ? (
              <>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Student</p>
                  <p className="mt-2 font-semibold text-brand-navy">
                    {account.student_name || 'Student'}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {account.student_number || account.student_id}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Program</p>
                  <p className="mt-2 font-semibold text-brand-navy">
                    {account.program_name || account.class_name || 'Not assigned'}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Net outstanding {currency(account.net_outstanding_amount)}
                  </p>
                </div>
              </>
            ) : (
              <div className="md:col-span-2">
                <Alert
                  title="Confirm student account first"
                  message="Enter your student ID so the system can confirm your name and program before payment starts."
                  variant="info"
                />
              </div>
            )}
          </div>
        </Card>

        <Card title="Payment Status">
          <div className="space-y-4">
            <div
              className={`rounded-2xl p-4 ${
                Number(account?.net_outstanding_amount || 0) > 0
                  ? 'bg-rose-50'
                  : Number(account?.credit_balance || 0) > 0
                    ? 'bg-emerald-50'
                    : 'bg-slate-50'
              }`}
            >
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                {Number(account?.net_outstanding_amount || 0) > 0 ? 'Outstanding' : 'Credit'}
              </p>
              <p
                className={`mt-2 text-3xl font-bold ${
                  Number(account?.net_outstanding_amount || 0) > 0
                    ? 'text-rose-600'
                    : 'text-emerald-600'
                }`}
              >
                GHS{' '}
                {currency(
                  Number(account?.net_outstanding_amount || 0) > 0
                    ? account?.net_outstanding_amount
                    : account?.credit_balance
                )}
              </p>
            </div>
            <Alert
              title="Gateway skeleton ready"
              message="Live gateway APIs are not connected yet, but this flow already confirms your identity, selects an invoice, and creates a callback-ready payment request."
              variant="info"
            />
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card title="Open Invoices">
          {payableInvoices.length ? (
            <div className="space-y-3">
              {payableInvoices.map((invoice) => (
                <button
                  key={invoice.id}
                  type="button"
                  className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                    invoiceId === invoice.id
                      ? 'border-brand-navy bg-brand-navy/[0.04]'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                  onClick={() => {
                    setInvoiceId(invoice.id);
                    setAmount(String(Number(invoice.net_balance ?? invoice.balance ?? 0)));
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-brand-navy">{invoice.invoice_number}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Due {invoice.due_date ? String(invoice.due_date).slice(0, 10) : '—'}
                      </p>
                    </div>
                    <Badge
                      variant={Number(invoice.net_balance ?? invoice.balance ?? 0) > 0 ? 'inactive' : 'active'}
                    >
                      {currency(invoice.net_balance ?? invoice.balance)}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No unpaid invoices"
              message="When finance posts a new invoice for you, it will appear here."
            />
          )}
        </Card>

        <Card title="Pay Now">
          <div className="space-y-4">
            <Select
              label="Invoice"
              value={invoiceId}
              onChange={(event) => setInvoiceId(event.target.value)}
            >
              <option value="">Select invoice…</option>
              {payableInvoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoice_number} · {currency(invoice.net_balance ?? invoice.balance)}
                </option>
              ))}
            </Select>
            <Input
              label="Amount"
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
            <Select
              label="Channel"
              value={channel}
              onChange={(event) =>
                setChannel(event.target.value as 'mobile_money' | 'card' | 'bank' | 'ussd')
              }
            >
              <option value="mobile_money">Mobile Money</option>
              <option value="card">Bank Card</option>
              <option value="bank">Bank Transfer</option>
              <option value="ussd">USSD</option>
            </Select>
            <Input
              label="Phone Number"
              value={payerPhone}
              onChange={(event) => setPayerPhone(event.target.value)}
            />
            <Button
              className="w-full"
              onClick={() => initiatePayment.mutate()}
              loading={initiatePayment.isPending}
              disabled={!account || !invoiceId || !amount}
            >
              Start Payment Request
            </Button>

            {paymentRequest ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-semibold text-brand-navy">Reference {paymentRequest.gateway_reference}</p>
                {paymentRequest.checkout_url ? (
                  <p className="mt-2 break-all">Checkout URL: {paymentRequest.checkout_url}</p>
                ) : null}
                {paymentRequest.ussd_code ? (
                  <p className="mt-2 font-semibold text-brand-navy">USSD: {paymentRequest.ussd_code}</p>
                ) : null}
                <p className="mt-2">
                  {paymentRequest.provider_message || 'Awaiting live provider handoff.'}
                </p>
              </div>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default StudentFinancePage;
