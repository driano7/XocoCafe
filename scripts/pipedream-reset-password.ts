/*
 * --------------------------------------------------------------------
 *  Pipedream Component — Xoco Café Reset Password Bridge
 *  Trigger: HTTP (payload must include email, optional marketing_consent)
 * --------------------------------------------------------------------
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type TriggerPayload = {
  email?: string;
  marketing_consent?: boolean;
  [key: string]: unknown;
};

type RunArgs = {
  steps: { trigger?: { event?: { body?: TriggerPayload } & TriggerPayload } };
  $: {
    respond: (args: { status: number; body: unknown }) => Promise<void>;
    export: (key: string, value: unknown) => void;
  };
};

export default {
  key: 'xococafe_supabase_reset_password_bridge',
  name: 'Xoco Café · Reset Password Bridge',
  description:
    'Enlaza el trigger HTTP de Pipedream con Supabase para disparar resetPasswordForEmail y actualizar consentimiento de marketing.',
  version: '0.1.0',
  type: 'action',
  props: {
    supabaseUrl: {
      type: 'string',
      label: 'Supabase URL',
      description: 'URL del proyecto Supabase (https://*.supabase.co)',
    },
    supabaseServiceRoleKey: {
      type: 'string',
      label: 'Supabase Service Role Key',
      secret: true,
      description: 'Clave con permisos de servicio para usar auth y actualizar perfiles.',
    },
    redirectTo: {
      type: 'string',
      label: 'URL de redirección del flujo de reset',
      optional: true,
      description:
        'Si se define, Supabase enviará el enlace de restablecimiento apuntando a esta ruta.',
    },
    profilesTable: {
      type: 'string',
      label: 'Tabla de perfiles',
      optional: true,
      description: 'Nombre de la tabla que almacena el consentimiento. Por defecto "perfiles".',
      default: 'perfiles',
    },
    consentColumn: {
      type: 'string',
      label: 'Columna de consentimiento',
      optional: true,
      description:
        'Columna booleana que indica si el usuario aceptó marketing/newsletter. Por defecto "marketing_consent".',
      default: 'marketing_consent',
    },
  },
  async run(this: Record<string, unknown>, { steps, $ }: RunArgs) {
    const payload =
      steps.trigger?.event?.body ?? (steps.trigger?.event as TriggerPayload | undefined) ?? {};
    const email = payload.email?.trim();
    const marketingConsent = payload.marketing_consent === true;

    if (!email) {
      throw new Error('Missing "email" in request payload.');
    }

    const supabase = createClient(
      this.supabaseUrl as string,
      this.supabaseServiceRoleKey as string
    ) as SupabaseClient;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      this.redirectTo ? { redirectTo: this.redirectTo as string } : undefined
    );

    if (resetError) {
      throw new Error(`Supabase resetPasswordForEmail error: ${resetError.message}`);
    }

    if (marketingConsent) {
      const consentUpdate = {
        [this.consentColumn as string]: true,
        marketing_consent_updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from((this.profilesTable as string) ?? 'perfiles')
        .update(consentUpdate)
        .eq('email', email);

      if (updateError) {
        throw new Error(`Failed to update marketing consent: ${updateError.message}`);
      }
    }

    await $.respond({
      status: 200,
      body: {
        ok: true,
        email,
        marketingConsentApplied: marketingConsent,
      },
    });

    $.export('email', email);
    $.export('marketingConsentApplied', marketingConsent);
  },
};
