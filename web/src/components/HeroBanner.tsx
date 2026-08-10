import { useRef, useEffect, useCallback } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useHeroEntrance } from "../routes/fan/HeroEntranceContext";

gsap.registerPlugin(useGSAP);

interface HeroBannerProps {
    slides: string[];
    brandImage: string;
    brandText: string;
    tagline: string;
}

export default function HeroBanner({ slides, brandImage, brandText, tagline }: HeroBannerProps) {
    const sectionRef = useRef<HTMLDivElement>(null);
    const bgRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // Static background — first image only, slideshow disabled
    useEffect(() => {
        if (!bgRef.current || slides.length === 0) return;
        const layer = document.createElement("div");
        layer.className = "hero-bg-layer absolute inset-0 bg-cover bg-center";
        layer.style.backgroundImage = `url(${slides[0]})`;
        bgRef.current.appendChild(layer);
        gsap.set(layer, { opacity: 1, scale: 1 });
    }, []);

    // Entrance animation — waits for splash screen exit signal
    const heroReady = useHeroEntrance();
    useGSAP(() => {
        if (!heroReady) return;

        const tl = gsap.timeline();
        // Text reveals first
        tl.fromTo(".hero-brand-img", { opacity: 0, scale: 0.9, y: 20 }, { opacity: 1, scale: 1, y: 0, duration: 0.8, ease: "power3.out" });
        tl.fromTo(".hero-brand-text", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, "-=0.3");
        tl.fromTo(".hero-tagline", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, "-=0.2");
        // Background fades in after text lands
        tl.fromTo(bgRef.current, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: "power2.out" }, "+=0.1");
        tl.fromTo(".hero-scroll-hint", { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, "-=0.5");
    }, [heroReady]);

    const scrollDown = useCallback(() => {
        gsap.to(document.documentElement, { scrollTop: window.innerHeight, duration: 0.8, ease: "power2.inOut" });
    }, []);

    return (
        <section ref={sectionRef} className="relative h-screen w-full overflow-hidden snap-start" style={{ scrollSnapAlign: "start" }}>
            {/* Background layer — hidden until entrance */}
            <div ref={bgRef} className="absolute inset-0" style={{ opacity: 0 }} />

            {/* Dark overlay */}
            <div className="hero-overlay absolute inset-0" style={{ background: "rgba(10, 10, 26, 0.5)" }} />

            {/* Content */}
            <div ref={contentRef} className="hero-content relative z-10 h-full flex flex-col items-center justify-center px-6 text-center">
                {/* Mobile */}
                <img
                    src={brandImage}
                    alt="Izuna"
                    className="hero-brand-img w-40 h-40 sm:w-48 sm:h-48 rounded-full object-cover mb-6 sm:hidden"
                    style={{ border: "3px solid var(--color-accent)", boxShadow: "0 0 60px var(--color-accent-glow)", opacity: 0 }}
                />

                {/* Desktop */}
                <h1
                    className="hero-brand-text sm:block text-5xl md:text-7xl mb-4"
                    style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)", letterSpacing: "0.04em", opacity: 0 }}
                >
                    {brandText}
                </h1>

                <p className="hero-tagline text-lg sm:text-xl max-w-md" style={{ color: "var(--color-text-secondary)", opacity: 0 }}>
                    {tagline}
                </p>
            </div>

            {/* Scroll-down indicator */}
            <button
                onClick={scrollDown}
                className="hero-scroll-hint absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 bg-transparent border-none cursor-pointer"
                style={{ color: "var(--color-text-muted)", opacity: 0 }}
            >
                <span className="text-xs" style={{ fontFamily: "var(--font-body)" }}>Scroll</span>
                <svg className="w-5 h-5 animate-bounce" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>
        </section>
    );
}
