import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';

import { eduovaApi } from '../../api/eduovaApi';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import PageLoader from '../../components/ui/PageLoader';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import PageHeader from '../shared/PageHeader';

const feeStructureSchema = z.object({
  level: z.string().min(1),
  className: z.string().optional(),
  term: z.string().min(1),
  items: z.array(
    z.object({
      fee_type: z.string().min(1),
      amount: z.coerce.number().positive(),
      due_date: z.string().min(1),
    })
  ),
});

type FeeStructureValues = z.input<typeof feeStructureSchema>;

interface FeeStructureRow {
  id: string;
  level: string;
  className: string;
  term: string;
  fee_type: string;
  amount: number;
  due_date: string;
}

const FeeStructurePage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['finance-fee-structures'],
    queryFn: eduovaApi.finance.feeStructures,
  });

  const { register, control, handleSubmit } = useForm<FeeStructureValues>({
    resolver: zodResolver(feeStructureSchema),
    defaultValues: {
      level: 'PR',
      className: '',
      term: 'Term 2',
      items: [{ fee_type: 'Tuition', amount: 950, due_date: '2026-06-20' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fee Structures"
        description="Maintain fee plans by level, class, and term with configurable fee items."
      />

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <Table<FeeStructureRow>
          title="Configured Fee Structures"
          data={(data || []) as FeeStructureRow[]}
          columns={[
            { header: 'Level', accessorKey: 'level' },
            { header: 'Class', accessorKey: 'className' },
            { header: 'Term', accessorKey: 'term' },
            { header: 'Fee Item', accessorKey: 'fee_type' },
            { header: 'Amount', cell: ({ row }) => `GHS ${row.original.amount.toLocaleString()}` },
            { header: 'Due Date', accessorKey: 'due_date' },
          ]}
        />

        <Card title="Create / Edit Structure" description="Build fee items for a specific academic grouping.">
          <form
            className="space-y-4"
            onSubmit={handleSubmit(() => {
              return;
            })}
          >
            <Select label="Level" {...register('level')}>
              <option value="PR">PR</option>
              <option value="JH">JH</option>
              <option value="SH">SH</option>
              <option value="TR">TR</option>
            </Select>
            <Input label="Class (Optional)" {...register('className')} />
            <Select label="Term" {...register('term')}>
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </Select>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="rounded-3xl border border-slate-200 p-4">
                  <div className="grid gap-3">
                    <Input label="Fee Type" {...register(`items.${index}.fee_type`)} />
                    <Input label="Amount" type="number" {...register(`items.${index}.amount`)} />
                    <Input label="Due Date" type="date" {...register(`items.${index}.due_date`)} />
                    <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                      Remove Item
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => append({ fee_type: '', amount: 0, due_date: '' })}
              >
                Add Fee Item
              </Button>
              <Button type="submit">Save Structure</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default FeeStructurePage;
