const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('../database/db');  // Certifique-se de que o caminho para o arquivo db.js esteja correto

const app = express();

// Configuração para processar dados JSON
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));  // Certifique-se de que o caminho para a pasta 'public' esteja correto

// Rota para salvar a confirmação de presença
app.post('/confirmar', (req, res) => {
    const { nome, whatsapp, acompanhantes } = req.body;

    // Verificação básica de dados
    if (!nome || !whatsapp) {
        return res.status(400).json({ success: false, message: 'Nome e WhatsApp são obrigatórios.' });
    }

    console.log('Dados recebidos:', req.body);  // Log para verificar os dados recebidos

    // Primeiro, salvar a pessoa principal
    const sqlPrincipal = 'INSERT INTO confirmacao_presenca (nome, whatsapp) VALUES (?, ?)';
    db.query(sqlPrincipal, [nome, whatsapp], (err, result) => {
        if (err) {
            console.error('Erro ao salvar pessoa principal:', err);
            return res.status(500).json({ success: false, message: 'Erro ao registrar a confirmação de presença.' });
        }

        const pessoaPrincipalId = result.insertId;

        // Em seguida, salvar os acompanhantes
        if (acompanhantes && acompanhantes.length > 0) {
            const sqlAcompanhante = 'INSERT INTO confirmacao_presenca (nome, pessoa_principal_id) VALUES (?, ?)';
            const insercoes = acompanhantes.map(acompanhante => {
                return new Promise((resolve, reject) => {
                    db.query(sqlAcompanhante, [acompanhante, pessoaPrincipalId], (err) => {
                        if (err) {
                            console.error('Erro ao salvar acompanhante:', err);
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            });

            // Executar todas as inserções de acompanhantes e enviar resposta final
            Promise.all(insercoes)
                .then(() => {
                    res.json({ success: true, message: 'Confirmação de presença registrada com sucesso!' });
                })
                .catch((error) => {
                    console.error('Erro ao salvar acompanhantes:', error);
                    res.status(500).json({ success: false, message: 'Erro ao registrar acompanhantes.' });
                });

        } else {
            // Caso não haja acompanhantes, responder imediatamente
            res.json({ success: true, message: 'Confirmação de presença registrada com sucesso!' });
        }
    });
});

// Rota para obter as confirmações de presença com acompanhantes
app.get('/confirmacoes', (req, res) => {
    const sql = `
        SELECT cp1.id AS pessoa_id,
               cp1.nome AS pessoa_nome,
               cp1.whatsapp AS pessoa_whatsapp,
               cp1.data_confirmacao AS data_confirmacao,
               cp2.id AS principal_id,
               cp2.nome AS principal_nome,
               cp2.whatsapp AS principal_whatsapp
        FROM confirmacao_presenca cp1
        LEFT JOIN confirmacao_presenca cp2 ON cp1.pessoa_principal_id = cp2.id
        ORDER BY cp1.data_confirmacao;
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Erro ao obter confirmações:', err);
            return res.status(500).json({ success: false, message: 'Erro ao buscar confirmações de presença.' });
        }

        // Agrupamento de resultados para formatar os acompanhantes como array
        const confirmacoes = {};

        results.forEach(row => {
            const pessoaId = row.pessoa_id;

            if (!row.principal_id) {
                // Pessoa principal
                if (!confirmacoes[pessoaId]) {
                    confirmacoes[pessoaId] = {
                        pessoa: row.pessoa_nome,
                        whatsapp: row.pessoa_whatsapp,
                        data_confirmacao: row.data_confirmacao,
                        acompanhantes: []
                    };
                }
            } else {
                // Acompanhante, adicionar ao array de acompanhantes da pessoa principal
                if (!confirmacoes[row.principal_id]) {
                    confirmacoes[row.principal_id] = {
                        pessoa: row.principal_nome,
                        whatsapp: row.principal_whatsapp,
                        data_confirmacao: row.data_confirmacao,
                        acompanhantes: []
                    };
                }
                confirmacoes[row.principal_id].acompanhantes.push(row.pessoa_nome);
            }
        });

        // Converter o objeto de confirmações em um array para envio no JSON
        const confirmacoesArray = Object.values(confirmacoes);
        res.json(confirmacoesArray);
    });
});


// Iniciar o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
