import subprocess
import os
import shutil
import sys

def deploy():
    print("Preparing to deploy WhatsApp Webhook...")

    # 1. Locate supabase CLI
    supabase_path = shutil.which("supabase")
    
    # Fallback to local node_modules if not in global PATH
    if not supabase_path:
        local_bin = os.path.abspath("node_modules\\.bin\\supabase.cmd")
        if os.path.exists(local_bin):
            supabase_path = local_bin

    if not supabase_path:
        print("\n[ERROR] 'supabase' CLI not found!")
        print("Please ensure you have installed the Supabase CLI.")
        print("You can install it via 'npm install -g supabase' or 'scoop install supabase'.")
        input("\nPress Enter to exit...")
        return

    print(f"Using Supabase CLI: {supabase_path}")

    # 2. Define Command
    # Direct command avoiding npx
    cmd = [
        supabase_path,
        "functions",
        "deploy",
        "whatsapp-webhook",
        "--project-ref",
        "qxralytyrytjqizuouhz"
    ]

    print(f"\nRunning command: {' '.join(cmd)}\n")

    # 3. Execute
    try:
        # shell=True is often required on Windows for .cmd files
        subprocess.run(cmd, check=True, shell=True)
        print("\n[SUCCESS] Deployment completed successfully!")
    except subprocess.CalledProcessError as e:
        print(f"\n[ERROR] Deployment failed with exit code {e.returncode}")
        print("Check if you are logged in using 'supabase login'.")
    except Exception as e:
        print(f"\n[ERROR] An unexpected error occurred: {e}")

    input("\nPress Enter to close...")

if __name__ == "__main__":
    deploy()
