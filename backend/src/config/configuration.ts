export default () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.BACKEND_PORT ?? '3000', 10),
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret-cambiar',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  },
  priceAlertThreshold: parseFloat(process.env.PRICE_ALERT_THRESHOLD ?? '20'),
  groq: {
    apiKey: process.env.GROQ_API_KEY ?? '',
  },
  database: {
    host: process.env.POSTGRES_HOST ?? 'localhost',
    port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
    user: process.env.POSTGRES_USER ?? 'ventas',
    password: process.env.POSTGRES_PASSWORD ?? '',
    name: process.env.POSTGRES_DB ?? 'registro_ventas',
  },
});
