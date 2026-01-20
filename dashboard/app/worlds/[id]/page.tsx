import { redirect } from 'next/navigation';

// Redirect old world detail page to assets page
export default function WorldDetailPage() {
  redirect('/assets');
}
