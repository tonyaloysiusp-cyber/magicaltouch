import { permanentRedirect } from 'next/navigation';

// The mockup generator was retired (Nov 2026): it did not look realistic
// enough. Old links go to the template gallery.
export default function MockupsPage() {
  permanentRedirect('/templates');
}
