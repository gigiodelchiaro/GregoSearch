import json
import os
import subprocess
import shutil
import time
import argparse
from concurrent.futures import ProcessPoolExecutor, as_completed

# --- Configuration ---
SOURCE_JSON_PATH = 'data/chants.json'
OUTPUT_IMAGE_DIR = 'images'
TEMP_BUILD_DIR = 'temp_build'
NUM_PROCESSES = os.cpu_count() or 4

LATEX_TEMPLATE = r"""
\documentclass[12pt]{article}
\usepackage{gregoriotex}

% The 'preview' package is the key. It makes the page crop to the content.
\usepackage[active,tightpage]{preview}

% Set a fixed width for the score. This forces line breaks.
% 15cm is a good starting point, similar to a book page.
\setlength{\textwidth}{15cm}

% We'll wrap the score in a preview environment.
\begin{document}
\begin{preview}
\gregorioscore{chant.gtex}
\end{preview}
\end{document}
"""

def generate_gabc_header(chant):
    """Creates the GABC file header from the chant's metadata."""
    header_lines = []
    # Use .get() to avoid errors if a key is missing
    name = chant.get('incipit', '').replace(';', ':') # Semicolons are not allowed in header values
    office_part = chant.get('office-part', '')
    mode = chant.get('mode', '')
    transcriber = chant.get('transcriber', '')

    if name: header_lines.append(f"name:{name};")
    if office_part: header_lines.append(f"office-part:{office_part};")
    if mode: header_lines.append(f"mode:{mode};")
    if transcriber: header_lines.append(f"transcriber:{transcriber};")
    
    # The header must be followed by %% on a new line
    return "\n".join(header_lines) + "\n%%\n"

def extract_gabc_score(chant):
    """Extracts just the musical score part of the GABC."""
    gabc_field = chant.get('gabc')
    if not gabc_field:
        return None
    try:
        gabc_data = json.loads(gabc_field)
        for entry in gabc_data:
            if entry[0] == 'gabc':
                return entry[1].strip()
    except (json.JSONDecodeError, IndexError, TypeError):
        return None
    return None

def process_chant(chant, keep_temp_files=False):
    """Generates an SVG for a single chant, now with a generated header."""
    chant_id = chant.get('id')
    if not chant_id:
        return None, "Missing ID"

    # --- NEW: Combine header and score ---
    header = generate_gabc_header(chant)
    score = extract_gabc_score(chant)
    if not score:
        return chant_id, "Missing or invalid GABC score data"
    
    full_gabc_content = header + score
    # ------------------------------------

    process_temp_dir = os.path.join(TEMP_BUILD_DIR, str(chant_id))
    os.makedirs(process_temp_dir, exist_ok=True)
    
    temp_gabc_path = os.path.join(process_temp_dir, 'chant.gabc')
    temp_gtex_path = os.path.join(process_temp_dir, 'chant.gtex')
    temp_tex_path = os.path.join(process_temp_dir, 'render.tex')
    output_svg_path = os.path.join(OUTPUT_IMAGE_DIR, f"{chant_id}.svg")
    
    if os.path.exists(output_svg_path):
        return chant_id, "Skipped (already exists)"

    try:
        with open(temp_gabc_path, 'w', encoding='utf-8') as f:
            f.write(full_gabc_content)
        with open(temp_tex_path, 'w', encoding='utf-8') as f:
            f.write(LATEX_TEMPLATE)

        # 1. gregorio
        subprocess.run(
            ['gregorio', '-o', temp_gtex_path, temp_gabc_path],
            check=True, capture_output=True, text=True
        )

        # 2. lualatex
        subprocess.run(
            ['lualatex', '--output-format=dvi', '--interaction=batchmode', 'render.tex'],
            cwd=process_temp_dir, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )

        # 3. dvisvgm
        subprocess.run(
            ['dvisvgm', '--no-fonts', '--exact', f'--output={os.path.abspath(output_svg_path)}', 'render.dvi'],
            cwd=process_temp_dir, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )

        # Use a variable to track status for the 'finally' block
        status_message = "Success"
        return chant_id, status_message

    except subprocess.CalledProcessError as e:
        status_message = f"Failed ({e.cmd[0]} error). Stderr: {e.stderr.strip()}"
        return chant_id, status_message
    except Exception as e:
        status_message = f"Failed (Python error: {e})"
        return chant_id, status_message
    finally:
        if 'status_message' in locals() and "Success" in status_message and not keep_temp_files:
             shutil.rmtree(process_temp_dir, ignore_errors=True)


def main():
    """Main function to orchestrate the SVG generation."""
    parser = argparse.ArgumentParser(description="Gregorian Chant SVG Generator.")
    parser.add_argument('--limit', type=int, help='Limit the number of chants to process for testing.')
    parser.add_argument('--keep-temp', action='store_true', help='Do not delete temporary build files, for debugging.')
    args = parser.parse_args()

    print("--- Gregorian Chant SVG Generator ---")
    
    os.makedirs(OUTPUT_IMAGE_DIR, exist_ok=True)
    os.makedirs(TEMP_BUILD_DIR, exist_ok=True)

    print(f"Loading chant data from {SOURCE_JSON_PATH}...")
    try:
        with open(SOURCE_JSON_PATH, 'r', encoding='utf-8') as f:
            chants = json.load(f)
    except FileNotFoundError:
        print(f"Error: {SOURCE_JSON_PATH} not found.")
        return

    if args.limit:
        print(f"Processing a limited set of {args.limit} chants.")
        chants = chants[:args.limit]

    total_chants = len(chants)
    if total_chants == 0: print("No chants to process."); return
        
    print(f"Found {total_chants} chants to process. Starting parallel processing with {NUM_PROCESSES} workers.")
    
    start_time = time.time()
    success_count, skipped_count, error_count = 0, 0, 0

    with ProcessPoolExecutor(max_workers=NUM_PROCESSES) as executor:
        futures = {executor.submit(process_chant, chant, args.keep_temp): chant for chant in chants}
        
        for i, future in enumerate(as_completed(futures)):
            chant_id, status = future.result()
            
            if "Success" in status: success_count += 1
            elif "Skipped" in status: skipped_count += 1
            else:
                error_count += 1
                incipit = futures[future].get('incipit', 'N/A')
                print(f"\n[ERROR] Chant ID {chant_id} ('{incipit[:40]}...'): {status}")

            progress = (i + 1) / total_chants
            bar = '█' * int(progress * 40)
            print(f'\rProgress: [{bar:<40}] {i+1}/{total_chants} ({progress:.1%})', end="")

    end_time = time.time()
    print(f"\n\n--- Generation Complete ---")
    print(f"Total time: {end_time - start_time:.2f} seconds")
    print(f"Successfully generated: {success_count}")
    print(f"Skipped: {skipped_count}")
    print(f"Errors: {error_count}")

    if not args.keep_temp and error_count == 0:
        shutil.rmtree(TEMP_BUILD_DIR, ignore_errors=True)
        print("All temporary build files cleaned up.")
    elif args.keep_temp:
        print(f"Temporary build files kept in '{TEMP_BUILD_DIR}/'.")
    else:
        print(f"Errors occurred. Temporary files for failed chants kept in '{TEMP_BUILD_DIR}/'.")


if __name__ == '__main__':
    main()