import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="py-16 text-center">
      <p className="text-sm font-semibold text-brand-600">404</p>
      <h1 className="mt-2 text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-ink-500">That page isn&apos;t in stock.</p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
      >
        Back to home
      </Link>
    </div>
  );
}
