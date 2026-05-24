import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ScrapeJobsService } from './scrape-jobs.service';
import { CreateScrapeJobDto, SaveTemplateDto } from './dto';

@Controller('scrape-jobs')
export class ScrapeJobsController {
  constructor(private service: ScrapeJobsService) {}

  @Post()
  create(@Body() dto: CreateScrapeJobDto) {
    return this.service.create(dto);
  }

  @Get()
  list() {
    return this.service.list();
  }

  @Get('zones')
  zones() {
    return this.service.getCityZones();
  }

  @Get('categories')
  categories() {
    return this.service.getCategories();
  }

  @Get('templates')
  listTemplates() {
    return this.service.listTemplates();
  }

  @Post('templates')
  saveTemplate(@Body() dto: SaveTemplateDto) {
    return this.service.saveTemplate(dto);
  }

  @Delete('templates/:id')
  deleteTemplate(@Param('id') id: string) {
    return this.service.deleteTemplate(id);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Post(':id/ingest')
  ingest(@Param('id') id: string) {
    return this.service.ingest(id);
  }
}
