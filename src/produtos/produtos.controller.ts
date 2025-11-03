// produtos.controller.ts (Atualizado)

import { Request, Response } from 'express'
import { db } from '../database/banco-mongo.js'
// Importar ObjectId para manipular IDs do MongoDB
import { ObjectId } from 'mongodb' 

class ProdutosController {
    
    // --- FUNÇÃO ADICIONAR (Mantida, mas esta rota será protegida por AuthAdmin) ---
    async adicionar(req: Request, res: Response) {
        const { nome, preco, urlfoto, descricao } = req.body
        if (!nome || !preco || !urlfoto || !descricao)
            return res.status(400).json({ error: "Nome, preço, urlfoto e descrição são obrigatórios" })
            
        // Converter preço para número se necessário, antes de salvar
        const produto = { nome, preco: Number(preco), urlfoto, descricao } 
        
        try {
            const resultado = await db.collection('produtos').insertOne(produto)
            res.status(201).json({ nome, preco, urlfoto, descricao, _id: resultado.insertedId })
        } catch (error) {
            res.status(500).json({ mensagem: "Erro ao adicionar produto." })
        }
    }
    
    // --- FUNÇÃO LISTAR (Mantida) ---
    async listar(req: Request, res: Response) {
        const produtos = await db.collection('produtos').find().toArray()
        res.status(200).json(produtos)
    }

    /**
     * 🟢 NOVO: Função para atualizar um produto (PUT /produtos/:id)
     * Requer autorização ADMIN no middleware.
     */
    async atualizar(req: Request, res: Response) {
        const { id } = req.params // ID do produto na URL
        const novosDados = req.body
        
        if (!id) return res.status(400).json({ mensagem: "ID do produto é obrigatório." })

        try {
            // Cria um ObjectId para buscar no MongoDB
            const objectId = new ObjectId(id)

            // Remove o _id para garantir que ele não seja atualizado, se estiver presente no body
            delete novosDados._id

            // O $set garante que apenas os campos fornecidos no body serão atualizados
            const resultado = await db.collection('produtos').updateOne(
                { _id: objectId },
                { $set: novosDados } 
            )

            if (resultado.matchedCount === 0) {
                return res.status(404).json({ mensagem: "Produto não encontrado." })
            }

            res.status(200).json({ mensagem: "Produto atualizado com sucesso." })

        } catch (error) {
            // Erro comum: ID inválido (não é um formato ObjectId válido)
            res.status(500).json({ mensagem: "Erro ao atualizar produto ou formato de ID inválido." })
        }
    }

    /**
     * 🔴 NOVO: Função para excluir um produto (DELETE /produtos/:id)
     * Requer autorização ADMIN no middleware.
     */
    async excluir(req: Request, res: Response) {
        const { id } = req.params // ID do produto na URL

        if (!id) return res.status(400).json({ mensagem: "ID do produto é obrigatório." })

        try {
            const objectId = new ObjectId(id)

            const resultado = await db.collection('produtos').deleteOne({ _id: objectId })

            if (resultado.deletedCount === 0) {
                return res.status(404).json({ mensagem: "Produto não encontrado para exclusão." })
            }

            // 204 No Content: Resposta de sucesso sem conteúdo de retorno
            res.status(204).send() 

        } catch (error) {
            res.status(500).json({ mensagem: "Erro ao excluir produto ou formato de ID inválido." })
        }
    }
}

export default new ProdutosController()