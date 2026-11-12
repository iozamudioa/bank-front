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
  PushSubscriptionResponse,
  ReallocationReplacementRequest,
  ReallocationRequest,
  RegisterPushSubscriptionRequest,
  ReleaseReplacementRequest,
  ReverseRequest,
  SaveBudgetRequest,
  SendHouseholdNotificationRequest,
  TransferReplacementRequest,
  TransferRequest,
  UpsertPeriodBudgetLineRequest,
  UpsertTemplateBudgetLineRequest,
  UserResponse,
  VapidPublicKeyResponse,
} from './models';
import { environment } from '../../../../environments/environment';
@Injectable({ providedIn: 'root' })
export class BankApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBase;
  private request<T>(
    method: string,
    url: string,
    options: {
      body?: unknown;
      headers?: Record<string, string>;
      params?: Record<string, string>;
    } = {},
  ) {
    return this.http.request<T>(method, url, { ...options, timeout: 20000 });
  }
  private household(id: string) {
    return this.base + '/api/v1/households/' + encodeURIComponent(id);
  }

  listHouseholds() {
    return this.request<HouseholdResponse[]>('GET', this.base + `/api/v1/households`, {});
  }
  createHousehold(body: CreateHouseholdRequest) {
    return this.request<HouseholdResponse>('POST', this.base + `/api/v1/households`, { body });
  }
  getHousehold(householdId: string) {
    return this.request<HouseholdResponse>('GET', this.household(householdId) + ``, {});
  }
  listAccounts(householdId: string) {
    return this.request<AccountResponse[]>('GET', this.household(householdId) + `/accounts`, {});
  }
  createAccount(householdId: string, body: CreateAccountRequest) {
    return this.request<AccountResponse>('POST', this.household(householdId) + `/accounts`, {
      body,
    });
  }
  listBudgetPeriods(householdId: string) {
    return this.request<BudgetPeriodResponse[]>(
      'GET',
      this.household(householdId) + `/budget-periods`,
      {},
    );
  }
  createBudgetPeriod(householdId: string, body: CreatePeriodRequest) {
    return this.request<BudgetPeriodResponse>(
      'POST',
      this.household(householdId) + `/budget-periods`,
      { body },
    );
  }
  getBudgetPeriod(householdId: string, periodId: string) {
    return this.request<BudgetPeriodResponse>(
      'GET',
      this.household(householdId) + `/budget-periods/${encodeURIComponent(periodId)}`,
      {},
    );
  }
  closeBudgetPeriod(householdId: string, periodId: string) {
    return this.request<BudgetPeriodResponse>(
      'POST',
      this.household(householdId) + `/budget-periods/${encodeURIComponent(periodId)}/close`,
      {},
    );
  }
  upsertPeriodBudgetLine(
    householdId: string,
    periodId: string,
    envelopeId: string,
    body: UpsertPeriodBudgetLineRequest,
  ) {
    return this.request<BudgetPeriodResponse>(
      'PUT',
      this.household(householdId) +
        `/budget-periods/${encodeURIComponent(periodId)}/lines/${encodeURIComponent(envelopeId)}`,
      { body },
    );
  }
  getBudgetTemplate(householdId: string) {
    return this.request<BudgetTemplateResponse>(
      'GET',
      this.household(householdId) + `/budget-template`,
      {},
    );
  }
  saveBudgetTemplate(householdId: string, body: SaveBudgetRequest) {
    return this.request<BudgetTemplateResponse>(
      'PUT',
      this.household(householdId) + `/budget-template`,
      { body },
    );
  }
  upsertTemplateBudgetLine(
    householdId: string,
    envelopeId: string,
    body: UpsertTemplateBudgetLineRequest,
  ) {
    return this.request<BudgetTemplateResponse>(
      'PUT',
      this.household(householdId) + `/budget-template/lines/${encodeURIComponent(envelopeId)}`,
      { body },
    );
  }
  getDashboard(householdId: string) {
    return this.request<DashboardViewResponse>(
      'GET',
      this.household(householdId) + `/dashboard`,
      {},
    );
  }
  listEnvelopes(householdId: string) {
    return this.request<EnvelopeResponse[]>('GET', this.household(householdId) + `/envelopes`, {});
  }
  createEnvelope(householdId: string, body: CreateEnvelopeRequest, key: string) {
    return this.request<EnvelopeResponse>('POST', this.household(householdId) + `/envelopes`, {
      body,
      headers: { 'Idempotency-Key': key },
    });
  }
  listIncomeSources(householdId: string) {
    return this.request<IncomeSourceResponse[]>(
      'GET',
      this.household(householdId) + `/income-sources`,
      {},
    );
  }
  createIncomeSource(householdId: string, body: CreateIncomeSourceRequest) {
    return this.request<IncomeSourceResponse>(
      'POST',
      this.household(householdId) + `/income-sources`,
      { body },
    );
  }
  listHouseholdMembers(householdId: string) {
    return this.request<HouseholdMemberResponse[]>(
      'GET',
      this.household(householdId) + `/members`,
      {},
    );
  }
  addHouseholdMember(householdId: string, body: AddMemberRequest) {
    return this.request<HouseholdMemberResponse>('POST', this.household(householdId) + `/members`, {
      body,
    });
  }
  listMovements(householdId: string, query: Record<string, string> = {}) {
    return this.request<MovementResponse[]>('GET', this.household(householdId) + `/movements`, {
      params: query,
    });
  }
  registerAccountExpense(householdId: string, body: AccountExpenseRequest, key: string) {
    return this.request<MovementResponse>(
      'POST',
      this.household(householdId) + `/movements/account-expenses`,
      { body, headers: { 'Idempotency-Key': key } },
    );
  }
  previewAccountExpense(householdId: string, body: AccountExpenseRequest) {
    return this.request<AccountExpensePreviewResponse>(
      'POST',
      this.household(householdId) + `/movements/account-expenses/preview`,
      { body },
    );
  }
  allocateMoney(householdId: string, body: AllocationRequest, key: string) {
    return this.request<MovementResponse>(
      'POST',
      this.household(householdId) + `/movements/allocations`,
      { body, headers: { 'Idempotency-Key': key } },
    );
  }
  transferEnvelopes(householdId: string, body: EnvelopeTransferRequest, key: string) {
    return this.request<MovementResponse>(
      'POST',
      this.household(householdId) + `/movements/envelope-transfers`,
      { body, headers: { 'Idempotency-Key': key } },
    );
  }
  registerExpense(householdId: string, body: ExpenseRequest, key: string) {
    return this.request<MovementResponse>(
      'POST',
      this.household(householdId) + `/movements/expenses`,
      { body, headers: { 'Idempotency-Key': key } },
    );
  }
  previewExpense(householdId: string, body: ExpenseRequest) {
    return this.request<ExpensePreviewResponse>(
      'POST',
      this.household(householdId) + `/movements/expenses/preview`,
      { body },
    );
  }
  registerIncome(householdId: string, body: IncomeRequest, key: string) {
    return this.request<MovementResponse>(
      'POST',
      this.household(householdId) + `/movements/incomes`,
      { body, headers: { 'Idempotency-Key': key } },
    );
  }
  registerOpeningBalance(householdId: string, body: OpeningBalanceRequest, key: string) {
    return this.request<MovementResponse>(
      'POST',
      this.household(householdId) + `/movements/opening-balances`,
      { body, headers: { 'Idempotency-Key': key } },
    );
  }
  reallocateEnvelopes(householdId: string, body: ReallocationRequest, key: string) {
    return this.request<MovementResponse>(
      'POST',
      this.household(householdId) + `/movements/reallocations`,
      { body, headers: { 'Idempotency-Key': key } },
    );
  }
  releaseReserve(householdId: string, body: AllocationRequest, key: string) {
    return this.request<MovementResponse>(
      'POST',
      this.household(householdId) + `/movements/releases`,
      { body, headers: { 'Idempotency-Key': key } },
    );
  }
  transferAccounts(householdId: string, body: TransferRequest, key: string) {
    return this.request<MovementResponse>(
      'POST',
      this.household(householdId) + `/movements/transfers`,
      { body, headers: { 'Idempotency-Key': key } },
    );
  }
  getMovement(householdId: string, id: string) {
    return this.request<MovementResponse>(
      'GET',
      this.household(householdId) + `/movements/${encodeURIComponent(id)}`,
      {},
    );
  }
  correctMovement(householdId: string, id: string, body: CorrectionRequest, key: string) {
    return this.request<MovementResponse>(
      'POST',
      this.household(householdId) + `/movements/${encodeURIComponent(id)}/corrections`,
      { body, headers: { 'Idempotency-Key': key } },
    );
  }
  previewMovementCorrection(householdId: string, id: string, body: CorrectionRequest) {
    return this.request<CorrectionPreviewResponse>(
      'POST',
      this.household(householdId) + `/movements/${encodeURIComponent(id)}/corrections/preview`,
      { body },
    );
  }
  reverseMovement(householdId: string, id: string, body: ReverseRequest, key: string) {
    return this.request<MovementResponse>(
      'POST',
      this.household(householdId) + `/movements/${encodeURIComponent(id)}/reverse`,
      { body, headers: { 'Idempotency-Key': key } },
    );
  }
  registerPushSubscription(householdId: string, body: RegisterPushSubscriptionRequest) {
    return this.request<PushSubscriptionResponse>(
      'POST',
      this.household(householdId) + `/push-subscriptions`,
      { body },
    );
  }
  sendTestPushNotification(householdId: string, body: SendHouseholdNotificationRequest) {
    return this.request<void>(
      'POST',
      this.household(householdId) + `/push-subscriptions/test-notification`,
      { body },
    );
  }
  getPushVapidPublicKey(householdId: string) {
    return this.request<VapidPublicKeyResponse>(
      'GET',
      this.household(householdId) + `/push-subscriptions/vapid-public-key`,
      {},
    );
  }
  getCurrentUser() {
    return this.request<UserResponse>('GET', this.base + `/api/v1/me`, {});
  }
}
