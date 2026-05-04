/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string; // example API base URL
    // more env variables...
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
