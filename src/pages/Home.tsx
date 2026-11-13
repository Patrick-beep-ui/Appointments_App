import { Link } from 'react-router-dom';
import { CalendarCheck, MapPin, Sparkles } from 'lucide-react';
import { ARTISTS, SALON } from '../lib/config';

const STEPS = [
  {
    icon: Sparkles,
    title: 'Elige tu servicio',
    text: 'Cortes, alisados y más, con precio y duración claros.',
  },
  {
    icon: CalendarCheck,
    title: 'Escoge día y hora',
    text: 'Solo verás los horarios libres. Sin choques de citas.',
  },
  {
    icon: MapPin,
    title: 'Te esperamos',
    text: 'Tu cita queda confirmada al instante en nuestra agenda.',
  },
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="container">
          <div>
            <p className="eyebrow">{SALON.location}</p>
            <h1>
              Tu momento de
              <br />
              belleza, <em>sin esperas</em>
            </h1>
            <p className="hero-lead">
              Reserva tu cita en menos de un minuto. Elige servicio, artista y hora, y listo.
            </p>
            <Link to="/reservar" className="btn-cta">
              Reservar cita
            </Link>
          </div>

          <div className="arch">
            {/* Imagen provisional recortada de la captura: reemplazar por la original en alta resolución */}
            <img src="/images/hero-salon.jpg" alt="Interior del salón: sillón crema frente a un espejo redondo iluminado" />
          </div>
        </div>
      </section>

      <section className="steps">
        <div className="container">
          {STEPS.map(({ icon: Icon, title, text }) => (
            <div className="step" key={title}>
              <Icon aria-hidden />
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="artists">
        <div className="container">
          <p className="eyebrow">Nuestras artistas</p>
          <div className="artist-grid">
            {ARTISTS.map((a) => (
              <div className="artist-card" key={a.id}>
                <h3>{a.name}</h3>
                <span>{a.role}</span>
              </div>
            ))}
          </div>
          <Link to="/reservar" className="btn-cta">
            Reservar ahora
          </Link>
        </div>
      </section>
    </>
  );
}
