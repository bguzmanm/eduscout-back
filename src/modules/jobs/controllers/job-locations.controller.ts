import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { JobsService } from '../services/jobs.service';
import { AddressLocationDto } from '../dtos/job-location.dto';

@Controller('jobs')
export class JobLocationsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get(':id/locations')
  async getJobLocations(@Param('id', ParseIntPipe) id: number) {
    const job = await this.jobsService.findOne(id);
    if (!job.addressLocation) {
      return {} as AddressLocationDto;
    }
    const addr = job.addressLocation || null;
    return { addressLocation: addr } as AddressLocationDto;
  }
}
