import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { OutreachJobsService } from './outreach-jobs.service';
import { CreateOutreachJobDto } from './dto';

@Controller('outreach/jobs')
export class OutreachJobsController {
  constructor(private service: OutreachJobsService) {}

  @Post()
  create(@Body() dto: CreateOutreachJobDto) {
    return this.service.create(dto);
  }

  @Get()
  list() {
    return this.service.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Post(':id/start')
  start(@Param('id') id: string) {
    return this.service.start(id);
  }

  @Post(':id/pause')
  pause(@Param('id') id: string) {
    return this.service.pause(id);
  }

  @Post(':id/resume')
  resume(@Param('id') id: string) {
    return this.service.resume(id);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.service.cancel(id);
  }
}
