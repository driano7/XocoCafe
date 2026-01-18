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
  const { t } = useLanguage();
  const translation = t(tid);
  // t() returns the key if not found, so check if result equals key
  const text = translation && translation !== tid ? translation : fallback || tid;

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={text}
        initial={{ opacity: 0, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -3 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
      >
        {text}
      </motion.span>
    </AnimatePresence>
  );
}
