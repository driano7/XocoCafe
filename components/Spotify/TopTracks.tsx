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

import { getTopTracks } from '@/lib/spotify';
import Track from './Track';
import { Song, TrackInfo } from './types';

async function fetchTopTracks(): Promise<Song[] | null> {
  try {
    const response = await getTopTracks();
    const { items } = await response.json();

    const tracks = items.slice(0, 5).map((track: TrackInfo) => ({
      artist: track.artists.map((_artist) => _artist.name).join(', '),
      songUrl: track.external_urls.spotify,
      title: track.name,
    }));

    return tracks;
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
    }
  }

  return null;
}

export default async function TopTracks() {
  const topTracks = await fetchTopTracks();

  if (!topTracks) {
    return null;
  }

  return (
    <div className="py-7">
      <p className="text-2xl font-extrabold leading-9 tracking-tight text-gray-900 dark:text-gray-100">
        Spotify Top Songs
      </p>
      {topTracks.map((track, index) => (
        <Track ranking={index + 1} key={track.songUrl} track={track} />
      ))}
    </div>
  );
}
