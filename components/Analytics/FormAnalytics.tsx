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

'use client';

import { useEffect, useRef } from 'react';
import { useConversionTracking } from '@/components/Analytics/AnalyticsProvider';

interface FormAnalyticsProps {
  formName: string;
  children: React.ReactNode;
}

export function FormAnalytics({ formName, children }: FormAnalyticsProps) {
  const { trackFormSubmit, trackButtonClick } = useConversionTracking();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const handleSubmit = () => {
      const formData = new FormData(form as HTMLFormElement);
      const formValues = Object.fromEntries(formData.entries());

      // Track form submission
      trackFormSubmit(formName, true);

      // Track individual field interactions
      Object.keys(formValues).forEach((fieldName) => {
        if (formValues[fieldName]) {
          trackButtonClick(`${formName}_${fieldName}_filled`);
        }
      });
    };

    form.addEventListener('submit', handleSubmit);

    return () => {
      form.removeEventListener('submit', handleSubmit);
    };
  }, [formName, trackFormSubmit, trackButtonClick]);

  return <form ref={formRef}>{children}</form>;
}

// Hook para tracking de campos de formulario
export function useFormFieldTracking(formName: string) {
  const { trackButtonClick } = useConversionTracking();

  const trackFieldFocus = (fieldName: string) => {
    trackButtonClick(`${formName}_${fieldName}_focus`);
  };

  const trackFieldBlur = (fieldName: string, hasValue: boolean) => {
    trackButtonClick(`${formName}_${fieldName}_blur`, hasValue ? 'with_value' : 'empty');
  };

  const trackFieldChange = (fieldName: string, value: string) => {
    if (value.length > 0) {
      trackButtonClick(`${formName}_${fieldName}_change`, `length_${value.length}`);
    }
  };

  return {
    trackFieldFocus,
    trackFieldBlur,
    trackFieldChange,
  };
}
