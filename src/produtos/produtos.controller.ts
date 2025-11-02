import { Request, Response } from 'express';
import { db } from '../database/banco-mongo.js';
import { ObjectId } from 'mongodb';

interface Produto {
    _id?: ObjectId;
    nome: string;
    preco: number;
    urlfoto: string;
    descricao: string;
    criadoPor: string | null;
    dataCriacao: Date;
    dataAtualizacao: Date;
}

class ProdutosController {
    // Listar produtos (acesso para todos os usuários autenticados)
    async listar(req: Request, res: Response) {
        try {
            const produtos = await db.collection<Produto>('produtos').find().toArray();
            res.status(200).json(produtos);
        } catch (error) {
            console.error('Erro ao listar produtos:', error);
            res.status(500).json({ mensagem: 'Erro ao buscar produtos' });
        }
    }

    // Adicionar produto (apenas admin)
    async adicionar(req: Request, res: Response) {
        try {
            const { nome, preco, urlfoto, descricao } = req.body;
            
            // Validação dos campos obrigatórios
            if (!nome || preco === undefined || !urlfoto || !descricao) {
                return res.status(400).json({ 
                    sucesso: false,
                    mensagem: 'Todos os campos são obrigatórios',
                    camposFaltando: {
                        nome: !nome,
                        preco: preco === undefined,
                        urlfoto: !urlfoto,
                        descricao: !descricao
                    }
                });
            }

            // Verifica se o preço é um número válido
            if (isNaN(Number(preco)) || Number(preco) <= 0) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'O preço deve ser um número maior que zero'
                });
            }

const produto: Produto = { 
                nome, 
                preco: Number(preco), 
                urlfoto, 
                descricao,
                criadoPor: req.usuarioId || null, // Pode ser null se não houver usuário autenticado
                dataCriacao: new Date(),
                dataAtualizacao: new Date()
            };

            const resultado = await db.collection<Produto>('produtos').insertOne(produto);
            
            res.status(201).json({
                sucesso: true,
                mensagem: 'Produto cadastrado com sucesso',
                produto: {
                    _id: resultado.insertedId,
                    ...produto
                }
            });
        } catch (error) {
            console.error('Erro ao adicionar produto:', error);
            res.status(500).json({ 
                sucesso: false,
                mensagem: 'Erro ao cadastrar produto' 
            });
        }
    }

    // Atualizar produto (apenas admin)
    async atualizar(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { nome, preco, urlfoto, descricao } = req.body;

            // Verifica se o ID é válido
            if (!id || !ObjectId.isValid(id)) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'ID do produto inválido'
                });
            }

            // Verifica se o produto existe
            const produtoExistente = await db.collection<Produto>('produtos').findOne({ 
                _id: new ObjectId(id) 
            });

            if (!produtoExistente) {
                return res.status(404).json({
                    sucesso: false,
                    mensagem: 'Produto não encontrado'
                });
            }

            // Atualiza apenas os campos fornecidos
            const atualizacao: Partial<Produto> = {
                dataAtualizacao: new Date()
            };

            if (nome) atualizacao.nome = nome;
            if (preco !== undefined) atualizacao.preco = Number(preco);
            if (urlfoto) atualizacao.urlfoto = urlfoto;
            if (descricao) atualizacao.descricao = descricao;

            const resultado = await db.collection<Produto>('produtos').updateOne(
                { _id: new ObjectId(id) },
                { $set: atualizacao }
            );

            if (resultado.matchedCount === 0) {
                return res.status(404).json({
                    sucesso: false,
                    mensagem: 'Produto não encontrado para atualização'
                });
            }

            const produtoAtualizado = await db.collection<Produto>('produtos').findOne({
                _id: new ObjectId(id)
            });

            res.status(200).json({
                sucesso: true,
                mensagem: 'Produto atualizado com sucesso',
                produto: produtoAtualizado
            });
        } catch (error) {
            console.error('Erro ao atualizar produto:', error);
            res.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao atualizar produto'
            });
        }
    }

    // Excluir produto (apenas admin)
    async excluir(req: Request, res: Response) {
        try {
            const { id } = req.params;

            // Verifica se o ID é válido
            if (!id || !ObjectId.isValid(id)) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'ID do produto inválido'
                });
            }

            // Verifica se o produto existe
            const produtoExistente = await db.collection<Produto>('produtos').findOne({ 
                _id: new ObjectId(id) 
            });

            if (!produtoExistente) {
                return res.status(404).json({
                    sucesso: false,
                    mensagem: 'Produto não encontrado'
                });
            }

            const resultado = await db.collection<Produto>('produtos').deleteOne({
                _id: new ObjectId(id)
            });

            if (resultado.deletedCount === 0) {
                return res.status(404).json({
                    sucesso: false,
                    mensagem: 'Produto não encontrado para exclusão'
                });
            }

            res.status(200).json({
                sucesso: true,
                mensagem: 'Produto excluído com sucesso'
            });
        } catch (error) {
            console.error('Erro ao excluir produto:', error);
            res.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao excluir produto'
            });
        }
    }
}

export default new ProdutosController();