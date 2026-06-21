import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

interface ReceiptItem {
  label: string;
  amount: number;
}

interface ReceiptPdfProps {
  receiptNumber: string;
  student: string;
  className: string;
  paymentMethod: string;
  reference: string;
  items: ReceiptItem[];
}

const styles = StyleSheet.create({
  page: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    fontSize: 11,
  },
  header: {
    borderBottom: '1 solid #E2E8F0',
    paddingBottom: 10,
    marginBottom: 14,
  },
  brand: {
    color: '#F5A623',
    fontSize: 11,
    marginBottom: 6,
  },
  title: {
    color: '#0F1B3C',
    fontSize: 18,
    fontWeight: 700,
  },
  section: {
    marginBottom: 12,
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottom: '1 solid #F1F5F9',
    paddingVertical: 6,
  },
  label: {
    color: '#64748B',
  },
  value: {
    color: '#1E293B',
    fontWeight: 600,
  },
  total: {
    marginTop: 12,
    fontSize: 14,
    color: '#0F1B3C',
    fontWeight: 700,
  },
  signature: {
    marginTop: 36,
    borderTop: '1 solid #CBD5E1',
    paddingTop: 8,
    width: 180,
    color: '#64748B',
  },
});

const ReceiptPDF = ({
  receiptNumber,
  student,
  className,
  paymentMethod,
  reference,
  items,
}: ReceiptPdfProps) => {
  const total = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>EDUOVA ACADEMY</Text>
          <Text style={styles.title}>Official Payment Receipt</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Receipt Number</Text>
          <Text style={styles.value}>{receiptNumber}</Text>
          <Text style={styles.label}>Student</Text>
          <Text style={styles.value}>
            {student} · {className}
          </Text>
          <Text style={styles.label}>Payment Method</Text>
          <Text style={styles.value}>
            {paymentMethod} {reference ? `· ${reference}` : ''}
          </Text>
        </View>

        <View style={styles.section}>
          {items.map((item) => (
            <View key={item.label} style={styles.row}>
              <Text>{item.label}</Text>
              <Text>GHS {item.amount.toLocaleString()}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.total}>Total: GHS {total.toLocaleString()}</Text>
        <Text style={styles.signature}>Authorized Signature</Text>
      </Page>
    </Document>
  );
};

export default ReceiptPDF;
