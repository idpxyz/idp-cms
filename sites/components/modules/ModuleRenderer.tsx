"use client";

import React, { useEffect, useRef } from "react";
import registry from "./registry";
import type { ModuleConfigItem, ModuleKey } from "./types";
import ErrorBoundary from "@/components/common/ErrorBoundary";

interface ModuleRendererProps {
  modules: ModuleConfigItem[];
}

export default function ModuleRenderer({ modules }: ModuleRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 简单曝光埋点（可替换为真实 trackImpression）
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const key = (e.target as HTMLElement).dataset.moduleKey;
          if (key) {
            // console.log("impression:", key);
          }
        }
      });
    }, { threshold: 0.25 });

    Array.from(el.querySelectorAll('[data-module-key]')).forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [modules]);

  return (
    <div ref={containerRef}>
      {modules.map((m, idx) => {
        const key = m.key as ModuleKey;
        const item = (registry as any)[key];
        if (!item) return null;
        const C = item.Component;
        const props = { ...(item.defaultProps || {}), ...(m.props || {}) };
        return (
          <ErrorBoundary key={`${key}-${idx}`}>
            <div data-module-key={key} data-variant={m.variant || "default"}>
              <C {...props} />
            </div>
          </ErrorBoundary>
        );
      })}
    </div>
  );
}


