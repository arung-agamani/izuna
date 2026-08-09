import { useRef } from "react";
import { Link } from "react-router";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import izunaPlaceholder from "../../assets/izuna.jpg";

gsap.registerPlugin(useGSAP);

export default function FanHome() {
    const heroRef = useRef<HTMLDivElement>(null);
    const sectionsRef = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        const tl = gsap.timeline();
        tl.from(".fan-hero-img", { opacity: 0, scale: 0.92, duration: 1, ease: "power3.out" });
        tl.from(".fan-hero-title", { opacity: 0, y: 24, duration: 0.6, ease: "power2.out" }, "-=0.4");
        tl.from(".fan-hero-sub", { opacity: 0, y: 16, duration: 0.5, ease: "power2.out" }, "-=0.2");
        tl.from(".fan-hero-cta", { opacity: 0, y: 12, duration: 0.4, ease: "power2.out" }, "-=0.2");
    }, []);

    useGSAP(() => {
        gsap.from(".fan-section", {
            scrollTrigger: { trigger: sectionsRef.current, start: "top 80%" },
            opacity: 0,
            y: 40,
            stagger: 0.2,
            duration: 0.7,
            ease: "power3.out",
        });
    }, []);

    return (
        <div>
            {/* Hero */}
            <div ref={heroRef} className="flex flex-col items-center text-center px-6 pt-16 pb-24">
                <img
                    src={izunaPlaceholder}
                    alt="Izuna"
                    className="fan-hero-img w-48 h-48 sm:w-64 sm:h-64 rounded-full object-cover mb-8"
                    style={{ border: "3px solid var(--color-accent)", boxShadow: "0 0 60px var(--color-accent-glow)" }}
                />
                <h1
                    className="fan-hero-title text-4xl sm:text-5xl mb-3"
                    style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}
                >
                    Izuna{" "}
                    <span className="text-2xl sm:text-3xl" style={{ color: "var(--color-text-muted)" }}>
                        —nin!
                    </span>
                </h1>
                <p className="fan-hero-sub text-lg max-w-lg mb-8" style={{ color: "var(--color-text-secondary)" }}>
                    The ninja fox of Hyakkiyakou Allied Academy. Loyal, energetic, and always ready with a smoke bomb.
                </p>
                <div className="fan-hero-cta flex gap-4">
                    <Link
                        to="/dash"
                        className="no-underline px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300"
                        style={{ background: "var(--color-accent)", color: "#fff" }}
                    >
                        Open Dashboard
                    </Link>
                    <Link
                        to="/lore"
                        className="no-underline px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300"
                        style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
                    >
                        Read Lore
                    </Link>
                </div>
            </div>

            {/* Section cards */}
            <div ref={sectionsRef} className="px-6 pb-24 max-w-3xl mx-auto">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        { to: "/lore", emoji: "📜", title: "Lore", desc: "Character stories and background" },
                        { to: "/media", emoji: "🖼️", title: "Media", desc: "Official art and screenshots" },
                        { to: "/fanarts", emoji: "🎨", title: "Fanarts", desc: "Community creations" },
                    ].map((section) => (
                        <Link key={section.to} to={section.to} className="fan-section no-underline block group">
                            <div
                                className="p-5 rounded-2xl h-full text-center transition-all duration-300"
                                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                                onMouseEnter={(e) => {
                                    gsap.to(e.currentTarget, {
                                        borderColor: "var(--color-accent)",
                                        y: -3,
                                        duration: 0.25,
                                        ease: "power2.out",
                                    });
                                }}
                                onMouseLeave={(e) => {
                                    gsap.to(e.currentTarget, {
                                        borderColor: "var(--color-border)",
                                        y: 0,
                                        duration: 0.25,
                                        ease: "power2.out",
                                    });
                                }}
                            >
                                <span className="text-3xl block mb-3">{section.emoji}</span>
                                <h3
                                    className="text-lg mb-1 font-bold"
                                    style={{ fontFamily: "var(--font-body)", color: "var(--color-text-primary)" }}
                                >
                                    {section.title}
                                </h3>
                                <p className="text-xs m-0" style={{ color: "var(--color-text-secondary)" }}>
                                    {section.desc}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
