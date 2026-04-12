import { Link } from 'react-router-dom';

const VIDEO_SRC =
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';
const POSTER =
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80';

export function Landing() {
  return (
    <div className="landing">
      <video
        className="landing__video"
        autoPlay
        muted
        loop
        playsInline
        poster={POSTER}
        aria-hidden
      >
        <source src={VIDEO_SRC} type="video/mp4" />
      </video>
      <div className="landing__veil" />
      <div className="landing__inner">
        <p className="landing__eyebrow">Chrona</p>
        <h1 className="landing__title">Место, где время не гонит, а сопровождает</h1>
        <p className="landing__lead">
          Замедли внимание. Отметь момент. Посмотри на свои дни как на пейзаж — без KPI и
          без спешки.
        </p>
        <div className="landing__actions">
          <Link to="/app?guest=1" className="landing__btn landing__btn--primary">
            Войти в приложение
          </Link>
          <Link to="/login?fresh=1" className="landing__btn landing__btn--ghost">
            Вход
          </Link>
          <Link to="/register?fresh=1" className="landing__btn landing__btn--ghost">
            Регистрация
          </Link>
        </div>
        <p className="landing__hint">Регистрация не обязательна — можно начать как гость.</p>
      </div>
    </div>
  );
}
