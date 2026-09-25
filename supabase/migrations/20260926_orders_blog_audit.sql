-- =========================================================================
-- CEFI: orders, blog posts and admin audit log  (2026-09-26)
-- Supabase Dashboard -> SQL Editor -> paste -> Run.  Safe to re-run.
--
-- Security model (same as the catalogue):
--   * Every table has Row Level Security ON.
--   * The browser's keys (anon / signed-in customer) get READ access only
--     where noted, and never write. All writes go through the Express API,
--     which checks the user/admin and uses the service-role key.
--
-- After running: set ORDER_DATA_KEY in Vercel (see SECURITY.md) so orders
-- start being stored. Without it the API keeps orders in memory and never
-- writes customer details unencrypted.
-- =========================================================================

-- ── 1. Orders (Master-Vault items 36, 41, 42; audit L-04) ────────────────────
-- One row per order; line items as JSONB so an order is a single atomic
-- INSERT. Customer name/email/phone/address live ONLY in customer_enc,
-- encrypted by the API with AES-256-GCM before it reaches the database.
create table if not exists public.orders (
  order_id       text primary key,
  user_id        uuid references auth.users(id) on delete set null,
  customer_enc   text not null,
  items          jsonb not null,
  subtotal       numeric(12,2) not null check (subtotal >= 0),
  shipping_cost  numeric(12,2) not null check (shipping_cost >= 0),
  total_amount   numeric(12,2) not null check (total_amount >= 0),
  payment_method text,
  status         text not null default 'Confirmed',
  created_at     timestamptz not null default now()
);
create index if not exists orders_user_id_idx    on public.orders (user_id);
create index if not exists orders_created_at_idx on public.orders (created_at desc);

alter table public.orders enable row level security;
revoke insert, update, delete on public.orders from anon, authenticated;

-- A signed-in buyer may read only their own orders (user_id = auth.uid()).
drop policy if exists "Users read own orders" on public.orders;
create policy "Users read own orders" on public.orders
  for select to authenticated using (user_id = auth.uid());

-- ── 2. Blog posts (single source of truth for the blog) ──────────────────────
create table if not exists public.blog_posts (
  id            text primary key,
  title         text not null,
  slug          text not null unique,
  category      text,
  cover_image   text,
  excerpt       text,
  content       text not null,
  author        text,
  read_time_min integer not null default 5 check (read_time_min between 1 and 240),
  published_at  timestamptz not null default now(),
  updated_at    timestamptz
);

alter table public.blog_posts enable row level security;
revoke insert, update, delete on public.blog_posts from anon, authenticated;

drop policy if exists "Public read blog posts" on public.blog_posts;
create policy "Public read blog posts" on public.blog_posts
  for select to anon, authenticated using (true);

-- Existing articles from backend/blogs.json, so the blog doesn't go empty.
insert into public.blog_posts
  (id, title, slug, category, cover_image, excerpt, content, author, read_time_min, published_at, updated_at)
values
  ($cefi$blog-1787478427707$cefi$, $cefi$CEFI Organic Farming Masterclass: The Science of High Yield Ceylon Cardamom$cefi$, $cefi$cefi-organic-farming-masterclass-the-science-of-high-yield-ceylon-cardamom$cefi$, $cefi$Herbal & Spices$cefi$, $cefi$https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80$cefi$, $cefi$An in-depth field study exploring sustainable shade cultivation, moisture retention, and high-oil cardamom harvest in Knuckles Mountain Range.$cefi$, $cefi$### The Green Gold of Ceylon

Cardamom (*Elettaria cardamomum*) is often called the Queen of Spices due to its complex volatile aromatic profile.

#### Precision Harvesting in Sri Lanka
Our organic outgrowers harvest pods at optimal maturity to seal in essential cineole and terpinyl acetate oils.$cefi$, $cefi$CEFI Agronomy Team$cefi$, 6, $cefi$2026-08-23T09:47:07.707Z$cefi$::timestamptz, null),
  ($cefi$blog-1$cefi$, $cefi$Why True Ceylon Cinnamon Outshines Cassia on the Global Market (Updated)$cefi$, $cefi$true-ceylon-cinnamon-vs-cassia$cefi$, $cefi$Spices & Cinnamon$cefi$, $cefi$https://images.unsplash.com/photo-1509358211525-24298075b281?auto=format&fit=crop&w=800&q=80$cefi$, $cefi$Discover the remarkable health benefits, ultra-low coumarin content, and artisan hand-rolling heritage behind Sri Lanka's 'Cinnamomum verum'.$cefi$, $cefi$### The Golden Spice of Ceylon

For centuries, traders sailed thousands of nautical miles across the Indian Ocean in search of one priceless botanical: **True Ceylon Cinnamon** (*Cinnamomum verum*).

Unlike common **Cassia cinnamon** (*Cinnamomum cassia*) originating from China and Indonesia, authentic Ceylon Cinnamon is distinguished by its soft, papery layers, golden-brown tint, and delicate sweet perfume.

#### Ultra-Low Coumarin Content

The pivotal difference between Ceylon Cinnamon and Cassia lies in a compound called **coumarin**, which can be toxic to the liver in large doses.

- **Cassia Cinnamon:** Contains high concentrations of coumarin (up to 1% or 5,000 mg/kg).
- **Ceylon Cinnamon:** Contains negligible traces (less than 0.004% or 40 mg/kg).

This makes Ceylon Cinnamon the undisputed choice for health-conscious consumers, pharmaceutical formulations, and gourmet bakeries worldwide.

#### Handcrafted Heritage in Matara

Every quill exported by CEFI is stripped, peeled, and hand-rolled by master craftsmen whose skills have been passed down through generations in southern Sri Lanka. When you sample CEFI Cinnamon, you taste centuries of sustainable agro-forestry heritage.$cefi$, $cefi$Dr. K. Jayawardena$cefi$, 5, $cefi$2026-07-15T09:00:00Z$cefi$::timestamptz, $cefi$2026-08-23T09:51:11.013Z$cefi$::timestamptz),
  ($cefi$blog-2$cefi$, $cefi$High Altitude vs Low Elevation Ceylon Teas: Understanding the Flavor Spectrum$cefi$, $cefi$high-altitude-vs-low-elevation-ceylon-teas$cefi$, $cefi$Tea Culture$cefi$, $cefi$https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=800&q=80$cefi$, $cefi$From the delicate mist-covered slopes of Nuwara Eliya to the bold, malty teas of Ruhuna, explore the microclimates of Ceylon tea.$cefi$, $cefi$### Ceylon Tea: A Microclimate Marvel

Sri Lanka is uniquely endowed with diverse topography, monsoonal wind patterns, and rich volcanic soil. This allows our island nation to produce distinct tea profiles within short geographical distances.

#### High Grown (Elevation: Above 4,000 ft)
Regions like **Nuwara Eliya**, **Dimbula**, and **Uva** produce teas characterized by bright clarity, exquisite bouquet, and pale golden liquor. The cool mountain breezes slow leaf growth, concentrating complex floral notes.

#### Medium Grown (Elevation: 2,000 - 4,000 ft)
Teas from **Kandy** offer citrus undertones, medium body, and reliable strength, making them popular for custom breakfast blends.

#### Low Grown (Elevation: Sea Level - 2,000 ft)
Teas from **Ruhuna** and **Sabaragamuwa** mature rapidly in warm coastal sunlight, developing deep dark leaf colors, intense maltiness, and rich strength prized across Middle Eastern and European markets.$cefi$, $cefi$CEFI Tea Master$cefi$, 6, $cefi$2026-07-02T14:30:00Z$cefi$::timestamptz, null),
  ($cefi$blog-3$cefi$, $cefi$Sustainable Export Sourcing: How CEFI Empowers Sri Lankan Smallholder Farmers$cefi$, $cefi$sustainable-export-sourcing-cefi-smallholders$cefi$, $cefi$Sustainability & Trade$cefi$, $cefi$https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80$cefi$, $cefi$Learn about CEFI's direct-farm partnership model, eco-friendly solar drying techniques, and commitment to zero-waste agricultural trade.$cefi$, $cefi$### Rooted in Ceylon, Growing Together

At Ceylon Eco Fresh Infinity (CEFI), sustainability is not just a slogan—it is our core operating principle.

Through our outgrower network across Matara, Kandy, and Kurunegala, we partner directly with over 300 family-owned smallholder farms.

#### Our Sustainable Commitments:
1. **Fair Farmgate Pricing:** Eliminating speculative middlemen to ensure farmers receive 25–40% higher returns.
2. **Solar Dehydration:** Utilizing eco-friendly parabolic solar dryers to process fruits and herbs with zero carbon emissions.
3. **Biodiversity Preservation:** Encouraging inter-cropping of spices alongside tea and coconut trees to safeguard natural soil biology.$cefi$, $cefi$Sustainability Team$cefi$, 4, $cefi$2026-06-18T11:15:00Z$cefi$::timestamptz, null)
on conflict (id) do nothing;

-- ── 3. Admin audit log (items 40, 69) ─────────────────────────────────────────
-- Written by the API for every allowed/denied admin request. No policies:
-- browser keys can neither read nor write it.
create table if not exists public.admin_audit_log (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id    uuid,
  email      text,
  method     text not null,
  path       text not null,
  outcome    text not null check (outcome in ('allowed', 'denied')),
  ip         text,
  user_agent text
);
create index if not exists admin_audit_log_created_at_idx on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;

-- Append-only: entries can't be edited or deleted afterwards — not even with
-- the service-role key — so the trail can't be quietly rewritten.
create or replace function public.admin_audit_log_append_only()
returns trigger language plpgsql as $$
begin
  raise exception 'admin_audit_log is append-only';
end;
$$;
drop trigger if exists admin_audit_log_no_update_delete on public.admin_audit_log;
create trigger admin_audit_log_no_update_delete
  before update or delete or truncate on public.admin_audit_log
  for each statement execute function public.admin_audit_log_append_only();

-- ── 4. Verify ────────────────────────────────────────────────────────────────
-- Expect rowsecurity = true for all three, and these policies only:
--   orders: "Users read own orders" (SELECT)   blog_posts: "Public read blog posts" (SELECT)
select tablename, rowsecurity from pg_tables
where schemaname = 'public' and tablename in ('orders', 'blog_posts', 'admin_audit_log');

select tablename, policyname, cmd, roles from pg_policies
where schemaname = 'public' and tablename in ('orders', 'blog_posts', 'admin_audit_log');

select count(*) as blog_posts_seeded from public.blog_posts;
