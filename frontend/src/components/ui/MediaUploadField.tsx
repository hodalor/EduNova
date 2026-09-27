import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { ImageIcon, Loader2, Trash2, UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';

import { eduovaApi, type UploadedMedia } from '../../api/eduovaApi';
import { cn } from '../../lib/cn';
import Button from './Button';

interface MediaUploadFieldProps {
  label: string;
  value?: string;
  accept?: string;
  folder: string;
  helperText?: string;
  previewClassName?: string;
  imageClassName?: string;
  onUploaded: (payload: UploadedMedia | null) => void;
}

const isImageUrl = (value: string) => /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(value);

const MediaUploadField = ({
  label,
  value = '',
  accept = 'image/*',
  folder,
  helperText,
  previewClassName,
  imageClassName,
  onUploaded,
}: MediaUploadFieldProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string>('');

  useEffect(() => {
    return () => {
      if (localPreview.startsWith('blob:')) {
        URL.revokeObjectURL(localPreview);
      }
    };
  }, [localPreview]);

  const previewUrl = useMemo(() => localPreview || value, [localPreview, value]);
  const isImage = previewUrl ? previewUrl.startsWith('blob:') || isImageUrl(previewUrl) : false;

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (localPreview.startsWith('blob:')) {
      URL.revokeObjectURL(localPreview);
    }

    const objectUrl = URL.createObjectURL(file);
    setLocalPreview(objectUrl);
    setIsUploading(true);

    try {
      const uploaded = await eduovaApi.media.upload({
        file,
        folder,
        visibility: 'public',
      });
      onUploaded(uploaded);
      setLocalPreview('');
      toast.success(`${label} uploaded.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Unable to upload ${label.toLowerCase()}.`);
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            leftIcon={<Trash2 className="h-4 w-4" />}
            onClick={() => {
              if (localPreview.startsWith('blob:')) {
                URL.revokeObjectURL(localPreview);
              }
              setLocalPreview('');
              onUploaded(null);
            }}
          >
            Remove
          </Button>
        ) : null}
      </div>

      <label
        className={cn(
          'flex min-h-[220px] cursor-pointer items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-center transition hover:border-brand-gold hover:bg-amber-50/40',
          previewClassName
        )}
      >
        <input type="file" accept={accept} className="hidden" onChange={handleFileChange} />
        {isUploading ? (
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm font-medium">Uploading...</p>
          </div>
        ) : previewUrl ? (
          isImage ? (
            <div className="w-full space-y-3">
              <img
                src={previewUrl}
                alt={label}
                className={cn(
                  'mx-auto max-h-44 w-full rounded-2xl bg-white object-contain ring-1 ring-slate-200',
                  imageClassName
                )}
              />
              <p className="text-sm font-medium text-brand-navy">Click to replace</p>
            </div>
          ) : (
            <div className="w-full space-y-3 text-slate-500">
              <ImageIcon className="mx-auto h-8 w-8" />
              <p className="text-sm font-medium text-brand-navy">File uploaded. Click to replace.</p>
            </div>
          )
        ) : (
          <div className="w-full space-y-3 text-slate-500">
            <UploadCloud className="mx-auto h-8 w-8" />
            <p className="text-sm font-medium text-brand-navy">Click to choose a file</p>
            <p className="text-xs text-slate-500">{helperText || 'Upload and preview before saving.'}</p>
          </div>
        )}
      </label>
    </div>
  );
};

export default MediaUploadField;
