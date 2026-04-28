import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { type User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { CreateNewsDto } from './dto/create-news.dto';
import { NewsService } from './news.service';

@Controller('news')
export class NewsController {
  constructor(private readonly news: NewsService) {}

  @Get()
  async listPublic() {
    return this.news.listPublic();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@CurrentUser() user: User, @Body() dto: CreateNewsDto) {
    return this.news.create(user.id, user.role, dto);
  }
}
