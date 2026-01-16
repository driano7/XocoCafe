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
 */

'use client';

import { useLanguage } from './LanguageProvider';
import { motion, AnimatePresence } from 'framer-motion';

export default function TranslatedText({ tid, fallback }: { tid: string; fallback?: string }) {
  const { t, isChanging } = useLanguage();
  const text = t(tid) || fallback || tid;

  return (
    <AnimatePresence mode="wait">
      {isChanging ? (
        <motion.span
          key="typing"
          initial={{ opacity: 0.5 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.4, repeat: Infinity }}
          className="inline-block"
        >
          ...
        </motion.span>
      ) : (
        <motion.span
          key={text}
          initial={{ opacity: 0, x: -2 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 2 }}
          transition={{ duration: 0.2 }}
        >
          {text}
        </motion.span>
      )}
    </AnimatePresence>
  );
}
