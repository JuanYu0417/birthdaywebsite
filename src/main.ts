import './styles.css';

// ===== Party config =====
const PARTY_DATE = new Date('2026-08-22T14:00:00');
const RSVP_STORAGE_KEY = 'priscilla-rsvp-submissions';
const RSVP_API_URL = '/api/rsvp';

interface RsvpEntry {
  name: string;
  phone: string;
  attending: 'yes' | 'no' | 'maybe' | '';
  bias: string;
  allergies: string;
  notes: string;
  submittedAt: string;
}

// ===== Countdown =====
type CountdownUnit = 'days' | 'hours' | 'minutes' | 'seconds';

function getTimeRemaining(target: Date): Record<CountdownUnit, number> {
  const total = target.getTime() - Date.now();
  if (total <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  return {
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60),
  };
}

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

function initCountdown(): void {
  const root = document.getElementById('countdown');
  if (!root) return;

  const units: CountdownUnit[] = ['days', 'hours', 'minutes', 'seconds'];
  const elements = new Map<CountdownUnit, HTMLElement>();

  for (const unit of units) {
    const el = root.querySelector<HTMLElement>(`[data-unit="${unit}"]`);
    if (el) elements.set(unit, el);
  }

  const update = (): void => {
    const remaining = getTimeRemaining(PARTY_DATE);
    for (const unit of units) {
      const el = elements.get(unit);
      if (el) el.textContent = pad(remaining[unit]);
    }
  };

  update();
  window.setInterval(update, 1000);
}

// ===== Rotating multilingual greeting =====
interface Greeting {
  text: string;
  lang: 'en' | 'fi' | 'zh';
}

const GREETINGS: Greeting[] = [
  { text: 'Happy Birthday!', lang: 'en' },
  { text: 'Hyvää syntymäpäivää!', lang: 'fi' },
  { text: '生日快乐!', lang: 'zh' },
];

function initGreetingRotator(): void {
  const root = document.getElementById('greeting');
  const textEl = root?.querySelector<HTMLSpanElement>('.greeting-text');
  if (!root || !textEl) return;

  let index = 0;

  const apply = (greeting: Greeting): void => {
    textEl.classList.remove('lang-en', 'lang-fi', 'lang-zh');
    textEl.classList.add(`lang-${greeting.lang}`);
    textEl.textContent = greeting.text;
    root.setAttribute('lang', greeting.lang);
  };

  const first = GREETINGS[0];
  if (first) apply(first);

  window.setInterval(() => {
    index = (index + 1) % GREETINGS.length;
    const next = GREETINGS[index];
    if (!next) return;
    textEl.classList.add('fade-out');
    window.setTimeout(() => {
      apply(next);
      textEl.classList.remove('fade-out');
    }, 400);
  }, 2800);
}

// ===== Smooth scroll for anchor links =====
function initSmoothScroll(): void {
  const links = document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]');
  links.forEach((link) => {
    link.addEventListener('click', (event) => {
      const targetId = link.getAttribute('href');
      if (!targetId || targetId === '#') return;
      const target = document.querySelector(targetId);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

// ===== RSVP form =====
function loadRsvps(): RsvpEntry[] {
  try {
    const raw = localStorage.getItem(RSVP_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RsvpEntry[]) : [];
  } catch {
    return [];
  }
}

function cacheRsvpLocally(entry: RsvpEntry): void {
  const all = loadRsvps();
  all.push(entry);
  localStorage.setItem(RSVP_STORAGE_KEY, JSON.stringify(all));
}

function setMessage(el: HTMLElement, text: string, kind: 'success' | 'error'): void {
  el.textContent = text;
  el.classList.remove('success', 'error');
  el.classList.add(kind);
}

async function submitRsvpToServer(entry: RsvpEntry): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(RSVP_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: data.error ?? `Server error (${response.status})` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

function initRsvpForm(): void {
  const form = document.getElementById('rsvpForm') as HTMLFormElement | null;
  const message = document.getElementById('formMessage');
  const submitBtn = form?.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (!form || !message || !submitBtn) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const entry: RsvpEntry = {
      name: (data.get('name') as string)?.trim() ?? '',
      phone: (data.get('phone') as string)?.trim() ?? '',
      attending: (data.get('attending') as RsvpEntry['attending']) ?? '',
      bias: (data.get('bias') as string) ?? '',
      allergies: (data.get('allergies') as string)?.trim() ?? '',
      notes: (data.get('notes') as string)?.trim() ?? '',
      submittedAt: new Date().toISOString(),
    };

    if (!entry.name || !entry.phone || !entry.attending || !entry.bias || !entry.allergies) {
      setMessage(message, 'Please fill in all required fields, hunter!', 'error');
      return;
    }

    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending…';
    setMessage(message, 'Sending your RSVP to the Honmoon…', 'success');

    const result = await submitRsvpToServer(entry);

    submitBtn.disabled = false;
    submitBtn.textContent = originalText;

    if (!result.ok) {
      cacheRsvpLocally(entry);
      setMessage(
        message,
        `Saved locally — couldn't reach the server (${result.error ?? 'offline'}). Please tell Priscilla's family directly!`,
        'error',
      );
      return;
    }

    form.reset();

    const reply =
      entry.attending === 'yes'
        ? `⚡ ${entry.name}, your VIP pass is locked in! See you at Priscilla's concert. ⚡`
        : entry.attending === 'maybe'
          ? `Got it, ${entry.name}! We'll save a spot just in case.`
          : `Thanks for letting us know, ${entry.name}. We'll miss you!`;

    setMessage(message, reply, 'success');
    burstSparkles(form.getBoundingClientRect());
  });
}

// ===== Click sparkles =====
const SPARKLE_EMOJIS = ['✨', '⭐', '💫', '⚡', '🌟'];

function spawnSparkle(x: number, y: number): void {
  const emoji = SPARKLE_EMOJIS[Math.floor(Math.random() * SPARKLE_EMOJIS.length)];
  const sparkle = document.createElement('span');
  sparkle.className = 'click-sparkle';
  sparkle.textContent = emoji ?? '✨';
  sparkle.style.left = `${x}px`;
  sparkle.style.top = `${y}px`;

  const angle = Math.random() * Math.PI * 2;
  const distance = 60 + Math.random() * 60;
  sparkle.style.setProperty('--dx', `${Math.cos(angle) * distance - 50}%`);
  sparkle.style.setProperty('--dy', `${Math.sin(angle) * distance - 50}%`);

  document.body.appendChild(sparkle);
  window.setTimeout(() => sparkle.remove(), 800);
}

function burstSparkles(rect: DOMRect): void {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  for (let i = 0; i < 14; i++) {
    spawnSparkle(cx + (Math.random() - 0.5) * 60, cy + (Math.random() - 0.5) * 60);
  }
}

function initClickSparkles(): void {
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, select, textarea, button')) return;
    spawnSparkle(event.clientX, event.clientY);
  });
}

// ===== Reveal on scroll =====
function initRevealOnScroll(): void {
  const targets = document.querySelectorAll('section h2, .about-card, .info-item, .timeline-item, .rsvp-card');
  targets.forEach((el) => el.classList.add('reveal'));

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.15 },
  );

  targets.forEach((el) => observer.observe(el));
}

// ===== Bootstrap =====
function init(): void {
  initCountdown();
  initGreetingRotator();
  initSmoothScroll();
  initRsvpForm();
  initClickSparkles();
  initRevealOnScroll();
  // eslint-disable-next-line no-console
  console.log('%c⚡ HUNTR/X mission systems online ⚡', 'color: #ffd60a; font-weight: bold; font-size: 14px;');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
