import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Search, ShieldCheck, XCircle } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { eduovaApi } from '../../api/eduovaApi';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import PageLoader from '../../components/ui/PageLoader';

interface VerificationPayload {
  verified: boolean;
  verification_code: string;
  verified_at: string;
  transcript_title: string;
  issued_on?: string;
  latest_period?: string;
  total_courses_taken?: number;
  total_credit_hours?: number;
  cgpa?: number;
  final_classification?: string;
  institution?: {
    name?: string;
    website?: string;
    email?: string;
    logo_url?: string;
  };
  student?: {
    student_number?: string;
    name?: string;
    program_name?: string;
    department_name?: string;
    faculty_name?: string;
  };
}

const formatDate = (value?: string) => {
  if (!value) {
    return 'Pending';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const TranscriptVerificationPage = () => {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const normalizedCode = useMemo(() => String(code || '').trim().toUpperCase(), [code]);
  const [searchCode, setSearchCode] = useState(normalizedCode);

  const verificationQuery = useQuery<VerificationPayload>({
    queryKey: ['transcript-verification', normalizedCode],
    queryFn: () => eduovaApi.tertiary.verifyTranscript(normalizedCode),
    enabled: Boolean(normalizedCode),
    retry: false,
  });

  const handleSearch = () => {
    const nextCode = searchCode.trim().toUpperCase();
    if (!nextCode) {
      return;
    }
    navigate(`/transcript/verify/${encodeURIComponent(nextCode)}`);
  };

  const data = verificationQuery.data;

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
            EduNOVA Verification
          </p>
          <h1 className="mt-3 text-3xl font-bold text-brand-navy">Transcript Verification</h1>
          <p className="mt-3 text-sm text-slate-600">
            Confirm whether an academic transcript issued by the institution is authentic.
          </p>
        </div>

        <Card title="Verification Code" description="Enter the code printed on the transcript.">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="flex-1">
              <Input
                label="Verification Code"
                value={searchCode}
                onChange={(event) => setSearchCode(event.target.value.toUpperCase())}
                placeholder="e.g. A1B2C3D4E5F6"
              />
            </div>
            <div className="flex items-end">
              <Button leftIcon={<Search className="h-4 w-4" />} onClick={handleSearch}>
                Verify Transcript
              </Button>
            </div>
          </div>
        </Card>

        {!normalizedCode ? (
          <Alert
            title="No code entered yet"
            message="Paste or type a transcript verification code to check the record."
            variant="info"
          />
        ) : verificationQuery.isLoading ? (
          <PageLoader />
        ) : verificationQuery.isError || !data ? (
          <Card title="Verification Result" description="The transcript could not be confirmed with this code.">
            <div className="flex flex-col items-center gap-4 rounded-3xl border border-rose-200 bg-rose-50 px-6 py-10 text-center">
              <XCircle className="h-14 w-14 text-rose-500" />
              <div>
                <p className="text-lg font-semibold text-rose-700">Verification Failed</p>
                <p className="mt-2 text-sm text-rose-600">
                  We could not find a transcript record that matches <span className="font-semibold">{normalizedCode}</span>.
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <Card
            title="Verification Result"
            description="The transcript record was found and matched successfully."
          >
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4 rounded-3xl border border-emerald-200 bg-emerald-50 px-6 py-8 text-center">
                <ShieldCheck className="h-14 w-14 text-emerald-600" />
                <div>
                  <p className="text-lg font-semibold text-emerald-700">Transcript Verified</p>
                  <p className="mt-2 text-sm text-emerald-700">
                    This transcript was confirmed on {formatDate(data.verified_at)}.
                  </p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Institution</p>
                    <p className="mt-2 text-lg font-semibold text-brand-navy">{data.institution?.name || 'Institution'}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {[data.institution?.website, data.institution?.email].filter(Boolean).join(' · ') || 'Contact details unavailable'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Student</p>
                    <p className="mt-2 text-lg font-semibold text-brand-navy">{data.student?.name || 'Student'}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {data.student?.student_number || 'No student number'} · {data.student?.program_name || 'No program'}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {[data.student?.faculty_name, data.student?.department_name].filter(Boolean).join(' · ') || 'Academic unit not available'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Verification Code</p>
                    <p className="mt-2 text-lg font-semibold text-brand-navy">{data.verification_code}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Issued On</p>
                    <p className="mt-2 text-lg font-semibold text-brand-navy">{formatDate(data.issued_on)}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Latest Period</p>
                  <p className="mt-2 font-semibold text-brand-navy">{data.latest_period || 'Pending'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Total Courses</p>
                  <p className="mt-2 font-semibold text-brand-navy">{Number(data.total_courses_taken || 0)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Credit Hours</p>
                  <p className="mt-2 font-semibold text-brand-navy">{Number(data.total_credit_hours || 0)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">CGPA</p>
                  <p className="mt-2 font-semibold text-brand-navy">{Number(data.cgpa || 0).toFixed(2)}</p>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Final Classification</p>
                <div className="mt-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <p className="font-semibold text-brand-navy">{data.final_classification || 'Pending'}</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        <div className="text-center text-sm text-slate-500">
          <Link to="/login" className="font-semibold text-brand-navy hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TranscriptVerificationPage;
