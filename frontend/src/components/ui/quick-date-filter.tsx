"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { CalendarIcon } from "lucide-react";
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type DatePreset = 
  | "today" 
  | "ytd" 
  | "7d" 
  | "15d" 
  | "30d" 
  | "this_month" 
  | "this_year" 
  | "custom";

interface QuickDateFilterProps {
  className?: string;
  onDateChange?: (dateRange: DateRange | undefined, preset: DatePreset) => void;
  defaultPreset?: DatePreset;
}

const presets: { label: string; value: DatePreset }[] = [
  { label: "Today", value: "today" },
  { label: "YTD", value: "ytd" },
  { label: "7D", value: "7d" },
  { label: "15D", value: "15d" },
  { label: "30D", value: "30d" },
  { label: "This Month", value: "this_month" },
  { label: "This Year", value: "this_year" },
  { label: "Custom", value: "custom" },
];

function getDateRangeFromPreset(preset: DatePreset): DateRange | undefined {
  const today = new Date();
  
  switch (preset) {
    case "today":
      return { from: startOfDay(today), to: endOfDay(today) };
    case "ytd":
      return { from: startOfYear(today), to: endOfDay(today) };
    case "7d":
      return { from: startOfDay(subDays(today, 6)), to: endOfDay(today) };
    case "15d":
      return { from: startOfDay(subDays(today, 14)), to: endOfDay(today) };
    case "30d":
      return { from: startOfDay(subDays(today, 29)), to: endOfDay(today) };
    case "this_month":
      return { from: startOfMonth(today), to: endOfMonth(today) };
    case "this_year":
      return { from: startOfYear(today), to: endOfYear(today) };
    case "custom":
      return undefined;
    default:
      return undefined;
  }
}

export function QuickDateFilter({
  className,
  onDateChange,
  defaultPreset = "today",
}: QuickDateFilterProps) {
  const [activePreset, setActivePreset] = useState<DatePreset>(defaultPreset);
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const currentDateRange = useMemo(() => {
    if (activePreset === "custom") {
      return customDateRange;
    }
    return getDateRangeFromPreset(activePreset);
  }, [activePreset, customDateRange]);

  const handlePresetClick = (preset: DatePreset) => {
    setActivePreset(preset);
    if (preset === "custom") {
      setIsCalendarOpen(true);
    } else {
      const range = getDateRangeFromPreset(preset);
      onDateChange?.(range, preset);
    }
  };

  const handleCustomDateSelect = (range: DateRange | undefined) => {
    setCustomDateRange(range);
    if (range?.from && range?.to) {
      onDateChange?.(range, "custom");
      setIsCalendarOpen(false);
    }
  };

  React.useEffect(() => {
    // Initialize with default preset
    const range = getDateRangeFromPreset(defaultPreset);
    onDateChange?.(range, defaultPreset);
  }, []);

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-2 rounded-xl bg-gradient-to-r bg-white dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-100/50 dark:border-purple-800/30",
        className
      )}
    >
      <div className="flex items-center gap-1 flex-wrap">
        {presets.map((preset) => (
          <React.Fragment key={preset.value}>
            {preset.value === "custom" ? (
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 px-3 text-xs font-medium rounded-lg transition-all",
                      activePreset === preset.value
                        ? "bg-slate-800 text-white hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/60 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-white/10"
                    )}
                    onClick={() => handlePresetClick(preset.value)}
                  >
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    {preset.label}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={customDateRange?.from}
                    selected={customDateRange}
                    onSelect={handleCustomDateSelect}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 px-3 text-xs font-medium rounded-lg transition-all",
                  activePreset === preset.value
                    ? "bg-slate-800 text-white hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-white/10"
                )}
                onClick={() => handlePresetClick(preset.value)}
              >
                {preset.label}
              </Button>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Current Date Display */}
      <div className="ml-auto flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 bg-white/60 dark:bg-white/10 px-3 py-1.5 rounded-lg">
        <CalendarIcon className="h-3.5 w-3.5" />
        <span className="font-medium">
          {currentDateRange?.from
            ? currentDateRange.to && currentDateRange.from.getTime() !== currentDateRange.to.getTime()
              ? `${format(currentDateRange.from, "MMM d")} - ${format(currentDateRange.to, "MMM d, yyyy")}`
              : format(currentDateRange.from, "MMM d, yyyy")
            : format(new Date(), "MMM d, yyyy")}
        </span>
      </div>
    </div>
  );
}

export { getDateRangeFromPreset };
