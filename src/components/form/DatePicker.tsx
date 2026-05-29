import React, { useState, useRef, useEffect } from "react";
import { Calendar, X } from "lucide-react";
import { FormInput } from "./FormInput";
import {
  formatDisplayDate,
  parseLocalDate,
  todayDateInputValue,
  toDateInputValue,
} from "@/utils/dateUtils";

export interface DatePickerProps {
  label?: string;
  value?: string; // YYYY-MM-DD o ISO datetime
  onChange?: (value: string) => void;
  minDate?: string;
  maxDate?: string;
  placeholder?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
}

export function DatePicker({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = "Seleccionar fecha",
  error,
  helperText,
  required,
  disabled,
  fullWidth,
  size = "md",
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const normalizedValue = toDateInputValue(value);

  const todayStr = todayDateInputValue();

  const min = minDate !== undefined ? toDateInputValue(minDate) : todayStr;
  const max =
    maxDate ||
    (() => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 5);
      return `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, "0")}-${String(futureDate.getDate()).padStart(2, "0")}`;
    })();

  const initialView = parseLocalDate(normalizedValue) ?? new Date();
  const [viewYear, setViewYear] = useState(initialView.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialView.getMonth());

  useEffect(() => {
    setDisplayValue(formatDisplayDate(normalizedValue));
  }, [normalizedValue]);

  useEffect(() => {
    const d = parseLocalDate(normalizedValue) ?? new Date();
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [normalizedValue]);

  useEffect(() => {
    if (isOpen) {
      const d = parseLocalDate(normalizedValue) ?? new Date();
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleDateSelect = (dateStr: string) => {
    onChange?.(dateStr);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.("");
    setDisplayValue("");
  };

  const generateCalendarDays = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: Array<{ day: number; date: string; isDisabled: boolean }> = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ day: 0, date: "", isDisabled: true });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const isDisabled = dateStr < min || dateStr > max;
      days.push({ day, date: dateStr, isDisabled });
    }

    return days;
  };

  const calendarDays = generateCalendarDays(viewYear, viewMonth);

  const monthNames = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const navigateMonth = (direction: "prev" | "next") => {
    const next = new Date(viewYear, viewMonth + (direction === "next" ? 1 : -1), 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: fullWidth ? "100%" : "auto" }}
    >
      <FormInput
        label={label}
        value={displayValue}
        onChange={() => {}}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        placeholder={placeholder}
        error={error}
        helperText={helperText}
        required={required}
        disabled={disabled}
        fullWidth={fullWidth}
        size={size}
        readOnly
        icon={<Calendar size={18} />}
        iconPosition="left"
      />

      {normalizedValue && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          style={{
            position: "absolute",
            right: "40px",
            top: label ? "38px" : "8px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "4px",
            display: "flex",
            alignItems: "center",
            color: "#64748b",
            zIndex: 2,
          }}
          aria-label="Limpiar fecha"
        >
          <X size={16} />
        </button>
      )}

      {isOpen && !disabled && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: "4px",
            background: "#ffffff",
            border: "1px solid rgba(0,0,0,0.15)",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 1000,
            padding: "16px",
            minWidth: "280px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <button
              type="button"
              onClick={() => navigateMonth("prev")}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: "4px",
              }}
            >
              ‹
            </button>
            <div style={{ fontWeight: 600 }}>
              {monthNames[viewMonth]} {viewYear}
            </div>
            <button
              type="button"
              onClick={() => navigateMonth("next")}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: "4px",
              }}
            >
              ›
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: "4px",
              marginBottom: "8px",
            }}
          >
            {weekDays.map((day) => (
              <div
                key={day}
                style={{
                  textAlign: "center",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#64748b",
                  padding: "4px",
                }}
              >
                {day}
              </div>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: "4px",
            }}
          >
            {calendarDays.map((item, index) => {
              if (item.day === 0) {
                return <div key={`empty-${index}`} style={{ padding: "8px" }} />;
              }

              const isSelected = item.date === normalizedValue;
              const isToday = item.date === todayStr;

              return (
                <button
                  key={item.date}
                  type="button"
                  onClick={() => !item.isDisabled && handleDateSelect(item.date)}
                  disabled={item.isDisabled}
                  style={{
                    padding: "8px",
                    background: isSelected
                      ? "#22c55e"
                      : isToday
                        ? "#f1f5f9"
                        : "transparent",
                    color: isSelected
                      ? "#ffffff"
                      : item.isDisabled
                        ? "#cbd5e1"
                        : "#1e293b",
                    border: isToday ? "1px solid #22c55e" : "none",
                    borderRadius: "4px",
                    cursor: item.isDisabled ? "not-allowed" : "pointer",
                    fontSize: "0.875rem",
                    fontWeight: isSelected || isToday ? 600 : 400,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (!item.isDisabled && !isSelected) {
                      e.currentTarget.style.background = "#f1f5f9";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!item.isDisabled && !isSelected) {
                      e.currentTarget.style.background = isToday ? "#f1f5f9" : "transparent";
                    }
                  }}
                >
                  {item.day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
