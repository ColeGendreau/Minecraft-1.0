import { redirect } from 'next/navigation';

// Redirect old worlds page to new assets page
export default function WorldsPage() {
  redirect('/assets');
}
