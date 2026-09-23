"use client";
import { useRef, useState } from "react";

/** 6 окремих клітинок для коду; значення йде у прихований input name="code". */
export function OtpInput({ length = 6 }: { length?: number }) {
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
        <div className="otp">
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
