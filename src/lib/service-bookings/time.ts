export function isBookingTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function hasServiceBookingStarted(
  bookingDate: string,
  bookingTime: string,
  now = new Date(),
): boolean {
  const [year, month, day] = bookingDate.split("-").map(Number);
  const [hour, minute] = bookingTime.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute) <= now;
}
