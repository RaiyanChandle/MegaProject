import "dotenv/config";

const sslConfig = {
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
};

export default {
  development: {
    url: process.env.DATABASE_URL,
    dialect: "postgres",
    ...sslConfig,
  },

  test: {
    url: process.env.DATABASE_URL,
    dialect: "postgres",
    ...sslConfig,
  },

  staging: {
    url: process.env.DATABASE_URL,
    dialect: "postgres",
    ...sslConfig,
  },

  production: {
    url: process.env.DATABASE_URL,
    dialect: "postgres",
    ...sslConfig,
  },
};