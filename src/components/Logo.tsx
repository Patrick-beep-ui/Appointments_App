import { SALON } from '../lib/config';

export function Logo({ suffix = 'Salon' }: { suffix?: string }) {
  return <span className="logo">{SALON.name} <em>{suffix}</em></span>;
}
