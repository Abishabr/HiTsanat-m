/**
 * ReportFilters Component
 * 
 * Provides filtering controls for attendance reports including:
 * - Time interval selector (Daily, Weekly, Monthly, Custom)
 * - Kutr level filter (All, Kutr 1, Kutr 2, Kutr 3)
 * - Conditional date pickers based on selected interval
 * - Apply and Reset buttons
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3
 */

import React, { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { ReportFilters as ReportFiltersType, TimeInterval, KutrLevelFilter } from '../lib/reportTypes';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { cn } from './ui/utils';

interface ReportFiltersProps {
  filters: ReportFiltersType;
  onFiltersChange: (filters: ReportFiltersType) => void;
}

export function ReportFilters({ filters, onFiltersChange }: ReportFiltersProps) {
  // Local state for draft filters (applied on "Apply" button click)
  const [draftFilters, setDraftFilters] = useState<ReportFiltersType>(filters);
  const [dateRangeError, setDateRangeError] = useState<string | null>(null);

  // Handle time interval change
  const handleTimeIntervalChange = (value: TimeInterval) => {
    setDraftFilters(prev => ({
      ...prev,
      timeInterval: value,
      // Reset date selections when interval changes
      selectedDate: value === 'daily' ? prev.selectedDate : null,
      selectedWeek: value === 'weekly' ? prev.selectedWeek : null,
      selectedMonth: value === 'monthly' ? prev.selectedMonth : null,
      startDate: value === 'custom' ? prev.startDate : null,
      endDate: value === 'custom' ? prev.endDate : null,
    }));
    setDateRangeError(null);
  };

  // Handle Kutr level change
  const handleKutrLevelChange = (value: string) => {
    const kutrLevel = value === 'all' ? 'all' : parseInt(value) as 1 | 2 | 3;
    setDraftFilters(prev => ({
      ...prev,
      kutrLevel,
    }));
  };

  // Handle daily date selection
  const handleDailyDateSelect = (date: Date | undefined) => {
    if (date) {
      setDraftFilters(prev => ({
        ...prev,
        selectedDate: format(date, 'yyyy-MM-dd'),
      }));
    }
  };

  // Handle weekly date selection (start of week)
  const handleWeeklyDateSelect = (date: Date | undefined) => {
    if (date) {
      // Calculate week range (assuming week starts on Saturday)
      const dayOfWeek = date.getDay();
      const daysToSaturday = dayOfWeek === 6 ? 0 : dayOfWeek === 0 ? -1 : 6 - dayOfWeek;
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() + daysToSaturday);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      setDraftFilters(prev => ({
        ...prev,
        selectedWeek: {
          start: format(weekStart, 'yyyy-MM-dd'),
          end: format(weekEnd, 'yyyy-MM-dd'),
        },
      }));
    }
  };

  // Handle monthly date selection
  const handleMonthlyDateSelect = (date: Date | undefined) => {
    if (date) {
      setDraftFilters(prev => ({
        ...prev,
        selectedMonth: {
          year: date.getFullYear(),
          month: date.getMonth(),
        },
      }));
    }
  };

  // Handle custom start date selection
  const handleStartDateSelect = (date: Date | undefined) => {
    if (date) {
      const startDate = format(date, 'yyyy-MM-dd');
      setDraftFilters(prev => ({
        ...prev,
        startDate,
      }));
      
      // Validate date range
      if (draftFilters.endDate && startDate > draftFilters.endDate) {
        setDateRangeError('Start date cannot be after end date');
      } else {
        setDateRangeError(null);
      }
    }
  };

  // Handle custom end date selection
  const handleEndDateSelect = (date: Date | undefined) => {
    if (date) {
      const endDate = format(date, 'yyyy-MM-dd');
      setDraftFilters(prev => ({
        ...prev,
        endDate,
      }));
      
      // Validate date range
      if (draftFilters.startDate && draftFilters.startDate > endDate) {
        setDateRangeError('End date cannot be before start date');
      } else {
        setDateRangeError(null);
      }
    }
  };

  // Apply filters
  const handleApply = () => {
    if (dateRangeError) return;
    onFiltersChange(draftFilters);
  };

  // Reset filters to default
  const handleReset = () => {
    const defaultFilters: ReportFiltersType = {
      timeInterval: 'weekly',
      kutrLevel: 'all',
      startDate: null,
      endDate: null,
      selectedDate: null,
      selectedWeek: null,
      selectedMonth: null,
    };
    setDraftFilters(defaultFilters);
    setDateRangeError(null);
    onFiltersChange(defaultFilters);
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <h3 className="text-lg font-semibold">Filters</h3>
      
      {/* Time Interval Selector */}
      <div className="space-y-2">
        <Label htmlFor="time-interval">Time Interval</Label>
        <Select
          value={draftFilters.timeInterval}
          onValueChange={handleTimeIntervalChange}
        >
          <SelectTrigger id="time-interval">
            <SelectValue placeholder="Select interval" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Kutr Level Filter */}
      <div className="space-y-2">
        <Label htmlFor="kutr-level">Kutr Level</Label>
        <Select
          value={draftFilters.kutrLevel.toString()}
          onValueChange={handleKutrLevelChange}
        >
          <SelectTrigger id="kutr-level">
            <SelectValue placeholder="Select Kutr level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="1">Kutr 1</SelectItem>
            <SelectItem value="2">Kutr 2</SelectItem>
            <SelectItem value="3">Kutr 3</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Conditional Date Pickers */}
      {draftFilters.timeInterval === 'daily' && (
        <div className="space-y-2">
          <Label>Select Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !draftFilters.selectedDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {draftFilters.selectedDate
                  ? format(new Date(draftFilters.selectedDate), 'PPP')
                  : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={draftFilters.selectedDate ? new Date(draftFilters.selectedDate) : undefined}
                onSelect={handleDailyDateSelect}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {draftFilters.timeInterval === 'weekly' && (
        <div className="space-y-2">
          <Label>Select Week (Pick any date in the week)</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !draftFilters.selectedWeek && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {draftFilters.selectedWeek
                  ? `${format(new Date(draftFilters.selectedWeek.start), 'MMM d')} - ${format(new Date(draftFilters.selectedWeek.end), 'MMM d, yyyy')}`
                  : 'Pick a week'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={draftFilters.selectedWeek ? new Date(draftFilters.selectedWeek.start) : undefined}
                onSelect={handleWeeklyDateSelect}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {draftFilters.timeInterval === 'monthly' && (
        <div className="space-y-2">
          <Label>Select Month</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !draftFilters.selectedMonth && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {draftFilters.selectedMonth
                  ? format(new Date(draftFilters.selectedMonth.year, draftFilters.selectedMonth.month), 'MMMM yyyy')
                  : 'Pick a month'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={
                  draftFilters.selectedMonth
                    ? new Date(draftFilters.selectedMonth.year, draftFilters.selectedMonth.month)
                    : undefined
                }
                onSelect={handleMonthlyDateSelect}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {draftFilters.timeInterval === 'custom' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !draftFilters.startDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {draftFilters.startDate
                    ? format(new Date(draftFilters.startDate), 'PPP')
                    : 'Pick start date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={draftFilters.startDate ? new Date(draftFilters.startDate) : undefined}
                  onSelect={handleStartDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !draftFilters.endDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {draftFilters.endDate
                    ? format(new Date(draftFilters.endDate), 'PPP')
                    : 'Pick end date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={draftFilters.endDate ? new Date(draftFilters.endDate) : undefined}
                  onSelect={handleEndDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {dateRangeError && (
            <p className="text-sm text-destructive">{dateRangeError}</p>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <Button onClick={handleApply} disabled={!!dateRangeError} className="flex-1">
          Apply Filters
        </Button>
        <Button onClick={handleReset} variant="outline" className="flex-1">
          Reset
        </Button>
      </div>
    </div>
  );
}
