import { FastifyReply, FastifyRequest } from "fastify";
import { GroupService } from "../services/group.service";
import { GroupInput } from "../types/group";

const service = new GroupService();

export async function postCreateGroupController(
  req: FastifyRequest<{ Body: GroupInput }>,
  reply: FastifyReply
) {
  try {
    const data = await service.create(req.body);
    return reply.status(201).send(data);
  } catch (err: any) {
    return reply.status(400).send({ message: err.message });
  }
}

export async function getGroupController(
  req: FastifyRequest,
  reply: FastifyReply
) {
  const data = await service.findAll();
  return reply.send(data);
}

export async function getGroupByIdController(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const data = await service.findById(Number(req.params.id));

  if (!data) {
    return reply.status(404).send({ message: "Not found" });
  }

  return reply.send(data);
}

export async function updateGroupController(
  req: FastifyRequest<{ Params: { id: string }; Body: GroupInput }>,
  reply: FastifyReply
) {
  try {
    const data = await service.update(Number(req.params.id), req.body);
    return reply.send(data);
  } catch (err: any) {
    return reply.status(400).send({ message: err.message });
  }
}

export async function deleteGroupController(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    await service.delete(Number(req.params.id));
    return reply.send({ message: "Deleted" });
  } catch (err: any) {
    return reply.status(400).send({ message: err.message });
  }
}