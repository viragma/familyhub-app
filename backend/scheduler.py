from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.orm import Session
from datetime import date, timedelta
from . import crud, models
from .database import SessionLocal

def get_next_run_date(rule: models.RecurringRule) -> date:
    """ Kiszámolja a következő futási dátumot a szabály alapján. """
    today = date.today()
    if rule.frequency == 'havi':
        # Ha a hónap utolsó napja, bonyolultabb a logika, egyelőre egyszerűsítünk
        # A lényeg, hogy a következő hónap azonos napjára tegyük
        next_month = today.month + 1
        next_year = today.year
        if next_month > 12:
            next_month = 1
            next_year += 1
        try:
            return date(next_year, next_month, rule.day_of_month)
        except ValueError: # Kezeli a február 30. és hasonló eseteket
            return date(next_year, next_month + 1, 1) - timedelta(days=1)
    # Itt lehetne a heti logikát is implementálni
    return today + timedelta(days=30) # Egyszerűsített fallback

async def process_recurring_transactions():
    """ Ez a függvény fut le minden nap, és végrehajtja az esedékes tranzakciókat. """
    print(f"[{datetime.now()}] Időzített feladatok ellenőrzése...")
    db: Session = SessionLocal()
    try:
        today = date.today()
        # Lekérdezzük az összes aktív, esedékes szabályt
        rules_to_run = db.query(models.RecurringRule).filter(
            models.RecurringRule.is_active == True,
            models.RecurringRule.next_run_date <= today
        ).all()

        if not rules_to_run:
            print("Nincs ma esedékes ismétlődő tranzakció.")
            return

        for rule in rules_to_run:
            print(f"Tranzakció végrehajtása a(z) {rule.id} szabály alapján.")
            owner = crud.get_user(db, rule.owner_id)
            
            # Létrehozzuk a tranzakciót vagy átutalást
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
                # A to_account_id itt a cél kasszát jelenti
                crud.create_account_transaction(db=db, transaction=transaction_data, account_id=rule.to_account_id, user=owner)

            # Frissítjük a szabályt a következő futási dátummal
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