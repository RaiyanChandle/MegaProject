/**
 * =====================================================================
 * GOOGLE TRANSLATE API SERVICE FOR PARENT UI
 * =====================================================================
 * Provides high-speed translation across Indian regional languages:
 * Hindi (hi), Marathi (mr), Gujarati (gu), Bengali (bn),
 * Tamil (ta), Telugu (te), Kannada (kn), and English (en).
 * 
 * Features:
 * 1. In-memory and SessionStorage caching for instant zero-latency repeats.
 * 2. On-demand translation of dynamic backend strings (announcements, marks, notes).
 * 3. Dual-mode support: Programmatic API + Google Web Translator integration.
 * =====================================================================
 */

const translationCache = new Map();

// Load persistent session cache if available
try {
  const stored = sessionStorage.getItem('nexus_gt_cache');
  if (stored) {
    const parsed = JSON.parse(stored);
    Object.entries(parsed).forEach(([k, v]) => translationCache.set(k, v));
  }
} catch (e) {
  // Ignore sessionStorage errors in restricted environments
}

const persistCacheDebounced = (() => {
  let timer;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        const obj = Object.fromEntries(translationCache);
        sessionStorage.setItem('nexus_gt_cache', JSON.stringify(obj));
      } catch (e) {}
    }, 1000);
  };
})();

/**
 * Translate a single text string into the target language using Google Translate API.
 * 
 * @param {string} text - Text to translate
 * @param {string} targetLang - Target language code (e.g. 'mr', 'hi', 'gu', 'kn', etc.)
 * @param {string} [sourceLang='auto'] - Source language code
 * @returns {Promise<string>} Translated text string
 */
export async function translateText(text, targetLang = 'en', sourceLang = 'auto') {
  if (!text || typeof text !== 'string') return text;
  
  const trimmed = text.trim();
  if (!trimmed || targetLang === 'en') return text;

  // Don't translate pure numbers, timestamps, IDs (STKIT/FCKIT/DAKIT/EXKIT/SAKIT) or codes
  if (/^[0-9\s.,:\-/–—%#]+$/.test(trimmed)) return text;
  if (/^(STKIT|FCKIT|DAKIT|SAKIT|EXKIT)[0-9]+$/i.test(trimmed)) return text;
  if (/^[A-Z]{2,4}[0-9]{3,4}$/.test(trimmed)) return text; // e.g. CS301, IT402

  const cacheKey = `${targetLang}:${trimmed}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(trimmed)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Google Translate HTTP error: ${response.status}`);
    }

    const data = await response.json();
    if (data && Array.isArray(data[0])) {
      const translated = data[0]
        .filter(part => part && part[0])
        .map(part => part[0])
        .join('');

      if (translated) {
        translationCache.set(cacheKey, translated);
        persistCacheDebounced();
        return translated;
      }
    }
  } catch (err) {
    console.warn(`[GoogleTranslate] Translation failed for "${trimmed.slice(0, 30)}...":`, err.message);
  }

  return text;
}

/**
 * Translate an array of text strings concurrently.
 * 
 * @param {Array<string>} texts - Array of strings
 * @param {string} targetLang - Target language code
 * @returns {Promise<Array<string>>}
 */
export async function translateBatch(texts = [], targetLang = 'en') {
  if (!texts || texts.length === 0 || targetLang === 'en') return texts;
  return Promise.all(texts.map(t => translateText(t, targetLang)));
}

/**
 * Initialize Google Web Translator DOM widget if not already present.
 */
export function initGoogleTranslateWidget() {
  if (typeof window === 'undefined') return;

  // Set up global init callback
  if (!window.googleTranslateElementInit) {
    window.googleTranslateElementInit = function () {
      if (window.google && window.google.translate && window.google.translate.TranslateElement) {
        try {
          new window.google.translate.TranslateElement(
            {
              pageLanguage: 'en',
              includedLanguages: 'en,hi,mr,gu,bn,ta,te,kn',
              autoDisplay: false
            },
            'google_translate_element'
          );
        } catch (e) {
          console.warn('Google Translate element init error:', e);
        }
      }
    };
  }

  // Inject hidden container if not in DOM
  if (!document.getElementById('google_translate_element')) {
    const div = document.createElement('div');
    div.id = 'google_translate_element';
    div.style.display = 'none';
    document.body.appendChild(div);
  }

  // Inject Google Translate script if not loaded
  if (!document.getElementById('google-translate-script')) {
    const script = document.createElement('script');
    script.id = 'google-translate-script';
    script.type = 'text/javascript';
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }
}

/**
 * Programmatically synchronize the Google Web Translator DOM widget to a specific language.
 * 
 * @param {string} langCode - Language code ('en', 'hi', 'mr', 'gu', 'bn', 'ta', 'te', 'kn')
 */
export function setGoogleWebTranslatorLanguage(langCode = 'en') {
  if (typeof document === 'undefined') return;

  try {
    const code = langCode || 'en';
    const hostname = window.location.hostname;

    if (code === 'en') {
      // Clear translation cookies to restore pristine English
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${hostname};`;
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${hostname};`;
    } else {
      const cookieValue = `/en/${code}`;
      document.cookie = `googtrans=${cookieValue}; path=/;`;
      document.cookie = `googtrans=${cookieValue}; path=/; domain=${hostname};`;
      document.cookie = `googtrans=${cookieValue}; path=/; domain=.${hostname};`;
    }

    // Trigger select element update if initialized
    const combo = document.querySelector('.goog-te-combo');
    if (combo) {
      combo.value = code;
      combo.dispatchEvent(new Event('change'));
    } else {
      setTimeout(() => {
        const delayedCombo = document.querySelector('.goog-te-combo');
        if (delayedCombo) {
          delayedCombo.value = code;
          delayedCombo.dispatchEvent(new Event('change'));
        }
      }, 600);
    }
  } catch (e) {
    console.warn('Error setting Google Translate language:', e);
  }
}
