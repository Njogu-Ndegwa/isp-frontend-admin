/**
 * Date utilities for consistent GMT+3 (East Africa Time) timezone handling.
 * All API timestamps are in UTC and should be displayed in GMT+3.
 */

// GMT+3 offset in milliseconds (3 hours)
const GMT_PLUS_3_OFFSET_MS = 3 * 60 * 60 * 1000;

/**
 * Parse a UTC timestamp and convert to GMT+3 Date object.
 * If the timestamp doesn't have timezone info, it's treated as UTC.
 */
export function parseUTCToGMT3(timestamp: string): Date {
  // If timestamp doesn't have timezone info, treat it as UTC
  const ts = timestamp.endsWith('Z') || timestamp.includes('+') || timestamp.includes('-', 10)
    ? timestamp
    : timestamp + 'Z';
  
  const utcDate = new Date(ts);
  // Add 3 hours to get GMT+3
  return new Date(utcDate.getTime() + GMT_PLUS_3_OFFSET_MS);
}

/**
 * Get current time in GMT+3.
 */
export function getCurrentTimeGMT3(): Date {
  const now = new Date();
  // Get UTC time, then add 3 hours
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  return new Date(utcTime + GMT_PLUS_3_OFFSET_MS);
}

/**
 * Format a UTC timestamp to a localized date string in GMT+3.
 */
export function formatDateGMT3(
  timestamp: string,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
): string {
  const date = parseUTCToGMT3(timestamp);
  return formatGMT3Date(date, options);
}

/**
 * Format a Date object (already in GMT+3) to a localized string.
 * This manually formats to avoid browser timezone conversion.
 */
export function formatGMT3Date(
  date: Date,
  options: Intl.DateTimeFormatOptions
): string {
  // Use UTC methods to avoid browser timezone conversion since we've already adjusted to GMT+3
  const parts: string[] = [];
  
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const shortWeekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const day = date.getUTCDate();
  const month = date.getUTCMonth();
  const year = date.getUTCFullYear();
  const weekday = date.getUTCDay();
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const seconds = date.getUTCSeconds();
  
  // Build the formatted string based on options
  if (options.weekday) {
    parts.push(options.weekday === 'long' ? weekdays[weekday] : shortWeekdays[weekday]);
  }
  
  if (options.month) {
    const monthStr = options.month === 'long' ? months[month] : 
                     options.month === 'short' ? shortMonths[month] : 
                     options.month === 'numeric' ? String(month + 1) :
                     String(month + 1).padStart(2, '0');
    
    if (options.day) {
      parts.push(`${monthStr} ${day}`);
    } else {
      parts.push(monthStr);
    }
  } else if (options.day) {
    parts.push(String(day));
  }
  
  if (options.year) {
    parts.push(options.year === 'numeric' ? String(year) : String(year).slice(-2));
  }
  
  let result = parts.join(', ');
  
  // Add time if requested
  if (options.hour !== undefined) {
    const hour12 = options.hour12 !== false;
    let displayHour = hours;
    let ampm = '';
    
    if (hour12) {
      ampm = hours >= 12 ? ' PM' : ' AM';
      displayHour = hours % 12 || 12;
    }
    
    const hourStr = options.hour === '2-digit' ? String(displayHour).padStart(2, '0') : String(displayHour);
    const minStr = String(minutes).padStart(2, '0');
    
    let timeStr = `${hourStr}:${minStr}`;
    
    if (options.second !== undefined) {
      const secStr = String(seconds).padStart(2, '0');
      timeStr += `:${secStr}`;
    }
    
    if (hour12) {
      timeStr += ampm;
    }
    
    if (result) {
      result += ', ' + timeStr;
    } else {
      result = timeStr;
    }
  }
  
  return result;
}

/**
 * Format a UTC time string (HH:MM:SS or HH:MM) to GMT+3 local time display.
 */
export function formatTimeGMT3(utcTime: string, dateStr?: string): string {
  if (!utcTime || utcTime === '-') return utcTime;
  
  // Use provided date or today's date
  const baseDate = dateStr || new Date().toISOString().split('T')[0];
  
  // Create a full ISO timestamp treating the time as UTC
  const utcTimestamp = `${baseDate}T${utcTime}${utcTime.length === 5 ? ':00' : ''}Z`;
  
  try {
    const date = parseUTCToGMT3(utcTimestamp);
    if (isNaN(date.getTime())) return utcTime;
    
    return formatGMT3Date(date, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return utcTime;
  }
}

/**
 * Format a date string (YYYY-MM-DD) with timezone awareness for display.
 * Adds T12:00:00 to avoid date shifting issues.
 */
export function formatDateOnlyGMT3(
  dateStr: string,
  options: Intl.DateTimeFormatOptions
): string {
  // Adding T12:00:00Z to avoid date shifting due to timezone offset
  const date = parseUTCToGMT3(dateStr + 'T12:00:00Z');
  return formatGMT3Date(date, options);
}

/**
 * Get the current hour in GMT+3 (0-23).
 */
export function getCurrentHourGMT3(): number {
  const gmt3 = getCurrentTimeGMT3();
  return gmt3.getUTCHours();
}

/**
 * Get the greeting based on current time in GMT+3.
 */
export function getGreetingGMT3(): string {
  const hour = getCurrentHourGMT3();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Format the current date and time in GMT+3 for header display.
 */
export function formatCurrentDateTimeGMT3(): string {
  const now = getCurrentTimeGMT3();
  
  const dateStr = formatGMT3Date(now, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  
  const timeStr = formatGMT3Date(now, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  
  return `${dateStr} · ${timeStr}`;
}
