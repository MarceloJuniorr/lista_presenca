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

// Iniciar o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
