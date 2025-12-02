"use client";

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"

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

interface DatePickerProps {
  className?: string
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  showPresets?: boolean
}

// Predefined single dates
const getDatePresets = () => {
  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth()
  
  return [
    {
      label: "Today",
      value: "today",
      date: today
    },
    {
      label: "Yesterday",
      value: "yesterday", 
      date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
    },
    {
      label: "End of last month",
      value: "endlastmonth",
      date: new Date(currentYear, currentMonth, 0)
    },
    {
      label: "End of last quarter",
      value: "endlastquarter",
      date: new Date(currentYear, Math.floor(currentMonth / 3) * 3, 0)
    },
    {
      label: "End of last year",
      value: "endlastyear",
      date: new Date(currentYear - 1, 11, 31)
    },
    {
      label: "30 Jun 2024",
      value: "30jun2024",
      date: new Date(2024, 5, 30) // June 30, 2024
    },
    {
      label: "31 Mar 2024", 
      value: "31mar2024",
      date: new Date(2024, 2, 31) // March 31, 2024
    },
    {
      label: "31 Dec 2023",
      value: "31dec2023", 
      date: new Date(2023, 11, 31) // December 31, 2023
    }
  ]
}

export function DatePicker({
  className,
  date,
  onDateChange,
  placeholder = "Pick a date",
  showPresets = true,
}: DatePickerProps) {
  const [selectedPreset, setSelectedPreset] = React.useState<string>("")
  const presets = getDatePresets()

  const handlePresetChange = (value: string) => {
    setSelectedPreset(value)
    const preset = presets.find(p => p.value === value)
    if (preset && onDateChange) {
      onDateChange(preset.date)
    }
  }

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setSelectedPreset("") // Clear preset when manually selecting date
    if (onDateChange) {
      onDateChange(selectedDate)
    }
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
            variant={"outline"}
            className={cn(
              "justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP") : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
