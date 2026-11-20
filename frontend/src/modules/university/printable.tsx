import type { ReactNode } from 'react';

import Button from '../../components/ui/Button';

export interface SchoolLetterhead {
  name: string;
  tagline?: string;
  logo_url?: string;
  address?: string;
  phone?: string;
  email?: string;
  currency?: string;
}

export const PrintableSheet = ({ children }: { children: ReactNode }) => (
  <div>
    <style>{`
      @media print {
        body * { visibility: hidden !important; }
        #print-sheet, #print-sheet * { visibility: visible !important; }
        #print-sheet { position: absolute; left: 0; top: 0; width: 100%; background: white; }
      }
    `}</style>
    <div className="mb-4 flex justify-end print:hidden">
      <Button onClick={() => window.print()}>Download or print</Button>
    </div>
    <div id="print-sheet" className="mx-auto max-w-4xl bg-white p-8 text-slate-900 shadow-sm ring-1 ring-slate-200">
      {children}
    </div>
  </div>
);

export const Letterhead = ({ school }: { school: SchoolLetterhead }) => (
  <div className="flex items-start justify-between gap-4 border-b-2 border-slate-900 pb-4">
    <div className="flex items-center gap-3">
      {school.logo_url ? <img src={school.logo_url} alt="" className="h-16 w-16 object-contain" /> : null}
      <div>
        <p className="text-lg font-bold uppercase tracking-wide">{school.name}</p>
        {school.tagline ? <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{school.tagline}</p> : null}
        <p className="mt-1 text-xs text-slate-600">
          {[school.address, school.phone, school.email].filter(Boolean).join(' · ')}
        </p>
      </div>
    </div>
  </div>
);
