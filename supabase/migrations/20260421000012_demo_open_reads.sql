-- KRUXVON: Open read policies for demo (pre-auth)
-- Remove these when Supabase Auth is wired up

CREATE POLICY "demo_open_read" ON shipments      FOR SELECT USING (true);
CREATE POLICY "demo_open_read" ON organizations  FOR SELECT USING (true);
CREATE POLICY "demo_open_read" ON manufacturers  FOR SELECT USING (true);
CREATE POLICY "demo_open_read" ON clearing_agents FOR SELECT USING (true);
CREATE POLICY "demo_open_read" ON alerts         FOR SELECT USING (true);
