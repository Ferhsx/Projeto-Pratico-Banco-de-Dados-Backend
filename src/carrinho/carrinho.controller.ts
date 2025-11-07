import { Request, Response } from "express";
import { ObjectId } from "bson";
import { db } from "../database/banco-mongo.js";

interface ItemCarrinho {
    produtoId: string;
    quantidade: number;
    precoUnitario: number;
    nome: string;
}

interface Carrinho {
    usuarioId: string;
    itens: ItemCarrinho[];
    dataAtualizacao: Date;
    total: number;
}

interface AutenticacaoRequest extends Request {
    usuarioId?: string;
}

class CarrinhoController {
    private validarItem(item: any): item is { produtoId: string; quantidade: number } {
        return (
            item &&
            typeof item.produtoId === 'string' &&
            typeof item.quantidade === 'number' &&
            item.quantidade > 0
        );
    }

    adicionarItem = async (req: AutenticacaoRequest, res: Response) => {
        try {
            console.log("Adicionando item ao carrinho");
            const { produtoId, quantidade } = req.body;
            const usuarioId = req.usuarioId;

            if (!usuarioId) {
                return res.status(401).json({ mensagem: "Usuário não autenticado." });
            }

            if (!this.validarItem({ produtoId, quantidade })) {
                return res.status(400).json({ mensagem: "Dados do item inválidos." });
            }

            const produto = await db.collection("produtos").findOne({
                _id: ObjectId.createFromHexString(produtoId)
            });

            if (!produto) {
                return res.status(404).json({ mensagem: "Produto não encontrado" });
            }

            const carrinho = await db.collection<Carrinho>("carrinhos").findOne({ usuarioId });
            const itemData = {
                produtoId,
                quantidade,
                precoUnitario: produto.preco,
                nome: produto.nome
            };

            if (!carrinho) {
                const novoCarrinho: Carrinho = {
                    usuarioId,
                    itens: [itemData],
                    dataAtualizacao: new Date(),
                    total: produto.preco * quantidade
                };

                await db.collection("carrinhos").insertOne(novoCarrinho);
                return res.status(201).json(novoCarrinho);
            }

            const itemIndex = carrinho.itens.findIndex(item => item.produtoId === produtoId);

            if (itemIndex === -1) {
                carrinho.itens.push(itemData);
            } else {
                const existingItem = carrinho.itens[itemIndex];
                if (existingItem) {  // This type guard ensures TypeScript knows existingItem is defined
                    existingItem.quantidade += quantidade;
                } else {
                    // This should theoretically never happen since we just found the index
                    carrinho.itens.push(itemData);
                }
            }

            carrinho.dataAtualizacao = new Date();

            carrinho.total = carrinho.itens.reduce(
                (acc, item) => acc + (item.precoUnitario * item.quantidade),
                0
            );

            await db.collection("carrinhos").updateOne(
                { usuarioId },
                {
                    $set: {
                        itens: carrinho.itens,
                        total: carrinho.total,
                        dataAtualizacao: carrinho.dataAtualizacao
                    }
                }
            );

            return res.status(200).json(carrinho);
        } catch (error) {
            console.error("Erro ao adicionar item:", error);
            return res.status(500).json({ mensagem: "Erro interno do servidor" });
        }
    }

    removerItem = async (req: AutenticacaoRequest, res: Response) => {
        try {
            const { produtoId } = req.body;
            const usuarioId = req.usuarioId;

            if (!usuarioId) {
                return res.status(401).json({ mensagem: "Usuário não autenticado." });
            }

            if (!produtoId || typeof produtoId !== 'string') {
                return res.status(400).json({ mensagem: "ID do produto inválido." });
            }

            const carrinho = await db.collection<Carrinho>("carrinhos").findOne({ usuarioId });

            if (!carrinho) {
                return res.status(404).json({ mensagem: "Carrinho não encontrado" });
            }

            const itemIndex = carrinho.itens.findIndex(item => item.produtoId === produtoId);

            if (itemIndex === -1) {
                return res.status(404).json({ mensagem: "Item não encontrado no carrinho" });
            }

            carrinho.itens.splice(itemIndex, 1);
            carrinho.total = carrinho.itens.reduce(
                (acc, item) => acc + (item.precoUnitario * item.quantidade),
                0
            );
            carrinho.dataAtualizacao = new Date();

            if (carrinho.itens.length === 0) {
                await db.collection("carrinhos").deleteOne({ usuarioId });
                return res.status(200).json({ itens: [], total: 0 });
            }

            await db.collection("carrinhos").updateOne(
                { usuarioId },
                {
                    $set: {
                        itens: carrinho.itens,
                        total: carrinho.total,
                        dataAtualizacao: carrinho.dataAtualizacao
                    }
                }
            );

            return res.status(200).json(carrinho);
        } catch (error) {
            console.error("Erro ao remover item:", error);
            return res.status(500).json({ mensagem: "Erro interno do servidor" });
        }
    }

    listar = async (req: AutenticacaoRequest, res: Response) => {
        try {
            const usuarioId = req.usuarioId;

            if (!usuarioId) {
                return res.status(401).json({ mensagem: "Usuário não autenticado." });
            }

            const carrinho = await db.collection<Carrinho>("carrinhos").findOne({ usuarioId });

            if (!carrinho) {
                return res.status(200).json({ itens: [], total: 0, usuarioId });
            }

            return res.status(200).json(carrinho);
        } catch (error) {
            console.error("Erro ao listar carrinho:", error);
            return res.status(500).json({ mensagem: "Erro interno do servidor" });
        }
    }

    remover = async (req: AutenticacaoRequest, res: Response) => {
        try {
            const usuarioId = req.usuarioId;

            if (!usuarioId) {
                return res.status(401).json({ mensagem: "Usuário não autenticado." });
            }

            const resultado = await db.collection("carrinhos").deleteOne({ usuarioId });

            if (resultado.deletedCount === 0) {
                return res.status(404).json({ mensagem: "Carrinho não encontrado" });
            }

            return res.status(200).json({ mensagem: "Carrinho removido com sucesso" });
        } catch (error) {
            console.error("Erro ao remover carrinho:", error);
            return res.status(500).json({ mensagem: "Erro interno do servidor" });
        }
    }

    atualizarQuantidade = async (req: AutenticacaoRequest, res: Response) => {
        try {
            const { produtoId, quantidade } = req.body;
            const usuarioId = req.usuarioId;

            if (!usuarioId) {
                return res.status(401).json({ mensagem: "Usuário não autenticado." });
            }

            if (!produtoId || typeof produtoId !== 'string' ||
                typeof quantidade !== 'number' || quantidade <= 0) {
                return res.status(400).json({ mensagem: "Dados inválidos para atualização." });
            }

            const carrinho = await db.collection<Carrinho>("carrinhos").findOne({ usuarioId });

            if (!carrinho) {
                return res.status(404).json({ mensagem: "Carrinho não encontrado" });
            }

            const itemIndex = carrinho.itens.findIndex(item => item.produtoId === produtoId);
            const item = carrinho.itens[itemIndex];
            if (!item) {
                return res.status(404).json({ mensagem: "Item não encontrado no carrinho" });
            }
            item.quantidade = quantidade;
            carrinho.total = carrinho.itens.reduce(
                (acc, item) => acc + (item.precoUnitario * item.quantidade),
                0
            );
            carrinho.dataAtualizacao = new Date();

            await db.collection("carrinhos").updateOne(
                { usuarioId },
                {
                    $set: {
                        itens: carrinho.itens,
                        total: carrinho.total,
                        dataAtualizacao: carrinho.dataAtualizacao
                    }
                }
            );

            return res.status(200).json(carrinho);
        } catch (error) {
            console.error("Erro ao atualizar quantidade:", error);
            return res.status(500).json({ mensagem: "Erro interno do servidor" });
        }
    }
}

export default new CarrinhoController();