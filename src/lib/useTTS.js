import { useState, useCallback, useEffect, useRef } from 'react'

// ── Language detection ──
const FRENCH_PATTERNS = /\b(le|la|les|de|des|du|un|une|est|sont|dans|pour|avec|que|qui|ce|cette|ces|pas|sur|par|mais|ou|et|en|au|aux|je|tu|il|elle|nous|vous|ils|elles|mon|ma|mes|ton|ta|tes|son|sa|ses|notre|votre|leur|leurs|être|avoir|faire|aller|voir|dire|venir|pouvoir|vouloir|aussi|très|bien|beaucoup|peu|trop|comment|pourquoi|quand|où)\b/gi

function detectLanguage(text) {
    if (!text) return 'en-US'
    const words = text.toLowerCase().split(/\s+/)
    const frenchMatches = (text.match(FRENCH_PATTERNS) || []).length
    const ratio = frenchMatches / words.length
    return ratio > 0.15 ? 'fr-FR' : 'en-US'
}

// ── Get best voice for language ──
function getVoiceForLang(lang) {
    const voices = window.speechSynthesis?.getVoices() || []
    const langPrefix = lang.split('-')[0] // 'en' or 'fr'

    // Preferred voice names
    const preferred = lang === 'fr-FR'
        ? ['Google français', 'Thomas', 'Amelie', 'Marie']
        : ['Google US English', 'Google UK English', 'Samantha', 'Daniel']

    // Try preferred voices first
    for (const name of preferred) {
        const v = voices.find(v => v.name.includes(name) && v.lang.startsWith(langPrefix))
        if (v) return v
    }

    // Fallback: any voice matching the language
    return voices.find(v => v.lang.startsWith(langPrefix)) || voices[0] || null
}

// ── Settings persistence ──
const TTS_SETTINGS_KEY = 'flashmind_tts_settings'

export function getTTSSettings() {
    try {
        const stored = localStorage.getItem(TTS_SETTINGS_KEY)
        if (stored) return JSON.parse(stored)
    } catch { }
    return { rate: 1.0, autoPlay: false }
}

export function saveTTSSettings(settings) {
    localStorage.setItem(TTS_SETTINGS_KEY, JSON.stringify(settings))
}

// ── Hook ──
export function useTTS() {
    const [speaking, setSpeaking] = useState(false)
    const utteranceRef = useRef(null)

    // Preload voices (some browsers load async)
    useEffect(() => {
        const loadVoices = () => window.speechSynthesis?.getVoices()
        loadVoices()
        window.speechSynthesis?.addEventListener?.('voiceschanged', loadVoices)
        return () => window.speechSynthesis?.removeEventListener?.('voiceschanged', loadVoices)
    }, [])

    const speak = useCallback((text) => {
        if (!window.speechSynthesis || !text) return

        // Cancel any ongoing speech
        window.speechSynthesis.cancel()

        const settings = getTTSSettings()
        const lang = detectLanguage(text)
        const voice = getVoiceForLang(lang)

        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = lang
        utterance.rate = settings.rate
        utterance.pitch = 1
        if (voice) utterance.voice = voice

        utterance.onstart = () => setSpeaking(true)
        utterance.onend = () => setSpeaking(false)
        utterance.onerror = () => setSpeaking(false)

        utteranceRef.current = utterance
        window.speechSynthesis.speak(utterance)
    }, [])

    const stop = useCallback(() => {
        window.speechSynthesis?.cancel()
        setSpeaking(false)
    }, [])

    // Try autoplay (may fail on mobile due to browser restrictions)
    const tryAutoPlay = useCallback((text) => {
        const settings = getTTSSettings()
        if (!settings.autoPlay) return
        try {
            speak(text)
        } catch {
            // Silently fail — user will need to click manually
        }
    }, [speak])

    // Cleanup on unmount
    useEffect(() => {
        return () => window.speechSynthesis?.cancel()
    }, [])

    return { speak, stop, speaking, tryAutoPlay }
}
