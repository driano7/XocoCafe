/*
 * --------------------------------------------------------------------
 *  Xoco Café — Software Property.
 *  Copyright (c) 2025.
 * --------------------------------------------------------------------
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FaBitcoin, FaInstagram, FaSpotify, FaTiktok, FaTwitter, FaWhatsapp } from 'react-icons/fa';
import { SiEthereum } from 'react-icons/si';
import { HiOutlineBanknotes } from 'react-icons/hi2';
import siteMetadata from 'content/siteMetadata';
import TypewriterText from '@/components/TypewriterText';
import { motion } from 'framer-motion';

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

  return (
    <section className="not-prose mt-12 space-y-10 rounded-3xl bg-primary-500 px-6 py-10 text-white shadow-2xl">
      <div className="grid gap-6 md:grid-cols-2 md:items-center">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
            Síguenos
          </p>
          <h2 ref={headingRef} className="text-3xl font-black tracking-tight text-white">
            {shouldAnimateHeading ? (
              <TypewriterText segments={[{ text: 'Estamos creando comunidad' }]} startDelay={150} />
            ) : (
              'Estamos creando comunidad'
            )}
          </h2>
          <p className="text-sm text-white/80">
            Conecta con Xoco Café en tus plataformas favoritas para descubrir nuevos lanzamientos,
            eventos y actualizaciones del proyecto.
          </p>
        </div>
        {SOCIAL_LINKS.length > 0 && (
          <ul className="flex list-none flex-wrap items-center gap-3 text-white">
            {SOCIAL_LINKS.map(({ label, href, Icon }) => (
              <li key={label}>
                <a
                  href={href!}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="group relative flex h-12 w-12 items-center justify-center rounded-full border border-white/30 text-xl text-white transition hover:border-white hover:bg-white/10"
                >
                  <span className="absolute inset-0 rounded-full bg-white/10 opacity-0 transition group-hover:opacity-100" />
                  <Icon className="text-white" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
          Apoya el proyecto
        </p>
        <h3 className="text-2xl font-bold">Donaciones abiertas para seguir construyendo.</h3>
        <p className="text-sm text-white/80">
          Copia el método que prefieras y gracias por impulsar a Xoco Café. Nuestro equipo recibe
          las contribuciones directamente para financiar mejoras en la experiencia.
        </p>
      </div>
      <dl className="grid gap-4 md:grid-cols-3 text-white">
        {DONATION_METHODS.map(({ label, value, Icon, accent }, index) => (
          <motion.div
            key={label}
            className="flex flex-col gap-4 rounded-2xl bg-black/10 p-5 backdrop-blur-sm transition hover:bg-black/15"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={donationVariants}
            custom={index}
          >
            <div className="flex items-center gap-3">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-full bg-black/20 text-2xl"
                style={{ color: accent }}
              >
                <Icon aria-hidden />
              </span>
              <dt className="text-sm font-semibold uppercase tracking-[0.35em] text-white/70">
                {label}
              </dt>
            </div>
            <dd className="flex flex-col gap-2 font-mono text-sm text-white/90 sm:flex-row sm:items-center sm:gap-3">
              <span className="break-all">{value}</span>
              <button
                type="button"
                onClick={() => handleCopy(label, value!)}
                className="inline-flex h-9 items-center justify-center rounded-full border border-white/30 px-4 text-[11px] font-semibold uppercase tracking-[0.3em] text-white transition hover:border-white hover:bg-white/10"
              >
                {copyFeedback?.label === label && copyFeedback.status === 'success'
                  ? 'Copiado'
                  : 'Copiar'}
              </button>
            </dd>
          </motion.div>
        ))}
      </dl>
      {copyFeedback && (
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/80">
          {copyFeedback.status === 'success'
            ? `${copyFeedback.label} copiado al portapapeles`
            : 'No pudimos copiar automáticamente. Selecciona el texto y cópialo manualmente.'}
        </p>
      )}
    </section>
  );
}
