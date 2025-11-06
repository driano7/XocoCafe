export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            Términos y Condiciones
          </h1>

          <div className="prose prose-lg max-w-none dark:prose-invert">
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              <strong>Última actualización:</strong> {new Date().toLocaleDateString('es-ES')}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                1. Aceptación de los Términos
              </h2>
              <div className="text-gray-600 dark:text-gray-300 space-y-4">
                <p>
                  Al acceder y utilizar los servicios de Xoco Café, aceptas estar sujeto a estos
                  términos y condiciones. Si no estás de acuerdo con alguna parte de estos términos,
                  no debes utilizar nuestros servicios.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                2. Descripción del Servicio
              </h2>
              <div className="text-gray-600 dark:text-gray-300 space-y-4">
                <p>Xoco Café es una plataforma que ofrece:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Información sobre productos de café y chocolate</li>
                  <li>Programa de lealtad para clientes</li>
                  <li>Servicios de e-commerce (cuando estén disponibles)</li>
                  <li>Comunidad de amantes del café</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                3. Registro de Usuario
              </h2>
              <div className="text-gray-600 dark:text-gray-300 space-y-4">
                <p>
                  Para utilizar ciertos servicios, debes crear una cuenta proporcionando información
                  precisa y actualizada. Eres responsable de:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Mantener la confidencialidad de tu contraseña</li>
                  <li>Todas las actividades que ocurran bajo tu cuenta</li>
                  <li>Notificarnos inmediatamente sobre cualquier uso no autorizado</li>
                  <li>Proporcionar información veraz y actualizada</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                4. Programa de Lealtad
              </h2>
              <div className="text-gray-600 dark:text-gray-300 space-y-4">
                <p>Nuestro programa de lealtad permite a los usuarios acumular puntos por:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Compras realizadas</li>
                  <li>Referencias de nuevos usuarios</li>
                  <li>Participación en promociones especiales</li>
                  <li>Actividades de la comunidad</li>
                </ul>
                <p>
                  Los puntos pueden tener fecha de expiración y están sujetos a términos específicos
                  que se comunicarán por separado.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                5. Uso Aceptable
              </h2>
              <div className="text-gray-600 dark:text-gray-300 space-y-4">
                <p>Al utilizar nuestros servicios, te comprometes a:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>No utilizar el servicio para actividades ilegales</li>
                  <li>No interferir con el funcionamiento del servicio</li>
                  <li>No intentar acceder a cuentas de otros usuarios</li>
                  <li>No transmitir contenido malicioso o spam</li>
                  <li>Respetar los derechos de propiedad intelectual</li>
                  <li>No crear múltiples cuentas para evadir restricciones</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                6. Propiedad Intelectual
              </h2>
              <div className="text-gray-600 dark:text-gray-300 space-y-4">
                <p>
                  Todo el contenido de Xoco Café, incluyendo textos, gráficos, logotipos, imágenes,
                  y software, es propiedad de Xoco Café o sus licenciantes y está protegido por
                  leyes de derechos de autor y marcas registradas.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                7. Privacidad y Protección de Datos
              </h2>
              <div className="text-gray-600 dark:text-gray-300 space-y-4">
                <p>
                  Tu privacidad es importante para nosotros. El manejo de tu información personal se
                  rige por nuestra Política de Privacidad, que cumple con el GDPR y otras
                  regulaciones aplicables.
                </p>
                <p>
                  Tienes derecho a acceder, rectificar, eliminar y portar tus datos personales, así
                  como a retirar tu consentimiento en cualquier momento.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                8. Limitación de Responsabilidad
              </h2>
              <div className="text-gray-600 dark:text-gray-300 space-y-4">
                <p>
                  Xoco Café no será responsable por daños indirectos, incidentales, especiales,
                  consecuenciales o punitivos, incluyendo pero no limitado a pérdida de beneficios,
                  datos o uso, que surjan del uso o la imposibilidad de usar nuestros servicios.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                9. Terminación
              </h2>
              <div className="text-gray-600 dark:text-gray-300 space-y-4">
                <p>
                  Podemos terminar o suspender tu cuenta inmediatamente, sin previo aviso, por
                  cualquier motivo, incluyendo si violas estos términos y condiciones.
                </p>
                <p>
                  Puedes terminar tu cuenta en cualquier momento contactándonos o utilizando la
                  función de eliminación de cuenta en tu perfil.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                10. Modificaciones
              </h2>
              <div className="text-gray-600 dark:text-gray-300 space-y-4">
                <p>
                  Nos reservamos el derecho de modificar estos términos y condiciones en cualquier
                  momento. Los cambios entrarán en vigor inmediatamente después de su publicación en
                  nuestro sitio web.
                </p>
                <p>
                  Es tu responsabilidad revisar periódicamente estos términos. El uso continuado del
                  servicio después de los cambios constituye tu aceptación de los nuevos términos.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                11. Ley Aplicable
              </h2>
              <div className="text-gray-600 dark:text-gray-300 space-y-4">
                <p>
                  Estos términos y condiciones se rigen por las leyes de [Tu jurisdicción] y
                  cualquier disputa será resuelta en los tribunales competentes de esa jurisdicción.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                12. Contacto
              </h2>
              <div className="text-gray-600 dark:text-gray-300 space-y-4">
                <p>Si tienes preguntas sobre estos términos y condiciones, contáctanos:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    Email:{' '}
                    <a
                      href="mailto:legal@xococafe.com"
                      className="text-blue-600 hover:text-blue-500 underline"
                    >
                      legal@xococafe.com
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
