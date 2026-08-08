// Test environment hygiene — runs before every test file's imports.
// Forces NODE_ENV=test so modules with env-dependent side effects (winston transports, Loki) stay inert.
process.env["NODE_ENV"] = "test";

export {};
