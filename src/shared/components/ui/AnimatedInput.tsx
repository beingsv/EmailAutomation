"use client";

import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react";

interface AnimatedInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const AnimatedInput = forwardRef<HTMLInputElement, AnimatedInputProps>(
  ({ label, error, hint, className = "", id, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`
            w-full rounded-lg
            bg-white border border-gray-300
            px-4 py-3 text-gray-900
            placeholder-gray-400
            transition-all duration-300
            focus:bg-white focus:border-blue-500
            focus:ring-2 focus:ring-blue-500/20 focus:outline-none
            glow-input
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" : ""}
            ${className}
          `}
          {...props}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
      </div>
    );
  }
);

AnimatedInput.displayName = "AnimatedInput";

interface AnimatedTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const AnimatedTextarea = forwardRef<HTMLTextAreaElement, AnimatedTextareaProps>(
  ({ label, error, hint, className = "", id, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={`
            w-full rounded-lg
            bg-white border border-gray-300
            px-4 py-3 text-gray-900
            placeholder-gray-400
            transition-all duration-300
            focus:bg-white focus:border-blue-500
            focus:ring-2 focus:ring-blue-500/20 focus:outline-none
            glow-input resize-y
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" : ""}
            ${className}
          `}
          {...props}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
      </div>
    );
  }
);

AnimatedTextarea.displayName = "AnimatedTextarea";
