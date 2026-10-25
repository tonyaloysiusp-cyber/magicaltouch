import { redirect } from 'next/navigation';

// Tutorial certificates moved to Admin → Courses & certificates.
export default function OldTutorialAdmin() {
  redirect('/admin/courses');
}
