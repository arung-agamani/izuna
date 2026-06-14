import type { PropsWithChildren, HTMLAttributes } from "react";
import type { MDXComponents } from "mdx/types";

export const H1: React.FC<PropsWithChildren<HTMLAttributes<HTMLHeadingElement>>> = ({ children, className, ...props }) => (
    <h1 {...props} className={`text-4xl font-extrabold tracking-tight leading-tight mt-8 mb-4 ${className || ""}`}>
        {children}
    </h1>
);

export const H2: React.FC<PropsWithChildren<HTMLAttributes<HTMLHeadingElement>>> = ({ children, className, ...props }) => (
    <h2 {...props} className={`text-2xl font-bold tracking-tight leading-snug mt-6 mb-3 ${className || ""}`}>
        {children}
    </h2>
);

/** @deprecated Use `H2` instead */
export const Heading = H2;

export const H3: React.FC<PropsWithChildren<HTMLAttributes<HTMLHeadingElement>>> = ({ children, className, ...props }) => (
    <h3 {...props} className={`text-xl font-semibold leading-snug mt-5 mb-2 ${className || ""}`}>
        {children}
    </h3>
);

/** @deprecated Use `H3` instead */
export const SubHeading = H3;

export const H4: React.FC<PropsWithChildren<HTMLAttributes<HTMLHeadingElement>>> = ({ children, className, ...props }) => (
    <h4 {...props} className={`text-lg font-semibold leading-snug mt-4 mb-2 ${className || ""}`}>
        {children}
    </h4>
);


export const BodyText: React.FC<PropsWithChildren<HTMLAttributes<HTMLParagraphElement>>> = ({ children, className, ...props }) => (
    <p {...props} className={`text-base leading-relaxed mb-4 ${className || ""}`}>
        {children}
    </p>
);

export const LeadText: React.FC<PropsWithChildren<HTMLAttributes<HTMLParagraphElement>>> = ({ children, className, ...props }) => (
    <p {...props} className={`text-lg leading-relaxed mb-4 text-slate-700 ${className || ""}`}>
        {children}
    </p>
);

export const SmallText: React.FC<PropsWithChildren<HTMLAttributes<HTMLSpanElement>>> = ({ children, className, ...props }) => (
    <span {...props} className={`text-sm text-slate-500 ${className || ""}`}>
        {children}
    </span>
);


export const UnorderedList: React.FC<PropsWithChildren<HTMLAttributes<HTMLUListElement>>> = ({ children, className, ...props }) => (
    <ul {...props} className={`list-disc list-inside space-y-1 mb-4 pl-2 ${className || ""}`}>
        {children}
    </ul>
);

export const OrderedList: React.FC<PropsWithChildren<HTMLAttributes<HTMLOListElement>>> = ({ children, className, ...props }) => (
    <ol {...props} className={`list-decimal list-inside space-y-1 mb-4 pl-2 ${className || ""}`}>
        {children}
    </ol>
);

export const ListItem: React.FC<PropsWithChildren<HTMLAttributes<HTMLLIElement>>> = ({ children, className, ...props }) => (
    <li {...props} className={`leading-relaxed ${className || ""}`}>
        {children}
    </li>
);

export const InlineCode: React.FC<PropsWithChildren<HTMLAttributes<HTMLElement>>> = ({ children, className, ...props }) => (
    <code
        {...props}
        className={`font-mono text-sm px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 ${className || ""}`}
    >
        {children}
    </code>
);

export const CodeBlock: React.FC<PropsWithChildren<HTMLAttributes<HTMLPreElement>>> = ({ children, className, ...props }) => (
    <pre
        {...props}
        className={`font-mono text-sm leading-relaxed bg-slate-900 text-slate-100 rounded-lg p-4 mb-4 overflow-x-auto ${className || ""}`}
    >
        {children}
    </pre>
);

export const BlockQuote: React.FC<PropsWithChildren<HTMLAttributes<HTMLQuoteElement>>> = ({ children, className, ...props }) => (
    <blockquote
        {...props}
        className={`px-4 py-3 my-4 rounded-md bg-slate-800 text-slate-100 text-lg italic border-l-4 border-slate-500 ${className || ""}`}
    >
        {children}
    </blockquote>
);

export const Hr: React.FC<HTMLAttributes<HTMLHRElement>> = ({ className, ...props }) => (
    <hr {...props} className={`my-8 border-slate-300 ${className || ""}`} />
);

export const TextLink: React.FC<PropsWithChildren<HTMLAttributes<HTMLAnchorElement>>> = ({ children, className, ...props }) => (
    <a
        {...props}
        className={`text-blue-600 underline decoration-blue-300 hover:decoration-blue-600 hover:text-blue-800 transition-colors ${className || ""}`}
    >
        {children}
    </a>
);

export const ContentImage: React.FC<HTMLAttributes<HTMLImageElement>> = ({ className, ...props }) => (
    <img {...props} className={`max-w-full h-auto rounded-lg my-4 ${className || ""}`} />
);

// ── MDX Component Map ──
// Use this when rendering MDX content: <MDXContent components={typographyComponents} />

export const typographyComponents: MDXComponents = {
    h1: (props) => <H1 {...props} />,
    h2: (props) => <H2 {...props} />,
    h3: (props) => <H3 {...props} />,
    h4: (props) => <H4 {...props} />,
    p: (props) => <BodyText {...props} />,
    ul: (props) => <UnorderedList {...props} />,
    ol: (props) => <OrderedList {...props} />,
    li: (props) => <ListItem {...props} />,
    code: (props) => <InlineCode {...props} />,
    pre: (props) => <CodeBlock {...props} />,
    blockquote: (props) => <BlockQuote {...props} />,
    hr: (props) => <Hr {...props} />,
    a: (props) => <TextLink {...props} />,
    img: (props) => <ContentImage {...props} />,
};
