import { Request, Response } from "express";
import { ObjectId } from "bson";
import { getDb } from "../database/banco-mongo.js";

interface ItemCarrinho {
    produtoId: string;
    quantidade: number;
    precoUnitario: number;
    nome: string;
    urlfoto: string; // Adicionado para exibir a foto no frontend
}

// 1. Atualizei a Interface para incluir o status
interface Carrinho {
    usuarioId: string;
    itens: ItemCarrinho[];
    dataAtualizacao: Date;
    total: number;
    status: 'aberto' | 'finalizado'; // 🚨 Campo Obrigatório para o Checkout funcionar
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

            const { db } = await getDb();
            const produto = await db.collection("produtos").findOne({
                _id: ObjectId.createFromHexString(produtoId)
            });

            if (!produto) {
                return res.status(404).json({ mensagem: "Produto não encontrado" });
            }

            // 🚨 CORREÇÃO 1: Buscar apenas carrinho que NÃO esteja finalizado
            const carrinho = await db.collection<Carrinho>("carrinhos").findOne({ 
                usuarioId,
                status: { $ne: 'finalizado' } 
            });

            const itemData: ItemCarrinho = {
                produtoId,
                quantidade,
                precoUnitario: produto.preco,
                nome: produto.nome,
                urlfoto: produto.urlfoto // Importante salvar a foto
            };

            if (!carrinho) {
                // 🚨 CORREÇÃO 2: Criar carrinho com status 'aberto'
                const novoCarrinho: Carrinho = {
                    usuarioId,
                    itens: [itemData],
                    dataAtualizacao: new Date(),
                    total: produto.preco * quantidade,
                    status: 'aberto' // ESSENCIAL PARA O CHECKOUT
                };

                await db.collection("carrinhos").insertOne(novoCarrinho);
                return res.status(201).json(novoCarrinho);
            }

            // Lógica existente de atualizar item...
            const itemIndex = carrinho.itens.findIndex(item => item.produtoId === produtoId);

            if (itemIndex === -1) {
                carrinho.itens.push(itemData);
            } else {
                const existingItem = carrinho.itens[itemIndex];
                if (existingItem) {
                    existingItem.quantidade += quantidade;
                }
            }

            carrinho.dataAtualizacao = new Date();
            carrinho.total = carrinho.itens.reduce(
                (acc, item) => acc + (item.precoUnitario * item.quantidade),
                0
            );

            // 🚨 CORREÇÃO 3: Garantir que atualizamos apenas este carrinho específico
            await db.collection("carrinhos").updateOne(
                { _id: carrinho._id }, // Usa o _id para garantir unicidade
                {
                    $set: {
                        itens: carrinho.itens,
                        total: carrinho.total,
                        dataAtualizacao: carrinho.dataAtualizacao,
                        status: 'aberto' // Garante que o status se mantém
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

            if (!usuarioId) return res.status(401).json({ mensagem: "Usuário não autenticado." });

            const { db } = await getDb();
            // Busca apenas carrinho aberto
            const carrinho = await db.collection<Carrinho>("carrinhos").findOne({ 
                usuarioId,
                status: { $ne: 'finalizado' }
            });

            if (!carrinho) return res.status(404).json({ mensagem: "Carrinho não encontrado" });

            const itemIndex = carrinho.itens.findIndex(item => item.produtoId === produtoId);
            if (itemIndex === -1) return res.status(404).json({ mensagem: "Item não encontrado no carrinho" });

            carrinho.itens.splice(itemIndex, 1);
            
            // Recalcula total
            carrinho.total = carrinho.itens.reduce(
                (acc, item) => acc + (item.precoUnitario * item.quantidade), 0
            );
            carrinho.dataAtualizacao = new Date();

            // Se ficar vazio, deleta o carrinho
            if (carrinho.itens.length === 0) {
                await db.collection("carrinhos").deleteOne({ _id: carrinho._id });
                return res.status(200).json({ itens: [], total: 0 });
            }

            await db.collection("carrinhos").updateOne(
                { _id: carrinho._id },
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
            if (!usuarioId) return res.status(401).json({ mensagem: "Usuário não autenticado." });

            const { db } = await getDb();
            
            // 🚨 CORREÇÃO 4: Listar apenas o carrinho ativo (não finalizado)
            const carrinho = await db.collection<Carrinho>("carrinhos").findOne({ 
                usuarioId,
                status: { $ne: 'finalizado' }
            });

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
            if (!usuarioId) return res.status(401).json({ mensagem: "Usuário não autenticado." });

            const { db } = await getDb();
            // Remove apenas o carrinho ativo
            const resultado = await db.collection("carrinhos").deleteOne({ 
                usuarioId,
                status: { $ne: 'finalizado' }
            });

            if (resultado.deletedCount === 0) {
                return res.status(404).json({ mensagem: "Carrinho não encontrado" });
            }

            return res.status(200).json({ mensagem: "Carrinho removido com sucesso" });
        } catch (error) {
            return res.status(500).json({ mensagem: "Erro interno do servidor" });
        }
    }
    
    // As outras funções (removerCarrinhoPorId, listarTodos, atualizarQuantidade) 
    // podem ser mantidas como estavam, mas lembre-se de importar ObjectId e getDb corretamente.
    // Para simplificar, focamos no fluxo de compra acima.
    
    atualizarQuantidade = async (req: AutenticacaoRequest, res: Response) => {
        // Implemente a mesma lógica: buscar com status { $ne: 'finalizado' }
        try {
            const { produtoId, quantidade } = req.body;
            const usuarioId = req.usuarioId;
            if (!usuarioId) return res.status(401).json({ mensagem: "Auth required" });

             const { db } = await getDb();
             const carrinho = await db.collection<Carrinho>("carrinhos").findOne({ 
                 usuarioId, 
                 status: { $ne: 'finalizado' } 
             });

             if (!carrinho) return res.status(404).json({ mensagem: "Carrinho não encontrado" });

             const item = carrinho.itens.find(i => i.produtoId === produtoId);
             if (item) {
                 item.quantidade = quantidade;
                 // Recalcular total...
                 carrinho.total = carrinho.itens.reduce((acc, i) => acc + (i.precoUnitario * i.quantidade), 0);
                 
                 await db.collection("carrinhos").updateOne(
                     { _id: carrinho._id },
                     { $set: { itens: carrinho.itens, total: carrinho.total } }
                 );
                 return res.status(200).json(carrinho);
             }
             return res.status(404).json({ mensagem: "Item não encontrado" });
        } catch(e) {
            return res.status(500).json({mensagem: "Erro"});
        }
    }
    
    listarTodos = async (req: Request, res: Response) => {
        // Sua função listarTodos original estava boa para o admin
        // Apenas certifique-se de usar getDb()
         try {
            const { db } = await getDb();
            const todos = await db.collection('carrinhos').find().toArray();
            return res.status(200).json(todos);
         } catch (e) { return res.status(500).json({mensagem: "Erro"}); }
    }
    
    removerCarrinhoPorId = async (req: Request, res: Response) => {
        // Sua função original estava boa
         try {
            const { carrinhoId } = req.params;
            const { db } = await getDb();
            await db.collection("carrinhos").deleteOne({ _id: new ObjectId(carrinhoId) });
            return res.status(200).json({mensagem: "Deletado"});
         } catch (e) { return res.status(500).json({mensagem: "Erro"}); }
    }
}

export default new CarrinhoController();