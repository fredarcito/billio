"use client";

import { useEffect, useRef } from "react";

// Parallax sutil para las tarjetas flotantes del hero.
// - Cada tarjeta se mueve una fracción distinta del scroll (profundidad).
// - Se respeta `prefers-reduced-motion`: si el usuario pide menos movimiento, no se anima nada.
// - Usa requestAnimationFrame y transformaciones (GPU), sin librerías.
export function ParallaxGroup({ children, className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return;

    const items = Array.from(container.querySelectorAll("[data-depth]"));
    for (const item of items) item.style.willChange = "transform, opacity";
    if (!items.length) return;

    let frame = 0;

    const update = () => {
      frame = 0;
      const offset = window.scrollY;
      // Solo mientras el hero está a la vista
      if (offset > window.innerHeight * 1.2) return;

      for (const item of items) {
        const depth = Number(item.dataset.depth) || 0;
        // Movimiento vertical y horizontal proporcional a la profundidad
        const y = offset * depth * 0.24;
        const x = offset * depth * 0.06;
        // Las capas lejanas se difuminan y atenúan un poco al alejarse
        const fade = Math.min(offset / 600, 1);
        const opacity = 1 - fade * (0.55 - depth * 0.18);
        item.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        item.style.opacity = String(Math.max(opacity, 0.25));
      }
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      for (const item of items) {
        item.style.transform = "";
        item.style.opacity = "";
      }
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
