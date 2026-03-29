
import { createClient } from '@supabase/supabase-js'
import { dbg, shouldDebugBooking } from "../lib/debug";

const runtimeEnv = (typeof window !== "undefined" && window.__TABIBI_ENV__) ? window.__TABIBI_ENV__ : {}
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || runtimeEnv.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || runtimeEnv.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase Environment Variables!', { hasUrl: !!supabaseUrl, hasAnonKey: !!supabaseKey })
} else if (import.meta.env.DEV) {
    console.log('Supabase initialized with URL:', supabaseUrl, 'Key ends with:', supabaseKey.slice(-10));
}

const debugFetch = async (...args) => {
    const enabled = shouldDebugBooking();
    const input = args[0];
    const init = args[1] || {};

    const url = input instanceof Request ? input.url : String(input);
    const method = (input instanceof Request ? input.method : init.method) || "GET";

    const isEdgeFunction = url.includes("/functions/v1/");
    const shouldLog = enabled && (url.includes("/rest/v1/") || isEdgeFunction);

    if (shouldLog) {
        const headersObj = {};
        const headers = input instanceof Request ? input.headers : init.headers;
        try {
            if (headers) {
                const h = headers instanceof Headers ? headers : new Headers(headers);
                for (const [k, v] of h.entries()) {
                    const key = k.toLowerCase();
                    if (key === "apikey" || key === "authorization") {
                        headersObj[k] = "(HIDDEN)";
                        continue;
                    }
                    headersObj[k] = v;
                }
            }
            // If it's an Edge Function call from supabase-js, the apikey might be missing from headers 
            // but provided via some other internal mechanism if we're not careful with debugFetch
        } catch (e) {
            if (enabled) dbg("supabase/headerParseError", { message: e?.message });
        }
        dbg(`supabase/${isEdgeFunction ? 'function' : 'request'}`, { method, url, headers: headersObj });
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

    if (method.toUpperCase() !== "GET" && (url.includes("/rest/v1/patients") || url.includes("/functions/v1/"))) {
        try {
            if (input instanceof Request) {
                const text = await input.clone().text();
                if (enabled && url.includes("/rest/v1/patients")) {
                    const sanitized = sanitizeJsonText(text);
                    dbg("supabase/patients/requestBody", sanitized);
                    if (sanitized !== text) {
                        const newRequest = new Request(input, { body: sanitized });
                        for (const [k, v] of input.headers.entries()) {
                            newRequest.headers.set(k, v);
                        }
                        sanitizedArgs = [newRequest];
                    }
                } else if (enabled && isEdgeFunction) {
                    dbg("supabase/function/requestBody", text);
                }
            } else if (init?.body) {
                const bodyText = typeof init.body === "string" ? init.body : String(init.body);
                if (enabled && url.includes("/rest/v1/patients")) {
                    const sanitized = sanitizeJsonText(bodyText);
                    dbg("supabase/patients/requestBody", sanitized);
                    if (sanitized !== bodyText) {
                        sanitizedArgs = [input, { ...init, body: sanitized }];
                    }
                } else if (enabled && isEdgeFunction) {
                    dbg("supabase/function/requestBody", bodyText);
                }
            }
        } catch (e) {
            dbg("supabase/requestBodyError", { message: e?.message });
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
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
    },
    global: {
        fetch: debugFetch,
    },
})

export default supabase
export const isSupabaseConfigured = !!supabaseUrl && !!supabaseKey
