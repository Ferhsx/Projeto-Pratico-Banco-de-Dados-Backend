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

    removerCarrinhoPorId = async (req: Request, res: Response) => {
        try {
            const { carrinhoId } = req.params;

            if (!carrinhoId) {
                return res.status(400).json({ mensagem: "ID do carrinho não fornecido." });
            }

            let objectId;
            try {
                objectId = new ObjectId(carrinhoId);
            } catch (error) {
                return res.status(400).json({ mensagem: "ID do carrinho inválido." });
            }

            const resultado = await db.collection("carrinhos").deleteOne({ _id: objectId });

            if (resultado.deletedCount === 0) {
                return res.status(404).json({ mensagem: "Carrinho não encontrado." });
            }

            return res.status(200).json({ mensagem: "Carrinho removido com sucesso." });
        } catch (error) {
            console.error("Erro ao remover carrinho por ID:", error);
            return res.status(500).json({ mensagem: "Erro interno do servidor." });
        }
    }

    listarTodos = async (req: Request, res: Response) => {
        try {
            // Passo 1: Buscar todos os documentos da coleção de carrinhos.
            const todosOsCarrinhos = await db.collection('carrinhos').find().toArray();

            // Se não houver nenhum carrinho, podemos retornar uma lista vazia imediatamente.
            if (todosOsCarrinhos.length === 0) {
                return res.status(200).json([]);
            }

            // Passo 2: Criar um array apenas com os IDs dos usuários, convertendo para ObjectId.
            const idsDosUsuarios = todosOsCarrinhos.map(carrinho => new ObjectId(carrinho.usuarioId));

            // Passo 3: Fazer uma ÚNICA busca na coleção de usuários para pegar todos os donos dos carrinhos.
            // O operador "$in" busca todos os documentos cujo _id está na nossa lista de IDs.
            const usuariosDonos = await db.collection('usuarios').find({
                _id: { $in: idsDosUsuarios }
            }).toArray();

            // Passo 4: Criar um "mapa" para facilitar a busca do nome do usuário pelo seu ID.
            // Isso é muito mais rápido do que procurar no array de usuários a cada iteração.
            const mapaDeUsuarios = new Map(
                usuariosDonos.map(user => [user._id.toString(), user.nome]),
            );
            const mapaDeEmails = new Map(
                usuariosDonos.map(user => [user._id.toString(), user.email])
            );

            // Passo 5: Juntar os dados.
            // Usamos o ".map()" no array de carrinhos para criar um novo array com o formato final.
            const resultadoFinal = todosOsCarrinhos.map(carrinho => {
                return {
                    _id: carrinho._id,
                    emailUsuario: mapaDeEmails.get(carrinho.usuarioId) || 'Email Não Encontrado',
                    itens: carrinho.itens,
                    total: carrinho.total,
                    dataAtualizacao: carrinho.dataAtualizacao,
                    // Buscamos o nome do usuário no nosso mapa.
                    nomeUsuario: mapaDeUsuarios.get(carrinho.usuarioId) || 'Usuário Não Encontrado'
                };
            });

            return res.status(200).json(resultadoFinal);

        } catch (error) {
            console.error("Erro ao listar todos os carrinhos:", error);
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