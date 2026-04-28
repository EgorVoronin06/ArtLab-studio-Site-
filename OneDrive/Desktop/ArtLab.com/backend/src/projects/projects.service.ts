import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateProjectDto) {
    const imageUrl = dto.imageUrl?.trim() || null;
    const logoUrl = dto.logoUrl?.trim() || null;
    const presentationUrl = dto.presentationUrl?.trim() || null;
    const telegramUrl = dto.telegramUrl?.trim() || null;
    const vkUrl = dto.vkUrl?.trim() || null;

    return this.prisma.project.create({
      data: {
        userId,
        title: dto.title.trim(),
        description: dto.description.trim(),
        requestedAmount: new Prisma.Decimal(dto.requestedAmount),
        imageUrl,
        logoUrl,
        presentationUrl,
        telegramUrl,
        vkUrl
      } as any
    });
  }

  async listMine(userId: string) {
    return this.prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async listAdminOverview() {
    return this.prisma.user.findMany({
      where: { role: UserRole.USER },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        projects: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            description: true,
            requestedAmount: true,
            imageUrl: true,
            logoUrl: true,
            presentationUrl: true,
            telegramUrl: true,
            vkUrl: true,
            createdAt: true
          } as any
        }
      }
    });
  }

  async listPublic() {
    return this.prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        requestedAmount: true,
        imageUrl: true,
        logoUrl: true,
        presentationUrl: true,
        telegramUrl: true,
        vkUrl: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true
          }
        }
      } as any
    });
  }

  async remove(projectId: string, user: { id: string; role: UserRole }) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Проект не найден');
    if (project.userId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Удалять можно только свои проекты');
    }
    await this.prisma.project.delete({ where: { id: projectId } });
    return { ok: true };
  }
}
