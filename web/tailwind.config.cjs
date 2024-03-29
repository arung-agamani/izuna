const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
    content: ["./src/**/*.{js,jsx,ts,tsx,md,mdx}"],
    theme: {
        screens: {
            xs: "320px",
            ...defaultTheme.screens,
        },
    },
    plugins: [],
};
