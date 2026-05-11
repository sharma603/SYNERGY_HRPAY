const sql = process.env.DB_WINDOWS_AUTH === 'true' 
  ? require('mssql/msnodesqlv8') 
  : require('mssql');

const useWindowsAuth = process.env.DB_WINDOWS_AUTH === 'true';

// Parse server and port
const serverPart = process.env.DB_SERVER || '';
const [server, port] = serverPart.split(',');

let config;

if (useWindowsAuth) {
  config = {
    server: server,
    port: port ? parseInt(port) : 1433,
    connectionString: `Driver={ODBC Driver 17 for SQL Server};Server=${process.env.DB_SERVER};Database=${process.env.DB_DATABASE};Trusted_Connection=yes;`,
  };
} else {
  config = {
    server: server,
    port: port ? parseInt(port) : 1433,
    database: process.env.DB_DATABASE,
    authentication: {
      type: 'default',
      options: {
        userName: process.env.DB_USER,
        password: process.env.DB_PASSWORD
      }
    },
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: process.env.DB_TRUST_CERTIFICATE === 'true',
      connectionTimeout: 30000,
      requestTimeout: 30000
    }
  };
}

let poolPromise = null;

async function getConnection() {
  if (poolPromise) return poolPromise;

  poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(pool => {
      console.log('Connected to MSSQL');
      return pool;
    })
    .catch(err => {
      poolPromise = null;
      console.error('Database Connection Failed! Bad Config: ', err);
      throw err;
    });

  return poolPromise;
}

module.exports = { getConnection, config, sql };
