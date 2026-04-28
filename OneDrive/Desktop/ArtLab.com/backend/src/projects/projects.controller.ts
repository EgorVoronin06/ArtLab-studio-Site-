import { Body, Controller, Delete, ForbiddenException, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole, type User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get('public')
  async listPublic() {
    return this.projects.listPublic();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@CurrentUser() user: User, @Body() dto: CreateProjectDto) {
    return this.projects.create(user.id, dto);
  }

  @Delete(':projectId')
  @UseGuards(JwtAuthGuard)
  async remove(@CurrentUser() user: User, @Param('projectId') projectId: string) {
    return this.projects.remove(projectId, user);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  async mine(@CurrentUser() user: User) {
    return this.projects.listMine(user.id);
  }

  @Get('admin/overview')
  @UseGuards(JwtAuthGuard)
  async adminOverview(@CurrentUser() user: User) {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Доступ только для администратора');
    }
    return this.projects.listAdminOverview();
  }
}
