-- Seed data for PetCuida

insert into public.treatment_templates (id, owner_id, title, kind, description, manufacturer, dosage, route, recommended_frequency_days)
values
    (gen_random_uuid(), null, 'Vacina V8', 'vaccine', 'Proteção contra doenças virais caninas', 'Diversos', 'Dose única anual', 'intramuscular', 365),
    (gen_random_uuid(), null, 'Vacina tríplice felina', 'vaccine', 'Protege gatos contra panleucopenia, calicivirose e rinotraqueíte', 'Diversos', 'Dose anual', 'subcutânea', 365),
    (gen_random_uuid(), null, 'Vermífugo para cães', 'deworming', 'Controle de parasitas internos', 'Diversos', 'Dose conforme peso a cada 3 meses', 'oral', 90),
    (gen_random_uuid(), null, 'Antipulgas e carrapatos', 'tick_flea', 'Controle de ectoparasitas', 'Diversos', 'Aplicação mensal conforme peso', 'tópico', 30),
    (gen_random_uuid(), null, 'Check-up veterinário', 'checkup', 'Consulta de rotina para avaliação geral', null, null, null, 365)
on conflict do nothing;

