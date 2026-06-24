# Messaging Feature Rebuild — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the reseller + admin SMS messaging UX (mobile-first) so resellers can target specific customers, see live send status, and audit credits — exposing backend capability that already exists and adding the few endpoints the UI needs.

**Architecture:** Two repos, each in its own worktree on branch `worktree-messaging-rebuild`. Backend (`isp-billing`, FastAPI) gets additive route/service changes only — no DB migrations. Frontend (`isp-billing-admin`, Next.js) rebuilds `app/messaging` (reseller) and `app/admin/messaging` (admin) into focused components, plus `app/lib/{types,api}.ts`.

**Tech Stack:** FastAPI + SQLAlchemy async + pytest (asyncio auto-mode); Next.js 15 app-router + React + TypeScript + Tailwind; existing primitives `Tabs`, `Header`, `LoadingSpinner`, `BuySmsCreditsModal`, `calcSegments`, `AlertContext`, `AuthContext`.

## Global Constraints

- Backend worktree: `C:\Users\pc\internet-project\isp-billing\.claude\worktrees\messaging-rebuild`. Run tests with `python -m pytest` (pytest 9, asyncio auto-mode).
- Frontend worktree: `C:\Users\pc\internet-project\isp-billing-admin\.claude\worktrees\messaging-rebuild`. `npm run lint` baseline = 18 errors / 36 warnings (pre-existing; do not regress). `npx tsc --noEmit` must stay clean (0 errors).
- No DB migrations. `Customer.name` (nullable) and `sms_credit_transactions` already exist.
- Recipient phone dedup is by phone string (existing behavior) — preserve it; `count` is always the post-dedup total.
- Credit math is authoritative server-side (reserve `segments × recipients` → deduct → refund failures). Do not change it.
- Test factories: `from tests.factories import make_reseller, make_plan, make_customer, make_sms_account`. Auth in route tests: `_auth_as(monkeypatch, user)` patches `<module>.get_current_user`.
- Commit message footer on every commit: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- Provider/sender resolution, dispatch worker, and M-Pesa purchase flow are unchanged.

---

## File Structure

**Backend (`isp-billing`):**
- Modify `app/services/sms_dispatch.py` — `resolve_recipients()` gains `name`, `search`, `exclude_customer_ids`, returns name.
- Modify `app/api/messaging_routes.py` — `/recipients` (name/search/exclude/limit/offset/has_more), `/send` (exclude_customer_ids), `/campaigns/{id}` (names + counts), new `/credits/ledger`.
- Modify `app/api/admin_messaging_routes.py` — `/inbox` multi-select resellers, new `/resellers/{id}/ledger`.
- Modify `tests/test_messaging_routes.py`, `tests/test_messaging_dispatch.py`, `tests/test_admin_messaging_routes.py`.

**Frontend (`isp-billing-admin`):**
- Modify `app/lib/types.ts`, `app/lib/api.ts`.
- Reseller `app/messaging/`: new `components/RecipientPicker.tsx`, `components/ComposeView.tsx`, `components/ActivityView.tsx`, `components/CreditsView.tsx`, `components/TemplatesView.tsx`, `components/CampaignDetailSheet.tsx`, `lib/segments.ts` (extract `calcSegments`); rewrite `MessagingClient.tsx` as the shell.
- Admin `app/admin/messaging/`: new `components/ResellerPicker.tsx`, `components/BroadcastView.tsx`, `components/ResellerLedgerSheet.tsx`; refactor `AdminMessagingClient.tsx` to consume them.

---

# PHASE A — Backend (isp-billing)

> All tasks run in the backend worktree. Each test mirrors `tests/test_messaging_routes.py` conventions.

### Task A1: `resolve_recipients` returns name + supports search & exclude

**Files:**
- Modify: `app/services/sms_dispatch.py` (`resolve_recipients`)
- Test: `tests/test_messaging_dispatch.py`

**Interfaces:**
- Produces: `resolve_recipients(db, reseller_id, *, filter="all", plan_id=None, customer_ids=None, exclude_customer_ids=None, search=None, expiring_days=7) -> list[dict]` where each dict is `{"customer_id": int, "name": str | None, "phone": str}`, de-duplicated by phone, in stable id order.

- [ ] **Step 1: Write failing tests**

```python
# tests/test_messaging_dispatch.py  (add)
import pytest
from app.services import sms_dispatch
from app.db.models import CustomerStatus
from tests.factories import make_reseller, make_plan, make_customer


@pytest.mark.asyncio
async def test_resolve_includes_name(db):
    r = await make_reseller(db)
    p = await make_plan(db, r)
    await make_customer(db, r, p, name="Jane Doe", phone="254700000001")
    out = await sms_dispatch.resolve_recipients(db, r.id, filter="all")
    assert out == [{"customer_id": out[0]["customer_id"], "name": "Jane Doe", "phone": "254700000001"}]


@pytest.mark.asyncio
async def test_resolve_search_matches_name_or_phone(db):
    r = await make_reseller(db)
    p = await make_plan(db, r)
    await make_customer(db, r, p, name="Alice", phone="254700000010")
    await make_customer(db, r, p, name="Bob", phone="254711222333")
    by_name = await sms_dispatch.resolve_recipients(db, r.id, search="ali")
    assert [c["name"] for c in by_name] == ["Alice"]
    by_phone = await sms_dispatch.resolve_recipients(db, r.id, search="711222")
    assert [c["name"] for c in by_phone] == ["Bob"]


@pytest.mark.asyncio
async def test_resolve_exclude_customer_ids(db):
    r = await make_reseller(db)
    p = await make_plan(db, r)
    keep = await make_customer(db, r, p, name="Keep", phone="254700000020")
    drop = await make_customer(db, r, p, name="Drop", phone="254700000021")
    out = await sms_dispatch.resolve_recipients(db, r.id, filter="all",
                                                exclude_customer_ids=[drop.id])
    assert [c["customer_id"] for c in out] == [keep.id]
```

- [ ] **Step 2: Run, verify fail**

Run: `python -m pytest tests/test_messaging_dispatch.py -q -k "resolve_"`
Expected: FAIL (name key missing / unexpected kwargs).

- [ ] **Step 3: Implement**

In `app/services/sms_dispatch.py`, replace the `resolve_recipients` body:

```python
async def resolve_recipients(db, reseller_id: int, *, filter: str = "all",
                             plan_id: Optional[int] = None,
                             customer_ids: Optional[list[int]] = None,
                             exclude_customer_ids: Optional[list[int]] = None,
                             search: Optional[str] = None,
                             expiring_days: int = 7) -> list[dict]:
    """Return [{customer_id, name, phone}] for a reseller, de-duplicated by phone."""
    stmt = select(Customer.id, Customer.name, Customer.phone).where(
        Customer.user_id == reseller_id, Customer.phone.isnot(None))
    if customer_ids:
        stmt = stmt.where(Customer.id.in_(customer_ids))
    elif filter == "by_plan" and plan_id:
        stmt = stmt.where(Customer.plan_id == plan_id)
    elif filter == "active":
        stmt = stmt.where(Customer.status == CustomerStatus.ACTIVE)
    elif filter == "expiring":
        cutoff = datetime.utcnow() + timedelta(days=expiring_days)
        stmt = stmt.where(Customer.expiry.isnot(None), Customer.expiry <= cutoff)
    if exclude_customer_ids and not customer_ids:
        stmt = stmt.where(Customer.id.notin_(exclude_customer_ids))
    if search:
        like = f"%{search.strip()}%"
        stmt = stmt.where((Customer.name.ilike(like)) | (Customer.phone.ilike(like)))
    stmt = stmt.order_by(Customer.id)
    rows = (await db.execute(stmt)).all()
    seen, out = set(), []
    for cid, name, phone in rows:
        phone = (phone or "").strip()
        if not phone or phone in seen:
            continue
        seen.add(phone)
        out.append({"customer_id": cid, "name": name, "phone": phone})
    return out
```

- [ ] **Step 4: Run, verify pass**

Run: `python -m pytest tests/test_messaging_dispatch.py -q`
Expected: PASS (new + existing dispatch tests).

- [ ] **Step 5: Commit**

```bash
git add app/services/sms_dispatch.py tests/test_messaging_dispatch.py
git commit -m "Recipient resolution: include name, support search and exclude

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task A2: `/recipients` exposes name, search, exclude, paging

**Files:**
- Modify: `app/api/messaging_routes.py` (`list_recipients`)
- Test: `tests/test_messaging_routes.py`

**Interfaces:**
- Produces: `GET /api/messaging/recipients?filter=&plan_id=&search=&limit=50&offset=0&exclude_customer_ids=1,2` → `{count: int, recipients: [{customer_id, name, phone}], has_more: bool}`. `count` = full post-dedup total; `recipients` = page slice.

- [ ] **Step 1: Write failing test**

```python
# tests/test_messaging_routes.py  (add; make_customer already importable)
@pytest.mark.asyncio
async def test_recipients_returns_names_and_paginates(db, client, monkeypatch):
    from tests.factories import make_customer, make_plan
    r = await make_reseller(db); _auth_as(monkeypatch, r)
    p = await make_plan(db, r)
    for i in range(3):
        await make_customer(db, r, p, name=f"C{i}", phone=f"25470000010{i}")
    resp = await client.get("/api/messaging/recipients?limit=2&offset=0")
    body = resp.json()
    assert resp.status_code == 200
    assert body["count"] == 3
    assert len(body["recipients"]) == 2
    assert body["has_more"] is True
    assert set(body["recipients"][0].keys()) == {"customer_id", "name", "phone"}


@pytest.mark.asyncio
async def test_recipients_search_filters(db, client, monkeypatch):
    from tests.factories import make_customer, make_plan
    r = await make_reseller(db); _auth_as(monkeypatch, r)
    p = await make_plan(db, r)
    await make_customer(db, r, p, name="Zara", phone="254799999999")
    await make_customer(db, r, p, name="Tom", phone="254788888888")
    resp = await client.get("/api/messaging/recipients?search=zar")
    assert [c["name"] for c in resp.json()["recipients"]] == ["Zara"]
    assert resp.json()["count"] == 1
```

- [ ] **Step 2: Run, verify fail**

Run: `python -m pytest tests/test_messaging_routes.py -q -k recipients`
Expected: FAIL (no `name`/`has_more`, no paging).

- [ ] **Step 3: Implement**

Replace `list_recipients` in `app/api/messaging_routes.py`:

```python
@router.get("/api/messaging/recipients")
async def list_recipients(filter: str = Query("all"),
                          plan_id: Optional[int] = None,
                          search: Optional[str] = None,
                          exclude_customer_ids: Optional[str] = Query(None),
                          limit: int = Query(50, ge=1, le=500),
                          offset: int = Query(0, ge=0),
                          db: AsyncSession = Depends(get_db),
                          token: str = Depends(verify_token)):
    user = await _require_reseller(token, db)
    exclude = [int(x) for x in exclude_customer_ids.split(",") if x.strip().isdigit()] \
        if exclude_customer_ids else None
    recips = await sms_dispatch.resolve_recipients(
        db, user.id, filter=filter, plan_id=plan_id, search=search,
        exclude_customer_ids=exclude)
    page = recips[offset:offset + limit]
    return {"count": len(recips), "recipients": page,
            "has_more": offset + limit < len(recips)}
```

- [ ] **Step 4: Run, verify pass**

Run: `python -m pytest tests/test_messaging_routes.py -q -k recipients`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/messaging_routes.py tests/test_messaging_routes.py
git commit -m "Recipients endpoint: names, search, exclude, paging

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task A3: `/send` accepts `exclude_customer_ids`

**Files:**
- Modify: `app/api/messaging_routes.py` (`SendRequest`, `send_messages`)
- Test: `tests/test_messaging_routes.py`

**Interfaces:**
- Consumes: `resolve_recipients(..., exclude_customer_ids=...)` from A1.
- Produces: `POST /api/messaging/send` body adds optional `exclude_customer_ids: list[int]`. Resolution precedence unchanged: explicit `customer_ids` wins; else `filter`(+`plan_id`) minus `exclude_customer_ids`. Charged credits = `segments × len(resolved)`.

- [ ] **Step 1: Write failing test**

```python
@pytest.mark.asyncio
async def test_send_excludes_then_charges_remaining(db, client, monkeypatch):
    from tests.factories import make_customer, make_plan, make_sms_account
    r = await make_reseller(db); _auth_as(monkeypatch, r)
    await make_sms_account(db, r, balance=100)
    p = await make_plan(db, r)
    keep = await make_customer(db, r, p, name="Keep", phone="254700000201")
    drop = await make_customer(db, r, p, name="Drop", phone="254700000202")
    captured = {}
    async def _fake_dispatch(cid): captured["cid"] = cid
    monkeypatch.setattr(mr.sms_dispatch, "dispatch_campaign", _fake_dispatch)
    resp = await client.post("/api/messaging/send", json={
        "body": "hello", "filter": "all", "exclude_customer_ids": [drop.id]})
    assert resp.status_code == 200
    assert resp.json()["recipient_count"] == 1
    assert resp.json()["credits_reserved"] == 1  # 1 segment * 1 recipient
```

- [ ] **Step 2: Run, verify fail**

Run: `python -m pytest tests/test_messaging_routes.py -q -k send_excludes`
Expected: FAIL (field ignored → count 2).

- [ ] **Step 3: Implement**

In `SendRequest` add: `exclude_customer_ids: Optional[list[int]] = None`. In `send_messages`, pass it through:

```python
    recips = await sms_dispatch.resolve_recipients(
        db, user.id, filter=req.filter, plan_id=req.plan_id,
        customer_ids=req.customer_ids,
        exclude_customer_ids=req.exclude_customer_ids)
```

- [ ] **Step 4: Run, verify pass**

Run: `python -m pytest tests/test_messaging_routes.py -q`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/messaging_routes.py tests/test_messaging_routes.py
git commit -m "Send endpoint: support exclude_customer_ids

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task A4: Credit ledger endpoint (reseller)

**Files:**
- Modify: `app/api/messaging_routes.py` (new route; import `SmsCreditTransaction`)
- Test: `tests/test_messaging_routes.py`

**Interfaces:**
- Produces: `GET /api/messaging/credits/ledger?limit=50&offset=0` → `{transactions: [{id, kind, change, balance_after, reference, note, created_at}]}` newest first, scoped to the calling reseller. `kind` is the enum value string.

- [ ] **Step 1: Write failing test**

```python
@pytest.mark.asyncio
async def test_ledger_lists_reseller_transactions_newest_first(db, client, monkeypatch):
    from tests.factories import make_sms_account
    from app.services import sms_credits
    from app.db.models import SmsCreditTxnKind
    r = await make_reseller(db); _auth_as(monkeypatch, r)
    await make_sms_account(db, r, balance=0)
    await sms_credits.grant(db, r.id, 100, SmsCreditTxnKind.PURCHASE, reference="SMS-1")
    await sms_credits.try_deduct(db, r.id, 30, reference="campaign:5")
    await db.commit()
    resp = await client.get("/api/messaging/credits/ledger")
    txns = resp.json()["transactions"]
    assert resp.status_code == 200
    assert [t["kind"] for t in txns] == ["send_debit", "purchase"]
    assert txns[0]["change"] == -30 and txns[0]["balance_after"] == 70
```

- [ ] **Step 2: Run, verify fail** — `python -m pytest tests/test_messaging_routes.py -q -k ledger` → FAIL (404).

- [ ] **Step 3: Implement**

Add import `SmsCreditTransaction` to the models import block, then add:

```python
@router.get("/api/messaging/credits/ledger")
async def credit_ledger(limit: int = Query(50, ge=1, le=200),
                        offset: int = Query(0, ge=0),
                        db: AsyncSession = Depends(get_db),
                        token: str = Depends(verify_token)):
    user = await _require_reseller(token, db)
    rows = (await db.execute(
        select(SmsCreditTransaction)
        .where(SmsCreditTransaction.user_id == user.id)
        .order_by(SmsCreditTransaction.created_at.desc(),
                  SmsCreditTransaction.id.desc())
        .limit(limit).offset(offset)
    )).scalars().all()
    return {"transactions": [{
        "id": t.id,
        "kind": t.kind.value if hasattr(t.kind, "value") else t.kind,
        "change": t.change, "balance_after": t.balance_after,
        "reference": t.reference, "note": t.note,
        "created_at": t.created_at.isoformat() if t.created_at else None,
    } for t in rows]}
```

- [ ] **Step 4: Run, verify pass** — `python -m pytest tests/test_messaging_routes.py -q -k ledger` → PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/messaging_routes.py tests/test_messaging_routes.py
git commit -m "Add reseller credit ledger endpoint

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task A5: Campaign detail — names + counts

**Files:**
- Modify: `app/api/messaging_routes.py` (`campaign_detail`)
- Test: `tests/test_messaging_routes.py`

**Interfaces:**
- Produces: `GET /api/messaging/campaigns/{id}` → adds `name` to each message row and a `counts` object `{total, sent, failed, queued, delivered}`. Existing fields (`id`, `status`, `messages[].phone/status/error`) preserved.

- [ ] **Step 1: Write failing test**

```python
@pytest.mark.asyncio
async def test_campaign_detail_has_names_and_counts(db, client, monkeypatch):
    from tests.factories import make_customer, make_plan
    from app.db.models import (SmsCampaign, SmsCampaignStatus, SmsMessage,
                               SmsMessageStatus, SmsMessageKind)
    r = await make_reseller(db); _auth_as(monkeypatch, r)
    p = await make_plan(db, r)
    c = await make_customer(db, r, p, name="Named Cust", phone="254700000301")
    camp = SmsCampaign(user_id=r.id, body="hi", recipient_count=1,
                       segments_per_message=1, total_credits=1,
                       status=SmsCampaignStatus.COMPLETED)
    db.add(camp); await db.flush()
    db.add(SmsMessage(campaign_id=camp.id, user_id=r.id, customer_id=c.id,
                      recipient_phone="254700000301", body="hi", segments=1,
                      credits_charged=1, kind=SmsMessageKind.RESELLER_TO_CUSTOMER,
                      status=SmsMessageStatus.SENT))
    await db.commit()
    resp = await client.get(f"/api/messaging/campaigns/{camp.id}")
    body = resp.json()
    assert body["messages"][0]["name"] == "Named Cust"
    assert body["counts"] == {"total": 1, "sent": 1, "failed": 0,
                              "queued": 0, "delivered": 0}
```

- [ ] **Step 2: Run, verify fail** — `... -k campaign_detail_has_names` → FAIL.

- [ ] **Step 3: Implement**

Replace the `msgs` query + return in `campaign_detail` to outer-join Customer and compute counts:

```python
    from app.db.models import Customer  # local import ok, or add to top block
    rows = (await db.execute(
        select(SmsMessage, Customer.name)
        .outerjoin(Customer, SmsMessage.customer_id == Customer.id)
        .where(SmsMessage.campaign_id == campaign_id).limit(2000)
    )).all()
    counts = {"total": 0, "sent": 0, "failed": 0, "queued": 0, "delivered": 0}
    messages = []
    for m, name in rows:
        st = m.status.value if hasattr(m.status, "value") else m.status
        counts["total"] += 1
        if st in counts:
            counts[st] += 1
        messages.append({"phone": m.recipient_phone, "name": name,
                         "status": st, "error": m.error})
    return {"id": camp.id,
            "status": camp.status.value if hasattr(camp.status, "value") else camp.status,
            "counts": counts, "messages": messages}
```

- [ ] **Step 4: Run, verify pass** — `python -m pytest tests/test_messaging_routes.py -q` → PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/messaging_routes.py tests/test_messaging_routes.py
git commit -m "Campaign detail: include recipient names and status counts

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task A6: Admin broadcast — multi-select resellers

**Files:**
- Modify: `app/api/admin_messaging_routes.py` (`InboxSendIn`, `send_inbox`)
- Test: `tests/test_admin_messaging_routes.py`

**Interfaces:**
- Produces: `POST /api/admin/messaging/inbox` body = `{reseller_ids: int[] | null, all_resellers: bool, subject?, body, also_sms}`. If `all_resellers` → all resellers; else the given `reseller_ids`. Empty selection → 400. Response shape unchanged (`{message, recipients, sms_queued, sms_skipped_no_phone}`).

- [ ] **Step 1: Write failing test** (mirror existing admin test setup for fixtures/auth)

```python
@pytest.mark.asyncio
async def test_broadcast_to_selected_resellers(db, client, monkeypatch):
    from tests.factories import make_reseller
    admin = await make_admin(db); _auth_as(monkeypatch, admin)  # use this file's helpers
    r1 = await make_reseller(db); r2 = await make_reseller(db); await make_reseller(db)
    resp = await client.post("/api/admin/messaging/inbox", json={
        "reseller_ids": [r1.id, r2.id], "all_resellers": False,
        "subject": "Hi", "body": "msg", "also_sms": False})
    assert resp.status_code == 200
    assert resp.json()["recipients"] == 2
```

(If the test file lacks `make_admin`/`_auth_as`, reuse the patterns already present in `tests/test_admin_messaging_routes.py`.)

- [ ] **Step 2: Run, verify fail** — FAIL (field shape mismatch).

- [ ] **Step 3: Implement**

```python
class InboxSendIn(BaseModel):
    reseller_ids: Optional[list[int]] = None
    all_resellers: bool = False
    subject: Optional[str] = Field(None, max_length=200)
    body: str = Field(..., min_length=1, max_length=2000)
    also_sms: bool = False
```

In `send_inbox`, replace the recipient-resolution block:

```python
    if req.all_resellers:
        resellers = (await db.execute(
            select(User).where(User.role == UserRole.RESELLER))).scalars().all()
    elif req.reseller_ids:
        resellers = (await db.execute(
            select(User).where(User.id.in_(req.reseller_ids),
                               User.role == UserRole.RESELLER))).scalars().all()
        if not resellers:
            raise HTTPException(status_code=404, detail="No matching resellers")
    else:
        raise HTTPException(status_code=400,
                            detail="Select resellers or choose all")
    broadcast_id = str(uuid.uuid4()) if req.all_resellers else None
```

(Leave the rest of the loop, SMS row creation, and dispatch untouched.)

- [ ] **Step 4: Run, verify pass** — `python -m pytest tests/test_admin_messaging_routes.py -q` → PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/admin_messaging_routes.py tests/test_admin_messaging_routes.py
git commit -m "Admin broadcast: multi-select specific resellers

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task A7: Admin reseller ledger endpoint

**Files:**
- Modify: `app/api/admin_messaging_routes.py` (new route)
- Test: `tests/test_admin_messaging_routes.py`

**Interfaces:**
- Produces: `GET /api/admin/messaging/resellers/{reseller_id}/ledger?limit=&offset=` → same row shape as Task A4, scoped to `reseller_id`. Admin-only.

- [ ] **Step 1: Write failing test**

```python
@pytest.mark.asyncio
async def test_admin_reseller_ledger(db, client, monkeypatch):
    from tests.factories import make_reseller, make_sms_account
    from app.services import sms_credits
    from app.db.models import SmsCreditTxnKind
    admin = await make_admin(db); _auth_as(monkeypatch, admin)
    r = await make_reseller(db); await make_sms_account(db, r, balance=0)
    await sms_credits.grant(db, r.id, 40, SmsCreditTxnKind.PURCHASE); await db.commit()
    resp = await client.get(f"/api/admin/messaging/resellers/{r.id}/ledger")
    assert resp.status_code == 200
    assert resp.json()["transactions"][0]["change"] == 40
```

- [ ] **Step 2: Run, verify fail** — FAIL (404).

- [ ] **Step 3: Implement** (add `SmsCreditTransaction` to imports)

```python
@router.get("/api/admin/messaging/resellers/{reseller_id}/ledger")
async def reseller_ledger(reseller_id: int,
                          limit: int = Query(50, ge=1, le=200),
                          offset: int = Query(0, ge=0),
                          db: AsyncSession = Depends(get_db),
                          token: str = Depends(verify_token)):
    await _require_admin(token, db)
    rows = (await db.execute(
        select(SmsCreditTransaction)
        .where(SmsCreditTransaction.user_id == reseller_id)
        .order_by(SmsCreditTransaction.created_at.desc(),
                  SmsCreditTransaction.id.desc())
        .limit(limit).offset(offset))).scalars().all()
    return {"transactions": [{
        "id": t.id,
        "kind": t.kind.value if hasattr(t.kind, "value") else t.kind,
        "change": t.change, "balance_after": t.balance_after,
        "reference": t.reference, "note": t.note,
        "created_at": t.created_at.isoformat() if t.created_at else None,
    } for t in rows]}
```

- [ ] **Step 4: Run, verify pass** — `python -m pytest tests/test_admin_messaging_routes.py -q` → PASS.

- [ ] **Step 5: Full backend suite + commit**

```bash
python -m pytest tests/test_messaging_routes.py tests/test_messaging_dispatch.py tests/test_admin_messaging_routes.py tests/test_sms_credits.py -q
git add app/api/admin_messaging_routes.py tests/test_admin_messaging_routes.py
git commit -m "Add admin reseller credit ledger endpoint

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

# PHASE B — Frontend shared (types + api)

### Task B1: Types

**Files:** Modify `app/lib/types.ts`.

**Interfaces (Produces):**

```typescript
export interface SmsRecipient { customer_id: number; name: string | null; phone: string; }
export interface SmsRecipientsResponse { count: number; recipients: SmsRecipient[]; has_more: boolean; }
export interface SmsSendRequest {
  body: string; filter?: string; plan_id?: number;
  customer_ids?: number[]; exclude_customer_ids?: number[]; template_id?: number;
}
export type SmsTxnKind = 'purchase' | 'send_debit' | 'refund' | 'admin_adjustment';
export interface SmsCreditTransaction {
  id: number; kind: SmsTxnKind; change: number; balance_after: number;
  reference: string | null; note: string | null; created_at: string | null;
}
export interface SmsCampaignCounts { total: number; sent: number; failed: number; queued: number; delivered: number; }
export interface SmsCampaignMessage { phone: string; name: string | null; status: string; error: string | null; }
export interface SmsCampaignDetail { id: number; status: string; counts: SmsCampaignCounts; messages: SmsCampaignMessage[]; }
export interface AdminInboxSendRequest {
  reseller_ids: number[] | null; all_resellers: boolean;
  subject?: string; body: string; also_sms: boolean;
}
```

- [ ] **Step 1:** Update `SmsRecipient` (add `name`), `SmsRecipientsResponse` (add `has_more`), `SmsSendRequest` (add `exclude_customer_ids`), `SmsCampaignMessage` (add `name`), `SmsCampaignDetail` (add `counts`); add `SmsTxnKind`, `SmsCreditTransaction`; change `AdminInboxSendRequest` to the shape above.
- [ ] **Step 2:** `npx tsc --noEmit` → expect errors only in files that consume the changed types (api.ts, the messaging clients) — those are fixed in later tasks. Note them; do not fix unrelated code.
- [ ] **Step 3:** Commit `git add app/lib/types.ts && git commit -m "Messaging types: recipient names, ledger, campaign counts, admin multi-select"` (+ Co-Authored-By footer).

---

### Task B2: API client

**Files:** Modify `app/lib/api.ts`.

**Interfaces (Produces):**
- `getSmsRecipients(opts: { filter?: string; planId?: number; search?: string; excludeIds?: number[]; limit?: number; offset?: number }): Promise<SmsRecipientsResponse>`
- `getSmsCreditLedger(limit?: number, offset?: number): Promise<{ transactions: SmsCreditTransaction[] }>`
- `getAdminResellerLedger(resellerId: number, limit?: number, offset?: number): Promise<{ transactions: SmsCreditTransaction[] }>`
- `sendInboxMessage(payload: AdminInboxSendRequest)` — unchanged name, new payload shape.
- `getSmsCampaign(id)` return type now `SmsCampaignDetail` (with counts/names).

- [ ] **Step 1:** Rewrite `getSmsRecipients` to take the options object and build the query string (include `search`, `exclude_customer_ids` as CSV, `limit`, `offset` when present). Keep auth header pattern (`this.getHeaders()` / existing `credentials`).
- [ ] **Step 2:** Add `getSmsCreditLedger` (`GET /messaging/credits/ledger?limit=&offset=`) and `getAdminResellerLedger` (`GET /admin/messaging/resellers/${id}/ledger?...`). Import the new types.
- [ ] **Step 3:** `npx tsc --noEmit` → api.ts clean (callers fixed in later tasks).
- [ ] **Step 4:** Commit (`"Messaging API: recipients options, credit ledger endpoints"` + footer).

---

# PHASE C — Frontend reseller (`app/messaging`)

> Mirror existing dark-theme Tailwind classes from the current `MessagingClient.tsx` (`card`, `input`, `select`, `btn-primary`, `text-foreground-muted`, `text-success`, `text-danger`, amber accents). Mobile-first: single column, `pb-24 md:pb-6`, sticky bottom bars with `env(safe-area-inset-bottom)`.

### Task C1: Extract `calcSegments` to `app/messaging/lib/segments.ts`

- [ ] **Step 1:** Create `app/messaging/lib/segments.ts` exporting `calcSegments` + the GSM-7 helpers (move verbatim from current `MessagingClient.tsx` lines 13–45).
- [ ] **Step 2:** `npx tsc --noEmit` clean.
- [ ] **Step 3:** Commit (`"Extract calcSegments helper"` + footer).

**Interfaces (Produces):** `calcSegments(text: string): { segments: number; chars: number; maxPerSegment: number; isGsm: boolean }`.

### Task C2: `RecipientPicker` component

**Files:** Create `app/messaging/components/RecipientPicker.tsx`.

**Interfaces (Produces):**
```typescript
export type AudienceMode = 'all' | 'active' | 'expiring' | 'by_plan' | 'specific';
export interface RecipientSelection {
  mode: AudienceMode; planId?: number;
  // resolved send descriptor for the API:
  filter?: string; customer_ids?: number[]; exclude_customer_ids?: number[];
  count: number; // exact recipients to be charged
  summaryLabel: string; // e.g. "Active · 60 of 62"
}
export function RecipientPicker(props: {
  plans: Plan[];
  value: RecipientSelection;
  onChange: (sel: RecipientSelection) => void;
}): JSX.Element;
```

**Behavior (implement; this is the core feature):**
- Mode pills (All/Active/Expiring/By plan/Specific people). Selecting a segment mode fetches `getSmsRecipients({filter, planId})` for the list + true `count`.
- List rows: checkbox + name + phone (+ status/plan tag if available). Segment modes default every row ticked; "Specific people" defaults empty. Provide **Select all**, **Select none**, and a **search** box (debounced → `getSmsRecipients({filter, planId, search})`).
- Track ticks as a `Set<number>` plus, for segment modes, the full id set so deselections become `exclude_customer_ids`.
- Emit `RecipientSelection` via `onChange`:
  - Segment, none deselected → `{ filter, plan_id, count, ... }`.
  - Segment, some deselected → `{ filter, plan_id, exclude_customer_ids:[...], count }`.
  - Specific → `{ customer_ids:[...], count }`.
- Mobile: render the list inside a full-height bottom sheet (`fixed inset-0 z-[10000]`, `items-end`, `rounded-t-2xl`, grab handle, sticky "Done · N selected" bar with safe-area padding) opened from a "Pick people / Edit recipients" button; desktop renders inline. Reuse the modal scaffolding from the current `CampaignDetailModal` (overflow lock, backdrop, safe-area).
- Selected individuals shown as removable chips above the list.

- [ ] **Step 1:** Build the component with the contract above; paged "load more" using `has_more`/`offset`.
- [ ] **Step 2:** `npx tsc --noEmit` clean; lint no new errors.
- [ ] **Step 3:** Commit (`"Add RecipientPicker with audience modes + select/deselect"` + footer).

### Task C3: `ComposeView`

**Files:** Create `app/messaging/components/ComposeView.tsx`.

**Interfaces:**
- Consumes: `RecipientPicker`, `RecipientSelection` (C2), `calcSegments` (C1), `api.sendSms`, `api.getSmsTemplates`, `api.createSmsTemplate`, `SmsCreditInfo`.
- Props: `{ credits: SmsCreditInfo; onSent: (campaignId: number) => void; onSwitchToCredits: () => void; }`.

**Behavior:**
- Layout: left = RecipientPicker + message editor (template load/save dropdown, textarea, `calcSegments` counter); right (desktop) / sticky bottom (mobile) = **send summary** (recipients, segments/msg, credits needed = `segments × selection.count`, balance now, **balance after**), insufficient-credits red state with "Buy more" (`onSwitchToCredits`), Send button, phone preview bubble.
- On send: build `SmsSendRequest` from `selection` (`filter`/`plan_id`/`customer_ids`/`exclude_customer_ids`) + `body`; call `api.sendSms`; on success show alert, clear body, call `onSent(res.campaign_id)` (parent switches to Activity and starts polling).
- Disable Send when `body` empty, `selection.count === 0`, insufficient, or sending.

- [ ] **Step 1:** Build it. - [ ] **Step 2:** tsc clean, lint clean. - [ ] **Step 3:** Commit (`"Add ComposeView with live cost + sticky send bar"` + footer).

### Task C4: `CampaignDetailSheet` + `ActivityView`

**Files:** Create `app/messaging/components/CampaignDetailSheet.tsx`, `app/messaging/components/ActivityView.tsx`.

**Interfaces:**
- Consumes: `api.getSmsCampaigns`, `api.getSmsCampaign` (now returns `counts`+`name`), `SmsCampaign`, `SmsCampaignDetail`.
- `ActivityView` props: `{ focusCampaignId?: number }` (the just-sent id to highlight/poll).

**Behavior:**
- Stat cards computed from the campaigns list: Sent (sum `sent_count`), Failed (sum `failed_count`), In progress (count status `queued|sending`), Refunded (sum `refunded_credits`).
- Campaign cards (reuse current History card styling) with `StatusBadge`, counts, credits, refunded, time. Live: while any campaign is `queued|sending`, poll `getSmsCampaigns` every 4s (`setInterval`, cleared on unmount and when all settled). The `live` campaign shows a progress hint (`sent/recipient_count`).
- Tap a card → `CampaignDetailSheet`: loads `getSmsCampaign(id)`, shows status-filter tabs (All / Sent / Failed using `counts`), per-recipient rows (name, phone, status dot, error). Bottom sheet on mobile, modal on desktop. Polls the detail every 4s while not settled.

- [ ] **Step 1:** Build both. - [ ] **Step 2:** tsc/lint clean. - [ ] **Step 3:** Commit (`"Add ActivityView with live status polling + per-recipient sheet"` + footer).

### Task C5: `CreditsView` (balance + bundles + ledger)

**Files:** Create `app/messaging/components/CreditsView.tsx`.

**Interfaces:** Consumes `SmsCreditInfo`, `api.getSmsCreditLedger`, `BuySmsCreditsModal`, `SmsCreditTransaction`. Props `{ credits: SmsCreditInfo; onRefresh: () => void }`.

**Behavior:** Keep existing balance summary + bundles + custom-quantity buy (port from current `CreditsTab`). Add a **ledger** list below: fetch `getSmsCreditLedger`; render rows with kind chip (Purchase=emerald / Send=amber / Refund=blue / Admin=neutral), reference, `change` (±, colored), `balance_after`, date. Mobile = stacked rows; `lg+` = table. "Load more" via offset.

- [ ] **Step 1:** Build it. - [ ] **Step 2:** tsc/lint clean. - [ ] **Step 3:** Commit (`"Add CreditsView with transaction ledger"` + footer).

### Task C6: `TemplatesView` + assemble `MessagingClient`

**Files:** Create `app/messaging/components/TemplatesView.tsx`; rewrite `app/messaging/MessagingClient.tsx` as the shell.

**Behavior:**
- `TemplatesView`: port current `TemplatesTab` (create/list/delete) into its own file, mobile-friendly.
- `MessagingClient`: keep role guard (reseller-only), credits load, enabled/disabled empty state. Section nav via existing `Tabs` (Compose · Activity · Templates · Credits) + a balance chip in the `Header`. Wire `ComposeView.onSent` → switch to Activity tab with `focusCampaignId` set + refresh credits. Remove the old `SendTab`/`CreditsTab`/`HistoryTab`/`TemplatesTab`/`CampaignDetailModal` once replaced.

- [ ] **Step 1:** Build + wire. - [ ] **Step 2:** `npx tsc --noEmit` clean; `npm run lint` no new errors vs baseline; `npm run build` succeeds. - [ ] **Step 3:** Commit (`"Rebuild reseller messaging shell: Compose/Activity/Templates/Credits"` + footer).

---

# PHASE D — Frontend admin (`app/admin/messaging`)

### Task D1: `ResellerPicker` + `BroadcastView`

**Files:** Create `app/admin/messaging/components/ResellerPicker.tsx`, `app/admin/messaging/components/BroadcastView.tsx`.

**Interfaces:** `ResellerPicker` mirrors `RecipientPicker`'s multi-select/search/select-all UX but over the in-memory `AdminReseller[]` (no fetch needed) and emits `{ reseller_ids: number[] | null, all_resellers: boolean, count }`. `BroadcastView` props `{ resellers: AdminReseller[]; loadingResellers: boolean }`.

**Behavior:** `BroadcastView` ports the current compose form (subject/body/also_sms) but replaces the single-select dropdown with `ResellerPicker` (all-resellers toggle + multi-select chips + search). On send call `api.sendInboxMessage({ reseller_ids, all_resellers, subject, body, also_sms })`; keep the SMS-queued/skipped success note.

- [ ] **Step 1:** Build both. - [ ] **Step 2:** tsc/lint clean. - [ ] **Step 3:** Commit (`"Admin broadcast: multi-select reseller picker"` + footer).

### Task D2: `ResellerLedgerSheet` in Credit sales

**Files:** Create `app/admin/messaging/components/ResellerLedgerSheet.tsx`; modify `SalesTab` in `AdminMessagingClient.tsx`.

**Behavior:** In the orders table / mobile cards, make each reseller row open a `ResellerLedgerSheet` (calls `api.getAdminResellerLedger(resellerId)`), same ledger rendering as C5. Bottom sheet on mobile, modal on desktop.

- [ ] **Step 1:** Build + wire. - [ ] **Step 2:** tsc/lint clean. - [ ] **Step 3:** Commit (`"Admin credit sales: per-reseller ledger drill-in"` + footer).

### Task D3: Assemble admin client

**Files:** Modify `app/admin/messaging/AdminMessagingClient.tsx`.

**Behavior:** Replace inline `BroadcastTab` with `BroadcastView`; keep `SettingsTab`, `SalesTab` (now with ledger), `SmsHistoryTab`. Ensure consistent mobile-first spacing/cards with the reseller side. Keep admin role guard.

- [ ] **Step 1:** Refactor. - [ ] **Step 2:** `npx tsc --noEmit` clean; `npm run lint` no new errors; `npm run build` succeeds. - [ ] **Step 3:** Commit (`"Unify admin messaging client with new components"` + footer).

---

# PHASE E — Verification

### Task E1: Backend full suite
- [ ] `cd` backend worktree; `python -m pytest -q` → all pass (baseline 47 messaging + new tests).

### Task E2: Frontend gates
- [ ] `npx tsc --noEmit` → 0 errors.
- [ ] `npm run lint` → ≤ baseline (18 errors / 36 warnings), no new errors in messaging files.
- [ ] `npm run build` → succeeds.
- [ ] `npm test` (vitest) → passes.

### Task E3: Manual / Playwright smoke (mobile viewport)
- [ ] Use the `run`/`verify` skill or Playwright at 390×844: Compose → pick "Specific people", search, tick 2, send; confirm it appears in Activity as sending → settles; open detail, filter Failed; open Credits, confirm ledger shows the send debit; verify sticky send bar + picker sheet behave on mobile.
- [ ] Admin: broadcast to 2 selected resellers; open a reseller ledger from Credit sales.

### Task E4: Finish
- [ ] Use superpowers:finishing-a-development-branch to open a PR per repo (backend first).
