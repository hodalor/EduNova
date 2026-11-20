import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { eduovaApi } from '../../api/eduovaApi';
import { getApiErrorMessage } from '../../api/axiosInstance';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import PageHeader from '../shared/PageHeader';
import { useAuthStore } from '../../store/authStore';

interface Notice {
  id: string;
  title: string;
  body: string;
  program_ids: string[];
  created_at: string;
}

interface NoticeResponse {
  programs: Array<{ id: string; name: string }>;
  notices: Notice[];
}

const NoticesPage = () => {
  const role = useAuthStore((state) => state.role);
  const canPost = role === 'institution_admin' || role === 'super_admin';
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [programIds, setProgramIds] = useState<string[]>([]);
  const noticesQuery = useQuery<NoticeResponse>({
    queryKey: ['university-notices'],
    queryFn: eduovaApi.university.notices,
  });

  const createNotice = useMutation({
    mutationFn: () => eduovaApi.university.createNotice({ title, body, program_ids: programIds }),
    onSuccess: () => {
      toast.success('Notice posted.');
      setTitle('');
      setBody('');
      setProgramIds([]);
      queryClient.invalidateQueries({ queryKey: ['university-notices'] });
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'Unable to post this notice.')),
  });

  const programs = noticesQuery.data?.programs || [];
  const notices = noticesQuery.data?.notices || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="In-app notices"
        description="Post a notice to every programme, or choose the programmes that should read it. Students see it on this page."
      />
      {canPost ? (
        <form
          className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5"
          onSubmit={(event) => {
            event.preventDefault();
            createNotice.mutate();
          }}
        >
          <Input label="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-700">Notice</span>
            <textarea
              className="min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`rounded-full px-3 py-2 text-xs font-semibold ${
                programIds.length === 0 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
              }`}
              onClick={() => setProgramIds([])}
            >
              All programmes
            </button>
            {programs.map((program: { id: string; name: string }) => (
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
          <Button type="submit" loading={createNotice.isPending}>
            Post notice
          </Button>
        </form>
      ) : null}
      <div className="space-y-3">
        {notices.length === 0 ? <p className="text-sm text-slate-500">No notices yet.</p> : null}
        {notices.map((notice: Notice) => (
          <article key={notice.id} className="rounded-3xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              {notice.program_ids?.length ? 'Selected programmes' : 'All programmes'} ·{' '}
              {new Date(notice.created_at).toLocaleString()}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">{notice.title}</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{notice.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
};

export default NoticesPage;
