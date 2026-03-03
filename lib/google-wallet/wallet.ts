import { GoogleAuth } from 'google-auth-library';
import * as jwt from 'jsonwebtoken';

const ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID!;
const CLASS_ID = `${ISSUER_ID}.xococafe_loyalty`;

// Dominio canonical del sitio (usado en origins del JWT y URLs)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://xococafe.netlify.app';

/**
 * Parsea GOOGLE_WALLET_PRIVATE_KEY sin importar el formato en que
 * fue pegada en la variable de entorno de Netlify:
 * - Con \\n literales (doble backslash n)  -> los reemplaza por \n real
 * - Con \n literales (un backslash n)       -> los reemplaza por \n real
 * - Con saltos de linea reales              -> la usa tal cual
 * - Clave en una sola linea sin headers     -> reconstruye con headers PEM
 */
function parsePrivateKey(raw: string): string {
  if (!raw) return '';

  // Caso 1: Netlify escapo los backslashes -> "\\n"
  if (raw.includes('\\\\n')) {
    return raw.replace(/\\\\n/g, '\\n');
  }
  // Caso 2: La key viene con \n literal (un solo backslash + n)
  if (raw.includes('\\n')) {
    return raw; // ya tiene saltos reales
  }
  // Caso 3: Ya tiene saltos de linea reales y headers PEM
  if (raw.startsWith('-----BEGIN')) {
    return raw;
  }
  // Caso 4: Clave en una sola linea sin headers - reconstruir PEM
  // Esto pasa cuando se copia solo el body de la clave sin -----BEGIN-----
  const cleaned = raw.replace(/\s+/g, '');
  const body = cleaned
    .replace('-----BEGINRSAPRIVATEKEY-----', '')
    .replace('-----ENDRSAPRIVATEKEY-----', '')
    .replace('-----BEGINPRIVATEKEY-----', '')
    .replace('-----ENDPRIVATEKEY-----', '');
  const lines = body.match(/.{1,64}/g)?.join('\n') ?? body;
  return `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----\n`;
}

const rawPrivateKey = process.env.GOOGLE_WALLET_PRIVATE_KEY ?? '';
const parsedPrivateKey = parsePrivateKey(rawPrivateKey);

const credentials = {
  client_email: process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL!,
  private_key: parsedPrivateKey,
};

const auth = new GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
});

const BASE_URL = 'https://walletobjects.googleapis.com/walletobjects/v1';

// Imagen publica confiable para el logo del programa
const PROGRAM_LOGO_URL =
  'https://storage.googleapis.com/wallet-lab-tools-codelab-artifacts-public/pass_google_logo.jpg';

// ─── Crear Loyalty Class (solo una vez) ──────────────────────────────────────
export async function createLoyaltyClass() {
  const client = await auth.getClient();
  const token = await client.getAccessToken();

  const loyaltyClass = {
    id: CLASS_ID,
    issuerName: 'Xoco Caf\u00e9',
    programName: 'Programa de Lealtad Xoco',
    programLogo: {
      sourceUri: {
        uri: PROGRAM_LOGO_URL,
      },
      contentDescription: {
        defaultValue: { language: 'es-MX', value: 'Logo Xoco Caf\u00e9' },
      },
    },
    hexBackgroundColor: '#7c3f00',
    rewardsTier: 'Miembro',
    rewardsTierLabel: 'Nivel',
    accountNameLabel: 'Cliente',
    accountIdLabel: 'ID',
    reviewStatus: 'UNDER_REVIEW',
    localizedIssuerName: {
      defaultValue: { language: 'es-MX', value: 'Xoco Caf\u00e9' },
    },
    localizedProgramName: {
      defaultValue: { language: 'es-MX', value: 'Programa de Lealtad' },
    },
    discoverableProgram: {
      merchantSigninInfo: {
        signinWebsite: { uri: `${SITE_URL}/login` },
      },
    },
  };

  const res = await fetch(`${BASE_URL}/loyaltyClass`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(loyaltyClass),
  });

  const data = await res.json();
  if (!res.ok && data.error?.code !== 409) {
    throw new Error(`Error creating class: ${JSON.stringify(data.error)}`);
  }
  return data;
}

// ─── Crear/Actualizar Loyalty Object por usuario ──────────────────────────────
export async function upsertLoyaltyObject({
  userId,
  name,
  coffees,
  goal,
  qrValue,
}: {
  userId: string;
  name: string;
  coffees: number;
  goal: number;
  qrValue: string;
}) {
  const client = await auth.getClient();
  const token = await client.getAccessToken();

  const objectId = `${ISSUER_ID}.user_${userId}`;

  const loyaltyObject = {
    id: objectId,
    classId: CLASS_ID,
    state: 'ACTIVE',
    accountId: userId.substring(0, 12).toUpperCase(),
    accountName: name,
    loyaltyPoints: {
      label: 'Caf\u00e9s',
      balance: { int: coffees },
    },
    secondaryLoyaltyPoints: {
      label: 'Meta',
      balance: { int: goal },
    },
    textModulesData: [
      {
        id: 'coffees',
        header: '\u2615 CAF\u00c9S ACUMULADOS',
        body: `${coffees} de ${goal} para tu pr\u00f3xima recompensa`,
      },
      {
        id: 'reward',
        header: '\uD83C\uDF81 PR\u00d3XIMA RECOMPENSA',
        body:
          coffees >= goal
            ? '\u00a1Tienes una bebida gratis disponible!'
            : `Te faltan ${goal - coffees} caf\u00e9${goal - coffees !== 1 ? 's' : ''}`,
      },
    ],
    linksModuleData: {
      uris: [
        { uri: `${SITE_URL}/order`, description: 'Hacer un pedido', id: 'order' },
        { uri: `${SITE_URL}/profile`, description: 'Ver mi perfil', id: 'profile' },
      ],
    },
    barcode: {
      type: 'QR_CODE',
      value: qrValue,
      alternateText: `ID: ${userId.substring(0, 8).toUpperCase()}`,
    },
  };

  const createRes = await fetch(`${BASE_URL}/loyaltyObject`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(loyaltyObject),
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    if (err.error?.code === 409) {
      const patchRes = await fetch(`${BASE_URL}/loyaltyObject/${objectId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          loyaltyPoints: { label: 'Caf\u00e9s', balance: { int: coffees } },
          textModulesData: loyaltyObject.textModulesData,
        }),
      });
      return patchRes.json();
    }
    throw new Error(`Error upserting object: ${JSON.stringify(err)}`);
  }
  return createRes.json();
}

// ─── Generar JWT para "Add to Google Wallet" ──────────────────────────────────
export function generateWalletJWT(userId: string): string {
  const objectId = `${ISSUER_ID}.user_${userId}`;

  // origins debe incluir todos los dominios desde los que se puede llamar
  const origins = ['https://xococafe.site', 'https://xococafe.netlify.app', SITE_URL].filter(
    (v, i, arr) => arr.indexOf(v) === i
  ); // dedup

  const claims = {
    iss: credentials.client_email,
    aud: 'google',
    origins,
    typ: 'savetowallet',
    payload: {
      loyaltyObjects: [{ id: objectId }],
    },
  };

  return jwt.sign(claims, credentials.private_key, { algorithm: 'RS256' });
}

export function getAddToWalletUrl(userId: string): string {
  const token = generateWalletJWT(userId);
  return `https://pay.google.com/gp/v/save/${token}`;
}
