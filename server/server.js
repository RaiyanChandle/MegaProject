import "dotenv/config";
import express from "express";
import cors from "cors";

import sequelize from "./config/database.js";
import HealthCheck from "./models/HealthCheck.js";

const app = express();

const PORT = process.env.PORT || 5000;
const APP_NAME = process.env.APP_NAME || "XS DevOps Demo";
const NODE_ENV = process.env.NODE_ENV || "development";

app.use(cors());
app.use(express.json());

import authRoutes from './routes/authRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import deptAdminRoutes from './routes/deptAdminRoutes.js';
import examStaffRoutes from './routes/examStaffRoutes.js';
import academicTermRoutes from './routes/academicTermRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import classRoutes from './routes/classRoutes.js';
import divisionRoutes from './routes/divisionRoutes.js';
import subjectRoutes from './routes/subjectRoutes.js';
import assessmentComponentRoutes from './routes/assessmentComponentRoutes.js';
import electiveRoutes from './routes/electiveRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';

app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/dept-admins', deptAdminRoutes);
app.use('/api/exam-staff', examStaffRoutes);
app.use('/api/academic-terms', academicTermRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/divisions', divisionRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/assessment-components', assessmentComponentRoutes);
app.use('/api/electives', electiveRoutes);
app.use('/api/teachers', teacherRoutes);

app.get("/api/health", async (req, res) => {
  try {
    await sequelize.authenticate();

    const healthCheck = await HealthCheck.create({
      message: "Health check successful",
    });

    res.json({
      status: "ok",
      app: APP_NAME,
      environment: NODE_ENV,
      database: "connected",
      message: healthCheck.message,
    });
  } catch (error) {
    console.error("Database error:", error);

    res.status(500).json({
      status: "error",
      database: "disconnected",
      message: "Database connection failed",
    });
  }
});

app.listen(PORT, async () => {
  try {
    await sequelize.authenticate();

    console.log("Database connected successfully");
    console.log(`${APP_NAME} running on port ${PORT}`);
  } catch (error) {
    console.error("Unable to connect to database:", error);
  }
});