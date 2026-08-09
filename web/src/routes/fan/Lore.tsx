import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export default function FanLore() {
    const ref = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        gsap.from(ref.current, { opacity: 0, y: 30, duration: 0.7, ease: "power3.out" });
    }, []);

    return (
        <div ref={ref} className="max-w-2xl mx-auto px-6 py-16">
            <h1 className="text-4xl mb-8" style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}>
                Lore
            </h1>
            <p className="text-lg leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                Coming soon —nin! Stories and background about Izuna, the ninja fox of Hyakkaryouran.
            </p>
        </div>
    );
}
