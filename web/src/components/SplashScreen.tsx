import { useRef, useState, useCallback, useEffect } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

interface SplashScreenProps {
    onReady?: () => void;
    /** Called when the user clicks to start — fires at the same moment the exit animation begins */
    onExitStart?: () => void;
    minLoadTime?: number;
    children: React.ReactNode;
}

/**
 * Full-screen splash screen with loading bar and split-door exit animation.
 *
 * Phases:
 *  1. LOADING  — solid overlay, spinner center, progress bar bottom
 *  2. READY    — spinner changes to "Click to Start", waits for user interaction
 *  3. EXITING  — top half slides up, bottom half slides down (GSAP timeline)
 *  4. DONE     — children render beneath
 */
export default function SplashScreen({ onReady, onExitStart, minLoadTime = 1500, children }: SplashScreenProps) {
    const [phase, setPhase] = useState<"loading" | "ready" | "exiting" | "done">("loading");
    const overlayRef = useRef<HTMLDivElement>(null);
    const topHalfRef = useRef<HTMLDivElement>(null);
    const bottomHalfRef = useRef<HTMLDivElement>(null);
    const indicatorRef = useRef<HTMLDivElement>(null);
    const barFillRef = useRef<HTMLDivElement>(null);
    const timelineRef = useRef<gsap.core.Timeline | null>(null);

    // Simulate asset loading — replace with real asset tracking later
    useEffect(() => {
        const timer = setTimeout(() => {
            setPhase("ready");
            onReady?.();
        }, minLoadTime);
        return () => clearTimeout(timer);
    }, [minLoadTime, onReady]);

    // Animate the loading bar fill
    useGSAP(() => {
        if (phase === "loading" && barFillRef.current) {
            gsap.to(barFillRef.current, {
                width: "100%",
                duration: minLoadTime / 1000,
                ease: "power2.inOut",
            });
        }
    }, [phase, minLoadTime]);

    // Animate indicator: spinner → "Click to Start"
    useGSAP(() => {
        if (phase === "ready" && indicatorRef.current) {
            const tl = gsap.timeline();
            // Fade out spinner, fade in text
            tl.to(".splash-spinner", { opacity: 0, scale: 0.8, duration: 0.3, ease: "power2.in" });
            tl.to(".splash-ready-text", { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.5)" }, "-=0.1");
            // Pulse animation on the ready text
            tl.to(".splash-ready-text", { scale: 1.05, duration: 0.8, repeat: -1, yoyo: true, ease: "sine.inOut" });
        }
    }, [phase]);

    // Exit sequence: split doors + fade overlay
    const handleStart = useCallback(() => {
        if (phase !== "ready") return;
        setPhase("exiting");
        onExitStart?.();
        const tl = gsap.timeline({
            onComplete: () => setPhase("done"),
        });

        // Stop the pulse
        gsap.killTweensOf(".splash-ready-text");

        tl.to(".splash-ready-text", { opacity: 0, scale: 0.9, duration: 0.2, ease: "power2.in" });

        // Top half slides up, bottom half slides down
        tl.to(
            topHalfRef.current,
            { yPercent: -100, duration: 0.8, ease: "power4.inOut" },
            "split",
        );
        tl.to(
            bottomHalfRef.current,
            { yPercent: 100, duration: 0.8, ease: "power4.inOut" },
            "split",
        );

        // Fade the entire overlay out with the halves
        tl.to(
            overlayRef.current,
            { opacity: 0, duration: 0.4, ease: "power2.out" },
            "-=0.3",
        );
    }, [phase]);

    return (
        <>
            {children}

            {/* Splash overlay */}
            {phase !== "done" && (
                <div
                    ref={overlayRef}
                    className="fixed inset-0 z-[100] flex flex-col overflow-hidden"
                >
                    {/* Top half */}
                    <div ref={topHalfRef} className="flex-1 flex items-end justify-center pb-8" style={{ background: "#3d0e24" }}>
                    </div>

                    {/* Center indicator */}
                    <div ref={indicatorRef} className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {/* Spinner (loading phase) */}
                        {phase === "loading" && (
                            <div className="splash-spinner flex flex-col items-center gap-4">
                                <div
                                    className="w-10 h-10 rounded-full animate-spin"
                                    style={{
                                        border: "3px solid var(--color-border)",
                                        borderTopColor: "var(--color-accent)",
                                    }}
                                />
                                <span className="text-sm" style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-body)" }}>
                                    Loading —nin...
                                </span>
                            </div>
                        )}

                        {/* Ready text (ready phase) */}
                        {phase === "ready" && (
                            <button
                                className="splash-ready-text pointer-events-auto opacity-0 px-8 py-4 rounded-2xl text-lg font-bold border-none cursor-pointer transition-colors"
                                style={{
                                    fontFamily: "var(--font-display)",
                                    background: "var(--color-accent)",
                                }}
                                onClick={handleStart}
                            >
                                <span className="hidden sm:inline">Click to Start</span>
                                <span className="sm:hidden">Tap to Start</span>
                            </button>
                        )}

                        {/* Exiting — blank */}
                        {phase === "exiting" && <div />}
                    </div>

                    {/* Bottom half */}
                    <div ref={bottomHalfRef} className="flex-1 flex items-start justify-center pt-8" style={{ background: "#1d0610" }}>
                    </div>

                    {/* Loading bar — at the very bottom */}
                    {phase === "loading" && (
                        <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: "var(--color-border)" }}>
                            <div
                                ref={barFillRef}
                                className="h-full"
                                style={{ background: "var(--color-accent)", width: "0%" }}
                            />
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
