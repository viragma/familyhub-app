from fastapi import FastAPI

# Létrehozzuk az FastAPI alkalmazás példányt
app = FastAPI()

# Definiálunk egy végpontot a gyökér URL-re ("/")
# Amikor egy GET kérés érkezik ide, ez a funkció fut le
@app.get("/")
def read_root():
    """
    Ez a gyökér végpont, ami egy üdvözlő üzenetet ad vissza.
    """
    return {"status": "ok", "message": "Szia, a FamilyHub Backend fut!"}