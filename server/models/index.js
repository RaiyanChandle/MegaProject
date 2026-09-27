import sequelize from "../config/database.js";
import HealthCheck from "./HealthCheck.js";

const db = {
  sequelize,
  HealthCheck,
};

export { sequelize, HealthCheck };
export default db;
