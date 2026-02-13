import type { FallbackProps } from 'react-error-boundary'

export function ErrorBoundaryFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div role="alert" className="p-8 text-center bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300">
      <h2 className="text-lg font-semibold">Algo deu errado.</h2>
      <pre className="mt-2 text-sm whitespace-pre-wrap break-words max-w-2xl mx-auto">{error.message}</pre>
      <button
        type="button"
        onClick={resetErrorBoundary}
        className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
      >
        Tentar novamente
      </button>
    </div>
  )
}
