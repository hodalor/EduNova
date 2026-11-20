import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { eduovaApi } from '../../api/eduovaApi';
import { getApiErrorMessage } from '../../api/axiosInstance';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import PageHeader from '../shared/PageHeader';

interface ProgramOption {
  id: string;
  name: string;
}

interface Blast {
  id: string;
  subject: string;
  channel: string;
  attempted: number;
  delivered: number;
  created_at: string;
}

const MessageBlastPage = () => {
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [contacts, setContacts] = useState('');
  const [channel, setChannel] = useState<'email' | 'sms' | 'both'>('email');
  const [programIds, setProgramIds] = useState<string[]>([]);
  const programsQuery = useQuery<{ programs: ProgramOption[] }>({
    queryKey: ['university-notices'],
    queryFn: eduovaApi.university.notices,
  });
  const blastsQuery = useQuery<Blast[]>({
    queryKey: ['university-blasts'],
    queryFn: eduovaApi.university.blasts,
  });

  const sendBlast = useMutation({
    mutationFn: () =>
      eduovaApi.university.sendBlast({
        subject,
        body,
        contacts,
        channel,
        program_ids: programIds,
      }),
    onSuccess: (blast: Blast) => {
      toast.success(`Sent ${blast.delivered} of ${blast.attempted}.`);
      setSubject('');
      setBody('');
      setContacts('');
      queryClient.invalidateQueries({ queryKey: ['university-blasts'] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'Unable to send this message.')),
  });

  const programs = programsQuery.data?.programs || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="SMS and email"
        description="Type addresses, paste a CSV of emails or phone numbers, or choose programmes and send to the addresses already on those students."
      />
      <form
        className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5"
        onSubmit={(event) => {
          event.preventDefault();
          sendBlast.mutate();
        }}
      >
        <Input label="Subject" value={subject} onChange={(event) => setSubject(event.target.value)} />
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-slate-700">Message</span>
          <textarea
            className="min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-slate-700">Contacts or CSV</span>
          <textarea
            className="min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            placeholder="name,email,phone"
            value={contacts}
            onChange={(event) => setContacts(event.target.value)}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-slate-700">Upload CSV</span>
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setContacts(await file.text());
            }}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {(['email', 'sms', 'both'] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={`rounded-full px-3 py-2 text-xs font-semibold ${
                channel === item ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
              }`}
              onClick={() => setChannel(item)}
            >
              {item === 'both' ? 'SMS and email' : item.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {programs.map((program: ProgramOption) => (
            <button
              key={program.id}
              type="button"
              className={`rounded-full px-3 py-2 text-xs font-semibold ${
                programIds.includes(program.id) ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
              }`}
              onClick={() =>
                setProgramIds((current) =>
                  current.includes(program.id)
                    ? current.filter((item) => item !== program.id)
                    : [...current, program.id]
                )
              }
            >
              {program.name}
            </button>
          ))}
        </div>
        <Button type="submit" loading={sendBlast.isPending}>
          Send
        </Button>
      </form>
      <div className="rounded-3xl border border-slate-200 bg-white">
        {(blastsQuery.data || []).map((blast: Blast) => (
          <div key={blast.id} className="border-b border-slate-100 px-5 py-4 last:border-b-0">
            <p className="font-semibold text-slate-900">{blast.subject}</p>
            <p className="mt-1 text-sm text-slate-500">
              {blast.channel} · {blast.delivered}/{blast.attempted} delivered ·{' '}
              {new Date(blast.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MessageBlastPage;
