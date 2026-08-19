import shutil
src = r"E:\ABU\QADIR_CORE\MEMORY.md.bak-2026-08-12-weekly"
dst = r"E:\ABU\QADIR_CORE\MEMORY.md"
shutil.copy2(src, dst)
import os
print("restored:", os.path.getsize(dst), "bytes")
