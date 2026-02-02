"use client";


import { CalendarClass, SchedulePattern, TimeBlock } from "@/types/calendar";
import { CalendarBlock } from "./CalendarBlock";

interface CalendarRowProps {
  pattern: SchedulePattern;
  classes: CalendarClass[]; // Classes belonging to this pattern
  onClassClick?: (c: CalendarClass) => void;
  onReferenceClick?: (block: TimeBlock, pattern: SchedulePattern) => void;
}

const BLOCKS: TimeBlock[] = ['Block 1', 'Block 2', 'Lunch', 'Block 3', 'Block 4', 'Block 5'];

export function CalendarRow({ pattern, classes, onClassClick, onReferenceClick }: CalendarRowProps) {
  return (
    <div className="grid grid-cols-[100px_1fr_1fr_0.5fr_1fr_1fr_1fr] gap-2 items-stretch min-h-[150px]">
        {/* Row Label */}
        <div className="flex items-center justify-center font-bold text-muted-foreground bg-muted/50 rounded-md p-2 text-center text-sm">
            {pattern}
        </div>

        {BLOCKS.map((block) => {
            // Filter classes for this specific block
            const blockClasses = classes.filter(c => c.time_block === block);
            
            // Lunch handling - if we want to visually style it diff or disable drops
            if (block === 'Lunch') {
               return (
                  <div key={block} className="flex flex-col items-center justify-center bg-muted/30 rounded-md border text-xs text-muted-foreground writing-vertical">
                    LUNCH
                  </div>
               );
            }

            return (
                <CalendarBlock 
                    key={block}
                    block={block}
                    pattern={pattern}
                    classes={blockClasses}
                    onClassClick={onClassClick}
                    onReferenceClick={onReferenceClick}
                />
            );
        })}
    </div>
  );
}
