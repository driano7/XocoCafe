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

export const DEFAULT_BRANCH_ID = 'MATRIZ';
export const MAX_MONTHS_IN_ADVANCE = 1;

export const normalizeDateOnly = (isoInput: string) => {
  if (!isoInput) return '';
  if (isoInput.includes('T')) {
    return isoInput.split('T')[0];
  }
  return isoInput;
};

export const isDateWithinRange = (dateOnly: string) => {
  if (!dateOnly) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const limit = new Date(today);
  limit.setMonth(limit.getMonth() + MAX_MONTHS_IN_ADVANCE);

  const [year, month, day] = dateOnly.split('-').map(Number);
  if ([year, month, day].some((part) => Number.isNaN(part))) {
    return false;
  }

  const candidate = new Date(year, month - 1, day);
  candidate.setHours(0, 0, 0, 0);
  return candidate >= today && candidate <= limit;
};

export const trimTimeToMinutes = (timeValue?: string | null) => {
  if (!timeValue) return null;
  return timeValue.slice(0, 5);
};
