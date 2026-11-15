"use client";

import React, { useRef, useEffect, useState } from "react";
import { Box } from "@mui/material";

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export default function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = true,
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [digits, setDigits] = useState<string[]>(() => {
    const arr = Array(length).fill("");
    for (let i = 0; i < Math.min(value.length, length); i++) {
      arr[i] = value[i];
    }
    return arr;
  });

  useEffect(() => {
    const arr = Array(length).fill("");
    for (let i = 0; i < Math.min(value.length, length); i++) {
      arr[i] = value[i];
    }
    setDigits(arr);
  }, [value, length]);

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const digit = val.slice(-1); // Take last character entered

    if (digit && !/^\d$/.test(digit)) {
      return;
    }

    const nextDigits = [...digits];
    nextDigits[index] = digit;
    setDigits(nextDigits);

    const combined = nextDigits.join("");
    onChange(combined);

    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (combined.length === length && !combined.includes("")) {
      onComplete?.(combined);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        // Current box is empty, focus previous and clear it
        const nextDigits = [...digits];
        nextDigits[index - 1] = "";
        setDigits(nextDigits);
        onChange(nextDigits.join(""));
        inputRefs.current[index - 1]?.focus();
      } else {
        const nextDigits = [...digits];
        nextDigits[index] = "";
        setDigits(nextDigits);
        onChange(nextDigits.join(""));
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;

    const nextDigits = Array(length).fill("");
    for (let i = 0; i < pasted.length; i++) {
      nextDigits[i] = pasted[i];
    }
    setDigits(nextDigits);

    const combined = nextDigits.join("");
    onChange(combined);

    const nextFocusIndex = Math.min(pasted.length, length - 1);
    inputRefs.current[nextFocusIndex]?.focus();

    if (pasted.length === length) {
      onComplete?.(pasted);
    }
  };

  return (
    <Box sx={{ display: "flex", gap: { xs: 1, sm: 1.5 }, justifyContent: "center", my: 2 }}>
      {Array.from({ length }).map((_, index) => (
        <Box
          key={index}
          component="input"
          ref={(el: HTMLInputElement | null) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digits[index] || ""}
          disabled={disabled}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(index, e)}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.target.select()}
          sx={{
            width: { xs: 40, sm: 48 },
            height: { xs: 48, sm: 56 },
            textAlign: "center",
            fontSize: { xs: 20, sm: 24 },
            fontWeight: 700,
            borderRadius: "10px",
            border: "1.5px solid",
            borderColor: digits[index] ? "#0068FF" : "#D1D5DB",
            bgcolor: digits[index] ? "#F0F7FF" : "#F9FAFB",
            color: "#1E293B",
            outline: "none",
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            "&:focus": {
              borderColor: "#0068FF",
              bgcolor: "#FFFFFF",
              boxShadow: "0 0 0 3px rgba(0, 104, 255, 0.18)",
            },
            "&:disabled": {
              bgcolor: "#F3F4F6",
              borderColor: "#E5E7EB",
              cursor: "not-allowed",
            },
          }}
        />
      ))}
    </Box>
  );
}
