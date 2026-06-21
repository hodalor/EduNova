import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react';
import { useEffect, useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Search,
  UploadCloud,
  X,
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';

import { cn } from '../../lib/cn';

export interface SpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const spinnerSizeMap = {
  sm: 'h-4 w-4 border-2',
  md: 'h-5 w-5 border-2',
  lg: 'h-7 w-7 border-[3px]',
};

export const Spinner = ({ className, size = 'md' }: SpinnerProps) => (
  <span
    className={cn(
      'inline-block animate-spin rounded-full border-slate-300 border-t-brand-gold',
      spinnerSizeMap[size],
      className
    )}
  />
);

export const PageLoader = () => (
  <div className="flex min-h-[40vh] items-center justify-center">
    <div className="surface flex items-center gap-3 px-5 py-4 text-sm font-medium text-slate-600">
      <Spinner />
      Loading EDUOVA workspace...
    </div>
  </div>
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const buttonVariantMap = {
  primary: 'bg-brand-navy text-white hover:bg-slate-900',
  secondary: 'bg-amber-50 text-brand-navy ring-1 ring-amber-200 hover:bg-amber-100',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
  danger: 'bg-rose-500 text-white hover:bg-rose-600',
};

const buttonSizeMap = {
  sm: 'h-9 rounded-xl px-3 text-sm',
  md: 'h-11 rounded-2xl px-4 text-sm',
  lg: 'h-12 rounded-2xl px-5 text-base',
};

export const Button = ({
  className,
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  disabled,
  ...props
}: ButtonProps) => (
  <button
    className={cn(
      'inline-flex items-center justify-center gap-2 font-semibold shadow-sm transition focus:outline-none focus:ring-4 focus:ring-amber-100 disabled:cursor-not-allowed disabled:opacity-60',
      buttonVariantMap[variant],
      buttonSizeMap[size],
      className
    )}
    disabled={disabled || loading}
    {...props}
  >
    {loading ? <Spinner size="sm" className="border-white/50 border-t-white" /> : leftIcon}
    <span>{children}</span>
    {!loading ? rightIcon : null}
  </button>
);

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  helperText?: string;
  error?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
}

export const Input = ({
  className,
  label,
  helperText,
  error,
  prefix,
  suffix,
  ...props
}: InputProps) => (
  <label className="block space-y-2">
    {label ? <span className="text-sm font-semibold text-slate-700">{label}</span> : null}
    <span
      className={cn(
        'flex h-11 items-center rounded-2xl border bg-white px-3 shadow-sm transition focus-within:ring-4 focus-within:ring-amber-100',
        error ? 'border-rose-300' : 'border-slate-200'
      )}
    >
      {prefix ? <span className="mr-2 text-slate-400">{prefix}</span> : null}
      <input
        className={cn(
          'flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-slate-400',
          className
        )}
        {...props}
      />
      {suffix ? <span className="ml-2 text-slate-400">{suffix}</span> : null}
    </span>
    {error ? (
      <span className="text-xs font-medium text-rose-500">{error}</span>
    ) : helperText ? (
      <span className="text-xs text-slate-500">{helperText}</span>
    ) : null}
  </label>
);

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Select = ({ label, helperText, error, children, ...props }: SelectProps) => (
  <label className="block space-y-2">
    {label ? <span className="text-sm font-semibold text-slate-700">{label}</span> : null}
    <select className="field-base appearance-none" {...props}>
      {children}
    </select>
    {error ? (
      <span className="text-xs font-medium text-rose-500">{error}</span>
    ) : helperText ? (
      <span className="text-xs text-slate-500">{helperText}</span>
    ) : null}
  </label>
);

export interface BadgeProps {
  children: ReactNode;
  variant?:
    | 'active'
    | 'inactive'
    | 'pending'
    | 'overdue'
    | 'warning'
    | 'success'
    | 'info'
    | 'danger';
  className?: string;
}

const badgeVariantMap = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  inactive: 'bg-slate-100 text-slate-600 ring-slate-200',
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  overdue: 'bg-rose-50 text-rose-700 ring-rose-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  info: 'bg-blue-50 text-blue-700 ring-blue-200',
  danger: 'bg-rose-50 text-rose-700 ring-rose-200',
};

export const Badge = ({ children, variant = 'info', className }: BadgeProps) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
      badgeVariantMap[variant],
      className
    )}
  >
    {children}
  </span>
);

export interface CardProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const Card = ({
  title,
  description,
  action,
  footer,
  children,
  className,
}: CardProps) => (
  <section className={cn('surface overflow-hidden', className)}>
    {title || description || action ? (
      <header className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          {title ? <h3 className="text-lg font-semibold text-brand-navy">{title}</h3> : null}
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>
        {action}
      </header>
    ) : null}
    <div className="p-5">{children}</div>
    {footer ? <footer className="border-t border-slate-200 px-5 py-4">{footer}</footer> : null}
  </section>
);

export interface AlertProps {
  title: string;
  message?: string;
  variant?: 'info' | 'success' | 'warning' | 'error';
  action?: ReactNode;
}

const alertVariants = {
  info: { wrapper: 'border-blue-200 bg-blue-50 text-blue-800', icon: Info },
  success: { wrapper: 'border-emerald-200 bg-emerald-50 text-emerald-800', icon: CheckCircle2 },
  warning: { wrapper: 'border-amber-200 bg-amber-50 text-amber-800', icon: AlertTriangle },
  error: { wrapper: 'border-rose-200 bg-rose-50 text-rose-800', icon: AlertCircle },
};

export const Alert = ({ title, message, variant = 'info', action }: AlertProps) => {
  const Icon = alertVariants[variant].icon;
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 rounded-2xl border px-4 py-3',
        alertVariants[variant].wrapper
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5" />
        <div>
          <p className="font-semibold">{title}</p>
          {message ? <p className="mt-1 text-sm opacity-90">{message}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
};

export interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const avatarSizeMap = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
};

const initials = (name: string) =>
  name
    .split(' ')
    .map((chunk) => chunk[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export const Avatar = ({ src, name, size = 'md' }: AvatarProps) =>
  src ? (
    <img
      className={cn('rounded-full object-cover ring-2 ring-slate-100', avatarSizeMap[size])}
      src={src}
      alt={name}
    />
  ) : (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-brand-navy font-semibold text-white ring-2 ring-slate-100',
        avatarSizeMap[size]
      )}
    >
      {initials(name)}
    </span>
  );

export interface ProgressBarProps {
  value: number;
}

export const ProgressBar = ({ value }: ProgressBarProps) => (
  <div className="mt-2 h-2 rounded-full bg-slate-100">
    <div className="h-2 rounded-full bg-brand-gold transition-all" style={{ width: `${value}%` }} />
  </div>
);

export const Tabs = TabsPrimitive.Root;

export const TabsList = ({ className, ...props }: TabsPrimitive.TabsListProps) => (
  <TabsPrimitive.List
    className={cn('inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm', className)}
    {...props}
  />
);

export const TabsTrigger = ({ className, ...props }: TabsPrimitive.TabsTriggerProps) => (
  <TabsPrimitive.Trigger
    className={cn(
      'rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 transition data-[state=active]:bg-brand-navy data-[state=active]:text-white',
      className
    )}
    {...props}
  />
);

export const TabsContent = ({ className, ...props }: TabsPrimitive.TabsContentProps) => (
  <TabsPrimitive.Content className={cn('mt-5 outline-none', className)} {...props} />
);

export interface DropdownItem {
  label: string;
  onSelect?: () => void;
  destructive?: boolean;
}

export interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
}

export const Dropdown = ({ trigger, items }: DropdownProps) => (
  <DropdownMenu.Root>
    <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        className="z-50 min-w-[200px] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
        sideOffset={8}
      >
        {items.map((item) => (
          <DropdownMenu.Item
            key={item.label}
            className={cn(
              'cursor-pointer rounded-xl px-3 py-2 text-sm font-medium outline-none',
              item.destructive ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-100'
            )}
            onSelect={item.onSelect}
          >
            {item.label}
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
);

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: ReactNode;
}

const modalSizeMap = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
  full: 'max-w-[95vw] h-[90vh]',
};

export const Modal = ({
  open,
  onOpenChange,
  title,
  description,
  size = 'md',
  children,
}: ModalProps) => (
  <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm" />
      <Dialog.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white shadow-2xl',
          modalSizeMap[size]
        )}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <Dialog.Title className="text-xl font-semibold text-brand-navy">{title}</Dialog.Title>
            {description ? (
              <Dialog.Description className="mt-1 text-sm text-slate-500">
                {description}
              </Dialog.Description>
            ) : null}
          </div>
          <Dialog.Close className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </Dialog.Close>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-6">{children}</div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  message: string;
  cta?: ReactNode;
}

export const EmptyState = ({ icon, title, message, cta }: EmptyStateProps) => (
  <div className="surface flex flex-col items-center justify-center px-6 py-10 text-center">
    <div className="mb-4 rounded-3xl bg-brand-navy/5 p-4 text-brand-navy">{icon}</div>
    <h3 className="text-lg font-semibold text-brand-navy">{title}</h3>
    <p className="mt-2 max-w-lg text-sm text-slate-500">{message}</p>
    {cta ? <div className="mt-5">{cta}</div> : null}
  </div>
);

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmLabel?: string;
}

export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmLabel = 'Confirm',
}: ConfirmDialogProps) => (
  <Modal open={open} onOpenChange={onOpenChange} title={title} size="sm">
    <div className="space-y-5">
      <p className="text-sm text-slate-600">{description}</p>
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            onConfirm();
            onOpenChange(false);
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </div>
  </Modal>
);

export interface FileUploadProps {
  onChange?: (files: File[]) => void;
  multiple?: boolean;
}

export const FileUpload = ({ onChange, multiple = true }: FileUploadProps) => {
  const [files, setFiles] = useState<File[]>([]);

  const onDrop = (acceptedFiles: File[]) => {
    const nextFiles = multiple ? [...files, ...acceptedFiles] : acceptedFiles;
    setFiles(nextFiles);
    onChange?.(nextFiles);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          'cursor-pointer rounded-3xl border border-dashed px-6 py-10 text-center transition',
          isDragActive ? 'border-brand-gold bg-amber-50' : 'border-slate-300 bg-slate-50'
        )}
      >
        <input {...getInputProps()} />
        <UploadCloud className="mx-auto h-8 w-8 text-slate-500" />
        <p className="mt-3 font-semibold text-brand-navy">Drag and drop files here</p>
        <p className="mt-1 text-sm text-slate-500">Or click to browse and upload supporting files.</p>
      </div>
      {files.length ? (
        <div className="space-y-3">
          {files.map((file) => (
            <div key={`${file.name}-${file.size}`} className="surface flex items-center gap-4 px-4 py-3">
              <div className="h-14 w-14 rounded-2xl bg-slate-100" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-700">{file.name}</p>
                <p className="text-xs text-slate-500">{Math.round(file.size / 1024)} KB</p>
                <ProgressBar value={100} />
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export interface DatePickerProps {
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
}

export const DatePicker = ({ label, value, onChange }: DatePickerProps) => (
  <Input
    label={label}
    type="date"
    value={value}
    onChange={(event) => onChange?.(event.target.value)}
  />
);

export interface SearchInputProps {
  value?: string;
  placeholder?: string;
  delay?: number;
  onDebouncedChange?: (value: string) => void;
}

export const SearchInput = ({
  value = '',
  placeholder = 'Search...',
  delay = 350,
  onDebouncedChange,
}: SearchInputProps) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const timer = window.setTimeout(() => onDebouncedChange?.(localValue), delay);
    return () => window.clearTimeout(timer);
  }, [delay, localValue, onDebouncedChange]);

  return (
    <Input
      value={localValue}
      onChange={(event) => setLocalValue(event.target.value)}
      placeholder={placeholder}
      prefix={<Search className="h-4 w-4" />}
    />
  );
};

export interface PaginationProps {
  pageIndex: number;
  pageCount: number;
  onPrevious: () => void;
  onNext: () => void;
}

export const Pagination = ({
  pageIndex,
  pageCount,
  onPrevious,
  onNext,
}: PaginationProps) => (
  <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
    <p className="text-sm text-slate-500">
      Page {pageIndex + 1} of {Math.max(pageCount, 1)}
    </p>
    <div className="flex gap-2">
      <Button variant="ghost" size="sm" onClick={onPrevious} disabled={pageIndex === 0}>
        Previous
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onNext}
        disabled={pageIndex + 1 >= pageCount}
      >
        Next
      </Button>
    </div>
  </div>
);

export interface TableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  title?: string;
  searchable?: boolean;
  selectable?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
}

const SortIcon = ({ sorted }: { sorted: false | 'asc' | 'desc' }) => {
  if (sorted === 'asc') {
    return <ArrowUp className="h-4 w-4" />;
  }
  if (sorted === 'desc') {
    return <ArrowDown className="h-4 w-4" />;
  }
  return <ArrowUpDown className="h-4 w-4" />;
};

export function Table<TData>({
  data,
  columns,
  title,
  searchable = true,
  selectable = false,
  emptyTitle = 'No records found',
  emptyMessage = 'Adjust your filters or add a new record.',
}: TableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState({});

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
      rowSelection,
    },
    enableRowSelection: selectable,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const rows = table.getRowModel().rows;
  const selectionCount = useMemo(() => Object.keys(rowSelection).length, [rowSelection]);

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {title || searchable ? (
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            {title ? <h3 className="text-lg font-semibold text-brand-navy">{title}</h3> : null}
            {selectionCount > 0 ? <Badge variant="info">{selectionCount} selected</Badge> : null}
          </div>
          {searchable ? (
            <div className="w-full md:max-w-xs">
              <SearchInput
                value={globalFilter}
                onDebouncedChange={setGlobalFilter}
                placeholder="Search records..."
              />
            </div>
          ) : null}
        </div>
      ) : null}
      {rows.length === 0 ? (
        <div className="p-5">
          <EmptyState title={emptyTitle} message={emptyMessage} />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="px-4 py-3 font-semibold text-slate-600">
                        {header.isPlaceholder ? null : (
                          <button
                            className="inline-flex items-center gap-1"
                            onClick={header.column.getToggleSortingHandler()}
                            disabled={!header.column.getCanSort()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getCanSort() ? (
                              <SortIcon sorted={header.column.getIsSorted()} />
                            ) : null}
                          </button>
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 text-slate-700">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            pageIndex={table.getState().pagination.pageIndex}
            pageCount={table.getPageCount()}
            onPrevious={() => table.previousPage()}
            onNext={() => table.nextPage()}
          />
        </>
      )}
    </div>
  );
}
