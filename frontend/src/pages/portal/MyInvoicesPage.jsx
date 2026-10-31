import { Receipt } from 'lucide-react';
import PlaceholderPage from '@/components/ui/PlaceholderPage';

export default function MyInvoicesPage() {
  return (
    <PlaceholderPage
      title="My Invoices"
      description="View and pay your invoices, download PDFs — coming in Page 13."
      icon={Receipt}
    />
  );
}

