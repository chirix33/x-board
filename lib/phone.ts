export function isPhoneUserAgent(userAgent: string) {
  if (/iPad|Tablet/i.test(userAgent)) return false;
  if (/iPhone|iPod/i.test(userAgent)) return true;
  return /Android/i.test(userAgent) && /Mobile/i.test(userAgent);
}
