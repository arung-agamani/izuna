import { createContext, useContext } from "react";

/** Shared context so HeroBanner knows when the splash screen has started exiting. */
export const HeroEntranceContext = createContext<boolean>(false);

export function useHeroEntrance() {
    return useContext(HeroEntranceContext);
}
