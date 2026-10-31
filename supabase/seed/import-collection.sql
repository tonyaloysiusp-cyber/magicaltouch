-- Imports a collection file (public/templates/collection/<file>.json, e.g.
-- studio-2026-11.json or mass-2026-11-birthday.json) into templates.
-- Run in two steps after the site is deployed:
--   1) select net.http_get(url := 'https://www.magicaltouchdesign.com/templates/collection/<file>.json', timeout_milliseconds := 60000);
--   2) this statement, with :id = the request id from step 1.
-- Safe to re-run: existing slugs are skipped.
with src as (
  select e as t from net._http_response r, jsonb_array_elements(r.content::jsonb) e where r.id = :id and r.status_code = 200
), cat as (
  select * from (values
    ('Social Media', 'Instagram', '38442849-cdd2-4bd7-b2ba-b70cc9ba0847'), ('Social Media', 'YouTube', 'da4d1609-12c3-472a-b0b8-7c2144546778'),
    ('Photo Collage', null, 'b3964183-fc8a-435d-a734-d6b76bcbd763'),
    ('Marketing', 'Poster', '8774b67a-5ff6-463f-affa-2cb6e4106602'), ('Marketing', 'Advertisement', '050fa44e-deeb-4945-951b-b3aab66c21a5'),
    ('Marketing', 'Magazine', 'c5c21f95-b661-4087-8f51-3343960bd67a'), ('Marketing', 'Banner', 'f5eaf327-62dc-4191-9f05-065cd9918efb'),
    ('Events', null, '749176a0-c538-4d9d-b70d-e40fe96bcdb2'), ('Events', 'Party', '9f363de4-00be-4bdc-9a94-19975c1e5c5f'),
    ('Business', 'Flyer', '417e7368-40e5-4117-ae1b-8c35466efbef'),
    ('Birthday', null, 'db0fff91-be7d-4f68-8071-a2eb65357490'),
    ('Wedding', 'Invitation', '46de7551-5e15-4b22-bda3-222a181b1bc6'), ('Wedding', 'Reception', '896a769b-a3aa-4d72-8c3b-b2831a41bc60'),
    ('Love & Family', null, '6cba659f-99fc-4b79-9088-c32823d3af24'), ('Festivals', null, 'db992add-c89e-4c49-bf89-b50c11c385b2'),
    ('Cards', null, 'e19f73ed-3b11-41d4-ba74-aaa4fdd5206e'), ('Resume', null, '9d2dbad5-d3e8-4cbc-83c0-b2ec2707f6c7'),
    ('Certificates', null, 'a7fbfe6d-feb0-4d13-b4ab-149ac113c220'), ('Menus', null, '7bc7ad94-8233-4a06-a9b4-319e445ea973'),
    ('Social Media', 'Facebook', 'fb8e4165-f312-45d7-b0bb-466633674e06'), ('Wedding', 'Save the Date', '30254ec4-c05b-4e0d-b166-ced0d8a6a164'),
    ('Events', 'Conference', '7cacdf4f-40bb-4552-a7bd-a9b3deb2bea4'), ('Business', 'Business Card', 'bd449e8c-bdd2-451d-a752-8902ed78069b'),
    ('Business', 'Letterhead', '25594259-9447-49b6-8a3c-9cc8c505e5e0'), ('Business', 'Presentation', '896aff0d-199a-4659-9e7e-4e8a4c707b59'),
    ('Business', 'Brochure', '07846c5c-aecb-4493-adf0-e4d741738039')
  ) v(category, sub, id)
)
insert into templates (name, category, category_id, slug, width, height, color1, color2, sort_order, is_free, is_featured, tags,
  unit, dpi, color_mode, current_version, rights_status, status, published_at, thumbnail, preview, search_keywords, description, canvas_json)
select t->>'name', t->>'category', c.id::uuid, t->>'slug', (t->>'width')::int, (t->>'height')::int, t->>'color1', t->>'color2', (t->>'sort')::int,
  true, true, array(select jsonb_array_elements_text(t->'tags')), 'px', 72, 'rgb', '1.0', 'verified', 'published', now(),
  '/templates/collection/' || (t->>'slug') || '.jpg', '/templates/collection/' || (t->>'slug') || '-preview.jpg', t->>'keywords', t->>'description', t->'canvasJson'
from src left join cat c on c.category = src.t->>'category' and c.sub is not distinct from src.t->>'sub'
where not exists (select 1 from templates x where x.slug = src.t->>'slug');
