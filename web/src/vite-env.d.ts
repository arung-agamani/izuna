/// <reference types="vite/client" />

declare module "*.mdx" {
    import type { MDXComponents } from "mdx/types";
    const MDXComponent: (props: { components?: MDXComponents }) => React.ReactNode;
    export default MDXComponent;
}
