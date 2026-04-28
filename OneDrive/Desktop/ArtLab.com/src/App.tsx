import Orb from './Orb';
import CardNav, { type CardNavItem } from './CardNav';
import { useEffect, useState } from 'react';
import AuthModal from './AuthModal';
import logoSvg from './assets/center-logo.svg';
import navCenterLogo from './assets/nav-center-logo.svg';
import './style.css';

type AppPage = 'home' | 'news' | 'projects' | 'profile';

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
  imageUrl?: string | null;
  logoUrl?: string | null;
  presentationUrl?: string | null;
  telegramUrl?: string | null;
  vkUrl?: string | null;
  createdAt: string;
};

type PublicProject = UserProject & {
  user: {
    id: string;
    name: string;
  };
};

type NewsItem = {
  id: string;
  title: string;
  description: string;
  imageUrl?: string | null;
  links: string[];
  createdAt: string;
  author: {
    id: string;
    name: string;
  };
};

type AdminUserOverview = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  projects: UserProject[];
};

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || '/api';
const MAX_DESC = 250;
const MIN_AMOUNT = 1_000;
const MAX_AMOUNT = 10_000_000;

function formatRub(n: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0
  }).format(n);
}

function isValidUrl(raw: string) {
  if (!raw.trim()) return true;
  try {
    const u = new URL(raw.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidImageSource(raw: string) {
  if (!raw.trim()) return true;
  const value = raw.trim();
  if (value.startsWith('data:image/')) return true;
  return isValidUrl(value);
}

export default function App() {
  const [page, setPage] = useState<AppPage>('home');
  const [authOpen, setAuthOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [projects, setProjects] = useState<UserProject[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUserOverview[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectAmount, setProjectAmount] = useState(100_000);
  const [projectPresentationUrl, setProjectPresentationUrl] = useState('');
  const [projectTelegramUrl, setProjectTelegramUrl] = useState('');
  const [projectVkUrl, setProjectVkUrl] = useState('');
  const [projectImageUrl, setProjectImageUrl] = useState('');
  const [projectLogoUrl, setProjectLogoUrl] = useState('');
  const [projectFormErrors, setProjectFormErrors] = useState<Record<string, string>>({});
  const [projectFormMessage, setProjectFormMessage] = useState('');
  const [projectSubmitting, setProjectSubmitting] = useState(false);
  const [publicProjects, setPublicProjects] = useState<PublicProject[]>([]);
  const [publicProjectsLoading, setPublicProjectsLoading] = useState(false);
  const [publicProjectsError, setPublicProjectsError] = useState('');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState('');
  const [newsTitle, setNewsTitle] = useState('');
  const [newsDescription, setNewsDescription] = useState('');
  const [newsImageUrl, setNewsImageUrl] = useState('');
  const [newsImageName, setNewsImageName] = useState('');
  const [newsLinksRaw, setNewsLinksRaw] = useState('');
  const [newsSubmitMessage, setNewsSubmitMessage] = useState('');
  const [newsSubmitting, setNewsSubmitting] = useState(false);
  const [authUser, setAuthUser] = useState<UserProfile | null>(null);

  const refreshAuthUser = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, { credentials: 'include' });
      if (!res.ok) {
        setAuthUser(null);
        return;
      }
      const meData = (await res.json()) as UserProfile;
      setAuthUser(meData);
    } catch {
      setAuthUser(null);
    }
  };

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

      if (meData.role === 'ADMIN') {
        setAdminLoading(true);
        setAdminError('');
        try {
          const adminRes = await fetch(`${API_BASE_URL}/projects/admin/overview`, {
            credentials: 'include'
          });
          if (!adminRes.ok) {
            throw new Error('Не удалось загрузить данные админ-панели');
          }
          const adminData = (await adminRes.json()) as AdminUserOverview[];
          setAdminUsers(Array.isArray(adminData) ? adminData : []);
        } catch (adminLoadError) {
          setAdminUsers([]);
          setAdminError(
            adminLoadError instanceof Error ? adminLoadError.message : 'Ошибка загрузки админ-панели'
          );
        } finally {
          setAdminLoading(false);
        }
      } else {
        setAdminUsers([]);
        setAdminError('');
        setAdminLoading(false);
      }
    } catch (error) {
      setProfile(null);
      setProjects([]);
      setAdminUsers([]);
      setAdminError('');
      setAdminLoading(false);
      setProfileError(error instanceof Error ? error.message : 'Ошибка загрузки личного кабинета');
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    void refreshAuthUser();
  }, []);

  useEffect(() => {
    if (page !== 'profile') return;
    void loadProfile();
  }, [page]);

  useEffect(() => {
    if (page !== 'projects') return;
    const loadPublicProjects = async () => {
      setPublicProjectsLoading(true);
      setPublicProjectsError('');
      try {
        const res = await fetch(`${API_BASE_URL}/projects/public`);
        if (!res.ok) throw new Error('Не удалось загрузить проекты');
        const data = (await res.json()) as PublicProject[];
        setPublicProjects(Array.isArray(data) ? data : []);
      } catch (error) {
        setPublicProjects([]);
        setPublicProjectsError(error instanceof Error ? error.message : 'Ошибка загрузки проектов');
      } finally {
        setPublicProjectsLoading(false);
      }
    };
    void loadPublicProjects();
  }, [page]);

  useEffect(() => {
    if (page !== 'news') return;
    const loadNews = async () => {
      setNewsLoading(true);
      setNewsError('');
      try {
        const [newsRes, meRes] = await Promise.all([
          fetch(`${API_BASE_URL}/news`),
          fetch(`${API_BASE_URL}/auth/me`, { credentials: 'include' })
        ]);
        if (!newsRes.ok) throw new Error('Не удалось загрузить новости');
        const newsData = (await newsRes.json()) as NewsItem[];
        setNews(Array.isArray(newsData) ? newsData : []);
        if (meRes.ok) {
          const meData = (await meRes.json()) as UserProfile;
          setCurrentUser(meData);
        } else {
          setCurrentUser(null);
        }
      } catch (error) {
        setNews([]);
        setNewsError(error instanceof Error ? error.message : 'Ошибка загрузки новостей');
      } finally {
        setNewsLoading(false);
      }
    };
    void loadNews();
  }, [page]);

  const submitNews = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newsTitle.trim() || !newsDescription.trim()) {
      setNewsSubmitMessage('Введите название и описание новости');
      return;
    }
    if (!isValidImageSource(newsImageUrl)) {
      setNewsSubmitMessage('Фото новости должно быть файлом или корректной ссылкой');
      return;
    }
    const links = newsLinksRaw
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean);
    if (links.some((x) => !isValidUrl(x))) {
      setNewsSubmitMessage('Одна или несколько ссылок в новости некорректны');
      return;
    }

    setNewsSubmitting(true);
    setNewsSubmitMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/news`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newsTitle.trim(),
          description: newsDescription.trim(),
          imageUrl: newsImageUrl.trim() || undefined,
          links
        })
      });
      const raw = await response.text();
      const parsed = raw ? (JSON.parse(raw) as { message?: string | string[] }) : {};
      if (!response.ok) {
        const message = Array.isArray(parsed.message) ? parsed.message.join(', ') : parsed.message;
        throw new Error(message || 'Не удалось сохранить новость');
      }
      setNewsTitle('');
      setNewsDescription('');
      setNewsImageUrl('');
      setNewsImageName('');
      setNewsLinksRaw('');
      setNewsSubmitMessage('Новость успешно опубликована');
      const refresh = await fetch(`${API_BASE_URL}/news`);
      if (refresh.ok) {
        const data = (await refresh.json()) as NewsItem[];
        setNews(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      setNewsSubmitMessage(error instanceof Error ? error.message : 'Ошибка публикации новости');
    } finally {
      setNewsSubmitting(false);
    }
  };

  const validateProjectForm = () => {
    const nextErrors: Record<string, string> = {};
    if (!projectTitle.trim()) nextErrors.title = 'Введите название проекта';
    else if (projectTitle.trim().length < 3) nextErrors.title = 'Минимум 3 символа';
    if (!projectDescription.trim()) nextErrors.description = 'Добавьте описание проекта';
    else if (projectDescription.trim().length > MAX_DESC)
      nextErrors.description = `Описание не длиннее ${MAX_DESC} символов`;
    if (projectAmount < MIN_AMOUNT || projectAmount > MAX_AMOUNT) {
      nextErrors.amount = `Сумма от ${formatRub(MIN_AMOUNT)} до ${formatRub(MAX_AMOUNT)}`;
    }
    if (!isValidUrl(projectImageUrl)) nextErrors.imageUrl = 'Укажите корректную ссылку';
    if (!isValidUrl(projectLogoUrl)) nextErrors.logoUrl = 'Укажите корректную ссылку';
    if (!isValidUrl(projectPresentationUrl)) nextErrors.presentationUrl = 'Укажите корректную ссылку';
    if (!isValidUrl(projectTelegramUrl)) nextErrors.telegramUrl = 'Укажите корректную ссылку';
    if (!isValidUrl(projectVkUrl)) nextErrors.vkUrl = 'Укажите корректную ссылку';
    setProjectFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submitProject = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateProjectForm()) return;
    setProjectFormMessage('');
    setProjectSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/projects`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: projectTitle.trim(),
          description: projectDescription.trim(),
          requestedAmount: projectAmount,
          imageUrl: projectImageUrl.trim() || undefined,
          logoUrl: projectLogoUrl.trim() || undefined,
          presentationUrl: projectPresentationUrl.trim() || undefined,
          telegramUrl: projectTelegramUrl.trim() || undefined,
          vkUrl: projectVkUrl.trim() || undefined
        })
      });
      const raw = await response.text();
      const parsed = raw ? (JSON.parse(raw) as { message?: string | string[] }) : {};
      if (!response.ok) {
        const message = Array.isArray(parsed.message) ? parsed.message.join(', ') : parsed.message;
        throw new Error(message || 'Не удалось сохранить проект');
      }
      setProjectTitle('');
      setProjectDescription('');
      setProjectAmount(100_000);
      setProjectImageUrl('');
      setProjectLogoUrl('');
      setProjectPresentationUrl('');
      setProjectTelegramUrl('');
      setProjectVkUrl('');
      setProjectFormErrors({});
      setProjectFormMessage('Проект успешно сохранен');
      await loadProfile();
    } catch (error) {
      setProjectFormMessage(error instanceof Error ? error.message : 'Ошибка сохранения проекта');
    } finally {
      setProjectSubmitting(false);
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!confirm('Удалить этот проект?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const raw = await response.text();
      const parsed = raw ? (JSON.parse(raw) as { message?: string | string[] }) : {};
      if (!response.ok) {
        const message = Array.isArray(parsed.message) ? parsed.message.join(', ') : parsed.message;
        throw new Error(message || 'Не удалось удалить проект');
      }
      await loadProfile();
    } catch (error) {
      setProjectFormMessage(error instanceof Error ? error.message : 'Ошибка удаления проекта');
    }
  };

  const navItems: CardNavItem[] = [
    {
      label: 'Главная',
      bgColor: 'rgba(255, 255, 255, 0.92)',
      textColor: '#1b2230',
      links: []
    },
    {
      label: 'Новости',
      bgColor: 'rgba(255, 255, 255, 0.92)',
      textColor: '#1b2230',
      links: [
        { label: 'Лента', ariaLabel: 'Лента новостей', href: '#' },
        { label: 'Обновления', ariaLabel: 'Обновления платформы', href: '#' }
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
          isAuthenticated={Boolean(authUser)}
          userAvatarSrc={avatarPreview}
          userInitials={(authUser?.name || authUser?.email || 'U').slice(0, 1).toUpperCase()}
          onProfileClick={() => setPage('profile')}
          onLogoClick={() => setPage('home')}
          onCardClick={(index) => {
            if (index === 0) setPage('home');
            if (index === 1) setPage('news');
            if (index === 2) setPage('projects');
            if (index === 3) setPage('profile');
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
        ) : page === 'news' ? (
          <section className="home-news-page">
            <img className="center-logo home-logo" src={logoSvg} alt="ArtLab logo" />
            <div className="home-news-content">
              <h1>Новости</h1>
              <p>Актуальные новости проекта и платформы.</p>
              {newsLoading && <p className="profile-hint">Загрузка новостей...</p>}
              {newsError && <p className="profile-error">{newsError}</p>}
              {currentUser?.role === 'ADMIN' && (
                <form className="home-news-form" onSubmit={submitNews} noValidate>
                  <h3>Добавить новость</h3>
                  <input
                    className="profile-input"
                    placeholder="Название новости"
                    value={newsTitle}
                    onChange={(e) => setNewsTitle(e.target.value)}
                  />
                  <textarea
                    className="profile-input profile-textarea"
                    placeholder="Описание"
                    rows={3}
                    value={newsDescription}
                    onChange={(e) => setNewsDescription(e.target.value)}
                  />
                  <input
                    className="profile-input"
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) {
                        setNewsImageUrl('');
                        setNewsImageName('');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => {
                        const result = reader.result;
                        if (typeof result === 'string') {
                          setNewsImageUrl(result);
                          setNewsImageName(file.name);
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  {newsImageName && <p className="profile-hint">Выбрано фото: {newsImageName}</p>}
                  <textarea
                    className="profile-input profile-textarea"
                    placeholder="Ссылки (каждая с новой строки)"
                    rows={3}
                    value={newsLinksRaw}
                    onChange={(e) => setNewsLinksRaw(e.target.value)}
                  />
                  <button type="submit" className="about-back-btn" disabled={newsSubmitting}>
                    {newsSubmitting ? 'Публикация...' : 'Опубликовать новость'}
                  </button>
                  {newsSubmitMessage && <p className="profile-hint">{newsSubmitMessage}</p>}
                </form>
              )}
              <div className="home-news-list">
                {news.map((item) => (
                  <article key={item.id} className="home-news-card">
                    {item.imageUrl && <img src={item.imageUrl} alt={item.title} />}
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    {item.links.length > 0 && (
                      <div className="profile-project-links">
                        {item.links.map((link) => (
                          <a key={link} href={link} target="_blank" rel="noreferrer">
                            {link}
                          </a>
                        ))}
                      </div>
                    )}
                    <div className="project-showcase-meta">
                      <span>Автор: {item.author.name}</span>
                      <span>{new Date(item.createdAt).toLocaleDateString('ru-RU')}</span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : page === 'projects' ? (
          <section className="projects-page">
            <h1>Проекты участников</h1>
            <p>Здесь отображаются проекты, которые создали пользователи платформы.</p>
            {publicProjectsLoading && <p className="profile-hint">Загрузка проектов...</p>}
            {publicProjectsError && <p className="profile-error">{publicProjectsError}</p>}
            {!publicProjectsLoading && !publicProjectsError && publicProjects.length === 0 && (
              <p className="profile-hint">Пока нет опубликованных проектов.</p>
            )}
            {!publicProjectsLoading && !publicProjectsError && publicProjects.length > 0 && (
              <div className="projects-grid">
                {publicProjects.map((project) => (
                  <article key={project.id} className="project-showcase-card">
                    <div className="project-showcase-media">
                      {project.imageUrl ? (
                        <img src={project.imageUrl} alt={`Фото проекта ${project.title}`} />
                      ) : (
                        <div className="project-showcase-fallback">Фото проекта</div>
                      )}
                      {project.logoUrl && (
                        <div className="project-logo-overlay">
                          <img src={project.logoUrl} alt={`Логотип ${project.title}`} />
                        </div>
                      )}
                    </div>
                    <div className="project-showcase-body">
                      <h3>{project.title}</h3>
                      <p>{project.description}</p>
                      <div className="profile-project-links">
                        {project.presentationUrl && (
                          <a href={project.presentationUrl} target="_blank" rel="noreferrer">
                            Презентация
                          </a>
                        )}
                        {project.telegramUrl && (
                          <a href={project.telegramUrl} target="_blank" rel="noreferrer">
                            Telegram
                          </a>
                        )}
                        {project.vkUrl && (
                          <a href={project.vkUrl} target="_blank" rel="noreferrer">
                            VK
                          </a>
                        )}
                      </div>
                      <div className="project-showcase-meta">
                        <span>Автор: {project.user.name}</span>
                        <span>{new Date(project.createdAt).toLocaleDateString('ru-RU')}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
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

            <div className="profile-project-create">
              <h3>Создание проекта</h3>
              {!profile ? (
                <p className="profile-hint">Войдите в аккаунт, чтобы добавить проект.</p>
              ) : (
                <form onSubmit={submitProject} className="profile-form" noValidate>
                  <label className="profile-label" htmlFor="project-title">
                    Название проекта
                  </label>
                  <input
                    id="project-title"
                    className={`profile-input ${projectFormErrors.title ? 'error' : ''}`}
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    placeholder="Например, ArtLab Junior"
                  />
                  {projectFormErrors.title && <p className="profile-error">{projectFormErrors.title}</p>}

                  <label className="profile-label" htmlFor="project-description">
                    Описание
                  </label>
                  <textarea
                    id="project-description"
                    className={`profile-input profile-textarea ${projectFormErrors.description ? 'error' : ''}`}
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    maxLength={MAX_DESC}
                    rows={4}
                    placeholder="Коротко опишите идею проекта"
                  />
                  <div className="profile-hint profile-counter">
                    {projectDescription.length} / {MAX_DESC}
                  </div>
                  {projectFormErrors.description && (
                    <p className="profile-error">{projectFormErrors.description}</p>
                  )}

                  <label className="profile-label" htmlFor="project-amount">
                    Запрашиваемая сумма
                  </label>
                  <div className="profile-range-row">
                    <input
                      id="project-amount"
                      className="profile-range"
                      type="range"
                      min={MIN_AMOUNT}
                      max={MAX_AMOUNT}
                      step={1000}
                      value={projectAmount}
                      onChange={(e) => setProjectAmount(Number(e.target.value))}
                    />
                    <span>{formatRub(projectAmount)}</span>
                  </div>
                  {projectFormErrors.amount && <p className="profile-error">{projectFormErrors.amount}</p>}

                  <label className="profile-label" htmlFor="project-image">
                    Фото проекта (ссылка)
                  </label>
                  <input
                    id="project-image"
                    className={`profile-input ${projectFormErrors.imageUrl ? 'error' : ''}`}
                    value={projectImageUrl}
                    onChange={(e) => setProjectImageUrl(e.target.value)}
                    placeholder="https://..."
                  />
                  {projectFormErrors.imageUrl && <p className="profile-error">{projectFormErrors.imageUrl}</p>}

                  <label className="profile-label" htmlFor="project-logo">
                    Логотип на фото (ссылка)
                  </label>
                  <input
                    id="project-logo"
                    className={`profile-input ${projectFormErrors.logoUrl ? 'error' : ''}`}
                    value={projectLogoUrl}
                    onChange={(e) => setProjectLogoUrl(e.target.value)}
                    placeholder="https://..."
                  />
                  {projectFormErrors.logoUrl && <p className="profile-error">{projectFormErrors.logoUrl}</p>}

                  <label className="profile-label" htmlFor="project-presentation">
                    Ссылка на презентацию
                  </label>
                  <input
                    id="project-presentation"
                    className={`profile-input ${projectFormErrors.presentationUrl ? 'error' : ''}`}
                    value={projectPresentationUrl}
                    onChange={(e) => setProjectPresentationUrl(e.target.value)}
                    placeholder="https://..."
                  />
                  {projectFormErrors.presentationUrl && (
                    <p className="profile-error">{projectFormErrors.presentationUrl}</p>
                  )}

                  <label className="profile-label" htmlFor="project-telegram">
                    Telegram (ссылка)
                  </label>
                  <input
                    id="project-telegram"
                    className={`profile-input ${projectFormErrors.telegramUrl ? 'error' : ''}`}
                    value={projectTelegramUrl}
                    onChange={(e) => setProjectTelegramUrl(e.target.value)}
                    placeholder="https://t.me/..."
                  />
                  {projectFormErrors.telegramUrl && (
                    <p className="profile-error">{projectFormErrors.telegramUrl}</p>
                  )}

                  <label className="profile-label" htmlFor="project-vk">
                    VK (ссылка)
                  </label>
                  <input
                    id="project-vk"
                    className={`profile-input ${projectFormErrors.vkUrl ? 'error' : ''}`}
                    value={projectVkUrl}
                    onChange={(e) => setProjectVkUrl(e.target.value)}
                    placeholder="https://vk.com/..."
                  />
                  {projectFormErrors.vkUrl && <p className="profile-error">{projectFormErrors.vkUrl}</p>}

                  <button type="submit" className="about-back-btn" disabled={projectSubmitting}>
                    {projectSubmitting ? 'Сохранение...' : 'Сохранить проект'}
                  </button>
                  {projectFormMessage && <p className="profile-hint">{projectFormMessage}</p>}
                </form>
              )}
            </div>

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
                      {project.imageUrl && (
                        <div className="project-inline-media">
                          <img src={project.imageUrl} alt={`Фото проекта ${project.title}`} />
                          {project.logoUrl && (
                            <div className="project-logo-overlay small">
                              <img src={project.logoUrl} alt={`Логотип ${project.title}`} />
                            </div>
                          )}
                        </div>
                      )}
                      <div className="profile-project-links">
                        {project.presentationUrl && (
                          <a href={project.presentationUrl} target="_blank" rel="noreferrer">
                            Презентация
                          </a>
                        )}
                        {project.telegramUrl && (
                          <a href={project.telegramUrl} target="_blank" rel="noreferrer">
                            Telegram
                          </a>
                        )}
                        {project.vkUrl && (
                          <a href={project.vkUrl} target="_blank" rel="noreferrer">
                            VK
                          </a>
                        )}
                      </div>
                      <div className="profile-project-meta">
                        <span>Сумма: {Number(project.requestedAmount).toLocaleString('ru-RU')} ₽</span>
                        <span>{new Date(project.createdAt).toLocaleDateString('ru-RU')}</span>
                      </div>
                      <button
                        type="button"
                        className="profile-delete-btn"
                        onClick={() => void deleteProject(project.id)}
                      >
                        Удалить проект
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </div>
            {profile?.role === 'ADMIN' && (
              <div className="profile-admin">
                <h3>Панель администратора</h3>
                <p className="profile-hint">
                  Здесь отображаются зарегистрированные пользователи и их проекты.
                </p>
                {adminLoading && <p className="profile-hint">Загрузка списка пользователей...</p>}
                {adminError && <p className="profile-error">{adminError}</p>}
                {!adminLoading && !adminError && adminUsers.length === 0 && (
                  <p className="profile-hint">Пользователи пока не зарегистрированы.</p>
                )}
                {!adminLoading && !adminError && adminUsers.length > 0 && (
                  <div className="admin-user-list">
                    {adminUsers.map((user) => (
                      <article key={user.id} className="admin-user-card">
                        <div className="admin-user-head">
                          <h4>{user.name}</h4>
                          <span>{new Date(user.createdAt).toLocaleDateString('ru-RU')}</span>
                        </div>
                        <p className="admin-user-email">{user.email}</p>
                        {user.projects.length === 0 ? (
                          <p className="profile-hint">У пользователя пока нет проектов.</p>
                        ) : (
                          <div className="admin-user-projects">
                            {user.projects.map((project) => (
                              <div key={project.id} className="admin-user-project-card">
                                <h5>{project.title}</h5>
                                <p>{project.description}</p>
                                {project.imageUrl && (
                                  <div className="project-inline-media">
                                    <img src={project.imageUrl} alt={`Фото проекта ${project.title}`} />
                                    {project.logoUrl && (
                                      <div className="project-logo-overlay small">
                                        <img src={project.logoUrl} alt={`Логотип ${project.title}`} />
                                      </div>
                                    )}
                                  </div>
                                )}
                                <div className="profile-project-links">
                                  {project.presentationUrl && (
                                    <a href={project.presentationUrl} target="_blank" rel="noreferrer">
                                      Презентация
                                    </a>
                                  )}
                                  {project.telegramUrl && (
                                    <a href={project.telegramUrl} target="_blank" rel="noreferrer">
                                      Telegram
                                    </a>
                                  )}
                                  {project.vkUrl && (
                                    <a href={project.vkUrl} target="_blank" rel="noreferrer">
                                      VK
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button type="button" className="about-back-btn" onClick={() => setPage('home')}>
              Назад
            </button>
          </section>
        )}
      </section>
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onAuthSuccess={() => {
          void refreshAuthUser();
          setPage('profile');
          void loadProfile();
        }}
      />
    </main>
  );
}
