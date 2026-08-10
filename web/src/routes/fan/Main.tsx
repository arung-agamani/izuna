import { useRef, useState } from "react";
import { Link, Outlet, useLocation } from "react-router";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import izunaLogo from "../../assets/favicon_izuna_icon.png";
import SplashScreen from "../../components/SplashScreen";
import { HeroEntranceContext } from "./HeroEntranceContext";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const fanNavLinks = [
    { to: "/", label: "Home" },
    { to: "/lore", label: "Lore" },
    { to: "/media", label: "Media" },
    { to: "/fanarts", label: "Fanarts" },
];

export default function FanLayout() {
    const location = useLocation();
    const headerRef = useRef<HTMLHeadElement>(null);
    const [heroReady, setHeroReady] = useState(false);

    // Header fades in only after hero scrolls past 80%
    useGSAP(() => {
        if (!heroReady || !headerRef.current) return;
        gsap.fromTo(
            headerRef.current,
            { opacity: 0 },
            {
                opacity: 1,
                scrollTrigger: {
                    trigger: ".content-section",
                    start: "top 90%",
                    toggleActions: "play none none reverse",
                },
                duration: 0.4,
                ease: "power2.out",
            },
        );
    }, [heroReady]);

    return (
        <SplashScreen onExitStart={() => setHeroReady(true)}>
            <HeroEntranceContext.Provider value={heroReady}>
                <div className="min-h-screen" style={{ fontFamily: "var(--font-body)" }}>
                    {/* Header — hidden initially, fades in on scroll */}
                    <header
                        ref={headerRef}
                        className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-6"
                        style={{
                            background: "rgba(10, 10, 26, 0.6)",
                            backdropFilter: "blur(12px)",
                            borderBottom: "1px solid var(--color-border)",
                            opacity: 0,
                        }}
                    >
                        <Link to="/" className="flex items-center gap-2 no-underline">
                            <img src={izunaLogo} alt="Izuna" className="h-7 w-7" />
                            <span className="text-lg tracking-wide" style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}>
                                Izuna
                            </span>
                        </Link>

                        <nav className="flex items-center gap-1 ml-8">
                            {fanNavLinks.map((link) => {
                                const isActive = location.pathname === link.to;
                                return (
                                    <Link
                                        key={link.to}
                                        to={link.to}
                                        className="no-underline px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200"
                                        style={{
                                            color: isActive ? "var(--color-accent)" : "var(--color-text-secondary)",
                                            background: isActive ? "var(--color-accent-glow)" : "transparent",
                                        }}
                                    >
                                        {link.label}
                                    </Link>
                                );
                            })}
                        </nav>

                        <div className="flex-1" />

                        <Link
                            to="/dash"
                            className="no-underline px-4 py-1.5 rounded-lg text-sm font-bold transition-all duration-200"
                            style={{ border: "1px solid var(--color-accent)", color: "var(--color-accent)" }}
                        >
                            Dashboard →
                        </Link>
                    </header>

                    {/* Full-bleed content — no padding-top, header overlays */}
                    <Outlet />
                </div>
            </HeroEntranceContext.Provider>
        </SplashScreen>
    );
}
