import { redirect } from 'next/navigation';

// Preserve the prototype's fallback to the public home page.
export default function NotFound() {
  redirect('/');
}
