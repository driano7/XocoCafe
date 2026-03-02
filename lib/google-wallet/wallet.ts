import { GoogleAuth } from 'google-auth-library';
import * as jwt from 'jsonwebtoken';

const ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID!;
const CLASS_ID = `${ISSUER_ID}.xococafe_loyalty`;

const rawPrivateKey = process.env.GOOGLE_WALLET_PRIVATE_KEY ?? '';
const credentials = {
  client_email: process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL!,
  private_key: rawPrivateKey.replace(/\\n/g, '\n'),
};

const auth = new GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
});

const BASE_URL = 'https://walletobjects.googleapis.com/walletobjects/v1';

// ─── Crear Loyalty Class (solo una vez) ───────────────────────────────────────
export async function createLoyaltyClass() {
  const client = await auth.getClient();
  const token = await client.getAccessToken();

  const loyaltyClass = {
    id: CLASS_ID,
    issuerName: 'Xoco Café',
    programName: 'Programa de Lealtad Xoco',
    programLogo: {
      sourceUri: {
        uri: 'https://xococafe.site/static/favicons/CafeIcon.png',
      },
      contentDescription: {
        defaultValue: { language: 'es-MX', value: 'Logo Xoco Café' },
      },
    },
    heroImage: {
      sourceUri: {
        uri: 'https://xococafe.site/static/images/Xoco.jpeg',
      },
      contentDescription: {
        defaultValue: { language: 'es-MX', value: 'Xoco Café' },
      },
    },
    hexBackgroundColor: '#7c3f00',
    rewardsTier: 'Miembro',
    rewardsTierLabel: 'Nivel',
    accountNameLabel: 'Cliente',
    accountIdLabel: 'ID',
    reviewStatus: 'UNDER_REVIEW',
    localizedIssuerName: {
      defaultValue: { language: 'es-MX', value: 'Xoco Café' },
    },
    localizedProgramName: {
      defaultValue: { language: 'es-MX', value: 'Programa de Lealtad' },
    },
    discoverableProgram: {
      merchantSigninInfo: {
        signinWebsite: { uri: 'https://xococafe.site/login' },
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
      label: 'Cafés',
      balance: { int: coffees },
    },
    secondaryLoyaltyPoints: {
      label: 'Meta',
      balance: { int: goal },
    },
    textModulesData: [
      {
        id: 'coffees',
        header: '☕ CAFÉS ACUMULADOS',
        body: `${coffees} de ${goal} para tu próxima recompensa`,
      },
      {
        id: 'reward',
        header: '🎁 PRÓXIMA RECOMPENSA',
        body:
          coffees >= goal
            ? '¡Tienes una bebida gratis disponible!'
            : `Te faltan ${goal - coffees} café${goal - coffees !== 1 ? 's' : ''}`,
      },
    ],
    linksModuleData: {
      uris: [
        {
          uri: 'https://xococafe.site/order',
          description: 'Hacer un pedido',
          id: 'order',
        },
        {
          uri: 'https://xococafe.site/profile',
          description: 'Ver mi perfil',
          id: 'profile',
        },
      ],
    },
    barcode: {
      type: 'QR_CODE',
      value: qrValue,
      alternateText: `ID: ${userId.substring(0, 8).toUpperCase()}`,
    },
    heroImage: {
      sourceUri: {
        uri: 'https://xococafe.site/static/images/Xoco.jpeg',
      },
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
          loyaltyPoints: { label: 'Cafés', balance: { int: coffees } },
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

  const claims = {
    iss: credentials.client_email,
    aud: 'google',
    origins: ['https://xococafe.site'],
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
