# 🚀 Fork Setup Guide

This guide will help you deploy your own Minecraft DevOps Demo. **No coding required!**

**Time needed:** ~15 minutes

---

## Overview

You'll do 3 things:
1. **Fork** this repository
2. **Run 1 command** in Azure (via your browser)
3. **Add 5 values** to GitHub and click ONE button

That's it! The setup workflow automatically deploys your dashboard too.

---

## Step 1: Fork the Repository

1. Click the **Fork** button at the top right of this page
2. Keep all defaults and click **Create fork**
3. Wait for the fork to complete

✅ You now have your own copy of the project!

---

## Step 2: Get Azure Credentials

You'll run a single command in Azure Cloud Shell (a terminal in your browser - no install needed).

### 2a. Open Azure Cloud Shell

1. Go to [portal.azure.com](https://portal.azure.com)
2. Sign in with your Azure account
3. Click the **Cloud Shell** icon (looks like `>_`) in the top navigation bar
4. If prompted, select **Bash**
5. If prompted to create storage, click **Create storage**

You should see a terminal at the bottom of your screen.

### 2b. Run the Setup Command

Copy and paste this entire command into the Cloud Shell:

```bash
# This creates a service principal and outputs your credentials
SUB_ID=$(az account show --query id -o tsv)
echo ""
echo "=========================================="
echo "  YOUR GITHUB SECRETS"
echo "=========================================="
echo ""
echo "AZURE_SUBSCRIPTION_ID: $SUB_ID"
echo ""
az ad sp create-for-rbac \
  --name "minecraft-devops-setup" \
  --role Contributor \
  --scopes /subscriptions/$SUB_ID \
  --query "{AZURE_CLIENT_ID: appId, AZURE_CLIENT_SECRET: password, AZURE_TENANT_ID: tenant}" \
  -o table
echo ""
echo "=========================================="
echo "Copy these 4 values for the next step!"
echo "=========================================="
```

Press **Enter** to run it.

### 2c. Copy Your Values

You'll see output like this:

```
==========================================
  YOUR GITHUB SECRETS
==========================================

AZURE_SUBSCRIPTION_ID: 12345678-1234-1234-1234-123456789abc

AZURE_CLIENT_ID              AZURE_CLIENT_SECRET                    AZURE_TENANT_ID
---------------------------  -------------------------------------  ------------------------------------
87654321-4321-4321-4321-cba  aBcDeFgHiJkLmNoPqRsTuVwXyZ123456789=  11111111-2222-3333-4444-555555555555

==========================================
Copy these 4 values for the next step!
==========================================
```

📝 **Keep this window open** - you'll need these values in the next step!

---

## Step 3: Create a GitHub Personal Access Token

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click **Generate new token** → **Generate new token (classic)**
3. Give it a name like `minecraft-devops`
4. Set expiration to **90 days** (or your preference)
5. Check these permissions:
   - ✅ `repo` (all sub-items)
   - ✅ `workflow`
6. Click **Generate token**
7. **Copy the token immediately** (you won't see it again!)

📝 This is your `GH_PAT` value.

---

## Step 4: Add Secrets to GitHub

1. Go to your forked repository on GitHub
2. Click **Settings** (tab at the top)
3. Click **Secrets and variables** → **Actions** (left sidebar)
4. Click **New repository secret** for each of these:

| Name | Value (from Step 2 & 3) |
|------|-------------------------|
| `AZURE_CLIENT_ID` | The `appId` from Azure |
| `AZURE_CLIENT_SECRET` | The `password` from Azure |
| `AZURE_TENANT_ID` | The `tenant` from Azure |
| `AZURE_SUBSCRIPTION_ID` | The subscription ID from Azure |
| `GH_PAT` | Your GitHub Personal Access Token |

After adding all 5, your secrets page should look like this:

```
Repository secrets
──────────────────────────────────
🔒 AZURE_CLIENT_ID          Just now
🔒 AZURE_CLIENT_SECRET      Just now
🔒 AZURE_TENANT_ID          Just now
🔒 AZURE_SUBSCRIPTION_ID    Just now
🔒 GH_PAT                   Just now
```

---

## Step 5: Run the Setup Workflow

1. Go to the **Actions** tab in your repository
2. Click **0. Initial Setup (Run First!)** in the left sidebar
3. Click the **Run workflow** dropdown (right side)
4. Type `setup` in the confirmation field
5. Click **Run workflow**

**What this does automatically:**
- ✅ Configures secure OIDC authentication for future workflows
- ✅ Creates Terraform state storage
- ✅ Generates `TF_STATE_ACCESS_KEY` secret
- ✅ Generates `COORDINATOR_API_KEY` secret
- ✅ **Automatically deploys the Control Plane!**

Wait ~7-10 minutes total. You'll see TWO workflows run:
1. **0. Initial Setup (Run First!)** (2-3 min)
2. **1. Control Plane - Deploy/Destroy** (auto-triggered, ~5 min)

After setup, workflows use OIDC (your `AZURE_CLIENT_SECRET` stays but isn't used for normal operations).

---

## Step 6: Deploy Minecraft Server (Optional)

The Control Plane is now deployed! To add Minecraft:

**Option A: Use the Dashboard (Recommended)**
1. Find the Dashboard URL in the **1. Control Plane - Deploy/Destroy** workflow output
2. Open the dashboard and click **Admin**
3. Click **Deploy** to start Minecraft

**Option B: Use GitHub Actions**
1. Click **2. Minecraft Server - Deploy/Destroy** in Actions
2. Click **Run workflow**
3. Wait ~10 minutes for completion

---

## 🎉 Done!

After the workflows complete:

1. Go to the **1. Control Plane** workflow run
2. Look for the **Dashboard URL** in the output
3. Click it to open your dashboard!

From the dashboard, you can:
- See your Minecraft server status
- Get the server IP to connect with Minecraft
- Monitor costs and performance
- Deploy/destroy infrastructure with one click

---

## Troubleshooting

### "AADSTS70021: No matching federated identity record"
The setup workflow didn't complete. Run **0. Initial Setup** again.

### "terraform state lock" error
Someone else is running a deployment. Wait a few minutes and try again.

### Dashboard shows "Stopped" but server is running
The API is checking connectivity. Wait 30 seconds and refresh.

### Can't connect to Minecraft server
- Make sure you're using the IP shown on the dashboard
- Port 25565 must be open (some corporate networks block it)
- If using Cloudflare WARP, try disabling it

---

## Cost Information

Running everything costs approximately:
- **Control Plane only:** ~$2-5/month (scales to zero when idle)
- **With Minecraft Server:** ~$3-5/day when running

The dashboard lets you easily destroy the Minecraft infrastructure when not in use to minimize costs.

---

---

## Teardown (Stop Billing)

### Stop Minecraft Only (Tier 1 - ~$6/month)
- **Dashboard:** Admin → Click **Destroy**
- Keeps the dashboard running so you can redeploy Minecraft anytime

### Stop Everything (Tier 0 - $0/month)
1. Go to **Actions** → **🔥 Destroy Everything (Tier 0)**
2. Click **Run workflow**
3. Type `destroy` in the confirmation field
4. Click **Run workflow**

This destroys ALL infrastructure in the correct order (Minecraft first, then Control Plane).

### Redeploy After Full Shutdown
Run **0. Initial Setup (Run First!)** again — it will skip already-configured items and deploy the Control Plane.

---

## Need Help?

Open an issue on the original repository: [ColeGendreau/Minecraft-1.0](https://github.com/ColeGendreau/Minecraft-1.0/issues)

