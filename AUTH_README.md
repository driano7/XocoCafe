# Sistema de Autenticación Xoco Café

Este proyecto incluye un sistema completo de autenticación con medidas GDPR implementadas.

## 🚀 Características

### Autenticación Segura

- ✅ Registro de usuarios con validación completa
- ✅ Login con JWT tokens
- ✅ Hash de contraseñas con bcrypt (12 rounds)
- ✅ Gestión de sesiones segura
- ✅ Middleware de autenticación

### Cumplimiento GDPR

- ✅ Consentimientos explícitos para términos y privacidad
- ✅ Preferencias de marketing configurables
- ✅ Exportación de datos personales
- ✅ Eliminación completa de cuentas
- ✅ Logs de retención de datos
- ✅ Políticas de privacidad y términos legales

### Programa de Lealtad

- ✅ ID único de cliente automático
- ✅ Sistema de puntos de lealtad
- ✅ Soporte para wallets EVM (opcional)
- ✅ Gestión de direcciones de envío

## 📋 Estructura de Datos

### Información Requerida para Registro

- Email (identificador único)
- Contraseña (hasheada con bcrypt)
- Consentimiento términos y condiciones (obligatorio)
- Consentimiento política de privacidad (obligatorio)

### Información Opcional

- Nombre y apellido
- Teléfono
- Ciudad y país
- Wallet address EVM
- Preferencias de marketing (email/SMS/push)

### Datos del Programa de Lealtad

- ID único de cliente (generado automáticamente)
- Puntos de lealtad
- Historial de pedidos
- Direcciones de envío (opcional)

## 🛠️ Configuración

### 1. Variables de Entorno

Crea un archivo `.env` con la configuración de Supabase y autenticación:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://<tu-proyecto>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="super-long-anon-key"
SUPABASE_SERVICE_ROLE_KEY="super-long-service-role-key"

# JWT Secret (cambiar en producción)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# NextAuth (opcional)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-change-this-in-production"
```

### 2. Base de Datos

El proyecto utiliza Supabase como backend de datos. Una vez configuradas las variables de entorno:

1. Crea las tablas ejecutando el esquema incluido en `supabase-schema.sql` dentro de la consola SQL de Supabase.
2. Verifica que la política de seguridad (RLS) esté habilitada según la configuración deseada.

### 3. Instalación de Dependencias

```bash
npm install
```

## 🔐 API Endpoints

### Autenticación

- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Login de usuario
- `POST /api/auth/me` - Verificar token y obtener datos
- `DELETE /api/auth/me` - Logout

### Gestión de Perfil

- `PUT /api/auth/profile` - Actualizar perfil
- `PUT /api/auth/consent` - Actualizar preferencias de marketing

### GDPR

- `GET /api/auth/export-data` - Exportar datos personales
- `DELETE /api/auth/delete-account` - Eliminar cuenta completamente

## 📱 Páginas

- `/login` - Página de login/registro
- `/profile` - Perfil de usuario y gestión de datos
- `/privacy` - Política de privacidad GDPR
- `/terms` - Términos y condiciones

## 🔒 Seguridad Implementada

### Contraseñas

- Hash con bcrypt (12 rounds de salt)
- Validación de fortaleza (mínimo 8 caracteres)
- No se almacenan contraseñas en texto plano

### Tokens JWT

- Tokens firmados con secret personalizado
- Expiración de 7 días
- Verificación en cada request protegido

### Base de Datos

- Relaciones con eliminación en cascada
- Índices únicos en email y clientId
- Logs de auditoría para acciones GDPR

### Validación

- Validación con Zod en frontend y backend
- Sanitización de inputs
- Consultas seguras mediante las APIs tipadas de Supabase

## 📊 Cumplimiento GDPR

### Derechos del Usuario

- ✅ **Acceso**: Ver todos los datos personales
- ✅ **Rectificación**: Corregir datos inexactos
- ✅ **Eliminación**: Eliminar cuenta y todos los datos
- ✅ **Portabilidad**: Exportar datos en formato JSON
- ✅ **Limitación**: Restringir procesamiento
- ✅ **Oposición**: Retirar consentimientos

### Consentimientos

- Términos y condiciones (obligatorio)
- Política de privacidad (obligatorio)
- Marketing por email (opcional)
- Marketing por SMS (opcional)
- Notificaciones push (opcional)

### Retención de Datos

- Datos de cuenta: Hasta eliminación
- Datos de pedidos: 7 años (fiscales)
- Logs de auditoría: Según política interna

## 🚀 Uso en Producción

### Configuración de Producción

1. Cambiar `JWT_SECRET` por una clave segura
2. Configurar base de datos PostgreSQL/MySQL
3. Configurar variables de entorno de producción
4. Implementar HTTPS obligatorio
5. Configurar backup automático de base de datos

### Monitoreo

- Logs de autenticación
- Logs de acciones GDPR
- Monitoreo de intentos de acceso
- Alertas de seguridad

## 📞 Soporte

Para preguntas sobre el sistema de autenticación o GDPR:

- Email: privacy@xococafe.com
- Documentación: [Enlaces a documentación adicional]

---

**Nota**: Este sistema está diseñado para cumplir con GDPR y otras regulaciones de privacidad. Revisa las políticas legales antes de usar en producción.
