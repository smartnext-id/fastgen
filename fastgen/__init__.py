import os
import server
from aiohttp import web

NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}

WEBROOT = os.path.join(os.path.dirname(os.path.realpath(__file__)), "web")

@server.PromptServer.instance.routes.get("/fastgen")
def main_page(request):
    return web.FileResponse(os.path.join(WEBROOT, "index.html"))

@server.PromptServer.instance.routes.get("/login")
def login_page(request):
    return web.FileResponse(os.path.join(WEBROOT, "login.html"))

# Baris ini SANGAT PENTING. 
# Ini memberitahu server untuk menyajikan semua file dari folder /web 
# ketika URL dimulai dengan /fastgen/
server.PromptServer.instance.routes.static("/fastgen/", path=WEBROOT)