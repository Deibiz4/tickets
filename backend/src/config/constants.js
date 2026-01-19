require('dotenv').config();

module.exports = {
    JWT_SECRET: process.env.JWT_SECRET || 'clave_secreta_super_segura_para_desarrollo_fix_401',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d'
};
