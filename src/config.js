require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}`);
  return value;
}

module.exports = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT || 3040),
  DATABASE_URL: required("DATABASE_URL"),
  SESSION_SECRET: required("SESSION_SECRET"),
  APP_BASE_URL: process.env.APP_BASE_URL || "http://127.0.0.1:3040",
  UPLOAD_DIR: process.env.UPLOAD_DIR || "E:\\Bussola300\\uploads",
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || "admin@bussola300.local",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "",
  ADMIN_NAME: process.env.ADMIN_NAME || "Administrador"
};
