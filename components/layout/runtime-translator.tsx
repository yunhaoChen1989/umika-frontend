"use client";

import { useLayoutEffect } from "react";

import type { Locale } from "@/lib/i18n";
import { translateUiText } from "@/lib/ui-translations";

const translatedAttributes = ["aria-label", "placeholder", "title"] as const;

export function RuntimeTranslator({ locale }: { locale: Locale }) {
  useLayoutEffect(() => {
    if (locale === "en") {
      return;
    }

    const localizeNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const parent = node.parentElement;
        if (!parent || parent.closest("script, style, [data-i18n-exempt='true']")) {
          return;
        }

        const current = node.nodeValue ?? "";
        const leading = current.match(/^\s*/)?.[0] ?? "";
        const trailing = current.match(/\s*$/)?.[0] ?? "";
        const translated = translateUiText(current, locale);
        if (translated !== current) {
          node.nodeValue = `${leading}${translated.trim()}${trailing}`;
        }
        return;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return;
      }

      const element = node as Element;
      for (const attribute of translatedAttributes) {
        const current = element.getAttribute(attribute);
        if (current) {
          const translated = translateUiText(current, locale);
          if (translated !== current) {
            element.setAttribute(attribute, translated);
          }
        }
      }

      element.childNodes.forEach(localizeNode);
    };

    localizeNode(document.body);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          localizeNode(mutation.target);
        } else if (mutation.type === "attributes") {
          localizeNode(mutation.target);
        } else {
          mutation.addedNodes.forEach(localizeNode);
        }
      }
    });
    observer.observe(document.body, {
      attributeFilter: [...translatedAttributes],
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true,
    });
    const frame = window.requestAnimationFrame(() => localizeNode(document.body));
    const hydrationPass = window.setTimeout(() => localizeNode(document.body), 250);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      window.clearTimeout(hydrationPass);
    };
  }, [locale]);

  return null;
}
