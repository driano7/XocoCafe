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
 */

export const dictionaries = {
  es: {
    nav: {
      chocolate: 'Chocolate',
      cafe: 'Café',
      menu: 'Menú',
      ubicacion: 'Ubicación',
      facturacion: 'Facturación',
      blog: 'Blog',
      mis_pedidos: 'Mis pedidos',
      mis_reservas: 'Mis reservas',
      iniciar_sesion: 'Iniciar Sesión',
      registrar_cuenta: 'Registrar cuenta',
      tu_barra_digital: 'Tu barra digital',
      bienvenido: 'Bienvenido a Xoco Café',
      mi_perfil: 'Mi Perfil',
      cerrar_sesion: 'Cerrar Sesión',
      hola: 'Hola',
    },
    hero: {
      title: 'Sabor ancestral, placer eterno',
      subtitle: 'Sabor ancestral, placer eterno.',
      cta: 'Ver Menú',
      login_btn: 'Iniciar Sesión',
      about_btn: '¿Quiénes somos? →',
    },
    auth: {
      login_title: 'Inicia sesión en tu barra digital',
      register_title: 'Registra tu cuenta y personaliza la experiencia POS',
      gratis: 'Gratis',
      gratis_title: 'Registro 100% gratuito',
      gratis_desc: 'Sin cuotas de suscripción. Acceso vitalicio a tu perfil digital y beneficios.',
      pedidos: 'Pedidos',
      pedidos_title: 'Pedidos inteligentes',
      pedidos_desc: 'Confirma órdenes, monitorea estados y recibe alertas al instante.',
      rewards: 'Rewards',
      rewards_title: 'Recompensas siempre visibles',
      rewards_desc: 'Consultas tus métricas del programa de lealtad. ¡Más compras, más ganas!',
      benefits_desc:
        'Únete gratis y mantén sincronizados pedidos, recompensas, notificaciones y campañas en un mismo flujo personalizado.',
      welcome_back: 'Bienvenido de vuelta',
      create_account: 'Crea tu cuenta en minutos',
    },
    intro: {
      minimalist: 'Minimalista.',
      intentional: 'Intencional.',
      vanguardist: 'Vanguardista.',
      sensorial: 'Sensorial.',
    },
    common: {
      loading: 'Cargando...',
      error: 'Ocurrió un error',
      success: 'Éxito',
      save: 'Guardar',
      cancel: 'Cancelar',
    },
  },
  en: {
    nav: {
      chocolate: 'Chocolate',
      cafe: 'Coffee',
      menu: 'Menu',
      ubicacion: 'Location',
      facturacion: 'Invoicing',
      blog: 'Blog',
      mis_pedidos: 'My orders',
      mis_reservas: 'My reservations',
      iniciar_sesion: 'Log In',
      registrar_cuenta: 'Register Account',
      tu_barra_digital: 'Your Digital Bar',
      bienvenido: 'Welcome to Xoco Café',
      mi_perfil: 'My Profile',
      cerrar_sesion: 'Log Out',
      hola: 'Hi',
    },
    hero: {
      title: 'Ancestral flavor, eternal pleasure',
      subtitle: 'Ancestral flavor, eternal pleasure.',
      cta: 'View Menu',
      login_btn: 'Log In',
      about_btn: 'About us →',
    },
    auth: {
      login_title: 'Log in to your digital bar',
      register_title: 'Register your account and personalize the POS experience',
      gratis: 'Free',
      gratis_title: '100% Free Registration',
      gratis_desc: 'No subscription fees. Lifetime access to your digital profile and benefits.',
      pedidos: 'Orders',
      pedidos_title: 'Smart Orders',
      pedidos_desc: 'Confirm orders, monitor status, and receive alerts instantly.',
      rewards: 'Rewards',
      rewards_title: 'Rewards always visible',
      rewards_desc: 'Check your loyalty program metrics. The more you buy, the more you win!',
      benefits_desc:
        'Join for free and keep orders, rewards, notifications, and campaigns synced in a single personalized flow.',
      welcome_back: 'Welcome back',
      create_account: 'Create your account in minutes',
    },
    intro: {
      minimalist: 'Minimalist.',
      intentional: 'Intentional.',
      vanguardist: 'Vanguardist.',
      sensorial: 'Sensorial.',
    },
    common: {
      loading: 'Loading...',
      error: 'An error occurred',
      success: 'Success',
      save: 'Save',
      cancel: 'Cancel',
    },
  },
};

export type Dictionary = typeof dictionaries.es;
export type DictionaryKey = keyof Dictionary;
