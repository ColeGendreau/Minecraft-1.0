import { redirect } from 'next/navigation';

// Redirect old create page to new assets create page
export default function CreateWorldPage() {
  redirect('/assets/create');
}
