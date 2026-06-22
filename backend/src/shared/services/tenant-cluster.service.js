const env = require('../../config/env');
const { sequelize } = require('../../config/database');

const sanitizeTenantKey = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);

const getClusterMetadata = () => ({
  cluster_name: `${env.DB_NAME || 'eduova'}-cluster`,
  engine: 'postgresql',
  host: env.DB_HOST || 'localhost',
  port: Number(env.DB_PORT || 5432),
  strategy: 'single_cluster_multi_database',
});

const buildTenantDatabaseName = ({ code, name }) => {
  const base = sanitizeTenantKey(code || name || 'tenant');
  return `eduova_${base}`;
};

const buildTenantDatabaseConfig = ({ code, name }) => {
  const cluster = getClusterMetadata();
  const database_name = buildTenantDatabaseName({ code, name });

  return {
    ...cluster,
    database_name,
    database_user: env.DB_USER || 'postgres',
    schema_name: 'public',
    provision_status: 'provisioned',
  };
};

const provisionTenantDatabase = async ({ code, name }) => {
  const config = buildTenantDatabaseConfig({ code, name });

  if (!sequelize || typeof sequelize.query !== 'function') {
    return config;
  }

  try {
    const [rows] = await sequelize.query(
      `SELECT datname FROM pg_database WHERE datname = '${config.database_name}'`
    );

    if (!rows.length) {
      await sequelize.query(`CREATE DATABASE "${config.database_name}"`);
      config.provision_status = 'provisioned';
    } else {
      config.provision_status = 'existing';
    }
  } catch (_error) {
    config.provision_status = 'pending_manual_provision';
  }

  return config;
};

module.exports = {
  sanitizeTenantKey,
  getClusterMetadata,
  buildTenantDatabaseName,
  buildTenantDatabaseConfig,
  provisionTenantDatabase,
};
