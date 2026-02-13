"use client";

import { useEffect, useRef, useState } from "react";

interface SlideButtonProps {
  onConfirm: () => void;
  disabled?: boolean;
  text: string;
  variant?: "success" | "danger";
}

export function SlideButton({
  onConfirm,
  disabled = false,
  text,
  variant = "success",
}: SlideButtonProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  const colors = {
    success: {
      bg: "bg-emerald-100 dark:bg-emerald-900/20",
      slider: "bg-emerald-600 dark:bg-emerald-500",
      text: "text-emerald-700 dark:text-emerald-300",
    },
    danger: {
      bg: "bg-red-100 dark:bg-red-900/20",
      slider: "bg-red-600 dark:bg-red-500",
      text: "text-red-700 dark:text-red-300",
    },
  };

  const maxPosition = trackRef.current
    ? trackRef.current.offsetWidth - (sliderRef.current?.offsetWidth || 60)
    : 0;

  useEffect(() => {
    if (confirmed) {
      const timer = setTimeout(() => {
        setConfirmed(false);
        setPosition(0);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [confirmed]);

  const handleStart = (clientX: number) => {
    if (disabled || confirmed) return;
    setIsDragging(true);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging || !trackRef.current || !sliderRef.current) return;

    const trackRect = trackRef.current.getBoundingClientRect();
    const newPosition = Math.max(
      0,
      Math.min(clientX - trackRect.left - sliderRef.current.offsetWidth / 2, maxPosition)
    );

    setPosition(newPosition);

    // Confirmar quando chegar a 90% do caminho
    if (newPosition >= maxPosition * 0.9) {
      setIsDragging(false);
      setConfirmed(true);
      setPosition(maxPosition);
      onConfirm();
    }
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    // Reset se não chegou ao final
    if (position < maxPosition * 0.9) {
      setPosition(0);
    }
  };

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX);
  };

  const handleMouseMove = (e: MouseEvent) => {
    handleMove(e.clientX);
  };

  const handleMouseUp = () => {
    handleEnd();
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    handleMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleTouchMove, { passive: false });
      document.addEventListener("touchend", handleTouchEnd);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
      };
    }
  }, [isDragging, position, maxPosition]);

  const progress = maxPosition > 0 ? (position / maxPosition) * 100 : 0;

  return (
    <div className="w-full max-w-sm select-none">
      <div
        ref={trackRef}
        className={`relative h-16 overflow-hidden rounded-2xl ${
          disabled ? "opacity-50" : ""
        } ${colors[variant].bg} shadow-inner transition-all ${
          confirmed ? "scale-95" : ""
        }`}
      >
        {/* Background progress */}
        <div
          className={`absolute inset-y-0 left-0 transition-all ${colors[variant].slider} opacity-20`}
          style={{ width: `${progress}%` }}
        />

        {/* Text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <p
            className={`text-sm font-semibold uppercase tracking-wide transition-opacity ${
              colors[variant].text
            } ${progress > 50 ? "opacity-0" : "opacity-100"}`}
          >
            {confirmed ? "✓ Confirmado!" : `← Deslize: ${text}`}
          </p>
        </div>

        {/* Slider */}
        <div
          ref={sliderRef}
          className={`absolute left-1 top-1 bottom-1 flex h-14 w-14 cursor-grab items-center justify-center rounded-xl ${
            colors[variant].slider
          } shadow-lg transition-transform ${
            isDragging ? "scale-110 cursor-grabbing" : ""
          } ${confirmed ? "scale-100" : ""}`}
          style={{
            transform: `translateX(${position}px)`,
            transition: isDragging || confirmed ? "none" : "transform 0.3s ease-out",
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <svg
            className="h-6 w-6 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {confirmed ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 5l7 7-7 7M5 5l7 7-7 7"
              />
            )}
          </svg>
        </div>
      </div>

      <p className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
        {disabled
          ? "Aguarde..."
          : "Deslize para a direita para confirmar a ação"}
      </p>
    </div>
  );
}
