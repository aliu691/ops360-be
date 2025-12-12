// import { TypeOrmModuleOptions } from '@nestjs/typeorm';

// const ormconfig: TypeOrmModuleOptions = {
//   type: 'postgres',
//   host: process.env.DATABASE_HOST || 'localhost',
//   port: Number(process.env.DATABASE_PORT) || 5432,
//   username: process.env.DATABASE_USER || 'postgres',
//   password: process.env.DATABASE_PASSWORD || 'password',
//   database: process.env.DATABASE_NAME || 'ops360',
//   autoLoadEntities: true,
//   synchronize: true, // ⚠️ OK for development, turn off in production
// };

// export default ormconfig;

import { TypeOrmModuleOptions } from '@nestjs/typeorm';

const ormconfig: TypeOrmModuleOptions = {
  type: 'sqlite',

  // Store DB in a safe writable folder
  database: 'data/ops360.sqlite',

  autoLoadEntities: true,
  synchronize: true, // Auto-create / update tables
  logging: false,
};

export default ormconfig;
