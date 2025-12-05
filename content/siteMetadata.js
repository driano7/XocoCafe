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

const siteMetadata = {
  title: 'Xoco Café',
  author: 'Donovan Riaño',
  headerTitle: 'Chocolate y café hecho por los dioses.',
  description: 'Sabor ancestral, placer eterno.',
  language: 'en-us',
  theme: 'system', // system, dark or light
  siteLogo: '/static/images/XocoBanner.jpg',
  image: '/static/images/Xoco.jpeg',
  socialBanner: '/static/images/twitter-card.png',
  siteUrl: 'https://xococafe.netlify.app',
  siteRepo: 'https://github.com/driano7/XocoCafe',
  email: 'dnvn77@gmail.com',
  github: 'https://github.com/driano7',
  twitter: 'https://twitter.com/mrcripto_',
  facebook: 'https://facebook.com',
  linkedin: 'https://www.linkedin.com/in/driano7',
  spotify: 'https://open.spotify.com/user/12138049443?si=UYIjkFRkQtWqiwFmQsnFKg&pi=u-GbLyzfogTQqa',
  tiktok: 'https://www.tiktok.com/@mrcripto_',
  instagram: 'https://www.instagram.com/anonimocafe_',
  whats: 'https://wa.me/525512291607',
  locale: 'en-US',
  comment: {
    provider: 'giscus',
    giscusConfig: {
      repo: process.env.NEXT_PUBLIC_GISCUS_REPO || '',
      repositoryId: process.env.NEXT_PUBLIC_GISCUS_REPOSITORY_ID || '',
      category: process.env.NEXT_PUBLIC_GISCUS_CATEGORY || '',
      categoryId: process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID || '',
      mapping: 'pathname',
      reactions: '1',
      metadata: '0',
      theme: 'light',
      darkTheme: 'transparent_dark',
      themeURL: '',
    },
  },
};

module.exports = siteMetadata;
