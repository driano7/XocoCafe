<!--
  --------------------------------------------------------------------
  Xoco Café — Software Property.
  Copyright (c) 2025 Xoco Café.
  Principal Developer: Donovan Riaño.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at:
      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.

  --------------------------------------------------------------------
  PROPIEDAD DEL SOFTWARE — XOCO CAFÉ.
  Copyright (c) 2025 Xoco Café.
  Desarrollador Principal: Donovan Riaño.

  Este archivo está licenciado bajo la Apache License 2.0.
  Consulta el archivo LICENSE en la raíz del proyecto para más detalles.
  --------------------------------------------------------------------
-->

<div align="center">
  <img src="https://raw.githubusercontent.com/driano7/XocoCafe/main/public/static/images/XocoBanner.png" width="200" alt="Logo Xoco Café"/>
</div>

<h1 align="center">Xoco Café — Plataforma de Software y Marco de Negocio</h1>

<p align="center">
  <i>Café de especialidad • Comercio Ético • Tecnología • Diseño</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/licencia-Apache%202.0-brown.svg" />
  <img src="https://img.shields.io/badge/estado-Activo-success.svg" />
  <img src="https://img.shields.io/badge/framework-React.js-blue.svg" />
  <img src="https://img.shields.io/badge/empresa-Xoco%20Café-orange.svg" />
</p>

---

# 🌱 Descripción General

Xoco Café es un proyecto de café artesanal inspirado en la riqueza del café mexicano, con enfoque en sostenibilidad, diseño consciente y colaboración directa con productores locales. Situado en la Colonia Roma, Ciudad de México, el proyecto busca convertirse en un espacio cultural donde convergen calidad, comunidad, estética y comercio justo.

---

# ⭐ Propuesta de Valor

1. **Producto Diferenciado.** Café de origen, de alta calidad y trazabilidad.
2. **Experiencia Sensorial y Estética.** Marca refinada, menú curado y ambiente visualmente atractivo.
3. **Ética y Sostenibilidad.** Comercio directo, abastecimiento responsable y operaciones transparentes.

---

# 🧱 Componentes del Proyecto

## 📊 Estudios e Investigación

- Estudio financiero completo: costos iniciales, operativos y retorno proyectado.
- Encuesta de hábitos de consumo y preferencias de menú.
- Análisis de competencia de cafeterías en la Roma.
- Visitas de campo y retroalimentación cualitativa.

## 📋 Documentación Organizacional

- Contrato de responsabilidades.
- Tabla de referencias legales.
- Documentación de registro SAS.

## 🧾 Presupuestos

- Presupuesto de apertura.
- Costos operativos mensuales.
- Proyección de ingresos por eventos.
- Análisis de sensibilidad y escenarios óptimos.

## ⚙️ Operaciones y Calidad

- Base de datos de proveedores.
- Metodologías de control de calidad.
- Plan de compras y abastecimiento.

## 🆕 Actualizaciones Recientes

- **Paridad con POS en el dashboard.** El modal de pedidos ahora reutiliza un `OrderDetailPanel` inspirado en `OrderDetailContent`, mostrando quién atendió, método/referencia de pago y notas con los mismos badges del POS.
- **Desencriptado AES-GCM en clientes externos.** Integramos `decryptField` para revelar nombres, teléfonos y colaboradores usando el correo del staff como llave derivada.
- **Librería compartida para campos seguros.** `lib/secure-fields.ts` expone los helpers de cifrado/descifrado para cualquier módulo del front que necesite sincronizarse con el POS.
- **Direcciones enriquecidas en pedidos y tickets.** Los endpoints `app/api/orders/history` y `app/api/orders/public` leen la tabla cifrada `addresses` (ver `schema.sql`) para enviar calle, referencias, contacto y bandera de WhatsApp junto con cada pedido, lo mismo que renderiza el dashboard y el ticket virtual.
- **Payload QR extendido.** `lib/orderQrPayload.ts`, `components/Orders/VirtualTicket.tsx` y `app/api/orders/web/route.ts` adjuntan en el QR el alias de la dirección, líneas del domicilio, teléfono (incluyendo si es WhatsApp) y la propina de entrega cuando el cliente la proporciona.
- **Pagos y envíos alineados.** `OrderDetailPanel` y `VirtualTicket` muestran ahora el nombre del cliente asignado a la entrega junto con método, referencia, monto recibido y cambio en efectivo, de modo que barra, cocina y reparto consultan la misma evidencia.
- **Alertas low-stock/out-of-stock.** `/api/products` expone los flags `lowStock` y `soldOut`, y la página `/order` usa esos campos para prevenir la selección de productos agotados y lanzar snackbars amarillos/naranja cuando la disponibilidad es limitada.

---

# 💻 Sitio Web y Tecnologías

**Sitio Oficial:** https://xococafe.netlify.app

| Tecnología        | Función                                                                 |
| ----------------- | ----------------------------------------------------------------------- |
| React.js          | Framework principal del front-end.                                      |
| Netlify           | Plataforma de hosting y despliegue.                                     |
| Supabase          | Autenticación, sincronización en la nube y funciones programadas.       |
| SQLite            | Base de datos local de respaldo para operación resiliente sin conexión. |
| HTML5 / CSS3      | Estructura y estilos base.                                              |
| JavaScript ES6+   | Interactividad del sitio.                                               |
| Google Fonts      | Tipografía personalizada.                                               |
| Animaciones       | Transiciones visuales suaves.                                           |
| Diseño Responsive | Experiencia optimizada en móviles.                                      |

### 🔁 Automatización operativa

Usamos **Pipedream** como puente serverless para automatizar correos (reset de contraseña, confirmaciones propias) y orquestar integraciones entre la app Xoco Café y Supabase.

---

# ✒️ Créditos

## Equipo Fundador

- Sergio Cortés.
- Alejandro Galván.
- **Donovan Riaño.**
- Juan Aragón.

## Desarrollo del Software

- **Desarrollador Principal:** _Donovan Riaño._
- UI inicial basada y adaptada del repositorio: https://github.com/dlarroder/dalelarroder.
- Funciones esenciales (login, reservas, flujos internos, lógica de preparación) desarrolladas por **Donovan Riaño**, con apoyo de herramientas de IA (Codex) y revisión manual completa.

---

# 📜 Licencia de Software — Apache License 2.0

El software de este repositorio es **propiedad intelectual de Xoco Café**.  
Todo el código fuente, estructura y lógica del sistema fue desarrollado por:  
**Donovan Riaño (Desarrollador Principal).**

Bajo la licencia Apache 2.0:

- Debe mantenerse la atribución a **Xoco Café**.
- Debe preservarse el crédito a **Donovan Riaño** como desarrollador principal.
- Cualquier redistribución debe incluir la licencia Apache 2.0.
- Se otorgan protecciones y derechos de patente conforme a la licencia.
- Cualquier modificación realizada debe declararse explícitamente.

Consulta el archivo `LICENSE` para conocer todos los detalles legales.

---

<div align="center">
  <img src="https://raw.githubusercontent.com/driano7/XocoCafe/main/public/static/images/XocoBanner.png" width="200" alt="Xoco Café Logo"/>
</div>

<h1 align="center">Xoco Café — Software Platform & Business Framework</h1>

<p align="center">
  <i>Specialty Coffee • Ethical Sourcing • Technology • Design</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-Apache%202.0-brown.svg" />
  <img src="https://img.shields.io/badge/status-Active-success.svg" />
  <img src="https://img.shields.io/badge/framework-React.js-blue.svg" />
  <img src="https://img.shields.io/badge/company-Xoco%20Café-orange.svg" />
</p>

---

# 🌱 Overview

Xoco Café is an artisanal Mexican coffee project centered on sustainability, conscious design, and direct collaboration with coffee producers. Based in Colonia Roma, Mexico City, the project aims to become a cultural hub where quality, community, aesthetics, and fair trade converge.

---

# ⭐ Value Proposition

1. **Differentiated Product.** High-quality, traceable origin coffee.
2. **Sensory & Aesthetic Experience.** Curated menu, refined brand, and visually rich environment.
3. **Ethics & Sustainability.** Direct trade, responsible sourcing, and transparent operations.

---

# 🧱 Project Components

## 📊 Research & Analysis

- Full financial study: startup costs, operations, and projected ROI.
- Consumer and menu survey conducted in the target district.
- Competitive analysis of cafés in the Roma area.
- Benchmark visits and qualitative field feedback.

## 📋 Organizational Documentation

- Responsibilities agreement.
- Legal references table.
- SAS business registration documents.

## 🧾 Budgeting

- Opening budget.
- Monthly operational costs.
- Projected revenue from events.
- Sensitivity analysis and optimal budget calculations.

## ⚙️ Operations & Quality

- Supplier database.
- Quality control methodologies.
- Procurement and supply chain plan.

## 🆕 Recent Updates

- **POS-level order view inside the dashboard.** The orders modal now renders an `OrderDetailPanel` derived from the POS `OrderDetailContent`, so attendants, payment metadata, and badges stay identical to the in-store experience.
- **AES-GCM decryption for external clients.** We wired `decryptField` into the dashboard so customer and staff snapshots decrypt on demand using the signed-in collaborator email as the PBKDF2 seed.
- **Shared secure-fields helper.** `lib/secure-fields.ts` centralizes AES-GCM helpers so any frontend workflow stays in sync with the POS encryption scheme.
- **Enriched shipping data in orders and tickets.** Both `app/api/orders/history` and `app/api/orders/public` hydrate responses with decrypted address payloads (see the `addresses` definition in `schema.sql`), so the dashboard and ticket UI receive streets, references, contact phone, and WhatsApp flags.
- **Extended QR payload.** `lib/orderQrPayload.ts`, `components/Orders/VirtualTicket.tsx`, and `app/api/orders/web/route.ts` now embed the address label, address lines, contact info (including WhatsApp), and delivery-tip snapshot into the ticket QR body when the customer supplied those fields.
- **Aligned payment & delivery snapshots.** `OrderDetailPanel` and `VirtualTicket` now show the destination customer name plus payment method, reference, cash tendered, and change so front-of-house and couriers share the same proof.
- **Low-stock/out-of-stock warnings.** `/api/products` returns `lowStock`/`soldOut` flags that the `/order` page consumes to block depleted items and trigger yellow/orange snackbars when stock runs low.

---

# 💻 Website & Tech Stack

**Official Website:** https://xococafe.netlify.app

| Technology        | Purpose                                                                             |
| ----------------- | ----------------------------------------------------------------------------------- |
| React.js          | Main front-end framework.                                                           |
| Netlify           | Deployment and hosting platform.                                                    |
| Supabase          | Auth, cloud persistence, and scheduled functions for the operational stack.         |
| SQLite            | Offline-ready local database that syncs back to Supabase when connectivity returns. |
| HTML5 / CSS3      | Structure and base styling.                                                         |
| JavaScript ES6+   | Website interactivity.                                                              |
| Google Fonts      | Typography customization.                                                           |
| Animations        | Smooth visual transitions.                                                          |
| Responsive Design | Optimized mobile experience.                                                        |

### 🔁 Automation

We leverage **Pipedream** as a lightweight serverless bridge to automate transactional emails (password resets, branded confirmations) and connect our Xoco Café app with Supabase workflows.

---

# 🧹 Data Retention Automation

- Endpoint `/api/cron/cleanup-inactive-users` elimina cuentas y datos relacionados cuando un usuario lleva más de 12 meses sin autenticarse.
- Protege el acceso usando el header `x-cron-secret` (configura `CRON_SECRET` en tu entorno). También acepta `Authorization: Bearer <secret>`.
- Parámetros opcionales: `days` para ajustar el umbral de inactividad y `limit` para controlar el tamaño del lote por ejecución.
- Ejemplo manual:

```bash
curl -X POST "https://tu-dominio.vercel.app/api/cron/cleanup-inactive-users?limit=50" \
  -H "x-cron-secret: $CRON_SECRET"
```

Programa este endpoint con Vercel Cron (o tu orquestador favorito) para ejecutarlo a diario y mantener limpia la base de datos.

---

# ✒️ Credits

## Founding Team

- Sergio Cortés.
- Alejandro Galván.
- **Donovan Riaño.**
- Juan Aragón.

## Software Development

- **Principal Developer:** _Donovan Riaño._
- UI base originally forked and adapted from: https://github.com/dlarroder/dalelarroder.
- Core system functionality (login, reservations, user flows, internal workflow, and preparation logic) developed by **Donovan Riaño**, with assistance from AI tools (Codex) and full manual review.

---

# 📜 Software License — Apache License 2.0

The software contained in this repository is the **intellectual property of Xoco Café**.  
All source code, design structure, and system logic were developed and authored by:  
**Donovan Riaño (Principal Developer).**

Under the Apache License 2.0:

- Attribution to **Xoco Café** is required.
- Credit to **Donovan Riaño** as the principal developer must be preserved.
- Any redistribution must include the Apache 2.0 license.
- Patent rights and protections are explicitly granted under this license.
- Any modifications made to the code must be clearly stated.

Refer to the `LICENSE` file for full legal details.
