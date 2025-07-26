"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface Option {
  value: string
  label: string
}
interface PreferenceSelectorProps {
  question: string
  options: Option[]
  selectedValue: string
  onValueChange: (value: string) => void
}

export function PreferenceSelector({ question, options, selectedValue, onValueChange }: PreferenceSelectorProps) {
  return (
    <Card>
      <CardHeader className="p-4">
        <CardTitle className="text-base font-semibold">{question}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <RadioGroup value={selectedValue} onValueChange={onValueChange} className="flex justify-around">
          {options.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem value={option.value} id={`${question}-${option.value}`} />
              <Label htmlFor={`${question}-${option.value}`}>{option.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  )
}
