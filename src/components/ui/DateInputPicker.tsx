import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface DateInputPickerProps {
  value?: Date;
  onChange: (date?: Date) => void;
  disabled?: (date: Date) => boolean;
  placeholder?: string;
}

export function DateInputPicker({ value, onChange, disabled, placeholder = "DD-MM-YYYY" }: DateInputPickerProps) {
  const [inputValue, setInputValue] = React.useState<string>("");
  const [popoverOpen, setPopoverOpen] = React.useState(false);

  React.useEffect(() => {
    if (value && isValid(value)) {
      setInputValue(format(value, "dd-MM-yyyy"));
    } else {
      setInputValue("");
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const str = e.target.value;
    setInputValue(str);

    if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
      const parsedDate = parse(str, "dd-MM-yyyy", new Date());
      if (isValid(parsedDate)) {
        if (!disabled || !disabled(parsedDate)) {
          onChange(parsedDate);
        }
      }
    } else if (str === "") {
        onChange(undefined);
    }
  };

  const handleDateSelect = (date?: Date) => {
    onChange(date);
    setPopoverOpen(false);
  };

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full">
          <Input
            type="text"
            placeholder={placeholder}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setPopoverOpen(true)}
            className="pl-3 pr-8 text-left font-normal"
          />
          <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleDateSelect}
          disabled={disabled}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}