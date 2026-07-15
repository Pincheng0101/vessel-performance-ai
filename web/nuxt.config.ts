// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  app: {
    baseURL: process.env.NUXT_APP_BASE_URL || '/',
    head: {
      link: [
        { rel: 'icon', type: 'image/png', href: process.env.APP_FAVICON_URL || '/favicon.png' },
      ],
    },
  },
  compatibilityDate: '2024-11-01',
  ssr: false,
  devtools: {
    enabled: true,
  },
  build: {
    transpile: [
      'vuetify',
    ],
  },
  sourcemap: {
    client: 'hidden',
    server: 'hidden',
  },
  css: [
    '~/assets/vuetify.scss',
    '~/assets/highlight.scss',
    '~/assets/markdown.scss',
    'katex/dist/katex.min.css',
  ],
  ignore: [
    (process.env.NODE_ENV === 'development' || process.env.AWS_ACCOUNT_ENV === 'dev') ? '' : 'playground',
  ],
  hooks: {
    // POC: ship only the datalake dashboard. Drop every other page from the
    // router (cuts build ~3x) and redirect the root to /dashboard.
    'pages:extend'(pages) {
      const keep = (p: { path: string }) => p.path === '/dashboard' || p.path.startsWith('/dashboard/');
      const filtered = pages.filter(keep);
      filtered.push({ name: 'index', path: '/', redirect: '/dashboard' });
      // Any other path lands on the dashboard too. The catch-all has the lowest match
      // priority, so /dashboard and /dashboard/* still resolve to their own pages.
      filtered.push({ name: 'catch-all', path: '/:pathMatch(.*)*', redirect: '/dashboard' });
      pages.splice(0, pages.length, ...filtered);
    },
  },
  modules: [
    '@nuxt/test-utils/module',
    '@nuxtjs/device',
    '@nuxtjs/google-fonts',
    '@nuxtjs/i18n',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    'dayjs-nuxt',
    'vuetify-nuxt-module',
  ],
  vuetify: {
    moduleOptions: {
      styles: {
        configFile: '/assets/vuetify.scss',
      },
    },
    vuetifyOptions: './vuetify.config.js',
  },
  googleFonts: {
    families: {
      Roboto: {
        wght: [400, 500, 700],
      },
    },
  },
  features: {
    // Set to false only when ssr mode is on
    // inlineStyles: false,
  },
  i18n: {
    locales: [
      'en',
      'zh-TW',
    ],
    defaultLocale: 'en',
    strategy: 'no_prefix',
    detectBrowserLanguage: false,
  },
  dayjs: {
    locales: [
      'en',
      'zh-tw', // Use lowercase
    ],
    plugins: [
      'customParseFormat',
      'duration',
      'relativeTime',
      'timezone',
      'utc',
    ],
  },
  appConfig: {
    appName: process.env.APP_NAME || 'Headquarter.ai',
  },
  runtimeConfig: {
    public: {
      appVersion: process.env.APP_VERSION,
      appLogoLightUrl: process.env.APP_LOGO_LIGHT_URL,
      appLogoDarkUrl: process.env.APP_LOGO_DARK_URL,
      serverApiUrl: process.env.SERVER_API_URL,
      serverWsApiUrl: process.env.SERVER_API_WS_URL,
      agentcoreRuntimeArn: process.env.AGENTCORE_RUNTIME_ARN,
      agentcoreRegion: process.env.AGENTCORE_REGION || 'us-west-2',
      agentcoreTokenEndpoint: process.env.AGENTCORE_TOKEN_ENDPOINT,
      agentcoreClientId: process.env.AGENTCORE_CLIENT_ID,
      agentcoreClientSecret: process.env.AGENTCORE_CLIENT_SECRET,
      agentcoreTokenScope: process.env.AGENTCORE_TOKEN_SCOPE || 'genbi/invoke',
      awsAccountEnv: process.env.AWS_ACCOUNT_ENV,
      awsCognitoApiUrl: process.env.AWS_COGNITO_API_URL,
      awsCognitoClientId: process.env.AWS_COGNITO_CLIENT_ID,
      rollbarClientToken: process.env.ROLLBAR_CLIENT_TOKEN,
      isFirstPartyEnv: ['dev', 'platform'].includes(String(process.env.AWS_ACCOUNT_ENV)),
      appManagementConsoleGroups: process.env.APP_MANAGEMENT_CONSOLE_GROUPS,
    },
  },
});
