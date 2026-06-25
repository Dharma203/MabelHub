"use client";

import React, { useId } from "react";
import Select, { Props as SelectProps } from "react-select";

export interface SearchableSelectProps extends Omit<
  SelectProps<any, false>,
  "options" | "onChange" | "value"
> {
  options: { value: string; label: string }[];
  value?: string | null;
  onChange?: (val: string) => void;
  placeholder?: string;
  className?: string;
  isClearable?: boolean;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Pilih...",
  className = "",
  isClearable = false,
  ...rest
}: SearchableSelectProps) {
  // Finding the object that matches the current string value
  const selectedOption = options.find((o) => o.value === value) || null;
  const reactId = useId();

  return (
    <Select
      instanceId={rest.instanceId || reactId}
      className={`text-sm ${className}`}
      options={options}
      value={selectedOption}
      onChange={(selected: any) => {
        if (onChange) {
          onChange(selected ? selected.value : "");
        }
      }}
      placeholder={placeholder}
      isClearable={isClearable}
      isSearchable
      menuPortalTarget={typeof document !== "undefined" ? document.body : null}
      menuPosition="fixed"
      styles={{
        control: (base, state) => ({
          ...base,
          minHeight: "3rem", // h-12 (48px)
          borderColor: state.isFocused ? "#bfdbfe" : "#e5e7eb", // blue-200 : gray-200
          boxShadow: state.isFocused ? "0 0 0 2px #bfdbfe" : "none", // ring-2 ring-blue-200
          "&:hover": {
            borderColor: state.isFocused ? "#bfdbfe" : "#d1d5db",
          },
          borderRadius: "0.75rem", // rounded-xl (12px)
        }),
        valueContainer: (base) => ({
          ...base,
          padding: "0 1rem", // px-4 (16px) equivalent
        }),
        option: (base, state) => ({
          ...base,
          backgroundColor: state.isSelected
            ? "#0ea5e9" // Tailwind sky-500
            : state.isFocused
              ? "#e0f2fe" // Tailwind sky-100
              : "transparent",
          color: state.isSelected ? "white" : "#1f2937", // Tailwind text-neutral-800
          "&:active": {
            backgroundColor: "#0ea5e9", // Tailwind sky-500
            color: "white",
          },
        }),
        menu: (base) => ({
          ...base,
          borderRadius: "0.5rem", // Tailwind rounded-lg
          overflow: "hidden",
          zIndex: 9999,
        }),
      }}
      {...rest}
    />
  );
}
