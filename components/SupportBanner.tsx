/*
 * --------------------------------------------------------------------
 *  Xoco Café — Software Property.
 *  Copyright (c) 2025.
 * --------------------------------------------------------------------
 */

'use client';

import classNames from 'classnames';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FaBitcoin, FaInstagram, FaSpotify, FaTiktok, FaTwitter, FaWhatsapp } from 'react-icons/fa';
import { SiEthereum } from 'react-icons/si';
import { HiOutlineBanknotes } from 'react-icons/hi2';
import siteMetadata from 'content/siteMetadata';
import TypewriterText from '@/components/TypewriterText';
import { motion } from 'framer-motion';
import { useLanguage } from '@/components/Language/LanguageProvider';
import TranslatedText from '@/components/Language/TranslatedText';

const SOCIAL_ICON_CLASSES =
  'group relative flex h-12 w-12 items-center justify-center rounded-full border border-white/30 text-xl text-white transition-all duration-300 hover:-translate-y-1 hover:border-white hover:bg-white/10';

const SOCIAL_GLOW_CLASSES =
  'pointer-events-none absolute inset-0 rounded-full bg-white/15 opacity-0 transition-opacity duration-300 group-hover:opacity-100';

const SOCIAL_LINKS = [
  { label: 'TikTok', href: siteMetadata.tiktok, Icon: FaTiktok },
  { label: 'Instagram', href: siteMetadata.instagram, Icon: FaInstagram },
  { label: 'Twitter', href: siteMetadata.twitter, Icon: FaTwitter },
  { label: 'Spotify', href: siteMetadata.spotify, Icon: FaSpotify },
  { label: 'WhatsApp', href: siteMetadata.whats, Icon: FaWhatsapp },
].filter((entry) => Boolean(entry.href));

const DONATION_METHODS = [
  {
    label: 'Bitcoin',
    value: siteMetadata.donations?.bitcoin,
    accent: '#f7931a',
    Icon: FaBitcoin,
  },
  {
    label: 'Ethereum',
    value: siteMetadata.donations?.ethereum,
    accent: '#627eea',
    Icon: SiEthereum,
  },
  {
    label: 'Cuenta bancaria',
    labelTid: 'support.bank_account',
    value: siteMetadata.donations?.bank,
    accent: '#f0d5ac',
    Icon: HiOutlineBanknotes,
  },
].filter((entry) => Boolean(entry.value));

type CopyFeedback = {
  label: string;
  status: 'success' | 'error';
};

export default function SupportBanner() {
  const [copyFeedback, setCopyFeedback] = useState<CopyFeedback | null>(null);
  const [shouldAnimateHeading, setShouldAnimateHeading] = useState(false);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const socialListRef = useRef<HTMLUListElement | null>(null);
  const [socialsVisible, setSocialsVisible] = useState(false);
  const [socialsHasBeenVisible, setSocialsHasBeenVisible] = useState(false);
  const donationVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.96 },
    visible: (index: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.5, ease: 'easeOut', delay: index * 0.15 },
    }),
  };

  const handleCopy = useCallback(async (label: string, value: string) => {
    const persistFeedback = (status: CopyFeedback['status']) => {
      setCopyFeedback({ label, status });
      if (status === 'success') {
        window.setTimeout(() => {
          setCopyFeedback((prev) => (prev?.label === label ? null : prev));
        }, 2000);
      }
    };

    const fallbackCopy = () => {
      if (typeof document === 'undefined') return false;
      try {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        const selection = document.getSelection();
        const selectedRange =
          selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
        textarea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (selectedRange && selection) {
          selection.removeAllRanges();
          selection.addRange(selectedRange);
        }
        return success;
      } catch {
        return false;
      }
    };

    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(value);
        persistFeedback('success');
        return;
      }
      if (fallbackCopy()) {
        persistFeedback('success');
        return;
      }
      persistFeedback('error');
    } catch {
      if (fallbackCopy()) {
        persistFeedback('success');
        return;
      }
      persistFeedback('error');
    }
  }, []);

  const { t } = useLanguage();

  useEffect(() => {
    if (!headingRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldAnimateHeading(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(headingRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const target = socialListRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          setSocialsVisible(true);
          setSocialsHasBeenVisible(true);
        } else {
          setSocialsVisible(false);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="not-prose mt-12 space-y-10 rounded-3xl bg-primary-500 px-6 py-10 text-white shadow-2xl">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-10">
        <div className="flex flex-1 flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2
              ref={headingRef}
              className="text-5xl font-black uppercase tracking-tighter text-white sm:text-7xl"
            >
              <TranslatedText tid="support.follow_us" fallback="Síguenos" />
            </h2>
            <div className="max-w-md text-xl font-medium leading-relaxed text-white/90">
              {shouldAnimateHeading ? (
                <TypewriterText
                  segments={[
                    {
                      text: t('support.creating_community') || 'Estamos creando comunidad',
                    },
                  ]}
                  startDelay={150}
                />
              ) : (
                <TranslatedText
                  tid="support.creating_community"
                  fallback="Estamos creando comunidad"
                />
              )}
            </div>
          </div>
          <p className="text-sm text-white/80">
            <TranslatedText
              tid="support.connect_desc"
              fallback="Conecta con Xoco Café en tus plataformas favoritas para descubrir nuevos lanzamientos, eventos y actualizaciones del proyecto."
            />
          </p>
        </div>
        {SOCIAL_LINKS.length > 0 && (
          <ul
            ref={socialListRef}
            className="flex list-none flex-wrap items-center gap-3 text-white"
            aria-label="Redes sociales"
          >
            {SOCIAL_LINKS.map(({ label, href, Icon }, index) => {
              const visibilityClass =
                socialsHasBeenVisible && socialsVisible
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-3 opacity-0';
              return (
                <li
                  key={label}
                  className={classNames('transform transition-all duration-500', visibilityClass)}
                  style={{ transitionDelay: `${index * 120}ms` }}
                >
                  <a
                    href={href!}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    className={SOCIAL_ICON_CLASSES}
                  >
                    <span className={SOCIAL_GLOW_CLASSES} />
                    <Icon className="text-white" />
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-end gap-10 lg:items-end">
        <div className="flex flex-col gap-2 lg:text-right">
          <h3 className="text-4xl font-black uppercase tracking-tighter text-white sm:text-6xl">
            <TranslatedText tid="support.support_project" fallback="Apoya el proyecto" />
          </h3>
          <p className="max-w-md text-lg font-medium leading-relaxed text-white/90 lg:ml-auto">
            <TranslatedText
              tid="support.donations_open"
              fallback="Donaciones abiertas para seguir construyendo."
            />
          </p>
        </div>
        <p className="text-sm text-white/80">
          <TranslatedText
            tid="support.copy_method_desc"
            fallback="Copia el método que prefieras y gracias por impulsar a Xoco Café. Nuestro equipo recibe las contribuciones directamente para financiar mejoras en la experiencia."
          />
        </p>
      </div>
      <dl className="grid w-full grid-cols-1 gap-4 text-white sm:grid-cols-2 md:grid-cols-3">
        {DONATION_METHODS.map((method, index) => (
          <motion.div
            key={method.label}
            className="flex w-full flex-col gap-4 rounded-2xl bg-black/10 p-5 backdrop-blur-sm transition hover:bg-black/15"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={donationVariants}
            custom={index}
          >
            <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-full bg-black/20 text-2xl"
                style={{ color: method.accent }}
              >
                <method.Icon aria-hidden />
              </span>
              <dt className="text-sm font-semibold uppercase tracking-[0.35em] text-white/70">
                {method.labelTid ? (
                  <TranslatedText tid={method.labelTid} fallback={method.label} />
                ) : (
                  method.label
                )}
              </dt>
            </div>
            <dd className="mt-2 flex flex-col gap-2 text-center font-mono text-sm text-white/90 sm:text-left">
              <div className="flex w-full flex-col items-center overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-3 text-center sm:items-start sm:text-left">
                <span className="mb-1 text-[10px] font-black uppercase tracking-widest text-white/60">
                  {method.labelTid ? (
                    <TranslatedText tid={method.labelTid} fallback={method.label} />
                  ) : (
                    method.label
                  )}
                </span>
                <span
                  className="mb-2 w-full truncate text-xs font-bold text-white"
                  title={method.value}
                >
                  {method.value}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(method.label, method.value!)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/20 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-white hover:text-primary-600"
                >
                  {copyFeedback?.label === method.label ? (
                    <TranslatedText tid="common.copied" fallback="Copiado" />
                  ) : (
                    <TranslatedText tid="common.copy" fallback="Copiar" />
                  )}
                </button>
              </div>
            </dd>
          </motion.div>
        ))}
      </dl>
    </section>
  );
}
