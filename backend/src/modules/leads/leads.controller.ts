import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { ListLeadsQueryDto, UpdateLeadDto } from './dto';

@Controller('leads')
export class LeadsController {
  constructor(private service: LeadsService) {}

  @Get()
  list(@Query() q: ListLeadsQueryDto) {
    return this.service.list(q);
  }

  @Get('stats')
  stats() {
    return this.service.stats();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Get(':id/timeline')
  timeline(@Param('id') id: string) {
    return this.service.timeline(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.service.update(id, dto);
  }
}
