"use client";

// The sidebar's inputs, styled after Fumadocs: its search box for inputs, its buttons, and its
// tab look for the two-way choices. Every input shows the problem that points at its id.

import { buttonVariants } from "fumadocs-ui/components/ui/button";
import { Plus, X } from "lucide-react";
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  useContext,
} from "react";
import { cn } from "@/lib/cn";

// Problems by the input id they point at.
export const ProblemsByTarget = createContext<Map<string, string>>(new Map());

function useProblem(id: string): string | undefined {
  return useContext(ProblemsByTarget).get(id);
}

const inputClass =
  "w-full min-w-0 rounded-lg border bg-fd-secondary/50 px-2.5 py-1.5 text-sm transition-colors placeholder:text-fd-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring aria-invalid:border-amber-500/70 aria-invalid:ring-amber-500/30";

export function Problem({ id }: { id: string }) {
  const problem = useProblem(id);
  return problem ? (
    <p className="text-xs text-amber-700 dark:text-amber-300">{problem}</p>
  ) : null;
}

export function Labelled({
  label,
  htmlFor,
  help,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  help?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <label
        htmlFor={htmlFor}
        className="text-xs font-medium text-fd-muted-foreground"
      >
        {label}
      </label>
      {children}
      <Problem id={htmlFor} />
      {help ? (
        <p className="text-xs text-fd-muted-foreground/80">{help}</p>
      ) : null}
    </div>
  );
}

type TextInputProps = Omit<ComponentProps<"input">, "onChange" | "value"> & {
  id: string;
  value: string;
  onValue: (value: string) => void;
  mono?: boolean;
};

export function TextInput({
  id,
  value,
  onValue,
  mono,
  className,
  ...props
}: TextInputProps) {
  const problem = useProblem(id);
  return (
    <input
      id={id}
      value={value}
      onChange={(event) => onValue(event.target.value)}
      aria-invalid={problem ? true : undefined}
      spellCheck={false}
      autoComplete="off"
      className={cn(inputClass, mono && "font-mono", className)}
      {...props}
    />
  );
}

// A whole-number input. Empty means Ledger's default, shown as the placeholder.
export function NumberInput(props: TextInputProps) {
  return <TextInput inputMode="numeric" mono {...props} />;
}

export function Select<Value extends string>({
  id,
  value,
  options,
  onValue,
  className,
  label,
}: {
  id: string;
  value: Value;
  options: readonly (readonly [Value, string])[];
  onValue: (value: Value) => void;
  className?: string;
  label?: string;
}) {
  const problem = useProblem(id);
  return (
    <select
      id={id}
      value={value}
      aria-label={label}
      aria-invalid={problem ? true : undefined}
      onChange={(event) => onValue(event.target.value as Value)}
      className={cn(inputClass, className)}
    >
      {options.map(([option, text]) => (
        <option key={option} value={option}>
          {text}
        </option>
      ))}
    </select>
  );
}

// An on/off switch, with its label and a line of help beside it.
export function Switch({
  id,
  checked,
  onChecked,
  label,
  help,
}: {
  id: string;
  checked: boolean;
  onChecked: (checked: boolean) => void;
  label: string;
  help?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChecked(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring",
          checked ? "border-fd-primary bg-fd-primary" : "bg-fd-secondary",
        )}
      >
        <span
          className={cn(
            "size-3.5 rounded-full shadow-sm transition-transform",
            checked
              ? "translate-x-[1.125rem] bg-fd-primary-foreground"
              : "translate-x-0.5 bg-fd-muted-foreground/70",
          )}
        />
      </button>
      <div className="flex min-w-0 flex-col gap-0.5">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {help ? (
          <p className="text-xs text-fd-muted-foreground/80">{help}</p>
        ) : null}
      </div>
    </div>
  );
}

// A two-way choice, like Player or String keys.
export function Segmented<Value extends string>({
  id,
  value,
  options,
  onValue,
  label,
}: {
  id: string;
  value: Value;
  options: readonly (readonly [Value, string])[];
  onValue: (value: Value) => void;
  label: string;
}) {
  return (
    <fieldset
      id={id}
      aria-label={label}
      className="grid auto-cols-fr grid-flow-col rounded-lg border bg-fd-secondary/50 p-0.5"
    >
      {options.map(([option, text]) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onValue(option)}
          className={cn(
            "rounded-md px-2 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring",
            value === option
              ? "bg-fd-background text-fd-foreground shadow-sm"
              : "text-fd-muted-foreground hover:text-fd-accent-foreground",
          )}
        >
          {text}
        </button>
      ))}
    </fieldset>
  );
}

export function AddButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        buttonVariants({ color: "ghost", size: "sm" }),
        "self-start text-fd-muted-foreground [&_svg]:size-3.5",
      )}
    >
      <Plus />
      {children}
    </button>
  );
}

export function RemoveButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        buttonVariants({ color: "ghost", size: "icon-xs" }),
        "shrink-0 text-fd-muted-foreground",
      )}
    >
      <X />
    </button>
  );
}

// A bordered group in a section, like one field or one quantity.
export function Card({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border bg-fd-background p-2.5">
      {children}
    </div>
  );
}

// A quiet line of explanation at the top of a section.
export function Intro({ children }: { children: ReactNode }) {
  return <p className="text-xs text-fd-muted-foreground">{children}</p>;
}
