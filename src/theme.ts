import { createTheme } from "@mantine/core";

export const theme = createTheme({
  primaryColor: "teal",
  fontFamily: "var(--font-manrope), sans-serif",
  fontFamilyMonospace: "var(--font-space-grotesk), monospace",
  headings: {
    fontFamily: "var(--font-space-grotesk), sans-serif",
    fontWeight: "700",
  },
  defaultRadius: "md",
  colors: {
    midnight: [
      "#eef6f7",
      "#dce7ea",
      "#b7cdd4",
      "#91b3be",
      "#6d98a8",
      "#537f8f",
      "#406371",
      "#2d4752",
      "#1a2b34",
      "#091217",
    ],
  },
  primaryShade: 5,
});
