import { createContext, useState, useMemo } from "react";
import { createTheme } from "@mui/material/styles";

// ─── Brand Palette ───────────────────────────────────────────────────────────
// primaryNavy      : #000000  – main brand / dark backgrounds
// accentTeal       : #333333  – highlights & accents  (replaces greenAccent)
// accentOrange     : #FF5E00  – call-to-action        (replaces redAccent)
// accentGold       : #FFD700  – premium / membership  (bonus use)
// textDark         : #333333  – body text
// grayLight        : #F5F5F5  – light backgrounds
// white            : #FFFFFF  – cards / text
// brand-grey-border: #E5E7EB  – borders
// ─────────────────────────────────────────────────────────────────────────────

// color design tokens export
export const tokens = (mode) => ({
  ...(mode === "dark"
    ? {
        // ── DARK MODE ──────────────────────────────────────────────────────
        grey: {
          100: "#F5F5F5", 
          200: "#d9d9d9",
          300: "#bfbfbf",
          400: "#a6a6a6",
          500: "#8c8c8c",
          600: "#737373",
          700: "#595959",
          800: "#404040",
          900: "#1a1a1a",
        },
        primary: {
          100: "#d0d1e0",
          200: "#a1a3c2",
          300: "#7274a3",
          400: "#333333", // card / panel background
          500: "#000000", // main background
          600: "#000000",
          700: "#000000",
          800: "#000000",
          900: "#000000",
        },
        // greyscale based (was teal)
        greenAccent: {
          100: "#f0f0f0",
          200: "#e0e0e0",
          300: "#d0d0d0",
          400: "#c0c0c0",
          500: "#ffffff", // main accent in dark mode
          600: "#b0b0b0",
          700: "#a0a0a0",
          800: "#909090",
          900: "#808080",
        },
        // greyscale based (was orange)
        redAccent: {
          100: "#f5f5f5",
          200: "#eeeeee",
          300: "#e0e0e0",
          400: "#bdbdbd",
          500: "#9e9e9e", 
          600: "#757575",
          700: "#616161",
          800: "#424242",
          900: "#212121",
        },
        // dark shades
        blueAccent: {
          100: "#e0e0e0",
          200: "#bdbdbd",
          300: "#333333", 
          400: "#212121",
          500: "#000000", 
          600: "#000000",
          700: "#1a1a1a", 
          800: "#000000",
          900: "#000000",
        },
      }
    : {
        // ── LIGHT MODE
        grey: {
          100: "#000000", // darkest text
          200: "#1a1a1a", // primary text
          300: "#333333", // secondary text
          400: "#555555", // tertiary text
          500: "#777777", // disabled text
          600: "#999999", // borders
          700: "#bdbdbd", // light borders
          800: "#e0e0e0", // light backgrounds
          900: "#f5f5f5", // lightest background
        },
        primary: {
          100: "#000000",
          200: "#1a1a1a",
          300: "#333333",
          400: "#ffffff", // white card background
          500: "#000000", // primary black for headers
          600: "#1a1a1a",
          700: "#262626",
          800: "#333333",
          900: "#404040",
        },
        // greyscale accent
        greenAccent: {
          100: "#f5f5f5",
          200: "#e0e0e0",
          300: "#bdbdbd",
          400: "#9e9e9e",
          500: "#333333", // primary dark accent
          600: "#424242",
          700: "#616161",
          800: "#757575",
          900: "#9e9e9e",
        },
        // greyscale accent
        redAccent: {
          100: "#f5f5f5",
          200: "#eeeeee",
          300: "#e0e0e0",
          400: "#bdbdbd",
          500: "#666666", // secondary dark accent
          600: "#757575",
          700: "#616161",
          800: "#424242",
          900: "#212121",
        },
        // black/grey shades for headers and emphasis
        blueAccent: {
          100: "#f5f5f5",
          200: "#e0e0e0",
          300: "#bdbdbd",
          400: "#000000",
          500: "#000000", // primary black
          600: "#1a1a1a",
          700: "#1a1a1a", // header background
          800: "#262626",
          900: "#333333",
        },
      })
});

// mui theme settings
export const themeSettings = (mode) => {
  const colors = tokens(mode);
  return {
    palette: {
      mode: mode,
      ...(mode === "dark"
        ? {
            // palette values for dark mode
            primary: {
              main: colors.primary[500], // #000000 – primaryNavy
            },
            secondary: {
              main: colors.greenAccent[500], // #333333 – accentTeal
            },
            neutral: {
              dark: colors.grey[700],
              main: colors.grey[500],
              light: colors.grey[100],
            },
            background: {
              default: colors.primary[500], // #000000
            },
          }
        : {
            // palette values for light mode
            primary: {
              main: colors.primary[100],
            },
            secondary: {
              main: colors.greenAccent[500], // #333333 – accentTeal
            },
            neutral: {
              dark: colors.grey[700],
              main: colors.grey[500],
              light: colors.grey[100],
            },
            background: {
              default: "#F5F5F5", // grayLight – brand-grey
            },
          }),
    },
    typography: {
      fontFamily: ["Source Sans Pro", "sans-serif"].join(","),
      fontSize: 12,
      h1: {
        fontFamily: ["Source Sans Pro", "sans-serif"].join(","),
        fontSize: 40,
      },
      h2: {
        fontFamily: ["Source Sans Pro", "sans-serif"].join(","),
        fontSize: 32,
      },
      h3: {
        fontFamily: ["Source Sans Pro", "sans-serif"].join(","),
        fontSize: 24,
      },
      h4: {
        fontFamily: ["Source Sans Pro", "sans-serif"].join(","),
        fontSize: 20,
      },
      h5: {
        fontFamily: ["Source Sans Pro", "sans-serif"].join(","),
        fontSize: 16,
      },
      h6: {
        fontFamily: ["Source Sans Pro", "sans-serif"].join(","),
        fontSize: 14,
      },
    },
  };
};

// context for color mode
export const ColorModeContext = createContext({
  toggleColorMode: () => {},
});

export const useMode = () => {
  const [mode] = useState("light");

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        // Light theme only - toggle disabled
        return;
      },
    }),
    []
  );

  const theme = useMemo(() => createTheme(themeSettings(mode)), [mode]);
  return [theme, colorMode];
};
