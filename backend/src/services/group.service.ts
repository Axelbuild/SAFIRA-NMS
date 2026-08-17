import { prisma } from "../database";
import { GroupInput } from "../types/group";

export class GroupService {
  async create(data: GroupInput) {
    const { name } = data;

    if (!name || !name.trim()) {
      throw new Error("name is required");
    }

    return prisma.group.create({
      data: {
        name: name.trim(),
      },
    });
  }

  async findAll() {
    return prisma.group.findMany({
      orderBy: {
        name: "asc",
      },
    });
  }

  async findById(id: number) {
    return prisma.group.findUnique({
      where: { id },
      include: {
        printers: true,
      },
    });
  }

  async update(id: number, data: GroupInput) {
    const { name } = data;

    if (!name || !name.trim()) {
      throw new Error("name is required");
    }

    return prisma.group.update({
      where: { id },
      data: {
        name: name.trim(),
      },
    });
  }

  async delete(id: number) {
    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        printers: true,
      },
    });

    if (!group) {
      throw new Error("Group not found");
    }

    if (group.printers.length > 0) {
      throw new Error("Cannot delete a group with linked printers");
    }

    return prisma.group.delete({
      where: { id },
    });
  }
}