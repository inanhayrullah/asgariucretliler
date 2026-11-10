insert into public.categories (name,slug,description) values
  ('Gündem','gundem','Çalışma hayatı gündemi'),
  ('Asgari Ücret','asgari-ucret','Asgari ücret ve maaş gündemi'),
  ('İşçi Hakları','isci-haklari','Çalışan haklarına dair haberler'),
  ('Çalışma Hayatı','calisma-hayati','Çalışma hayatından gelişmeler'),
  ('Ekonomi','ekonomi','Çalışanları ilgilendiren ekonomi haberleri')
on conflict (slug) do update set name=excluded.name,description=excluded.description;
