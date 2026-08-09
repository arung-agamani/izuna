import { useRef } from "react";
import { Link } from "react-router";
import { useUser } from "../../hooks/useUser";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const navCards = [
    {
        to: "/dash/tags",
        title: "Tags",
        description: "Browse and manage your saved tags, media, and reaction images.",
        accent: "var(--color-accent)",
        emoji: "🏷️",
    },
    {
        to: "/dash/reminders",
        title: "Reminders",
        description: "Set cron-based reminders that deliver to your DMs or server channels.",
        accent: "var(--color-gold)",
        emoji: "⏰",
    },
];

export default function V2Home() {
    const { data: user } = useUser();
    const heroRef = useRef<HTMLDivElement>(null);
    const cardsRef = useRef<HTMLDivElement>(null);

    // Hero entrance
    useGSAP(() => {
        const tl = gsap.timeline();
        tl.from(".hero-greeting", { opacity: 0, y: 30, duration: 0.7, ease: "power3.out" });
        tl.from(".hero-title", { opacity: 0, y: 20, duration: 0.5, ease: "power2.out" }, "-=0.3");
        tl.from(".hero-stats", { opacity: 0, y: 15, duration: 0.5, ease: "power2.out" }, "-=0.2");
    }, []);

    // Cards stagger in on scroll
    useGSAP(() => {
        gsap.from(".nav-card", {
            scrollTrigger: {
                trigger: cardsRef.current,
                start: "top 85%",
            },
            opacity: 0,
            y: 40,
            stagger: 0.15,
            duration: 0.7,
            ease: "power3.out",
        });
    }, []);

    return (
        <div>
            {/* Hero Section */}
            <div ref={heroRef} className="mb-16">
                <p
                    className="hero-greeting text-lg mb-2"
                    style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-body)" }}
                >
                    {user?.name ? `Welcome back,` : "Welcome,"}
                </p>
                <h1
                    className="hero-title text-5xl sm:text-6xl mb-6 tracking-tight"
                    style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}
                >
                    {user?.name ? (
                        <>
                            <span style={{ color: "var(--color-accent)" }}>{user.name}</span>
                            <span className="text-2xl sm:text-3xl ml-3" style={{ color: "var(--color-text-muted)" }}>
                                —nin!
                            </span>
                        </>
                    ) : (
                        "Izuna Dashboard"
                    )}
                </h1>
                <div className="hero-stats flex gap-6">
                    <div
                        className="px-5 py-3 rounded-xl text-sm font-semibold"
                        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                    >
                        <span style={{ color: "var(--color-text-muted)" }}>Status </span>
                        <span style={{ color: "var(--color-positive)" }}>● Online</span>
                    </div>
                </div>
            </div>

            {/* Navigation Cards */}
            <div ref={cardsRef} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {navCards.map((card) => (
                    <Link key={card.to} to={card.to} className="nav-card no-underline block group">
                        <div
                            className="p-6 rounded-2xl h-full transition-all duration-300"
                            style={{
                                background: "var(--color-surface)",
                                border: "1px solid var(--color-border)",
                            }}
                            onMouseEnter={(e) => {
                                gsap.to(e.currentTarget, {
                                    borderColor: card.accent,
                                    boxShadow: `0 0 30px ${card.accent}15`,
                                    y: -4,
                                    duration: 0.3,
                                    ease: "power2.out",
                                });
                            }}
                            onMouseLeave={(e) => {
                                gsap.to(e.currentTarget, {
                                    borderColor: "var(--color-border)",
                                    boxShadow: "none",
                                    y: 0,
                                    duration: 0.3,
                                    ease: "power2.out",
                                });
                            }}
                        >
                            <div className="flex items-start gap-4">
                                <span className="text-3xl">{card.emoji}</span>
                                <div>
                                    <h2
                                        className="text-xl mb-1 font-bold group-hover:transition-colors duration-300"
                                        style={{ fontFamily: "var(--font-body)", color: "var(--color-text-primary)" }}
                                    >
                                        {card.title}
                                    </h2>
                                    <p className="text-sm leading-relaxed m-0" style={{ color: "var(--color-text-secondary)" }}>
                                        {card.description}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Footer decoration */}
            <div className="mt-24 text-center">
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    Izuna v2 — nin nin!
                </p>
            </div>
        </div>
    );
}
