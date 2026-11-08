// ============================================================================
// Mizan (ميزان) - Expenses & Bookkeeping Controller
// Multi-Tenant Isolated Endpoints for Expense Scanning, Review & Ledger
// ============================================================================

import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Inject,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import {
  ArchiveExpenseDto,
  BatchExpenseActionDto,
  CreateManualExpenseDto,
  QueryExpensesDto,
  RejectExpenseDto,
  ScanExpenseReceiptDto,
  UpdateExpenseDto,
} from './dto/expense.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.interface';

@ApiTags('Expenses & Bookkeeping')
@ApiBearerAuth()
@Controller('api/v1/expenses')
export class ExpensesController {
  constructor(@Inject(ExpensesService) private readonly expensesService: ExpensesService) {}

  @Post('scan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload and scan an expense receipt via server-side OCR' })
  async scanReceipt(
    @Body() dto: ScanExpenseReceiptDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.expensesService.scanReceipt(dto, user.organisationId, user.userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create manual expense record' })
  async createManualExpense(
    @Body() dto: CreateManualExpenseDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.expensesService.createManualExpense(dto, user.organisationId, user.userId);
  }

  @Get('categories')
  @ApiOperation({ summary: 'List standard UAE expense categories' })
  async getCategories() {
    return this.expensesService.getCategories();
  }

  @Get('summary')
  @ApiOperation({ summary: 'Retrieve expense totals and category breakdowns for active business' })
  async getSummaries(
    @Query('businessId') businessId: string,
    @Query('year') year: string | undefined,
    @CurrentUser() user: AuthenticatedUser
  ) {
    const yr = year ? parseInt(year, 10) : 2026;
    return this.expensesService.getExpenseSummaries(businessId, user.organisationId, yr);
  }

  @Get()
  @ApiOperation({ summary: 'List expenses for active business with filters' })
  async listExpenses(
    @Query() query: QueryExpensesDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.expensesService.listExpenses(query, user.organisationId);
  }

  @Get('attachments/:fileId')
  @ApiOperation({ summary: 'Securely retrieve attached receipt file' })
  async getAttachment(
    @Param('fileId') fileId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response
  ) {
    const file = await this.expensesService.getAttachmentStream(fileId, user.organisationId);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);
    file.stream.pipe(res);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve single expense record by ID' })
  async getExpense(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.expensesService.getExpenseById(id, user.organisationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update expense fields, categories or line items' })
  async updateExpense(
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.expensesService.updateExpense(id, dto, user.organisationId, user.userId);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve expense and post to business ledger' })
  async approveExpense(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.expensesService.approveExpense(id, user.organisationId, user.userId);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject expense' })
  async rejectExpense(
    @Param('id') id: string,
    @Body() dto: RejectExpenseDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.expensesService.rejectExpense(id, dto.reason, user.organisationId, user.userId);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive expense' })
  async archiveExpense(
    @Param('id') id: string,
    @Body() dto: ArchiveExpenseDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.expensesService.archiveExpense(id, dto.reason, user.organisationId, user.userId);
  }

  @Post('batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Batch approve, reject, archive or categorize expenses' })
  async batchAction(
    @Body() dto: BatchExpenseActionDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.expensesService.batchAction(dto, user.organisationId, user.userId);
  }
}
