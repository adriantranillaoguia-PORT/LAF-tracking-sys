<<<<<<< HEAD
# Lost & Found Tracking Web App

A clean, responsive Lost & Found tracking web application built with React 18, Vite, Supabase (Database, Auth, Storage, and Realtime), and plain CSS. Each item card is styled like a traditional luggage tag with color-coded status badges, punch-hole detailing, and dark mode support.

---

## 1. Creating the Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in or create an account.
2. Click **New project**.
3. Choose an organization, enter a project name (for example, `lost-and-found`), set a database password, and pick a geographic region close to your users.
4. Click **Create new project** and wait a couple of minutes for your project to provision.

---

## 2. Running the Schema

1. Open your project dashboard in Supabase.
2. In the left sidebar, navigate to the **SQL Editor** (the terminal `>_` icon).
3. Click **New query**.
4. Open the file `supabase/schema.sql` in this repository, copy its entire contents, and paste them into the SQL Editor.
5. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`).
6. Verify the confirmation:
   - The `items` table is created with Row Level Security (RLS) enabled.
   - Item reads remain public; creating reports requires an authenticated account, and updates/deletes remain admin-only.
   - The `items` table is registered with the `supabase_realtime` publication.
   - The `item-images` storage bucket is created with public read and authenticated upload policies.

---

## 3. Creating an Admin User and Enabling Client Registration

Client registration uses Supabase Authentication. Admin access remains restricted to users listed in the `admins` table; registering a client account does not grant administrator access.

1. In your Supabase dashboard, navigate to **Authentication** > **Users**.
2. Click **Add user** > **Create user**.
3. Enter the email address and a secure password for your administrator account, then click **Create user**. (Auto-confirm email is enabled by default in new user creations here).
4. In the left sidebar under Authentication, navigate to **Configuration** > **Providers** > **Email**.
5. Turn **ON** the toggle for **Allow new users to sign up** (or "Enable Signups") so users can register from the client sign-in page.
6. Click **Save** at the bottom of the page.
7. Users can now register client accounts with an email and password. Add administrator accounts to the `admins` table separately.

---

## 4. Setting Up `.env`

1. In your Supabase dashboard, click the gear icon (**Project Settings**) in the left sidebar.
2. Go to **API**.
3. Find your **Project URL** and your **anon / public** API key.
4. In the root directory of this project, copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
5. Open `.env` and fill in your values:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-actual-anon-key
   ```

---

## 5. Running the Application Locally

Run the following commands in your project root terminal:

```bash
# 1. Install dependencies
npm install

# 2. Start the local Vite development server
npm run dev
```

Open your browser to the URL displayed in your terminal (usually `http://localhost:5173`).

---

## 6. Project File Structure & Explanation

- **`package.json`**: Declares application dependencies (`react`, `react-dom`, `@supabase/supabase-js`, `@vitejs/plugin-react`, `vite`) and build/dev scripts.
- **`vite.config.js`**: Configures Vite with the official React plugin for fast HMR (Hot Module Replacement).
- **`index.html`**: Host page including the `Bricolage Grotesque` Google Font, mobile viewport meta tags, and root container.
- **`.env.example`**: Example template specifying required environment variable keys.
- **`.gitignore`**: Specifies files and directories ignored by Git (`node_modules`, `.env`, build output).
- **`supabase/schema.sql`**: Full PostgreSQL setup script containing table definitions, RLS security policies, realtime publication bindings, and storage bucket configuration.
- **`src/main.jsx`**: React application entry point rendering `<App />` into the DOM.
- **`src/supabase.js`**: Instantiates and exports the initialized `@supabase/supabase-js` client using the environment variables.
- **`src/App.jsx`**: Top-level application coordinator:
  - Fetches the item directory and maintains live updates using a Supabase Realtime channel subscription.
  - Subscribes to auth state changes to detect administrator login sessions.
  - Performs multi-field client-side filtering and searching with `useMemo`.
  - Executes admin actions (`handleClaimItem`, `handleDeleteItem`).
  - Renders loading states, empty states with next-step instructions, and error banners.
- **`src/ItemCard.jsx`**: Renders a single lost or found item as a luggage tag, displaying kind badges, item details, location, contact info, photo, and admin controls when authenticated.
- **`src/ItemForm.jsx`**: Modal submission form for reporting items. Handles image uploads to the `item-images` bucket using random UUID filenames before inserting the row into PostgreSQL.
- **`src/AdminLogin.jsx`**: Provides administrator email/password sign-in and sign-out controls with error feedback.
- **`src/styles.css`**: Single comprehensive stylesheet featuring luggage-tag styling, responsive CSS Grid, keyboard focus rings, light/dark themes via `prefers-color-scheme`, and `prefers-reduced-motion` compliance.

---

## 7. Security Note

- **Browser-Safe Anon Key**: The `VITE_SUPABASE_ANON_KEY` is designed to be public and safe in browser client bundles. Database safety is enforced at the database layer through **Row Level Security (RLS)**:
   - Unauthenticated visitors can read public item records and images, but cannot create reports, upload images, or add comments.
   - Authenticated users can create reports and upload images; only users listed in `public.admins` can update or delete items and delete comments/images.
   - Apply `supabase/migrations/20261014_authenticated_client_reporting.sql` to existing projects to remove legacy anonymous report and image-upload policies.
- **Never Expose the Service Role Key**: Never use or paste `service_role` secret keys in client-side code or `.env` files. The service role key bypasses Row Level Security.
- **Public Contact Details**: In this application, contact details provided on reported items are publicly readable by design so that individuals who find or lose belongings can contact each other directly. If your deployment requires privacy, consider masking phone numbers or relaying communications through a secure backend form.
=======
# LAF-tracking-sys
>>>>>>> f5f82b1c3b74d4f832eb913faf902d5b2b1dac9a
