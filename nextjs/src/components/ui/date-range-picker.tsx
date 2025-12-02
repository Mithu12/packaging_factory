"use client";

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DateRangePickerProps {
  className?: string
  date?: DateRange
  onDateChange?: (date: DateRange | undefined) => void
  placeholder?: string
  showPresets?: boolean
}

// Predefined date ranges
const getDatePresets = () => {
  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth()
  
  return [
    {
      label: "Today",
      value: "today",
      range: { from: today, to: today }
    },
    {
      label: "Yesterday",
      value: "yesterday", 
      range: { 
        from: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1),
        to: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
      }
    },
    {
      label: "Last 7 days",
      value: "last7days",
      range: {
        from: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6),
        to: today
      }
    },
    {
      label: "Last 30 days", 
      value: "last30days",
      range: {
        from: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29),
        to: today
      }
    },
    {
      label: "This month",
      value: "thismonth",
      range: {
        from: new Date(currentYear, currentMonth, 1),
        to: new Date(currentYear, currentMonth + 1, 0)
      }
    },
    {
      label: "Last month",
      value: "lastmonth", 
      range: {
        from: new Date(currentYear, currentMonth - 1, 1),
        to: new Date(currentYear, currentMonth, 0)
      }
    },
    {
      label: "This quarter",
      value: "thisquarter",
      range: {
        from: new Date(currentYear, Math.floor(currentMonth / 3) * 3, 1),
        to: new Date(currentYear, Math.floor(currentMonth / 3) * 3 + 3, 0)
      }
    },
    {
      label: "Last quarter",
      value: "lastquarter",
      range: {
        from: new Date(currentYear, Math.floor(currentMonth / 3) * 3 - 3, 1),
        to: new Date(currentYear, Math.floor(currentMonth / 3) * 3, 0)
      }
    },
    {
      label: "This year",
      value: "thisyear",
      range: {
        from: new Date(currentYear, 0, 1),
        to: new Date(currentYear, 11, 31)
      }
    },
    {
      label: "Last year",
      value: "lastyear",
      range: {
        from: new Date(currentYear - 1, 0, 1),
        to: new Date(currentYear - 1, 11, 31)
      }
    }
  ]
}

export function DateRangePicker({
  className,
  date,
  onDateChange,
  placeholder = "Pick a date range",
  showPresets = true,
}: DateRangePickerProps) {
  const [selectedPreset, setSelectedPreset] = React.useState<string>("")
  const presets = getDatePresets()

  const handlePresetChange = (value: string) => {
    setSelectedPreset(value)
    const preset = presets.find(p => p.value === value)
    if (preset && onDateChange) {
      onDateChange(preset.range)
    }
  }

  const handleDateSelect = (range: DateRange | undefined) => {
    setSelectedPreset("") // Clear preset when manually selecting dates
    if (onDateChange) {
      onDateChange(range)
    }
  }

  const formatDateRange = (dateRange?: DateRange) => {
    if (!dateRange?.from) return placeholder
    
    if (dateRange.from && !dateRange.to) {
      return format(dateRange.from, "LLL dd, y")
    }
    
    if (dateRange.from && dateRange.to) {
      if (dateRange.from.getTime() === dateRange.to.getTime()) {
        return format(dateRange.from, "LLL dd, y")
      }
      return `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}`
    }
    
    return placeholder
  }

  return (
    <div className={cn("grid gap-2", className)}>
      {showPresets && (
        <Select value={selectedPreset} onValueChange={handlePresetChange}>
          <SelectTrigger>
            <SelectValue placeholder="Quick select" />
          </SelectTrigger>
          <SelectContent>
            {presets.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange(date)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleDateSelect}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
