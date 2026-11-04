"""Compatibility entry point for the shared character atlas preparation."""
import runpy
from pathlib import Path
runpy.run_path(str(Path(__file__).with_name("prepare-character-atlases.py")), run_name="__main__")
