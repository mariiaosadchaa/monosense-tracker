"use client";
import { useFormStatus } from "react-dom";

/** Кнопка блокується, поки запит іде, — щоб подвійний клік не відправляв два запити. */
export function SubmitButton({ children, pendingText }: { children: React.ReactNode; pendingText: string }) {
    const { pending } = useFormStatus();
    return (
        <button
            className={pending ? "auth-v3-primary is-pending" : "auth-v3-primary"}
            type="submit"
            disabled={pending}
            aria-busy={pending}
        >
            {pending && <span className="btn-spinner" aria-hidden />}
            {pending ? pendingText : children}
        </button>
    );
}
