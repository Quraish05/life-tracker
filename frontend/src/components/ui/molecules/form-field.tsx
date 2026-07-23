import * as React from "react";

import { FieldError } from "@/components/ui/atoms/form-error";
import { Input } from "@/components/ui/atoms/input";
import { Label } from "@/components/ui/atoms/label";

interface FormFieldProps extends React.ComponentProps<"input"> {
  label: string;
  /** Validation message; when present the field renders in its invalid state. */
  error?: string;
  /** Optional trailing content in the label row, e.g. a "Forgot?" link. */
  action?: React.ReactNode;
}

function FormField({
  id,
  label,
  error,
  action,
  className,
  ...props
}: FormFieldProps) {
  const generatedId = React.useId();
  const fieldId = id ?? props.name ?? generatedId;
  const errorId = `${fieldId}-error`;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={fieldId}>{label}</Label>
        {action}
      </div>
      <Input
        id={fieldId}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? errorId : undefined}
        className={className}
        {...props}
      />
      <FieldError id={errorId} message={error} />
    </div>
  );
}

export { FormField };
export type { FormFieldProps };
