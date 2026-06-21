import { useRef } from 'react';
import { PDFDownloadLink, Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { Download, Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { useParams } from 'react-router-dom';

import Alert from '../../components/ui/Alert';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import PageLoader from '../../components/ui/PageLoader';
import PageHeader from '../shared/PageHeader';
import { useStudent } from './hooks/useStudent';

const styles = StyleSheet.create({
  page: {
    padding: 24,
    backgroundColor: '#F8FAFC',
  },
  card: {
    borderRadius: 18,
    border: '1 solid #CBD5E1',
    backgroundColor: '#FFFFFF',
    padding: 18,
  },
  brand: {
    color: '#F5A623',
    fontSize: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    color: '#0F1B3C',
    fontWeight: 700,
  },
  body: {
    marginTop: 16,
    gap: 8,
  },
  label: {
    fontSize: 10,
    color: '#64748B',
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: 600,
  },
  barcode: {
    marginTop: 18,
    paddingTop: 10,
    borderTop: '1 solid #E2E8F0',
    fontSize: 11,
    letterSpacing: 2,
    color: '#0F1B3C',
  },
});

const StudentIdPdf = ({
  name,
  studentNumber,
  className,
}: {
  name: string;
  studentNumber: string;
  className: string;
}) => (
  <Document>
    <Page size="A7" style={styles.page}>
      <View style={styles.card}>
        <Text style={styles.brand}>EDUOVA</Text>
        <Text style={styles.title}>Student Identity Card</Text>
        <View style={styles.body}>
          <Text style={styles.label}>Student</Text>
          <Text style={styles.value}>{name}</Text>
          <Text style={styles.label}>Student Number</Text>
          <Text style={styles.value}>{studentNumber}</Text>
          <Text style={styles.label}>Class</Text>
          <Text style={styles.value}>{className}</Text>
          <Text style={styles.barcode}>||| || | |||| | {studentNumber}</Text>
        </View>
      </View>
    </Page>
  </Document>
);

const StudentIDCard = () => {
  const { studentId = 'stu-001' } = useParams();
  const contentRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, isError, refetch } = useStudent(studentId);

  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: data ? `${data.student_number}-id-card` : 'student-id-card',
  });

  if (isLoading) {
    return <PageLoader />;
  }

  if (isError || !data) {
    return (
      <Alert
        title="Unable to load ID card"
        message="Refresh the page to retry the student identity card."
        variant="error"
        action={<Button onClick={() => refetch()}>Retry</Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student ID Card"
        description="Print the student badge or download a PDF copy."
        actions={
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" leftIcon={<Printer className="h-4 w-4" />} onClick={handlePrint}>
              Print ID Card
            </Button>
            <PDFDownloadLink
              document={
                <StudentIdPdf
                  name={data.name}
                  studentNumber={data.student_number}
                  className={data.className}
                />
              }
              fileName={`${data.student_number}-id-card.pdf`}
            >
              {({ loading }) => (
                <Button leftIcon={<Download className="h-4 w-4" />} loading={loading}>
                  Download PDF
                </Button>
              )}
            </PDFDownloadLink>
          </div>
        }
      />

      <Card title="Printable Preview" description="Institution logo, student identity, and barcode preview.">
        <div className="flex justify-center">
          <div
            ref={contentRef}
            className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-gold">EDUOVA</p>
                <h2 className="mt-3 text-2xl font-semibold text-brand-navy">Student Identity Card</h2>
                <p className="mt-2 text-sm text-slate-500">EDUOVA Academy</p>
              </div>
              <div className="rounded-2xl bg-brand-navy px-4 py-3 text-sm font-semibold text-white">
                Verified
              </div>
            </div>

            <div className="mt-8 flex items-center gap-5">
              <Avatar name={data.name} size="xl" />
              <div className="space-y-2">
                <p className="text-xl font-semibold text-brand-navy">{data.name}</p>
                <p className="text-sm text-slate-500">{data.className}</p>
                <p className="text-sm text-slate-500">{data.student_number}</p>
              </div>
            </div>

            <div className="mt-8 rounded-3xl bg-slate-50 p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Barcode</p>
              <p className="mt-3 font-mono text-lg tracking-[0.45em] text-brand-navy">
                ||| || | |||| |
              </p>
              <p className="mt-2 text-sm text-slate-500">{data.student_number}</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default StudentIDCard;
