import importlib, traceback
try:
    m = importlib.import_module('chrona.management.commands.sync_to_bitrix')
    print('OK module loaded')
    print([n for n in dir(m) if not n.startswith('_')])
    print('Command attr:', getattr(m,'Command', None))
except Exception:
    traceback.print_exc()
