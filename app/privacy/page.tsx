export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            Política de Privacidad
          </h1>

          <div className="prose prose-lg max-w-none dark:prose-invert">
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              <strong>Última actualización:</strong> {new Date().toLocaleDateString('es-ES')}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                1. Información que Recopilamos
              </h2>
              <div className="text-gray-600 dark:text-gray-300 space-y-4">
                <p>
                  Recopilamos la siguiente información personal cuando te registras en Xoco Café:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>Información de cuenta:</strong> Email, contraseña (hasheada), ID único
                    del cliente
                  </li>
                  <li>
                    <strong>Información personal opcional:</strong> Nombre, apellido, teléfono,
                    ciudad, país
                  </li>
                  <li>
                    <strong>Información de blockchain:</strong> Dirección de wallet EVM (opcional)
                  </li>
                  <li>
                    <strong>Consentimientos:</strong> Términos y condiciones, política de
                    privacidad, preferencias de marketing
                  </li>
                  <li>
                    <strong>Datos de uso:</strong> Información sobre cómo interactúas con nuestro
                    sitio web
                  </li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                2. Cómo Utilizamos tu Información
              </h2>
              <div className="text-gray-600 dark:text-gray-300 space-y-4">
                <p>Utilizamos tu información personal para:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Proporcionar y mantener nuestros servicios</li>
                  <li>Procesar pedidos y gestionar tu cuenta</li>
                  <li>Ejecutar el programa de lealtad</li>
                  <li>Comunicarnos contigo sobre tu cuenta y servicios</li>
                  <li>Enviar comunicaciones de marketing (solo con tu consentimiento)</li>
                  <li>Cumplir con obligaciones legales</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                3. Base Legal para el Procesamiento (GDPR)
              </h2>
              <div className="text-gray-600 dark:text-gray-300 space-y-4">
                <p>Procesamos tu información personal basándonos en:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>Consentimiento:</strong> Para comunicaciones de marketing y cookies no
                    esenciales
                  </li>
                  <li>
                    <strong>Ejecución de contrato:</strong> Para proporcionar nuestros servicios
                  </li>
                  <li>
                    <strong>Interés legítimo:</strong> Para mejorar nuestros servicios y prevenir
                    fraudes
                  </li>
                  <li>
                    <strong>Cumplimiento legal:</strong> Para cumplir con obligaciones legales
                  </li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                4. Compartir Información
              </h2>
              <div className="text-gray-600 dark:text-gray-300 space-y-4">
                <p>No vendemos tu información personal. Podemos compartirla solo en estos casos:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Con proveedores de servicios que nos ayudan a operar nuestro negocio</li>
                  <li>Cuando sea requerido por ley o para proteger nuestros derechos</li>
                  <li>En caso de fusión, adquisición o venta de activos</li>
                  <li>Con tu consentimiento explícito</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                5. Tus Derechos (GDPR)
              </h2>
              <div className="text-gray-600 dark:text-gray-300 space-y-4">
                <p>Tienes los siguientes derechos sobre tus datos personales:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>Acceso:</strong> Solicitar una copia de tus datos personales
                  </li>
                  <li>
                    <strong>Rectificación:</strong> Corregir datos inexactos o incompletos
                  </li>
                  <li>
                    <strong>Eliminación:</strong> Solicitar la eliminación de tus datos
                  </li>
                  <li>
                    <strong>Limitación:</strong> Restringir el procesamiento de tus datos
                  </li>
                  <li>
                    <strong>Portabilidad:</strong> Recibir tus datos en formato estructurado
                  </li>
                  <li>
                    <strong>Oposición:</strong> Oponerte al procesamiento de tus datos
                  </li>
                  <li>
                    <strong>Retirar consentimiento:</strong> En cualquier momento
                  </li>
                </ul>
                <p>
                  Para ejercer estos derechos, contacta con nosotros en{' '}
                  <a
                    href="mailto:privacy@xococafe.com"
                    className="text-blue-600 hover:text-blue-500 underline"
                  >
                    privacy@xococafe.com
                  </a>
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                6. Retención de Datos
              </h2>
              <div className="text-gray-600 dark:text-gray-300 space-y-4">
                <p>
                  Conservamos tu información personal solo durante el tiempo necesario para cumplir
                  con los propósitos descritos en esta política, a menos que la ley requiera un
                  período de retención más largo.
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>Datos de cuenta:</strong> Hasta que elimines tu cuenta
                  </li>
                  <li>
                    <strong>Datos de pedidos:</strong> 7 años (requisitos fiscales)
                  </li>
                  <li>
                    <strong>Datos de marketing:</strong> Hasta que retires tu consentimiento
                  </li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                7. Seguridad
              </h2>
              <div className="text-gray-600 dark:text-gray-300 space-y-4">
                <p>
                  Implementamos medidas de seguridad técnicas y organizativas apropiadas para
                  proteger tu información personal contra acceso no autorizado, alteración,
                  divulgación o destrucción.
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Encriptación de contraseñas con bcrypt</li>
                  <li>Comunicaciones seguras (HTTPS)</li>
                  <li>Acceso restringido a datos personales</li>
                  <li>Monitoreo regular de seguridad</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                8. Cookies y Tecnologías Similares
              </h2>
              <div className="text-gray-600 dark:text-gray-300 space-y-4">
                <p>
                  Utilizamos cookies y tecnologías similares para mejorar tu experiencia en nuestro
                  sitio web.
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>Cookies esenciales:</strong> Necesarias para el funcionamiento del sitio
                  </li>
                  <li>
                    <strong>Cookies de análisis:</strong> Para entender cómo usas nuestro sitio
                  </li>
                  <li>
                    <strong>Cookies de marketing:</strong> Solo con tu consentimiento
                  </li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                9. Cambios a esta Política
              </h2>
              <div className="text-gray-600 dark:text-gray-300 space-y-4">
                <p>
                  Podemos actualizar esta política de privacidad ocasionalmente. Te notificaremos
                  sobre cambios significativos por email o mediante un aviso en nuestro sitio web.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                10. Contacto
              </h2>
              <div className="text-gray-600 dark:text-gray-300 space-y-4">
                <p>
                  Si tienes preguntas sobre esta política de privacidad o sobre cómo manejamos tus
                  datos personales, contáctanos:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    Email:{' '}
                    <a
                      href="mailto:privacy@xococafe.com"
                      className="text-blue-600 hover:text-blue-500 underline"
                    >
                      privacy@xococafe.com
                    </a>
                  </li>
                  <li>Dirección: [Tu dirección física]</li>
                  <li>Teléfono: [Tu número de teléfono]</li>
                </ul>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
