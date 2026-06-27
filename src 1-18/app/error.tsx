'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-950 p-8 text-center">
      <h2 className="mb-4 text-2xl font-bold text-amber-100">Something went wrong!</h2>
      <p className="mb-2 max-w-md text-sm text-amber-200/60">
        {error.message || 'An unexpected error occurred'}
      </p>
      {error.digest && (
        <p className="mb-6 text-xs text-amber-200/30">Error ID: {error.digest}</p>
      )}
      <pre className="mb-6 max-w-lg overflow-auto rounded-lg bg-stone-900 p-4 text-left text-xs text-red-300">
        {error.stack || error.message}
      </pre>
      <button
        onClick={reset}
        className="rounded-md bg-amber-600 px-6 py-2 text-sm font-medium text-stone-950 hover:bg-amber-500"
      >
        Try again
      </button>
    </div>
  );
}
