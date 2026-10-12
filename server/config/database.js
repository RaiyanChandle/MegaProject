import "dotenv/config";
import dns from "node:dns";
import { Sequelize } from "sequelize";

// Prioritize IPv4 resolution to prevent ECONNRESET/timeouts on networks without public IPv6 routing
dns.setDefaultResultOrder("ipv4first");

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
    keepAlive: true,
  },
  retry: {
    max: 3,
    match: [
      /ECONNRESET/,
      /Connection terminated unexpectedly/,
      /Authentication timed out/,
      /SequelizeConnectionError/,
      /ETIMEDOUT/
    ]
  }
});

export default sequelize;