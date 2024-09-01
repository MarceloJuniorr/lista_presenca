const mysql = require('mysql');
require('dotenv').config(); // Carrega variáveis de ambiente do arquivo .env

const connection = mysql.createConnection({
    host: process.env.DB_HOST,       // Substitui pelo host do MySQL do .env
    user: process.env.DB_USER,       // Substitui pelo usuário do MySQL do .env
    password: process.env.DB_PASSWORD,   // Substitui pela senha do MySQL do .env
    database: process.env.DB_DATABASE   // Substitui pelo nome do banco de dados do .env
});

connection.connect((err) => {
    if (err) throw err;
    console.log('Conectado ao banco de dados MySQL!');
});

module.exports = connection;
