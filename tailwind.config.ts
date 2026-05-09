import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // surface
        bg:           "#f4f5f1",
        "bg-soft":    "#fbfbf7",
        "bg-deep":    "#eaecdf",
        "bg-card":    "#fdfdfa",
        // ink
        ink:          "#0e0e0e",
        "ink-soft":   "#2a2a28",
        slate:        "#6b6e6a",
        // line
        frost:        "#d6d8cf",
        "frost-soft": "#e8e9e1",
        // signal
        signal:       "#ff3a1c",
        "signal-soft":"#ffd9d0",
        "signal-deep":"#c42d12",
        // plot accent
        plot:         "#2c5e52",

        // legacy aliases (keep so any leftover class refs render the new palette)
        paper:        "#f4f5f1",
        "paper-soft": "#fbfbf7",
        "paper-deep": "#eaecdf",
        "ink-mute":   "#6b6e6a",
        line:         "#d6d8cf",
        "line-soft":  "#e8e9e1",
        rust:         "#ff3a1c",
        "rust-soft":  "#ffd9d0",
        "rust-deep":  "#c42d12",
        clay:         "#a8a89e",
        sage:         "#2c5e52",
      },
      fontFamily: {
        display: ['"Cabinet Grotesk"', '"Noto Sans SC"', "sans-serif"],
        sans:    ['"Cabinet Grotesk"', '"Noto Sans SC"', "sans-serif"],
        body:    ['"Cabinet Grotesk"', '"Noto Sans SC"', "sans-serif"],
        mono:    ['"Geist Mono"', "ui-monospace", "Menlo", "monospace"],
        italic:  ['"Instrument Serif"', '"Noto Serif SC"', "serif"],
        // legacy aliases
        serifcn: ['"Cabinet Grotesk"', '"Noto Sans SC"', "sans-serif"],
        kai:     ['"Instrument Serif"', '"Noto Serif SC"', "serif"],
      },
      letterSpacing: {
        widest: "0.18em",
        widerer: "0.15em",
      },
    },
  },
  plugins: [],
};

export default config;
