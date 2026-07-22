/** Form-level error banner for submit failures (e.g. bad credentials, taken email). */
function FormError({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className="rounded-2xl border border-coral/30 bg-coral/10 px-4 py-2.5 text-sm font-medium text-coral"
    >
      {message}
    </p>
  );
}

export { FormError };
