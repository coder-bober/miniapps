import type { NextConfig } from "next";

/*
 ошибка UNABLE_TO_GET_ISSUER_CERT_LOCALLY потому что сертификат локальный в caddy
 проявляется например при попытке логина
 POST /en/sign-in?error=fetch%20failed 303 in 209ms (next.js: 46ms, generate-params: 41ms, application-code: 163ms)
  └─ ƒ signInAction({}) in 16ms src/app/[locale]/auth-actions.ts
 [TypeError: fetch failed] {
  [cause]: Error: unable to get local issuer certificate
      at ignore-listed frames {
    code: 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY'
  }
}

TODO make it only for dev env
*/
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['deb4', 'deb4.local'],
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
};

export default nextConfig;
