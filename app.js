/**
 * Premium Material Design Palette Generator - app.js
 * 
 * Expanded features:
 * - Color conversion utilities (Hex, RGB, HSL)
 * - WCAG 2.0 AA contrast ratio (4.5:1 target) check
 * - Automatic tone (50-900) detection based on luminance
 * - Multi-hue rotation algorithm using ideal shift differences
 * - HSL saturation/lightness affinity integration for color harmony
 * - Dynamic view toggle (Single Palette vs 19-Hue Full Matrix)
 * - Single/Batch Code generator (CSS Variables, Tailwind CSS config, SCSS)
 * - Batch Figma Variables CSV (primitive/red/100) & JSON Design Tokens exporter
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    const state = {
        baseColor: '#3f51b5',        // Current primary baseline color (Hex)
        colorName: 'indigo',         // Base brand identifier
        detectedTone: 500,           // Auto-analyzed tone for baseline
        selectedTone: 500,           // User-forced tone baseline
        generationMode: 'natural',    // 'natural' or 'strict'
        currentTheme: 'dark',        // 'dark' or 'light'
        generatedPalette: {},        // Current single selected tone palette (14 colors)
        generatedMatrix: {},         // Full 19-Hue x 14-Tone Matrix (266 colors)
        activeTab: 'css-vars',        // Currently viewed snippet tab
        activeView: 'single',        // 'single' (1 Hue) or 'matrix' (19 Hues)
        exportAllHuesCode: true      // True: output 266 variables in snippets, False: output 14
    };

    // --- DOM Elements ---
    const el = {
        colorPicker: document.getElementById('color-picker'),
        colorInput: document.getElementById('color-input'),
        pickerPreviewBtn: document.getElementById('picker-preview-btn'),
        colorNameInput: document.getElementById('color-name-input'),
        toneSlider: document.getElementById('tone-slider'),
        detectedToneBadge: document.getElementById('detected-tone-badge'),
        themeToggle: document.getElementById('theme-toggle'),
        paletteGrid: document.getElementById('palette-grid'),
        matrixGridContainer: document.getElementById('matrix-grid-container'),
        codeCssVars: document.getElementById('code-css-vars'),
        codeTailwind: document.getElementById('code-tailwind'),
        codeScss: document.getElementById('code-scss'),
        btnCopyCode: document.getElementById('btn-copy-code'),
        copyCodeText: document.getElementById('copy-code-text'),
        btnExportCsv: document.getElementById('btn-export-csv'),
        btnExportJson: document.getElementById('btn-export-json'),
        toastContainer: document.getElementById('toast-container'),
        radioGenModes: document.getElementsByName('gen-mode'),
        tabButtons: document.querySelectorAll('.tab-btn'),
        viewTabButtons: document.querySelectorAll('.view-tab-btn'),
        codeAllHuesToggle: document.getElementById('code-all-hues-toggle')
    };

    // --- Mapping Standard Material Tone array for 0-9 slider indices ---
    const TONE_VALUES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
    function indexToTone(index) {
        return TONE_VALUES[index];
    }
    function toneToIndex(tone) {
        const idx = TONE_VALUES.indexOf(tone);
        return idx !== -1 ? idx : 5; // Default to 500 (index 5)
    }

    // --- Material Design Standard 19 Hues Master Parameters ---
    // Standard baseline HSL values for 500-weight colors in classic MD.
    const MASTER_SCHEMES = [
        { key: 'red', name: 'Red', hue: 4, sat: 90, lit: 57, isSpecial: false },
        { key: 'pink', name: 'Pink', hue: 340, sat: 82, lit: 52, isSpecial: false },
        { key: 'purple', name: 'Purple', hue: 291, sat: 64, lit: 43, isSpecial: false },
        { key: 'deep-purple', name: 'Deep Purple', hue: 262, sat: 52, lit: 47, isSpecial: false },
        { key: 'indigo', name: 'Indigo', hue: 231, sat: 48, lit: 48, isSpecial: false },
        { key: 'blue', name: 'Blue', hue: 207, sat: 90, lit: 54, isSpecial: false },
        { key: 'light-blue', name: 'Light Blue', hue: 199, sat: 98, lit: 48, isSpecial: false },
        { key: 'cyan', name: 'Cyan', hue: 187, sat: 100, lit: 42, isSpecial: false },
        { key: 'teal', name: 'Teal', hue: 174, sat: 100, lit: 29, isSpecial: false },
        { key: 'green', name: 'Green', hue: 122, sat: 39, lit: 49, isSpecial: false },
        { key: 'light-green', name: 'Light Green', hue: 88, sat: 50, lit: 53, isSpecial: false },
        { key: 'lime', name: 'Lime', hue: 76, sat: 78, lit: 52, isSpecial: false },
        { key: 'yellow', name: 'Yellow', hue: 54, sat: 100, lit: 50, isSpecial: false },
        { key: 'amber', name: 'Amber', hue: 36, sat: 100, lit: 50, isSpecial: false },
        { key: 'orange', name: 'Orange', hue: 25, sat: 100, lit: 50, isSpecial: false },
        { key: 'deep-orange', name: 'Deep Orange', hue: 14, sat: 100, lit: 57, isSpecial: false },
        { key: 'brown', name: 'Brown', hue: 16, sat: 25, lit: 38, isSpecial: true },
        { key: 'grey', name: 'Grey', hue: 0, sat: 0, lit: 49, isSpecial: true },
        { key: 'blue-grey', name: 'Blue Grey', hue: 200, sat: 18, lit: 46, isSpecial: true }
    ];

    // Ideal relative luminance for mapping tone weights
    const IDEAL_LUMINANCES = {
        50: 0.93, 100: 0.83, 200: 0.69, 300: 0.54, 400: 0.39,
        500: 0.27, 600: 0.18, 700: 0.11, 800: 0.06, 900: 0.02
    };

    // HSL Lightness gradient curve
    const IDEAL_LIGHTNESS = {
        50: 0.95, 100: 0.88, 200: 0.78, 300: 0.67, 400: 0.55,
        500: 0.44, 600: 0.35, 700: 0.26, 800: 0.17, 900: 0.09
    };

    // Saturation scaling coefficients
    const SATURATION_FACTORS = {
        50: 0.22, 100: 0.42, 200: 0.68, 300: 0.88, 400: 0.95,
        500: 1.0, 600: 1.0, 700: 0.96, 800: 0.90, 900: 0.82
    };

    // --- Color Utility Functions ---

    function parseToHex(str) {
        if (!str) return null;
        let clean = str.replace(/[^0-9a-fA-F]/g, '');
        if (clean.length === 3) {
            clean = clean.split('').map(char => char + char).join('');
        }
        if (clean.length === 6) {
            return '#' + clean.toLowerCase();
        }
        return null;
    }

    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    function rgbToHex(r, g, b) {
        const clamp = val => Math.max(0, Math.min(255, Math.round(val)));
        return "#" + ((1 << 24) + (clamp(r) << 16) + (clamp(g) << 8) + clamp(b)).toString(16).slice(1);
    }

    function rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        return {
            h: Math.round(h * 360),
            s: Math.round(s * 100),
            l: Math.round(l * 100)
        };
    }

    function hslToRgb(h, s, l) {
        h /= 360; s /= 100; l /= 100;
        let r, g, b;

        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }

        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }

    // --- WCAG Contrast Calculations ---

    function calculateRelativeLuminance(r, g, b) {
        const a = [r, g, b].map(v => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }

    function getContrastRatio(lum1, lum2) {
        const l1 = Math.max(lum1, lum2);
        const l2 = Math.min(lum1, lum2);
        return (l1 + 0.05) / (l2 + 0.05);
    }

    function getAccessibilityDetails(bgColorHex) {
        const rgb = hexToRgb(bgColorHex);
        if (!rgb) return { textColor: '#ffffff', ratio: 1, passAA: false };

        const bgLum = calculateRelativeLuminance(rgb.r, rgb.g, rgb.b);
        const whiteLum = 1.0;
        const blackLum = 0.0;

        const ratioWithWhite = getContrastRatio(whiteLum, bgLum);
        const ratioWithBlack = getContrastRatio(bgLum, blackLum);

        const useWhiteText = ratioWithWhite >= ratioWithBlack;
        const bestRatio = useWhiteText ? ratioWithWhite : ratioWithBlack;
        const textColor = useWhiteText ? '#ffffff' : '#111827';

        return {
            textColor: textColor,
            ratio: bestRatio.toFixed(1),
            passAA: bestRatio >= 4.5
        };
    }

    // --- Ideal Tone Matcher ---

    function detectClosestTone(hex) {
        const rgb = hexToRgb(hex);
        if (!rgb) return 500;

        const inputLum = calculateRelativeLuminance(rgb.r, rgb.g, rgb.b);
        let closestTone = 500;
        let minDiff = Infinity;

        for (const [tone, idealLum] of Object.entries(IDEAL_LUMINANCES)) {
            const diff = Math.abs(inputLum - idealLum);
            if (diff < minDiff) {
                minDiff = diff;
                closestTone = parseInt(tone);
            }
        }

        return closestTone;
    }

    // --- Dynamic Color Palette Generation Algorithm (Single Hue) ---

    function generatePaletteForHue(baseHex, baseTone, hueVal, satMultiplier, litDelta, mode) {
        const rgb = hexToRgb(baseHex);
        const baseHsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        const palette = {};

        const tones = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
        
        tones.forEach(tone => {
            let newH = hueVal;
            let newS;
            let newL;

            if (mode === 'natural') {
                const targetL = IDEAL_LIGHTNESS[tone];
                const baseTargetL = IDEAL_LIGHTNESS[baseTone];

                // Compute Lightness with delta adjustment
                if (tone === baseTone) {
                    newL = Math.min(100, Math.max(0, baseHsl.l + litDelta));
                } else if (tone < baseTone) {
                    const localBaseL = baseHsl.l + litDelta;
                    newL = localBaseL + (100 - localBaseL) * ((targetL - baseTargetL) / (1 - baseTargetL));
                } else {
                    const localBaseL = baseHsl.l + litDelta;
                    newL = localBaseL * (targetL / baseTargetL);
                }

                // Compute Saturation applying multiplier scale
                newS = Math.min(100, Math.max(0, baseHsl.s * satMultiplier * (SATURATION_FACTORS[tone] / SATURATION_FACTORS[baseTone])));

                // Aesthetic hue shifting for cool/warm variations
                if (newH >= 190 && newH <= 260) {
                    if (tone < 500) newH = (newH - (500 - tone) * 0.02 + 360) % 360;
                    else newH = (newH + (tone - 500) * 0.02) % 360;
                } else if (newH >= 0 && newH <= 45) {
                    if (tone < 500) newH = (newH + (500 - tone) * 0.02) % 360;
                    else newH = (newH - (tone - 500) * 0.01 + 360) % 360;
                }
            } else {
                // Strict mapping
                newL = IDEAL_LIGHTNESS[tone] * 100;
                newS = Math.min(100, baseHsl.s * satMultiplier * SATURATION_FACTORS[tone]);
            }

            const newRgb = hslToRgb(newH, newS, newL);
            palette[tone] = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
        });

        // Accent / A-tones
        const accentTones = {
            'A100': { sOffset: 1.15, lTarget: 82 },
            'A200': { sOffset: 1.25, lTarget: 64 },
            'A400': { sOffset: 1.30, lTarget: 48 },
            'A700': { sOffset: 1.30, lTarget: 38 }
        };

        Object.entries(accentTones).forEach(([tone, config]) => {
            const accH = (hueVal + 2) % 360;
            const accS = Math.min(100, Math.max(82, baseHsl.s * satMultiplier * config.sOffset));
            const accL = config.lTarget;
            
            const accRgb = hslToRgb(accH, accS, accL);
            palette[tone] = rgbToHex(accRgb.r, accRgb.g, accRgb.b);
        });

        return palette;
    }

    // --- Dynamic Multi-Hue Matrix Generation ---

    // Analyzes the primary input color, determines standard hue diffs, and returns all 19 Hues
    function generateFullMatrix(baseHex, baseTone, mode) {
        const rgb = hexToRgb(baseHex);
        const baseHsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        
        // 1. Identify which master color our input hue belongs to
        let closestSchemeIndex = 4; // Default to Indigo
        let minDiff = Infinity;
        
        MASTER_SCHEMES.forEach((scheme, index) => {
            if (scheme.isSpecial) return; // Do not map color wheel delta onto grays/browns
            
            // Handle angle wrap-around for Hue delta matching
            let diff = Math.abs(baseHsl.h - scheme.hue);
            if (diff > 180) diff = 360 - diff;
            
            if (diff < minDiff) {
                minDiff = diff;
                closestSchemeIndex = index;
            }
        });

        const anchorScheme = MASTER_SCHEMES[closestSchemeIndex];
        // Hue Delta to rotate our standard wheel
        const hueDelta = (baseHsl.h - anchorScheme.hue + 360) % 360;

        const matrix = {};

        // 2. Generate each of the 19 color schemes
        MASTER_SCHEMES.forEach(scheme => {
            let targetHue;
            let satMultiplier = 1.0;
            let litDelta = 0;

            if (scheme.isSpecial) {
                // Grays, Blue Grays, and Browns have fixed color ranges
                targetHue = scheme.hue;
                
                // Blend a tiny hint of the input color hue (5%) to harmonize grays/browns
                if (scheme.key === 'grey') {
                    // Gray remains gray, but saturation slightly inherits baseline tone (approx 4%)
                    targetHue = baseHsl.h;
                    satMultiplier = 0.06; 
                } else if (scheme.key === 'blue-grey') {
                    // Blue-gray leans slightly towards input color
                    targetHue = (scheme.hue + (baseHsl.h - 200) * 0.15 + 360) % 360;
                    satMultiplier = 0.25;
                } else if (scheme.key === 'brown') {
                    targetHue = (scheme.hue + (baseHsl.h - 16) * 0.1 + 360) % 360;
                    satMultiplier = 0.45;
                }
            } else {
                // Apply rotated hue across color wheel
                targetHue = (scheme.hue + hueDelta) % 360;
                
                // Scale saturation based on ratio differences to keep brand consistency
                // If input color is 20% more saturated than its standard anchor, bump up other colors.
                const satScale = baseHsl.s / anchorScheme.sat;
                satMultiplier = Math.min(1.5, Math.max(0.6, satScale));

                // Scale lightness differences slightly to retain relative HSL weights
                litDelta = (baseHsl.l - anchorScheme.lit) * 0.35; 
            }

            matrix[scheme.key] = {
                name: scheme.name,
                isBaseHue: scheme.key === state.colorName,
                colors: generatePaletteForHue(baseHex, baseTone, targetHue, satMultiplier, litDelta, mode)
            };
        });

        return matrix;
    }

    // --- UI Renderers ---

    // 1. Single View Renderer
    function renderSingleGrid() {
        el.paletteGrid.innerHTML = '';
        const name = state.colorName.toLowerCase();
        
        // Ensure state contains single palette mapped from the master matrix
        if (state.generatedMatrix[name]) {
            state.generatedPalette = state.generatedMatrix[name].colors;
        } else {
            // Fallback
            state.generatedPalette = state.generatedMatrix['indigo'].colors;
        }

        Object.entries(state.generatedPalette).forEach(([tone, hex]) => {
            const isBase = (tone == state.selectedTone && name === state.colorName);
            const acc = getAccessibilityDetails(hex);

            const card = document.createElement('div');
            card.className = `color-card ${isBase ? 'is-base-color' : ''}`;
            card.style.backgroundColor = hex;
            card.style.color = acc.textColor;
            card.setAttribute('data-color', hex);
            card.setAttribute('data-tone', tone);

            card.innerHTML = `
                <div class="card-header">
                    <span class="color-weight">${tone}</span>
                    <span class="wcag-score" style="opacity: 0.8">${acc.passAA ? 'WCAG AA' : 'WCAG Fail'}</span>
                </div>
                <div class="card-ripple"></div>
                <div class="card-footer">
                    <span class="color-hex">${hex.toUpperCase()}</span>
                    <span class="wcag-ratio">Ratio: ${acc.ratio}</span>
                </div>
            `;

            card.addEventListener('click', (event) => {
                triggerRipple(card, event);
                copyTextToClipboard(hex, `色コード ${hex.toUpperCase()} (${tone}) をコピーしました！`);
            });

            el.paletteGrid.appendChild(card);
        });
    }

    // 2. Matrix View Renderer (Dynamic Table Grid)
    function renderMatrixGrid() {
        el.matrixGridContainer.innerHTML = '';

        // Create Grid wrapper
        const matrixGrid = document.createElement('div');
        matrixGrid.className = 'matrix-grid-layout';

        // Row tones sequence
        const tones = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 'A100', 'A200', 'A400', 'A700'];

        // --- ROW 1: HEADER (Corner label + 19 Hues names) ---
        // Corner empty cell
        const cornerCell = document.createElement('div');
        cornerCell.className = 'matrix-header-cell';
        cornerCell.textContent = '';
        matrixGrid.appendChild(cornerCell);

        // Header names
        MASTER_SCHEMES.forEach(scheme => {
            const headerCell = document.createElement('div');
            headerCell.className = 'matrix-header-cell';
            headerCell.textContent = scheme.name;
            headerCell.title = scheme.name;
            matrixGrid.appendChild(headerCell);
        });

        // --- ROWS 2-15: TONES GRIDS ---
        tones.forEach(tone => {
            // Row identifier cell (e.g. '50')
            const rowLabel = document.createElement('div');
            rowLabel.className = 'matrix-row-label';
            rowLabel.textContent = tone;
            matrixGrid.appendChild(rowLabel);

            // Matrix cells for each color hue under this tone
            MASTER_SCHEMES.forEach(scheme => {
                const hex = state.generatedMatrix[scheme.key].colors[tone];
                const acc = getAccessibilityDetails(hex);
                
                // Detect if this is the absolute matching base input color cell
                const isAbsoluteBase = (tone == state.selectedTone && scheme.key === state.colorName);

                const cell = document.createElement('div');
                cell.className = `matrix-cell ${isAbsoluteBase ? 'is-base-cell' : ''}`;
                cell.style.backgroundColor = hex;
                cell.style.color = acc.textColor;
                cell.setAttribute('data-color', hex);
                cell.setAttribute('data-tone', tone);
                cell.setAttribute('data-hue', scheme.name);
                
                // Compact tooltip styling triggers on hover via title
                cell.title = `${scheme.name} ${tone}\n${hex.toUpperCase()}\nWCAG: ${acc.ratio} (${acc.passAA ? 'AA Pass' : 'Fail'})`;

                cell.addEventListener('click', () => {
                    copyTextToClipboard(hex, `色コード ${hex.toUpperCase()} (${scheme.name} ${tone}) をコピーしました！`);
                });

                matrixGrid.appendChild(cell);
            });
        });

        el.matrixGridContainer.appendChild(matrixGrid);
    }

    // Ripple click visual effect
    function triggerRipple(element, event) {
        const ripple = element.querySelector('.card-ripple');
        if (!ripple) return;
        
        ripple.style.animation = 'none';
        ripple.offsetHeight; // Trigger reflow
        ripple.style.animation = 'rippleEffect 0.6s ease-out';
    }

    // Dynamic toast alerts
    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `
            <span class="toast-icon">✨</span>
            <span class="toast-message">${message}</span>
        `;
        el.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    // Clipboard copy wrapper
    function copyTextToClipboard(text, successMessage) {
        navigator.clipboard.writeText(text).then(() => {
            showToast(successMessage || 'クリップボードにコピーしました！');
        }).catch(err => {
            console.error('Copy failed: ', err);
            showToast('コピーに失敗しました');
        });
    }

    // --- Snippet Generators ---

    function generateCssVarsCode() {
        let code = `:root {\n`;
        
        if (state.exportAllHuesCode) {
            // Generate all 19 hues (266 variables)
            MASTER_SCHEMES.forEach(scheme => {
                code += `    /* --- ${scheme.name} Hues --- */\n`;
                Object.entries(state.generatedMatrix[scheme.key].colors).forEach(([tone, hex]) => {
                    code += `    --primitive-${scheme.key}-${tone.toLowerCase()}: ${hex.toLowerCase()};\n`;
                });
                code += `\n`;
            });
        } else {
            // Generate only active single hue (14 variables)
            const name = state.colorName.toLowerCase().replace(/\s+/g, '-');
            code += `    /* --- Selected Brand ${state.colorName} --- */\n`;
            Object.entries(state.generatedPalette).forEach(([tone, hex]) => {
                code += `    --primitive-${name}-${tone.toLowerCase()}: ${hex.toLowerCase()};\n`;
            });
        }
        
        code += `}`;
        return code;
    }

    function generateTailwindCode() {
        let code = `module.exports = {\n  theme: {\n    extend: {\n      colors: {\n`;
        
        if (state.exportAllHuesCode) {
            MASTER_SCHEMES.forEach(scheme => {
                code += `        '${scheme.key}': {\n`;
                Object.entries(state.generatedMatrix[scheme.key].colors).forEach(([tone, hex]) => {
                    code += `          '${tone.toLowerCase()}': '${hex.toLowerCase()}',\n`;
                });
                code += `        },\n`;
            });
        } else {
            const name = state.colorName.toLowerCase().replace(/\s+/g, '-');
            code += `        '${name}': {\n`;
            Object.entries(state.generatedPalette).forEach(([tone, hex]) => {
                code += `          '${tone.toLowerCase()}': '${hex.toLowerCase()}',\n`;
            });
            code += `        },\n`;
        }
        
        code += `      },\n    },\n  },\n};`;
        return code;
    }

    function generateScssCode() {
        let code = ``;
        
        if (state.exportAllHuesCode) {
            MASTER_SCHEMES.forEach(scheme => {
                code += `// --- Primitive ${scheme.name} colors ---\n`;
                Object.entries(state.generatedMatrix[scheme.key].colors).forEach(([tone, hex]) => {
                    code += `$primitive-${scheme.key}-${tone.toLowerCase()}: ${hex.toLowerCase()};\n`;
                });
                code += `\n`;
            });
        } else {
            const name = state.colorName.toLowerCase().replace(/\s+/g, '-');
            code += `// Primitive brand ${state.colorName} colors\n`;
            Object.entries(state.generatedPalette).forEach(([tone, hex]) => {
                code += `$primitive-${name}-${tone.toLowerCase()}: ${hex.toLowerCase()};\n`;
            });
        }
        
        return code;
    }

    function updateCodeSnippets() {
        el.codeCssVars.textContent = generateCssVarsCode();
        el.codeTailwind.textContent = generateTailwindCode();
        el.codeScss.textContent = generateScssCode();
    }

    // Tabs control
    el.tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            el.tabButtons.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            state.activeTab = tabId;

            document.getElementById(`tab-${tabId}`).classList.add('active');
        });
    });

    // Code toggle switch behavior
    el.codeAllHuesToggle.addEventListener('change', (e) => {
        state.exportAllHuesCode = e.target.checked;
        updateCodeSnippets();
    });

    el.btnCopyCode.addEventListener('click', () => {
        let textToCopy = '';
        let label = '';
        const scope = state.exportAllHuesCode ? '一括266色' : '選択色のみ';

        if (state.activeTab === 'css-vars') {
            textToCopy = generateCssVarsCode();
            label = `CSS Variables (${scope})`;
        } else if (state.activeTab === 'tailwind') {
            textToCopy = generateTailwindCode();
            label = `Tailwind CSS 設定オブジェクト (${scope})`;
        } else if (state.activeTab === 'scss') {
            textToCopy = generateScssCode();
            label = `SCSS 変数 (${scope})`;
        }

        copyTextToClipboard(textToCopy, `${label} をクリップボードにコピーしました！`);
        
        el.copyCodeText.textContent = 'コピー完了！';
        setTimeout(() => {
            el.copyCodeText.textContent = 'コピー';
        }, 1500);
    });

    // --- Dynamic Exporters ---

    // Figma Variables CSV Exporter (266 rows)
    function exportToCsv() {
        const baseName = state.colorName.toLowerCase().replace(/\s+/g, '-');
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Name,Value,Type\n";

        // Loop through all 19 Hues inside matrix to append all 266 colors
        MASTER_SCHEMES.forEach(scheme => {
            // If the hue scheme is our customized base hue, use our custom brand name
            const schemeName = scheme.key === 'indigo' ? baseName : scheme.key;
            
            Object.entries(state.generatedMatrix[scheme.key].colors).forEach(([tone, hex]) => {
                csvContent += `primitive/${schemeName}/${tone.toLowerCase()},${hex.toLowerCase()},Color\n`;
            });
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `primitive_${baseName}_matrix_palette.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast(`Figma用一括CSVをエクスポートしました！(266色/primitive/*)`);
    }

    // Design Tokens standard JSON Exporter (266 colors)
    function exportToJson() {
        const baseName = state.colorName.toLowerCase().replace(/\s+/g, '-');
        const tokenObj = {
            "primitive": {}
        };

        MASTER_SCHEMES.forEach(scheme => {
            const schemeName = scheme.key === 'indigo' ? baseName : scheme.key;
            tokenObj.primitive[schemeName] = {};

            Object.entries(state.generatedMatrix[scheme.key].colors).forEach(([tone, hex]) => {
                tokenObj.primitive[schemeName][tone.toLowerCase()] = {
                    "$value": hex.toLowerCase(),
                    "$type": "color",
                    "$description": `Generated Material Design Hue ${scheme.name} Tone ${tone} for base ${state.baseColor}`
                };
            });
        });

        const jsonString = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tokenObj, null, 2));
        const link = document.createElement("a");
        link.setAttribute("href", jsonString);
        link.setAttribute("download", `primitive_${baseName}_matrix_palette.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast(`Design Tokens 一括JSONファイルをエクスポートしました！`);
    }

    el.btnExportCsv.addEventListener('click', exportToCsv);
    el.btnExportJson.addEventListener('click', exportToJson);

    // --- View Toggle Tab Controls (Single vs Matrix) ---
    el.viewTabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            el.viewTabButtons.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.palette-view-content').forEach(v => v.classList.remove('active'));

            btn.classList.add('active');
            const viewId = btn.getAttribute('data-view');
            state.activeView = viewId;

            if (viewId === 'single') {
                document.getElementById('view-single').classList.add('active');
                renderSingleGrid();
            } else if (viewId === 'matrix') {
                document.getElementById('view-matrix').classList.add('active');
                renderMatrixGrid();
            }
        });
    });

    // --- UI Controls Event Listeners ---

    function onColorChange(newColorHex) {
        const hex = parseToHex(newColorHex);
        if (!hex) return;

        state.baseColor = hex;
        
        const autoTone = detectClosestTone(hex);
        state.detectedTone = autoTone;
        
        if (state.selectedTone === state.detectedTone) {
            state.selectedTone = autoTone;
            el.toneSlider.value = toneToIndex(autoTone);
        }

        updateToneBadge();
        regenerateAndRedraw();
    }

    function updateToneBadge() {
        const current = state.selectedTone;
        const auto = state.detectedTone;
        
        if (current === auto) {
            el.detectedToneBadge.textContent = `${current}番相当 (自動判定)`;
            el.detectedToneBadge.style.backgroundColor = 'var(--primary-accent)';
        } else {
            el.detectedToneBadge.textContent = `${current}番 (手動設定 - 自動: ${auto}番)`;
            el.detectedToneBadge.style.backgroundColor = '#f59e0b';
        }
    }

    function regenerateAndRedraw() {
        // Generate complete 19 Hues matrix一括!
        state.generatedMatrix = generateFullMatrix(state.baseColor, state.selectedTone, state.generationMode);
        
        // Re-draw active view
        if (state.activeView === 'single') {
            renderSingleGrid();
        } else {
            renderMatrixGrid();
        }
        
        updateCodeSnippets();
    }

    el.colorInput.addEventListener('input', (e) => {
        const val = e.target.value;
        const cleanHex = parseToHex(val);
        if (cleanHex) {
            el.colorPicker.value = cleanHex;
            onColorChange(cleanHex);
        }
    });

    el.colorPicker.addEventListener('input', (e) => {
        const val = e.target.value;
        el.colorInput.value = val.toUpperCase();
        onColorChange(val);
    });

    el.pickerPreviewBtn.addEventListener('click', () => {
        el.colorPicker.click();
    });

    el.colorNameInput.addEventListener('input', (e) => {
        let name = e.target.value.trim().toLowerCase().replace(/\s+/g, '-');
        if (name === '') name = 'primary';
        
        // Map Indigo (base) key standard reference to our custom name internally
        state.colorName = name;
        
        regenerateAndRedraw();
    });

    el.toneSlider.addEventListener('input', (e) => {
        state.selectedTone = indexToTone(parseInt(e.target.value));
        updateToneBadge();
        regenerateAndRedraw();
    });

    el.radioGenModes.forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.generationMode = e.target.value;
            regenerateAndRedraw();
        });
    });

    // --- Theme Controller (Dark/Light Mode) ---
    el.themeToggle.addEventListener('click', () => {
        const current = document.body.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        
        document.body.setAttribute('data-theme', next);
        state.currentTheme = next;
        
        const toggleIcon = el.themeToggle.querySelector('.toggle-icon');
        toggleIcon.textContent = next === 'light' ? '☀️' : '🌙';
    });

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        document.body.setAttribute('data-theme', 'light');
        state.currentTheme = 'light';
        el.themeToggle.querySelector('.toggle-icon').textContent = '☀️';
    } else {
        document.body.setAttribute('data-theme', 'dark');
    }

    // --- Initialization ---
    // Seed Indigo #3f51b5 as default
    onColorChange(state.baseColor);
});
