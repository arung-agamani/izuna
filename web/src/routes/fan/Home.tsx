import { useRef, useState, useCallback, useEffect } from "react";
import { Link } from "react-router";
import { useUser } from "../../hooks/useUser";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import HeroBanner from "../../components/HeroBanner";
import izunaPlaceholder from "../../assets/izuna.jpg";
import { heroSlides } from "./slides";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const navCards = [
    { to: "/dash/tags", title: "Tags", description: "Browse and manage your saved tags, media, and reaction images.", accent: "var(--color-accent)", emoji: "🏷️" },
    { to: "/dash/reminders", title: "Reminders", description: "Set cron-based reminders that deliver to your DMs or server channels.", accent: "var(--color-gold)", emoji: "⏰" },
];

const SECTION_COUNT = 2;

export default function FanHome() {
    const { data: user } = useUser();
    const wrapperRef = useRef<HTMLDivElement>(null);
    const sectionsRef = useRef<HTMLDivElement>(null);
    const [currentSection, setCurrentSection] = useState(0);
    const isAnimating = useRef(false);

    const goToSection = useCallback((index: number) => {
        if (isAnimating.current) return;
        const clamped = Math.max(0, Math.min(index, SECTION_COUNT - 1));
        if (clamped === currentSection) return;

        isAnimating.current = true;
        setCurrentSection(clamped);

        gsap.to(document.documentElement, {
            scrollTop: clamped * window.innerHeight,
            duration: 0.8,
            ease: "power2.inOut",
            onComplete: () => {
                isAnimating.current = false;
            },
        });
    }, [currentSection]);

    // Observer — unified wheel/touch/pointer handling
    useEffect(() => {
        const obs = ScrollTrigger.observe({
            target: window,
            type: "wheel,touch,pointer",
            onDown: () => goToSection(currentSection + 1),
            onUp: () => goToSection(currentSection - 1),
            wheelSpeed: 0.5,
            tolerance: 50,
            preventDefault: true,
        });

        // Keyboard navigation
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "ArrowDown" || e.key === "PageDown") goToSection(currentSection + 1);
            if (e.key === "ArrowUp" || e.key === "PageUp") goToSection(currentSection - 1);
        };
        document.addEventListener("keydown", handleKey);

        return () => {
            obs.kill();
            document.removeEventListener("keydown", handleKey);
        };
    }, [currentSection, goToSection]);

    // Reveal section 2 content when it enters viewport
    useGSAP(() => {
        gsap.from(".fan-section", {
            scrollTrigger: {
                trigger: sectionsRef.current,
                start: "top 75%",
                toggleActions: "play none none reverse",
            },
            opacity: 0,
            y: 40,
            stagger: 0.15,
            duration: 0.7,
            ease: "power3.out",
        });
    }, []);

    // Nav card hover
    useGSAP(() => {
        document.querySelectorAll(".nav-card").forEach((card) => {
            const accent = card.getAttribute("data-accent") || "var(--color-accent)";
            card.addEventListener("mouseenter", () => gsap.to(card, { borderColor: accent, boxShadow: `0 0 30px ${accent}15`, y: -4, duration: 0.3, ease: "power2.out" }));
            card.addEventListener("mouseleave", () => gsap.to(card, { borderColor: "var(--color-border)", boxShadow: "none", y: 0, duration: 0.3, ease: "power2.out" }));
        });
    }, []);

    return (
        <div ref={wrapperRef}>
            <HeroBanner
                slides={heroSlides}
                brandImage={izunaPlaceholder}
                brandText="Izuna"
                tagline="The ninja fox of Hyakkaryouran. Loyal, energetic, and always ready with a smoke bomb."
            />

            <div ref={sectionsRef} className="content-section min-h-screen">
                <div className="max-w-3xl mx-auto px-6 py-24">
                    <div className="mb-16">
                        <p className="fan-section text-lg mb-2" style={{ color: "var(--color-text-secondary)" }}>
                            {user?.name ? "Welcome back," : "Welcome,"}
                        </p>
                        <h1 className="fan-section text-5xl sm:text-6xl mb-6 tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                            {user?.name ? (
                                <>
                                    <span style={{ color: "var(--color-accent)" }}>{user.name}</span>
                                    <span className="text-2xl sm:text-3xl ml-3" style={{ color: "var(--color-text-muted)" }}>—nin!</span>
                                </>
                            ) : "Izuna Dashboard"}
                        </h1>
                        <div className="fan-section flex gap-6">
                            <div className="px-5 py-3 rounded-xl text-sm font-semibold" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                                <span style={{ color: "var(--color-text-muted)" }}>Status </span>
                                <span style={{ color: "var(--color-positive)" }}>● Online</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {navCards.map((card) => (
                            <Link key={card.to} to={card.to} className="fan-section nav-card no-underline block group" data-accent={card.accent}>
                                <div className="p-6 rounded-2xl h-full transition-all duration-300" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                                    <div className="flex items-start gap-4">
                                        <span className="text-3xl">{card.emoji}</span>
                                        <div>
                                            <h2 className="text-xl mb-1 font-bold">{card.title}</h2>
                                            <p className="text-sm leading-relaxed m-0" style={{ color: "var(--color-text-secondary)" }}>{card.description}</p>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>

                    <div className="fan-section mt-24 text-center">
                        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Izuna v2 — nin nin!</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
