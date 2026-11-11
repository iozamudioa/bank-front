// Generated. Do not edit.
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  AccountBalanceResponse,
  AccountExpensePreviewResponse,
  AccountExpenseReplacementRequest,
  AccountExpenseRequest,
  AccountResponse,
  AddMemberRequest,
  AllocationReplacementRequest,
  AllocationRequest,
  BalanceEffectResponse,
  BudgetLineRequest,
  BudgetLineResponse,
  BudgetPeriodResponse,
  BudgetTemplateResponse,
  CorrectionLinkResponse,
  CorrectionPreviewResponse,
  CorrectionRequest,
  CreateAccountRequest,
  CreateEnvelopeRequest,
  CreateHouseholdRequest,
  CreateIncomeSourceRequest,
  CreatePeriodRequest,
  DashboardViewResponse,
  DonorOptionResponse,
  EnvelopeResponse,
  EnvelopeTransferReplacementRequest,
  EnvelopeTransferRequest,
  ErrorResponse,
  ExpensePreviewResponse,
  ExpenseReplacementRequest,
  ExpenseRequest,
  FundingRequest,
  FundingResponse,
  HouseholdMemberResponse,
  HouseholdResponse,
  IncomeReplacementRequest,
  IncomeRequest,
  IncomeSourceResponse,
  MovementReplacementRequest,
  MovementReplacementResponse,
  MovementResponse,
  OpeningBalanceRequest,
  ReallocationReplacementRequest,
  ReallocationRequest,
  ReleaseReplacementRequest,
  ReverseRequest,
  SaveBudgetRequest,
  TransferReplacementRequest,
  TransferRequest,
  UpsertPeriodBudgetLineRequest,
  UpsertTemplateBudgetLineRequest,
  UserResponse,
} from './models';
import { environment } from '../../../../environments/environment';
@Injectable({ providedIn: 'root' })
export class BankApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBase;
  private household(id: string) {
    return this.base + '/api/v1/households/' + encodeURIComponent(id);
  }

  listHouseholds() {
    return this.http.request<HouseholdResponse[]>('GET', this.base + `/api/v1/households`, {
      timeout: 20000,
    });
  }
  createHousehold(body: CreateHouseholdRequest) {
    return this.http.request<HouseholdResponse>('POST', this.base + `/api/v1/households`, {
      timeout: 20000,
      body,
    });
  }
  getHousehold(householdId: string) {
    return this.http.request<HouseholdResponse>('GET', this.household(householdId) + ``, {
      timeout: 20000,
    });
  }
  listAccounts(householdId: string) {
    return this.http.request<AccountResponse[]>('GET', this.household(householdId) + `/accounts`, {
      timeout: 20000,
    });
  }
  createAccount(householdId: string, body: CreateAccountRequest) {
    return this.http.request<AccountResponse>('POST', this.household(householdId) + `/accounts`, {
      timeout: 20000,
      body,
    });
  }
  listBudgetPeriods(householdId: string) {
    return this.http.request<BudgetPeriodResponse[]>(
      'GET',
      this.household(householdId) + `/budget-periods`,
      { timeout: 20000 },
    );
  }
  createBudgetPeriod(householdId: string, body: CreatePeriodRequest) {
    return this.http.request<BudgetPeriodResponse>(
      'POST',
      this.household(householdId) + `/budget-periods`,
      { timeout: 20000, body },
    );
  }
  getBudgetPeriod(householdId: string, periodId: string) {
    return this.http.request<BudgetPeriodResponse>(
      'GET',
      this.household(householdId) + `/budget-periods/${encodeURIComponent(periodId)}`,
      { timeout: 20000 },
    );
  }
  closeBudgetPeriod(householdId: string, periodId: string) {
    return this.http.request<BudgetPeriodResponse>(
      'POST',
      this.household(householdId) + `/budget-periods/${encodeURIComponent(periodId)}/close`,
      { timeout: 20000 },
    );
  }
  upsertPeriodBudgetLine(
    householdId: string,
    periodId: string,
    envelopeId: string,
    body: UpsertPeriodBudgetLineRequest,
  ) {
    return this.http.request<BudgetPeriodResponse>(
      'PUT',
      this.household(householdId) +
        `/budget-periods/${encodeURIComponent(periodId)}/lines/${encodeURIComponent(envelopeId)}`,
      { timeout: 20000, body },
    );
  }
  getBudgetTemplate(householdId: string) {
    return this.http.request<BudgetTemplateResponse>(
      'GET',
      this.household(householdId) + `/budget-template`,
      { timeout: 20000 },
    );
  }
  saveBudgetTemplate(householdId: string, body: SaveBudgetRequest) {
    return this.http.request<BudgetTemplateResponse>(
      'PUT',
      this.household(householdId) + `/budget-template`,
      { timeout: 20000, body },
    );
  }
  upsertTemplateBudgetLine(
    householdId: string,
    envelopeId: string,
    body: UpsertTemplateBudgetLineRequest,
  ) {
    return this.http.request<BudgetTemplateResponse>(
      'PUT',
      this.household(householdId) + `/budget-template/lines/${encodeURIComponent(envelopeId)}`,
      { timeout: 20000, body },
    );
  }
  getDashboard(householdId: string) {
    return this.http.request<DashboardViewResponse>(
      'GET',
      this.household(householdId) + `/dashboard`,
      { timeout: 20000 },
    );
  }
  listEnvelopes(householdId: string) {
    return this.http.request<EnvelopeResponse[]>(
      'GET',
      this.household(householdId) + `/envelopes`,
      { timeout: 20000 },
    );
  }
  createEnvelope(householdId: string, body: CreateEnvelopeRequest, key: string) {
    return this.http.request<EnvelopeResponse>('POST', this.household(householdId) + `/envelopes`, {
      timeout: 20000,
      body,
      headers: { 'Idempotency-Key': key },
    });
  }
  listIncomeSources(householdId: string) {
    return this.http.request<IncomeSourceResponse[]>(
      'GET',
      this.household(householdId) + `/income-sources`,
      { timeout: 20000 },
    );
  }
  createIncomeSource(householdId: string, body: CreateIncomeSourceRequest) {
    return this.http.request<IncomeSourceResponse>(
      'POST',
      this.household(householdId) + `/income-sources`,
      { timeout: 20000, body },
    );
  }
  listHouseholdMembers(householdId: string) {
    return this.http.request<HouseholdMemberResponse[]>(
      'GET',
      this.household(householdId) + `/members`,
      { timeout: 20000 },
    );
  }
  addHouseholdMember(householdId: string, body: AddMemberRequest) {
    return this.http.request<HouseholdMemberResponse>(
      'POST',
      this.household(householdId) + `/members`,
      { timeout: 20000, body },
    );
  }
  listMovements(householdId: string, query: Record<string, string> = {}) {
    return this.http.request<MovementResponse[]>(
      'GET',
      this.household(householdId) + `/movements`,
      { timeout: 20000, params: query },
    );
  }
  registerAccountExpense(householdId: string, body: AccountExpenseRequest, key: string) {
    return this.http.request<MovementResponse>(
      'POST',
      this.household(householdId) + `/movements/account-expenses`,
      { timeout: 20000, body, headers: { 'Idempotency-Key': key } },
    );
  }
  previewAccountExpense(householdId: string, body: AccountExpenseRequest) {
    return this.http.request<AccountExpensePreviewResponse>(
      'POST',
      this.household(householdId) + `/movements/account-expenses/preview`,
      { timeout: 20000, body },
    );
  }
  allocateMoney(householdId: string, body: AllocationRequest, key: string) {
    return this.http.request<MovementResponse>(
      'POST',
      this.household(householdId) + `/movements/allocations`,
      { timeout: 20000, body, headers: { 'Idempotency-Key': key } },
    );
  }
  transferEnvelopes(householdId: string, body: EnvelopeTransferRequest, key: string) {
    return this.http.request<MovementResponse>(
      'POST',
      this.household(householdId) + `/movements/envelope-transfers`,
      { timeout: 20000, body, headers: { 'Idempotency-Key': key } },
    );
  }
  registerExpense(householdId: string, body: ExpenseRequest, key: string) {
    return this.http.request<MovementResponse>(
      'POST',
      this.household(householdId) + `/movements/expenses`,
      { timeout: 20000, body, headers: { 'Idempotency-Key': key } },
    );
  }
  previewExpense(householdId: string, body: ExpenseRequest) {
    return this.http.request<ExpensePreviewResponse>(
      'POST',
      this.household(householdId) + `/movements/expenses/preview`,
      { timeout: 20000, body },
    );
  }
  registerIncome(householdId: string, body: IncomeRequest, key: string) {
    return this.http.request<MovementResponse>(
      'POST',
      this.household(householdId) + `/movements/incomes`,
      { timeout: 20000, body, headers: { 'Idempotency-Key': key } },
    );
  }
  registerOpeningBalance(householdId: string, body: OpeningBalanceRequest, key: string) {
    return this.http.request<MovementResponse>(
      'POST',
      this.household(householdId) + `/movements/opening-balances`,
      { timeout: 20000, body, headers: { 'Idempotency-Key': key } },
    );
  }
  reallocateEnvelopes(householdId: string, body: ReallocationRequest, key: string) {
    return this.http.request<MovementResponse>(
      'POST',
      this.household(householdId) + `/movements/reallocations`,
      { timeout: 20000, body, headers: { 'Idempotency-Key': key } },
    );
  }
  releaseReserve(householdId: string, body: AllocationRequest, key: string) {
    return this.http.request<MovementResponse>(
      'POST',
      this.household(householdId) + `/movements/releases`,
      { timeout: 20000, body, headers: { 'Idempotency-Key': key } },
    );
  }
  transferAccounts(householdId: string, body: TransferRequest, key: string) {
    return this.http.request<MovementResponse>(
      'POST',
      this.household(householdId) + `/movements/transfers`,
      { timeout: 20000, body, headers: { 'Idempotency-Key': key } },
    );
  }
  getMovement(householdId: string, id: string) {
    return this.http.request<MovementResponse>(
      'GET',
      this.household(householdId) + `/movements/${encodeURIComponent(id)}`,
      { timeout: 20000 },
    );
  }
  correctMovement(householdId: string, id: string, body: CorrectionRequest, key: string) {
    return this.http.request<MovementResponse>(
      'POST',
      this.household(householdId) + `/movements/${encodeURIComponent(id)}/corrections`,
      { timeout: 20000, body, headers: { 'Idempotency-Key': key } },
    );
  }
  previewMovementCorrection(householdId: string, id: string, body: CorrectionRequest) {
    return this.http.request<CorrectionPreviewResponse>(
      'POST',
      this.household(householdId) + `/movements/${encodeURIComponent(id)}/corrections/preview`,
      { timeout: 20000, body },
    );
  }
  reverseMovement(householdId: string, id: string, body: ReverseRequest, key: string) {
    return this.http.request<MovementResponse>(
      'POST',
      this.household(householdId) + `/movements/${encodeURIComponent(id)}/reverse`,
      { timeout: 20000, body, headers: { 'Idempotency-Key': key } },
    );
  }
  getCurrentUser() {
    return this.http.request<UserResponse>('GET', this.base + `/api/v1/me`, { timeout: 20000 });
  }
}
