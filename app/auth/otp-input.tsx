"use client";
import { useRef, useState } from "react";

/** Довжина коду = Supabase → Auth → Email OTP Length (за замовчуванням тут 8; змінюється через NEXT_PUBLIC_OTP_LENGTH). */
const OTP_LENGTH = Number(process.env.NEXT_PUBLIC_OTP_LENGTH) || 8;

/** Окремі клітинки для коду; значення йде у прихований input name="code". */
export function OtpInput({ length = OTP_LENGTH }: { length?: number }) {
    const [digits, setDigits] = useState<string[]>(Array(length).fill(""));
    const refs = useRef<(HTMLInputElement | null)[]>([]);
    const focus = (i: number) => refs.current[Math.max(0, Math.min(length - 1, i))]?.focus();
    const fill = (start: number, text: string) => {
        const clean = text.replace(/\D/g, "").slice(0, length - start);
        if (!clean) return;
        setDigits((d) => {
            const next = [...d];
            clean.split("").forEach((c, k) => (next[start + k] = c));
            return next;
        });
        focus(start + clean.length);
    };
    return (
        <div className="otp" style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))`, gap: length > 6 ? 6 : 8 }}>
            <input type="hidden" name="code" value={digits.join("")} />
            {digits.map((d, i) => (
                <input
                    key={i}
                    ref={(el) => {
                        refs.current[i] = el;
                    }}
                    className={d ? "otp-cell filled" : "otp-cell"}
                    inputMode="numeric"
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    aria-label={`Цифра ${i + 1}`}
                    autoFocus={i === 0}
                    value={d}
                    maxLength={length}
                    onChange={(e) => {
                        const v = e.target.value;
                        if (v.length > 1) return fill(i, v);
                        const c = v.replace(/\D/g, "");
                        setDigits((arr) => arr.map((x, k) => (k === i ? c : x)));
                        if (c) focus(i + 1);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Backspace" && !digits[i]) focus(i - 1);
                        if (e.key === "ArrowLeft") focus(i - 1);
                        if (e.key === "ArrowRight") focus(i + 1);
                    }}
                    onPaste={(e) => {
                        e.preventDefault();
                        fill(i, e.clipboardData.getData("text"));
                    }}
                    onFocus={(e) => e.currentTarget.select()}
                />
            ))}
        </div>
    );
}
