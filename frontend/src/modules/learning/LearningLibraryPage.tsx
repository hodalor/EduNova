import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FileText, Presentation, UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';

import {
  eduovaApi,
  type LearningCourse,
  type LearningMaterial,
  type UploadedMedia,
} from '../../api/eduovaApi';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import MediaUploadField from '../../components/ui/MediaUploadField';
import PageLoader from '../../components/ui/PageLoader';
import Select from '../../components/ui/Select';
import { useAuthStore } from '../../store/authStore';
import PageHeader from '../shared/PageHeader';

const formatDateTime = (value?: string) => {
  if (!value) {
    return 'Just now';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
};

const LearningLibraryPage = () => {
  const queryClient = useQueryClient();
  const role = useAuthStore((state) => state.role);
  const isStaff = role === 'institution_admin' || role === 'teacher';
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [materialType, setMaterialType] = useState('note');
  const [uploadedFile, setUploadedFile] = useState<UploadedMedia | null>(null);

  const coursesQuery = useQuery<LearningCourse[]>({
    queryKey: ['learning-courses'],
    queryFn: eduovaApi.learning.courses,
  });
  const materialsQuery = useQuery<LearningMaterial[]>({
    queryKey: ['learning-materials', selectedCourseId],
    queryFn: () => eduovaApi.learning.materials(selectedCourseId || undefined),
  });

  const createMaterial = useMutation({
    mutationFn: eduovaApi.learning.createMaterial,
    onSuccess: () => {
      toast.success('Course material uploaded.');
      setTitle('');
      setDescription('');
      setMaterialType('note');
      setUploadedFile(null);
      void queryClient.invalidateQueries({ queryKey: ['learning-materials'] });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Unable to upload course material.');
    },
  });

  const courses: LearningCourse[] = coursesQuery.data || [];
  const selectedCourse =
    courses.find((course: LearningCourse) => course.id === selectedCourseId) || null;

  if (coursesQuery.isLoading || materialsQuery.isLoading) {
    return <PageLoader />;
  }

  if (coursesQuery.isError || materialsQuery.isError) {
    return (
      <Alert
        title="Unable to load the e-library"
        message="Refresh the page to retry the tertiary learning workspace."
        variant="error"
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="E-Library"
        description={
          isStaff
            ? 'Upload slides, notes, and handouts directly against listed tertiary courses.'
            : 'Open lecture notes, slides, and learning files published for your registered pathway.'
        }
        actions={selectedCourse ? <Badge variant="info">{selectedCourse.code}</Badge> : undefined}
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1.6fr]">
        <Card title="Course Filter" description="Focus the library on one course or keep it on all visible courses.">
          <div className="space-y-4">
            <Select
              label="Course"
              value={selectedCourseId}
              onChange={(event) => setSelectedCourseId(event.target.value)}
            >
              <option value="">All accessible courses</option>
              {courses.map((course: LearningCourse) => (
                <option key={course.id} value={course.id}>
                  {course.code} - {course.name}
                </option>
              ))}
            </Select>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Visible Courses</p>
                <p className="mt-2 text-2xl font-semibold text-brand-navy">{courses.length}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Published Materials</p>
                <p className="mt-2 text-2xl font-semibold text-brand-navy">
                  {(materialsQuery.data || []).length}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {isStaff ? (
          <Card title="Upload Course Material" description="Attach lecture slides, notes, or study files to one listed course.">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Select
                  label="Course"
                  value={selectedCourseId}
                  onChange={(event) => setSelectedCourseId(event.target.value)}
                >
                  <option value="">Select course</option>
                  {courses.map((course: LearningCourse) => (
                    <option key={course.id} value={course.id}>
                      {course.code} - {course.name}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Material Type"
                  value={materialType}
                  onChange={(event) => setMaterialType(event.target.value)}
                >
                  <option value="note">Lecture Note</option>
                  <option value="slide">Slide Deck</option>
                  <option value="reading">Reading Pack</option>
                  <option value="past-question">Past Question</option>
                </Select>
              </div>
              <Input
                label="Title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Week 3 lecture slides"
              />
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20"
                  placeholder="Add a short summary for students."
                />
              </div>
              <MediaUploadField
                label="Material File"
                value={uploadedFile?.url || ''}
                folder="learning/materials"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*"
                helperText="Upload the actual file students should open or download."
                previewClassName="min-h-[220px]"
                onUploaded={setUploadedFile}
              />
              <div className="flex justify-end">
                <Button
                  leftIcon={<UploadCloud className="h-4 w-4" />}
                  loading={createMaterial.isPending}
                  onClick={() => {
                    if (!selectedCourseId || !title.trim() || !uploadedFile?.url) {
                      toast.error('Select a course, enter a title, and upload the material file first.');
                      return;
                    }
                    void createMaterial.mutateAsync({
                      course_id: selectedCourseId,
                      title,
                      description,
                      material_type: materialType,
                      attachment_url: uploadedFile.url,
                      attachment_name: uploadedFile.fileName,
                      attachment_mime_type: uploadedFile.mimeType,
                    });
                  }}
                >
                  Publish Material
                </Button>
              </div>
            </div>
          </Card>
        ) : null}
      </div>

      <Card title="Published Materials" description="Every file here is tied to a real tertiary course offering.">
        {materialsQuery.data?.length ? (
          <div className="space-y-4">
            {((materialsQuery.data || []) as LearningMaterial[]).map((item: LearningMaterial) => (
              <div
                key={item.id}
                className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex items-start gap-4">
                  <span className="mt-1 rounded-2xl bg-slate-100 p-3 text-brand-navy">
                    {item.material_type === 'slide' ? (
                      <Presentation className="h-5 w-5" />
                    ) : (
                      <FileText className="h-5 w-5" />
                    )}
                  </span>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-brand-navy">{item.title}</h3>
                      <Badge variant="info">{item.material_type}</Badge>
                    </div>
                    <p className="text-sm text-slate-600">
                      {item.course_code} - {item.course_name}
                      {item.period_name ? ` · ${item.period_name}` : ''}
                    </p>
                    {item.description ? <p className="text-sm text-slate-500">{item.description}</p> : null}
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                      Uploaded by {item.uploaded_by_name || 'Staff'} on {formatDateTime(item.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <a href={item.attachment_url} target="_blank" rel="noreferrer">
                    <Button variant="secondary" leftIcon={<Download className="h-4 w-4" />}>
                      Open File
                    </Button>
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No course materials yet"
            message="Published lecture files will appear here once a lecturer uploads them."
          />
        )}
      </Card>
    </div>
  );
};

export default LearningLibraryPage;
