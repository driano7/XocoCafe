# Configuración de Variables de Entorno

## Variables Requeridas para Google OAuth

Para que el login con Google funcione correctamente, necesitas configurar las siguientes variables de entorno:

### 1. Variables de Google OAuth

```bash
GOOGLE_CLIENT_ID=tu-google-client-id
GOOGLE_CLIENT_SECRET=tu-google-client-secret
```

### 2. Variables de NextAuth

```bash
NEXTAUTH_URL=https://tu-dominio.vercel.app
NEXTAUTH_SECRET=tu-secret-key-muy-seguro
```

### 3. Variables de Supabase

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

### 4. Variables de JWT

```bash
JWT_SECRET=tu-jwt-secret-key
```

## Configuración en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la API de Google+ (ahora Google Identity)
4. Ve a "Credenciales" y crea un "ID de cliente OAuth 2.0"
5. Configura las URLs autorizadas:
   - **Orígenes de JavaScript autorizados**: `https://tu-dominio.vercel.app`
   - **URI de redirección autorizados**: `https://tu-dominio.vercel.app/api/auth/callback/google`

## Configuración en Vercel

1. Ve a tu proyecto en Vercel
2. Ve a "Settings" > "Environment Variables"
3. Agrega todas las variables de entorno necesarias
4. Asegúrate de que estén configuradas para "Production", "Preview" y "Development"

## Solución de Problemas

### Error 400 en Google OAuth

Este error generalmente se debe a:

1. **Variables de entorno incorrectas**: Verifica que `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` estén correctamente configuradas
2. **URLs de redirección incorrectas**: Asegúrate de que la URL de callback esté configurada correctamente en Google Cloud Console
3. **Dominio no autorizado**: Verifica que tu dominio esté en la lista de orígenes autorizados
4. **Configuración de NextAuth**: Asegúrate de que `NEXTAUTH_URL` esté configurada correctamente

### Verificación de Configuración

Puedes verificar tu configuración ejecutando:

```bash
# Verificar variables de entorno
echo $GOOGLE_CLIENT_ID
echo $GOOGLE_CLIENT_SECRET
echo $NEXTAUTH_URL
echo $NEXTAUTH_SECRET
```

### Logs de Debug

Para habilitar logs de debug en desarrollo, asegúrate de que `NODE_ENV=development` esté configurado.
