-- Supabase migration reconciliation repair draft
-- Generated: 2026-06-12T21:34:26.748Z
--
-- Review-only artifact. Do not run this file as-is.
-- Every repair statement is commented out until local/remote SQL intent is manually verified.
-- Keep a backup of supabase_migrations.schema_migrations before any approved history repair.
--
-- Candidate mappings: 616
-- High confidence (<= 5 seconds apart): 584
-- Medium confidence (6-60 seconds apart): 32
--
-- Suggested manual review query before any repair:
-- select version, name, statements from supabase_migrations.schema_migrations order by version;
--
begin;

-- high: remote 20260126184429 -> local 20260126184430 (1s) 20260126184430_15d3dc46-97b5-4f21-b420-db59cd05443a.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260126184430'
-- where version = '20260126184429'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260126184430');

-- high: remote 20260126185226 -> local 20260126185227 (1s) 20260126185227_cda82eb4-ac9e-49b5-9acf-17a1a8079c3d.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260126185227'
-- where version = '20260126185226'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260126185227');

-- high: remote 20260126195811 -> local 20260126195812 (1s) 20260126195812_4c0fbc98-ad0f-455f-abee-31eb6a1c0840.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260126195812'
-- where version = '20260126195811'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260126195812');

-- high: remote 20260126204405 -> local 20260126204406 (1s) 20260126204406_4b930ffe-7701-4cca-8669-5b8015c31411.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260126204406'
-- where version = '20260126204405'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260126204406');

-- high: remote 20260126210104 -> local 20260126210105 (1s) 20260126210105_93ebc1b8-2f34-4353-8ebe-0cd1ec2b2902.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260126210105'
-- where version = '20260126210104'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260126210105');

-- high: remote 20260127233014 -> local 20260127233015 (1s) 20260127233015_5ca2a59c-f6eb-4fca-9560-ba33232020d3.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260127233015'
-- where version = '20260127233014'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260127233015');

-- high: remote 20260129225227 -> local 20260129225228 (1s) 20260129225228_f8acf683-0020-463d-baac-e9c8dda02913.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260129225228'
-- where version = '20260129225227'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260129225228');

-- high: remote 20260131204000 -> local 20260131204001 (1s) 20260131204001_8fc6e8e9-7bc7-46de-bd85-4266f95306aa.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260131204001'
-- where version = '20260131204000'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260131204001');

-- high: remote 20260201011853 -> local 20260201011854 (1s) 20260201011854_0dd90e3e-d414-443c-ab60-74ab8b147261.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260201011854'
-- where version = '20260201011853'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260201011854');

-- high: remote 20260201143418 -> local 20260201143419 (1s) 20260201143419_282f5007-80e4-4b53-881f-6268400c8d51.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260201143419'
-- where version = '20260201143418'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260201143419');

-- high: remote 20260201143842 -> local 20260201143843 (1s) 20260201143843_74a114aa-2010-4487-91e4-5b4f3e2e5f04.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260201143843'
-- where version = '20260201143842'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260201143843');

-- high: remote 20260201162949 -> local 20260201162950 (1s) 20260201162950_5af8902a-3602-41e8-851a-3e26875239af.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260201162950'
-- where version = '20260201162949'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260201162950');

-- high: remote 20260201163105 -> local 20260201163106 (1s) 20260201163106_64748b6e-1d0e-4437-9b4f-96e05f3ca218.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260201163106'
-- where version = '20260201163105'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260201163106');

-- high: remote 20260202033231 -> local 20260202033232 (1s) 20260202033232_5ff94892-d738-4994-ad98-4b857a97b277.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260202033232'
-- where version = '20260202033231'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260202033232');

-- high: remote 20260202035425 -> local 20260202035426 (1s) 20260202035426_d125ec90-64bf-4265-99a7-bdf9c1456fcb.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260202035426'
-- where version = '20260202035425'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260202035426');

-- high: remote 20260202041222 -> local 20260202041223 (1s) 20260202041223_4f96bc3c-1d6a-423e-99e7-fbbfbeb3da0d.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260202041223'
-- where version = '20260202041222'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260202041223');

-- high: remote 20260202182911 -> local 20260202182912 (1s) 20260202182912_634f3df2-e9b3-4ba9-8f66-987d421ff0c4.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260202182912'
-- where version = '20260202182911'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260202182912');

-- high: remote 20260202192001 -> local 20260202192002 (1s) 20260202192002_5a1b188b-1b4c-40d3-9293-a5fbb9590879.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260202192002'
-- where version = '20260202192001'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260202192002');

-- high: remote 20260202214212 -> local 20260202214213 (1s) 20260202214213_744d4882-3728-4e5f-b1dc-5443d2606cb4.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260202214213'
-- where version = '20260202214212'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260202214213');

-- high: remote 20260202220846 -> local 20260202220847 (1s) 20260202220847_bedb61f0-7016-4d3e-927c-061886814f3d.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260202220847'
-- where version = '20260202220846'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260202220847');

-- high: remote 20260202221826 -> local 20260202221827 (1s) 20260202221827_244880bc-6bd0-4820-a0b7-d58f49e96c92.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260202221827'
-- where version = '20260202221826'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260202221827');

-- high: remote 20260202221909 -> local 20260202221910 (1s) 20260202221910_846f264d-c52d-46b4-8995-94369ebedcb1.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260202221910'
-- where version = '20260202221909'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260202221910');

-- high: remote 20260202223816 -> local 20260202223817 (1s) 20260202223817_e5ee102f-2b49-44be-bdf7-ae4a2eb44ae8.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260202223817'
-- where version = '20260202223816'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260202223817');

-- high: remote 20260203002458 -> local 20260203002459 (1s) 20260203002459_884b16e7-6421-4c2d-bcb9-9a7514f5ba33.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203002459'
-- where version = '20260203002458'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203002459');

-- high: remote 20260203024552 -> local 20260203024553 (1s) 20260203024553_67ed27d8-e665-4e0e-90ec-7801e977e5f3.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203024553'
-- where version = '20260203024552'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203024553');

-- high: remote 20260203035503 -> local 20260203035504 (1s) 20260203035504_83aefa21-867e-4aa6-91cd-8c68b4561fa9.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203035504'
-- where version = '20260203035503'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203035504');

-- high: remote 20260203040558 -> local 20260203040559 (1s) 20260203040559_c9d20df4-5df5-4ff4-b37a-d7cd6f6e9f9f.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203040559'
-- where version = '20260203040558'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203040559');

-- high: remote 20260203041545 -> local 20260203041546 (1s) 20260203041546_d5165abd-0140-4a42-bae9-e1817cf42f10.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203041546'
-- where version = '20260203041545'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203041546');

-- high: remote 20260203042637 -> local 20260203042638 (1s) 20260203042638_4f0ef888-7553-417e-9493-0b406bb4636d.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203042638'
-- where version = '20260203042637'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203042638');

-- high: remote 20260203145119 -> local 20260203145120 (1s) 20260203145120_c5fecd17-cad2-40b3-ac3c-22600caed6e2.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203145120'
-- where version = '20260203145119'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203145120');

-- high: remote 20260203152413 -> local 20260203152414 (1s) 20260203152414_5c22e0b8-f5ff-4155-a0c2-73003951c937.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203152414'
-- where version = '20260203152413'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203152414');

-- high: remote 20260203152914 -> local 20260203152915 (1s) 20260203152915_9ae9c004-7e8c-425b-925a-a5e959e5629d.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203152915'
-- where version = '20260203152914'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203152915');

-- high: remote 20260203153416 -> local 20260203153417 (1s) 20260203153417_4f24b2b8-5688-44ff-b538-b430e127a4d4.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203153417'
-- where version = '20260203153416'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203153417');

-- high: remote 20260203154041 -> local 20260203154042 (1s) 20260203154042_08b8cf48-d541-4233-947f-fb572fdbce07.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203154042'
-- where version = '20260203154041'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203154042');

-- high: remote 20260203174853 -> local 20260203174854 (1s) 20260203174854_95e27314-1838-45ae-b140-6360a5a77390.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203174854'
-- where version = '20260203174853'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203174854');

-- high: remote 20260203174955 -> local 20260203174956 (1s) 20260203174956_6cc7b4da-15be-492f-bb6e-daa6be0079c1.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203174956'
-- where version = '20260203174955'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203174956');

-- high: remote 20260203175121 -> local 20260203175122 (1s) 20260203175122_07778d64-e9a9-45e8-9f01-1c61e76f71f7.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203175122'
-- where version = '20260203175121'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203175122');

-- high: remote 20260203183411 -> local 20260203183412 (1s) 20260203183412_e0ea229c-828f-4352-be80-ccfe10880304.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203183412'
-- where version = '20260203183411'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203183412');

-- high: remote 20260203184153 -> local 20260203184154 (1s) 20260203184154_70969c81-f5bf-431a-b0b9-b7dd1710e0c1.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203184154'
-- where version = '20260203184153'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203184154');

-- high: remote 20260203184834 -> local 20260203184835 (1s) 20260203184835_1eee9ba3-4607-4149-bdd0-ec0b14a7d9e8.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203184835'
-- where version = '20260203184834'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203184835');

-- high: remote 20260203184904 -> local 20260203184905 (1s) 20260203184905_3c94f6ca-0d11-490b-9b87-96a82b132312.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203184905'
-- where version = '20260203184904'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203184905');

-- high: remote 20260203190707 -> local 20260203190708 (1s) 20260203190708_17826dd3-1fbe-4811-9a38-181a94eec0dc.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203190708'
-- where version = '20260203190707'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203190708');

-- high: remote 20260203191313 -> local 20260203191314 (1s) 20260203191314_4bcd6c8d-628e-4428-9018-d710e87ea9bc.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203191314'
-- where version = '20260203191313'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203191314');

-- high: remote 20260203194846 -> local 20260203194847 (1s) 20260203194847_12b4c810-520d-4f0c-b03b-7c5264824de3.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203194847'
-- where version = '20260203194846'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203194847');

-- high: remote 20260204000808 -> local 20260204000809 (1s) 20260204000809_982bd61a-f958-41fe-82ab-6c6c9885b511.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260204000809'
-- where version = '20260204000808'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260204000809');

-- high: remote 20260204142921 -> local 20260204142922 (1s) 20260204142922_292a0f9d-aa48-483e-9840-630dd35bb586.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260204142922'
-- where version = '20260204142921'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260204142922');

-- high: remote 20260205190653 -> local 20260205190654 (1s) 20260205190654_e002faef-a986-4892-834d-32676cb93055.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260205190654'
-- where version = '20260205190653'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260205190654');

-- high: remote 20260205213336 -> local 20260205213337 (1s) 20260205213337_9bbf6075-0954-473f-bac0-bc7a11d5443c.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260205213337'
-- where version = '20260205213336'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260205213337');

-- high: remote 20260206011252 -> local 20260206011253 (1s) 20260206011253_6e920dee-8db1-4ef6-bab3-9d3e64c2de51.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260206011253'
-- where version = '20260206011252'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260206011253');

-- high: remote 20260206013208 -> local 20260206013209 (1s) 20260206013209_00c0d00c-116a-42e9-9cc9-295d52301427.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260206013209'
-- where version = '20260206013208'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260206013209');

-- high: remote 20260206223353 -> local 20260206223354 (1s) 20260206223354_7b25f06c-afc1-46ae-8cef-ca57f82c3cf5.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260206223354'
-- where version = '20260206223353'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260206223354');

-- high: remote 20260207004155 -> local 20260207004156 (1s) 20260207004156_5ad8a2ee-8b53-450d-8688-2ad74a3f2357.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260207004156'
-- where version = '20260207004155'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260207004156');

-- high: remote 20260207015132 -> local 20260207015133 (1s) 20260207015133_b9483abb-e63c-464b-ab01-66540218c4fe.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260207015133'
-- where version = '20260207015132'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260207015133');

-- high: remote 20260207151949 -> local 20260207151950 (1s) 20260207151950_206afbf2-efd5-4dc0-b0d6-00c0eb5cd498.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260207151950'
-- where version = '20260207151949'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260207151950');

-- high: remote 20260207191943 -> local 20260207191944 (1s) 20260207191944_fd11d364-c29e-4dcd-94b6-2c53bc083724.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260207191944'
-- where version = '20260207191943'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260207191944');

-- high: remote 20260207193115 -> local 20260207193116 (1s) 20260207193116_4779e856-e80c-4507-a687-e34812769e46.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260207193116'
-- where version = '20260207193115'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260207193116');

-- high: remote 20260207204403 -> local 20260207204404 (1s) 20260207204404_aeb2ecca-477e-4fc0-848d-389487b36f36.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260207204404'
-- where version = '20260207204403'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260207204404');

-- high: remote 20260207212941 -> local 20260207212942 (1s) 20260207212942_73cc7c17-0689-43eb-bf7a-2116fe5a2fec.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260207212942'
-- where version = '20260207212941'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260207212942');

-- high: remote 20260208013915 -> local 20260208013916 (1s) 20260208013916_43a6d913-4d82-4f7e-b137-5adcb3c328a1.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260208013916'
-- where version = '20260208013915'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260208013916');

-- high: remote 20260208041930 -> local 20260208041931 (1s) 20260208041931_6141e644-d462-4aff-ab40-40c7dba07e1c.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260208041931'
-- where version = '20260208041930'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260208041931');

-- high: remote 20260209012352 -> local 20260209012353 (1s) 20260209012353_ac77cd30-7e42-4be9-9e3c-d7d028f126aa.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260209012353'
-- where version = '20260209012352'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260209012353');

-- high: remote 20260209020940 -> local 20260209020941 (1s) 20260209020941_f579fda1-4c47-4e99-b3b2-b69a5cfbef6d.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260209020941'
-- where version = '20260209020940'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260209020941');

-- high: remote 20260209030513 -> local 20260209030514 (1s) 20260209030514_5371bf46-1628-4a45-b952-fb11bfdf0d44.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260209030514'
-- where version = '20260209030513'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260209030514');

-- high: remote 20260209051124 -> local 20260209051125 (1s) 20260209051125_5495cc94-b75e-4ba1-9b25-de1ec080e440.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260209051125'
-- where version = '20260209051124'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260209051125');

-- high: remote 20260213145142 -> local 20260213145143 (1s) 20260213145143_8a97e5d6-26a8-4841-aa9f-a61603ce2a0b.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260213145143'
-- where version = '20260213145142'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260213145143');

-- high: remote 20260213223754 -> local 20260213223755 (1s) 20260213223755_36dba0c6-9fbe-4038-a1ad-f365f416bf29.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260213223755'
-- where version = '20260213223754'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260213223755');

-- high: remote 20260226203611 -> local 20260226203612 (1s) 20260226203612_bd4ce01d-2c46-49de-9351-b7dad5cbfd1a.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260226203612'
-- where version = '20260226203611'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260226203612');

-- high: remote 20260417182520 -> local 20260417182521 (1s) 20260417182521_e107d5be-95b0-44b6-8645-f7544a839641.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260417182521'
-- where version = '20260417182520'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260417182521');

-- high: remote 20260417190054 -> local 20260417190055 (1s) 20260417190055_a72b005d-6794-4803-9048-fbeae933d4d5.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260417190055'
-- where version = '20260417190054'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260417190055');

-- high: remote 20260418035409 -> local 20260418035410 (1s) 20260418035410_34402cf0-a056-47bd-bffc-5726535d6a21.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260418035410'
-- where version = '20260418035409'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260418035410');

-- high: remote 20260418171035 -> local 20260418171036 (1s) 20260418171036_d861aedf-91be-4d9e-ae81-4250dd7f2fbf.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260418171036'
-- where version = '20260418171035'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260418171036');

-- high: remote 20260418192432 -> local 20260418192433 (1s) 20260418192433_42a78a41-10f7-41bf-baa1-d622f740692a.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260418192433'
-- where version = '20260418192432'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260418192433');

-- high: remote 20260420005351 -> local 20260420005352 (1s) 20260420005352_1d874611-93cb-4612-95ec-1093ff46fadb.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260420005352'
-- where version = '20260420005351'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260420005352');

-- high: remote 20260421154540 -> local 20260421154541 (1s) 20260421154541_64e64273-4eff-4a71-850a-f9213156b12c.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260421154541'
-- where version = '20260421154540'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260421154541');

-- high: remote 20260421190153 -> local 20260421190154 (1s) 20260421190154_a493c5f5-dc62-44c8-8b79-b5e5cd56670d.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260421190154'
-- where version = '20260421190153'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260421190154');

-- high: remote 20260422000025 -> local 20260422000026 (1s) 20260422000026_a0b9eee0-ef04-481f-9474-f2db18a65a77.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260422000026'
-- where version = '20260422000025'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260422000026');

-- high: remote 20260422020633 -> local 20260422020634 (1s) 20260422020634_19fb3de9-782a-4283-a5ea-e059064caaa1.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260422020634'
-- where version = '20260422020633'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260422020634');

-- high: remote 20260422035608 -> local 20260422035609 (1s) 20260422035609_a3a7b58f-33c3-44da-9691-be78e5e19632.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260422035609'
-- where version = '20260422035608'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260422035609');

-- high: remote 20260422172355 -> local 20260422172356 (1s) 20260422172356_d5f577ef-6ac2-4124-a72e-92bc3fd697c8.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260422172356'
-- where version = '20260422172355'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260422172356');

-- high: remote 20260423005411 -> local 20260423005412 (1s) 20260423005412_b8e8eaca-b732-4c6b-ad10-6ed9316ae899.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260423005412'
-- where version = '20260423005411'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260423005412');

-- high: remote 20260423200224 -> local 20260423200225 (1s) 20260423200225_577344db-cd1f-4b6b-9c2c-b881ddcc16fc.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260423200225'
-- where version = '20260423200224'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260423200225');

-- high: remote 20260424152118 -> local 20260424152119 (1s) 20260424152119_43492e59-4cae-47bb-8f4d-e163f5d60cd8.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260424152119'
-- where version = '20260424152118'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260424152119');

-- high: remote 20260425125622 -> local 20260425125623 (1s) 20260425125623_b8a44e76-05d3-48ec-ad20-106b386734c7.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260425125623'
-- where version = '20260425125622'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260425125623');

-- high: remote 20260425214218 -> local 20260425214219 (1s) 20260425214219_b9de725e-f4e5-4e55-9e61-6e79ef94dff7.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260425214219'
-- where version = '20260425214218'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260425214219');

-- high: remote 20260427011818 -> local 20260427011819 (1s) 20260427011819_3dcefd72-6a46-4f31-afcf-1318637e17ff.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260427011819'
-- where version = '20260427011818'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260427011819');

-- high: remote 20260428183024 -> local 20260428183025 (1s) 20260428183025_1a8cdf04-0c8a-4c0a-b17a-dea83af78c76.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260428183025'
-- where version = '20260428183024'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260428183025');

-- high: remote 20260428205226 -> local 20260428205227 (1s) 20260428205227_e0ea7100-1f07-4431-a7b0-6e158f79b1e0.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260428205227'
-- where version = '20260428205226'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260428205227');

-- high: remote 20260126182059 -> local 20260126182101 (2s) 20260126182101_2f0234ed-56dc-4072-ab57-dfd72543853a.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260126182101'
-- where version = '20260126182059'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260126182101');

-- high: remote 20260126184926 -> local 20260126184928 (2s) 20260126184928_0755b267-5e93-4458-b091-dce75d554b08.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260126184928'
-- where version = '20260126184926'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260126184928');

-- high: remote 20260126190958 -> local 20260126191000 (2s) 20260126191000_58715aeb-e9bb-454c-bb6a-e617cbbce913.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260126191000'
-- where version = '20260126190958'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260126191000');

-- high: remote 20260126194307 -> local 20260126194309 (2s) 20260126194309_e195e9d5-5e21-4d2c-b212-f7264928e546.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260126194309'
-- where version = '20260126194307'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260126194309');

-- high: remote 20260126204103 -> local 20260126204105 (2s) 20260126204105_c67b7de4-2860-447e-9fbd-92891b2247a5.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260126204105'
-- where version = '20260126204103'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260126204105');

-- high: remote 20260126210049 -> local 20260126210051 (2s) 20260126210051_db732eec-5136-48f3-9aed-f84e414f4307.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260126210051'
-- where version = '20260126210049'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260126210051');

-- high: remote 20260126222345 -> local 20260126222347 (2s) 20260126222347_17c79ffb-aefb-49fe-9f4c-311d704354ee.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260126222347'
-- where version = '20260126222345'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260126222347');

-- high: remote 20260127224424 -> local 20260127224426 (2s) 20260127224426_9322795d-86a8-4ca0-86af-654caacb5286.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260127224426'
-- where version = '20260127224424'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260127224426');

-- high: remote 20260127224925 -> local 20260127224927 (2s) 20260127224927_9e2a2506-a399-42ca-89b3-e8cf7b5a3733.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260127224927'
-- where version = '20260127224925'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260127224927');

-- high: remote 20260129222401 -> local 20260129222403 (2s) 20260129222403_8821654d-63c2-4fb4-b5bf-216b04f4a603.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260129222403'
-- where version = '20260129222401'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260129222403');

-- high: remote 20260129225208 -> local 20260129225210 (2s) 20260129225210_7429b719-03e7-49dc-98a2-a101f956b59d.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260129225210'
-- where version = '20260129225208'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260129225210');

-- high: remote 20260131202031 -> local 20260131202033 (2s) 20260131202033_2a6cde74-5ca5-4f55-9675-9580420c3829.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260131202033'
-- where version = '20260131202031'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260131202033');

-- high: remote 20260131202048 -> local 20260131202050 (2s) 20260131202050_6631b7e6-2c78-41b2-983b-8730b4146de5.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260131202050'
-- where version = '20260131202048'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260131202050');

-- high: remote 20260201015942 -> local 20260201015944 (2s) 20260201015944_d2dcded2-8f84-47d7-b226-bb29a6944d8f.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260201015944'
-- where version = '20260201015942'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260201015944');

-- high: remote 20260201040313 -> local 20260201040315 (2s) 20260201040315_45c14265-db1d-49f1-94b5-0b6ab7a1e92c.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260201040315'
-- where version = '20260201040313'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260201040315');

-- high: remote 20260201231043 -> local 20260201231045 (2s) 20260201231045_bed0e379-2e96-49d2-b3f5-ab12040aa6ff.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260201231045'
-- where version = '20260201231043'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260201231045');

-- high: remote 20260202035406 -> local 20260202035408 (2s) 20260202035408_41812af0-2f9d-4a2d-9e9c-65de3934ea7c.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260202035408'
-- where version = '20260202035406'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260202035408');

-- high: remote 20260202051524 -> local 20260202051526 (2s) 20260202051526_be8b4e54-ffc7-4534-aaa6-abec65adfef1.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260202051526'
-- where version = '20260202051524'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260202051526');

-- high: remote 20260202174004 -> local 20260202174006 (2s) 20260202174006_90659f78-5306-4f6a-bd58-1d418ec8608f.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260202174006'
-- where version = '20260202174004'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260202174006');

-- high: remote 20260202190219 -> local 20260202190221 (2s) 20260202190221_2f4e65a7-d37d-4341-85d1-49869ecfde54.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260202190221'
-- where version = '20260202190219'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260202190221');

-- high: remote 20260202195120 -> local 20260202195122 (2s) 20260202195122_1bca7ac1-b2a0-47bd-8a8c-625bc03550cc.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260202195122'
-- where version = '20260202195120'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260202195122');

-- high: remote 20260202214844 -> local 20260202214846 (2s) 20260202214846_72ca2e8b-e277-4863-b76d-bb0d4e845657.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260202214846'
-- where version = '20260202214844'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260202214846');

-- high: remote 20260202220001 -> local 20260202220003 (2s) 20260202220003_7186c03b-3c3b-4bd5-924c-fc1f9ed55f18.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260202220003'
-- where version = '20260202220001'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260202220003');

-- high: remote 20260202231734 -> local 20260202231736 (2s) 20260202231736_6b8dc9d3-3a5f-4793-877b-8cbee0fb9382.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260202231736'
-- where version = '20260202231734'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260202231736');

-- high: remote 20260202232817 -> local 20260202232819 (2s) 20260202232819_7969ad70-23c6-4147-b5c9-6587a027526d.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260202232819'
-- where version = '20260202232817'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260202232819');

-- high: remote 20260202235316 -> local 20260202235318 (2s) 20260202235318_e89b6a56-8ed2-4e22-afe3-5e90d6de92eb.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260202235318'
-- where version = '20260202235316'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260202235318');

-- high: remote 20260203013300 -> local 20260203013302 (2s) 20260203013302_fb931ed1-e37a-4cb8-9735-4c02a54a44e6.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203013302'
-- where version = '20260203013300'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203013302');

-- high: remote 20260203014554 -> local 20260203014556 (2s) 20260203014556_e3548448-7695-4760-9bd6-c9202f144cd5.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203014556'
-- where version = '20260203014554'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203014556');

-- high: remote 20260203023744 -> local 20260203023746 (2s) 20260203023746_8ef5adcb-b1c5-4c87-89de-216095a24a2e.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203023746'
-- where version = '20260203023744'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203023746');

-- high: remote 20260203024507 -> local 20260203024509 (2s) 20260203024509_48237148-549e-4acd-83ff-c267f196c088.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203024509'
-- where version = '20260203024507'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203024509');

-- high: remote 20260203035014 -> local 20260203035016 (2s) 20260203035016_9a6baf43-240a-4f54-96b5-6d0397a1cd0a.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203035016'
-- where version = '20260203035014'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203035016');

-- high: remote 20260203040050 -> local 20260203040052 (2s) 20260203040052_8cf9df9b-0674-49fb-8aad-c8219fa8300f.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203040052'
-- where version = '20260203040050'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203040052');

-- high: remote 20260203042121 -> local 20260203042123 (2s) 20260203042123_7a062e20-630b-40ea-9598-24718ddd4ad5.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203042123'
-- where version = '20260203042121'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203042123');

-- high: remote 20260203043405 -> local 20260203043407 (2s) 20260203043407_1b668709-989f-4e07-a5ed-3deea34fc232.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203043407'
-- where version = '20260203043405'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203043407');

-- high: remote 20260203043851 -> local 20260203043853 (2s) 20260203043853_87e6eb95-4926-4c07-815f-a58af54f2315.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203043853'
-- where version = '20260203043851'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203043853');

-- high: remote 20260203044801 -> local 20260203044803 (2s) 20260203044803_99e6ab80-a3bd-469e-9cb1-1a7485e5ce60.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203044803'
-- where version = '20260203044801'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203044803');

-- high: remote 20260203145735 -> local 20260203145737 (2s) 20260203145737_75c92195-d70d-4079-85aa-2edc080f2d36.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203145737'
-- where version = '20260203145735'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203145737');

-- high: remote 20260203150427 -> local 20260203150429 (2s) 20260203150429_cf2585b7-3153-4f77-a951-98fb2b9b0418.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203150429'
-- where version = '20260203150427'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203150429');

-- high: remote 20260203151532 -> local 20260203151534 (2s) 20260203151534_5523d0a6-049c-4116-b10f-b4aa49688c97.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203151534'
-- where version = '20260203151532'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203151534');

-- high: remote 20260203154127 -> local 20260203154129 (2s) 20260203154129_83f7dd56-1556-4b57-a38f-812225923eb0.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203154129'
-- where version = '20260203154127'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203154129');

-- high: remote 20260203191918 -> local 20260203191920 (2s) 20260203191920_a6bd8472-ec77-4b0e-87d8-61a5926aac35.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203191920'
-- where version = '20260203191918'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203191920');

-- high: remote 20260203192445 -> local 20260203192447 (2s) 20260203192447_0c1d7391-5428-4d9e-9686-c2b8c902f2ac.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203192447'
-- where version = '20260203192445'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203192447');

-- high: remote 20260203192850 -> local 20260203192852 (2s) 20260203192852_f503ea1a-971b-4f8f-8ebf-861f14c05f84.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203192852'
-- where version = '20260203192850'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203192852');

-- high: remote 20260203193507 -> local 20260203193509 (2s) 20260203193509_1a34c8cb-a4ec-4f06-a4c0-6511409df339.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203193509'
-- where version = '20260203193507'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203193509');

-- high: remote 20260203194132 -> local 20260203194134 (2s) 20260203194134_acc3f9b5-84b9-4ca5-8517-89ae26fd1bd4.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203194134'
-- where version = '20260203194132'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203194134');

-- high: remote 20260203195338 -> local 20260203195340 (2s) 20260203195340_b395386a-94a0-4a05-8223-c7331cd83d2c.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203195340'
-- where version = '20260203195338'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203195340');

-- high: remote 20260203195727 -> local 20260203195729 (2s) 20260203195729_7c5801c8-43b3-4891-9e13-8aa5349cdd64.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203195729'
-- where version = '20260203195727'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203195729');

-- high: remote 20260203200258 -> local 20260203200300 (2s) 20260203200300_6a5a3335-6899-4156-b68d-6395a1c43438.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203200300'
-- where version = '20260203200258'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203200300');

-- high: remote 20260203235830 -> local 20260203235832 (2s) 20260203235832_d1fd9bf0-307a-4eee-b48e-14a455bf14cf.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203235832'
-- where version = '20260203235830'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203235832');

-- high: remote 20260204003410 -> local 20260204003412 (2s) 20260204003412_890cf69e-526d-449c-a5f5-2f9313bf1b0d.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260204003412'
-- where version = '20260204003410'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260204003412');

-- high: remote 20260204143015 -> local 20260204143017 (2s) 20260204143017_1e6880e3-e6f5-4416-b252-a17d588f896f.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260204143017'
-- where version = '20260204143015'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260204143017');

-- high: remote 20260204185831 -> local 20260204185833 (2s) 20260204185833_be1100b8-887e-4b8c-8963-db49ddd2e34d.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260204185833'
-- where version = '20260204185831'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260204185833');

-- high: remote 20260205192127 -> local 20260205192129 (2s) 20260205192129_06ed20b1-b359-463b-9e96-40051d4caf5a.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260205192129'
-- where version = '20260205192127'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260205192129');

-- high: remote 20260205192938 -> local 20260205192940 (2s) 20260205192940_8fcdf92c-0c92-4e90-af83-01275c9e0717.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260205192940'
-- where version = '20260205192938'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260205192940');

-- high: remote 20260206004410 -> local 20260206004412 (2s) 20260206004412_9ffce79a-d547-4fd5-9350-98a0025a10f2.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260206004412'
-- where version = '20260206004410'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260206004412');

-- high: remote 20260206004759 -> local 20260206004801 (2s) 20260206004801_7bfca43a-d9d2-4169-8a44-47159879bb74.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260206004801'
-- where version = '20260206004759'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260206004801');

-- high: remote 20260206005442 -> local 20260206005444 (2s) 20260206005444_831becfc-36d7-4da8-8bce-5e669c5ba33f.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260206005444'
-- where version = '20260206005442'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260206005444');

-- high: remote 20260206010208 -> local 20260206010210 (2s) 20260206010210_9e8b79c9-bda7-4a3b-9a47-3afb31c05771.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260206010210'
-- where version = '20260206010208'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260206010210');

-- high: remote 20260206011312 -> local 20260206011314 (2s) 20260206011314_a056e366-630c-4682-842e-b002aa14b0de.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260206011314'
-- where version = '20260206011312'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260206011314');

-- high: remote 20260206012346 -> local 20260206012348 (2s) 20260206012348_c1c62f0f-a7d5-4fdc-96fa-4d0d219d019d.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260206012348'
-- where version = '20260206012346'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260206012348');

-- high: remote 20260206165819 -> local 20260206165821 (2s) 20260206165821_1b793670-97d7-4361-826a-7af839f40628.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260206165821'
-- where version = '20260206165819'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260206165821');

-- high: remote 20260206170221 -> local 20260206170223 (2s) 20260206170223_724dc851-ef00-419e-9712-6a6af3d28b5c.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260206170223'
-- where version = '20260206170221'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260206170223');

-- high: remote 20260206171837 -> local 20260206171839 (2s) 20260206171839_759d3664-17a6-43a0-8e68-5c696986f13d.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260206171839'
-- where version = '20260206171837'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260206171839');

-- high: remote 20260206223309 -> local 20260206223311 (2s) 20260206223311_6540c45a-2b9a-45ae-a1ad-c2e16a4ddc07.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260206223311'
-- where version = '20260206223309'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260206223311');

-- high: remote 20260206223508 -> local 20260206223510 (2s) 20260206223510_cfb70ca7-7101-4618-b19a-872384c64e71.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260206223510'
-- where version = '20260206223508'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260206223510');

-- high: remote 20260206223710 -> local 20260206223712 (2s) 20260206223712_6ee28c0d-a81d-4692-8ecb-35e96c31ef83.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260206223712'
-- where version = '20260206223710'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260206223712');

-- high: remote 20260207030756 -> local 20260207030758 (2s) 20260207030758_41008cf0-b543-452e-9308-881c154bb4a7.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260207030758'
-- where version = '20260207030756'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260207030758');

-- high: remote 20260207032625 -> local 20260207032627 (2s) 20260207032627_e83897b2-ae95-4e43-aca9-2ee71ce4b6ec.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260207032627'
-- where version = '20260207032625'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260207032627');

-- high: remote 20260207041448 -> local 20260207041450 (2s) 20260207041450_af64214e-ccc3-4ba6-9877-1207146d7638.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260207041450'
-- where version = '20260207041448'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260207041450');

-- high: remote 20260207173957 -> local 20260207173959 (2s) 20260207173959_1863e97e-1bf5-4ce6-a8e7-81853b01ecbf.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260207173959'
-- where version = '20260207173957'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260207173959');

-- high: remote 20260207185622 -> local 20260207185624 (2s) 20260207185624_bdcf4a1a-7ae1-4951-96f0-293ea8e14c77.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260207185624'
-- where version = '20260207185622'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260207185624');

-- high: remote 20260207191039 -> local 20260207191041 (2s) 20260207191041_08f7cd99-d74b-493d-9e9e-e7acc70bdcca.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260207191041'
-- where version = '20260207191039'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260207191041');

-- high: remote 20260207194400 -> local 20260207194402 (2s) 20260207194402_db726993-3b01-4f07-9773-2df773c6a510.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260207194402'
-- where version = '20260207194400'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260207194402');

-- high: remote 20260207202217 -> local 20260207202219 (2s) 20260207202219_e73e5e66-1857-4a96-ac0b-23d5362b94f5.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260207202219'
-- where version = '20260207202217'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260207202219');

-- high: remote 20260207202320 -> local 20260207202322 (2s) 20260207202322_37ae332c-69d3-44a0-b8fb-80a84a4f7af6.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260207202322'
-- where version = '20260207202320'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260207202322');

-- high: remote 20260207203232 -> local 20260207203234 (2s) 20260207203234_cc9a3dcc-d44f-42c3-92d2-d27719d0371b.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260207203234'
-- where version = '20260207203232'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260207203234');

-- high: remote 20260207205912 -> local 20260207205914 (2s) 20260207205914_cf13a830-78aa-4c56-8a04-3ed5efbfdee4.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260207205914'
-- where version = '20260207205912'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260207205914');

-- high: remote 20260207211035 -> local 20260207211037 (2s) 20260207211037_1f777619-7936-437c-b1a7-8b2c01ec1771.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260207211037'
-- where version = '20260207211035'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260207211037');

-- high: remote 20260208020131 -> local 20260208020133 (2s) 20260208020133_48beb849-0001-41c5-a794-439db9db0960.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260208020133'
-- where version = '20260208020131'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260208020133');

-- high: remote 20260208025847 -> local 20260208025849 (2s) 20260208025849_77f3b0ac-713e-46b0-bff4-ad2ce8d93778.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260208025849'
-- where version = '20260208025847'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260208025849');

-- high: remote 20260208034307 -> local 20260208034309 (2s) 20260208034309_a59551f7-69af-454e-9c34-3e7c3451b3c3.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260208034309'
-- where version = '20260208034307'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260208034309');

-- high: remote 20260208041137 -> local 20260208041139 (2s) 20260208041139_af10937c-4420-4513-be17-51c807d598e4.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260208041139'
-- where version = '20260208041137'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260208041139');

-- high: remote 20260208155940 -> local 20260208155942 (2s) 20260208155942_37356217-d399-4d99-8605-17216546e256.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260208155942'
-- where version = '20260208155940'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260208155942');

-- high: remote 20260208162234 -> local 20260208162236 (2s) 20260208162236_32f48ee3-da24-49da-82d6-c4e130001708.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260208162236'
-- where version = '20260208162234'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260208162236');

-- high: remote 20260208182916 -> local 20260208182918 (2s) 20260208182918_8650197f-e2d5-4c56-b867-119c98e0389e.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260208182918'
-- where version = '20260208182916'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260208182918');

-- high: remote 20260208190231 -> local 20260208190233 (2s) 20260208190233_79d503b4-f4ef-4579-9fb8-d8618d83a825.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260208190233'
-- where version = '20260208190231'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260208190233');

-- high: remote 20260208202300 -> local 20260208202302 (2s) 20260208202302_025abf77-ff96-4883-8aef-a14b92bd7d45.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260208202302'
-- where version = '20260208202300'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260208202302');

-- high: remote 20260208205620 -> local 20260208205622 (2s) 20260208205622_d2f2b2ae-19f0-4756-a872-dcc7192ed6eb.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260208205622'
-- where version = '20260208205620'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260208205622');

-- high: remote 20260208210012 -> local 20260208210014 (2s) 20260208210014_96c6cc82-446b-4014-9f2f-71632c186589.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260208210014'
-- where version = '20260208210012'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260208210014');

-- high: remote 20260208220018 -> local 20260208220020 (2s) 20260208220020_ce5b655b-c9d4-4c48-a554-10a06331919f.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260208220020'
-- where version = '20260208220018'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260208220020');

-- high: remote 20260208220039 -> local 20260208220041 (2s) 20260208220041_9a9f2c20-f628-42da-b2b3-adf21e510baa.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260208220041'
-- where version = '20260208220039'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260208220041');

-- high: remote 20260208224820 -> local 20260208224822 (2s) 20260208224822_e2720835-ec24-430b-9730-4067ec9c3a21.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260208224822'
-- where version = '20260208224820'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260208224822');

-- high: remote 20260208233019 -> local 20260208233021 (2s) 20260208233021_b48377e2-cba8-47ee-90ed-f409666e2c47.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260208233021'
-- where version = '20260208233019'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260208233021');

-- high: remote 20260208234009 -> local 20260208234011 (2s) 20260208234011_783633b7-42df-4d0c-bf82-3dae01317098.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260208234011'
-- where version = '20260208234009'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260208234011');

-- high: remote 20260208234919 -> local 20260208234921 (2s) 20260208234921_22c28b44-1454-455f-a699-6ba9a7f41339.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260208234921'
-- where version = '20260208234919'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260208234921');

-- high: remote 20260209001956 -> local 20260209001958 (2s) 20260209001958_0ac6d85f-0ca6-42a9-ad58-8fe612f7e00d.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260209001958'
-- where version = '20260209001956'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260209001958');

-- high: remote 20260209004441 -> local 20260209004443 (2s) 20260209004443_5b94e544-ada3-47eb-a94d-546cc9b9d7e9.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260209004443'
-- where version = '20260209004441'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260209004443');

-- high: remote 20260209010714 -> local 20260209010716 (2s) 20260209010716_00b042ad-b884-4171-b1de-3bd1305a96cb.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260209010716'
-- where version = '20260209010714'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260209010716');

-- high: remote 20260209013031 -> local 20260209013033 (2s) 20260209013033_b0aca59a-e5ad-4037-8e38-dba6ebefb239.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260209013033'
-- where version = '20260209013031'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260209013033');

-- high: remote 20260209013533 -> local 20260209013535 (2s) 20260209013535_f39f1654-ea62-4e0f-8468-b491be6d7494.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260209013535'
-- where version = '20260209013533'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260209013535');

-- high: remote 20260209015908 -> local 20260209015910 (2s) 20260209015910_b5d146e2-8c7c-44da-8d66-57efe0c692b8.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260209015910'
-- where version = '20260209015908'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260209015910');

-- high: remote 20260209025312 -> local 20260209025314 (2s) 20260209025314_bfcbc720-c909-4fd5-910c-0ac8090f3fc5.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260209025314'
-- where version = '20260209025312'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260209025314');

-- high: remote 20260209041610 -> local 20260209041612 (2s) 20260209041612_e49a4c62-4970-4b96-afa4-01ad575c182a.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260209041612'
-- where version = '20260209041610'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260209041612');

-- high: remote 20260209042256 -> local 20260209042258 (2s) 20260209042258_9b7c8edd-3d7e-4481-b410-a33832301325.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260209042258'
-- where version = '20260209042256'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260209042258');

-- high: remote 20260209042854 -> local 20260209042856 (2s) 20260209042856_b8733ed0-3602-441d-86ca-b3c6df19e49a.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260209042856'
-- where version = '20260209042854'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260209042856');

-- high: remote 20260209043522 -> local 20260209043524 (2s) 20260209043524_eb96df1b-cdf1-47a4-a148-764dc8bc7543.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260209043524'
-- where version = '20260209043522'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260209043524');

-- high: remote 20260209152917 -> local 20260209152919 (2s) 20260209152919_44d1ef71-df56-4010-92a4-e1ade05ee5b6.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260209152919'
-- where version = '20260209152917'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260209152919');

-- high: remote 20260209154529 -> local 20260209154531 (2s) 20260209154531_7749c78f-e681-4770-a32d-88d2393b0d00.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260209154531'
-- where version = '20260209154529'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260209154531');

-- high: remote 20260209163241 -> local 20260209163243 (2s) 20260209163243_158b7ccb-f4bf-4f08-b5bf-92d0d0d98006.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260209163243'
-- where version = '20260209163241'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260209163243');

-- high: remote 20260209164953 -> local 20260209164955 (2s) 20260209164955_f3c2d4e3-7d24-4b0d-aeea-e92db10c1684.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260209164955'
-- where version = '20260209164953'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260209164955');

-- high: remote 20260209192746 -> local 20260209192748 (2s) 20260209192748_0c0d04e4-0173-418b-bce3-c84b9bfeb383.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260209192748'
-- where version = '20260209192746'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260209192748');

-- high: remote 20260209193901 -> local 20260209193903 (2s) 20260209193903_5739f1f1-1a90-4228-9a75-b0a6144a1c77.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260209193903'
-- where version = '20260209193901'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260209193903');

-- high: remote 20260209211044 -> local 20260209211046 (2s) 20260209211046_a32cf074-3a5a-4ec6-a015-6ae289dcc380.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260209211046'
-- where version = '20260209211044'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260209211046');

-- high: remote 20260209232912 -> local 20260209232914 (2s) 20260209232914_a8bfba46-6271-41ce-9665-6d7123804c6d.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260209232914'
-- where version = '20260209232912'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260209232914');

-- high: remote 20260210015113 -> local 20260210015115 (2s) 20260210015115_bdaa82a9-e8ae-4058-86f5-d360da8dfd09.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260210015115'
-- where version = '20260210015113'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260210015115');

-- high: remote 20260211034651 -> local 20260211034653 (2s) 20260211034653_554ada73-d048-4a89-b1aa-9f7e4e0b15e8.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260211034653'
-- where version = '20260211034651'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260211034653');

-- high: remote 20260212001839 -> local 20260212001841 (2s) 20260212001841_9f6a4456-d268-42e9-b738-3a458253d15d.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260212001841'
-- where version = '20260212001839'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260212001841');

-- high: remote 20260212003322 -> local 20260212003324 (2s) 20260212003324_550be344-2f38-4e49-bf7c-1cc64e3b4ff6.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260212003324'
-- where version = '20260212003322'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260212003324');

-- high: remote 20260213020145 -> local 20260213020147 (2s) 20260213020147_e4cf1924-1fe5-413b-8816-c9eb7aec9915.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260213020147'
-- where version = '20260213020145'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260213020147');

-- high: remote 20260213144715 -> local 20260213144717 (2s) 20260213144717_1d0b58a4-6422-414b-b2d6-aa22c9219988.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260213144717'
-- where version = '20260213144715'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260213144717');

-- high: remote 20260213201635 -> local 20260213201637 (2s) 20260213201637_1473a0b0-1eec-4d0f-a31e-23e856513214.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260213201637'
-- where version = '20260213201635'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260213201637');

-- high: remote 20260213211759 -> local 20260213211801 (2s) 20260213211801_5b61a2d3-b8b8-440c-a3f4-afd67205fcc3.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260213211801'
-- where version = '20260213211759'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260213211801');

-- high: remote 20260214223344 -> local 20260214223346 (2s) 20260214223346_cafc93f6-b26c-4ed9-ace3-9626e9bb8ae7.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260214223346'
-- where version = '20260214223344'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260214223346');

-- high: remote 20260214224917 -> local 20260214224919 (2s) 20260214224919_50ccfb30-3ffb-4111-bbe1-290fcff2e9ca.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260214224919'
-- where version = '20260214224917'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260214224919');

-- high: remote 20260215000514 -> local 20260215000516 (2s) 20260215000516_1168c66b-9bc9-4483-bc8e-f478da801d94.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260215000516'
-- where version = '20260215000514'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260215000516');

-- high: remote 20260215000645 -> local 20260215000647 (2s) 20260215000647_87566436-21cf-48ae-91a8-6c6135830e4a.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260215000647'
-- where version = '20260215000645'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260215000647');

-- high: remote 20260226184400 -> local 20260226184402 (2s) 20260226184402_57113afd-4f82-4cdb-b388-16fa42969ca1.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260226184402'
-- where version = '20260226184400'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260226184402');

-- high: remote 20260226203517 -> local 20260226203519 (2s) 20260226203519_c8b763e6-b0b4-474f-8053-dec6808d9a47.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260226203519'
-- where version = '20260226203517'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260226203519');

-- high: remote 20260307044719 -> local 20260307044721 (2s) 20260307044721_32d8fcf4-cd1d-4e18-a319-43cdf612a01a.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260307044721'
-- where version = '20260307044719'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260307044721');

-- high: remote 20260310211032 -> local 20260310211034 (2s) 20260310211034_b11d9c33-8ab0-41c8-ac44-0d6991f7da5c.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260310211034'
-- where version = '20260310211032'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260310211034');

-- high: remote 20260310211107 -> local 20260310211109 (2s) 20260310211109_5e814d94-2a3f-42f1-b243-8d179d3db6d6.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260310211109'
-- where version = '20260310211107'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260310211109');

-- high: remote 20260310211144 -> local 20260310211146 (2s) 20260310211146_39334887-604d-4717-b372-db0dd3321a90.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260310211146'
-- where version = '20260310211144'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260310211146');

-- high: remote 20260312154328 -> local 20260312154330 (2s) 20260312154330_9b8149e4-0f6f-4115-828d-607b319bd493.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260312154330'
-- where version = '20260312154328'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260312154330');

-- high: remote 20260312160846 -> local 20260312160848 (2s) 20260312160848_06f903af-aae7-4acd-bcfc-8f36aae83aed.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260312160848'
-- where version = '20260312160846'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260312160848');

-- high: remote 20260312162054 -> local 20260312162056 (2s) 20260312162056_6d574b6f-1566-472a-ac0a-b79ca6ec205e.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260312162056'
-- where version = '20260312162054'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260312162056');

-- high: remote 20260313174621 -> local 20260313174623 (2s) 20260313174623_6c192c8d-1329-4545-b7be-195a812076a3.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260313174623'
-- where version = '20260313174621'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260313174623');

-- high: remote 20260313183106 -> local 20260313183108 (2s) 20260313183108_2af531b1-5ed6-48e3-9fad-121f796ca2bd.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260313183108'
-- where version = '20260313183106'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260313183108');

-- high: remote 20260321182449 -> local 20260321182451 (2s) 20260321182451_495d2162-7f39-4d9c-9935-7a7e9e994bcb.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260321182451'
-- where version = '20260321182449'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260321182451');

-- high: remote 20260322153306 -> local 20260322153308 (2s) 20260322153308_eecd07ac-9a64-46c2-bb7e-0eb0df1832a5.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260322153308'
-- where version = '20260322153306'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260322153308');

-- high: remote 20260323164016 -> local 20260323164018 (2s) 20260323164018_07cb7eb3-b9c4-4213-910a-eb5df1af1bcf.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260323164018'
-- where version = '20260323164016'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260323164018');

-- high: remote 20260324021730 -> local 20260324021732 (2s) 20260324021732_f6188254-2969-4573-b400-26e8775733fe.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260324021732'
-- where version = '20260324021730'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260324021732');

-- high: remote 20260324022333 -> local 20260324022335 (2s) 20260324022335_b68c087e-b7ce-4e79-8eab-6b042da9a517.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260324022335'
-- where version = '20260324022333'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260324022335');

-- high: remote 20260325162614 -> local 20260325162616 (2s) 20260325162616_32f7807f-25b6-49bc-8037-541c6019dd3b.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260325162616'
-- where version = '20260325162614'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260325162616');

-- high: remote 20260325163637 -> local 20260325163639 (2s) 20260325163639_1eff878f-1a5b-4652-b398-2c025b0c2808.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260325163639'
-- where version = '20260325163637'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260325163639');

-- high: remote 20260325165233 -> local 20260325165235 (2s) 20260325165235_72a3131e-c731-4e39-bdae-e02510823b51.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260325165235'
-- where version = '20260325165233'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260325165235');

-- high: remote 20260326003700 -> local 20260326003702 (2s) 20260326003702_da71f438-6faa-49b5-8d33-a6d73827941b.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260326003702'
-- where version = '20260326003700'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260326003702');

-- high: remote 20260326032554 -> local 20260326032556 (2s) 20260326032556_1d50ebc0-2f1b-42b0-9190-ee1d920468e9.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260326032556'
-- where version = '20260326032554'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260326032556');

-- high: remote 20260326033311 -> local 20260326033313 (2s) 20260326033313_a576740e-8bc9-48e5-b5c5-3295503caf73.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260326033313'
-- where version = '20260326033311'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260326033313');

-- high: remote 20260326175854 -> local 20260326175856 (2s) 20260326175856_bc38c1fd-17a3-4ceb-ac49-9e5ab6e13005.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260326175856'
-- where version = '20260326175854'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260326175856');

-- high: remote 20260326192609 -> local 20260326192611 (2s) 20260326192611_e6b5265c-7fb9-4d15-8802-2071357bf584.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260326192611'
-- where version = '20260326192609'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260326192611');

-- high: remote 20260326192646 -> local 20260326192648 (2s) 20260326192648_051c325f-0d92-47e3-b3d7-381edd351132.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260326192648'
-- where version = '20260326192646'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260326192648');

-- high: remote 20260326202537 -> local 20260326202539 (2s) 20260326202539_3298121e-84c7-4d56-974f-3f1a46b6fb61.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260326202539'
-- where version = '20260326202537'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260326202539');

-- high: remote 20260327175642 -> local 20260327175644 (2s) 20260327175644_a0b115f1-da26-4464-9844-fae3333ec7cb.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260327175644'
-- where version = '20260327175642'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260327175644');

-- high: remote 20260327222159 -> local 20260327222201 (2s) 20260327222201_dce4aa08-9dc2-4a14-83dd-f59d8be9d889.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260327222201'
-- where version = '20260327222159'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260327222201');

-- high: remote 20260328201131 -> local 20260328201133 (2s) 20260328201133_1dbde7c1-075f-4470-972d-8137d2351d69.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260328201133'
-- where version = '20260328201131'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260328201133');

-- high: remote 20260328201807 -> local 20260328201809 (2s) 20260328201809_684b9c35-99d4-4bae-a859-f5ebdfbc02bb.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260328201809'
-- where version = '20260328201807'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260328201809');

-- high: remote 20260331000552 -> local 20260331000554 (2s) 20260331000554_0df4ae1d-d591-4cdc-a6e4-75e1305f40f0.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260331000554'
-- where version = '20260331000552'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260331000554');

-- high: remote 20260331024155 -> local 20260331024157 (2s) 20260331024157_f8451242-12cb-4e5d-a3ee-63f7187f0851.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260331024157'
-- where version = '20260331024155'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260331024157');

-- high: remote 20260402153338 -> local 20260402153340 (2s) 20260402153340_1d7f5a15-fcfb-401b-8bbc-47a3ef10366c.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260402153340'
-- where version = '20260402153338'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260402153340');

-- high: remote 20260402200855 -> local 20260402200857 (2s) 20260402200857_beecb2c5-ead9-4688-9c82-3f648f656d52.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260402200857'
-- where version = '20260402200855'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260402200857');

-- high: remote 20260402202630 -> local 20260402202632 (2s) 20260402202632_cb42899e-5f6e-48af-9f8a-fbcf1b77ce7f.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260402202632'
-- where version = '20260402202630'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260402202632');

-- high: remote 20260402202658 -> local 20260402202700 (2s) 20260402202700_6466f8c4-1fe6-429f-bff2-9b67d12f20bc.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260402202700'
-- where version = '20260402202658'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260402202700');

-- high: remote 20260403134515 -> local 20260403134517 (2s) 20260403134517_5d561eeb-2133-4898-8b5f-320e2f0f9429.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260403134517'
-- where version = '20260403134515'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260403134517');

-- high: remote 20260403142739 -> local 20260403142741 (2s) 20260403142741_925cfc37-2eea-4e9d-bcbb-99e513c1d8b7.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260403142741'
-- where version = '20260403142739'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260403142741');

-- high: remote 20260404214752 -> local 20260404214754 (2s) 20260404214754_9ba86922-f9e2-4284-a05c-c6a6581abb84.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260404214754'
-- where version = '20260404214752'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260404214754');

-- high: remote 20260404214826 -> local 20260404214828 (2s) 20260404214828_d3513d03-2854-4b80-bc98-4812bf562f23.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260404214828'
-- where version = '20260404214826'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260404214828');

-- high: remote 20260405003313 -> local 20260405003315 (2s) 20260405003315_6cc39287-a3be-400a-9a1c-e75a35c1e100.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260405003315'
-- where version = '20260405003313'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260405003315');

-- high: remote 20260405012505 -> local 20260405012507 (2s) 20260405012507_3cd66edd-7c93-4049-ad43-15680413e148.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260405012507'
-- where version = '20260405012505'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260405012507');

-- high: remote 20260406182005 -> local 20260406182007 (2s) 20260406182007_c85f87cc-357a-4715-8595-5ae249f17bb1.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260406182007'
-- where version = '20260406182005'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260406182007');

-- high: remote 20260407013559 -> local 20260407013601 (2s) 20260407013601_b2ab3302-a83f-4900-8ad1-28334fa75eb9.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260407013601'
-- where version = '20260407013559'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260407013601');

-- high: remote 20260407030312 -> local 20260407030314 (2s) 20260407030314_e4b6ce5a-83b4-41cf-8ff5-eafb66b3b418.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260407030314'
-- where version = '20260407030312'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260407030314');

-- high: remote 20260407160334 -> local 20260407160336 (2s) 20260407160336_64b7cddb-16c0-44af-b8d1-7e6d15a699cc.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260407160336'
-- where version = '20260407160334'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260407160336');

-- high: remote 20260408214825 -> local 20260408214827 (2s) 20260408214827_fbcfa7e9-5252-417f-a43c-62e05ba217c0.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260408214827'
-- where version = '20260408214825'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260408214827');

-- high: remote 20260409031943 -> local 20260409031945 (2s) 20260409031945_bf9ac661-581b-4df3-b4b2-f132e857cca7.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260409031945'
-- where version = '20260409031943'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260409031945');

-- high: remote 20260413153912 -> local 20260413153914 (2s) 20260413153914_06e4c3cd-0d36-41a6-b56d-a0b58f0fc2e1.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260413153914'
-- where version = '20260413153912'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260413153914');

-- high: remote 20260415015210 -> local 20260415015212 (2s) 20260415015212_c5a25c0f-eb2c-4e0c-b585-004ff757eca1.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260415015212'
-- where version = '20260415015210'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260415015212');

-- high: remote 20260416151630 -> local 20260416151632 (2s) 20260416151632_c60591a3-cb07-4c3b-8b6b-b784dbb70d28.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260416151632'
-- where version = '20260416151630'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260416151632');

-- high: remote 20260416151753 -> local 20260416151755 (2s) 20260416151755_1409da00-de24-459c-a7d8-d8b51ca26133.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260416151755'
-- where version = '20260416151753'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260416151755');

-- high: remote 20260416154012 -> local 20260416154014 (2s) 20260416154014_d98d125e-d07c-44af-840c-2c1189bbdb6e.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260416154014'
-- where version = '20260416154012'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260416154014');

-- high: remote 20260416220932 -> local 20260416220934 (2s) 20260416220934_89a5b53a-b558-4168-97e1-4531e927ea9a.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260416220934'
-- where version = '20260416220932'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260416220934');

-- high: remote 20260416221046 -> local 20260416221048 (2s) 20260416221048_0f31f0b9-82b4-43b1-b93e-9608ded3685e.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260416221048'
-- where version = '20260416221046'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260416221048');

-- high: remote 20260416222854 -> local 20260416222856 (2s) 20260416222856_adebc90f-8caf-438e-8625-a0c0bbee3e21.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260416222856'
-- where version = '20260416222854'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260416222856');

-- high: remote 20260417005358 -> local 20260417005400 (2s) 20260417005400_efa24bc3-e134-4f14-9134-d7779cbe329a.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260417005400'
-- where version = '20260417005358'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260417005400');

-- high: remote 20260417025917 -> local 20260417025919 (2s) 20260417025919_a6faff21-3c0a-4100-a1f8-4edddac6705f.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260417025919'
-- where version = '20260417025917'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260417025919');

-- high: remote 20260417161928 -> local 20260417161930 (2s) 20260417161930_015bb17f-4e8b-4cb4-898c-509955879db5.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260417161930'
-- where version = '20260417161928'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260417161930');

-- high: remote 20260417170140 -> local 20260417170142 (2s) 20260417170142_78496957-d5e1-472d-a5df-61874d804bea.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260417170142'
-- where version = '20260417170140'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260417170142');

-- high: remote 20260417171129 -> local 20260417171131 (2s) 20260417171131_ad509f89-f4f7-41bc-a806-9ee6e6217ae1.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260417171131'
-- where version = '20260417171129'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260417171131');

-- high: remote 20260417180142 -> local 20260417180144 (2s) 20260417180144_4d8972bb-fbdb-4660-abb6-1078db260c23.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260417180144'
-- where version = '20260417180142'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260417180144');

-- high: remote 20260417181621 -> local 20260417181623 (2s) 20260417181623_a3ae0a15-681f-4a68-a5ff-70b4549735ab.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260417181623'
-- where version = '20260417181621'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260417181623');

-- high: remote 20260417181831 -> local 20260417181833 (2s) 20260417181833_95b05e9a-1c86-4423-b964-a4638a293b7b.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260417181833'
-- where version = '20260417181831'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260417181833');

-- high: remote 20260417183229 -> local 20260417183231 (2s) 20260417183231_a73a6b74-4319-4f4f-9c02-3ab592af90f2.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260417183231'
-- where version = '20260417183229'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260417183231');

-- high: remote 20260417184154 -> local 20260417184156 (2s) 20260417184156_ec6b49c4-157f-409c-9deb-2d30c86b8cac.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260417184156'
-- where version = '20260417184154'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260417184156');

-- high: remote 20260417184808 -> local 20260417184810 (2s) 20260417184810_9f9ea08f-7096-4ace-84fc-d4d0ac4421c6.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260417184810'
-- where version = '20260417184808'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260417184810');

-- high: remote 20260417190940 -> local 20260417190942 (2s) 20260417190942_6aa57270-4d60-4585-a890-09886b9669f3.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260417190942'
-- where version = '20260417190940'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260417190942');

-- high: remote 20260417194612 -> local 20260417194614 (2s) 20260417194614_8a15318b-c8db-4d59-9cb4-bec5fce1886a.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260417194614'
-- where version = '20260417194612'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260417194614');

-- high: remote 20260417195208 -> local 20260417195210 (2s) 20260417195210_13419fee-6ccf-4ec8-b74b-bdfd680f09ae.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260417195210'
-- where version = '20260417195208'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260417195210');

-- high: remote 20260417202152 -> local 20260417202154 (2s) 20260417202154_02e51f84-4853-4d66-90c7-f115366045ed.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260417202154'
-- where version = '20260417202152'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260417202154');

-- high: remote 20260417231645 -> local 20260417231647 (2s) 20260417231647_6e177eb8-a42a-44b8-b92c-551e6c654d27.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260417231647'
-- where version = '20260417231645'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260417231647');

-- high: remote 20260417232418 -> local 20260417232420 (2s) 20260417232420_949a4ddd-6494-477c-a5fd-80bfc7f755b9.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260417232420'
-- where version = '20260417232418'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260417232420');

-- high: remote 20260418002102 -> local 20260418002104 (2s) 20260418002104_a04a091d-5123-440d-8a3e-44ddf7d0e37b.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260418002104'
-- where version = '20260418002102'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260418002104');

-- high: remote 20260418002547 -> local 20260418002549 (2s) 20260418002549_2b14ddbb-73e1-47de-b211-d0fdbbdba931.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260418002549'
-- where version = '20260418002547'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260418002549');

-- high: remote 20260418172658 -> local 20260418172700 (2s) 20260418172700_03793aa6-a1d8-40e3-a18e-c7b835384105.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260418172700'
-- where version = '20260418172658'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260418172700');

-- high: remote 20260418193839 -> local 20260418193841 (2s) 20260418193841_49cfaf77-e36c-4a96-bcd2-923e7ef4873a.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260418193841'
-- where version = '20260418193839'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260418193841');

-- high: remote 20260419040832 -> local 20260419040834 (2s) 20260419040834_a342872b-8b46-4b42-8a00-7cb3fea9d668.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260419040834'
-- where version = '20260419040832'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260419040834');

-- high: remote 20260421004339 -> local 20260421004341 (2s) 20260421004341_8d5caaca-b222-4e38-960b-aad753b92426.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260421004341'
-- where version = '20260421004339'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260421004341');

-- high: remote 20260421145716 -> local 20260421145718 (2s) 20260421145718_56c8ac44-84af-4f4b-ae52-8f0bbcfc6528.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260421145718'
-- where version = '20260421145716'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260421145718');

-- high: remote 20260421151540 -> local 20260421151542 (2s) 20260421151542_46015e18-3598-4ec4-b574-f98e36b83514.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260421151542'
-- where version = '20260421151540'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260421151542');

-- high: remote 20260421153159 -> local 20260421153201 (2s) 20260421153201_d3f9f039-7710-4190-9c3c-b4b1346b926c.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260421153201'
-- where version = '20260421153159'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260421153201');

-- high: remote 20260421154047 -> local 20260421154049 (2s) 20260421154049_2b800c91-6958-4fd1-8387-947a29759829.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260421154049'
-- where version = '20260421154047'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260421154049');

-- high: remote 20260421155323 -> local 20260421155325 (2s) 20260421155325_ae922116-431e-4b25-bf0c-7159c4f9241a.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260421155325'
-- where version = '20260421155323'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260421155325');

-- high: remote 20260421155539 -> local 20260421155541 (2s) 20260421155541_f3c2680b-a458-4667-8d70-37465ced87e9.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260421155541'
-- where version = '20260421155539'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260421155541');

-- high: remote 20260421180433 -> local 20260421180435 (2s) 20260421180435_f63ddf37-f6cf-4f6a-89a1-1cbd5d2258c4.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260421180435'
-- where version = '20260421180433'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260421180435');

-- high: remote 20260421182033 -> local 20260421182035 (2s) 20260421182035_80fd27b7-3ab8-482d-b620-5c98b4fa9023.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260421182035'
-- where version = '20260421182033'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260421182035');

-- high: remote 20260421201219 -> local 20260421201221 (2s) 20260421201221_0806eaf5-3ee5-4b2e-b391-cb71ce315bc5.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260421201221'
-- where version = '20260421201219'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260421201221');

-- high: remote 20260421201950 -> local 20260421201952 (2s) 20260421201952_99bf7cfa-c6b1-4722-b898-669fd439bcc4.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260421201952'
-- where version = '20260421201950'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260421201952');

-- high: remote 20260421204058 -> local 20260421204100 (2s) 20260421204100_dae9c10c-013a-4018-834b-8712b4f3f972.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260421204100'
-- where version = '20260421204058'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260421204100');

-- high: remote 20260421210438 -> local 20260421210440 (2s) 20260421210440_467910d2-090b-4cc6-bedf-f422de5d799f.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260421210440'
-- where version = '20260421210438'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260421210440');

-- high: remote 20260421213035 -> local 20260421213037 (2s) 20260421213037_fafa21ea-2d68-40e0-b9fa-77be2d71ec3c.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260421213037'
-- where version = '20260421213035'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260421213037');

-- high: remote 20260422013752 -> local 20260422013754 (2s) 20260422013754_9447357a-a702-44fe-8ed1-203a1b37a26f.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260422013754'
-- where version = '20260422013752'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260422013754');

-- high: remote 20260422014704 -> local 20260422014706 (2s) 20260422014706_ced64652-05f2-4fdf-9947-ece14287c15e.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260422014706'
-- where version = '20260422014704'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260422014706');

-- high: remote 20260422020017 -> local 20260422020019 (2s) 20260422020019_f3d8e688-6df1-4aab-9c4c-cf427cd305dc.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260422020019'
-- where version = '20260422020017'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260422020019');

-- high: remote 20260422020104 -> local 20260422020106 (2s) 20260422020106_c7b5c875-882e-45a3-b3a9-91b3b5e5f279.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260422020106'
-- where version = '20260422020104'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260422020106');

-- high: remote 20260422020717 -> local 20260422020719 (2s) 20260422020719_f7d37a1b-4ead-4b5d-a316-0943de4e4421.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260422020719'
-- where version = '20260422020717'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260422020719');

-- high: remote 20260422021639 -> local 20260422021641 (2s) 20260422021641_c96e7250-df83-4371-832c-0789b8be507c.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260422021641'
-- where version = '20260422021639'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260422021641');

-- high: remote 20260422024905 -> local 20260422024907 (2s) 20260422024907_57f9f6ed-43b7-4d5a-9e1c-35966eed6fe0.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260422024907'
-- where version = '20260422024905'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260422024907');

-- high: remote 20260422030509 -> local 20260422030511 (2s) 20260422030511_d536ebff-c8bd-4d60-8eda-d6f65867f151.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260422030511'
-- where version = '20260422030509'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260422030511');

-- high: remote 20260422035148 -> local 20260422035150 (2s) 20260422035150_fee08732-f899-4a0a-919b-4b1398586b11.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260422035150'
-- where version = '20260422035148'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260422035150');

-- high: remote 20260422040140 -> local 20260422040142 (2s) 20260422040142_fef3879d-f937-4a7d-b0ab-d69e76540c53.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260422040142'
-- where version = '20260422040140'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260422040142');

-- high: remote 20260422040242 -> local 20260422040244 (2s) 20260422040244_4736782f-a8c7-4c7d-969d-21f3bcb6da19.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260422040244'
-- where version = '20260422040242'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260422040244');

-- high: remote 20260422040325 -> local 20260422040327 (2s) 20260422040327_e43a342a-1e41-4def-ad26-9fbdde280970.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260422040327'
-- where version = '20260422040325'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260422040327');

-- high: remote 20260422042206 -> local 20260422042208 (2s) 20260422042208_b699b7c3-17df-4374-b2c4-c9f95fe7f991.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260422042208'
-- where version = '20260422042206'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260422042208');

-- high: remote 20260422045248 -> local 20260422045250 (2s) 20260422045250_f22b428f-ae28-4cfb-929b-1f4cdf68bd06.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260422045250'
-- where version = '20260422045248'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260422045250');

-- high: remote 20260422050617 -> local 20260422050619 (2s) 20260422050619_8f163271-e8eb-4475-b3da-298872286d4e.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260422050619'
-- where version = '20260422050617'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260422050619');

-- high: remote 20260422142145 -> local 20260422142147 (2s) 20260422142147_2f069619-db8b-4985-b9d8-5a8a7a5929c0.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260422142147'
-- where version = '20260422142145'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260422142147');

-- high: remote 20260422160612 -> local 20260422160614 (2s) 20260422160614_c53e32e7-030b-4507-a735-e445997a1ebd.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260422160614'
-- where version = '20260422160612'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260422160614');

-- high: remote 20260422162005 -> local 20260422162007 (2s) 20260422162007_e210fb0e-5eb9-4be2-aa37-0e02eab73267.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260422162007'
-- where version = '20260422162005'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260422162007');

-- high: remote 20260422163049 -> local 20260422163051 (2s) 20260422163051_93d2299f-7af9-4e7c-8866-45de10a2c8dd.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260422163051'
-- where version = '20260422163049'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260422163051');

-- high: remote 20260422164929 -> local 20260422164931 (2s) 20260422164931_4a75586f-2751-4663-bbc2-98c075d7e297.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260422164931'
-- where version = '20260422164929'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260422164931');

-- high: remote 20260422165938 -> local 20260422165940 (2s) 20260422165940_71108f4a-838c-463e-810f-fd28bae2918f.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260422165940'
-- where version = '20260422165938'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260422165940');

-- high: remote 20260422170711 -> local 20260422170713 (2s) 20260422170713_20446c7d-eb8c-434b-b7ad-52d20fe52cdf.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260422170713'
-- where version = '20260422170711'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260422170713');

-- high: remote 20260422173620 -> local 20260422173622 (2s) 20260422173622_e1d1271e-41fd-4066-a1fe-e77e97bd2b50.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260422173622'
-- where version = '20260422173620'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260422173622');

-- high: remote 20260422175013 -> local 20260422175015 (2s) 20260422175015_d61927e6-32c6-445c-9f9c-9e3677a5d151.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260422175015'
-- where version = '20260422175013'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260422175015');

-- high: remote 20260422175924 -> local 20260422175926 (2s) 20260422175926_33ed95ba-0119-4468-8acc-1ccd26724531.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260422175926'
-- where version = '20260422175924'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260422175926');

-- high: remote 20260423005828 -> local 20260423005830 (2s) 20260423005830_a444c006-9ef2-4183-86c5-c379f26f5cc6.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260423005830'
-- where version = '20260423005828'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260423005830');

-- high: remote 20260423010120 -> local 20260423010122 (2s) 20260423010122_542d1db8-857b-451f-8887-15c68d085de2.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260423010122'
-- where version = '20260423010120'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260423010122');

-- high: remote 20260423192949 -> local 20260423192951 (2s) 20260423192951_e1714a41-b9b4-4126-9574-d422e206166e.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260423192951'
-- where version = '20260423192949'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260423192951');

-- high: remote 20260423194333 -> local 20260423194335 (2s) 20260423194335_46caffb6-d53b-4e75-8f28-5eb84e651be8.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260423194335'
-- where version = '20260423194333'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260423194335');

-- high: remote 20260423202608 -> local 20260423202610 (2s) 20260423202610_9c261b18-86ca-4f52-b44c-0da2e0969cbc.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260423202610'
-- where version = '20260423202608'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260423202610');

-- high: remote 20260423202651 -> local 20260423202653 (2s) 20260423202653_7338f954-1e6d-4e27-ba7b-9e4eb718fac8.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260423202653'
-- where version = '20260423202651'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260423202653');

-- high: remote 20260424143751 -> local 20260424143753 (2s) 20260424143753_7ae1693a-3a0a-4f89-9c89-fdf0b0e168ac.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260424143753'
-- where version = '20260424143751'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260424143753');

-- high: remote 20260424235623 -> local 20260424235625 (2s) 20260424235625_31c53fe0-9213-4016-aa57-a8020508a16b.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260424235625'
-- where version = '20260424235623'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260424235625');

-- high: remote 20260425113952 -> local 20260425113954 (2s) 20260425113954_0c1aaa51-95a2-4772-8a76-0845a09883e8.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260425113954'
-- where version = '20260425113952'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260425113954');

-- high: remote 20260425123108 -> local 20260425123110 (2s) 20260425123110_02e1a67a-e28b-4204-9d17-d65f3cd71bea.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260425123110'
-- where version = '20260425123108'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260425123110');

-- high: remote 20260425211418 -> local 20260425211420 (2s) 20260425211420_e743bd0e-a3ef-4f89-80c1-8369d32d4bc2.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260425211420'
-- where version = '20260425211418'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260425211420');

-- high: remote 20260425214137 -> local 20260425214139 (2s) 20260425214139_fd81c680-2672-4b13-b364-20dd0d19f760.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260425214139'
-- where version = '20260425214137'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260425214139');

-- high: remote 20260425214910 -> local 20260425214912 (2s) 20260425214912_ee44c2d6-1039-43b3-9982-c515012cb92c.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260425214912'
-- where version = '20260425214910'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260425214912');

-- high: remote 20260426141247 -> local 20260426141249 (2s) 20260426141249_0b48bbae-de51-4d9a-bcac-94eb5a9f3823.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260426141249'
-- where version = '20260426141247'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260426141249');

-- high: remote 20260426142607 -> local 20260426142609 (2s) 20260426142609_f4514f70-6790-4e74-a56b-ee092a4a77a3.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260426142609'
-- where version = '20260426142607'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260426142609');

-- high: remote 20260426152859 -> local 20260426152901 (2s) 20260426152901_706d0cde-ab45-47f8-810f-07307a3dd55e.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260426152901'
-- where version = '20260426152859'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260426152901');

-- high: remote 20260426153251 -> local 20260426153253 (2s) 20260426153253_52390136-74a7-4cb9-9322-449efa95553a.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260426153253'
-- where version = '20260426153251'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260426153253');

-- high: remote 20260426154105 -> local 20260426154107 (2s) 20260426154107_6cd1b10c-e1ba-4b79-8dde-00b9cfc9a3a9.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260426154107'
-- where version = '20260426154105'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260426154107');

-- high: remote 20260426155110 -> local 20260426155112 (2s) 20260426155112_93446267-db83-45ee-82cd-5cfac21bb995.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260426155112'
-- where version = '20260426155110'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260426155112');

-- high: remote 20260426160901 -> local 20260426160903 (2s) 20260426160903_9b8fb0ec-9bd7-4e1a-b6c8-51e5a6b8b41c.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260426160903'
-- where version = '20260426160901'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260426160903');

-- high: remote 20260426203905 -> local 20260426203907 (2s) 20260426203907_087e023a-2011-42a8-8dc9-bae36950ca6c.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260426203907'
-- where version = '20260426203905'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260426203907');

-- high: remote 20260426210933 -> local 20260426210935 (2s) 20260426210935_16db2c56-768f-47f2-b028-53cef9aff541.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260426210935'
-- where version = '20260426210933'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260426210935');

-- high: remote 20260426214328 -> local 20260426214330 (2s) 20260426214330_163c9c60-6ec6-43f5-9856-e4463748cb1f.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260426214330'
-- where version = '20260426214328'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260426214330');

-- high: remote 20260426215636 -> local 20260426215638 (2s) 20260426215638_cf1fd171-aa81-49e2-8d94-1023521b43ed.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260426215638'
-- where version = '20260426215636'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260426215638');

-- high: remote 20260426215952 -> local 20260426215954 (2s) 20260426215954_1dfb9821-4296-41bc-8620-72f19bf509b4.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260426215954'
-- where version = '20260426215952'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260426215954');

-- high: remote 20260426223640 -> local 20260426223642 (2s) 20260426223642_5fe9be6f-c61c-41c0-9002-b1041e91c204.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260426223642'
-- where version = '20260426223640'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260426223642');

-- high: remote 20260426223811 -> local 20260426223813 (2s) 20260426223813_1a18cc2c-9758-4962-b43e-fa0e864248c2.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260426223813'
-- where version = '20260426223811'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260426223813');

-- high: remote 20260426225510 -> local 20260426225512 (2s) 20260426225512_5061c9c6-6864-48e5-98c0-60ac5826d481.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260426225512'
-- where version = '20260426225510'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260426225512');

-- high: remote 20260426233834 -> local 20260426233836 (2s) 20260426233836_4659a736-744a-4a89-b9dd-1af970ba69bc.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260426233836'
-- where version = '20260426233834'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260426233836');

-- high: remote 20260427152527 -> local 20260427152529 (2s) 20260427152529_31b08162-f17b-4226-a822-c94cf6b53647.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260427152529'
-- where version = '20260427152527'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260427152529');

-- high: remote 20260427185354 -> local 20260427185356 (2s) 20260427185356_9890be06-421d-4692-a29e-2578758fc201.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260427185356'
-- where version = '20260427185354'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260427185356');

-- high: remote 20260427192813 -> local 20260427192815 (2s) 20260427192815_637e9097-1907-4ab1-9346-d4f26c4581cf.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260427192815'
-- where version = '20260427192813'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260427192815');

-- high: remote 20260427203257 -> local 20260427203259 (2s) 20260427203259_3f47cf6b-ec48-4d03-97fb-117a7311f148.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260427203259'
-- where version = '20260427203257'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260427203259');

-- high: remote 20260427205053 -> local 20260427205055 (2s) 20260427205055_d76eb297-1b75-419d-aa2d-880ded03fcdf.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260427205055'
-- where version = '20260427205053'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260427205055');

-- high: remote 20260427205137 -> local 20260427205139 (2s) 20260427205139_ba209830-e315-4984-8419-a2bf5895c73f.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260427205139'
-- where version = '20260427205137'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260427205139');

-- high: remote 20260427210156 -> local 20260427210158 (2s) 20260427210158_2cdfdd02-142b-473c-a4b7-ec66b3de24a9.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260427210158'
-- where version = '20260427210156'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260427210158');

-- high: remote 20260427211109 -> local 20260427211111 (2s) 20260427211111_41d7872d-ee9a-4b9f-a298-7e770cd3285c.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260427211111'
-- where version = '20260427211109'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260427211111');

-- high: remote 20260427220454 -> local 20260427220456 (2s) 20260427220456_25dfca9c-6482-487f-b020-9d32dfa1335b.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260427220456'
-- where version = '20260427220454'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260427220456');

-- high: remote 20260427222509 -> local 20260427222511 (2s) 20260427222511_2370c49b-9979-4e51-bed2-25e6fa01b9e2.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260427222511'
-- where version = '20260427222509'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260427222511');

-- high: remote 20260427224117 -> local 20260427224119 (2s) 20260427224119_616e3ea2-a02d-48d6-b072-13e37c124614.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260427224119'
-- where version = '20260427224117'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260427224119');

-- high: remote 20260427224908 -> local 20260427224910 (2s) 20260427224910_67bfa090-44cd-4954-896b-a3d1e9a4923d.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260427224910'
-- where version = '20260427224908'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260427224910');

-- high: remote 20260427225314 -> local 20260427225316 (2s) 20260427225316_0b82f38b-726c-4e1a-b6cd-e735c71062ac.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260427225316'
-- where version = '20260427225314'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260427225316');

-- high: remote 20260427225919 -> local 20260427225921 (2s) 20260427225921_1303d4f1-185d-4be0-9f21-2d7a552433ef.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260427225921'
-- where version = '20260427225919'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260427225921');

-- high: remote 20260428014825 -> local 20260428014827 (2s) 20260428014827_14a1b738-783e-4ac8-96c1-ea420e2d9543.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260428014827'
-- where version = '20260428014825'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260428014827');

-- high: remote 20260428023155 -> local 20260428023157 (2s) 20260428023157_263c2aca-f050-4518-b131-fe3ad0cca9da.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260428023157'
-- where version = '20260428023155'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260428023157');

-- high: remote 20260428030441 -> local 20260428030443 (2s) 20260428030443_0957e86b-70fc-48ee-95b2-22ccf3b8bfff.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260428030443'
-- where version = '20260428030441'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260428030443');

-- high: remote 20260428032511 -> local 20260428032513 (2s) 20260428032513_d1827e5d-276e-4738-bf5f-7cbfee35c8a4.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260428032513'
-- where version = '20260428032511'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260428032513');

-- high: remote 20260428152552 -> local 20260428152554 (2s) 20260428152554_c939a4fd-b19d-4c59-91bc-4f7f79815ab6.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260428152554'
-- where version = '20260428152552'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260428152554');

-- high: remote 20260428183406 -> local 20260428183408 (2s) 20260428183408_18795f64-70e4-40f5-9b84-5cf9847f9c93.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260428183408'
-- where version = '20260428183406'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260428183408');

-- high: remote 20260428183558 -> local 20260428183600 (2s) 20260428183600_f388db3e-5e62-4df4-83e6-c224ab2c9fd5.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260428183600'
-- where version = '20260428183558'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260428183600');

-- high: remote 20260428190635 -> local 20260428190637 (2s) 20260428190637_a79f6b67-b4a7-4dc9-b7e7-e55792e6b89e.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260428190637'
-- where version = '20260428190635'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260428190637');

-- high: remote 20260428190806 -> local 20260428190808 (2s) 20260428190808_634bf4c7-18a7-4ba8-bf50-80852902ff60.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260428190808'
-- where version = '20260428190806'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260428190808');

-- high: remote 20260428194851 -> local 20260428194853 (2s) 20260428194853_995aa4b3-4f08-45f3-9b3c-56d2577c8e74.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260428194853'
-- where version = '20260428194851'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260428194853');

-- high: remote 20260428200226 -> local 20260428200228 (2s) 20260428200228_4a5680a2-5c7c-41c5-9017-1ed6b0888d85.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260428200228'
-- where version = '20260428200226'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260428200228');

-- high: remote 20260428203350 -> local 20260428203352 (2s) 20260428203352_5934d63b-d467-4681-bbde-3c002031f5dd.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260428203352'
-- where version = '20260428203350'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260428203352');

-- high: remote 20260429032932 -> local 20260429032934 (2s) 20260429032934_f830a06a-7da2-4987-af20-fbab92e7c7a4.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260429032934'
-- where version = '20260429032932'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260429032934');

-- high: remote 20260429182922 -> local 20260429182924 (2s) 20260429182924_f2229a7a-d5bf-4c19-8c7c-2a535ed37b48.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260429182924'
-- where version = '20260429182922'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260429182924');

-- high: remote 20260501035028 -> local 20260501035030 (2s) 20260501035030_d115fb84-ba81-4c99-be35-929819e62de0.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260501035030'
-- where version = '20260501035028'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260501035030');

-- high: remote 20260503161419 -> local 20260503161421 (2s) 20260503161421_d62c4e48-63fa-43d1-b12d-2bdc57d0ab51.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260503161421'
-- where version = '20260503161419'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260503161421');

-- high: remote 20260503161504 -> local 20260503161506 (2s) 20260503161506_2a15cd86-e3bb-4e21-8ffa-390e2a8b3935.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260503161506'
-- where version = '20260503161504'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260503161506');

-- high: remote 20260503161535 -> local 20260503161537 (2s) 20260503161537_599a5382-0d26-4b61-8702-6ba21955d14b.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260503161537'
-- where version = '20260503161535'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260503161537');

-- high: remote 20260503170037 -> local 20260503170039 (2s) 20260503170039_551bbffb-8cd9-42a0-81d1-10243344a2dd.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260503170039'
-- where version = '20260503170037'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260503170039');

-- high: remote 20260504205154 -> local 20260504205156 (2s) 20260504205156_de66f12c-ec3d-432f-a717-6da8b353a555.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260504205156'
-- where version = '20260504205154'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260504205156');

-- high: remote 20260518212844 -> local 20260518212846 (2s) 20260518212846_83119079-584b-44e8-b2ac-cfb145734558.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260518212846'
-- where version = '20260518212844'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260518212846');

-- high: remote 20260519205316 -> local 20260519205318 (2s) 20260519205318_b3ccd9d8-8345-4dd3-a426-e1e7f58375c1.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260519205318'
-- where version = '20260519205316'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260519205318');

-- high: remote 20260525191031 -> local 20260525191033 (2s) 20260525191033_driver_earnings_ride_requests.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260525191033'
-- where version = '20260525191031'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260525191033');

-- high: remote 20260201013819 -> local 20260201013822 (3s) 20260201013822_2bc1f474-0e88-44be-a68d-befe581a0753.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260201013822'
-- where version = '20260201013819'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260201013822');

-- high: remote 20260202222641 -> local 20260202222644 (3s) 20260202222644_48560059-27a6-4794-a4e3-482bfcb875ca.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260202222644'
-- where version = '20260202222641'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260202222644');

-- high: remote 20260203174738 -> local 20260203174741 (3s) 20260203174741_708fcb48-34e2-4a51-9985-de4631f402dd.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260203174741'
-- where version = '20260203174738'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260203174741');

-- high: remote 20260206223612 -> local 20260206223615 (3s) 20260206223615_88748bbd-38c4-4bde-8d2c-a22f8229cf79.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260206223615'
-- where version = '20260206223612'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260206223615');

-- high: remote 20260207184509 -> local 20260207184512 (3s) 20260207184512_e8109513-6510-46a8-b7ce-fc124a925d89.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260207184512'
-- where version = '20260207184509'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260207184512');

-- high: remote 20260207195600 -> local 20260207195603 (3s) 20260207195603_3b7a9293-9f76-4ae2-a176-1b682e8b0eba.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260207195603'
-- where version = '20260207195600'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260207195603');

-- high: remote 20260208155224 -> local 20260208155227 (3s) 20260208155227_effa880c-cd45-4322-a570-04540d5b2c8e.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260208155227'
-- where version = '20260208155224'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260208155227');

-- high: remote 20260208222241 -> local 20260208222244 (3s) 20260208222244_e4c9a3da-186c-4cbe-8059-8530565eb593.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260208222244'
-- where version = '20260208222241'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260208222244');

-- high: remote 20260208231646 -> local 20260208231649 (3s) 20260208231649_309140b6-1e92-46d7-afc3-a690692b5a7f.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260208231649'
-- where version = '20260208231646'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260208231649');

-- high: remote 20260209005804 -> local 20260209005807 (3s) 20260209005807_3e5479c4-9733-45e1-9041-bd5167c95b32.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260209005807'
-- where version = '20260209005804'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260209005807');

-- high: remote 20260209170610 -> local 20260209170613 (3s) 20260209170613_c977a65b-0fd7-4b63-8efa-8d5e07f79b88.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260209170613'
-- where version = '20260209170610'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260209170613');

-- high: remote 20260210180532 -> local 20260210180535 (3s) 20260210180535_e53f75b8-724d-4da0-920e-4d29ec191e44.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260210180535'
-- where version = '20260210180532'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260210180535');

-- high: remote 20260212004711 -> local 20260212004714 (3s) 20260212004714_fee40983-05f8-45ee-a713-bef0e6afeba7.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260212004714'
-- where version = '20260212004711'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260212004714');

-- high: remote 20260212193714 -> local 20260212193717 (3s) 20260212193717_7f08b61d-0ab1-4200-97fc-63caf717acc8.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260212193717'
-- where version = '20260212193714'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260212193717');

-- high: remote 20260308014349 -> local 20260308014352 (3s) 20260308014352_989e4165-c327-4289-b530-a15afb48eaed.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260308014352'
-- where version = '20260308014349'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260308014352');

-- high: remote 20260310194106 -> local 20260310194109 (3s) 20260310194109_1d752d69-51ed-4cf5-aeee-25aa645186da.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260310194109'
-- where version = '20260310194106'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260310194109');

-- high: remote 20260312153905 -> local 20260312153908 (3s) 20260312153908_64f6cd7e-6497-481d-b74a-3cbe36705b7f.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260312153908'
-- where version = '20260312153905'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260312153908');

-- high: remote 20260313183012 -> local 20260313183015 (3s) 20260313183015_39b9bb85-40db-4389-b24f-8d6fa4a74455.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260313183015'
-- where version = '20260313183012'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260313183015');

-- high: remote 20260314151443 -> local 20260314151446 (3s) 20260314151446_ee0a7b55-d306-484c-a6b5-8ac8689a5dbf.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260314151446'
-- where version = '20260314151443'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260314151446');

-- high: remote 20260314203218 -> local 20260314203221 (3s) 20260314203221_f300e81d-8fd0-4b2f-9a5f-9497f89587d3.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260314203221'
-- where version = '20260314203218'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260314203221');

-- high: remote 20260320031831 -> local 20260320031834 (3s) 20260320031834_5f881417-7552-4d80-b161-b2d31f324759.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260320031834'
-- where version = '20260320031831'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260320031834');

-- high: remote 20260320051349 -> local 20260320051352 (3s) 20260320051352_e06338a4-4fc3-4231-99fe-ecd23ac2312c.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260320051352'
-- where version = '20260320051349'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260320051352');

-- high: remote 20260320165234 -> local 20260320165237 (3s) 20260320165237_8efad9ff-ae0d-4d29-9731-d1d1a159eb25.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260320165237'
-- where version = '20260320165234'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260320165237');

-- high: remote 20260320215416 -> local 20260320215419 (3s) 20260320215419_68a901dd-e4da-47e9-8cf3-fc49a315ced4.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260320215419'
-- where version = '20260320215416'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260320215419');

-- high: remote 20260320221333 -> local 20260320221336 (3s) 20260320221336_fb7850e9-aab4-4e95-a832-16d0df747e68.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260320221336'
-- where version = '20260320221333'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260320221336');

-- high: remote 20260320222621 -> local 20260320222624 (3s) 20260320222624_f92876c1-93b4-4ff4-bb90-60d1bea76bfd.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260320222624'
-- where version = '20260320222621'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260320222624');

-- high: remote 20260321183749 -> local 20260321183752 (3s) 20260321183752_7b21c9c0-5e59-4ce2-a40c-4fd7b18178a0.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260321183752'
-- where version = '20260321183749'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260321183752');

-- high: remote 20260321194553 -> local 20260321194556 (3s) 20260321194556_142e60fa-5d61-4e9c-9b35-2723dc496e76.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260321194556'
-- where version = '20260321194553'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260321194556');

-- high: remote 20260321205053 -> local 20260321205056 (3s) 20260321205056_4161e63b-4773-48f6-aa8e-8e2264231492.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260321205056'
-- where version = '20260321205053'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260321205056');

-- high: remote 20260321224833 -> local 20260321224836 (3s) 20260321224836_0f03d597-9589-417e-ac08-ee4e5cd4e1df.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260321224836'
-- where version = '20260321224833'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260321224836');

-- high: remote 20260322003737 -> local 20260322003740 (3s) 20260322003740_17b1dd36-9275-4cfc-90d2-5bafdaaea0ea.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260322003740'
-- where version = '20260322003737'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260322003740');

-- high: remote 20260322153338 -> local 20260322153341 (3s) 20260322153341_464ba28f-0e13-493a-b9d8-67f18b0062a3.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260322153341'
-- where version = '20260322153338'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260322153341');

-- high: remote 20260323163558 -> local 20260323163601 (3s) 20260323163601_af922c52-9c8a-463a-b6cb-fb016fe1d8cd.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260323163601'
-- where version = '20260323163558'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260323163601');

-- high: remote 20260324204310 -> local 20260324204313 (3s) 20260324204313_66db5e03-735a-49a1-a049-97eb967dfa3e.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260324204313'
-- where version = '20260324204310'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260324204313');

-- high: remote 20260325162100 -> local 20260325162103 (3s) 20260325162103_4789f43e-e3e6-4e76-a349-a53b29d50d36.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260325162103'
-- where version = '20260325162100'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260325162103');

-- high: remote 20260325163605 -> local 20260325163608 (3s) 20260325163608_cec1a591-261f-49a6-ade2-a80fed24c0fd.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260325163608'
-- where version = '20260325163605'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260325163608');

-- high: remote 20260325164104 -> local 20260325164107 (3s) 20260325164107_e28fc81f-7406-450e-b49f-1b99ce3797c6.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260325164107'
-- where version = '20260325164104'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260325164107');

-- high: remote 20260325223324 -> local 20260325223327 (3s) 20260325223327_cade0c7c-23a4-4512-8682-36bda4b5ff75.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260325223327'
-- where version = '20260325223324'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260325223327');

-- high: remote 20260325232651 -> local 20260325232654 (3s) 20260325232654_187a450d-1aa3-4367-a94e-0ef59011ea8a.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260325232654'
-- where version = '20260325232651'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260325232654');

-- high: remote 20260326000017 -> local 20260326000020 (3s) 20260326000020_f0dadfa7-5b0c-4830-8b9c-05df8062fc8d.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260326000020'
-- where version = '20260326000017'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260326000020');

-- high: remote 20260326015957 -> local 20260326020000 (3s) 20260326020000_db6e46aa-d4e5-4dfe-afd3-698ae9088ff5.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260326020000'
-- where version = '20260326015957'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260326020000');

-- high: remote 20260326192411 -> local 20260326192414 (3s) 20260326192414_17c6c9bf-1248-4ce6-8877-d8c9ac8a0e6e.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260326192414'
-- where version = '20260326192411'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260326192414');

-- high: remote 20260326194328 -> local 20260326194331 (3s) 20260326194331_79254246-7d43-4863-af3c-e5dd9b6b05a9.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260326194331'
-- where version = '20260326194328'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260326194331');

-- high: remote 20260326194527 -> local 20260326194530 (3s) 20260326194530_e5f40e62-c71c-4311-aa0f-0a638b9c792f.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260326194530'
-- where version = '20260326194527'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260326194530');

-- high: remote 20260326195111 -> local 20260326195114 (3s) 20260326195114_cd24c855-0513-406c-9906-a07b90fdfd94.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260326195114'
-- where version = '20260326195111'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260326195114');

-- high: remote 20260327042548 -> local 20260327042551 (3s) 20260327042551_d1cfc71c-d13f-4b6a-be7b-0fc6db2cbae2.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260327042551'
-- where version = '20260327042548'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260327042551');

-- high: remote 20260327042911 -> local 20260327042914 (3s) 20260327042914_f6d38a45-d096-4707-85d1-76957cfe67a0.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260327042914'
-- where version = '20260327042911'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260327042914');

-- high: remote 20260327141405 -> local 20260327141408 (3s) 20260327141408_b7fddd44-9b02-4607-95d5-a724248ab7f3.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260327141408'
-- where version = '20260327141405'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260327141408');

-- high: remote 20260327183931 -> local 20260327183934 (3s) 20260327183934_c9da7643-3b74-4923-92b4-797b73938c75.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260327183934'
-- where version = '20260327183931'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260327183934');

-- high: remote 20260327213726 -> local 20260327213729 (3s) 20260327213729_a20751cd-ed47-436a-9a58-e67b4a128129.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260327213729'
-- where version = '20260327213726'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260327213729');

-- high: remote 20260327213803 -> local 20260327213806 (3s) 20260327213806_332df5e0-c9ec-47d8-85e8-d88232745bc2.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260327213806'
-- where version = '20260327213803'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260327213806');

-- high: remote 20260327223200 -> local 20260327223203 (3s) 20260327223203_d197b1ae-e8b2-457c-a41c-b6dc643bab2d.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260327223203'
-- where version = '20260327223200'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260327223203');

-- high: remote 20260328000610 -> local 20260328000613 (3s) 20260328000613_a05f314b-b735-46f0-9100-7d55bf600bf5.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260328000613'
-- where version = '20260328000610'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260328000613');

-- high: remote 20260328010542 -> local 20260328010545 (3s) 20260328010545_b364b847-2d46-422c-aed1-687e2c97c3b6.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260328010545'
-- where version = '20260328010542'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260328010545');

-- high: remote 20260328011448 -> local 20260328011451 (3s) 20260328011451_0ebe8b0e-e2ca-4c09-bf33-45a39198c930.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260328011451'
-- where version = '20260328011448'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260328011451');

-- high: remote 20260329020946 -> local 20260329020949 (3s) 20260329020949_0f26e31a-31dc-4a90-8d6f-7e64f9e7c4b7.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260329020949'
-- where version = '20260329020946'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260329020949');

-- high: remote 20260329171039 -> local 20260329171042 (3s) 20260329171042_0bc53da9-7346-4f91-b53d-4543715c722e.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260329171042'
-- where version = '20260329171039'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260329171042');

-- high: remote 20260330155155 -> local 20260330155158 (3s) 20260330155158_6c027947-9436-48f9-a223-081590f34bfc.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260330155158'
-- where version = '20260330155155'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260330155158');

-- high: remote 20260330160240 -> local 20260330160243 (3s) 20260330160243_5a167c8a-ea64-4aff-b432-f0bb695d5826.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260330160243'
-- where version = '20260330160240'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260330160243');

-- high: remote 20260330161250 -> local 20260330161253 (3s) 20260330161253_36fe113f-81f1-4ee8-b7bf-59ade26513de.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260330161253'
-- where version = '20260330161250'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260330161253');

-- high: remote 20260331000240 -> local 20260331000243 (3s) 20260331000243_bf3bfc3c-f9a3-4d55-bf78-e7cbe11d00d9.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260331000243'
-- where version = '20260331000240'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260331000243');

-- high: remote 20260331023748 -> local 20260331023751 (3s) 20260331023751_eb5c2006-7837-4f97-a166-1ea29895a522.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260331023751'
-- where version = '20260331023748'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260331023751');

-- high: remote 20260331031318 -> local 20260331031321 (3s) 20260331031321_e44aa4c6-cba3-4eef-9734-934497d3b399.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260331031321'
-- where version = '20260331031318'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260331031321');

-- high: remote 20260401001255 -> local 20260401001258 (3s) 20260401001258_4698ed79-cbf5-49c4-a9a3-cf7099827173.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260401001258'
-- where version = '20260401001255'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260401001258');

-- high: remote 20260401012653 -> local 20260401012656 (3s) 20260401012656_bad3d4d6-a93a-42ba-8172-f1f777f16b33.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260401012656'
-- where version = '20260401012653'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260401012656');

-- high: remote 20260401013737 -> local 20260401013740 (3s) 20260401013740_b502d2bd-6ab4-43a7-b436-a7483155d63f.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260401013740'
-- where version = '20260401013737'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260401013740');

-- high: remote 20260401014103 -> local 20260401014106 (3s) 20260401014106_92b98810-80cc-4d1f-8296-ab3241539f81.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260401014106'
-- where version = '20260401014103'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260401014106');

-- high: remote 20260401015034 -> local 20260401015037 (3s) 20260401015037_d9d0d69f-0b52-417b-a172-11e20760ed6a.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260401015037'
-- where version = '20260401015034'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260401015037');

-- high: remote 20260401155345 -> local 20260401155348 (3s) 20260401155348_2e8b6cd3-742c-4289-aa83-a29c2671e84a.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260401155348'
-- where version = '20260401155345'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260401155348');

-- high: remote 20260401161420 -> local 20260401161423 (3s) 20260401161423_8a0e19a6-197e-478d-bf18-35289f902fa5.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260401161423'
-- where version = '20260401161420'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260401161423');

-- high: remote 20260402024343 -> local 20260402024346 (3s) 20260402024346_a4e21110-fd88-4764-ac57-2487fbc9a7ec.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260402024346'
-- where version = '20260402024343'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260402024346');

-- high: remote 20260402145720 -> local 20260402145723 (3s) 20260402145723_d50ef9a6-b59b-48b1-9e61-32cc73467dc0.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260402145723'
-- where version = '20260402145720'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260402145723');

-- high: remote 20260402163106 -> local 20260402163109 (3s) 20260402163109_c794112e-e9e2-4126-869a-1e31470b7bbd.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260402163109'
-- where version = '20260402163106'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260402163109');

-- high: remote 20260402165643 -> local 20260402165646 (3s) 20260402165646_a5b1440c-b97d-427c-ae28-6704141f6551.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260402165646'
-- where version = '20260402165643'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260402165646');

-- high: remote 20260402170612 -> local 20260402170615 (3s) 20260402170615_8ba09ecd-5c16-43ff-959a-e8feb2ad9443.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260402170615'
-- where version = '20260402170612'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260402170615');

-- high: remote 20260402171540 -> local 20260402171543 (3s) 20260402171543_11cbe4a8-6e30-4992-91bc-228d3531df79.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260402171543'
-- where version = '20260402171540'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260402171543');

-- high: remote 20260402173908 -> local 20260402173911 (3s) 20260402173911_24938198-1126-408b-ad8b-433747c47605.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260402173911'
-- where version = '20260402173908'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260402173911');

-- high: remote 20260402200816 -> local 20260402200819 (3s) 20260402200819_0ab0d047-6377-475b-aef8-1e2972701f9c.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260402200819'
-- where version = '20260402200816'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260402200819');

-- high: remote 20260402203644 -> local 20260402203647 (3s) 20260402203647_2e8c4bc6-6b77-461d-acb2-3e8be31f696d.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260402203647'
-- where version = '20260402203644'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260402203647');

-- high: remote 20260402204327 -> local 20260402204330 (3s) 20260402204330_4c9b3edc-66dd-4d92-b123-f8c82b830595.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260402204330'
-- where version = '20260402204327'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260402204330');

-- high: remote 20260402205213 -> local 20260402205216 (3s) 20260402205216_fd24d35b-d9ac-4a3e-85f0-5632e3d9106b.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260402205216'
-- where version = '20260402205213'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260402205216');

-- high: remote 20260403004039 -> local 20260403004042 (3s) 20260403004042_6c0a0bfa-c5b3-471c-a3b8-700561c1a7d3.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260403004042'
-- where version = '20260403004039'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260403004042');

-- high: remote 20260403014027 -> local 20260403014030 (3s) 20260403014030_3a52dd89-fbf2-4cb5-9982-de60c5686f4f.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260403014030'
-- where version = '20260403014027'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260403014030');

-- high: remote 20260403023238 -> local 20260403023241 (3s) 20260403023241_630fd741-21c1-40f4-bad6-248f73e3425a.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260403023241'
-- where version = '20260403023238'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260403023241');

-- high: remote 20260403032152 -> local 20260403032155 (3s) 20260403032155_9b96a76d-d557-4f58-8ada-67d3477d88ce.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260403032155'
-- where version = '20260403032152'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260403032155');

-- high: remote 20260403032743 -> local 20260403032746 (3s) 20260403032746_bb13026a-9481-43de-b55f-9e41f66a218f.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260403032746'
-- where version = '20260403032743'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260403032746');

-- high: remote 20260403043543 -> local 20260403043546 (3s) 20260403043546_a2d4501d-f947-4d52-879b-eb58621fdf2a.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260403043546'
-- where version = '20260403043543'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260403043546');

-- high: remote 20260403142849 -> local 20260403142852 (3s) 20260403142852_7a9573e7-bb0e-4781-9fc7-8730cecefc6b.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260403142852'
-- where version = '20260403142849'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260403142852');

-- high: remote 20260403143025 -> local 20260403143028 (3s) 20260403143028_1128f369-998d-4837-acf7-0bd5a3ef2ba0.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260403143028'
-- where version = '20260403143025'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260403143028');

-- high: remote 20260403154126 -> local 20260403154129 (3s) 20260403154129_8067b4a9-0cf5-4222-b669-08138cebe386.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260403154129'
-- where version = '20260403154126'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260403154129');

-- high: remote 20260403181919 -> local 20260403181922 (3s) 20260403181922_dcd0f4bc-ca16-4dda-80f1-f4f875da567e.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260403181922'
-- where version = '20260403181919'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260403181922');

-- high: remote 20260403182350 -> local 20260403182353 (3s) 20260403182353_44e78de3-7617-4b2c-86d3-0f059d3bbe1e.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260403182353'
-- where version = '20260403182350'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260403182353');

-- high: remote 20260403183323 -> local 20260403183326 (3s) 20260403183326_fdd474d3-31f0-4657-8ccd-9bbd9b2fd74d.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260403183326'
-- where version = '20260403183323'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260403183326');

-- high: remote 20260403234413 -> local 20260403234416 (3s) 20260403234416_5f085108-716b-4fb4-a723-c7b961032910.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260403234416'
-- where version = '20260403234413'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260403234416');

-- high: remote 20260404032244 -> local 20260404032247 (3s) 20260404032247_3b88d1eb-1767-4b64-9570-27d3d045c7e0.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260404032247'
-- where version = '20260404032244'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260404032247');

-- high: remote 20260404211723 -> local 20260404211726 (3s) 20260404211726_ed5eb1ef-8cad-49f3-b62f-e8232fc8cd46.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260404211726'
-- where version = '20260404211723'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260404211726');

-- high: remote 20260404231525 -> local 20260404231528 (3s) 20260404231528_4aae40a5-6228-4f6b-b334-430bc3ddda58.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260404231528'
-- where version = '20260404231525'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260404231528');

-- high: remote 20260405001021 -> local 20260405001024 (3s) 20260405001024_c4231ee4-dbd4-4f29-8788-4e4b538cc8c5.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260405001024'
-- where version = '20260405001021'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260405001024');

-- high: remote 20260405030537 -> local 20260405030540 (3s) 20260405030540_8a037a3c-69d9-42ba-8e14-92b3895676f6.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260405030540'
-- where version = '20260405030537'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260405030540');

-- high: remote 20260405033433 -> local 20260405033436 (3s) 20260405033436_fd16d5de-73ab-4cde-9913-d8f79956b81e.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260405033436'
-- where version = '20260405033433'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260405033436');

-- high: remote 20260406015721 -> local 20260406015724 (3s) 20260406015724_e77a92b5-287a-420a-b3aa-f76e73490998.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260406015724'
-- where version = '20260406015721'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260406015724');

-- high: remote 20260406061257 -> local 20260406061300 (3s) 20260406061300_42af212f-257b-4941-8a11-53fa5a4fe9fa.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260406061300'
-- where version = '20260406061257'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260406061300');

-- high: remote 20260406180632 -> local 20260406180635 (3s) 20260406180635_bfb89629-4d9d-4b5d-8b74-73da2bf0a7a3.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260406180635'
-- where version = '20260406180632'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260406180635');

-- high: remote 20260407013630 -> local 20260407013633 (3s) 20260407013633_6b7bb674-2368-4282-86d3-32bd4d40239c.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260407013633'
-- where version = '20260407013630'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260407013633');

-- high: remote 20260407025950 -> local 20260407025953 (3s) 20260407025953_6f916acd-4728-466e-adf5-8aeee9971bdd.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260407025953'
-- where version = '20260407025950'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260407025953');

-- high: remote 20260407031400 -> local 20260407031403 (3s) 20260407031403_441b5273-e24c-40e1-b173-84411e021a99.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260407031403'
-- where version = '20260407031400'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260407031403');

-- high: remote 20260407031430 -> local 20260407031433 (3s) 20260407031433_92922a37-1875-45dd-9599-ffb2e324d389.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260407031433'
-- where version = '20260407031430'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260407031433');

-- high: remote 20260407032332 -> local 20260407032335 (3s) 20260407032335_79c0296d-d68d-4bd3-916c-4b05bd20917b.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260407032335'
-- where version = '20260407032332'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260407032335');

-- high: remote 20260407033851 -> local 20260407033854 (3s) 20260407033854_c5ae8fec-5b92-4aec-a640-9a617d3932b6.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260407033854'
-- where version = '20260407033851'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260407033854');

-- high: remote 20260407040551 -> local 20260407040554 (3s) 20260407040554_847c187e-41de-4eb6-9d70-3435a0413e01.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260407040554'
-- where version = '20260407040551'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260407040554');

-- high: remote 20260407160556 -> local 20260407160559 (3s) 20260407160559_c9e68cc0-8a2d-4ef4-9aa6-08532146be2b.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260407160559'
-- where version = '20260407160556'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260407160559');

-- high: remote 20260408125545 -> local 20260408125548 (3s) 20260408125548_f9167eb7-9c05-4b47-b88a-45870dff9bee.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260408125548'
-- where version = '20260408125545'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260408125548');

-- high: remote 20260409043101 -> local 20260409043104 (3s) 20260409043104_17790118-7ba0-431d-b70b-b6a8a6172d46.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260409043104'
-- where version = '20260409043101'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260409043104');

-- high: remote 20260409172227 -> local 20260409172230 (3s) 20260409172230_65f6fc88-1bb4-4dfb-a682-7795330af854.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260409172230'
-- where version = '20260409172227'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260409172230');

-- high: remote 20260410001159 -> local 20260410001202 (3s) 20260410001202_1ebd52bb-434e-4d46-9351-ab6bd604a38f.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260410001202'
-- where version = '20260410001159'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260410001202');

-- high: remote 20260411171720 -> local 20260411171723 (3s) 20260411171723_9827c346-3c5e-456b-99a7-1e40c4715036.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260411171723'
-- where version = '20260411171720'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260411171723');

-- high: remote 20260411213759 -> local 20260411213802 (3s) 20260411213802_0402a547-6c4a-428a-8d0e-1d0ef5ba5287.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260411213802'
-- where version = '20260411213759'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260411213802');

-- high: remote 20260417233207 -> local 20260417233210 (3s) 20260417233210_46165a45-cc9b-49c2-8cd8-8c37b658011f.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260417233210'
-- where version = '20260417233207'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260417233210');

-- high: remote 20260421154458 -> local 20260421154501 (3s) 20260421154501_5b702aa6-a6d5-45a9-b360-eb24a5d4bc53.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260421154501'
-- where version = '20260421154458'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260421154501');

-- high: remote 20260421181929 -> local 20260421181932 (3s) 20260421181932_cc0ec16f-a54a-4beb-bbbc-ba71febc7053.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260421181932'
-- where version = '20260421181929'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260421181932');

-- high: remote 20260422022727 -> local 20260422022730 (3s) 20260422022730_4926ec7f-f056-4100-81e2-c49477e8f7f9.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260422022730'
-- where version = '20260422022727'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260422022730');

-- high: remote 20260426140217 -> local 20260426140220 (3s) 20260426140220_f3cfe442-151e-43ca-9359-4aadf7f9e1f3.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260426140220'
-- where version = '20260426140217'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260426140220');

-- high: remote 20260426143433 -> local 20260426143436 (3s) 20260426143436_0d3911fe-735b-426e-a357-e36b0590f527.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260426143436'
-- where version = '20260426143433'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260426143436');

-- high: remote 20260426151808 -> local 20260426151811 (3s) 20260426151811_b5334465-47f7-43e9-9579-dff12be5d4be.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260426151811'
-- where version = '20260426151808'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260426151811');

-- high: remote 20260426162730 -> local 20260426162733 (3s) 20260426162733_c3d6c3a6-712d-49ef-b8a9-c9cdca9f78a1.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260426162733'
-- where version = '20260426162730'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260426162733');

-- high: remote 20260426194200 -> local 20260426194203 (3s) 20260426194203_e085884c-f7c2-49df-98cb-20cd35a4a535.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260426194203'
-- where version = '20260426194200'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260426194203');

-- high: remote 20260426232504 -> local 20260426232507 (3s) 20260426232507_5e366b1f-644c-42eb-8a74-64341cc46d38.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260426232507'
-- where version = '20260426232504'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260426232507');

-- high: remote 20260427174320 -> local 20260427174323 (3s) 20260427174323_75f15610-a15a-41d1-9812-7afd669568fb.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260427174323'
-- where version = '20260427174320'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260427174323');

-- high: remote 20260427175857 -> local 20260427175900 (3s) 20260427175900_48e45595-bc33-47e0-89ba-c7c0dbec2451.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260427175900'
-- where version = '20260427175857'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260427175900');

-- high: remote 20260428151401 -> local 20260428151404 (3s) 20260428151404_a103b981-5ea7-4a9c-960c-857a199086e0.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260428151404'
-- where version = '20260428151401'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260428151404');

-- high: remote 20260429165138 -> local 20260429165141 (3s) 20260429165141_0152086d-68bf-4ef8-bf16-f7381ccbe3d8.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260429165141'
-- where version = '20260429165138'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260429165141');

-- high: remote 20260503161832 -> local 20260503161835 (3s) 20260503161835_6155f35e-3098-4f7e-bbe0-7b2045df6be7.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260503161835'
-- where version = '20260503161832'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260503161835');

-- high: remote 20260504204814 -> local 20260504204817 (3s) 20260504204817_f956ca1a-3304-4c81-8892-3b7ca1ee3a92.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260504204817'
-- where version = '20260504204814'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260504204817');

-- high: remote 20260504204953 -> local 20260504204956 (3s) 20260504204956_978b603d-266c-4565-a5f7-f4ea8b5f0b84.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260504204956'
-- where version = '20260504204953'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260504204956');

-- high: remote 20260518212632 -> local 20260518212635 (3s) 20260518212635_68d6af92-12cc-461e-9de3-29abe4078d1c.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260518212635'
-- where version = '20260518212632'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260518212635');

-- high: remote 20260518213655 -> local 20260518213658 (3s) 20260518213658_0ec29768-2f64-4a2e-b191-1b0db6d4b9c7.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260518213658'
-- where version = '20260518213655'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260518213658');

-- high: remote 20260519205052 -> local 20260519205055 (3s) 20260519205055_1820de69-2763-479d-9d20-8fb639c9c4ee.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260519205055'
-- where version = '20260519205052'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260519205055');

-- high: remote 20260525155957 -> local 20260524400000 (3s) 20260524400000_salon_stripe_deposits.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260524400000'
-- where version = '20260525155957'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260524400000');

-- high: remote 20260214021800 -> local 20260214021804 (4s) 20260214021804_2ecd4658-c91c-40e6-8fee-611de8eb8362.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260214021804'
-- where version = '20260214021800'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260214021804');

-- high: remote 20260214212146 -> local 20260214212150 (4s) 20260214212150_f4a898eb-8964-4558-bc51-ee609e17db82.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260214212150'
-- where version = '20260214212146'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260214212150');

-- high: remote 20260226184038 -> local 20260226184042 (4s) 20260226184042_d47b91e2-c22b-402f-a492-b927e75c8abf.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260226184042'
-- where version = '20260226184038'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260226184042');

-- high: remote 20260327230210 -> local 20260327230214 (4s) 20260327230214_7be63394-a4c6-483f-a918-1c5abdaf6a3e.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260327230214'
-- where version = '20260327230210'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260327230214');

-- high: remote 20260329163542 -> local 20260329163546 (4s) 20260329163546_c33d57bd-f62d-4ab1-8a6d-159159ebb68c.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260329163546'
-- where version = '20260329163542'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260329163546');

-- high: remote 20260331022135 -> local 20260331022139 (4s) 20260331022139_0960ad68-2dae-4fab-ad0c-dc208eddbaf5.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260331022139'
-- where version = '20260331022135'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260331022139');

-- high: remote 20260331034304 -> local 20260331034308 (4s) 20260331034308_60e42478-e455-4d6b-9c07-1b40b593c887.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260331034308'
-- where version = '20260331034304'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260331034308');

-- high: remote 20260401012626 -> local 20260401012630 (4s) 20260401012630_7af50ea9-8387-4c47-aec2-1685031a0346.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260401012630'
-- where version = '20260401012626'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260401012630');

-- high: remote 20260401014549 -> local 20260401014553 (4s) 20260401014553_79387601-8da8-4d75-9940-c56bf1622c9c.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260401014553'
-- where version = '20260401014549'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260401014553');

-- high: remote 20260402153239 -> local 20260402153243 (4s) 20260402153243_fb04acb3-14b2-470e-9186-f94cfeb0733a.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260402153243'
-- where version = '20260402153239'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260402153243');

-- high: remote 20260402173720 -> local 20260402173724 (4s) 20260402173724_db26800e-c7a9-48e3-84f1-37a1733b1663.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260402173724'
-- where version = '20260402173720'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260402173724');

-- high: remote 20260402200737 -> local 20260402200741 (4s) 20260402200741_982a7061-4161-4029-acba-9d367b380162.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260402200741'
-- where version = '20260402200737'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260402200741');

-- high: remote 20260402210357 -> local 20260402210401 (4s) 20260402210401_b4d9ca67-e6ec-4446-b105-0be4fa5d22c0.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260402210401'
-- where version = '20260402210357'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260402210401');

-- high: remote 20260403042441 -> local 20260403042445 (4s) 20260403042445_f18ec5ff-e40e-4aec-8876-4bf23f414a87.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260403042445'
-- where version = '20260403042441'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260403042445');

-- high: remote 20260403141645 -> local 20260403141649 (4s) 20260403141649_0f3d28ca-54fe-450f-863a-f0e471f03d15.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260403141649'
-- where version = '20260403141645'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260403141649');

-- high: remote 20260403141941 -> local 20260403141945 (4s) 20260403141945_8faf7c24-2123-411b-b581-9533de928825.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260403141945'
-- where version = '20260403141941'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260403141945');

-- high: remote 20260403142225 -> local 20260403142229 (4s) 20260403142229_38385a88-1211-41b2-9e99-11ed291c8859.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260403142229'
-- where version = '20260403142225'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260403142229');

-- high: remote 20260403142643 -> local 20260403142647 (4s) 20260403142647_c6037f54-60d7-4ab8-ba14-a542b5ee0233.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260403142647'
-- where version = '20260403142643'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260403142647');

-- high: remote 20260403225020 -> local 20260403225024 (4s) 20260403225024_c858dd77-420d-4df4-9588-f6f938e319d9.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260403225024'
-- where version = '20260403225020'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260403225024');

-- high: remote 20260403233813 -> local 20260403233817 (4s) 20260403233817_bc9d2a36-4d3d-4a6b-b3ef-a021e57ce6a8.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260403233817'
-- where version = '20260403233813'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260403233817');

-- high: remote 20260404032313 -> local 20260404032317 (4s) 20260404032317_1b1b4027-b30f-410a-ae29-6281279de9d4.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260404032317'
-- where version = '20260404032313'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260404032317');

-- high: remote 20260405020527 -> local 20260405020531 (4s) 20260405020531_0b46a8a1-8f16-47ed-bb97-6cf9047b4ab2.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260405020531'
-- where version = '20260405020527'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260405020531');

-- high: remote 20260407025345 -> local 20260407025349 (4s) 20260407025349_dda11da9-9743-434a-b6bb-9cd6b4d3f339.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260407025349'
-- where version = '20260407025345'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260407025349');

-- high: remote 20260408020624 -> local 20260408020628 (4s) 20260408020628_0fef232d-914e-404a-a70c-7faf5dae0e54.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260408020628'
-- where version = '20260408020624'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260408020628');

-- high: remote 20260408035550 -> local 20260408035554 (4s) 20260408035554_4aef1551-8ec0-42f1-96be-6cf36bfdc6ef.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260408035554'
-- where version = '20260408035550'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260408035554');

-- high: remote 20260408042250 -> local 20260408042254 (4s) 20260408042254_b062d12b-a40c-4d08-8d09-a219fcc72966.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260408042254'
-- where version = '20260408042250'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260408042254');

-- high: remote 20260408205542 -> local 20260408205546 (4s) 20260408205546_48a59ef3-3ccb-4275-bbeb-602b7561abb8.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260408205546'
-- where version = '20260408205542'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260408205546');

-- high: remote 20260409165851 -> local 20260409165855 (4s) 20260409165855_0c8c6e40-d2f3-410a-8524-be5f3058c525.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260409165855'
-- where version = '20260409165851'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260409165855');

-- high: remote 20260409171817 -> local 20260409171821 (4s) 20260409171821_bc226004-610e-4a2d-9ca7-c7f34763f8bf.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260409171821'
-- where version = '20260409171817'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260409171821');

-- high: remote 20260409172856 -> local 20260409172900 (4s) 20260409172900_b7b19f66-fba2-4a61-9f24-0f00ef38da93.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260409172900'
-- where version = '20260409172856'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260409172900');

-- high: remote 20260410235553 -> local 20260410235557 (4s) 20260410235557_2effa323-241d-4fea-b0cc-7697553867ad.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260410235557'
-- where version = '20260410235553'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260410235557');

-- high: remote 20260411000022 -> local 20260411000026 (4s) 20260411000026_824527d0-7a79-4eb7-9546-6352ef52aef9.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260411000026'
-- where version = '20260411000022'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260411000026');

-- high: remote 20260411171427 -> local 20260411171431 (4s) 20260411171431_aaa38013-ea70-461e-acb1-db94e7d4c43d.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260411171431'
-- where version = '20260411171427'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260411171431');

-- high: remote 20260426162617 -> local 20260426162621 (4s) 20260426162621_e5070646-1482-4148-8410-d18a25524505.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260426162621'
-- where version = '20260426162617'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260426162621');

-- high: remote 20260428202334 -> local 20260428202338 (4s) 20260428202338_42daeb3a-7efb-4a23-b4a5-4d44f2419ebe.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260428202338'
-- where version = '20260428202334'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260428202338');

-- high: remote 20260518211807 -> local 20260518211811 (4s) 20260518211811_49b7bf33-0df5-4958-b069-56909236fb7f.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260518211811'
-- where version = '20260518211807'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260518211811');

-- high: remote 20260518213327 -> local 20260518213331 (4s) 20260518213331_cd2fdeab-c575-424c-9f68-17ae21690f0f.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260518213331'
-- where version = '20260518213327'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260518213331');

-- high: remote 20260324204851 -> local 20260324204856 (5s) 20260324204856_5951bf5a-c807-4b50-9f33-8ac4299557b2.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260324204856'
-- where version = '20260324204851'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260324204856');

-- high: remote 20260325221306 -> local 20260325221311 (5s) 20260325221311_e782f91b-92f5-4508-a505-4773264b750e.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260325221311'
-- where version = '20260325221306'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260325221311');

-- high: remote 20260325230711 -> local 20260325230716 (5s) 20260325230716_882171ba-4305-418e-a6a2-8d100405b6a6.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260325230716'
-- where version = '20260325230711'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260325230716');

-- high: remote 20260330162908 -> local 20260330162913 (5s) 20260330162913_6a0a1ab0-c13e-45bc-b2d3-31b848e4179e.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260330162913'
-- where version = '20260330162908'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260330162913');

-- high: remote 20260401013337 -> local 20260401013342 (5s) 20260401013342_1e1f395a-4397-4851-8ca5-e680edb68bd3.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260401013342'
-- where version = '20260401013337'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260401013342');

-- high: remote 20260401155910 -> local 20260401155915 (5s) 20260401155915_c1a047e5-1771-4715-a347-c80a65b80e36.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260401155915'
-- where version = '20260401155910'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260401155915');

-- high: remote 20260408020507 -> local 20260408020512 (5s) 20260408020512_e2ebf67c-18ef-49c7-a06d-96e6b36791a9.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260408020512'
-- where version = '20260408020507'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260408020512');

-- high: remote 20260409031659 -> local 20260409031704 (5s) 20260409031704_77da3445-c50c-47c6-935e-e7b54f52fa60.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260409031704'
-- where version = '20260409031659'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260409031704');

-- high: remote 20260409043329 -> local 20260409043334 (5s) 20260409043334_7f583500-bc39-40fa-95f4-6a24db436104.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260409043334'
-- where version = '20260409043329'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260409043334');

-- high: remote 20260409235038 -> local 20260409235043 (5s) 20260409235043_de4783bd-f2ab-4111-8ea7-31fb5b65b2fc.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260409235043'
-- where version = '20260409235038'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260409235043');

-- high: remote 20260410010750 -> local 20260410010755 (5s) 20260410010755_35ddd526-027f-4087-9002-466fc2f1cd01.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260410010755'
-- where version = '20260410010750'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260410010755');

-- high: remote 20260427150834 -> local 20260427150839 (5s) 20260427150839_56314fe0-3206-420a-9156-af0ff6a7d9ff.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260427150839'
-- where version = '20260427150834'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260427150839');

-- high: remote 20260527152005 -> local 20260527152000 (5s) 20260527152000_ar_estimates_tax_rate_and_expire_cron.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260527152000'
-- where version = '20260527152005'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260527152000');

-- medium: remote 20260210171225 -> local 20260210171231 (6s) 20260210171231_e86d3907-d0cd-49a0-bada-35a8be508257.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260210171231'
-- where version = '20260210171225'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260210171231');

-- medium: remote 20260310210950 -> local 20260310210956 (6s) 20260310210956_395c431c-5574-4fe4-88a0-0d15879ca64e.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260310210956'
-- where version = '20260310210950'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260310210956');

-- medium: remote 20260403133215 -> local 20260403133221 (6s) 20260403133221_040e3d33-637a-4506-99b3-b2a638884ff2.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260403133221'
-- where version = '20260403133215'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260403133221');

-- medium: remote 20260403142509 -> local 20260403142515 (6s) 20260403142515_592870b6-4000-437a-99a2-84be5908b94d.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260403142515'
-- where version = '20260403142509'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260403142515');

-- medium: remote 20260422145242 -> local 20260422145248 (6s) 20260422145248_5cd53f95-6824-4c20-85e5-34fd51d1ced3.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260422145248'
-- where version = '20260422145242'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260422145248');

-- medium: remote 20260525190006 -> local 20260525190000 (6s) 20260525190000_cafe_loyalty.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260525190000'
-- where version = '20260525190006'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260525190000');

-- medium: remote 20260208212201 -> local 20260208212208 (7s) 20260208212208_303b33d8-f70d-46e2-94fc-53ff79bd3d5e.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260208212208'
-- where version = '20260208212201'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260208212208');

-- medium: remote 20260326015158 -> local 20260326015205 (7s) 20260326015205_6688ad3b-d84a-4947-9d63-59d074c17bcb.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260326015205'
-- where version = '20260326015158'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260326015205');

-- medium: remote 20260408202148 -> local 20260408202155 (7s) 20260408202155_05b0a4b6-588c-406d-91a8-346b13a2b3af.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260408202155'
-- where version = '20260408202148'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260408202155');

-- medium: remote 20260421151451 -> local 20260421151459 (8s) 20260421151459_be296c4a-5e51-4f70-a990-369e669ba20c.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260421151459'
-- where version = '20260421151451'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260421151459');

-- medium: remote 20260527040009 -> local 20260525520001 (8s) 20260525520001_car_dealership_customer_interactions.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260525520001'
-- where version = '20260527040009'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260525520001');

-- medium: remote 20260527150010 -> local 20260527150000 (10s) 20260527150000_ar_estimates_discount_cents.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260527150000'
-- where version = '20260527150010'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260527150000');

-- medium: remote 20260201045022 -> local 20260201045033 (11s) 20260201045033_b7016c20-b1d2-43dc-ad6f-1b0c0d3746b2.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260201045033'
-- where version = '20260201045022'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260201045033');

-- medium: remote 20260527164555 -> local 20260527164544 (11s) 20260527164544_grant_call_recording_storage_helper.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260527164544'
-- where version = '20260527164555'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260527164544');

-- medium: remote 20260603120012 -> local 20260603120000 (12s) 20260603120000_ar_estimate_public_rpcs.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260603120000'
-- where version = '20260603120012'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260603120000');

-- medium: remote 20260527164519 -> local 20260527164505 (14s) 20260527164505_grant_secret_media_storage_helper.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260527164505'
-- where version = '20260527164519'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260527164505');

-- medium: remote 20260527140942 -> local 20260527141000 (18s) 20260527141000_ar_job_photos.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260527141000'
-- where version = '20260527140942'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260527141000');

-- medium: remote 20260527151021 -> local 20260527151000 (21s) 20260527151000_ar_invoices_estimates_backfill_subtotals.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260527151000'
-- where version = '20260527151021'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260527151000');

-- medium: remote 20260527165441 -> local 20260527165418 (23s) 20260527165418_fix_group_member_notify_profile_name.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260527165418'
-- where version = '20260527165441'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260527165418');

-- medium: remote 20260527171500 -> local 20260527171430 (30s) 20260527171430_add_group_unlock_api_wrapper.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260527171430'
-- where version = '20260527171500'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260527171430');

-- medium: remote 20260601164428 -> local 20260601164500 (32s) 20260601164500_car_dealership_reviews_server_gate.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260601164500'
-- where version = '20260601164428'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260601164500');

-- medium: remote 20260601192927 -> local 20260601193000 (33s) 20260601193000_car_rental_customers_server_gate.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260601193000'
-- where version = '20260601192927'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260601193000');

-- medium: remote 20260527170152 -> local 20260527170117 (35s) 20260527170117_add_chat_safety_preference_columns.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260527170117'
-- where version = '20260527170152'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260527170117');

-- medium: remote 20260524185923 -> local 20260524190000 (37s) 20260524190000_salon_public_stylist_and_review_rpcs.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260524190000'
-- where version = '20260524185923'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260524190000');

-- medium: remote 20260526145035 -> local 20260526145114 (39s) 20260526145114_feed_preferences.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260526145114'
-- where version = '20260526145035'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260526145114');

-- medium: remote 20260605030112 -> local 20260605030155 (43s) 20260605030155_lockdown_auto_repair_internal_function_grants.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260605030155'
-- where version = '20260605030112'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260605030155');

-- medium: remote 20260527162038 -> local 20260527161952 (46s) 20260527161952_use_jsonb_contains_for_locked_album_storage_policy.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260527161952'
-- where version = '20260527162038'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260527161952');

-- medium: remote 20260527162326 -> local 20260527162240 (46s) 20260527162240_use_text_path_checks_for_locked_album_storage_policy.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260527162240'
-- where version = '20260527162326'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260527162240');

-- medium: remote 20260527173008 -> local 20260527172922 (46s) 20260527172922_restore_paid_album_storage_reads.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260527172922'
-- where version = '20260527173008'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260527172922');

-- medium: remote 20260601201548 -> local 20260601201500 (48s) 20260601201500_car_rental_store_settings_server_gate.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260601201500'
-- where version = '20260601201548'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260601201500');

-- medium: remote 20260527145351 -> local 20260527145444 (53s) 20260527145444_group_paid_media_bundles.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260527145444'
-- where version = '20260527145351'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260527145444');

-- medium: remote 20260527142901 -> local 20260527143000 (59s) 20260527143000_store_promotions_reviews_messages.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260527143000'
-- where version = '20260527142901'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260527143000');

-- Verify after applying an approved subset:
-- select version from supabase_migrations.schema_migrations order by version;

rollback;
