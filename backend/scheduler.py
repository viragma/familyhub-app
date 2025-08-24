from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.orm import Session
from datetime import date, timedelta
from . import crud, models
from .database import SessionLocal
from dateutil.relativedelta import relativedelta


def get_next_run_date(rule: models.RecurringRule) -> date:
    """ Kiszámolja a következő futási dátumot a komplex szabály alapján. """
    today = date.today()
    # A számítást mindig a legutóbbi esedékességtől vagy a kezdődátumtól végezzük
    current_next_run = rule.next_run_date if rule.next_run_date > rule.start_date else rule.start_date

    if rule.frequency == 'napi':
        return current_next_run + relativedelta(days=1)
    elif rule.frequency == 'heti':
        return current_next_run + relativedelta(weeks=1)
    elif rule.frequency == 'havi':
        return current_next_run + relativedelta(months=1)
    elif rule.frequency == 'éves':
        return current_next_run + relativedelta(years=1)

    return today + relativedelta(days=1) # Fallback

async def process_recurring_transactions():
    """ Ez a függvény fut le minden nap, és végrehajtja az esedékes tranzakciókat. """
    print(f"[{datetime.now()}] Időzített feladatok ellenőrzése...")
    db: Session = SessionLocal()
    try:
        today = date.today()
        rules_to_run = db.query(models.RecurringRule).filter(
            models.RecurringRule.is_active == True,
            models.RecurringRule.next_run_date <= today
        ).all()

        if not rules_to_run:
            print("Nincs ma esedékes ismétlődő tranzakció.")
            db.close()
            return

        for rule in rules_to_run:
            print(f"Tranzakció végrehajtása a(z) {rule.id} szabály alapján.")
            owner = crud.get_user(db, rule.owner_id)
            
            # === KIBŐVÍTETT LOGIKA ===
            if rule.type == 'átutalás':
                transfer_data = schemas.TransferCreate(
                    from_account_id=rule.from_account_id,
                    to_account_id=rule.to_account_id,
                    amount=rule.amount,
                    description=rule.description
                )
                crud.create_transfer(db=db, transfer_data=transfer_data, user=owner)
            else: # Bevétel vagy Kiadás
                transaction_data = schemas.TransactionCreate(
                    description=rule.description,
                    amount=rule.amount,
                    type=rule.type,
                    category_id=rule.category_id
                )
                crud.create_account_transaction(db=db, transaction=transaction_data, account_id=rule.to_account_id, user=owner)

            rule.next_run_date = get_next_run_date(rule)
            db.add(rule)
        
        db.commit()
        print(f"{len(rules_to_run)} ismétlődő tranzakció sikeresen végrehajtva.")

    finally:
        db.close()
# Létrehozzuk és elindítjuk az időzítőt
scheduler = AsyncIOScheduler()
# Beállítjuk, hogy a 'process_recurring_transactions' fusson le minden nap hajnali 3-kor
# Teszteléshez átállíthatod, pl. `trigger='interval', seconds=30`
scheduler.add_job(process_recurring_transactions, trigger='cron', hour=3, minute=0)