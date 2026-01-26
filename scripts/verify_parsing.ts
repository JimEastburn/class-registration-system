
const samples = [
  'Tue/Thu 3:30 PM - 5:00 PM',
  'Mon/Wed 12:00',
  'Mon/Wed 13:00',
  'Tue/Thu 15:00',
  'Tue/Thu 10:00',
  'Mon 10am',
  'Friday 2pm'
];

function testParsing(schedule, day, hour) {
     const scheduleLower = schedule.toLowerCase();
     const dayAbbr = day.toLowerCase().substring(0, 3);
     
     if (!scheduleLower.includes(dayAbbr)) return false;
     
     const timeRegex = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;
     const match = schedule.match(timeRegex);
     
     if (match) {
         let h = parseInt(match[1], 10);
         const ampm = match[3]?.toLowerCase();
         
         if (ampm === 'pm' && h < 12) h += 12;
         if (ampm === 'am' && h === 12) h = 0;
         
         if (!ampm) {
             if (h >= 1 && h <= 6) h += 12;
         }

         return h === hour;
     }
     return false;
}

console.log('Testing "Tue/Thu 3:30 PM" for Tue at 15 (3pm): ', testParsing('Tue/Thu 3:30 PM', 'Tuesday', 15));
console.log('Testing "Tue/Thu 3:30 PM" for Thu at 15 (3pm): ', testParsing('Tue/Thu 3:30 PM', 'Thursday', 15));
console.log('Testing "Mon/Wed 12:00" for Mon at 12: ', testParsing('Mon/Wed 12:00', 'Monday', 12));
console.log('Testing "Mon/Wed 13:00" for Wed at 13 (1pm): ', testParsing('Mon/Wed 13:00', 'Wednesday', 13));
console.log('Testing "Tue/Thu 15:00" for Tue at 15 (3pm): ', testParsing('Tue/Thu 15:00', 'Tuesday', 15));
console.log('Testing "Tue/Thu 10:00" for Thu at 10 (10am): ', testParsing('Tue/Thu 10:00', 'Thursday', 10));
console.log('Testing "Friday 2pm" for Friday at 14 (2pm): ', testParsing('Friday 2pm', 'Friday', 14));
console.log('Testing "Friday 2pm" for Friday at 2 (wrong): ', testParsing('Friday 2pm', 'Friday', 2));
