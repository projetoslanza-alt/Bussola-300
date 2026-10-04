from openpyxl import load_workbook
from openpyxl.utils import get_column_letter
path = r"E:\Lanza\Projetos\300 bussola\ADP BH SCALE_2026.xlsx"
wb = load_workbook(path, data_only=True, read_only=False)
ws = wb["ADP GERAL OUT26"]
print("--- P-R rows 1-20 and 65-90 ---")
for r in list(range(1, 16)) + list(range(65, 95)):
    cells = []
    for c in range(12, 22):
        v = ws.cell(r, c).value
        if v is not None and str(v).strip():
            cells.append(f"{get_column_letter(c)}{r}={str(v).replace(chr(10),' ')[:70]}")
    if cells:
        print("R"+str(r)+": "+" | ".join(cells))
ws2 = wb[" ELITE OUT26"]
print("--- ELITE OUT26 rows 28-50 cols A-P ---")
for r in range(28, 55):
    cells = []
    for c in range(1, 16):
        v = ws2.cell(r, c).value
        if v is not None and str(v).strip():
            cells.append(f"{get_column_letter(c)}{r}={str(v).replace(chr(10),' ')[:50]}")
    if cells:
        print("R"+str(r)+": "+" | ".join(cells))
wb.close()
