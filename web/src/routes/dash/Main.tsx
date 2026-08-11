import { useRef } from "react";
import { Link, Outlet, useLocation } from "react-router";
import { useUser } from "../../hooks/useUser";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import izunaLogo from "../../assets/favicon_izuna_icon.png";

gsap.registerPlugin(useGSAP);

const navLinks = [
    { to: "/dash", label: "Dashboard" },
    { to: "/dash/tags", label: "Tags" },
    { to: "/dash/reminders", label: "Reminders" },
    { to: "/dash/admin", label: "Admin" },
];

export default function V2Layout() {
    const { data: user } = useUser();
    const location = useLocation();
    const headerRef = useRef<HTMLHeadElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // Animate header in on mount
    useGSAP(() => {
        gsap.from(headerRef.current, {
            y: -60,
            opacity: 0,
            duration: 0.8,
            ease: "power3.out",
        });
    }, []);

    // Animate content area on route change
    useGSAP(() => {
        gsap.fromTo(
            contentRef.current,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" },
        );
    }, [location.pathname]);

    return (
        <div className="min-h-screen" style={{ fontFamily: "var(--font-body)" }}>
            {/* Header — glassmorphism */}
            <header
                ref={headerRef}
                className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center px-6"
                style={{
                    background: "rgba(10, 10, 26, 0.75)",
                    backdropFilter: "blur(16px)",
                    borderBottom: "1px solid var(--color-border)",
                }}
            >
                {/* Logo */}
                <Link to="/dash" className="flex items-center gap-3 no-underline">
                    <img src={izunaLogo} alt="Izuna" className="h-8 w-8" />
                    <span className="text-xl tracking-wide" style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}>
                        Izuna
                    </span>
                </Link>

                {/* Navigation */}
                <nav className="flex items-center gap-1 ml-10">
                    {navLinks.map((link) => {
                        const isActive = location.pathname === link.to || (link.to !== "/dash" && location.pathname.startsWith(link.to));
                        return (
                            <Link
                                key={link.to}
                                to={link.to}
                                className="no-underline px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
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

                {/* Spacer */}
                <div className="flex-1" />

                {/* User */}
                {user?.name ? (
                    <Link to="/dash/profile" className="no-underline">
                        <span
                            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
                            style={{
                                color: location.pathname === "/dash/profile" ? "var(--color-accent)" : "var(--color-text-secondary)",
                                background: location.pathname === "/dash/profile" ? "var(--color-accent-glow)" : "transparent",
                                border: "1px solid var(--color-border)",
                            }}
                        >
                            {user.name}
                        </span>
                    </Link>
                ) : (
                    <Link
                        to="/login"
                        className="no-underline px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200"
                        style={{
                            background: "var(--color-accent)",
                            color: "#fff",
                        }}
                    >
                        Login
                    </Link>
                )}
            </header>

            {/* Content area */}
            <div ref={contentRef} className="pt-16">
                <div className="mx-auto px-6 py-12 max-w-[120rem]">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
