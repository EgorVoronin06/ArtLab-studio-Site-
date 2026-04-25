import Orb from './Orb';
import CardNav, { type CardNavItem } from './CardNav';
import { useEffect, useState } from 'react';
import AuthModal from './AuthModal';
import Carousel from './Carousel';
import logoSvg from './assets/center-logo.svg';
import navCenterLogo from './assets/nav-center-logo.svg';
import './style.css';

type AppPage = 'home' | 'about' | 'projects' | 'profile';

type UserProfile = {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
};

type UserProject = {
  id: string;
  title: string;
  description: string;
  requestedAmount: string | number;
  createdAt: string;
};

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:3000';

export default function App() {
  const [page, setPage] = useState<AppPage>('home');
  const [authOpen, setAuthOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [projects, setProjects] = useState<UserProject[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    if (page !== 'profile') return;

    const loadProfile = async () => {
      setProfileLoading(true);
      setProfileError('');
      try {
        const [meRes, projectsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/auth/me`, { credentials: 'include' }),
          fetch(`${API_BASE_URL}/projects/mine`, { credentials: 'include' })
        ]);

        if (!meRes.ok) {
          throw new Error('Нужно войти в аккаунт через Get Started');
        }
        if (!projectsRes.ok) {
          throw new Error('Не удалось загрузить проекты');
        }

        const meData = (await meRes.json()) as UserProfile;
        const projectData = (await projectsRes.json()) as UserProject[];

        setProfile(meData);
        setProjects(Array.isArray(projectData) ? projectData : []);
      } catch (error) {
        setProfile(null);
        setProjects([]);
        setProfileError(error instanceof Error ? error.message : 'Ошибка загрузки личного кабинета');
      } finally {
        setProfileLoading(false);
      }
    };

    void loadProfile();
  }, [page]);

  const navItems: CardNavItem[] = [
    {
      label: 'О нас',
      bgColor: 'rgba(255, 255, 255, 0.92)',
      textColor: '#1b2230',
      links: [
        { label: 'Company', ariaLabel: 'About Company', href: '#' },
        { label: 'Careers', ariaLabel: 'About Careers', href: '#' }
      ]
    },
    {
      label: 'Проекты',
      bgColor: 'rgba(255, 255, 255, 0.92)',
      textColor: '#1b2230',
      links: [
        { label: 'Featured', ariaLabel: 'Featured Projects', href: '#' },
        { label: 'Case Studies', ariaLabel: 'Project Case Studies', href: '#' }
      ]
    },
    {
      label: 'Личный кабинет',
      bgColor: 'rgba(255, 255, 255, 0.92)',
      textColor: '#1b2230',
      links: [
        { label: 'Профиль', ariaLabel: 'Профиль', href: '#' },
        { label: 'Проекты', ariaLabel: 'Мои проекты', href: '#' },
        { label: 'Данные', ariaLabel: 'Личные данные', href: '#' }
      ]
    }
  ];

  return (
    <main className="page">
      <section className="orb-section">
        <CardNav
          logo={navCenterLogo}
          logoAlt="ArtLab"
          items={navItems}
          baseColor="rgba(247, 243, 243, 0)"
          menuColor="#1f2530"
          buttonBgColor="#080b12"
          buttonTextColor="#fff"
          ease="power3.out"
          theme="light"
          onGetStartedClick={() => setAuthOpen(true)}
          onLogoClick={() => setPage('home')}
          onCardClick={(index) => {
            if (index === 0) setPage('about');
            if (index === 1) setPage('projects');
            if (index === 2) setPage('profile');
          }}
        />
        <Orb
          hoverIntensity={page === 'home' ? 2 : 0}
          rotateOnHover={page === 'home'}
          hue={0}
          forceHoverState={false}
          backgroundColor="#000000"
        />
        {page === 'home' ? (
          <img className="center-logo" src={logoSvg} alt="ArtLab logo" />
        ) : page === 'about' ? (
          <article className="about-page">
            <h1>О нас</h1>
            <p>
              ArtLab - креативная студия, которая объединяет дизайн, визуальные технологии и
              современную web-разработку. Мы создаем цифровые продукты с акцентом на эстетику и
              удобство.
            </p>
            <p>
              Наша команда делает интерфейсы, брендинг и интерактивные решения для бизнеса и
              авторских проектов.
            </p>
            <button type="button" className="about-back-btn" onClick={() => setPage('home')}>
              Назад
            </button>
          </article>
        ) : page === 'projects' ? (
          <section className="projects-page">
            <h1>Проекты и кейсы</h1>
            <p>Подборка направлений и примеров проектов студии.</p>
            <div style={{ height: '600px', position: 'relative' }}>
              <Carousel
                baseWidth={300}
                autoplay={false}
                autoplayDelay={3000}
                pauseOnHover={false}
                loop={false}
                round={false}
              />
            </div>
            <button type="button" className="about-back-btn" onClick={() => setPage('home')}>
              Назад
            </button>
          </section>
        ) : (
          <section className="profile-page">
            <h1>Личный кабинет</h1>
            <div className="profile-header">
              <label className="profile-avatar" htmlFor="avatar-upload">
                {avatarPreview ? <img src={avatarPreview} alt="Аватар" /> : <span>Добавить фото</span>}
              </label>
              <input
                id="avatar-upload"
                className="profile-avatar-input"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const result = reader.result;
                    if (typeof result === 'string') setAvatarPreview(result);
                  };
                  reader.readAsDataURL(file);
                }}
              />
              <div className="profile-summary">
                <h2>{profile?.name || 'Гость'}</h2>
                <p>{profile?.email || 'Нет данных'}</p>
                <p>{profile?.role ? `Роль: ${profile.role}` : 'Авторизуйтесь для просмотра данных'}</p>
              </div>
            </div>

            {profileLoading && <p className="profile-hint">Загрузка данных...</p>}
            {profileError && <p className="profile-error">{profileError}</p>}

            <div className="profile-projects">
              <h3>Мои проекты</h3>
              {projects.length === 0 ? (
                <p className="profile-hint">Пока нет проектов или вы не авторизованы.</p>
              ) : (
                <div className="profile-project-list">
                  {projects.map((project) => (
                    <article key={project.id} className="profile-project-card">
                      <h4>{project.title}</h4>
                      <p>{project.description}</p>
                      <div className="profile-project-meta">
                        <span>Сумма: {Number(project.requestedAmount).toLocaleString('ru-RU')} ₽</span>
                        <span>{new Date(project.createdAt).toLocaleDateString('ru-RU')}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <button type="button" className="about-back-btn" onClick={() => setPage('home')}>
              Назад
            </button>
          </section>
        )}
      </section>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </main>
  );
}
