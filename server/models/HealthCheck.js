import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const HealthCheck = sequelize.define("HealthCheck", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  message: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

export default HealthCheck;