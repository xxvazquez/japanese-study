# Supabase setup (for the Flashcards feature)

The Flashcards section stores your learning data (which vocab entries you've added, their FSRS scheduling state, review history, and settings) in a free Supabase project. Vocabulary content itself always stays in this repo (`data/vocabulary.js`) — Supabase never gets a copy of it, only a reference to each entry's permanent id.

## 1. Create a project

1. Go to [supabase.com](https://supabase.com), sign up / log in, and create a new project (the Free plan is enough).
2. Wait for it to finish provisioning (a couple of minutes).

## 2. Create the tables

1. In your project, open **SQL Editor** → **New query**.
2. Paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
3. This creates `flashcards`, `review_logs`, and `flashcard_settings`, all with Row Level Security enabled so each signed-in user only ever sees their own rows.

## 3. Enable email/password sign-in

1. Go to **Authentication** → **Providers** and confirm **Email** is enabled (it is by default).
2. Under **Authentication** → **Settings**, you can turn off "Confirm email" if you'd rather sign in immediately without clicking an email link — reasonable for a personal single-user site, but optional.

## 4. Connect the app to your project

1. In your project, go to **Settings** → **API**.
2. Copy the **Project URL** and the **`anon` `public`** key (not the `service_role` key — that one must never be used in this repo or any client-side code).
3. Open [`js/config.js`](js/config.js) and fill them in:

   ```js
   window.SakuraStudy = window.SakuraStudy || {};
   window.SakuraStudy.config = window.SakuraStudy.config || {
     url: "https://YOUR-PROJECT-REF.supabase.co",
     anonKey: "YOUR-ANON-PUBLIC-KEY",
   };
   ```

4. Commit and deploy. The anon/public key is designed by Supabase to be embedded in client-side code like this — it's meaningless without a signed-in user, since Row Level Security (from `schema.sql`) is what actually protects the data.

## What happens if you skip this

The rest of the site (vocabulary browsing, search, sort, print) works exactly as before with no setup. The Flashcards section itself will show a message asking you to finish this setup instead of a sign-in form.
