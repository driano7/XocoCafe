'use client';

import { Fragment, ReactNode, isValidElement, cloneElement } from 'react';
import AutoTranslatedText from '@/components/AutoTranslatedText';
import { useLanguage } from '@/components/Language/LanguageProvider';

type AutoTranslateContentProps = {
  children: ReactNode;
};

const shouldTranslateText = (text: string) => text.trim().length > 0;

const translateNode = (node: ReactNode): ReactNode => {
  if (typeof node === 'string') {
    if (!shouldTranslateText(node)) {
      return node;
    }
    return <AutoTranslatedText spanish={node} />;
  }

  if (Array.isArray(node)) {
    return node.map((child, index) => (
      <Fragment key={`mdx-auto-${index}`}>{translateNode(child)}</Fragment>
    ));
  }

  if (isValidElement(node)) {
    const { children, ...props } = node.props as { children: ReactNode };
    return cloneElement(node, props, translateNode(children));
  }

  return node;
};

export default function AutoTranslateContent({ children }: AutoTranslateContentProps) {
  const { currentLanguage } = useLanguage();
  if (currentLanguage !== 'en') {
    return <>{children}</>;
  }

  return <>{translateNode(children)}</>;
}
