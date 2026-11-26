/** Shared with the static prototype, so a visitor's choice carries across both. */
export const THEME_STORAGE_KEY = "tcc:theme";

/**
 * Runs before first paint (inlined in <head>) to apply a saved theme without a flash.
 * Without a saved choice, design/tokens.css follows the OS preference.
 */
export const themeInitScript = `try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t)}catch(e){}`;
