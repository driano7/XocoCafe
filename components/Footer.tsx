/*
 * --------------------------------------------------------------------
 *  Xoco Café — Software Property
 *  Copyright (c) 2025 Xoco Café
 *  Principal Developer: Donovan Riaño
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at:
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 *  --------------------------------------------------------------------
 *  PROPIEDAD DEL SOFTWARE — XOCO CAFÉ.
 *  Copyright (c) 2025 Xoco Café.
 *  Desarrollador Principal: Donovan Riaño.
 *
 *  Este archivo está licenciado bajo la Apache License 2.0.
 *  Consulta el archivo LICENSE en la raíz del proyecto para más detalles.
 * --------------------------------------------------------------------
 */

import siteMetadata from 'content/siteMetadata';
import Link from 'next/link';
import { Suspense } from 'react';
//import { AiFillLinkedin } from 'react-icons/ai';
import { FaTiktok, FaSpotify, FaInstagram, FaTwitter, FaWhatsapp } from 'react-icons/fa';
import SectionContainer from './SectionContainer';
import NowPlaying from './Spotify/NowPlaying';

const SOCIAL_ICON_CLASSES =
  'group relative flex h-10 w-10 items-center justify-center rounded-full text-base text-current transition-all duration-300 ease-out hover:-translate-y-1 hover:text-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 dark:hover:text-primary-200 sm:h-10 sm:w-10 sm:text-lg';

const SOCIAL_ICON_GLOW =
  'pointer-events-none absolute inset-0 rounded-full bg-primary-500/15 opacity-0 transition-opacity duration-300 group-hover:opacity-100';

export default function Footer() {
  return (
    <SectionContainer>
      <footer>
        <div className="mb-0 flex flex-col justify-start space-y-1.5 space-x-0 py-10 text-gray-500 dark:text-gray-400">
          <Suspense fallback="loading...">
            <NowPlaying />
          </Suspense>
          <p className="text-center text-sm text-gray-600 dark:text-gray-300">
            Con 💙 realizada por:{' '}
            <a
              href="https://goo.su/rXusw"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-primary-600 underline-offset-4 hover:underline dark:text-primary-200"
            >
              Donovan Riaño Enriquez
            </a>
          </p>
          <div className="flex flex-col items-center space-y-2 text-sm sm:flex-row sm:justify-between sm:text-base">
            <ul className="flex space-x-2">
              <li>{`© ${new Date().getFullYear()}`}</li>
              <li>{` • `}</li>
              <li>
                <Link href="/">{siteMetadata.title}</Link>
              </li>
            </ul>
            <ul className="flex cursor-pointer items-center space-x-3 sm:space-x-5">
              <li>
                <a
                  href={siteMetadata.tiktok}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="tiktok"
                  className={SOCIAL_ICON_CLASSES}
                >
                  <span className={SOCIAL_ICON_GLOW} />
                  <FaTiktok />
                </a>
              </li>
              <li>
                <a
                  href={siteMetadata.instagram}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="github"
                  className={SOCIAL_ICON_CLASSES}
                >
                  <span className={SOCIAL_ICON_GLOW} />
                  <FaInstagram />
                </a>
              </li>
              <li>
                <a
                  href={siteMetadata.twitter}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="twitter"
                  className={SOCIAL_ICON_CLASSES}
                >
                  <span className={SOCIAL_ICON_GLOW} />
                  <FaTwitter />
                </a>
              </li>
              <li>
                <a
                  href={siteMetadata.spotify}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="spotify"
                  className={SOCIAL_ICON_CLASSES}
                >
                  <span className={SOCIAL_ICON_GLOW} />
                  <FaSpotify />
                </a>
              </li>
              <li>
                <a
                  href={siteMetadata.whats}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="steam"
                  className={SOCIAL_ICON_CLASSES}
                >
                  <span className={SOCIAL_ICON_GLOW} />
                  <FaWhatsapp />
                </a>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </SectionContainer>
  );
}
