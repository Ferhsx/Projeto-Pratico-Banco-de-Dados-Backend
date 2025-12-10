// produtos.controller.ts

import { Request, Response } from 'express'
// 🚨 Importa a função assíncrona para obter a conexão
import { getDb } from '../database/banco-mongo.js' 
import { ObjectId } from 'mongodb'

class ProdutosController {

    // --- FUNÇÃO ADICIONAR (Protegida) ---
    async adicionar(req: Request, res: Response) {
        const { nome, preco, urlfoto, descricao, isFeatured = false } = req.body
        if (!nome || !preco || !urlfoto || !descricao)
            return res.status(400).json({ error: "Nome, preço, urlfoto e descrição são obrigatórios" })

        const produto = {
            nome,
            preco: Number(preco),
            urlfoto,
            descricao,
            isFeatured
        }

        if (Number(preco) > 350) {
            produto.isFeatured = true
        }

        try {
            // 🚨 Obtém a conexão de forma segura
            const { db } = await getDb(); 
            const resultado = await db.collection('produtos').insertOne(produto)
            res.status(201).json({ ...produto, _id: resultado.insertedId })
        } catch (error) {
            console.error("Erro ao adicionar produto:", error);
            res.status(500).json({ mensagem: "Erro ao adicionar produto. Verifique a conexão com o DB." })
        }
    }

    // --- FUNÇÃO LISTAR (Pública) ---
    async listar(req: Request, res: Response) {
        try {
            // 🚨 Obtém a conexão de forma segura
            const { db } = await getDb();
            const produtos = await db.collection('produtos').find().toArray()
            res.status(200).json(produtos)
        } catch (error) {
            // 🚨 Tratamento de erro robusto para falhas no DB
            console.error("Erro ao listar produtos do DB:", error); 
            res.status(500).json({ mensagem: "Erro interno do servidor ao listar produtos. Verifique o DB." })
        }
    }

    // --- FUNÇÃO LISTAR POR ID (Pública) ---
    async listarPorId(req: Request, res: Response) {
        const { id } = req.params
        try {
            // 🚨 Obtém a conexão de forma segura
            const { db } = await getDb();
            const produto = await db.collection('produtos').findOne({ _id: new ObjectId(id) })
            
            if (!produto) return res.status(404).json({ mensagem: "Produto não encontrado." })
            res.status(200).json(produto)
        } catch (error) {
            console.error("Erro ao listar produto por ID:", error);
            // Assume 500 para falha de DB ou ID mal-formatado (não-ObjectId)
            res.status(500).json({ mensagem: "Erro ao buscar produto ou formato de ID inválido." })
        }
    }

    // --- FUNÇÃO ATUALIZAR (Protegida) ---
    async atualizar(req: Request, res: Response) {
        const { id } = req.params
        const novosDados = req.body

        if (!id) return res.status(400).json({ mensagem: "ID do produto é obrigatório." })

        try {
            const objectId = new ObjectId(id)
            delete novosDados._id

            // 🚨 Obtém a conexão de forma segura
            const { db } = await getDb();
            
            const resultado = await db.collection('produtos').updateOne(
                { _id: objectId },
                { $set: novosDados }
            )

            if (resultado.matchedCount === 0) {
                return res.status(404).json({ mensagem: "Produto não encontrado." })
            }

            res.status(200).json({ mensagem: "Produto atualizado com sucesso." })

        } catch (error) {
            console.error("Erro ao atualizar produto:", error);
            res.status(500).json({ mensagem: "Erro ao atualizar produto ou formato de ID inválido." })
        }
    }

    // --- FUNÇÃO EXCLUIR (Protegida) ---
    async excluir(req: Request, res: Response) {
        const { id } = req.params

        if (!id) return res.status(400).json({ mensagem: "ID do produto é obrigatório." })

        try {
            const objectId = new ObjectId(id)
            
            // 🚨 Obtém a conexão de forma segura
            const { db } = await getDb();
            
            const resultado = await db.collection('produtos').deleteOne({ _id: objectId })

            if (resultado.deletedCount === 0) {
                return res.status(404).json({ mensagem: "Produto não encontrado para exclusão." })
            }

            res.status(204).send()

        } catch (error) {
            console.error("Erro ao excluir produto:", error);
            res.status(500).json({ mensagem: "Erro ao excluir produto ou formato de ID inválido." })
        }
    }
}

export default new ProdutosController()