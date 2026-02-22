import React, {useMemo, useState} from 'react';
import clsx from 'clsx';
import styles from './Testimonials.module.css';

export interface Testimonial {
  name: string;
  role: string;
  quote: string;
  avatarUrl?: string;
  socialHandle?: string;
  socialUrl?: string;
}

export interface CommunityLink {
  label: string;
  url: string;
  icon: React.ReactNode;
  description: string;
}

export interface TestimonialsProps {
  testimonials?: Testimonial[];
  communityLinks?: CommunityLink[];
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M20.3 4.37A18.16 18.16 0 0 0 15.9 3l-.22.44a16.1 16.1 0 0 1 3.99 1.52 12.66 12.66 0 0 0-5.67-1.3h-.01c-1.95 0-3.9.48-5.66 1.3A16.2 16.2 0 0 1 12.3 3.4L12.08 3A18.06 18.06 0 0 0 7.7 4.37C4.9 8.55 4.14 12.62 4.52 16.63A18.24 18.24 0 0 0 9.9 19.5l.43-.7a11.82 11.82 0 0 1-2.62-1.28l.2-.14c3.51 1.64 7.33 1.64 10.8 0l.2.14c-.82.5-1.7.93-2.63 1.28l.43.7a18.2 18.2 0 0 0 5.39-2.87c.45-4.66-.77-8.7-2.8-12.26ZM9.54 14.17c-1.05 0-1.9-.97-1.9-2.15s.84-2.15 1.9-2.15c1.07 0 1.91.97 1.9 2.15 0 1.18-.84 2.15-1.9 2.15Zm4.92 0c-1.05 0-1.9-.97-1.9-2.15s.84-2.15 1.9-2.15c1.06 0 1.9.97 1.9 2.15s-.84 2.15-1.9 2.15Z"
      />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 .5a12 12 0 0 0-3.79 23.38c.6.11.82-.26.82-.58v-2.02c-3.34.72-4.04-1.42-4.04-1.42-.54-1.4-1.33-1.77-1.33-1.77-1.08-.74.08-.72.08-.72 1.2.09 1.83 1.25 1.83 1.25 1.06 1.85 2.8 1.32 3.48 1 .1-.79.42-1.32.76-1.63-2.66-.31-5.46-1.37-5.46-6.06 0-1.34.46-2.43 1.23-3.29-.13-.31-.53-1.56.12-3.25 0 0 1-.33 3.3 1.26A11.3 11.3 0 0 1 12 6.57c1 0 2 .14 2.93.41 2.29-1.59 3.3-1.26 3.3-1.26.65 1.69.25 2.94.12 3.25.76.86 1.23 1.95 1.23 3.29 0 4.7-2.8 5.75-5.48 6.06.43.38.82 1.1.82 2.24v3.33c0 .32.22.69.83.58A12 12 0 0 0 12 .5Z"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M18.9 2H22l-6.8 7.76L23.2 22h-6.3l-4.94-6.77L6.04 22H2.92l7.28-8.32L.68 2h6.46l4.47 6.2L18.9 2Zm-1.1 18h1.75L6.2 3.9H4.32L17.8 20Z"
      />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M21.9 4.6c.2-1-1-1.8-1.9-1.4L2.8 10.2c-1.1.43-1.05 1.96.08 2.3l3.94 1.2 1.5 4.74a1.33 1.33 0 0 0 2.2.57l2.2-2.1 4.3 3.17c.75.56 1.8.14 1.98-.78L21.9 4.6Zm-4.4 3.02-8.6 7.87-.35-1.11 6.95-6.69a.5.5 0 1 0-.66-.76l-8.04 6.1-2.52-.77L19.77 5.7l-2.27 13.1-3.7-2.74a1.33 1.33 0 0 0-1.7.1l-1.79 1.7.92-2.85 9.24-8.45a.5.5 0 0 0-.67-.74Z"
      />
    </svg>
  );
}

const defaultTestimonials: Testimonial[] = [
  {
    name: 'Amina Okafor',
    role: 'Smart Contract Engineer, Lagos',
    quote:
      'Soroban Cookbook helped me move from toy contracts to production patterns. The examples are practical and easy to adapt.',
    avatarUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=Amina%20Okafor',
    socialHandle: '@amina_builds',
    socialUrl: 'https://x.com/amina_builds',
  },
  {
    name: 'Diego Navarro',
    role: 'Protocol Developer, Buenos Aires',
    quote:
      'I used the Cookbook to standardize authorization and storage decisions across our contracts. It cut review cycles significantly.',
    avatarUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=Diego%20Navarro',
    socialHandle: '@diegon_chain',
    socialUrl: 'https://github.com/diegon-chain',
  },
  {
    name: 'Priya Raman',
    role: 'Full-Stack Web3 Builder, Bengaluru',
    quote:
      'The docs strike a good balance between fundamentals and implementation detail. It is now our onboarding reference for Soroban.',
    avatarUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=Priya%20Raman',
    socialHandle: '@priya_stellar',
    socialUrl: 'https://x.com/priya_stellar',
  },
  {
    name: 'Ethan Brooks',
    role: 'Blockchain Tooling Engineer, Austin',
    quote:
      'Clear snippets, consistent patterns, and useful edge-case guidance. This saved us from common pitfalls during integration.',
    avatarUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=Ethan%20Brooks',
    socialHandle: '@ethanbrooksdev',
    socialUrl: 'https://github.com/ethanbrooksdev',
  },
  {
    name: 'Noor Al-Hassan',
    role: 'DevRel Engineer, Dubai',
    quote:
      'As someone teaching Soroban workshops, the Cookbook is the fastest way to get contributors shipping reliable contract code.',
    avatarUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=Noor%20Al-Hassan',
    socialHandle: '@noor_onchain',
    socialUrl: 'https://x.com/noor_onchain',
  },
];

const defaultCommunityLinks: CommunityLink[] = [
  {
    label: 'Discord',
    url: 'https://discord.gg/stellardev',
    icon: <DiscordIcon />,
    description: 'Join developer chat and get help in real time.',
  },
  {
    label: 'GitHub',
    url: 'https://github.com/Soroban-Cookbook/Soroban-Cookbook-',
    icon: <GithubIcon />,
    description: 'Contribute code, docs, and examples.',
  },
  {
    label: 'Twitter/X',
    url: 'https://x.com/stellarorg',
    icon: <XIcon />,
    description: 'Follow ecosystem updates and releases.',
  },
  {
    label: 'Telegram',
    url: 'https://t.me/stellar',
    icon: <TelegramIcon />,
    description: 'Connect with the broader Stellar community.',
  },
];

export default function Testimonials({
  testimonials = defaultTestimonials,
  communityLinks = defaultCommunityLinks,
  className,
}: TestimonialsProps) {
  const [failedAvatars, setFailedAvatars] = useState<Record<number, boolean>>({});

  const cards = useMemo(
    () =>
      testimonials.map((item, index) => {
        const showFallback = !item.avatarUrl || failedAvatars[index];
        const initials = getInitials(item.name);

        return (
          <article key={`${item.name}-${index}`} className={styles.card}>
            <header className={styles.cardHeader}>
              <div className={styles.avatarWrap}>
                {showFallback ? (
                  <span className={styles.avatarFallback} aria-hidden="true">
                    {initials}
                  </span>
                ) : (
                  <img
                    className={styles.avatar}
                    src={item.avatarUrl}
                    alt={`${item.name} avatar`}
                    loading="lazy"
                    onError={() => setFailedAvatars((prev) => ({...prev, [index]: true}))}
                  />
                )}
              </div>
              <div>
                <h3 className={styles.name}>{item.name}</h3>
                <p className={styles.role}>{item.role}</p>
              </div>
            </header>

            <blockquote className={styles.quote}>{item.quote}</blockquote>

            {item.socialHandle && item.socialUrl && (
              <a
                className={styles.socialLink}
                href={item.socialUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${item.name} social profile ${item.socialHandle}`}>
                {item.socialHandle}
              </a>
            )}
          </article>
        );
      }),
    [failedAvatars, testimonials],
  );

  return (
    <section className={clsx(styles.section, className)} aria-labelledby="community-testimonials-title">
      <div className={clsx('container', styles.inner)}>
        <header className={styles.sectionHeader}>
          <h2 id="community-testimonials-title" className={styles.title}>
            Built by Developers, Backed by Community
          </h2>
          <p className={styles.subtitle}>
            Feedback from Soroban builders and the channels where contributors collaborate every day.
          </p>
        </header>

        <div className={styles.grid}>{cards}</div>

        <section className={styles.community} aria-label="Community channels">
          <h3 className={styles.communityTitle}>Community Channels</h3>
          <ul className={styles.communityList}>
            {communityLinks.map((link) => (
              <li key={link.label}>
                <a
                  className={styles.communityLink}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${link.label}: ${link.description}`}>
                  <span className={styles.communityIcon}>{link.icon}</span>
                  <span className={styles.communityText}>
                    <span className={styles.communityLabel}>{link.label}</span>
                    <span className={styles.communityDescription}>{link.description}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}
