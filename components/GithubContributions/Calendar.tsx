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

import { useTheme } from 'next-themes';
import ActivityCalendar, { Activity, ThemeInput } from 'react-activity-calendar';
import ActivityTooltip from './ActivityTooltip';

export const GITHUB_THEME: ThemeInput = {
  light: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
  dark: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],
};

interface Props {
  data: Activity[];
}

export default function Calendar({ data }: Props) {
  const { theme = 'dark' } = useTheme();

  return (
    <div className="flex flex-col space-y-4">
      <p className="text-2xl font-extrabold leading-9 tracking-tight text-gray-900 dark:text-gray-100">
        Github Contributions
      </p>
      <ActivityCalendar
        colorScheme={theme as any}
        data={data}
        theme={GITHUB_THEME}
        showWeekdayLabels
        labels={{
          totalCount: '{{count}} contributions within the last year',
          weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        }}
        renderBlock={(block, activity) => <ActivityTooltip block={block} activity={activity} />}
      />
    </div>
  );
}
