
import { createClient } from '@supabase/supabase-js'
import { dbg, shouldDebugBooking } from "../lib/debug";

const runtimeEnv = (typeof window !== "undefined" && window.__TABIBI_ENV__) ? window.__TABIBI_ENV__ : {}
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || runtimeEnv.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || runtimeEnv.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase Environment Variables!', { hasUrl: !!supabaseUrl, hasAnonKey: !!supabaseKey })
}

const debugFetch = async (...args) => {
    const enabled = shouldDebugBooking();
    const input = args[0];
    const init = args[1] || {};

    const url = input instanceof Request ? input.url : String(input);
    const method = (input instanceof Request ? input.method : init.method) || "GET";

    const shouldLog = enabled && url.includes("/rest/v1/");

    if (shouldLog) {
        const headersObj = {};
        const headers = input instanceof Request ? input.headers : init.headers;
        try {
            if (headers) {
                const h = headers instanceof Headers ? headers : new Headers(headers);
                for (const [k, v] of h.entries()) {
                    const key = k.toLowerCase();
                    if (key === "apikey" || key === "authorization") continue;
                    headersObj[k] = v;
                }
            }
        } catch (e) {
            if (enabled) dbg("supabase/headerParseError", { message: e?.message });
        }
        dbg("supabase/request", { method, url, headers: headersObj });
    }

    const sanitizeJsonText = (text) => {
        try {
            const data = JSON.parse(text);
            const walk = (v) => {
                if (v === Infinity || v === -Infinity || (typeof v === "number" && !Number.isFinite(v))) return null;
                if (typeof v === "string") {
                    const s = v.trim().toLowerCase();
                    if (s === "infinity" || s === "+infinity" || s === "-infinity" || s === "nan") return null;
                    return v;
                }
                if (Array.isArray(v)) return v.map(walk);
                if (v && typeof v === "object") {
                    for (const k of Object.keys(v)) v[k] = walk(v[k]);
                    return v;
                }
                return v;
            };
            return JSON.stringify(walk(data));
        } catch {
            return text;
        }
    };

    let sanitizedArgs = args;

    if (method.toUpperCase() !== "GET" && url.includes("/rest/v1/patients")) {
        try {
            if (input instanceof Request) {
                const cloned = input.clone();
                const text = await cloned.text();
                const sanitized = sanitizeJsonText(text);
                if (enabled) dbg("supabase/patients/requestBody", sanitized);
                if (sanitized !== text) {
                    sanitizedArgs = [new Request(input, { body: sanitized })];
                }
            } else if (init?.body) {
                const bodyText = typeof init.body === "string" ? init.body : String(init.body);
                const sanitized = sanitizeJsonText(bodyText);
                if (enabled) dbg("supabase/patients/requestBody", sanitized);
                if (sanitized !== bodyText) {
                    sanitizedArgs = [input, { ...init, body: sanitized }];
                }
            }
        } catch (e) {
            dbg("supabase/patients/requestBodyError", { message: e?.message });
        }
    }

    try {
        const res = await fetch(...sanitizedArgs);

        if (shouldLog && !res.ok) {
            try {
                const cloned = res.clone();
                const text = await cloned.text();
                dbg("supabase/responseError", { url, status: res.status, body: text });
            } catch {
                dbg("supabase/responseError", { url, status: res.status });
            }
        }

        return res;
    } catch (e) {
        if (enabled) dbg("supabase/fetchError", { url, method, message: e?.message });
        return new Response(JSON.stringify({ message: "Network error", url }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
        });
    }
};

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: false,
        detectSessionInUrl: true,
        storage: window.localStorage,
    },
    global: {
        fetch: debugFetch,
    },
})

export default supabase
export const isSupabaseConfigured = !!supabaseUrl && !!supabaseKey
