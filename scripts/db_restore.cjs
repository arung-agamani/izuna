const dotenv = require("dotenv");
const cp = require("child_process");

dotenv.config();

const localDb = process.env["LOCAL_DATABASE_URL"];
// const PG_HOST = process.env["PG_HOST"];
// const PG_PORT = process.env["PG_PORT"] || 5432;
// const PG_USER = process.env["PG_USER"];
// const PG_PASS = process.env["PG_PASS"];
// const PG_NAME = process.env["PG_NAME"];
const filename = `db_backup_${new Date().toDateString().replace(/ /gi, "_")}.tar`;
// console.log("Begin dumping...");
// cp.execSync(`pg_dump --dbname=postgres://${PG_USER}:${PG_PASS}@${PG_HOST}:${PG_PORT}/${PG_NAME} -f "db_backup_${new Date().toDateString()}.tar" -F t`);
// cp.execSync(`pg_dump --dbname=${remoteDb} -f "${filename}" -F t`);
// console.log("Finished dumping");
console.log("Begin restoring");
cp.execSync(`pg_restore --dbname=${localDb} -c -F t "${filename}`);
console.log("Finished syncing with local db");
