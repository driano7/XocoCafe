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
import SectionContainer from './SectionContainer';
import NowPlaying from './Spotify/NowPlaying';
import FooterSocials from './FooterSocials';

export default function Footer() {
  return (
    <SectionContainer>
      <footer data-app-footer>
        <div className="mb-0 flex flex-col justify-start space-y-1.5 space-x-0 pt-10 pb-32 text-gray-500 dark:text-gray-400 sm:pb-16">
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
            <FooterSocials
              links={[
                { label: 'tiktok', href: siteMetadata.tiktok, icon: 'tiktok' },
                { label: 'instagram', href: siteMetadata.instagram, icon: 'instagram' },
                { label: 'twitter', href: siteMetadata.twitter, icon: 'twitter' },
                { label: 'spotify', href: siteMetadata.spotify, icon: 'spotify' },
                { label: 'whatsapp', href: siteMetadata.whats, icon: 'whatsapp' },
              ]}
            />
          </div>
        </div>
      </footer>
    </SectionContainer>
  );
}
