import { ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNewsDto } from './dto/create-news.dto';

@Injectable()
export class NewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(authorId: string, role: UserRole, dto: CreateNewsDto) {
    if (role !== UserRole.ADMIN) {
      throw new ForbiddenException('Добавлять новости может только администратор');
    }

    return this.prisma.news.create({
      data: {
        title: dto.title.trim(),
        description: dto.description.trim(),
        imageUrl: dto.imageUrl?.trim() || null,
        links: (dto.links || []).map((x) => x.trim()).filter(Boolean),
        authorId
      }
    });
  }

  async listPublic() {
    return this.prisma.news.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        links: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
  }
}
