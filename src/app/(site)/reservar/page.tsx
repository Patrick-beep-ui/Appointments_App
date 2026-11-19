import type { Metadata } from 'next';
import Booking from '@/views/Booking';

export const metadata: Metadata = { title: 'Reservar cita · Velore Salon' };

export default function BookingPage() {
  return <Booking />;
}
