// Site fonts, self-hosted from npm (@fontsource) instead of next/font/google:
// on 25 Nov 2026 Google Fonts started answering the build machines with an
// unexpected format and every build failed. The font files now ship with the
// site, so builds never depend on Google, and visitors' browsers never call Google either.
// The class names match how the old next/font objects were used (.className / .variable).
export const poppins = { className: 'mt-font-poppins' };
export const frauncesDisplay = { variable: 'mt-var-display-fraunces' };
export const unboundedDisplay = { variable: 'mt-var-display-unbounded' };
export const interBody = { variable: 'mt-var-body-inter' };
