-- Demo seed data for the analytics dashboard.
-- Idempotent: uses ON CONFLICT (id) DO NOTHING on fixed UUIDs.
-- Safe to run multiple times.

-- ── Drivers ───────────────────────────────────────────────────────────────────
INSERT INTO drivers (id, full_name, phone, truck_plate, is_available) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'John Dormer',   '+39 340 1234567', 'FI-123AB', true),
  ('a0000002-0000-0000-0000-000000000002', 'Marc Bernard',  '+39 340 7654321', 'MI-456CD', true),
  ('a0000003-0000-0000-0000-000000000003', 'Lisa Klein',    '+39 340 1112233', 'RM-789EF', true),
  ('a0000004-0000-0000-0000-000000000004', 'Thomas Reyes',  '+39 340 9988776', 'NA-321GH', true)
ON CONFLICT (id) DO NOTHING;

-- ── Delivered orders (March 2026, spread across the month) ───────────────────
INSERT INTO orders (id, created_at, updated_at, pickup_address, delivery_address, goods_desc, weight_tons, status, driver_id) VALUES
  -- Mar 1
  ('b0000001-0000-0000-0000-000000000001','2026-03-01 07:00:00+00','2026-03-01 14:30:00+00','Viale Europa Unita 12, Udine, Italy','Via Trieste 44, Venice, Italy','Steel coils',7.5,'delivered','a0000001-0000-0000-0000-000000000001'),
  -- Mar 3
  ('b0000002-0000-0000-0000-000000000002','2026-03-03 06:30:00+00','2026-03-03 11:00:00+00','Porto Industriale, Trieste, Italy','Via Roma 88, Padua, Italy','Paper rolls',5.2,'delivered','a0000002-0000-0000-0000-000000000002'),
  ('b0000003-0000-0000-0000-000000000003','2026-03-03 08:00:00+00','2026-03-03 16:45:00+00','Zona Industriale, Pordenone, Italy','Via IV Novembre 3, Treviso, Italy','Timber planks',6.0,'delivered','a0000001-0000-0000-0000-000000000001'),
  -- Mar 5
  ('b0000004-0000-0000-0000-000000000004','2026-03-05 07:15:00+00','2026-03-05 12:30:00+00','Via Palmanova 90, Udine, Italy','Via Emilia 55, Bologna, Italy','Ceramic tiles',4.8,'delivered','a0000003-0000-0000-0000-000000000003'),
  ('b0000005-0000-0000-0000-000000000005','2026-03-05 09:00:00+00','2026-03-05 17:00:00+00','Zona Portuale, Genoa, Italy','Via della Liberazione 12, Milan, Italy','Auto parts',3.2,'delivered','a0000001-0000-0000-0000-000000000001'),
  ('b0000006-0000-0000-0000-000000000006','2026-03-05 06:00:00+00','2026-03-05 10:30:00+00','Via Venezia 7, Mestre, Italy','Via Torino 22, Turin, Italy','Food (frozen)',2.5,'delivered','a0000002-0000-0000-0000-000000000002'),
  -- Mar 7
  ('b0000007-0000-0000-0000-000000000007','2026-03-07 08:00:00+00','2026-03-07 15:15:00+00','Interporto, Bologna, Italy','Via Nazionale 5, Florence, Italy','Machinery parts',7.0,'delivered','a0000001-0000-0000-0000-000000000001'),
  ('b0000008-0000-0000-0000-000000000008','2026-03-07 07:30:00+00','2026-03-07 13:00:00+00','Via Po 33, Turin, Italy','Corso Magenta 10, Milan, Italy','Fabrics',1.8,'delivered','a0000004-0000-0000-0000-000000000004'),
  -- Mar 10
  ('b0000009-0000-0000-0000-000000000009','2026-03-10 07:00:00+00','2026-03-10 14:00:00+00','Zona Industriale Nord, Verona, Italy','Via Marche 8, Ancona, Italy','Glass sheets',5.5,'delivered','a0000002-0000-0000-0000-000000000002'),
  ('b0000010-0000-0000-0000-000000000010','2026-03-10 09:30:00+00','2026-03-10 17:45:00+00','Via del Porto 14, Ravenna, Italy','Via Appia 66, Rome, Italy','Chemicals (bulk)',6.8,'delivered','a0000001-0000-0000-0000-000000000001'),
  -- Mar 12
  ('b0000011-0000-0000-0000-000000000011','2026-03-12 06:45:00+00','2026-03-12 11:30:00+00','Via Brennero 1, Trento, Italy','Via Emilia Ovest 200, Modena, Italy','Furniture components',3.0,'delivered','a0000003-0000-0000-0000-000000000003'),
  ('b0000012-0000-0000-0000-000000000012','2026-03-12 08:00:00+00','2026-03-12 14:30:00+00','Mercato Ortofrutticolo, Naples, Italy','Via Salaria 120, Rome, Italy','Fresh produce',4.5,'delivered','a0000001-0000-0000-0000-000000000001'),
  ('b0000013-0000-0000-0000-000000000013','2026-03-12 10:00:00+00','2026-03-12 18:00:00+00','Zona Franca, Trieste, Italy','Via Milano 55, Bergamo, Italy','Electronics (pallets)',2.2,'delivered','a0000002-0000-0000-0000-000000000002'),
  -- Mar 14
  ('b0000014-0000-0000-0000-000000000014','2026-03-14 07:00:00+00','2026-03-14 13:30:00+00','Via della Stazione 4, Brescia, Italy','Via Liberta 19, Palermo, Italy','Medical equipment',1.5,'delivered','a0000004-0000-0000-0000-000000000004'),
  ('b0000015-0000-0000-0000-000000000015','2026-03-14 08:30:00+00','2026-03-14 16:00:00+00','Interporto Sud Europa, Nola, Italy','Via Cristoforo Colombo 88, Rome, Italy','Steel pipes',7.5,'delivered','a0000001-0000-0000-0000-000000000001'),
  -- Mar 17
  ('b0000016-0000-0000-0000-000000000016','2026-03-17 06:00:00+00','2026-03-17 11:30:00+00','Via Padana Superiore 18, Bergamo, Italy','Via Aurelia 55, Livorno, Italy','Plastics (bulk)',5.0,'delivered','a0000002-0000-0000-0000-000000000002'),
  ('b0000017-0000-0000-0000-000000000017','2026-03-17 09:00:00+00','2026-03-17 17:30:00+00','Zona Industriale, Catania, Italy','Via Messina 200, Palermo, Italy','Agricultural equipment',6.5,'delivered','a0000001-0000-0000-0000-000000000001'),
  -- Mar 19
  ('b0000018-0000-0000-0000-000000000018','2026-03-19 07:30:00+00','2026-03-19 12:15:00+00','Via Manzoni 14, Lecco, Italy','Via Dante 9, Varese, Italy','Textiles',2.0,'delivered','a0000003-0000-0000-0000-000000000003'),
  ('b0000019-0000-0000-0000-000000000019','2026-03-19 08:00:00+00','2026-03-19 15:45:00+00','Via Emilia 400, Reggio Emilia, Italy','Via del Corso 77, Florence, Italy','Packaging materials',3.8,'delivered','a0000001-0000-0000-0000-000000000001'),
  ('b0000020-0000-0000-0000-000000000020','2026-03-19 06:30:00+00','2026-03-19 13:00:00+00','Zona Industriale Ovest, Vicenza, Italy','Via Plebiscito 5, Venice, Italy','Construction materials',7.0,'delivered','a0000002-0000-0000-0000-000000000002'),
  -- Mar 21
  ('b0000021-0000-0000-0000-000000000021','2026-03-21 07:00:00+00','2026-03-21 14:00:00+00','Interporto di Torino, Turin, Italy','Via Savona 12, Genoa, Italy','Car components',4.2,'delivered','a0000001-0000-0000-0000-000000000001'),
  ('b0000022-0000-0000-0000-000000000022','2026-03-21 09:30:00+00','2026-03-21 16:30:00+00','Via Roma 1, Ancona, Italy','Via Cavour 33, Pescara, Italy','Paper products',3.5,'delivered','a0000004-0000-0000-0000-000000000004'),
  -- Mar 24
  ('b0000023-0000-0000-0000-000000000023','2026-03-24 06:00:00+00','2026-03-24 12:00:00+00','Via Artigianato 6, Padua, Italy','Via Garibaldi 44, Mantua, Italy','Hydraulic components',5.8,'delivered','a0000002-0000-0000-0000-000000000002'),
  ('b0000024-0000-0000-0000-000000000024','2026-03-24 08:00:00+00','2026-03-24 17:00:00+00','Porto di Civitavecchia, Civitavecchia, Italy','Via Tiburtina 300, Rome, Italy','Machinery',7.5,'delivered','a0000001-0000-0000-0000-000000000001'),
  -- Mar 26
  ('b0000025-0000-0000-0000-000000000025','2026-03-26 06:30:00+00','2026-03-26 10:30:00+00','Via Aurelia 18, Rome, Italy','Via Napoli 88, Salerno, Italy','Food staples',4.0,'delivered','a0000001-0000-0000-0000-000000000001'),
  ('b0000026-0000-0000-0000-000000000026','2026-03-26 07:00:00+00','2026-03-26 11:45:00+00','Zona Industriale Est, Bologna, Italy','Via Emilia 11, Rimini, Italy','Clothing (pallets)',2.8,'delivered','a0000003-0000-0000-0000-000000000003'),
  ('b0000027-0000-0000-0000-000000000027','2026-03-26 08:15:00+00','2026-03-26 13:00:00+00','Via Marconi 55, Turin, Italy','Via Nizza 3, Bra, Italy','Electronic goods',1.5,'delivered','a0000002-0000-0000-0000-000000000002'),
  ('b0000028-0000-0000-0000-000000000028','2026-03-26 09:00:00+00','2026-03-26 14:30:00+00','Porto di Genova, Genoa, Italy','Via XX Settembre 7, Genoa, Italy','Import goods',6.0,'delivered','a0000001-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- ── Active orders (for "Active Orders Now" KPI) ────────────────────────────
INSERT INTO orders (id, created_at, updated_at, pickup_address, delivery_address, goods_desc, weight_tons, status, driver_id) VALUES
  ('b0000029-0000-0000-0000-000000000029','2026-03-26 09:00:00+00','2026-03-26 09:30:00+00','Via Nazionale 5, Udine, Italy','Piazza Duomo 1, Milan, Italy','Wine barrels',5.0,'assigned','a0000002-0000-0000-0000-000000000002'),
  ('b0000030-0000-0000-0000-000000000030','2026-03-26 07:00:00+00','2026-03-26 11:00:00+00','Via Garibaldi 1, Turin, Italy','Via Roma 44, Florence, Italy','Fashion goods',2.5,'in_transit','a0000003-0000-0000-0000-000000000003'),
  ('b0000031-0000-0000-0000-000000000031','2026-03-26 08:00:00+00','2026-03-26 10:00:00+00','Zona Industriale, Pisa, Italy','Via Colombo 33, Livorno, Italy','Marble slabs',7.5,'in_transit','a0000004-0000-0000-0000-000000000004')
ON CONFLICT (id) DO NOTHING;
