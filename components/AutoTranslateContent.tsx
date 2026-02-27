'use client';

import { Fragment, ReactNode, isValidElement, cloneElement } from 'react';
import AutoTranslatedText from '@/components/AutoTranslatedText';
import { useLanguage } from '@/components/Language/LanguageProvider';

type AutoTranslateContentProps = {
  children?: ReactNode;
};

const shouldTranslateText = (text: string) => text.trim().length > 0;

export const translateReactNode = (node: ReactNode): ReactNode => {
  if (typeof node === 'string') {
    if (!shouldTranslateText(node)) {
      return node;
    }
    return <AutoTranslatedText spanish={node} />;
  }

  if (Array.isArray(node)) {
    return node.map((child, index) => (
      <Fragment key={`mdx-auto-${index}`}>{translateReactNode(child)}</Fragment>
    ));
  }

  if (isValidElement(node)) {
    if (node.type === AutoTranslatedText) {
      return node;
    }
    const { children, ...props } = node.props as { children: ReactNode };
    return cloneElement(node, props, translateReactNode(children));
  }

  return node;
};

export function AutoTranslateChildren({ children }: AutoTranslateContentProps) {
  const { currentLanguage } = useLanguage();
  if (currentLanguage !== 'en') {
    return <>{children}</>;
  }

  return <>{translateReactNode(children)}</>;
}

export default function AutoTranslateContent({ children }: AutoTranslateContentProps) {
  return <AutoTranslateChildren>{children}</AutoTranslateChildren>;
}
