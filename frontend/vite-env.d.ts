/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: "http://localhost:8080"; // example API base URL
    // more env variables...
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
